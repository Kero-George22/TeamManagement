const authService = require('../services/auth.service');
const asyncWrapper = require('../utils/asyncWrapper');
const { success, error } = require('../utils/apiResponse');

const signup = asyncWrapper(async (req, res) => {
	const { email, password } = req.body;
	if (!email || !password) return error(res, 'Email and password required', 400);
	const data = await authService.signup(email, password);
	return success(res, data, 'User created. Verification email sent.', 201);
});

const verifyEmail = asyncWrapper(async (req, res) => {
	const { token } = req.body;
	if (!token) return error(res, 'Verification token required', 400);
	await authService.verifyEmail(token);
	return success(res, {}, 'Email verified. You can now log in.');
});

const login = asyncWrapper(async (req, res) => {
	const { email, password } = req.body;
	if (!email || !password) return error(res, 'Email and password required', 400);
	const data = await authService.login(email, password);
	return success(res, data, 'Logged in');
});

const logout = asyncWrapper(async (req, res) => {
	const token = req.token || (req.headers.authorization && req.headers.authorization.slice(7));
	if (!token) return error(res, 'Missing token', 400);
	await authService.logout(token);
	return success(res, {}, 'Logged out');
});

const requestPasswordReset = asyncWrapper(async (req, res) => {
	const { email } = req.body;
	if (!email) return error(res, 'Email required', 400);
	await authService.requestPasswordReset(email);
	return success(res, {}, 'If that email exists, a reset link was sent');
});

const resetPassword = asyncWrapper(async (req, res) => {
	const { token, newPassword } = req.body;
	if (!token || !newPassword) return error(res, 'Token and newPassword required', 400);
	await authService.resetPassword(token, newPassword);
	return success(res, {}, 'Password reset successful');
});

const changePassword = asyncWrapper(async (req, res) => {
	const userId = req.user && req.user._id;
	const { oldPassword, newPassword } = req.body;
	if (!oldPassword || !newPassword) return error(res, 'Old and new passwords required', 400);
	await authService.changePassword(userId, oldPassword, newPassword);
	return success(res, {}, 'Password changed');
});

module.exports = { signup, verifyEmail, login, logout, requestPasswordReset, resetPassword, changePassword };
