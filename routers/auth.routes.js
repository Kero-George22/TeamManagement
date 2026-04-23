const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middlewares/auth.middleware');

const loginLimiter = rateLimit({
	windowMs: Number(process.env.LOGIN_WINDOW_MS) || 15 * 60 * 1000,
	max: Number(process.env.LOGIN_MAX_ATTEMPTS) || 5,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, message: 'Too many login attempts, try later.' },
});

router.post('/signup', authController.signup);
router.post('/verify', authController.verifyEmail);
router.post('/login', loginLimiter, authController.login);
router.post('/google', loginLimiter, authController.googleLogin);
router.post('/logout', requireAuth, authController.logout);
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', requireAuth, authController.changePassword);

module.exports = router;
