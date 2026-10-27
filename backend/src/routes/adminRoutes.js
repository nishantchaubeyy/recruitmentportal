const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auditController = require('../controllers/auditController');
const panelController = require('../controllers/panelController');
const interviewController = require('../controllers/interviewController');
const applicationController = require('../controllers/applicationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const adminOnly = authorize('SUPER_ADMIN', 'HR_ADMIN', 'ADMIN');

// Super Admin & HR Admin User Management
router.get('/users', authenticate, adminOnly, userController.getAllUsers);
router.post('/users', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), userController.createUser);
router.put('/users/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), userController.updateUser);
router.patch('/users/:id/status', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), userController.updateUserStatus);
router.patch('/users/:id/role', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), userController.updateUserRole);

// System Audit Logs (Super Admin & HR Admin)
router.get('/audit-logs', authenticate, adminOnly, auditController.getAuditLogs);

// Applications Screening endpoint
router.get('/applications', authenticate, adminOnly, applicationController.getAllApplications);

// Interview Panels Management (Feature 1)
router.get('/panels', authenticate, adminOnly, panelController.getAllPanels);
router.get('/panels/:id', authenticate, adminOnly, panelController.getPanelById);
router.post('/panels', authenticate, adminOnly, panelController.createPanel);
router.put('/panels/:id', authenticate, adminOnly, panelController.updatePanel);
router.post('/panels/:id/members', authenticate, adminOnly, panelController.addPanelMember);
router.put('/panels/members/:memberId', authenticate, adminOnly, panelController.updatePanelMember);
router.patch('/panels/members/:memberId/toggle-status', authenticate, adminOnly, panelController.togglePanelMemberStatus);
router.delete('/panels/members/:memberId', authenticate, adminOnly, panelController.deletePanelMember);

// Schedule Interview from Applications with Panel & Zoom
router.post('/interviews/schedule-panel', authenticate, adminOnly, interviewController.scheduleInterviewWithPanel);

module.exports = router;

