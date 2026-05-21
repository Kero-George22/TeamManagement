const mongoose = require('mongoose');
const User = require('../models/user.model');
const AppError = require('../utils/AppError');
const emailService = require('../utils/email.service');
const crypto = require('crypto');

const PRIVATE_FIELDS =
  '-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordTokenExpires';

function validateObjectId(id, label = 'ID') {
  if (!id || !mongoose.Types.ObjectId.isValid(String(id)))
    throw new AppError(`Valid ${label} is required`, 400);
}

function generateVerificationToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

// ─────────────────────────────────────────
// GET PROFILE
// ─────────────────────────────────────────

async function getUserProfile(userId) {
  validateObjectId(userId, 'user ID');

  const user = await User.findById(userId).select(PRIVATE_FIELDS).lean();
  if (!user) throw new AppError('User not found', 404);

  return {
    id:        user._id,
    email:     user.email,
    pendingEmail: user.pendingEmail || null,
    username:  user.username || user.email.split('@')[0],
    avatar:    user.avatar   || null,
    bio:       user.bio      || null,
    isAdmin:   user.isAdmin,
    createdAt: user.createdAt,
  };
}

async function getUserPublicProfile(userId) {
  validateObjectId(userId, 'user ID');

  const user = await User.findById(userId)
    .select('username avatar bio lastSeen createdAt')
    .lean();

  if (!user) throw new AppError('User not found', 404);

  return {
    id:        user._id,
    username:  user.username || `user_${String(user._id).slice(-6)}`,
    avatar:    user.avatar   || null,
    bio:       user.bio      || null,
    lastSeen:  user.lastSeen || null,
    createdAt: user.createdAt,
  };
}

// ─────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────

async function updateProfile(userId, updates = {}) {
  validateObjectId(userId, 'user ID');

  const payload = {};
  let emailVerificationRequired = false;
  let verificationTarget = null;

  if (updates.email !== undefined) {
    const nextEmail = String(updates.email).trim().toLowerCase();
    if (!nextEmail) throw new AppError('Email is required', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail))
      throw new AppError('Invalid email address', 400);

    const currentUser = await User.findById(userId).select('email pendingEmail');
    if (!currentUser) throw new AppError('User not found', 404);

    const currentEmail = String(currentUser.email || '').toLowerCase();
    const currentPending = String(currentUser.pendingEmail || '').toLowerCase();
    const changed =
      nextEmail &&
      nextEmail !== currentEmail &&
      nextEmail !== currentPending;

    if (changed) {
      const exists = await User.exists({
        _id: { $ne: userId },
        email: nextEmail,
      });
      if (exists) throw new AppError('Email already in use', 409);

      payload.pendingEmail = nextEmail;
      payload.verificationToken = generateVerificationToken(32);
      payload.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      emailVerificationRequired = true;
      verificationTarget = nextEmail;
    }
  }

  if (updates.username !== undefined) {
    if (String(updates.username).trim().length < 2)
      throw new AppError('Username must be at least 2 characters', 400);
    payload.username = updates.username.trim();
  }
  if (updates.avatar !== undefined) {
    if (updates.avatar === null || String(updates.avatar).trim() === '') {
      payload.avatar = null;
    } else {
      const avatar = String(updates.avatar).trim();
      if (!avatar.startsWith('https://'))
        throw new AppError('Avatar must be an https URL', 400);
      payload.avatar = avatar;
    }
  }
  if (updates.bio    !== undefined) payload.bio    = updates.bio;

  if (Object.keys(payload).length === 0)
    throw new AppError('No valid fields to update', 400);

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: payload },
    { new: true, runValidators: true }
  ).select(PRIVATE_FIELDS).lean();

  if (!user) throw new AppError('User not found', 404);

  if (emailVerificationRequired && verificationTarget) {
    await emailService.verificationEmail(verificationTarget, payload.verificationToken);
  }

  if (emailVerificationRequired) {
    return {
      ...user,
      emailVerificationRequired: true,
      pendingEmail: user.pendingEmail || verificationTarget,
    };
  }
  return user;
}

module.exports = { getUserProfile, getUserPublicProfile, updateProfile };