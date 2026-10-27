const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticate, requireAdmin, reportController.getRecruitmentReport);

module.exports = router;
