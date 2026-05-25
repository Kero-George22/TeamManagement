const asyncWrapper     = require('../utils/asyncWrapper');
const { success }      = require('../utils/apiResponse');
const AppError         = require('../utils/AppError');
const User             = require('../models/user.model');
const emailService     = require('../utils/email.service');
const crypto           = require('crypto');
const jwt              = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client();

function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString();
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function expiresIn(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function generateJwt(user) {
  return jwt.sign(
    { sub: String(user._id), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: String(user._id) },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

exports.signup = asyncWrapper(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password required', 400);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AppError('Valid email required', 400);
  if (password.length < 8) throw new AppError('Password min length 8', 400);

  let user = await User.findOne({ email });
  if (user) {
    if (user.isVerified) {
      throw new AppError('Email already in use', 409);
    }
    // If user exists but is not verified, we allow them to restart the signup process
    // This updates their password to the new one and sends a fresh OTP
    user.password = password;
    const verificationCode = generateVerificationCode();
    user.verificationToken = hashToken(verificationCode);
    user.verificationTokenExpires = expiresIn(Number(process.env.VERIFICATION_HOURS) || 24);
    await user.save();

    await emailService.verificationEmail(email, verificationCode);
    return success(res, { id: user._id, email: user.email }, 'Verification email resent.', 200);
  }

  const token = generateVerificationCode();
  user = await User.create({
    email,
    password,
    verificationToken: hashToken(token),
    verificationTokenExpires: expiresIn(Number(process.env.VERIFICATION_HOURS) || 24),
  });

  await emailService.verificationEmail(email, token);

  return success(res, { id: user._id, email: user.email }, 'User created. Verification email sent.', 201);
});
//-----------------
exports.verifyEmail = asyncWrapper(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new AppError('Verification token required', 400);

  const user = await User.findOne({
    verificationToken: { $in: [hashToken(token), token] },
    verificationTokenExpires: { $gt: new Date() },
  });
  if (!user) throw new AppError('Invalid or expired token', 400);

  if (user.pendingEmail) {
    const nextEmail = String(user.pendingEmail).toLowerCase();
    const exists = await User.exists({ _id: { $ne: user._id }, email: nextEmail });
    if (exists) throw new AppError('Email already in use', 409);
    user.email = nextEmail;
    user.pendingEmail = undefined;
  } else {
    user.isVerified = true;
  }
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  return success(res, { id: user._id, email: user.email }, 'Email verified. You can now log in.');
});

exports.login = asyncWrapper(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password required', 400);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AppError('Valid email required', 400);

  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new AppError('Invalid credentials', 401);
  if (!user.isVerified) throw new AppError('Email not verified', 403);
  if (user.isBanned) throw new AppError('Your account has been banned', 403);

  const match = await user.comparePassword(password);
  if (!match) throw new AppError('Invalid credentials', 401);

  const token = generateJwt(user);
  const refreshToken = generateRefreshToken(user);
  
  user.refreshTokens = user.refreshTokens || [];
  user.refreshTokens.push(refreshToken);
  await user.save();

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return success(res, { token, user: { id: user._id, _id: user._id, email: user.email, username: user.username, avatar: user.avatar, isAdmin: user.isAdmin } }, 'Logged in');
});

exports.googleLogin = asyncWrapper(async (req, res) => {
  const { idToken } = req.body;
  if (!process.env.GOOGLE_CLIENT_ID) throw new AppError('Google OAuth is not configured on server', 500);
  if (!idToken) throw new AppError('Missing Google ID token', 400);

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const email = payload?.email;
  const emailVerified = payload?.email_verified;
  const name = payload?.name || '';
  const picture = payload?.picture || '';

  if (!email || !emailVerified) throw new AppError('Google account email is not verified', 403);

  let user = await User.findOne({ email });
  if (user && user.isBanned) throw new AppError('Your account has been banned', 403);
  if (!user) {
    user = await User.create({
      email,
      password: generateToken(24),
      isVerified: true,
      username: name || email.split('@')[0],
      avatar: picture || undefined,
    });
  } else {
    let modified = false;
    if (!user.isVerified) {
      user.isVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      modified = true;
    }
    if (!user.username && name) { user.username = name; modified = true; }
    if (!user.avatar && picture) { user.avatar = picture; modified = true; }
    if (modified) await user.save();
  }

  const token = generateJwt(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshTokens = user.refreshTokens || [];
  user.refreshTokens.push(refreshToken);
  await user.save();

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
  
  return success(res, {
    token,
    user: { id: user._id, _id: user._id, email: user.email, username: user.username, avatar: user.avatar, isAdmin: user.isAdmin },
  }, 'Logged in with Google');
});

exports.logout = asyncWrapper(async (req, res) => {
  const { refreshToken } = req.cookies;
  if (refreshToken) {
    // If the user's access token is still valid, req.user will be present via requireAuth.
    // However, if the frontend calls logout without an access token (or it expired), req.user might be empty.
    // Try to find the user by refreshToken to remove it.
    const user = req.user 
      ? await User.findById(req.user._id) 
      : await User.findOne({ refreshTokens: refreshToken });

    if (user && user.refreshTokens) {
      user.refreshTokens = user.refreshTokens.filter(rt => rt !== refreshToken);
      await user.save();
    }
  }
  
  res.clearCookie('refreshToken');
  return success(res, {}, 'Logged out');
});

exports.refreshToken = asyncWrapper(async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) throw new AppError('Refresh token required', 401);

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      throw new AppError('Invalid refresh token', 401);
    }

    const token = generateJwt(user);
    // Optionally rotate refresh token here as well
    return success(res, { token }, 'Token refreshed');
  } catch (err) {
    throw new AppError('Invalid or expired refresh token', 401);
  }
});

exports.requestPasswordReset = asyncWrapper(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new AppError('Email required', 400);

  const user = await User.findOne({ email });
  if (!user) return success(res, {}, 'If that email exists, a reset link was sent');

  const token = generateToken(16);
  user.resetPasswordToken = hashToken(token);
  user.resetPasswordTokenExpires = expiresIn(Number(process.env.RESET_HOURS) || 1);
  await user.save();

  await emailService.passwordResetEmail(email, token);
  return success(res, {}, 'If that email exists, a reset link was sent');
});

exports.resetPassword = asyncWrapper(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) throw new AppError('Token and newPassword required', 400);
  if (newPassword.length < 8) throw new AppError('Password min length 8', 400);

  const user = await User.findOne({
    resetPasswordToken: { $in: [hashToken(token), token] },
    resetPasswordTokenExpires: { $gt: new Date() },
  });
  if (!user) throw new AppError('Invalid or expired token', 400);

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordTokenExpires = undefined;
  await user.save();

  await emailService.passwordChangedEmail(user.email);
  return success(res, {}, 'Password reset successful');
});

exports.changePassword = asyncWrapper(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) throw new AppError('Old and new passwords required', 400);
  if (newPassword.length < 8) throw new AppError('Password min length 8', 400);

  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw new AppError('User not found', 404);

  const match = await user.comparePassword(oldPassword);
  if (!match) throw new AppError('Old password is incorrect', 401);

  user.password = newPassword;
  await user.save();

  await emailService.passwordChangedEmail(user.email);
  return success(res, {}, 'Password changed');
});
