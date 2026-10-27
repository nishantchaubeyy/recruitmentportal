const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticate, requireAdmin, requireApplicant, authorize } = require('../middleware/authMiddleware');
const { documentUpload } = require('../middleware/uploadMiddleware');

router.use(authenticate);

// HR checklist suggestions
router.get('/catalog', requireAdmin, documentController.getDocumentCatalog);

// Candidate view (My Documents)
router.get('/my', requireApplicant, documentController.getMyDocumentRequests);

// Admin listing & create
router.get('/', requireAdmin, documentController.getAllDocumentRequests);
router.post('/', requireAdmin, documentController.createDocumentRequest);

// Single file download (applicant: own files, HR: any)
router.get('/file/:docId', authorize('APPLICANT', 'SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN'), documentController.downloadDocumentFile);

// Request details (applicant: own request, HR: any)
router.get('/:id', authorize('APPLICANT', 'SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN'), documentController.getDocumentRequestById);

// Candidate file upload & final submit
router.post(
  '/:requestId/items/:itemId/upload',
  requireApplicant,
  ...documentUpload('file'),
  documentController.uploadCandidateDocumentItem
);
router.post('/:requestId/submit', requireApplicant, documentController.submitAllDocuments);

// Admin verification actions
router.patch('/:requestId/items/:itemId/verify', requireAdmin, documentController.verifyCandidateDocumentItem);
router.post('/:requestId/approve-all', requireAdmin, documentController.approveAllDocuments);

// ZIP archive
router.get('/:requestId/download-zip', requireAdmin, documentController.downloadAllDocumentsZip);

module.exports = router;
