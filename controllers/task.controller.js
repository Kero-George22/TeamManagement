const taskService = require('../services/task.service');
const aiManager = require('../services/ai.manager');
const asyncWrapper = require('../utils/asyncWrapper');
const { success } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const aiUsageService = require('../services/aiUsage.service');

// ─────────────────────────────────────────
// CREATE TASKS — AI generates per role
// ─────────────────────────────────────────

const createTasksByAI = asyncWrapper(async (req, res) => {
  const tasks = await taskService.createTasksByAI(
    req.params.projectId,
    req.user._id
  );
  await aiUsageService.consumeCredits(req.user._id, req.aiCost || 1);
  return success(res, tasks, 'Tasks created by AI', 201);
});

// ─────────────────────────────────────────
// CREATE SINGLE TASK
// ─────────────────────────────────────────

const createTask = asyncWrapper(async (req, res) => {
  const task = await taskService.createTask(
    req.params.projectId,
    req.user._id,
    req.body,
    req.user.isAdmin
  );
  return success(res, task, 'Task created', 201);
});

// ─────────────────────────────────────────
// GET ALL TASKS FOR A PROJECT
// ─────────────────────────────────────────

const getProjectTasks = asyncWrapper(async (req, res) => {
  const tasks = await taskService.getProjectTasks(
    req.params.projectId,
    req.user._id,
    req.user.isAdmin
  );
  return success(res, tasks, 'Tasks retrieved');
});

const getDashboardTasks = asyncWrapper(async (req, res) => {
  const tasks = await taskService.getDashboardTasks(
    req.user._id,
    req.user.isAdmin
  );
  return success(res, { tasks }, 'Dashboard tasks retrieved');
});

// ─────────────────────────────────────────
// GET SINGLE TASK
// ─────────────────────────────────────────

const getTaskById = asyncWrapper(async (req, res) => {
  const task = await taskService.getTaskById(
    req.params.taskId,
    req.user._id,
    req.user.isAdmin
  );
  return success(res, task, 'Task retrieved');
});

// ─────────────────────────────────────────
// UPDATE TASK STATUS
// Member: Todo → In-Progress → Done
// Owner:  Done → Approved
// ─────────────────────────────────────────

const updateTaskStatus = asyncWrapper(async (req, res) => {
  const { status } = req.body;

  if (!status || typeof status !== 'string' || !status.trim())
    throw new AppError('Status must be a valid string', 400);

  const task = await taskService.updateTaskStatus(
    req.params.taskId,
    status.trim(),
    req.user._id,
    req.user.isAdmin
  );
  return success(res, task, `Task status updated to "${status}"`);
});

// ─────────────────────────────────────────
// UPDATE TASK
// ─────────────────────────────────────────

const updateTask = asyncWrapper(async (req, res) => {
  const task = await taskService.updateTask(
    req.params.taskId,
    req.user._id,
    req.body,
    req.user.isAdmin
  );
  return success(res, task, 'Task updated');
});

// ─────────────────────────────────────────
// DELETE TASK
// ─────────────────────────────────────────

const deleteTask = asyncWrapper(async (req, res) => {
  await taskService.deleteTask(
    req.params.taskId,
    req.user._id,
    req.user.isAdmin
  );
  return success(res, null, 'Task deleted');
});

// ─────────────────────────────────────────
// ADD COMMENT
// ─────────────────────────────────────────

const addComment = asyncWrapper(async (req, res) => {
  const { text } = req.body;
  const comments = await taskService.addComment(req.params.taskId, req.user._id, text, req.user.isAdmin);
  return success(res, comments, 'Comment added', 201);
});

// ─────────────────────────────────────────
// GET COMMENTS
// ─────────────────────────────────────────

const getComments = asyncWrapper(async (req, res) => {
  const comments = await taskService.getComments(req.params.taskId, req.user._id, req.user.isAdmin);
  return success(res, comments, 'Comments retrieved');
});

// ─────────────────────────────────────────
// GET SUBTASKS
// ─────────────────────────────────────────

const getSubtasks = asyncWrapper(async (req, res) => {
  const subtasks = await taskService.getSubtasksForUser(req.params.taskId, req.user._id, req.user.isAdmin);
  return success(res, subtasks, 'Subtasks retrieved');
});

// ─────────────────────────────────────────
// UPLOAD ATTACHMENT
// ─────────────────────────────────────────

const uploadAttachment = asyncWrapper(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400);
  const result = await taskService.attachFile(
    req.params.taskId,
    req.user._id,
    {
      url: req.file.path,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size
    },
    req.user.isAdmin
  );
  return success(res, result, 'File uploaded', 200);
});

const removeAttachment = asyncWrapper(async (req, res) => {
  const result = await taskService.removeAttachment(
    req.params.taskId,
    req.user._id,
    req.params.attachmentId,
    req.user.isAdmin
  );
  return success(res, result, 'Attachment removed', 200);
});

// ─────────────────────────────────────────
// GET BOARD VIEW — tasks grouped by status
// ─────────────────────────────────────────

const getBoardView = asyncWrapper(async (req, res) => {
  const board = await taskService.getProjectBoard(
    req.params.projectId,
    req.user._id,
    req.user.isAdmin
  );
  return success(res, board, 'Board view retrieved');
});

// ─────────────────────────────────────────
// AI INSTRUCTIONS
// ─────────────────────────────────────────

const generateAIInstructions = asyncWrapper(async (req, res) => {
  const task = await taskService.getTaskById(req.params.taskId, req.user._id, req.user.isAdmin);
  const instructions = await aiManager.generateTaskInstructions(task);
  await aiUsageService.consumeCredits(req.user._id, req.aiCost || 1);
  return success(res, { instructions }, 'AI instructions generated');
});

// ─────────────────────────────────────────
// Exports
// ─────────────────────────────────────────

module.exports = {
  createTasksByAI,
  createTask,
  getDashboardTasks,
  getProjectTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  addComment,
  getComments,
  getSubtasks,
  uploadAttachment,
  removeAttachment,
  getBoardView,
  generateAIInstructions,
};
