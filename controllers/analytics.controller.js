const mongoose = require('mongoose');
const User = require('../models/user.model');
const Project = require('../models/project.model');
const Task = require('../models/task.model');
const Submission = require('../models/submission.model');
const asyncWrapper = require('../utils/asyncWrapper');
const { success } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

// ─────────────────────────────────────────
// GET PLATFORM ANALYTICS (admin only)
// Admin check is handled by isAdmin middleware on the route
// 3 parallel DB calls instead of 11
// ─────────────────────────────────────────

const getPlatformAnalytics = asyncWrapper(async (req, res) => {
  const [userStats, submissionStats, [topUsers, recentSubmissions]] = await Promise.all([
    // Single User aggregate — totals + averages + active count
    User.aggregate([
      {
        $facet: {
          stats: [
            {
              $group: {
                _id: null,
                total:    { $sum: 1 },
                active:   { $sum: { $cond: [{ $gt: ['$completedTasks', 0] }, 1, 0] } },
                avgCompletedTasks: { $avg: '$completedTasks' },
              },
            },
          ],
          top: [
            { $sort: { completedTasks: -1 } },
            { $limit: 5 },
            { $project: { email: 1, username: 1, completedTasks: 1 } },
          ],
        },
      },
    ]),

    // Single Submission aggregate — counts by status
    Submission.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),

    // Parallel: project/task counts + recent submissions
    Promise.all([
      Promise.all([
        Project.countDocuments({ status: 'active' }),
        Task.countDocuments(),
      ]),
      Submission.find()
        .populate('user', 'username email')
        .populate('task', 'title')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]),
  ]);

  // Parse user stats
  const uStats       = userStats[0]?.stats?.[0] || {};
  const totalUsers   = uStats.total   || 0;
  const activeUsers  = uStats.active  || 0;
  const avgCompletedTasks = Math.round(uStats.avgCompletedTasks || 0);
  const topUsersList = userStats[0]?.top || [];

  // Parse submission stats
  const subMap = submissionStats.reduce((acc, s) => {
    acc[s._id] = s.count;
    return acc;
  }, {});
  const acceptedSubs = subMap['accepted'] || 0;
  const rejectedSubs = subMap['rejected'] || 0;
  const pendingSubs  = subMap['pending']  || 0;
  const totalSubs    = acceptedSubs + rejectedSubs + pendingSubs;

  // Parse project/task counts
  const [totalProjects, totalTasks] = topUsers;

  return success(res, {
    platform: {
      totalUsers,
      activeUsers,
      totalProjects,
      totalTasks,
      totalSubmissions: totalSubs,
    },
    submissions: {
      accepted:       acceptedSubs,
      rejected:       rejectedSubs,
      pending:        pendingSubs,
      acceptanceRate: totalSubs > 0 ? Math.round((acceptedSubs / totalSubs) * 100) : 0,
    },
    averages: { avgCompletedTasks },
    topUsers:           topUsersList,
    recentSubmissions,
  }, 'Platform analytics retrieved successfully');
});

// ─────────────────────────────────────────
// GET PROJECT ANALYTICS (admin or project owner)
// 2 parallel DB calls instead of 4
// ─────────────────────────────────────────

const getProjectAnalytics = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(projectId))
    throw new AppError('Invalid project ID', 400);

  const project = await Project.findById(projectId).select('owner title status members');
  if (!project) throw new AppError('Project not found', 404);

  const isOwner = project.owner.toString() === req.user._id.toString();
  if (!isOwner && !req.user.isAdmin)
    throw new AppError('Unauthorized', 403);

  const pid = new mongoose.Types.ObjectId(projectId);

  const [taskStats, [submissionStats, memberPerformance]] = await Promise.all([
    // Task counts in one aggregate
    Task.aggregate([
      { $match: { project: pid } },
      {
        $group: {
          _id: null,
          total:     { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] } },
        },
      },
    ]),

    Promise.all([
      // Submission counts in one aggregate
      Submission.aggregate([
        { $match: { project: pid } },
        {
          $group: {
            _id: null,
            total:    { $sum: 1 },
            accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
          },
        },
      ]),

      // Member performance
      Submission.aggregate([
        { $match: { project: pid } },
        {
          $group: {
            _id:         '$user',
            submissions: { $sum: 1 },
            accepted:    { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
            avgScore:    { $avg: '$score' },
          },
        },
        { $sort: { accepted: -1 } },
        {
          $lookup: {
            from:         'users',
            localField:   '_id',
            foreignField: '_id',
            as:           'userDetails',
            pipeline:     [{ $project: { username: 1, email: 1, completedTasks: 1 } }],
          },
        },
        {
          $project: {
            user:        { $first: '$userDetails' },
            submissions: 1,
            accepted:    1,
            avgScore:    { $round: [{ $ifNull: ['$avgScore', 0] }, 0] },
          },
        },
      ]),
    ]),
  ]);

  const tStats  = taskStats[0]  || {};
  const sStats  = submissionStats[0] || {};
  const total   = tStats.total     || 0;
  const completed = tStats.completed || 0;
  const totalSubs   = sStats.total    || 0;
  const acceptedSubs = sStats.accepted || 0;

  return success(res, {
    project: {
      id:      project._id,
      title:   project.title,
      status:  project.status,
      members: project.members.length,
    },
    tasks: {
      total,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
    submissions: {
      total:          totalSubs,
      accepted:       acceptedSubs,
      acceptanceRate: totalSubs > 0 ? Math.round((acceptedSubs / totalSubs) * 100) : 0,
    },
    memberPerformance,
  }, 'Project analytics retrieved successfully');
});

// ─────────────────────────────────────────
// Exports
// ─────────────────────────────────────────

module.exports = { getPlatformAnalytics, getProjectAnalytics };