const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// Primary Auth Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.get('/me', authenticate, authController.getMe);

// Applicant Auth Explicit Alias Routes
router.post('/applicant/auth/register', authController.register);
router.post('/applicant/auth/login', authController.login);
router.post('/applicant/auth/refresh', authController.refreshToken);
router.post('/applicant/auth/send-otp', authController.sendOTP);
router.post('/applicant/auth/verify-otp', authController.verifyOTP);
router.get('/applicant/auth/me', authenticate, authController.getMe);

module.exports = router;
