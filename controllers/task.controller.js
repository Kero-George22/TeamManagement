const taskService = require('../services/task.service');
const asyncWrapper = require('../utils/asyncWrapper');
const { success, error } = require('../utils/apiResponse');

// CREATE TASKS - AI assigns based on project
const createTasksByAI = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    return error(res, 'Project ID is required', 400);
  }

  const tasks = await taskService.createTasksByAI(projectId);
  return success(res, tasks, 'Tasks created by AI manager', 201);
});

// GET ALL TASKS FOR PROJECT
const getProjectTasks = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    return error(res, 'Project ID is required', 400);
  }

  const tasks = await taskService.getProjectTasks(projectId, req.user._id, req.user.isAdmin);
  return success(res, tasks, 'Tasks retrieved');
});

// GET TASKS FOR CURRENT USER
const getMyTasks = asyncWrapper(async (req, res) => {
  const tasks = await taskService.getMyTasks(req.user._id, req.user.isAdmin);
  return success(res, tasks, 'Your tasks retrieved');
});

// GET SINGLE TASK
const getTaskById = asyncWrapper(async (req, res) => {
  const { taskId } = req.params;

  if (!taskId) {
    return error(res, 'Task ID is required', 400);
  }

  const task = await taskService.getTaskById(taskId, req.user._id, req.user.isAdmin);
  return success(res, task, 'Task retrieved');
});

// ASSIGN TASK TO CURRENT USER
const claimTask = asyncWrapper(async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user._id;

  if (!taskId) {
    return error(res, 'Task ID is required', 400);
  }

  const task = await taskService.assignTaskToUser(taskId, userId, req.user.isAdmin);
  return success(res, task, 'Task assigned to you');
});

// SUBMIT WORK FOR REVIEW
const submitWork = asyncWrapper(async (req, res) => {
  const { taskId } = req.params;
  const { submittedWork, repoLink } = req.body;

  if (!taskId) {
    return error(res, 'Task ID is required', 400);
  }

  if (!submittedWork && !repoLink) {
    return error(res, 'Either submittedWork description or repoLink is required', 400);
  }

  // Pass object to service
  const submissionPayload = {
    description: submittedWork,
    repoLink: repoLink
  };

  const task = await taskService.submitWork(taskId, submissionPayload, req.user._id, req.user.isAdmin);
  return success(res, task, 'Work submitted for AI review');
});

// REQUEST AI REVIEW
const requestAIReview = asyncWrapper(async (req, res) => {
  const { taskId } = req.params;

  if (!taskId) {
    return error(res, 'Task ID is required', 400);
  }

  const task = await taskService.aiReviewTask(taskId, req.user._id, req.user.isAdmin);
  return success(res, task, 'AI manager reviewed your work');
});

// GET TEAM PERFORMANCE
const getTeamPerformance = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    return error(res, 'Project ID is required', 400);
  }

  const performance = await taskService.getTeamPerformance(projectId, req.user._id, req.user.isAdmin);
  return success(res, performance, 'Team performance analyzed');
});

module.exports = {
  createTasksByAI,
  getMyTasks,
  getProjectTasks,
  getTaskById,
  claimTask,
  submitWork,
  requestAIReview,
  getTeamPerformance,
};