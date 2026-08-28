const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// Primary Auth Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.get('/me', authenticate, authController.getMe);

// Applicant Auth Explicit Alias Routes
router.post('/applicant/auth/register', authController.register);
router.post('/applicant/auth/login', authController.login);
router.post('/applicant/auth/refresh', authController.refreshToken);
router.get('/applicant/auth/me', authenticate, authController.getMe);

module.exports = router;
