const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { authenticate, requireAdmin, requireApplicant, authorize } = require('../middleware/authMiddleware');
const { pdfUpload } = require('../middleware/uploadMiddleware');

// Every application route requires a signed-in user; ownership/role checks live in the controller.
router.use(authenticate);

// Applicant workflow
router.post('/', requireApplicant, applicationController.createApplicationDraft);
router.get('/my', requireApplicant, applicationController.getMyApplications);

// Screening list (HR sees all, applicants their own)
router.get('/', authorize('APPLICANT', 'SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN'), applicationController.getAllApplications);

router.get('/:id', applicationController.getApplicationById);
router.put('/:id', authorize('APPLICANT', 'SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN'), applicationController.updateApplicationDraft);
router.post('/:id/submit', requireApplicant, applicationController.submitApplication);
router.post('/:id/withdraw', requireApplicant, applicationController.withdrawApplication);

router.get('/:id/status', applicationController.getApplicationStatus);
router.get('/:id/status-history', applicationController.getApplicationStatus);
router.patch('/:id/status', requireAdmin, applicationController.updateApplicationStatus);

// Documents
router.get('/:id/documents', applicationController.listDocuments);
router.post('/:id/documents', requireApplicant, ...pdfUpload('file'), applicationController.uploadDocument);
router.get('/:id/documents/:docId/download', applicationController.downloadDocument);
router.delete('/:id/documents/:docId', requireApplicant, applicationController.deleteDocument);

module.exports = router;
