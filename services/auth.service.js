const User = require('../models/user.model');
const TokenBlacklist = require('../models/tokenBlacklist.model');
const emailService = require('../utils/email.service');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const VERIFICATION_HOURS = Number(process.env.VERIFICATION_HOURS) || 24;

function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateShortToken() {
  // shorter token for password resets if desired
  return crypto.randomBytes(16).toString('hex');
}

async function signup(email, password) {
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('Email already in use');
    err.status = 409;
    throw err;
  }

  const token = generateVerificationToken();
  const expires = new Date(Date.now() + VERIFICATION_HOURS * 60 * 60 * 1000);

  const user = new User({ email, password, verificationToken: token, verificationTokenExpires: expires });
  await user.save();

  // Send verification email (uses Gmail when configured)
  await emailService.verificationEmail(user.email, token);

  return { id: user._id, email: user.email };
}

async function verifyEmail(token) {
  if (!token) {
    const err = new Error('Missing verification token');
    err.status = 400;
    throw err;
  }

  const user = await User.findOne({ verificationToken: token, verificationTokenExpires: { $gt: new Date() } });
  if (!user) {
    const err = new Error('Invalid or expired token');
    err.status = 400;
    throw err;
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  // optional: send confirmation email
  // await emailService.sendMail({ to: user.email, subject: 'Email verified', html: '<p>Your email was verified.</p>' });

  return { id: user._id, email: user.email };
}

function generateJwt(user) {
  return jwt.sign({ sub: String(user._id), email: user.email, reliability: user.reliabilityScore }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function login(email, password) {
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  if (!user.isVerified) {
    const err = new Error('Email not verified');
    err.status = 403;
    throw err;
  }

  const match = await user.comparePassword(password);
  if (!match) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const token = generateJwt(user);
  return { token, user: { id: user._id, email: user.email, reliability: user.reliabilityScore } };
}

async function logout(token) {
  if (!token) return null;
  try {
    const decoded = jwt.decode(token);
    const exp = decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 24 * 3600 * 1000);
    const item = new TokenBlacklist({ token, expiresAt: exp });
    await item.save();
    return item;
  } catch (err) {
    return null;
  }
}

async function requestPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user) {
    // don't reveal existence
    return { ok: true };
  }
  const token = generateShortToken();
  const expires = new Date(Date.now() + VERIFICATION_HOURS * 60 * 60 * 1000);
  user.resetPasswordToken = token;
  user.resetPasswordTokenExpires = expires;
  await user.save();
  await emailService.passwordResetEmail(user.email, token);
  return { ok: true };
}

async function resetPassword(token, newPassword) {
  if (!token || !newPassword) {
    const err = new Error('Missing token or new password');
    err.status = 400;
    throw err;
  }
  const user = await User.findOne({ resetPasswordToken: token, resetPasswordTokenExpires: { $gt: new Date() } });
  if (!user) {
    const err = new Error('Invalid or expired token');
    err.status = 400;
    throw err;
  }
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordTokenExpires = undefined;
  await user.save();
  await emailService.passwordChangedEmail(user.email);
  return { ok: true };
}

async function changePassword(userId, oldPassword, newPassword) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  const match = await user.comparePassword(oldPassword);
  if (!match) {
    const err = new Error('Old password is incorrect');
    err.status = 401;
    throw err;
  }
  user.password = newPassword;
  await user.save();
  await emailService.passwordChangedEmail(user.email);
  return { ok: true };
}

async function deleteUnverifiedOlderThan(hours = VERIFICATION_HOURS) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const res = await User.deleteMany({ isVerified: false, createdAt: { $lt: cutoff } });
  return res;
}

module.exports = { signup, verifyEmail, login, generateJwt, deleteUnverifiedOlderThan };
