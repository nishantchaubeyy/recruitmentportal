const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { authenticate, optionalAuthenticate, requireAdmin, requireApplicant } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Application Creation & Applicant List
router.post('/', optionalAuthenticate, applicationController.createApplicationDraft);
router.get('/my', authenticate, requireApplicant, applicationController.getMyApplications);

// HR Screening List with Pagination, Filters & Search
router.get('/', optionalAuthenticate, applicationController.getAllApplications);

// Application Dossier Details & Draft Save
router.get('/:id', optionalAuthenticate, applicationController.getApplicationById);
router.put('/:id', optionalAuthenticate, applicationController.updateApplicationDraft);

// Workflow Actions: Submit & Withdraw
router.post('/:id/submit', optionalAuthenticate, applicationController.submitApplication);
router.post('/:id/withdraw', authenticate, requireApplicant, applicationController.withdrawApplication);

// Status Tracking
router.get('/:id/status', applicationController.getApplicationStatus);
router.get('/:id/status-history', applicationController.getApplicationStatus);

// HR Status Update & Screening Remarks
router.patch('/:id/status', authenticate, requireAdmin, applicationController.updateApplicationStatus);

// Document Management APIs
router.post('/:id/documents', authenticate, upload.single('file'), applicationController.uploadDocument);
router.get('/:id/documents', authenticate, applicationController.getApplicationById);
router.get('/:id/documents/:docId/download', authenticate, applicationController.downloadDocument);
router.delete('/:id/documents/:docId', authenticate, applicationController.deleteDocument);

module.exports = router;
