const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { authenticate, requireAdmin, requireApplicant } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Application Creation & Applicant List
router.post('/', authenticate, requireApplicant, applicationController.createApplicationDraft);
router.get('/my', authenticate, requireApplicant, applicationController.getMyApplications);

// HR Screening List with Pagination, Filters & Search
router.get('/', authenticate, applicationController.getAllApplications);

// Application Dossier Details & Draft Save
router.get('/:id', authenticate, applicationController.getApplicationById);
router.put('/:id', authenticate, applicationController.updateApplicationDraft);

// Workflow Actions: Submit & Withdraw
router.post('/:id/submit', authenticate, requireApplicant, applicationController.submitApplication);
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
