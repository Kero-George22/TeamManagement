const User = require('../models/user.model');
const twoFAService = require('../services/twofa.service');
const asyncWrapper = require('../utils/asyncWrapper');
const AppError = require('../utils/AppError');
const { success } = require('../utils/apiResponse');

// POST /auth/2fa/setup
const setup2FA = asyncWrapper(async (req, res) => {
  const user = await User.findById(req.user._id).select('+twoFA.secret');
  
  // Create a new secret and QR URI
  const { secret, uri } = twoFAService.generateSecret(user);
  
  // Generate backup codes
  const { codes, hashedCodes } = twoFAService.generateBackupCodes();

  // Save to user but don't enable yet
  user.twoFA = {
    enabled: false, // Remains false until confirmed
    secret: secret,
    backupCodes: hashedCodes,
  };
  await user.save();

  return success(res, { uri, backupCodes: codes }, '2FA setup initiated. Please verify with a token.');
});

// POST /auth/2fa/enable
const enable2FA = asyncWrapper(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new AppError('Token is required', 400);

  const user = await User.findById(req.user._id).select('+twoFA.secret');
  if (!user.twoFA || !user.twoFA.secret) throw new AppError('2FA setup not initiated', 400);

  const isValid = twoFAService.verifyToken(user.twoFA.secret, token);
  if (!isValid) throw new AppError('Invalid token', 400);

  user.twoFA.enabled = true;
  await user.save();

  return success(res, null, '2FA enabled successfully');
});

// POST /auth/2fa/disable
const disable2FA = asyncWrapper(async (req, res) => {
  const { password, token } = req.body;
  if (!password || !token) throw new AppError('Password and token are required', 400);

  const user = await User.findById(req.user._id).select('+password +twoFA.secret');
  
  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new AppError('Incorrect password', 401);

  if (user.twoFA && user.twoFA.enabled) {
    const isValid = twoFAService.verifyToken(user.twoFA.secret, token);
    if (!isValid) throw new AppError('Invalid 2FA token', 400);
  }

  user.twoFA = { enabled: false, secret: undefined, backupCodes: [] };
  await user.save();

  return success(res, null, '2FA disabled successfully');
});

module.exports = {
  setup2FA,
  enable2FA,
  disable2FA,
};
