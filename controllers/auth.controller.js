const asyncWrapper     = require('../utils/asyncWrapper');
const { success }      = require('../utils/apiResponse');
const AppError         = require('../utils/AppError');
const User             = require('../models/user.model');
const TokenBlacklist   = require('../models/tokenBlacklist.model');
const emailService     = require('../utils/email.service');
const crypto           = require('crypto');
const jwt              = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client();

function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function expiresIn(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function generateJwt(user) {
  return jwt.sign(
    { sub: String(user._id), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

exports.signup = asyncWrapper(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password required', 400);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AppError('Valid email required', 400);
  if (password.length < 8) throw new AppError('Password min length 8', 400);

  const existing = await User.findOne({ email }).lean();
  if (existing) throw new AppError('Email already in use', 409);

  const token = generateToken(32);
  const user = await User.create({
    email,
    password,
    verificationToken: token,
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
    verificationToken: token,
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

  const user = await User.findOne({ email });
  if (!user) throw new AppError('Invalid credentials', 401);
  if (!user.isVerified) throw new AppError('Email not verified', 403);

  const match = await user.comparePassword(password);
  if (!match) throw new AppError('Invalid credentials', 401);

  const token = generateJwt(user);
  return success(res, { token, user: { id: user._id, email: user.email } }, 'Logged in');
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
  return success(res, {
    token,
    user: { id: user._id, email: user.email, username: user.username, avatar: user.avatar },
  }, 'Logged in with Google');
});

exports.logout = asyncWrapper(async (req, res) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    const decoded = jwt.decode(token);
    if (decoded?.exp) {
      await TokenBlacklist.create({
        token,
        expiresAt: new Date(decoded.exp * 1000),
      });
    }
  }
  return success(res, {}, 'Logged out');
});

exports.requestPasswordReset = asyncWrapper(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new AppError('Email required', 400);

  const user = await User.findOne({ email });
  if (!user) return success(res, {}, 'If that email exists, a reset link was sent');

  const token = generateToken(16);
  user.resetPasswordToken = token;
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
    resetPasswordToken: token,
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

  const user = await User.findById(req.user._id);
  if (!user) throw new AppError('User not found', 404);

  const match = await user.comparePassword(oldPassword);
  if (!match) throw new AppError('Old password is incorrect', 401);

  user.password = newPassword;
  await user.save();

  await emailService.passwordChangedEmail(user.email);
  return success(res, {}, 'Password changed');
});
