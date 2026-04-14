const mongoose = require('mongoose');
const Task = require('../models/task.model');
const Project = require('../models/project.model');
const User = require('../models/user.model');
const aiManager = require('./ai.manager');
const AppError = require('../utils/AppError');

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

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

async function ensureProjectAccess(projectId, userId, isAdmin = false) {
  const project = await Project.findById(projectId).select('owner members');
  if (!project) throw new AppError('Project not found', 404);
  if (isAdmin) return project;

  const isOwner = String(project.owner || '') === String(userId);
  if (isOwner) return project;

  const isMember = project.members.some(
    (m) => m.userId.toString() === String(userId)
  );
  if (!isMember)
    throw new AppError('You must join this project to access tasks', 403);

  return project;
}

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

async function createTasksByAI(projectId, userId) {
  validateObjectId(projectId, 'project ID');
  validateObjectId(userId, 'user ID');

  const project = await Project.findById(projectId);
  if (!project) throw new AppError('Project not found', 404);

  const isOwner = String(project.owner || '') === String(userId);
  if (!isOwner)
    throw new AppError('Only the project owner can generate tasks by AI', 403);

  const aiTasks = await aiManager.assignTasksByAI({
    title:         project.title,
    description:   project.description,
    rolesRequired: project.rolesRequired,
    duration:      project.duration,
    status:        project.status,
  });

  // Build role → [userId, ...] map for round-robin assignment
  const roleMembers = new Map();
  for (const m of project.members || []) {
    const key = normalizeRole(m.roleName);
    if (!roleMembers.has(key)) roleMembers.set(key, []);
    roleMembers.get(key).push(m.userId);
  }
  const roleCursor = new Map();

  const deadline = new Date(
    Date.now() + project.duration * 24 * 60 * 60 * 1000
  );

  const taskDocs = aiTasks.map((taskData) => {
    const roleKey    = normalizeRole(taskData.assignedRole);
    const candidates = roleMembers.get(roleKey) || [];
    let assignedTo   = null;

    if (candidates.length > 0) {
      const cursor = roleCursor.get(roleKey) || 0;
      assignedTo   = candidates[cursor % candidates.length];
      roleCursor.set(roleKey, cursor + 1);
    }

    return {
      project:      projectId,
      title:        taskData.title,
      description:  taskData.description,
      assignedRole: taskData.assignedRole,
      assignedTo,
      priority:     taskData.priority  || 'Medium',
      status:       'Todo',
      deadline,
    };
  });

  return Task.insertMany(taskDocs);
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

  const isOwner = String(project.owner || '') === String(userId);
  if (isAdmin || isOwner) return tasks;

  const member = getMembership(project, userId);
  return tasks.filter((task) =>
    isTaskVisibleToMember(task, userId, member?.roleName)
  );
}

// ─────────────────────────────────────────
// DASHBOARD TASKS OVERVIEW (single request)
// ─────────────────────────────────────────

async function getDashboardTasks(userId, isAdmin = false) {
  if (!isAdmin) validateObjectId(userId, 'user ID');

  const projectQuery = isAdmin
    ? {}
    : {
        $or: [
          { owner: userId },
          { 'members.userId': userId },
        ],
      };

  const accessibleProjects = await Project.find(projectQuery)
    .select('_id title owner members')
    .lean();

  if (accessibleProjects.length === 0) return [];

  const projectMetaById = new Map();
  for (const project of accessibleProjects) {
    const id = String(project._id);
    const isOwner = String(project.owner || '') === String(userId);
    const member = (project.members || []).find(
      (m) => String(m.userId) === String(userId)
    );

    projectMetaById.set(id, {
      projectRef: { _id: project._id, title: project.title },
      isOwner,
      memberRole: member?.roleName || null,
    });
  }

  const projectIds = accessibleProjects.map((project) => project._id);
  const tasks = await Task.find({ project: { $in: projectIds } })
    .populate('assignedTo', 'email username avatar')
    .sort({ createdAt: -1 })
    .lean();

  if (isAdmin) {
    return tasks.map((task) => ({
      ...task,
      projectRef: projectMetaById.get(String(task.project))?.projectRef || null,
    }));
  }

  return tasks
    .filter((task) => {
      const meta = projectMetaById.get(String(task.project));
      if (!meta) return false;
      if (meta.isOwner) return true;
      return isTaskVisibleToMember(task, userId, meta.memberRole);
    })
    .map((task) => ({
      ...task,
      projectRef: projectMetaById.get(String(task.project))?.projectRef || null,
    }));
}

// ─────────────────────────────────────────
// GET SINGLE TASK
// ─────────────────────────────────────────

async function getTaskById(taskId, userId, isAdmin = false) {
  validateObjectId(taskId, 'task ID');

  const task = await Task.findById(taskId).populate('assignedTo', 'email username avatar');
  if (!task) throw new AppError('Task not found', 404);

  const project = await ensureProjectAccess(task.project, userId, isAdmin);

  if (!isAdmin) {
    const isOwner = String(project.owner || '') === String(userId);
    if (isOwner) return task;

    const member = getMembership(project, userId);
    if (!isTaskVisibleToMember(task, userId, member?.roleName))
      throw new AppError('This task is not assigned to your role', 403);
  }

  return task;
}

// ─────────────────────────────────────────
// UPDATE TASK STATUS
// Member بيحدث الـ status — owner بيعمل approve لما تبقى Done
// ─────────────────────────────────────────

const VALID_TRANSITIONS = {
  'Todo':        ['In-Progress'],
  'In-Progress': ['Done'],
  'Done':        [],
  'Approved':    [],
};

async function updateTaskStatus(taskId, newStatus, userId, isAdmin = false) {
  validateObjectId(taskId, 'task ID');

  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  const project = await ensureProjectAccess(task.project, userId, isAdmin);

  // Admin يقدر يعمل أي transition
  if (isAdmin) {
    task.status = newStatus;
    await task.save();
    return task;
  }

  const isOwner    = String(project.owner || '') === String(userId);
  const isAssigned = String(task.assignedTo || '') === String(userId);

  // Owner بس هو اللي يقدر يعمل approve لما task تبقى Done
  if (newStatus === 'Approved') {
    if (!isOwner)
      throw new AppError('Only the project owner can approve tasks', 403);
    if (task.status !== 'Done')
      throw new AppError('Can only approve tasks that are marked as Done', 400);

    task.status = 'Approved';
    await task.save();
    await _rewardUser(task);
    return task;
  }

  // Member بس هو اللي يقدر يحدث task بتاعته
  if (!isAssigned)
    throw new AppError('You can only update tasks assigned to you', 403);

  const allowed = VALID_TRANSITIONS[task.status] || [];
  if (!allowed.includes(newStatus))
    throw new AppError(
      `Cannot move task from "${task.status}" to "${newStatus}"`,
      400
    );

  task.status = newStatus;
  await task.save();
  return task;
}

// ─────────────────────────────────────────
// Helper — update user completion stats on task approval
// ─────────────────────────────────────────

async function _rewardUser(task) {
  if (!task.assignedTo) return;

  await User.findByIdAndUpdate(task.assignedTo, {
    $inc: { completedTasks: 1 },
  });

  // Reliability bonus لو خلص قبل الـ deadline
  if (task.deadline && new Date() <= new Date(task.deadline)) {
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
}

// ─────────────────────────────────────────
// Exports
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// CREATE SINGLE TASK
// ─────────────────────────────────────────

async function createTask(projectId, userId, taskData, isAdmin = false) {
  validateObjectId(projectId, 'project ID');
  
  const project = await ensureProjectAccess(projectId, userId, isAdmin);

  const task = new Task({
    project: projectId,
    title: taskData.title || taskData.name || 'Untitled Task',
    description: taskData.description || '',
    assignedRole: taskData.assignedRole || 'Developer',
    assignedTo: taskData.assignedTo || null,
    priority: taskData.priority || 'Medium',
    status: taskData.status === 'Doing' ? 'In-Progress' : taskData.status === 'Done' ? 'Done' : 'Todo',
    deadline: taskData.deadline || taskData.endDate || null,
  });

  await task.save();
  await task.populate('assignedTo', 'email username avatar');
  return task;
}

// ─────────────────────────────────────────
// UPDATE TASK (fields only, not status)
// ─────────────────────────────────────────

async function updateTask(taskId, userId, updates, isAdmin = false) {
  validateObjectId(taskId, 'task ID');

  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  const project = await ensureProjectAccess(task.project, userId, isAdmin);

  // Non-admins can only edit if assigned to them
  if (!isAdmin) {
    const isOwner = String(project.owner || '') === String(userId);
    const isAssigned = String(task.assignedTo || '') === String(userId);
    if (!isOwner && !isAssigned)
      throw new AppError('You can only edit tasks assigned to you or owned projects', 403);
  }

  // Map frontend fields to backend fields
  if (updates.name) task.title = updates.name;
  if (updates.description !== undefined) task.description = updates.description;
  if (updates.assigneeId !== undefined) task.assignedTo = updates.assigneeId || null;
  if (updates.priority !== undefined) task.priority = updates.priority;
  if (updates.deadline !== undefined) task.deadline = updates.deadline;
  if (updates.endDate !== undefined) task.deadline = updates.endDate;
  if (updates.assignedRole !== undefined) task.assignedRole = updates.assignedRole;

  // Handle section → status mapping
  if (updates.section) {
    const statusMap = { 'To do': 'Todo', 'Doing': 'In-Progress', 'Done': 'Done' };
    task.status = statusMap[updates.section] || task.status;
  }
  if (updates.status !== undefined) {
    task.status = updates.status;
  }

  await task.save();
  await task.populate('assignedTo', 'email username avatar');
  return task;
}

// ─────────────────────────────────────────
// DELETE TASK
// ─────────────────────────────────────────

async function deleteTask(taskId, userId, isAdmin = false) {
  validateObjectId(taskId, 'task ID');

  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  const project = await ensureProjectAccess(task.project, userId, isAdmin);

  // Only project owner or admin can delete
  if (!isAdmin) {
    const isOwner = String(project.owner || '') === String(userId);
    if (!isOwner)
      throw new AppError('Only project owner can delete tasks', 403);
  }

  await Task.findByIdAndDelete(taskId);
  return { success: true, message: 'Task deleted' };
}

module.exports = {
  createTasksByAI,
  createTask,
  getDashboardTasks,
  getProjectTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
};