const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public authentication & verification routes
router.post('/register', AuthController.register);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-otp', AuthController.resendOtp);
router.post('/login', AuthController.login);
router.post('/verify-login-otp', AuthController.verifyLoginOtp);

// Protected routes (JWT required)
router.get('/me', protect, AuthController.getMe);

module.exports = router;
