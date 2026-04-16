const profileService = require('../services/profile.service');
const asyncWrapper = require('../utils/asyncWrapper');
const { success } = require('../utils/apiResponse');

// GET /profile/me
const getMyProfile = asyncWrapper(async (req, res) => {
  const profile = await profileService.getUserProfile(req.user._id);
  return success(res, profile, 'Profile retrieved successfully');
});

// PUT /profile/me
const updateMyProfile = asyncWrapper(async (req, res) => {
  const { username, avatar, bio, email } = req.body;
  const updated = await profileService.updateProfile(req.user._id, { username, avatar, bio, email });
  return success(res, updated, 'Profile updated successfully');
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

module.exports = { getMyProfile, updateMyProfile, getUserProfile, getPublicProfile };