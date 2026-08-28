const jwt = require('jsonwebtoken');
const prisma = require('../services/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'dypiu_recruitment_portal_jwt_secret_key_2026_xyz';

/**
 * Primary Authentication Middleware.
 * Validates Authorization Header: Bearer <TOKEN>
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch active user with associated profile
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        applicant: true,
        admin: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Account disabled. Please contact system administrator.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      applicantId: user.applicant ? user.applicant.id : null,
      adminId: user.admin ? user.admin.id : null
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(403).json({ error: 'Invalid access token.' });
  }
}

/**
 * Optional Authentication Middleware.
 * Attaches req.user if token is valid; continues without error if missing.
 */
async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        applicant: true,
        admin: true
      }
    });

    if (user && user.status === 'ACTIVE') {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        applicantId: user.applicant ? user.applicant.id : null,
        adminId: user.admin ? user.admin.id : null
      };
    }
  } catch (error) {
    // Ignore invalid tokens for optional authentication
  }
  next();
}

/**
 * Role-Based Access Control (RBAC) Middleware.
 * Example: authorize('SUPER_ADMIN', 'HR_ADMIN')
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Convert legacy ADMIN role compatibility
    const userRole = req.user.role;
    const isAllowed = allowedRoles.includes(userRole) || 
      (userRole === 'ADMIN' && (allowedRoles.includes('SUPER_ADMIN') || allowedRoles.includes('HR_ADMIN')));

    if (!isAllowed) {
      return res.status(403).json({ 
        error: `Access forbidden. Required role: [${allowedRoles.join(', ')}].` 
      });
    }

    next();
  };
}

/**
 * Alias helper for requireRole
 */
const requireRole = authorize;

/**
 * Helper middleware for Admin roles (SUPER_ADMIN, HR_ADMIN, HR_USER, ADMIN)
 */
function requireAdmin(req, res, next) {
  return authorize('SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN')(req, res, next);
}

/**
 * Helper middleware for Applicant role
 */
function requireApplicant(req, res, next) {
  return authorize('APPLICANT')(req, res, next);
}

/**
 * Helper middleware for Committee Member role
 */
function requireCommitteeMember(req, res, next) {
  return authorize('COMMITTEE_MEMBER', 'SUPER_ADMIN', 'HR_ADMIN', 'ADMIN')(req, res, next);
}

module.exports = {
  authenticate,
  authenticateToken: authenticate, // Backwards compatibility alias
  optionalAuthenticate,
  optionalAuthenticateToken: optionalAuthenticate, // Backwards compatibility alias
  authorize,
  requireRole,
  requireAdmin,
  requireApplicant,
  requireCommitteeMember
};
