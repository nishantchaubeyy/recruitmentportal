const jwt = require('jsonwebtoken');
const prisma = require('../services/prisma');
const { JWT_SECRET, JWT_ALGORITHM, ADMIN_ROLES } = require('../config');

function extractBearer(req) {
  const header = req.headers['authorization'];
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (!/^Bearer$/i.test(scheme) || !token) return null;
  return token;
}

function verifyAccessToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
  // Allow legacy tokens issued before the typ claim was added (backward compat).
  if (decoded.typ && decoded.typ !== 'access') {
    throw new jwt.JsonWebTokenError('Wrong token type');
  }
  return decoded;
}

async function loadUser(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      applicant: { select: { id: true, name: true } },
      admin: { select: { id: true, name: true } }
    }
  });
}

function toRequestUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.admin?.name || user.applicant?.name || null,
    applicantId: user.applicant ? user.applicant.id : null,
    adminId: user.admin ? user.admin.id : null
  };
}

/**
 * Primary authentication middleware. Validates `Authorization: Bearer <token>`
 * and re-checks the account state on every request so that disabling a user
 * takes effect immediately.
 */
async function authenticate(req, res, next) {
  const token = extractBearer(req);
  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await loadUser(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account disabled. Please contact the system administrator.' });
    }

    req.user = toRequestUser(user);
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return res.status(401).json({ error: 'Invalid access token.' });
    }
    console.error('[Auth] Unexpected authentication failure:', error.message);
    return res.status(500).json({ error: 'Authentication could not be verified.' });
  }
}

/**
 * Optional Authentication Middleware.
 * Attaches req.user if token is valid; continues without error if missing.
 */
async function optionalAuthenticate(req, res, next) {
  const token = extractBearer(req);
  if (!token) return next();

  try {
    const decoded = verifyAccessToken(token);
    const user = await loadUser(decoded.id);

    if (user && user.status === 'ACTIVE') {
      req.user = toRequestUser(user);
    }
  } catch {
    // Ignore invalid tokens for optional authentication
  }
  return next();
}

/**
 * Role-Based Access Control. Usage: authorize('SUPER_ADMIN', 'HR_ADMIN').
 * The legacy `ADMIN` role is treated as a super administrator.
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const role = req.user.role;
    const allowed =
      allowedRoles.includes(role) ||
      (role === 'ADMIN' && (allowedRoles.includes('SUPER_ADMIN') || allowedRoles.includes('HR_ADMIN')));

    if (!allowed) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}

const requireRole = authorize;
const requireAdmin = authorize('SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN');
const requireApplicant = authorize('APPLICANT');
const requireCommitteeMember = authorize('COMMITTEE_MEMBER', 'SUPER_ADMIN', 'HR_ADMIN', 'ADMIN');
const requireSuperAdmin = authorize('SUPER_ADMIN', 'ADMIN');

module.exports = {
  authenticate,
  authenticateToken: authenticate, // Backwards compatibility alias
  optionalAuthenticate,
  optionalAuthenticateToken: optionalAuthenticate, // Backwards compatibility alias
  authorize,
  requireRole,
  requireAdmin,
  requireApplicant,
  requireCommitteeMember,
  requireSuperAdmin
};
