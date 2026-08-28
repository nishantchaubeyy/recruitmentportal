const express = require('express');
const router = express.Router();
const vacancyInterestController = require('../controllers/vacancyInterestController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// Public interest registration endpoint
router.post('/public/vacancy-interest', vacancyInterestController.createVacancyInterest);

// Admin interest management endpoints
router.get('/admin/vacancy-interests', authenticateToken, requireAdmin, vacancyInterestController.getVacancyInterests);
router.post('/admin/vacancies/:id/notify-interested', authenticateToken, requireAdmin, vacancyInterestController.notifyInterestedApplicantsForVacancy);

module.exports = router;
