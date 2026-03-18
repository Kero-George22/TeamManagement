const mongoose = require('mongoose');
const Task = require('../models/task.model');
const Project = require('../models/project.model');
const User = require('../models/user.model');
const aiManager = require('./ai.manager');
const AppError = require('../utils/AppError');

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function validateObjectId(id, label = 'ID') {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError(`Invalid ${label}`, 400);
}

function getMembership(project, userId) {
  return (project.members || []).find(
    (m) => String(m.userId) === String(userId)
  );
}

/**
 * Ensures the user is a member of the project.
 * Returns the project (with members) so callers can reuse it.
 */
async function ensureProjectAccess(projectId, userId, isAdmin = false) {
  const project = await Project.findById(projectId).select('members');
  if (!project) throw new AppError('Project not found', 404);
  if (isAdmin) return project;

  const isMember = project.members.some(
    (m) => m.userId.toString() === String(userId)
  );
  if (!isMember)
    throw new AppError('You must join this project to access tasks', 403);

  return project;
}

/**
 * Checks whether a task belongs to the user — either directly assigned
 * or via role match.
 */
function isTaskVisibleToMember(task, userId, memberRole) {
  const assignedToMe =
    String(task.assignedTo?._id || task.assignedTo || '') === String(userId);
  const roleMatch =
    !!memberRole &&
    normalizeRole(task.assignedRole) === normalizeRole(memberRole);
  return assignedToMe || roleMatch;
}

// ─────────────────────────────────────────
// CREATE TASKS — AI generates & assigns per role
// ─────────────────────────────────────────

/**
 * 1. Asks AI to produce tasks based on project details.
 * 2. Generates per-task instructions in parallel (one AI call each).
 * 3. Assigns each task to a member whose role matches, using round-robin
 *    so work is spread evenly when multiple members share the same role.
 * 4. Batch-inserts all tasks in a single DB round-trip.
 */
async function createTasksByAI(projectId) {
  validateObjectId(projectId, 'project ID');

  const project = await Project.findById(projectId);
  if (!project) throw new AppError('Project not found', 404);

  // Ask AI for a list of tasks suited to this project
  const aiTasks = await aiManager.assignTasksByAI({
    title: project.title,
    description: project.description,
    rolesRequired: project.rolesRequired,
    duration: project.duration,
    status: project.status,
  });

 
  // Build role → [userId, ...] map for round-robin assignment
  const roleMembers = new Map();
  for (const m of project.members || []) {
    const key = normalizeRole(m.roleName);
    if (!roleMembers.has(key)) roleMembers.set(key, []);
    roleMembers.get(key).push(m.userId);
  }
  const roleCursor = new Map(); // tracks which member to assign next per role

  const deadline = new Date(
    Date.now() + project.duration * 24 * 60 * 60 * 1000
  );

  // Generate instructions for every task in parallel, then build docs
  const taskDocs = await Promise.all(
    aiTasks.map(async (taskData) => {
      const instructions = await aiManager.generateTaskInstructions({
        title: taskData.title,
        description: taskData.description,
        assignedRole: taskData.assignedRole,
        priority: taskData.priority,
      });

      // Round-robin: pick the next member whose role matches this task
      const roleKey = normalizeRole(taskData.assignedRole);
      const candidates = roleMembers.get(roleKey) || [];
      let assignedTo = null;
      if (candidates.length > 0) {
        const cursor = roleCursor.get(roleKey) || 0;
        assignedTo = candidates[cursor % candidates.length];
        roleCursor.set(roleKey, cursor + 1);
      }

      return {
        project: projectId,
        title: taskData.title,
        description: taskData.description,
        assignedRole: taskData.assignedRole,
        assignedTo,
        priority: taskData.priority || 'Medium',
        xpPoints: taskData.xpPoints || 50,
        aiInstructions: instructions,
        status: 'Todo',
        deadline,
      };
    })
  );

  return Task.insertMany(taskDocs);
}

// ─────────────────────────────────────────
// GET MY TASKS
// ─────────────────────────────────────────

async function getMyTasks(userId, isAdmin = false) {
  if (isAdmin) {
    return Task.find({})
      .populate('project', 'title')
      .populate('assignedTo', 'email username avatar')
      .sort({ createdAt: -1 });
  }

  const projects = await Project.find({ 'members.userId': userId })
    .select('_id members title');

  if (!projects.length) return [];

  const membershipByProject = new Map(
    projects.map((project) => [String(project._id), getMembership(project, userId)])
  );

  const tasks = await Task.find({
    project: { $in: projects.map((project) => project._id) },
  })
    .populate('project', 'title')
    .populate('assignedTo', 'email username avatar')
    .sort({ createdAt: -1 });

  return tasks.filter((task) => {
    const membership = membershipByProject.get(String(task.project?._id || task.project));
    return isTaskVisibleToMember(task, userId, membership?.roleName);
  });
}

// ─────────────────────────────────────────
// GET ALL TASKS FOR A PROJECT
// ─────────────────────────────────────────

async function getProjectTasks(projectId, userId, isAdmin = false) {
  validateObjectId(projectId, 'project ID');

  const project = await ensureProjectAccess(projectId, userId, isAdmin);

  const tasks = await Task.find({ project: projectId })
    .populate('assignedTo', 'email username avatar')
    .sort({ createdAt: -1 });

  if (isAdmin) return tasks;

  // Regular members see only their own tasks
  const member = getMembership(project, userId);
  return tasks.filter((task) =>
    isTaskVisibleToMember(task, userId, member?.roleName)
  );
}

// ─────────────────────────────────────────
// GET SINGLE TASK
// ─────────────────────────────────────────

async function getTaskById(taskId, userId, isAdmin = false) {
  validateObjectId(taskId, 'task ID');

  const task = await Task.findById(taskId).populate('assignedTo', 'email');
  if (!task) throw new AppError('Task not found', 404);

  const project = await ensureProjectAccess(task.project, userId, isAdmin);

  if (!isAdmin) {
    const member = getMembership(project, userId);
    if (!isTaskVisibleToMember(task, userId, member?.roleName))
      throw new AppError('This task is not assigned to your role', 403);
  }

  return task;
}

// ─────────────────────────────────────────
// ASSIGN TASK TO USER
// ─────────────────────────────────────────

async function assignTaskToUser(taskId, userId, isAdmin = false) {
  validateObjectId(taskId, 'task ID');

  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  const project = await ensureProjectAccess(task.project, userId, isAdmin);

  if (task.assignedTo) throw new AppError('Task already assigned', 400);

  if (!isAdmin) {
    const member = getMembership(project, userId);
    if (!member || normalizeRole(member.roleName) !== normalizeRole(task.assignedRole)) {
      throw new AppError('You can claim only tasks assigned to your role', 403);
    }
  }

  task.assignedTo = userId;
  task.status = 'In-Progress';
  await task.save();
  await task.populate({ path: 'assignedTo', select: 'email username avatar' });

  return task;
}

// ─────────────────────────────────────────
// SUBMIT WORK FOR REVIEW
// ─────────────────────────────────────────

async function submitWork(taskId, submissionData, userId, isAdmin = false) {
  validateObjectId(taskId, 'task ID');

  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  await ensureProjectAccess(task.project, userId, isAdmin);

  if (!isAdmin && String(task.assignedTo || '') !== String(userId))
    throw new AppError('You can submit only tasks assigned to you', 403);

  if (typeof submissionData === 'object' && submissionData !== null) {
    task.submittedWork = submissionData.description || '';
    task.repoLink = submissionData.repoLink;
    task.submissionType = submissionData.repoLink ? 'link' : 'text';
  } else {
    task.submittedWork = submissionData;
    task.submissionType = 'text';
  }

  task.status = 'Review';
  await task.save();

  return task;
}

// ─────────────────────────────────────────
// AI REVIEW
// ─────────────────────────────────────────

async function aiReviewTask(taskId, userId, isAdmin = false) {
  validateObjectId(taskId, 'task ID');

  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  await ensureProjectAccess(task.project, userId, isAdmin);

  if (!isAdmin && String(task.assignedTo || '') !== String(userId))
    throw new AppError('You can request review only for tasks assigned to you', 403);

  if (!task.submittedWork)
    throw new AppError('No work submitted for review', 400);

  const aiReview = await aiManager.reviewWorkByAI({
    title: task.title,
    description: task.description,
    submittedWork: task.submittedWork,
    repoLink: task.repoLink,
    submissionType: task.submissionType,
  });

  task.aiReview = aiReview.review;
  task.aiRating = aiReview.rating;
  task.feedback = aiReview.feedback;

  if (aiReview.rating >= 70) {
    task.status = 'Done';

    // Reward on-time delivery — atomic update, no extra User fetch
    if (task.deadline && new Date() <= new Date(task.deadline) && task.assignedTo) {
      await User.findByIdAndUpdate(task.assignedTo, [
        {
          $set: {
            reliabilityScore: {
              $min: [100, { $add: [{ $ifNull: ['$reliabilityScore', 0] }, 2] }],
            },
          },
        },
      ]);
    }
  } else {
    task.status = 'In-Progress';
  }

  await task.save();
  return task;
}

// ─────────────────────────────────────────
// TEAM PERFORMANCE
// ─────────────────────────────────────────

/**
 * Uses a single $facet aggregation to get both numeric stats and the
 * lightweight task list the AI needs — one DB round-trip total.
 */
async function getTeamPerformance(projectId, userId, isAdmin = false) {
  validateObjectId(projectId, 'project ID');

  await ensureProjectAccess(projectId, userId, isAdmin);

  const [result] = await Task.aggregate([
    { $match: { project: new mongoose.Types.ObjectId(projectId) } },
    {
      $facet: {
        stats: [
          {
            $group: {
              _id: null,
              totalTasks: { $sum: 1 },
              completed:  { $sum: { $cond: [{ $eq: ['$status', 'Done'] },        1, 0] } },
              inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In-Progress'] }, 1, 0] } },
              inReview:   { $sum: { $cond: [{ $eq: ['$status', 'Review'] },      1, 0] } },
              todo:       { $sum: { $cond: [{ $eq: ['$status', 'Todo'] },        1, 0] } },
              avgRating:  { $avg: { $ifNull: ['$aiRating', 0] } },
            },
          },
        ],
        // Only the fields the AI analyser actually needs
        tasks: [
          {
            $project: {
              title: 1,
              description: 1,
              status: 1,
              aiRating: 1,
              assignedRole: 1,
            },
          },
        ],
      },
    },
  ]);

  const stats = result?.stats?.[0] || {};
  const tasks = result?.tasks || [];

  const analysis = await aiManager.analyzeTeamPerformance(tasks);

  return {
    totalTasks: stats.totalTasks || 0,
    completed:  stats.completed  || 0,
    inProgress: stats.inProgress || 0,
    inReview:   stats.inReview   || 0,
    todo:       stats.todo       || 0,
    avgRating:  stats.avgRating  || 0,
    analysis:   analysis.analysis,
  };
}


module.exports = {
  createTasksByAI,
  getMyTasks,
  getProjectTasks,
  getTaskById,
  assignTaskToUser,
  submitWork,
  aiReviewTask,
  getTeamPerformance,
};