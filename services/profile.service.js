const mongoose = require('mongoose');
const User = require('../models/user.model');
const AppError = require('../utils/AppError');

const PRIVATE_FIELDS =
  '-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordTokenExpires';

function validateObjectId(id, label = 'ID') {
  if (!id || !mongoose.Types.ObjectId.isValid(String(id)))
    throw new AppError(`Valid ${label} is required`, 400);
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
    username:  user.username || user.email.split('@')[0],
    avatar:    user.avatar   || null,
    bio:       user.bio      || null,
    isAdmin:   user.isAdmin,
    createdAt: user.createdAt,
  };
}

async function getUserPublicProfile(userId) {
  const profile = await getUserProfile(userId);
  delete profile.email;
  delete profile.isAdmin;
  return profile;
}

// ─────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────

async function updateProfile(userId, updates = {}) {
  validateObjectId(userId, 'user ID');

  const payload = {};
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
        throw new AppError('Avatar URL must start with https://', 400);
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
  return user;
}

module.exports = { getUserProfile, getUserPublicProfile, updateProfile };