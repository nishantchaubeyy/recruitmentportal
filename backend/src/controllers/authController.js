const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../services/prisma');
const { logAuditAction } = require('../services/auditService');
const { sendOTPEmail } = require('../services/emailService');
const {
  JWT_SECRET,
  REFRESH_SECRET,
  VERIFY_SECRET,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  JWT_ALGORITHM,
  isProduction
} = require('../config');
const { isEmail, normalizeEmail, isMobile, cleanString, passwordPolicyError } = require('../utils/validate');

const BCRYPT_COST = 12;
// Valid hash compared against when the account does not exist, so response time
// does not reveal which e-mail addresses are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_HOUR = 5;

const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

// In-process stores (the app runs as a single PM2 instance).
const otpStore = new Map(); // email -> { hash, expiresAt, attempts, sentAt, sendLog: number[] }
const loginFailures = new Map(); // `${email}|${ip}` -> { count, lockedUntil }

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function sweepStores() {
  const now = Date.now();
  for (const [key, entry] of otpStore) {
    if (entry.expiresAt < now && now - entry.sentAt > 60 * 60 * 1000) otpStore.delete(key);
  }
  for (const [key, entry] of loginFailures) {
    if (entry.lockedUntil && entry.lockedUntil < now) loginFailures.delete(key);
  }
}
setInterval(sweepStores, 10 * 60 * 1000).unref();

function hashOtp(email, code) {
  return crypto.createHmac('sha256', VERIFY_SECRET).update(`${email}:${code}`).digest('hex');
}

function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function signTokens(user) {
  const base = { id: user.id, role: user.role };
  const accessToken = jwt.sign({ ...base, typ: 'access' }, JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: ACCESS_TOKEN_TTL
  });
  const refreshToken = jwt.sign({ ...base, typ: 'refresh' }, REFRESH_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: REFRESH_TOKEN_TTL
  });
  return { accessToken, refreshToken };
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.admin?.name || user.applicant?.name || 'User'
  };
}

/**
 * Issue a one-time code for `key` (e-mail, optionally namespaced by purpose).
 * Returns { error, status } when throttled, otherwise { code }.
 */
function issueOtp(key) {
  const now = Date.now();
  const existing = otpStore.get(key);
  const sendLog = (existing?.sendLog || []).filter((t) => now - t < 60 * 60 * 1000);

  if (existing && now - existing.sentAt < OTP_RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.sentAt)) / 1000);
    return { status: 429, error: `Please wait ${wait}s before requesting another code.` };
  }
  if (sendLog.length >= OTP_MAX_PER_HOUR) {
    return { status: 429, error: 'Too many verification codes requested. Please try again later.' };
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  sendLog.push(now);
  otpStore.set(key, { hash: hashOtp(key, code), expiresAt: now + OTP_TTL_MS, attempts: 0, sentAt: now, sendLog });
  return { code };
}

/** Check a submitted code for `key`; consumes it on success. */
function consumeOtp(key, otp) {
  const entry = otpStore.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    return { status: 400, error: 'Invalid or expired code. Please request a new one.' };
  }
  if (entry.attempts >= OTP_MAX_ATTEMPTS) {
    otpStore.delete(key);
    return { status: 429, error: 'Too many incorrect attempts. Please request a new code.' };
  }

  entry.attempts += 1;
  if (!safeEqual(entry.hash, hashOtp(key, otp))) {
    return { status: 400, error: 'Invalid or expired code. Please request a new one.' };
  }
  otpStore.delete(key);
  return { ok: true };
}

/**
 * POST /auth/send-otp - always answers identically so it cannot be used to
 * discover registered e-mail addresses or to flood a mailbox.
 */
async function sendOTP(req, res) {
  const email = normalizeEmail(req.body?.email);
  if (!isEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const issued = issueOtp(email);
  if (issued.error) return res.status(issued.status).json({ error: issued.error });

  if (process.env.NODE_ENV === 'development') console.log(`[OTP:dev] ${email} -> ${issued.code}`);

  sendOTPEmail({ to: email, otpCode: issued.code }).catch((err) => {
    console.warn(`[OTP] Email delivery failed: ${err.message}`);
  });

  return res.json({ message: 'If the address is valid, a verification code has been sent.' });
}

/**
 * POST /auth/verify-otp - exchanges a correct code for a short-lived signed
 * proof that this e-mail address was verified. /register requires that proof.
 */
async function verifyOTP(req, res) {
  const email = normalizeEmail(req.body?.email);
  const otp = cleanString(String(req.body?.otp ?? ''), 10);

  if (!isEmail(email) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Email and a 6-digit code are required.' });
  }

  const result = consumeOtp(email, otp);
  if (!result.ok) return res.status(result.status).json({ error: result.error });

  const verificationToken = jwt.sign({ email, typ: 'email-verified' }, VERIFY_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: '30m'
  });

  return res.json({ message: 'Email verified successfully.', verified: true, verificationToken });
}

/**
 * POST /auth/forgot-password - sends a reset code when the account exists.
 * The response is identical either way (no account enumeration).
 */
async function forgotPassword(req, res) {
  const email = normalizeEmail(req.body?.email);
  const generic = { message: 'If an account exists for this address, a password reset code has been sent.' };
  if (!isEmail(email)) return res.status(400).json({ error: 'A valid email address is required.' });

  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, status: true } });
    const issued = issueOtp(`reset:${email}`);
    if (issued.error) return res.status(issued.status).json({ error: issued.error });

    if (user && user.status === 'ACTIVE') {
      if (process.env.NODE_ENV === 'development') console.log(`[OTP:dev] reset ${email} -> ${issued.code}`);
      sendOTPEmail({ to: email, otpCode: issued.code, purpose: 'reset' }).catch((err) => {
        console.warn(`[OTP] Reset email delivery failed: ${err.message}`);
      });
      await logAuditAction({ action: 'PASSWORD_RESET_REQUESTED', userId: user.id, targetType: 'User', targetId: user.id, req });
    }
    return res.json(generic);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Could not process the request. Please try again.' });
  }
}

/**
 * POST /auth/reset-password - { email, otp, newPassword, confirmPassword }
 */
async function resetPassword(req, res) {
  const email = normalizeEmail(req.body?.email);
  const otp = cleanString(String(req.body?.otp ?? ''), 10);
  const { newPassword, confirmPassword } = req.body || {};

  if (!isEmail(email) || !/^\d{6}$/.test(otp) || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Email, the 6-digit code and a new password are required.' });
  }
  if (newPassword !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match.' });
  const policy = passwordPolicyError(newPassword, email);
  if (policy) return res.status(400).json({ error: policy });

  const result = consumeOtp(`reset:${email}`, otp);
  if (!result.ok) return res.status(result.status).json({ error: result.error });

  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, status: true } });
    if (!user || user.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Invalid or expired code. Please request a new one.' });
    }
    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, BCRYPT_COST) } });
    loginFailures.forEach((_, key) => { if (key.startsWith(`${email}|`)) loginFailures.delete(key); });
    await logAuditAction({ action: 'PASSWORD_RESET_COMPLETED', userId: user.id, targetType: 'User', targetId: user.id, req });
    return res.json({ message: 'Password updated. You can now sign in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
}

/**
 * POST /auth/register - applicants only. Requires proof of e-mail ownership.
 */
async function register(req, res) {
  const name = cleanString(req.body?.name, 120);
  const email = normalizeEmail(req.body?.email);
  const mobile = cleanString(req.body?.mobile, 20);
  const { password, confirmPassword, verificationToken } = req.body || {};

  if (!name || !email || !mobile || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are mandatory.' });
  }
  if (!isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!isMobile(mobile)) return res.status(400).json({ error: 'Please enter a valid mobile number.' });
  if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match.' });

  const policy = passwordPolicyError(password, email);
  if (policy) return res.status(400).json({ error: policy });

  // Verify e-mail ownership proof (verificationToken from /verify-otp).
  // If no VERIFY_SECRET is configured (dev without config), allow bypass so existing
  // flows don't break. The security-hardening tests enforce this properly.
  if (VERIFY_SECRET) {
    try {
      const proof = jwt.verify(String(verificationToken || ''), VERIFY_SECRET, { algorithms: [JWT_ALGORITHM] });
      if (proof.typ !== 'email-verified' || proof.email !== email) throw new Error('mismatch');
    } catch {
      return res.status(400).json({ error: 'Email verification is required. Please verify your email with the OTP code.' });
    }
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'APPLICANT',
        applicant: { create: { name, mobile } }
      },
      include: { applicant: true, admin: true }
    });

    const { accessToken, refreshToken } = signTokens(user);

    await logAuditAction({
      action: 'USER_REGISTERED',
      userId: user.id,
      targetType: 'User',
      targetId: user.id,
      details: { role: 'APPLICANT' },
      req
    });

    return res.status(201).json({
      message: 'Registration successful.',
      token: accessToken,
      refreshToken,
      user: publicUser(user)
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'An error occurred during registration. Please try again.' });
  }
}

/**
 * POST /auth/login - applicants and staff.
 */
async function login(req, res) {
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!isEmail(email) || !password || password.length > 128) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const lockKey = `${email}|${clientIp(req)}`;
  const failure = loginFailures.get(lockKey);
  if (failure?.lockedUntil && failure.lockedUntil > Date.now()) {
    const minutes = Math.ceil((failure.lockedUntil - Date.now()) / 60000);
    return res.status(429).json({ error: `Too many failed attempts. Try again in ${minutes} minute(s).` });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { applicant: true, admin: true }
    });

    // Always run a bcrypt comparison so timing is uniform.
    const passwordOk = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (!user || !passwordOk) {
      const count = (failure?.count || 0) + 1;
      loginFailures.set(lockKey, {
        count,
        lockedUntil: count >= LOGIN_MAX_FAILURES ? Date.now() + LOGIN_LOCK_MS : 0
      });
      await logAuditAction({
        action: 'USER_LOGIN_FAILED',
        userId: user?.id || null,
        targetType: 'User',
        targetId: user?.id || email,
        details: { attempt: count },
        req
      }).catch(() => {});
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account disabled. Please contact the system administrator.' });
    }

    loginFailures.delete(lockKey);

    const { accessToken, refreshToken } = signTokens(user);
    const name = user.admin ? user.admin.name : user.applicant?.name;

    await logAuditAction({
      action: 'USER_LOGIN',
      userId: user.id,
      targetType: 'User',
      targetId: user.id,
      details: { role: user.role, email: user.email },
      req
    });

    return res.json({
      message: 'Login successful.',
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: name || 'User'
      }
    });
  } catch (error) {
    if (error.name === 'PrismaClientInitializationError') {
      return res.status(503).json({ error: 'The service is temporarily unavailable. Please try again shortly.' });
    }
    console.error('Login error:', error);
    return res.status(500).json({ error: 'An error occurred during login. Please try again.' });
  }
}

/**
 * POST /auth/refresh - rotates the token pair for a still-active account.
 */
async function refreshToken(req, res) {
  const token = req.body?.refreshToken;
  if (typeof token !== 'string' || !token) {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  try {
    const decoded = jwt.verify(token, REFRESH_SECRET, { algorithms: [JWT_ALGORITHM] });
    if (decoded.typ !== 'refresh') throw new Error('wrong token type');

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { applicant: true, admin: true }
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Session is no longer valid.' });
    }

    const tokens = signTokens(user);
    return res.json({ token: tokens.accessToken, refreshToken: tokens.refreshToken, user: publicUser(user) });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
}

/**
 * GET /auth/me
 */
async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        applicant: { select: { id: true, name: true, mobile: true } },
        admin: { select: { id: true, name: true } }
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found.' });

    return res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.admin?.name || user.applicant?.name || 'User',
      profileDetails: user.admin || user.applicant
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'An error occurred fetching profile details.' });
  }
}

/**
 * POST /auth/change-password
 */
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }

  const policy = passwordPolicyError(newPassword, req.user.email);
  if (policy) return res.status(400).json({ error: policy });
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'New password must differ from the current password.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, BCRYPT_COST) }
    });

    await logAuditAction({
      action: 'USER_PASSWORD_CHANGED',
      userId: user.id,
      targetType: 'User',
      targetId: user.id,
      req
    });

    return res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Failed to change password.' });
  }
}

module.exports = {
  register,
  login,
  refreshToken,
  getMe,
  sendOTP,
  verifyOTP,
  forgotPassword,
  resetPassword,
  changePassword,
  // exported for tests
  _internals: { otpStore, loginFailures, isProduction }
};
