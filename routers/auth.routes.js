const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const rateLimit = require('express-rate-limit');
const validation = require('../middlewares/validation.middleware');

const loginLimiter = rateLimit({
	windowMs: Number(process.env.LOGIN_WINDOW_MS) || 15 * 60 * 1000,
	max: Number(process.env.LOGIN_MAX_ATTEMPTS) || 5,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, message: 'Too many login attempts, try later.' },
});

router.post('/signup', [
	body('email').isEmail().withMessage('Valid email required'),
	body('password').isLength({ min: 8 }).withMessage('Password min length 8'),
], validation, authController.signup);

router.post('/verify', [body('token').notEmpty().withMessage('Token required')], validation, authController.verifyEmail);

router.post('/login', loginLimiter, [
	body('email').isEmail().withMessage('Valid email required'),
	body('password').notEmpty().withMessage('Password required'),
], validation, authController.login);

const { requireAuth } = require('../middlewares/auth.middleware');

router.post('/logout', requireAuth, authController.logout);

router.post('/forgot-password', [body('email').isEmail().withMessage('Valid email required')], validation, authController.requestPasswordReset);

router.post('/reset-password', [
	body('token').notEmpty().withMessage('Token required'),
	body('newPassword').isLength({ min: 8 }).withMessage('Password min length 8'),
], validation, authController.resetPassword);

router.post('/change-password', requireAuth, [
	body('oldPassword').notEmpty().withMessage('Old password required'),
	body('newPassword').isLength({ min: 8 }).withMessage('Password min length 8'),
], validation, authController.changePassword);

module.exports = router;
