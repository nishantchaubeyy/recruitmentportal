const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { authenticate, optionalAuthenticate, requireAdmin, requireApplicant, authorize } = require('../middleware/authMiddleware');
const { pdfUpload } = require('../middleware/uploadMiddleware');

// Applicant & Guest Application Submission & Drafts
router.post('/', optionalAuthenticate, applicationController.createApplicationDraft);
router.post('/submit', optionalAuthenticate, applicationController.submitApplication);
router.post('/:id/submit', optionalAuthenticate, applicationController.submitApplication);
router.get('/:id', optionalAuthenticate, applicationController.getApplicationById);
router.put('/:id', optionalAuthenticate, applicationController.updateApplicationDraft);

// Candidate View of Their Submitted Applications (requires login)
router.get('/my', authenticate, requireApplicant, applicationController.getMyApplications);

// Screening list (HR/Admins see all, authenticated applicants see their own)
router.get('/', authenticate, authorize('APPLICANT', 'SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN'), applicationController.getAllApplications);

// Withdrawal
router.post('/:id/withdraw', authenticate, requireApplicant, applicationController.withdrawApplication);

// Status Tracking
router.get('/:id/status', optionalAuthenticate, applicationController.getApplicationStatus);
router.get('/:id/status-history', authenticate, applicationController.getApplicationStatus);
router.patch('/:id/status', authenticate, requireAdmin, applicationController.updateApplicationStatus);

// Documents
router.get('/:id/documents', optionalAuthenticate, applicationController.listDocuments);
router.post('/:id/documents', optionalAuthenticate, ...pdfUpload('file'), applicationController.uploadDocument);
router.get('/:id/documents/:docId/download', optionalAuthenticate, applicationController.downloadDocument);
router.delete('/:id/documents/:docId', optionalAuthenticate, applicationController.deleteDocument);

module.exports = router;
