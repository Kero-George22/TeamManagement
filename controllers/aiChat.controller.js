const aiManager = require('../services/ai.manager');
const asyncWrapper = require('../utils/asyncWrapper');
const { success } = require('../utils/apiResponse');
const Project = require('../models/project.model');
const Task = require('../models/task.model');
const AppError = require('../utils/AppError');
const aiUsageService = require('../services/aiUsage.service');

/**
 * POST /api/v1/ai/chat
 * Body: { projectId, message, history: [{role, parts: [{text}]}] }
 */
const chat = asyncWrapper(async (req, res) => {
  const { projectId, message, history = [] } = req.body;
  if (!message?.trim()) throw new AppError('Message is required', 400);

  const project = await Project.findById(projectId)
    .populate('members.userId', 'username email avatar')
    .populate('owner', 'username email avatar')
    .lean();

  if (!project) throw new AppError('Project not found', 404);

  // Authorization check
  const userId = String(req.user._id);
  const isOwner = String(project.owner?._id || project.owner) === userId;
  const isMember = (project.members || []).some(m => String(m.userId?._id || m.userId) === userId);
  if (!isOwner && !isMember) throw new AppError('Access denied', 403);

  // Build context
  const tasks = await Task.find({ project: projectId })
    .select('title status priority assignedRole deadline storyPoints')
    .lean();

  const context = {
    title: project.title,
    description: project.description,
    status: project.status,
    duration: project.duration,
    members: (project.members || []).map(m => ({
      name: m.userId?.username || m.userId?.email?.split('@')[0] || 'Member',
      role: m.roleName,
    })),
    tasks: tasks.map(t => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      role: t.assignedRole,
    })),
    activity: [],
  };

  const reply = await aiManager.chatWithCopilot(context, message, history);
  await aiUsageService.consumeCredits(req.user._id, req.aiCost || 1);
  return success(res, { reply }, 'Copilot responded');
});

module.exports = { chat };
