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

const signupLimiter = rateLimit({
	windowMs: Number(process.env.SIGNUP_WINDOW_MS) || 60 * 60 * 1000,
	max: Number(process.env.SIGNUP_MAX_ATTEMPTS) || 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, message: 'Too many signup attempts, try later.' },
});

const tokenLimiter = rateLimit({
	windowMs: Number(process.env.AUTH_TOKEN_WINDOW_MS) || 15 * 60 * 1000,
	max: Number(process.env.AUTH_TOKEN_MAX_ATTEMPTS) || 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, message: 'Too many attempts, try later.' },
});

const passwordResetLimiter = rateLimit({
	windowMs: Number(process.env.RESET_WINDOW_MS) || 60 * 60 * 1000,
	max: Number(process.env.RESET_MAX_ATTEMPTS) || 5,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, message: 'Too many password reset attempts, try later.' },
});

router.post('/signup', signupLimiter, authController.signup);
router.post('/verify', tokenLimiter, authController.verifyEmail);
router.post('/login', loginLimiter, authController.login);
router.post('/google', loginLimiter, authController.googleLogin);
router.post('/refresh', tokenLimiter, authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/forgot-password', passwordResetLimiter, authController.requestPasswordReset);
router.post('/reset-password', tokenLimiter, authController.resetPassword);
router.post('/change-password', requireAuth, authController.changePassword);

module.exports = router;
