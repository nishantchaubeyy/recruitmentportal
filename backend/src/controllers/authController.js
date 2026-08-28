const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../services/prisma');
const { logAuditAction } = require('../services/auditService');

const JWT_SECRET = process.env.JWT_SECRET || 'dypiu_recruitment_portal_jwt_secret_key_2026_xyz';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dypiu_recruitment_portal_refresh_secret_key_2026_abc';

/**
 * Generate Access Token & Refresh Token pair.
 */
function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken };
}

/**
 * Register a new Applicant.
 */
async function register(req, res) {
  const { name, email, mobile, password, confirmPassword } = req.body;

  // Basic Validation
  if (!name || !email || !mobile || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are mandatory.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Hash password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User and Applicant inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'APPLICANT'
        }
      });

      const newApplicant = await tx.applicant.create({
        data: {
          userId: newUser.id,
          name,
          mobile
        }
      });

      return { user: newUser, applicant: newApplicant };
    });

    const { accessToken, refreshToken } = generateTokens(result.user);

    await logAuditAction({
      action: 'USER_REGISTERED',
      userId: result.user.id,
      targetType: 'User',
      targetId: result.user.id,
      details: { role: 'APPLICANT', email: result.user.email },
      req
    });

    return res.status(201).json({
      message: 'Registration successful.',
      token: accessToken,
      refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        name: result.applicant.name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'An error occurred during registration. Please try again.' });
  }
}

/**
 * User login (Applicant & Admin).
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        applicant: true,
        admin: true
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    const name = user.role === 'ADMIN' ? user.admin?.name : user.applicant?.name;

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
    console.error('Login error:', error);
    return res.status(500).json({ error: 'An error occurred during login. Please try again.' });
  }
}

/**
 * Refresh JWT access token using refresh token.
 */
async function refreshToken(req, res) {
  const { refreshToken: token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    const newTokens = generateTokens(user);

    return res.json({
      token: newTokens.accessToken,
      refreshToken: newTokens.refreshToken
    });
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired refresh token.' });
  }
}

/**
 * Get current logged in user information.
 */
async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        applicant: true,
        admin: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const name = user.role === 'ADMIN' ? user.admin?.name : user.applicant?.name;
    const profileDetails = user.role === 'ADMIN' ? user.admin : user.applicant;

    return res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      name: name || 'User',
      profileDetails
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'An error occurred fetching profile details.' });
  }
}

module.exports = {
  register,
  login,
  refreshToken,
  getMe
};
