const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

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

router.get('/admin/schools', authenticateToken, requireAdmin, jobController.getSchools);
router.get('/admin/schools/:id/departments', authenticateToken, requireAdmin, jobController.getSchoolDepartments);
router.get('/admin/departments/:id/positions', authenticateToken, requireAdmin, jobController.getDepartmentPositions);

// Backward compatibility routes for existing code
router.get('/', jobController.getPublicVacancies);
router.get('/:id', jobController.getPublicVacancyById);
router.post('/', authenticateToken, requireAdmin, jobController.createJob);
router.put('/:id', authenticateToken, requireAdmin, jobController.updateJob);
router.patch('/:id/status', authenticateToken, requireAdmin, jobController.updateJobStatus);

module.exports = router;
