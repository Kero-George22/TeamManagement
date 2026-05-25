const asyncWrapper = require('../utils/asyncWrapper');
const { success }  = require('../utils/apiResponse');
const AppError     = require('../utils/AppError');
const User         = require('../models/user.model');
const Project      = require('../models/project.model');
const Task         = require('../models/task.model');

exports.getPlatformStats = asyncWrapper(async (req, res) => {
  const usersCount = await User.countDocuments();
  const projectsCount = await Project.countDocuments();
  const tasksCount = await Task.countDocuments();
  const bannedCount = await User.countDocuments({ isBanned: true });
  
  return success(res, { usersCount, projectsCount, tasksCount, bannedCount }, 'Platform stats retrieved');
});

exports.getUsers = asyncWrapper(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  return success(res, users, 'Users retrieved');
});

exports.toggleUserBan = asyncWrapper(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  
  if (String(user._id) === String(req.user._id)) {
    throw new AppError('You cannot ban yourself', 403);
  }
  if (user.isAdmin) {
    throw new AppError('You cannot ban an admin', 403);
  }

  user.isBanned = !user.isBanned;
  await user.save();
  return success(res, { user }, `User ${user.isBanned ? 'banned' : 'unbanned'} successfully`);
});

exports.deleteUser = asyncWrapper(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  
  if (String(user._id) === String(req.user._id)) {
    throw new AppError('You cannot delete yourself', 403);
  }
  if (user.isAdmin) {
    throw new AppError('You cannot delete another admin', 403);
  }

  await User.findByIdAndDelete(req.params.id);
  // Optional: delete projects owned by user, or transfer ownership
  await Project.deleteMany({ owner: req.params.id }); 
  return success(res, null, 'User deleted successfully');
});

exports.getProjects = asyncWrapper(async (req, res) => {
  const projects = await Project.find()
    .populate('owner', 'username email avatar')
    .sort({ createdAt: -1 });
  return success(res, projects, 'Projects retrieved');
});

exports.deleteProject = asyncWrapper(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  
  await Project.findByIdAndDelete(req.params.id);
  await Task.deleteMany({ project: req.params.id });
  return success(res, null, 'Project deleted successfully');
});
