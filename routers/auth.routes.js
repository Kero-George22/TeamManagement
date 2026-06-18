const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const twoFAController = require('../controllers/twofa.controller');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const { signupValidation, loginValidation, resetPasswordValidation, changePasswordValidation } = require('../middlewares/validation/auth.validation');

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

router.post('/signup', signupLimiter, signupValidation, validate, authController.signup);
router.post('/verify', tokenLimiter, authController.verifyEmail);
router.post('/login', loginLimiter, loginValidation, validate, authController.login);
router.post('/google', loginLimiter, authController.googleLogin);
router.post('/refresh', tokenLimiter, authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/forgot-password', passwordResetLimiter, authController.requestPasswordReset);
router.post('/reset-password', tokenLimiter, resetPasswordValidation, validate, authController.resetPassword);
router.post('/change-password', requireAuth, changePasswordValidation, validate, authController.changePassword);

router.post('/verify-2fa', authController.verify2FA);
router.post('/2fa/setup', requireAuth, twoFAController.setup2FA);
router.post('/2fa/enable', requireAuth, twoFAController.enable2FA);
router.post('/2fa/disable', requireAuth, twoFAController.disable2FA);

module.exports = router;
