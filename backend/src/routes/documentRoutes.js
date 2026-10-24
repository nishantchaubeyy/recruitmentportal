const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');
const { documentUpload } = require('../middleware/uploadMiddleware');

// Public/Catalog
router.get('/catalog', authenticate, documentController.getDocumentCatalog);

// Candidate view (My Documents)
router.get('/my', authenticate, documentController.getMyDocumentRequests);

// Admin listing & create
router.get('/', authenticate, requireAdmin, documentController.getAllDocumentRequests);
router.post('/', authenticate, requireAdmin, documentController.createDocumentRequest);

// Request details
router.get('/:id', authenticate, documentController.getDocumentRequestById);

// Candidate file upload & final submit
router.post(
  '/:requestId/items/:itemId/upload',
  authenticate,
  documentUpload.single('file'),
  documentController.uploadCandidateDocumentItem
);
router.post('/:requestId/submit', authenticate, documentController.submitAllDocuments);

// Admin verification actions
router.patch(
  '/:requestId/items/:itemId/verify',
  authenticate,
  requireAdmin,
  documentController.verifyCandidateDocumentItem
);
router.post(
  '/:requestId/approve-all',
  authenticate,
  requireAdmin,
  documentController.approveAllDocuments
);

// File download & ZIP archive
router.get(
  '/:requestId/download-zip',
  authenticate,
  requireAdmin,
  documentController.downloadAllDocumentsZip
);
router.get('/file/:docId', authenticate, documentController.downloadDocumentFile);

module.exports = router;
