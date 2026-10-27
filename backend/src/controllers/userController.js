const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../services/prisma');
const { logAuditAction } = require('../services/auditService');
const {
  isEmail,
  normalizeEmail,
  cleanString,
  passwordPolicyError,
  searchTerm
} = require('../utils/validate');

const STAFF_ROLES = ['SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'COMMITTEE_MEMBER', 'ADMIN'];
const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
const SUPER_ROLES = ['SUPER_ADMIN', 'ADMIN'];
const BCRYPT_COST = 12;

// The password hash must never leave the server.
const safeUserSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  admin: { select: { name: true } },
  applicant: { select: { name: true, mobile: true } }
};

async function activeSuperAdminCount(excludeUserId) {
  return prisma.user.count({
    where: { role: { in: SUPER_ROLES }, status: 'ACTIVE', id: { not: excludeUserId } }
  });
}

function generatePassword() {
  const pick = (chars) => chars[crypto.randomInt(chars.length)];
  const all = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let value = pick('ABCDEFGHJKLMNPQRSTUVWXYZ') + pick('abcdefghijkmnpqrstuvwxyz') + pick('23456789') + pick('!@#$%&*');
  while (value.length < 14) value += pick(all);
  return value.split('').sort(() => crypto.randomInt(3) - 1).join('');
}

/**
 * GET /admin/users
 */
async function getAllUsers(req, res) {
  const { role, status } = req.query;
  const term = searchTerm(req.query.search);

  const where = { role: { not: 'APPLICANT' } };
  if (STAFF_ROLES.includes(role)) where.role = role;
  if (USER_STATUSES.includes(status)) where.status = status;
  if (term) {
    where.OR = [
      { email: { contains: term, mode: 'insensitive' } },
      { admin: { name: { contains: term, mode: 'insensitive' } } }
    ];
  }

  try {
    const users = await prisma.user.findMany({
      where,
      select: safeUserSelect,
      orderBy: { createdAt: 'desc' },
      take: 500
    });
    return res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
}

/**
 * POST /admin/users - create an administrative or committee account.
 */
async function createUser(req, res) {
  const email = normalizeEmail(req.body?.email);
  const name = cleanString(req.body?.name, 120);
  const { password, role } = req.body || {};

  if (!isEmail(email) || !name || !password || !role) {
    return res.status(400).json({ error: 'A valid email, password, name, and role are required.' });
  }
  if (!STAFF_ROLES.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${STAFF_ROLES.join(', ')}` });
  }
  const policy = passwordPolicyError(password, email);
  if (policy) return res.status(400).json({ error: policy });

  try {
    const user = await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, BCRYPT_COST),
        role,
        status: 'ACTIVE',
        admin: { create: { name } }
      },
      select: safeUserSelect
    });

    await logAuditAction({
      action: 'USER_CREATED_BY_ADMIN',
      userId: req.user.id,
      targetType: 'User',
      targetId: user.id,
      details: { email, role, name },
      req
    });

    return res.status(201).json({ message: 'User created successfully.', user });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'A user with this email already exists.' });
    console.error('Create user error:', error);
    return res.status(500).json({ error: 'Failed to create user.' });
  }
}

/**
 * PUT /admin/users/:id - name / email.
 */
async function updateUser(req, res) {
  const { id } = req.params;
  const name = cleanString(req.body?.name, 120);
  const email = req.body?.email ? normalizeEmail(req.body.email) : '';

  if (email && !isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  try {
    const user = await prisma.user.findUnique({ where: { id }, include: { admin: true } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await prisma.$transaction(async (tx) => {
      if (email && email !== user.email) {
        await tx.user.update({ where: { id }, data: { email } });
      }
      if (name && user.admin) {
        await tx.admin.update({ where: { userId: id }, data: { name } });
      }
    });

    await logAuditAction({
      action: 'USER_UPDATED',
      userId: req.user.id,
      targetType: 'User',
      targetId: id,
      oldValue: { email: user.email, name: user.admin?.name },
      details: { email: email || undefined, name: name || undefined },
      req
    });

    return res.json({ message: 'User details updated successfully.' });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'A user with this email already exists.' });
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Failed to update user.' });
  }
}

/**
 * PATCH /admin/users/:id/status
 */
async function updateUserStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!USER_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status must be ACTIVE, INACTIVE, or SUSPENDED.' });
  }
  if (id === req.user.id && status !== 'ACTIVE') {
    return res.status(400).json({ error: 'You cannot disable your own account.' });
  }

  try {
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true, status: true } });
    if (!target) return res.status(404).json({ error: 'User not found.' });

    if (status !== 'ACTIVE' && SUPER_ROLES.includes(target.role) && (await activeSuperAdminCount(id)) === 0) {
      return res.status(400).json({ error: 'At least one active super administrator is required.' });
    }

    const updated = await prisma.user.update({ where: { id }, data: { status }, select: safeUserSelect });

    await logAuditAction({
      action: 'USER_STATUS_UPDATED',
      userId: req.user.id,
      targetType: 'User',
      targetId: id,
      oldValue: { status: target.status },
      details: { newStatus: status },
      req
    });

    return res.json({ message: `User status changed to ${status}.`, user: updated });
  } catch (error) {
    console.error('Update user status error:', error);
    return res.status(500).json({ error: 'Failed to update user status.' });
  }
}

/**
 * PATCH /admin/users/:id/role
 */
async function updateUserRole(req, res) {
  const { id } = req.params;
  const { role } = req.body || {};

  if (!STAFF_ROLES.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${STAFF_ROLES.join(', ')}` });
  }
  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot change your own role.' });
  }

  try {
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (target.role === 'APPLICANT') {
      return res.status(400).json({ error: 'Applicant accounts cannot be converted to staff accounts.' });
    }
    if (SUPER_ROLES.includes(target.role) && !SUPER_ROLES.includes(role) && (await activeSuperAdminCount(id)) === 0) {
      return res.status(400).json({ error: 'At least one active super administrator is required.' });
    }

    const updated = await prisma.user.update({ where: { id }, data: { role }, select: safeUserSelect });

    await logAuditAction({
      action: 'USER_ROLE_UPDATED',
      userId: req.user.id,
      targetType: 'User',
      targetId: id,
      oldValue: { role: target.role },
      details: { newRole: role },
      req
    });

    return res.json({ message: `User role updated to ${role}.`, user: updated });
  } catch (error) {
    console.error('Update user role error:', error);
    return res.status(500).json({ error: 'Failed to update user role.' });
  }
}

/**
 * POST /admin/users/:id/reset-password - sets a new password (generated when none is supplied).
 */
async function resetUserPassword(req, res) {
  const { id } = req.params;

  try {
    const target = await prisma.user.findUnique({ where: { id }, select: { email: true, role: true } });
    if (!target) return res.status(404).json({ error: 'User not found.' });

    const supplied = req.body?.password;
    const password = supplied || generatePassword();
    if (supplied) {
      const policy = passwordPolicyError(supplied, target.email);
      if (policy) return res.status(400).json({ error: policy });
    }

    await prisma.user.update({ where: { id }, data: { password: await bcrypt.hash(password, BCRYPT_COST) } });

    await logAuditAction({
      action: 'USER_PASSWORD_RESET_BY_ADMIN',
      userId: req.user.id,
      targetType: 'User',
      targetId: id,
      req
    });

    return res.json({
      message: 'Password reset. Share the new password securely; the user should change it after signing in.',
      ...(supplied ? {} : { temporaryPassword: password })
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
}

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  updateUserStatus,
  updateUserRole,
  resetUserPassword
};
