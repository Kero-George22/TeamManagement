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
    id:          user._id,
    email:       user.email,
    pendingEmail: user.pendingEmail || null,
    username:    user.username || user.email.split('@')[0],
    avatar:      user.avatar   || null,
    bio:         user.bio      || null,
    headline:    user.headline || null,
    location:    user.location || null,
    skills:      user.skills   || [],
    socials:     user.socials  || {},
    isAdmin:     user.isAdmin,
    createdAt:   user.createdAt,
  };
}

async function getUserPublicProfile(userId) {
  validateObjectId(userId, 'user ID');

  const user = await User.findById(userId)
    .select('username avatar bio headline location skills socials lastSeen createdAt completedTasks')
    .lean();

  if (!user) throw new AppError('User not found', 404);

  return {
    id:         user._id,
    username:   user.username || `user_${String(user._id).slice(-6)}`,
    avatar:     user.avatar   || null,
    bio:        user.bio      || null,
    headline:   user.headline || null,
    location:   user.location || null,
    skills:     user.skills   || [],
    socials:    user.socials  || {},
    lastSeen:   user.lastSeen || null,
    createdAt:  user.createdAt,
    completedTasks: user.completedTasks || 0,
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
  if (updates.bio      !== undefined) payload.bio      = String(updates.bio || '').slice(0, 1000);
  if (updates.headline !== undefined) payload.headline = String(updates.headline || '').slice(0, 120);
  if (updates.location !== undefined) payload.location = String(updates.location || '').slice(0, 100);
  if (updates.skills   !== undefined) {
    if (!Array.isArray(updates.skills)) throw new AppError('Skills must be an array', 400);
    payload.skills = updates.skills.map(s => String(s).trim()).filter(Boolean).slice(0, 30);
  }
  if (updates.socials !== undefined) {
    if (typeof updates.socials !== 'object') throw new AppError('Socials must be an object', 400);
    
    const validatedSocials = {};
    const rules = {
      whatsapp: /(wa\.me|whatsapp\.com)/i,
      facebook: /(facebook\.com|fb\.com|fb\.me)/i,
      linkedin: /linkedin\.com/i,
      twitter: /(twitter\.com|x\.com)/i,
      github: /github\.com/i,
    };

    for (const [key, regex] of Object.entries(rules)) {
      if (updates.socials[key]) {
        const url = String(updates.socials[key]).trim();
        if (url !== '' && !regex.test(url)) {
          throw new AppError(`Invalid ${key} link. Make sure it's a real profile link.`, 400);
        }
        if (url !== '') {
          validatedSocials[key] = url.startsWith('http') ? url : `https://${url}`;
        } else {
          validatedSocials[key] = ''; // allow clearing
        }
      } else if (updates.socials[key] === '') {
        validatedSocials[key] = '';
      }
    }
    
    // Only update if there are keys
    if (Object.keys(validatedSocials).length > 0) {
      payload.socials = validatedSocials;
    }
  }

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