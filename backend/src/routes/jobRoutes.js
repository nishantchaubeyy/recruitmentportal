const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const { imageUpload } = require('../middleware/uploadMiddleware');

// ==========================================
// PUBLIC VACANCY & STRUCTURE ENDPOINTS
// ==========================================
router.get('/public/vacancies', jobController.getPublicVacancies);
router.get('/public/vacancies/:id', jobController.getPublicVacancyById);

router.get('/public/schools', jobController.getSchools);
router.get('/public/schools/:id/departments', jobController.getSchoolDepartments);
router.get('/public/departments/:id/positions', jobController.getDepartmentPositions);

// ==========================================
// ADMIN VACANCY & STRUCTURE MANAGEMENT ENDPOINTS
// ==========================================
router.get('/admin/vacancies', authenticateToken, requireAdmin, jobController.getAllJobs);
router.post('/admin/vacancies', authenticateToken, requireAdmin, jobController.createJob);
router.get('/admin/vacancies/:id', authenticateToken, requireAdmin, jobController.getJobById);
router.put('/admin/vacancies/:id', authenticateToken, requireAdmin, jobController.updateJob);
router.patch('/admin/vacancies/:id/status', authenticateToken, requireAdmin, jobController.updateJobStatus);

// Admin School & Poster Endpoints
router.get('/admin/schools', authenticateToken, requireAdmin, jobController.getSchools);
router.put('/admin/schools/:id', authenticateToken, requireAdmin, jobController.updateSchool);
router.post('/admin/schools/:id/poster', authenticateToken, requireAdmin, imageUpload.single('poster'), jobController.uploadSchoolPoster);
router.delete('/admin/schools/:id/poster', authenticateToken, requireAdmin, jobController.deleteSchoolPoster);
router.get('/admin/schools/:id/departments', authenticateToken, requireAdmin, jobController.getSchoolDepartments);
router.get('/admin/departments/:id/positions', authenticateToken, requireAdmin, jobController.getDepartmentPositions);

// Public jobs aliases (explicit prefix to avoid greedy catch-all routing).
router.get('/jobs', jobController.getPublicVacancies);
router.get('/jobs/:id', jobController.getPublicVacancyById);

module.exports = router;

