const profileService = require('../services/profile.service');
const asyncWrapper = require('../utils/asyncWrapper');
const { success, error } = require('../utils/apiResponse');
const mongoose = require('mongoose');

function isValidUserId(id) {
  return !!id && id !== 'undefined' && mongoose.Types.ObjectId.isValid(String(id));
}

/**
 * Update user's own profile
 */
const updateMyProfile = asyncWrapper(async (req, res) => {
  const userId = req.user._id;
  const { username, avatar, bio } = req.body;
  const updated = await profileService.updateProfile(userId, { username, avatar, bio });
  return success(res, updated, 'Profile updated successfully');
});

/**
 * Get user's own profile
 */
const getMyProfile = asyncWrapper(async (req, res) => {
  const userId = req.user._id;

  const profile = await profileService.getUserProfile(userId);

  return success(res, profile, 'Profile retrieved successfully');
});

/**
 * Get user profile by ID
 */
const getUserProfile = asyncWrapper(async (req, res) => {
  const { userId } = req.params;

  if (!isValidUserId(userId)) {
    return error(res, 'Valid user ID is required', 400);
  }

  // Check if requester is viewing their own profile or if admin
  if (userId === req.user._id.toString() || req.user.isAdmin) {
    const profile = await profileService.getUserProfile(userId);
    return success(res, profile, 'Profile retrieved successfully');
  } else {
    // Return public profile for others
    const profile = await profileService.getUserPublicProfile(userId);
    return success(res, profile, 'Public profile retrieved successfully');
  }
});

/**
 * Get leaderboard
 */
const getLeaderboard = asyncWrapper(async (req, res) => {
  const { limit = 10 } = req.query;

  if (isNaN(limit) || limit < 1 || limit > 100) {
    return error(res, 'Limit must be a number between 1 and 100', 400);
  }

  const leaderboard = await profileService.getLeaderboard(parseInt(limit));

  return success(res, leaderboard, 'Leaderboard retrieved successfully');
});

/**
 * Get user's rank
 */
const getUserRank = asyncWrapper(async (req, res) => {
  const { userId } = req.params;

  if (!isValidUserId(userId)) {
    return error(res, 'Valid user ID is required', 400);
  }

  const rank = await profileService.getUserRank(userId);

  return success(res, { rank }, 'User rank retrieved successfully');
});

/**
 * Get user statistics
 */
const getUserStatistics = asyncWrapper(async (req, res) => {
  const { userId } = req.params;

  if (!isValidUserId(userId)) {
    return error(res, 'Valid user ID is required', 400);
  }

  // Only allow users to view their own stats or if admin
  if (userId !== req.user._id.toString() && !req.user.isAdmin) {
    return error(res, 'Unauthorized', 403);
  }

  const stats = await profileService.getUserStatistics(userId);

  return success(res, stats, 'Statistics retrieved successfully');
});

/**
 * Get my statistics
 */
const getMyStatistics = asyncWrapper(async (req, res) => {
  const userId = req.user._id;

  const stats = await profileService.getUserStatistics(userId);

  return success(res, stats, 'Statistics retrieved successfully');
});

module.exports = {
  updateMyProfile,
  getMyProfile,
  getUserProfile,
  getLeaderboard,
  getUserRank,
  getUserStatistics,
  getMyStatistics
};
