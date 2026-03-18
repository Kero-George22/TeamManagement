const Message = require('../models/message.model');
const Project = require('../models/project.model');
const Task = require('../models/task.model');
const Submission = require('../models/submission.model');
const asyncWrapper = require('../utils/asyncWrapper');
const { success, error } = require('../utils/apiResponse');
const { generateProjectStatus } = require('../services/ai.service');

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const REPORT_TTL_MS = 10 * 60 * 1000;

async function ensureOfficeMember(projectId, userId) {
  const project = await Project.findById(projectId).select('members').lean();
  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }

  const isMember = (project.members || []).some(
    (m) => m.userId?.toString() === userId?.toString()
  );

  if (!isMember) {
    const err = new Error('You can access office chat only for projects you joined');
    err.status = 403;
    throw err;
  }

  return project;
}

function buildFallbackStatus(project, taskStats, submissionStats) {
  const completionRate = taskStats.total > 0
    ? Math.round((taskStats.done / taskStats.total) * 100)
    : 0;
  const acceptanceRate = submissionStats.total > 0
    ? Math.round((submissionStats.accepted / submissionStats.total) * 100)
    : 0;

  let health = '🟡 At Risk';
  if (completionRate >= 70 && submissionStats.pending <= submissionStats.accepted) health = '🟢 On Track';
  if (completionRate < 35 || submissionStats.rejected > submissionStats.accepted) health = '🔴 Behind';

  return [
    `${health}`,
    `- Progress: ${taskStats.done}/${taskStats.total} tasks done (${completionRate}%), ${taskStats.inProgress} in progress, ${taskStats.pending} pending.`,
    `- Submissions: ${submissionStats.accepted}/${submissionStats.total} accepted (${acceptanceRate}%), ${submissionStats.pending} pending, ${submissionStats.rejected} rejected.`,
    `- Recommendation: Prioritize pending tasks with blocked dependencies and review rejected submissions in the next stand-up.`
  ].join('\n');
}

async function buildSharedReport(projectId) {
  const [project, tasks, submissions] = await Promise.all([
    Project.findById(projectId),
    Task.find({ project: projectId }).lean(),
    Submission.find({ project: projectId }).lean(),
  ]);

  if (!project) return null;

  const now = Date.now();
  const hasFreshReport =
    project.officeReport?.content &&
    project.officeReport?.generatedAt &&
    (now - new Date(project.officeReport.generatedAt).getTime()) < REPORT_TTL_MS;

  const taskStats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'In-Progress').length,
    pending: tasks.filter(t => !['done', 'In-Progress'].includes(t.status)).length,
  };

  const submissionStats = {
    total: submissions.length,
    accepted: submissions.filter(s => s.stat   === 'accepted').length,
    pending: submissions.filter(s => s.status === 'pending').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
  };

  if (!hasFreshReport) {
    let statusText;
    try {
      statusText = await generateProjectStatus(project, taskStats, submissionStats);
    } catch (_err) {
      statusText = buildFallbackStatus(project, taskStats, submissionStats);
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
    submissionStats,
  };
}

// GET MESSAGES – last 50, oldest first
const getMessages = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;
  await ensureOfficeMember(projectId, req.user._id);
  const messages = await Message.find({ project: projectId, type: { $ne: 'ai' } })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return success(res, messages.reverse(), 'Messages retrieved');
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
    submissionStats: reportData.submissionStats,
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
      submissionStats: reportData?.submissionStats || null,
    },
  }, 'Office overview retrieved');
});

module.exports = { getMessages, sendMessage, getAIStatus, getOfficeOverview };
