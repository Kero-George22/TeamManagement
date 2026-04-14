const User = require('../models/user.model');
const TokenBlacklist = require('../models/tokenBlacklist.model');
const emailService = require('../utils/email.service');
const AppError = require('../utils/AppError');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

// ─────────────────────────────────────────
// Config — fail fast if required vars are missing
// ─────────────────────────────────────────

const JWT_SECRET      = process.env.JWT_SECRET;
const JWT_EXPIRES_IN  = process.env.JWT_EXPIRES_IN || '7d';
const VERIFY_HOURS    = Number(process.env.VERIFICATION_HOURS) || 24;
const RESET_HOURS     = Number(process.env.RESET_HOURS)        || 1;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!JWT_SECRET) throw new Error('JWT_SECRET env variable is not set');

const googleClient = new OAuth2Client();

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function expiresIn(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function generateJwt(user) {
  // Only stable, non-changing fields go in the token
  return jwt.sign(
    { sub: String(user._id), email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// ─────────────────────────────────────────
// SIGNUP
// ─────────────────────────────────────────

async function signup(email, password) {
  const existing = await User.findOne({ email }).lean();
  if (existing) throw new AppError('Email already in use', 409);

  const token = generateToken(32);

  const user = new User({
    email,
    password,
    verificationToken: token,
    verificationTokenExpires: expiresIn(VERIFY_HOURS),
  });
  await user.save();

  await emailService.verificationEmail(email, token);

  return { id: user._id, email: user.email };
}

// ─────────────────────────────────────────
// VERIFY EMAIL
// ─────────────────────────────────────────

async function verifyEmail(token) {
  if (!token) throw new AppError('Missing verification token', 400);

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

  return { id: user._id, email: user.email };
}

// ─────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────

async function login(email, password) {
  const user = await User.findOne({ email });
  if (!user) throw new AppError('Invalid credentials', 401);
  if (!user.isVerified) throw new AppError('Email not verified', 403);

  const match = await user.comparePassword(password);
  if (!match) throw new AppError('Invalid credentials', 401);

  const token = generateJwt(user);
  return { token, user: { id: user._id, email: user.email } };
}

async function googleLogin(idToken) {
  if (!GOOGLE_CLIENT_ID) {
    throw new AppError('Google OAuth is not configured on server', 500);
  }
  if (!idToken) {
    throw new AppError('Missing Google ID token', 400);
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const email = payload?.email;
  const emailVerified = payload?.email_verified;
  const name = payload?.name || '';
  const picture = payload?.picture || '';

  if (!email || !emailVerified) {
    throw new AppError('Google account email is not verified', 403);
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = new User({
      email,
      password: generateToken(24),
      isVerified: true,
      username: name || email.split('@')[0],
      avatar: picture || undefined,
    });
    await user.save();
  } else {
    if (!user.isVerified) {
      user.isVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
    }
    if (!user.username && name) user.username = name;
    if (!user.avatar && picture) user.avatar = picture;
    if (user.isModified()) await user.save();
  }

  const token = generateJwt(user);
  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
    },
  };
}

// ─────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────

async function logout(token) {
  if (!token) return null;

  const decoded = jwt.decode(token);
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 24 * 3600 * 1000);

  // If this throws, the caller will get a real error — token stays valid,
  // which is the safe behaviour (don't silently swallow blacklist failures)
  await TokenBlacklist.create({ token, expiresAt });

  return { ok: true };
}

// ─────────────────────────────────────────
// PASSWORD RESET
// ─────────────────────────────────────────

async function requestPasswordReset(email) {
  const user = await User.findOne({ email });

  // Don't reveal whether the email exists
  if (!user) return { ok: true };

  const token = generateToken(16);
  user.resetPasswordToken = token;
  user.resetPasswordTokenExpires = expiresIn(RESET_HOURS);
  await user.save();

  await emailService.passwordResetEmail(email, token);
  return { ok: true };
}

async function resetPassword(token, newPassword) {
  if (!token || !newPassword)
    throw new AppError('Missing token or new password', 400);

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
  return { ok: true };
}

// ─────────────────────────────────────────
// CHANGE PASSWORD (authenticated)
// ─────────────────────────────────────────

async function changePassword(userId, oldPassword, newPassword) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  const match = await user.comparePassword(oldPassword);
  if (!match) throw new AppError('Old password is incorrect', 401);

  user.password = newPassword;
  await user.save();

  await emailService.passwordChangedEmail(user.email);
  return { ok: true };
}

// ─────────────────────────────────────────
// CLEANUP (cron job)
// ─────────────────────────────────────────

async function deleteUnverifiedOlderThan(hours = VERIFY_HOURS) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return User.deleteMany({ isVerified: false, createdAt: { $lt: cutoff } });
}

// ─────────────────────────────────────────
// Exports
// ─────────────────────────────────────────

module.exports = {
  signup,
  verifyEmail,
  login,
  googleLogin,
  logout,
  generateJwt,
  requestPasswordReset,
  resetPassword,
  changePassword,
  deleteUnverifiedOlderThan,
};