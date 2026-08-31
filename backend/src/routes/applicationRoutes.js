const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { authenticate, optionalAuthenticate, requireAdmin, requireApplicant } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public status tracker by application number (no account required).
router.get('/track', applicationController.trackApplication);

// Application Creation (supports direct/guest or logged-in applicants) & Applicant List
router.post('/', optionalAuthenticate, applicationController.createApplicationDraft);
router.get('/my', authenticate, requireApplicant, applicationController.getMyApplications);

// Screening / listing list (applicant sees own, staff see all)
router.get('/', authenticate, applicationController.getAllApplications);

// Application Dossier Details & Draft Save
router.get('/:id', optionalAuthenticate, applicationController.getApplicationById);
router.put('/:id', optionalAuthenticate, applicationController.updateApplicationDraft);

// Workflow Actions: Submit & Withdraw
router.post('/:id/submit', optionalAuthenticate, applicationController.submitApplication);
router.post('/:id/withdraw', authenticate, requireApplicant, applicationController.withdrawApplication);

// Status Tracking (authenticated)
router.get('/:id/status', authenticate, applicationController.getApplicationStatus);
router.get('/:id/status-history', authenticate, applicationController.getApplicationStatus);

// HR Status Update & Screening Remarks
router.patch('/:id/status', authenticate, requireAdmin, applicationController.updateApplicationStatus);

// Document Management APIs
router.post('/:id/documents', authenticate, upload.single('file'), applicationController.uploadDocument);
router.get('/:id/documents', authenticate, applicationController.getApplicationById);
router.get('/:id/documents/:docId/download', authenticate, applicationController.downloadDocument);
router.delete('/:id/documents/:docId', authenticate, applicationController.deleteDocument);

module.exports = router;
