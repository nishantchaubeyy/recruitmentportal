const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auditController = require('../controllers/auditController');
const panelController = require('../controllers/panelController');
const interviewController = require('../controllers/interviewController');
const applicationController = require('../controllers/applicationController');
const candidateController = require('../controllers/candidateController');
const { authenticate, authorize, requireAdmin, requireSuperAdmin } = require('../middleware/authMiddleware');
const { getEmailProviderStatus } = require('../services/emailService');

const adminOnly = authorize('SUPER_ADMIN', 'HR_ADMIN', 'ADMIN');

// Is outgoing e-mail configured on this server? (HR screens warn when it is not)
router.get('/email/status', authenticate, requireAdmin, (req, res) => res.json(getEmailProviderStatus()));

// Super Admin & HR Admin User Management
router.get('/users', authenticate, adminOnly, userController.getAllUsers);
router.post('/users', authenticate, requireSuperAdmin, userController.createUser);
router.put('/users/:id', authenticate, requireSuperAdmin, userController.updateUser);
router.patch('/users/:id/status', authenticate, requireSuperAdmin, userController.updateUserStatus);
router.patch('/users/:id/role', authenticate, requireSuperAdmin, userController.updateUserRole);
router.post('/users/:id/reset-password', authenticate, requireSuperAdmin, userController.resetUserPassword);

// System Audit Logs (Super Admin & HR Admin)
router.get('/audit-logs', authenticate, adminOnly, auditController.getAuditLogs);
router.get('/audit-logs/summary', authenticate, adminOnly, auditController.getAuditSummary);
router.get('/audit-logs/facets', authenticate, adminOnly, auditController.getAuditFacets);
router.get('/audit-logs/verify', authenticate, adminOnly, auditController.verifyAuditLog);
// CSV exports are built in the browser; this records who exported what.
router.post('/events/export', authenticate, requireAdmin, auditController.recordExport);

// Permanent removal of a candidate and all their data (super administrators only; see candidateController)
router.get('/candidates/:id/deletion-preview', authenticate, requireSuperAdmin, candidateController.previewDeletion);
router.delete('/candidates/:id', authenticate, requireSuperAdmin, candidateController.deleteCandidate);

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

