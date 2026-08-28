const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auditController = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Super Admin & HR Admin User Management
router.get('/users', authenticate, authorize('SUPER_ADMIN', 'HR_ADMIN', 'ADMIN'), userController.getAllUsers);
router.post('/users', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), userController.createUser);
router.put('/users/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), userController.updateUser);
router.patch('/users/:id/status', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), userController.updateUserStatus);
router.patch('/users/:id/role', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), userController.updateUserRole);

// System Audit Logs (Super Admin & HR Admin)
router.get('/audit-logs', authenticate, authorize('SUPER_ADMIN', 'HR_ADMIN', 'ADMIN'), auditController.getAuditLogs);

module.exports = router;
