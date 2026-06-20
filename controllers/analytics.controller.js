const mongoose = require('mongoose');
const User = require('../models/user.model');
const Project = require('../models/project.model');
const Task = require('../models/task.model');
const Submission = require('../models/submission.model');
const TimeEntry = require('../models/timeEntry.model');
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

  const [
    [taskStats],
    velocityData,
    aiTrendData,
    timeDataByUser,
    timeDataByTask,
    memberContributions
  ] = await Promise.all([
    // 1. Overall Task Stats
    Task.aggregate([
      { $match: { project: pid } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $in: ['$status', ['Done', 'Approved']] }, 1, 0] } },
          totalPoints: { $sum: '$storyPoints' },
          completedPoints: { $sum: { $cond: [{ $in: ['$status', ['Done', 'Approved']] }, '$storyPoints', 0] } }
        }
      }
    ]),

    // 2. Velocity / Burnup Data (grouped by ISO week)
    Task.aggregate([
      { $match: { project: pid, status: { $in: ['Done', 'Approved'] }, updatedAt: { $exists: true } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-W%V', date: '$updatedAt' } },
          completedTasks: { $sum: 1 },
          completedPoints: { $sum: '$storyPoints' }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    // 3. AI Trend Data (grouped by day)
    Task.aggregate([
      { $match: { project: pid, aiRating: { $ne: null } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
          avgScore: { $avg: '$aiRating' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    // 4. Time Tracking by User
    TimeEntry.aggregate([
      { 
        $lookup: {
          from: 'tasks',
          localField: 'task',
          foreignField: '_id',
          as: 'taskDetails'
        }
      },
      { $unwind: '$taskDetails' },
      { $match: { 'taskDetails.project': pid } },
      {
        $group: {
          _id: '$user',
          totalDuration: { $sum: '$duration' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails',
          pipeline: [{ $project: { username: 1, email: 1, avatar: 1 } }]
        }
      },
      { $unwind: '$userDetails' },
      { $project: { user: '$userDetails', totalDuration: 1 } },
      { $sort: { totalDuration: -1 } }
    ]),

    // 5. Time Tracking by Task
    TimeEntry.aggregate([
      { 
        $lookup: {
          from: 'tasks',
          localField: 'task',
          foreignField: '_id',
          as: 'taskDetails'
        }
      },
      { $unwind: '$taskDetails' },
      { $match: { 'taskDetails.project': pid } },
      {
        $group: {
          _id: '$task',
          taskTitle: { $first: '$taskDetails.title' },
          totalDuration: { $sum: '$duration' }
        }
      },
      { $sort: { totalDuration: -1 } },
      { $limit: 10 } // Top 10 tasks by time
    ]),

    // 6. Member Contribution (Story points & tasks per user)
    Task.aggregate([
      { $match: { project: pid, status: { $in: ['Done', 'Approved'] } } },
      { $unwind: { path: '$assignedTo', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$assignedTo',
          completedTasks: { $sum: 1 },
          completedPoints: { $sum: '$storyPoints' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails',
          pipeline: [{ $project: { username: 1, email: 1, avatar: 1 } }]
        }
      },
      { $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } },
      { $project: { user: '$userDetails', completedTasks: 1, completedPoints: 1 } },
      { $sort: { completedPoints: -1 } }
    ])
  ]);

  const tStats = taskStats || { total: 0, completed: 0, totalPoints: 0, completedPoints: 0 };

  return success(res, {
    project: {
      id: project._id,
      title: project.title,
      status: project.status,
      members: project.members.length,
    },
    tasks: {
      total: tStats.total,
      completed: tStats.completed,
      completionRate: tStats.total > 0 ? Math.round((tStats.completed / tStats.total) * 100) : 0,
      totalPoints: tStats.totalPoints,
      completedPoints: tStats.completedPoints
    },
    velocity: velocityData.map(v => ({ week: v._id, points: v.completedPoints, tasks: v.completedTasks })),
    aiTrend: aiTrendData.map(a => ({ date: a._id, score: Math.round(a.avgScore), count: a.count })),
    timeByUser: timeDataByUser,
    timeByTask: timeDataByTask,
    memberContributions: memberContributions
  }, 'Advanced Project analytics retrieved successfully');
});

// ─────────────────────────────────────────
// Exports
// ─────────────────────────────────────────

module.exports = { getPlatformAnalytics, getProjectAnalytics };