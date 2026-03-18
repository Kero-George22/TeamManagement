const User = require('../models/user.model');
const Project = require('../models/project.model');
const Task = require('../models/task.model');
const Submission = require('../models/submission.model');
const asyncWrapper = require('../utils/asyncWrapper');
const { success, error } = require('../utils/apiResponse');

/**
 * Get platform analytics (admin only)
 */
const getPlatformAnalytics = asyncWrapper(async (req, res) => {
  // Check admin status
  if (!req.user.isAdmin) {
    return error(res, 'Unauthorized. Admin access required', 403);
  }

  // Total counts
  const totalUsers = await User.countDocuments();
  const totalProjects = await Project.countDocuments({ status: 'active' });
  const totalTasks = await Task.countDocuments();
  const totalSubmissions = await Submission.countDocuments();

  // Submission stats
  const acceptedSubmissions = await Submission.countDocuments({ status: 'accepted' });
  const rejectedSubmissions = await Submission.countDocuments({ status: 'rejected' });
  const pendingSubmissions = await Submission.countDocuments({ status: 'pending' });

  // User activity
  const activeUsers = await User.countDocuments({ totalXP: { $gt: 0 } });
  
  // Average stats
  const avgUserXP = await User.aggregate([
    { $group: { _id: null, avgXP: { $avg: '$totalXP' } } }
  ]);

  const avgUserLevel = await User.aggregate([
    { $group: { _id: null, avgLevel: { $avg: '$level' } } }
  ]);

  // Top users
  const topUsers = await User.find()
    .select('email username totalXP level completedTasks')
    .sort({ totalXP: -1 })
    .limit(5);

  // Recent submissions
  const recentSubmissions = await Submission.find()
    .populate('user', 'username email')
    .populate('task', 'title')
    .sort({ createdAt: -1 })
    .limit(10);

  const analytics = {
    platform: {
      totalUsers,
      activeUsers,
      totalProjects,
      totalTasks,
      totalSubmissions
    },
    submissions: {
      accepted: acceptedSubmissions,
      rejected: rejectedSubmissions,
      pending: pendingSubmissions,
      acceptanceRate: totalSubmissions > 0 
        ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
        : 0
    },
    averages: {
      avgUserXP: Math.round(avgUserXP[0]?.avgXP || 0),
      avgUserLevel: (avgUserLevel[0]?.avgLevel || 0).toFixed(2)
    },
    topUsers,
    recentSubmissions
  };

  return success(res, analytics, 'Platform analytics retrieved successfully');
});

/**
 * Get project analytics (admin or project owner)
 */
const getProjectAnalytics = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    return error(res, 'Project ID is required', 400);
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return error(res, 'Project not found', 404);
  }

  // Check authorization
  const isOwner = project.owner.toString() === req.user._id.toString();
  const isAdmin = req.user.isAdmin;
  if (!isOwner && !isAdmin) {
    return error(res, 'Unauthorized', 403);
  }

  // Project stats
  const totalMembers = project.members.length;
  const totalTasks = await Task.countDocuments({ project: projectId });
  const completedTasks = await Task.countDocuments({
    project: projectId,
    status: 'done'
  });

  // Submission stats
  const totalSubmissions = await Submission.countDocuments({ project: projectId });
  const acceptedSubmissions = await Submission.countDocuments({
    project: projectId,
    status: 'accepted'
  });

  // Member performance
  const memberPerformance = await Submission.aggregate([
    { $match: { project: require('mongoose').Types.ObjectId(projectId) } },
    {
      $group: {
        _id: '$user',
        submissions: { $sum: 1 },
        accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
        avgScore: { $avg: '$score' }
      }
    },
    { $sort: { accepted: -1 } }
  ]);

  // Populate user details
  const populatedPerformance = await User.populate(memberPerformance, {
    path: '_id',
    select: 'username email level totalXP'
  });

  const analytics = {
    project: {
      id: project._id,
      title: project.title,
      status: project.status,
      members: totalMembers
    },
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    },
    submissions: {
      total: totalSubmissions,
      accepted: acceptedSubmissions,
      acceptanceRate: totalSubmissions > 0 
        ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
        : 0
    },
    memberPerformance: populatedPerformance.map(perf => ({
      user: perf._id,
      submissions: perf.submissions,
      accepted: perf.accepted,
      avgScore: Math.round(perf.avgScore || 0)
    }))
  };

  return success(res, analytics, 'Project analytics retrieved successfully');
});

module.exports = {
  getPlatformAnalytics,
  getProjectAnalytics
};
