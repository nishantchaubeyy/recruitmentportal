const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { authenticate, optionalAuthenticate, requireAdmin, requireApplicant, authorize } = require('../middleware/authMiddleware');
const { pdfUpload } = require('../middleware/uploadMiddleware');

// Guests may start (client-side) and submit an application, but only with a verified e-mail
// (enforced in the controller). Everything that reads or changes a stored application needs a login
// and ownership.

// 1. Fixed non-parameterized routes (MUST precede /:id)
router.post('/', optionalAuthenticate, applicationController.createApplicationDraft);
router.post('/submit', optionalAuthenticate, applicationController.submitApplication);
router.get('/my', authenticate, requireApplicant, applicationController.getMyApplications);
router.get('/', authenticate, authorize('APPLICANT', 'SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN'), applicationController.getAllApplications);

// 2. Specific sub-resource routes on /:id
router.post('/:id/submit', optionalAuthenticate, applicationController.submitApplication);
router.post('/:id/withdraw', authenticate, requireApplicant, applicationController.withdrawApplication);
router.get('/:id/status', authenticate, applicationController.getApplicationStatus);
router.get('/:id/status-history', authenticate, applicationController.getApplicationStatus);
router.patch('/:id/status', authenticate, requireAdmin, applicationController.updateApplicationStatus);
router.get('/:id/email-logs', authenticate, requireAdmin, applicationController.getApplicationEmailLogs);
router.post('/:id/resend-status-email', authenticate, requireAdmin, applicationController.resendStatusEmail);

// Documents
router.get('/:id/documents', authenticate, applicationController.listDocuments);
router.post('/:id/documents', optionalAuthenticate, ...pdfUpload('file'), applicationController.uploadDocument);
router.get('/:id/documents/:docId/download', authenticate, applicationController.downloadDocument);
router.delete('/:id/documents/:docId', authenticate, requireApplicant, applicationController.deleteDocument);

// 3. Generic parameterized application routes (MUST be last)
router.get('/:id', authenticate, applicationController.getApplicationById);
router.put('/:id', optionalAuthenticate, applicationController.updateApplicationDraft);

module.exports = router;
