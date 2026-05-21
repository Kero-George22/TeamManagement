const profileService = require('../services/profile.service');
const asyncWrapper = require('../utils/asyncWrapper');
const { success } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

// GET /profile/me
const getMyProfile = asyncWrapper(async (req, res) => {
  const profile = await profileService.getUserProfile(req.user._id);
  return success(res, profile, 'Profile retrieved successfully');
});

// PUT /profile/me
const updateMyProfile = asyncWrapper(async (req, res) => {
  const { username, avatar, bio, email, headline, location, skills, socials } = req.body;
  const updated = await profileService.updateProfile(req.user._id, {
    username, avatar, bio, email, headline, location, skills, socials
  });
  return success(res, updated, 'Profile updated successfully');
});

// POST /profile/me/avatar  (multipart/form-data, field: "avatar")
const uploadAvatar = asyncWrapper(async (req, res) => {
  if (!req.file) throw new AppError('No image file provided', 400);

  // req.file.path = Cloudinary secure URL set by multer-storage-cloudinary
  const avatarUrl = req.file.path;
  const updated = await profileService.updateProfile(req.user._id, { avatar: avatarUrl });
  return success(res, { avatar: avatarUrl, user: updated }, 'Avatar updated successfully');
});

// GET /profile/:userId
const getUserProfile = asyncWrapper(async (req, res) => {
  const { userId } = req.params;
  const isSelf = String(userId) === String(req.user._id);

  const profile = isSelf || req.user.isAdmin
    ? await profileService.getUserProfile(userId)
    : await profileService.getUserPublicProfile(userId);

  return success(res, profile, 'Profile retrieved successfully');
});

// GET /profile/public/:userId (public, no auth required)
const getPublicProfile = asyncWrapper(async (req, res) => {
  const { userId } = req.params;
  const profile = await profileService.getUserPublicProfile(userId);
  return success(res, profile, 'Public profile retrieved successfully');
});

module.exports = { getMyProfile, updateMyProfile, uploadAvatar, getUserProfile, getPublicProfile };