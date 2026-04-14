const taskService = require('../services/task.service');
const asyncWrapper = require('../utils/asyncWrapper');
const { success } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const Task = require('../models/task.model');

// ─────────────────────────────────────────
// CREATE TASKS — AI generates per role
// ─────────────────────────────────────────

const createTasksByAI = asyncWrapper(async (req, res) => {
  const tasks = await taskService.createTasksByAI(
    req.params.projectId,
    req.user._id
  );
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

  const validStatuses = ['In-Progress', 'Done', 'Approved'];
  if (!status || !validStatuses.includes(status))
    throw new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400);

  const task = await taskService.updateTaskStatus(
    req.params.taskId,
    status,
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
  if (!text?.trim()) throw new AppError('Comment text is required', 400);

  const Task = require('../models/task.model');
  const task = await Task.findById(req.params.taskId);
  if (!task) throw new AppError('Task not found', 404);

  task.comments.push({ user: req.user._id, text: text.trim() });
  await task.save();
  await task.populate('comments.user', 'email username avatar');

  return success(res, task.comments, 'Comment added', 201);
});

// ─────────────────────────────────────────
// GET COMMENTS
// ─────────────────────────────────────────

const getComments = asyncWrapper(async (req, res) => {
  const Task = require('../models/task.model');
  const task = await Task.findById(req.params.taskId)
    .select('comments')
    .populate('comments.user', 'email username avatar');
  if (!task) throw new AppError('Task not found', 404);
  return success(res, task.comments || [], 'Comments retrieved');
});

// ─────────────────────────────────────────
// GET SUBTASKS
// ─────────────────────────────────────────

const getSubtasks = asyncWrapper(async (req, res) => {
  const Task = require('../models/task.model');
  const subtasks = await Task.find({ parentTask: req.params.taskId })
    .populate('assignedTo', 'email username avatar')
    .sort({ createdAt: 1 });
  return success(res, subtasks, 'Subtasks retrieved');
});

// ─────────────────────────────────────────
// UPLOAD ATTACHMENT
// ─────────────────────────────────────────

const uploadAttachment = asyncWrapper(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400);

  const task = await Task.findById(req.params.taskId);
  if (!task) throw new AppError('Task not found', 404);

  task.attachment = `/uploads/${req.file.filename}`;
  await task.save();

  return success(res, task, 'File uploaded', 200);
});

// ─────────────────────────────────────────
// Exports
// ─────────────────────────────────────────

module.exports = {
  createTasksByAI,
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  addComment,
  getComments,
  getSubtasks,
  uploadAttachment,
};