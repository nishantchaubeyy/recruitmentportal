const bcrypt = require('bcryptjs');
const prisma = require('../services/prisma');
const { logAuditAction } = require('../services/auditService');

/**
 * List system users (Super Admin & HR Admin).
 */
async function getAllUsers(req, res) {
  const { role, status, search } = req.query;

  const where = {};
  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  try {
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        admin: { select: { name: true } },
        applicant: { select: { name: true, mobile: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
}

/**
 * Create a new Administrative or Committee User (Super Admin only).
 */
async function createUser(req, res) {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'Email, password, name, and role are required.' });
  }

  const validRoles = ['SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'COMMITTEE_MEMBER', 'ADMIN'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          role,
          status: 'ACTIVE'
        }
      });

      await tx.admin.create({
        data: {
          userId: u.id,
          name
        }
      });

      return u;
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
    console.error('Create user error:', error);
    return res.status(500).json({ error: 'Failed to create user.' });
  }
}

/**
 * Update user details.
 */
async function updateUser(req, res) {
  const { id } = req.params;
  const { name, email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id }, include: { admin: true } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await prisma.$transaction(async (tx) => {
      if (email && email.toLowerCase() !== user.email) {
        await tx.user.update({ where: { id }, data: { email: email.toLowerCase() } });
      }
      if (name && user.admin) {
        await tx.admin.update({ where: { userId: id }, data: { name } });
      }
    });

    return res.json({ message: 'User details updated successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update user.' });
  }
}

/**
 * Update user status (ACTIVE / INACTIVE / SUSPENDED).
 */
async function updateUserStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be ACTIVE, INACTIVE, or SUSPENDED.' });
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { status }
    });

    await logAuditAction({
      action: 'USER_STATUS_UPDATED',
      userId: req.user.id,
      targetType: 'User',
      targetId: id,
      details: { newStatus: status },
      req
    });

    return res.json({ message: `User status changed to ${status}.`, user: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update user status.' });
  }
}

/**
 * Update user role.
 */
async function updateUserRole(req, res) {
  const { id } = req.params;
  const { role } = req.body;

  const validRoles = ['SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'COMMITTEE_MEMBER', 'APPLICANT', 'ADMIN'];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ error: 'Valid role is required.' });
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { role }
    });

    await logAuditAction({
      action: 'USER_ROLE_UPDATED',
      userId: req.user.id,
      targetType: 'User',
      targetId: id,
      details: { newRole: role },
      req
    });

    return res.json({ message: `User role updated to ${role}.`, user: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update user role.' });
  }
}

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  updateUserStatus,
  updateUserRole
};
