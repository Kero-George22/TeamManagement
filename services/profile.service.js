const mongoose = require('mongoose');
const User = require('../models/user.model');
const Project = require('../models/project.model');
const Submission = require('../models/submission.model');
const { BADGES, determineEarnedBadges, getProgressToNextLevel } = require('../utils/levelCalculator');

function ensureValidUserId(userId) {
  if (!userId || userId === 'undefined' || !mongoose.Types.ObjectId.isValid(String(userId))) {
    const err = new Error('Valid user ID is required');
    err.status = 400;
    throw err;
  }
}

async function updateProfile(userId, updates = {}) {
  ensureValidUserId(userId);

  const allowed = ['username', 'avatar', 'bio'];
  const filtered = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }

  if (filtered.username !== undefined && String(filtered.username).trim().length < 2) {
    const err = new Error('Username must be at least 2 characters');
    err.status = 400;
    throw err;
  }

  if (Object.keys(filtered).length === 0) {
    const err = new Error('No valid fields to update');
    err.status = 400;
    throw err;
  }

  const user = await User.findByIdAndUpdate(userId, { $set: filtered }, { new: true, runValidators: true })
    .select('-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordTokenExpires');

  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return user;
}

async function getUserProfile(userId) {
  ensureValidUserId(userId);

  const user = await User.findById(userId)
    .select('-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordTokenExpires');

  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const levelInfo = getProgressToNextLevel(user.totalXP || 0);
  const earnedBadges = determineEarnedBadges(user);

  const projects = await Project.find({ 'members.userId': userId }).select('title status'); // array of object
  const submissions = await Submission.find({ user: userId, status: 'accepted' })
    .select('score task project createdAt')
    .populate('task', 'title xpPoints')
    .populate('project', 'title');

  const stats = {
    totalXP: user.totalXP || 0,
    level: levelInfo.currentLevel,
    completedTasks: user.completedTasks || 0,
    averageScore: submissions.length > 0
      ? Math.round(submissions.reduce((sum, sub) => sum + (sub.score || 0), 0) / submissions.length)
      : 0,
    projectsJoined: projects.length,
    levelProgress: levelInfo.percentProgress
  };

  const userBadges = earnedBadges
    .map((badgeId) => BADGES[badgeId])
    .filter(Boolean);

  return {
    id: user._id,
    _id: user._id,
    email: user.email,
    username: user.username || user.email.split('@')[0],
    avatar: user.avatar,
    bio: user.bio,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
    stats,
    badges: userBadges,
    recentSubmissions: submissions.slice(0, 5),
    projects
  };
}

async function getUserPublicProfile(userId) {
  const profile = await getUserProfile(userId);
  delete profile.email;
  return profile;
}

async function getLeaderboard(limit = 10) {
  const users = await User.find()
    .select('username email totalXP completedTasks avatar bio')
    .sort({ totalXP: -1 })
    .limit(limit);

  return users.map((user, index) => {
    const levelInfo = getProgressToNextLevel(user.totalXP || 0);
    return {
      rank: index + 1,
      id: user._id,
      _id: user._id,
      username: user.username || user.email.split('@')[0],
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      totalXP: user.totalXP || 0,
      level: levelInfo.currentLevel,
      completedTasks: user.completedTasks || 0
    };
  });
}

async function getUserRank(userId) {
  ensureValidUserId(userId);

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const rankAbove = await User.countDocuments({ totalXP: { $gt: user.totalXP || 0 } });
  return rankAbove + 1;
}

async function getUserStatistics(userId) {
  ensureValidUserId(userId);

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const submissions = await Submission.find({ user: userId });
  const acceptedSubmissions = submissions.filter((s) => s.status === 'accepted');
  const pendingSubmissions = submissions.filter((s) => s.status === 'pending');
  const rejectedSubmissions = submissions.filter((s) => s.status === 'rejected');

  const levelInfo = getProgressToNextLevel(user.totalXP || 0);

  return {
    userId,
    totalXP: user.totalXP || 0,
    level: levelInfo.currentLevel,
    nextLevelXP: levelInfo.nextLevelXP,
    currentLevelXP: levelInfo.currentLevelXP,
    percentToNextLevel: levelInfo.percentProgress,
    completedTasks: user.completedTasks || 0,
    totalSubmissions: submissions.length,
    acceptedSubmissions: acceptedSubmissions.length,
    pendingSubmissions: pendingSubmissions.length,
    rejectedSubmissions: rejectedSubmissions.length,
    acceptanceRate: submissions.length > 0
      ? Math.round((acceptedSubmissions.length / submissions.length) * 100)
      : 0,
    averageScore: acceptedSubmissions.length > 0
      ? Math.round(acceptedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / acceptedSubmissions.length)
      : 0
  };
}

async function getProfile(userId) {
  ensureValidUserId(userId);

  const user = await User.findById(userId)
    .select('-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordTokenExpires');

  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return user;
}

async function addXp(userId, xpAmount) {
  ensureValidUserId(userId);

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  user.xp = (user.xp || 0) + xpAmount;
  const newLevel = Math.floor(user.xp / 1000) + 1;
  if (newLevel > user.level) user.level = newLevel;

  await user.save();
  return user;
}

module.exports = {
  getUserProfile,
  getUserPublicProfile,
  getLeaderboard,
  getUserRank,
  getUserStatistics,
  getProfile,
  updateProfile,
  addXp
};
