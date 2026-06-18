const mongoose = require('mongoose');
const Message = require('../models/message.model');
const Project = require('../models/project.model');
const Task = require('../models/task.model');
const asyncWrapper = require('../utils/asyncWrapper');
const { success, error } = require('../utils/apiResponse');
const { generateProjectStatus } = require('../services/ai.manager');

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const REPORT_TTL_MS = 10 * 60 * 1000;

async function ensureOfficeMember(projectId, userId) {
  const project = await Project.findById(projectId).select('owner members').lean();
  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }

  const isOwner = project.owner?.toString() === userId?.toString();
  const isMember = (project.members || []).some(
    (m) => m.userId?.toString() === userId?.toString()
  );

  if (!isOwner && !isMember) {
    const err = new Error('You can access office chat only for projects you joined');
    err.status = 403;
    throw err;
  }

  return project;
}

function buildFallbackStatus(project, taskStats) {
  const completionRate = taskStats.total > 0
    ? Math.round((taskStats.done / taskStats.total) * 100)
    : 0;

  let health = '🟡 At Risk';
  if (completionRate >= 70) health = '🟢 On Track';
  if (completionRate < 35) health = '🔴 Behind';

  return [
    `${health}`,
    `- Progress: ${taskStats.done}/${taskStats.total} tasks done (${completionRate}%), ${taskStats.inProgress} in progress, ${taskStats.pending} pending.`,
    `- Recommendation: Prioritize pending tasks with blocked dependencies in the next stand-up.`
  ].join('\n');
}

async function buildSharedReport(projectId) {
  const projectObjectId = mongoose.Types.ObjectId.isValid(projectId)
    ? new mongoose.Types.ObjectId(String(projectId))
    : null;

  const [project, aggregatedTaskStats] = await Promise.all([
    Project.findById(projectId),
    Task.aggregate([
      { $match: { project: projectObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  if (!project) return null;

  const now = Date.now();
  const hasFreshReport =
    project.officeReport?.content &&
    project.officeReport?.generatedAt &&
    (now - new Date(project.officeReport.generatedAt).getTime()) < REPORT_TTL_MS;

  const countByStatus = new Map(
    aggregatedTaskStats.map((entry) => [String(entry._id || ''), entry.count || 0])
  );
  const doneCount = (countByStatus.get('Done') || 0) + (countByStatus.get('Approved') || 0) + (countByStatus.get('done') || 0);
  const inProgressCount = countByStatus.get('In-Progress') || 0;
  const totalCount = aggregatedTaskStats.reduce((sum, entry) => sum + (entry.count || 0), 0);
  const pendingCount = Math.max(0, totalCount - doneCount - inProgressCount);

  const taskStats = {
    total: totalCount,
    done: doneCount,
    inProgress: inProgressCount,
    pending: pendingCount,
  };

  if (!hasFreshReport) {
    let statusText;
    try {
      statusText = await generateProjectStatus(project, taskStats);
    } catch (_err) {
      statusText = buildFallbackStatus(project, taskStats);
    }
    project.officeReport = {
      content: statusText,
      generatedAt: new Date(),
    };
    await project.save();
  }

  return {
    report: project.officeReport?.content || '',
    generatedAt: project.officeReport?.generatedAt || new Date(),
    taskStats,
  };
}

// GET MESSAGES – paginated, newest first by default
const getMessages = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

  await ensureOfficeMember(projectId, req.user._id);

  const filter = { project: projectId, type: { $ne: 'ai' } };
  const [messages, total] = await Promise.all([
    Message.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Message.countDocuments(filter),
  ]);

  return success(res, {
    messages: messages.reverse(),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  }, 'Messages retrieved');
});

// SEND MESSAGE
const sendMessage = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;
  const { content } = req.body;

  if (!content?.trim()) return error(res, 'Message content is required', 400);

  // Look up the sender's role in this project
  const project = await ensureOfficeMember(projectId, req.user._id);
  const memberEntry = project?.members?.find(
    (m) => m.userId?.toString() === req.user._id?.toString()
  );

  const message = await Message.create({
    project: projectId,
    user: req.user._id,
    username: req.user.username || req.user.email.split('@')[0],
    avatar: req.user.avatar || '',
    role: memberEntry?.roleName || '',
    content: content.trim().slice(0, 2000),
    type: 'user',
  });

  return success(res, message, 'Message sent', 201);
});

// GET AI STATUS – generates fresh report from live project data
const getAIStatus = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;
  await ensureOfficeMember(projectId, req.user._id);
  const reportData = await buildSharedReport(projectId);
  if (!reportData) return error(res, 'Project not found', 404);

  return success(res, {
    status: reportData.report,
    generatedAt: reportData.generatedAt,
    taskStats: reportData.taskStats,
  }, 'Status generated');
});

const getOfficeOverview = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;
  await ensureOfficeMember(projectId, req.user._id);

  const project = await Project.findById(projectId)
    .select('title status members')
    .populate('members.userId', 'username email avatar lastSeen')
    .lean();

  if (!project) return error(res, 'Project not found', 404);

  const members = (project.members || []).map((m) => {
    const lastSeen = m.userId?.lastSeen ? new Date(m.userId.lastSeen) : null;
    const online = lastSeen ? (Date.now() - lastSeen.getTime()) <= ONLINE_WINDOW_MS : false;
    return {
      userId: m.userId?._id,
      username: m.userId?.username || (m.userId?.email ? m.userId.email.split('@')[0] : 'Member'),
      avatar: m.userId?.avatar || '',
      roleName: m.roleName,
      online,
      lastSeen,
      joinedAt: m.joinedAt,
    };
  });

  const reportData = await buildSharedReport(projectId);

  return success(res, {
    project: {
      _id: projectId,
      title: project.title,
      status: project.status,
    },
    members,
    report: {
      status: reportData?.report || '',
      generatedAt: reportData?.generatedAt || null,
      taskStats: reportData?.taskStats || null,
    },
  }, 'Office overview retrieved');
});

module.exports = { getMessages, sendMessage, getAIStatus, getOfficeOverview };
