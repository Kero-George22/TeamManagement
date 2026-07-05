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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function displayName(user) {
  return user?.username || user?.email?.split('@')[0] || 'Unassigned';
}

function buildRoleQueues(project) {
  const roleMembers = new Map();

  for (const member of project.members || []) {
    const id = member.userId?._id || member.userId;
    if (!id) continue;
    const key = normalizeRole(member.roleName);
    if (!roleMembers.has(key)) roleMembers.set(key, []);
    roleMembers.get(key).push({
      id: String(id),
      name: displayName(member.userId),
      roleName: member.roleName,
    });
  }

  return {
    roleMembers,
    cursors: new Map(),
  };
}

function pickAssigneeForRole(roleName, queues) {
  const key = normalizeRole(roleName);
  const candidates = queues.roleMembers.get(key) || [];
  if (!candidates.length) return null;

  const cursor = queues.cursors.get(key) || 0;
  const assignee = candidates[cursor % candidates.length];
  queues.cursors.set(key, cursor + 1);
  return assignee;
}

function buildProjectMemberSet(project) {
  const ids = new Set();
  if (project.owner?._id || project.owner) ids.add(String(project.owner?._id || project.owner));
  for (const member of project.members || []) {
    const id = member.userId?._id || member.userId;
    if (id) ids.add(String(id));
  }
  return ids;
}

function flattenPlanTasks(plan) {
  const tasks = [];
  for (const phase of plan?.phases || []) {
    for (const task of phase.tasks || []) {
      tasks.push({ ...task, phaseName: task.phaseName || phase.name });
    }
  }
  return tasks;
}

function normalizeGeneratedPlanForReview(plan, project) {
  const phases = Array.isArray(plan?.phases) ? plan.phases : [];
  const queues = buildRoleQueues(project);
  const start = project.startDate ? new Date(project.startDate) : new Date();
  const duration = Math.max(1, Number(project.duration) || 14);
  const phaseCount = Math.max(1, phases.length);
  const phaseDays = Math.max(1, Math.ceil(duration / phaseCount));

  const normalizedPhases = phases.map((phase, phaseIndex) => {
    const phaseStart = addDays(start, phaseIndex * phaseDays);
    const phaseEnd = addDays(start, Math.min(duration, (phaseIndex + 1) * phaseDays));

    return {
      id: `phase-${phaseIndex + 1}`,
      name: String(phase.name || `Phase ${phaseIndex + 1}`).slice(0, 140),
      milestone: String(phase.milestone || '').slice(0, 240),
      startDate: toDateInputValue(phaseStart),
      deadline: toDateInputValue(phaseEnd),
      tasks: (phase.tasks || []).map((task, taskIndex) => {
        const assignee = pickAssigneeForRole(task.assignedRole, queues);
        return {
          clientId: `phase-${phaseIndex + 1}-task-${taskIndex + 1}`,
          phaseName: String(phase.name || `Phase ${phaseIndex + 1}`).slice(0, 140),
          accepted: true,
          title: String(task.title || 'Untitled task').slice(0, 180),
          description: String(task.description || '').slice(0, 3000),
          assignedRole: String(task.assignedRole || 'Member').slice(0, 80),
          assigneeId: assignee?.id || '',
          assigneeName: assignee?.name || '',
          priority: ['Low', 'Medium', 'High'].includes(task.priority) ? task.priority : 'Medium',
          storyPoints: Number.isFinite(Number(task.storyPoints)) ? Number(task.storyPoints) : 3,
          status: 'Todo',
          startDate: toDateInputValue(phaseStart),
          deadline: toDateInputValue(phaseEnd),
        };
      }),
    };
  });

  return {
    summary: String(plan?.summary || 'AI generated a project execution plan.').slice(0, 2000),
    phases: normalizedPhases,
  };
}

const DEFAULT_AI_MESSAGES = [
  {
    role: 'model',
    content: 'Ask me about risks, blockers, scope, or team priorities for this project.',
  },
];

function normalizeWorkspaceMessages(messages) {
  if (!Array.isArray(messages)) return DEFAULT_AI_MESSAGES;
  const cleaned = messages
    .filter((message) => ['user', 'model'].includes(message?.role) && String(message?.content || '').trim())
    .slice(-120)
    .map((message) => {
      const createdAt = message.createdAt ? new Date(message.createdAt) : new Date();
      return {
        role: message.role,
        content: String(message.content).slice(0, 8000),
        createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
      };
    });
  return cleaned.length ? cleaned : DEFAULT_AI_MESSAGES;
}

function serializeAIWorkspace(workspace = {}) {
  return {
    guidance: workspace.guidance || '',
    plan: workspace.plan || null,
    plannerStatus: workspace.plannerStatus || '',
    mode: workspace.mode === 'ask' ? 'ask' : 'plan',
    messages: normalizeWorkspaceMessages(workspace.messages),
    updatedAt: workspace.updatedAt || null,
    updatedBy: workspace.updatedBy || null,
  };
}

function plainWorkspace(workspace = {}) {
  return workspace?.toObject ? workspace.toObject() : (workspace || {});
}

async function getPlannerProject(projectId, userId, isAdmin = false) {
  validateObjectId(projectId, 'project ID');

  const project = await Project.findById(projectId)
    .populate('members.userId', 'email username avatar')
    .populate('owner', 'email username avatar');
  if (!project) throw new AppError('Project not found', 404);

  if (isAdmin) return project;

  const isOwner = String(project.owner?._id || project.owner) === String(userId);
  if (!isOwner)
    throw new AppError('Only the project owner can use the AI planner', 403);

  return project;
}

async function getAIWorkspace(projectId, userId, isAdmin = false) {
  const project = await ensureProjectAccess(projectId, userId, isAdmin, ['aiWorkspace']);
  return serializeAIWorkspace(project.aiWorkspace || {});
}

async function updateAIWorkspace(projectId, userId, payload = {}, isAdmin = false) {
  const project = await ensureProjectAccess(projectId, userId, isAdmin, ['aiWorkspace']);
  const isOwner = String(project.owner || '') === String(userId);
  const current = serializeAIWorkspace(project.aiWorkspace || {});

  const next = {
    ...current,
    mode: payload.mode === 'ask' ? 'ask' : payload.mode === 'plan' ? 'plan' : current.mode,
    messages: payload.messages !== undefined
      ? normalizeWorkspaceMessages(payload.messages)
      : current.messages,
    updatedBy: userId,
    updatedAt: new Date(),
  };

  if (isOwner || isAdmin) {
    if (payload.guidance !== undefined) next.guidance = String(payload.guidance || '').slice(0, 2000);
    if (payload.plan !== undefined) next.plan = payload.plan || null;
    if (payload.plannerStatus !== undefined) next.plannerStatus = String(payload.plannerStatus || '').slice(0, 1000);
  } else if (payload.guidance !== undefined || payload.plan !== undefined || payload.plannerStatus !== undefined) {
    throw new AppError('Only the project owner can edit the AI plan', 403);
  }

  project.aiWorkspace = next;
  await project.save();
  return serializeAIWorkspace(project.aiWorkspace || {});
}

async function ensureProjectAccess(projectId, userId, isAdmin = false, extraFields = []) {
  const fields = ['owner', 'members', 'permissions', ...extraFields].join(' ');
  const project = await Project.findById(projectId).select(fields);
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

async function ensureTaskAccess(taskId, userId, isAdmin = false, extraProjectFields = []) {
  validateObjectId(taskId, 'task ID');

  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  const project = await ensureProjectAccess(task.project, userId, isAdmin, extraProjectFields);
  return { task, project };
}

/*
function isTaskVisibleToMember(task, userId, memberRole) {
  const assignedToMe = Array.isArray(task.assignedTo) && task.assignedTo.some(u => String(u._id || u) === String(userId));
  const roleMatch =
    !!memberRole &&
    normalizeRole(task.assignedRole) === normalizeRole(memberRole);
  return assignedToMe || roleMatch;
}
  */

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

  const plan = await aiManager.generateProjectPlan({
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

  const taskDocs = [];
  
  // Flatten tasks from phases
  for (const phase of plan.phases || []) {
    for (const taskData of phase.tasks || []) {
      const roleKey    = normalizeRole(taskData.assignedRole);
      const candidates = roleMembers.get(roleKey) || [];
      let assignedTo   = null;

      if (candidates.length > 0) {
        const cursor = roleCursor.get(roleKey) || 0;
        assignedTo   = candidates[cursor % candidates.length];
        roleCursor.set(roleKey, cursor + 1);
      }

      taskDocs.push({
        project:      projectId,
        title:        `[${phase.name}] ${taskData.title}`,
        description:  taskData.description,
        assignedRole: taskData.assignedRole,
        assignedTo:   assignedTo ? [assignedTo] : [],
        priority:     taskData.priority  || 'Medium',
        storyPoints:  taskData.storyPoints || 0,
        status:       'Todo',
        deadline,
      });
    }
  }

  return Task.insertMany(taskDocs);
}

async function generateAIPlanPreview(projectId, userId, isAdmin = false, guidance = '') {
  const project = await getPlannerProject(projectId, userId, isAdmin);
  const existingTasks = await Task.find({ project: projectId })
    .select('title status priority assignedRole deadline storyPoints')
    .lean();

  const plan = await aiManager.generateProjectPlan({
    title: project.title,
    description: project.description,
    rolesRequired: project.rolesRequired,
    duration: project.duration,
    status: project.status,
    category: project.category,
    language: project.language,
    guidance,
    existingTasks,
  });

  const workspacePlan = normalizeGeneratedPlanForReview(plan, project);
  project.aiWorkspace = {
    ...plainWorkspace(project.aiWorkspace),
    guidance: String(guidance || '').slice(0, 2000),
    plan: workspacePlan,
    plannerStatus: 'Review the suggestions, edit anything you want, then accept only the work you approve.',
    updatedBy: userId,
    updatedAt: new Date(),
  };
  await project.save();

  return workspacePlan;
}

async function acceptAIPlan(projectId, userId, payload = {}, isAdmin = false) {
  const project = await getPlannerProject(projectId, userId, isAdmin);
  const memberIds = buildProjectMemberSet(project);
  const queues = buildRoleQueues(project);
  const incomingTasks = Array.isArray(payload.tasks)
    ? payload.tasks
    : flattenPlanTasks(payload.plan);

  const acceptedTasks = incomingTasks
    .filter((task) => task && task.accepted !== false)
    .slice(0, 100);

  if (!acceptedTasks.length)
    throw new AppError('Select at least one AI task to create', 400);

  const docs = acceptedTasks.map((task) => {
    const title = String(task.title || '').trim();
    if (!title) throw new AppError('Every accepted task needs a title', 400);

    const role = String(task.assignedRole || 'Member').trim() || 'Member';
    const requestedAssignee = String(task.assigneeId || '').trim();
    const autoAssignee = pickAssigneeForRole(role, queues);
    const assigneeId = requestedAssignee && mongoose.Types.ObjectId.isValid(requestedAssignee) && memberIds.has(requestedAssignee)
      ? requestedAssignee
      : autoAssignee?.id;

    const labels = Array.isArray(task.labels)
      ? task.labels
      : String(task.labels || '')
          .split(',')
          .map((label) => label.trim())
          .filter(Boolean);

    const phaseLabel = String(task.phaseName || '').trim();
    if (phaseLabel) labels.push(phaseLabel);
    labels.push('ai-plan');

    return {
      project: projectId,
      title: title.slice(0, 220),
      description: String(task.description || '').slice(0, 5000),
      taskType: task.taskType || 'Task',
      assignedRole: role.slice(0, 100),
      assignedTo: assigneeId ? [assigneeId] : [],
      priority: ['Low', 'Medium', 'High'].includes(task.priority) ? task.priority : 'Medium',
      status: project.taskStatuses?.[0] || 'Todo',
      startDate: task.startDate || null,
      deadline: task.deadline || null,
      storyPoints: Number.isFinite(Number(task.storyPoints)) ? Number(task.storyPoints) : 0,
      labels: [...new Set(labels)].slice(0, 12),
      visibility: 'team',
    };
  });

  const created = await Task.insertMany(docs);
  const ids = created.map((task) => task._id);
  const populated = await Task.find({ _id: { $in: ids } })
    .populate('assignedTo', 'email username avatar')
    .sort({ createdAt: -1 });

  try {
    const { notifyTaskAssigned } = require('./notification.service');
    await Promise.all(
      populated.flatMap((task) =>
        (task.assignedTo || [])
          .filter((assignee) => String(assignee._id || assignee) !== String(userId))
          .map((assignee) => notifyTaskAssigned(task._id, assignee._id || assignee, userId, projectId))
      )
    );
  } catch {}

  return populated;
}

// ─────────────────────────────────────────
// GET ALL TASKS FOR A PROJECT
// ─────────────────────────────────────────

async function getProjectTasks(projectId, userId, isAdmin = false) {
  validateObjectId(projectId, 'project ID');

  const project = await ensureProjectAccess(projectId, userId, isAdmin);

  const query = { project: projectId };

  return Task.find(query)
    .populate('assignedTo', 'email username avatar')
    .sort({ createdAt: -1 });
}

// ─────────────────────────────────────────
// DASHBOARD TASKS OVERVIEW (single request, aggregate-based)
// ─────────────────────────────────────────

async function getDashboardTasks(userId, isAdmin = false) {
  if (!isAdmin) validateObjectId(userId, 'user ID');

  const userIdObj = new mongoose.Types.ObjectId(String(userId));

  // 1) Get accessible projects (fast lean query)
  const projectQuery = isAdmin
    ? {}
    : { $or: [{ owner: userIdObj }, { 'members.userId': userIdObj }] };

  const projects = await Project.find(projectQuery)
    .select('_id title owner members isPrivate')
    .lean();

  if (!projects.length) return [];

  const projectMap = new Map(
    projects.map((p) => [String(p._id), { _id: p._id, title: p.title, isPrivate: p.isPrivate }])
  );

  // 2) Build visibility filters — members only see their own tasks, owners see all
  const orClauses = [];

  if (isAdmin) {
    orClauses.push({ project: { $in: projects.map((p) => p._id) } });
  } else {
    for (const project of projects) {
      const isOwner = String(project.owner) === String(userId);
      if (isOwner) {
        // Owner sees all tasks in their project
        orClauses.push({ project: project._id });
        continue;
      }
      // Members see tasks assigned to them OR unassigned tasks
      orClauses.push({
        project: project._id,
        $or: [
          { assignedTo: userIdObj },
          { assignedTo: { $size: 0 } },
          { assignedTo: { $exists: false } }
        ]
      });
    }
  }

  // 3) Single query to get tasks (limited to 100 most recent for performance)
  const taskQuery = orClauses.length === 1 ? orClauses[0] : { $or: orClauses };
  
  const tasks = await Task.find(taskQuery)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('assignedTo', 'email username avatar')
    .lean();

  // 4) Attach projectRef in-memory (fast Map lookup vs DB join)
  return tasks.map((task) => ({
    ...task,
    projectRef: projectMap.get(String(task.project)) || null,
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

  return task;
}

// ─────────────────────────────────────────
// UPDATE TASK STATUS
// ─────────────────────────────────────────

const BLOCKED_FOR_MEMBERS = ['Approved'];

async function checkDependencies(task, targetStatus) {
  if (!task.dependsOn || task.dependsOn.length === 0) return;

  const doneOrApproved = ['Done', 'Approved'];
  if (!doneOrApproved.includes(targetStatus)) return;

  const deps = await Task.find({ _id: { $in: task.dependsOn } })
    .select('status title')
    .lean();

  const blocked = deps.filter(
    (d) => !doneOrApproved.includes(d.status)
  );

  if (blocked.length > 0) {
    const names = blocked.map((d) => `"${d.title}"`).join(', ');
    throw new AppError(
      `Cannot mark as "${targetStatus}" — dependencies not completed: ${names}`,
      400
    );
  }
}

async function _syncLinkedGoals(taskId, newStatus) {
  if (newStatus !== 'Done' && newStatus !== 'Approved') return;
  try {
    const { completeGoalsForTask } = require('./goal.service');
    await completeGoalsForTask(taskId);
  } catch {
    // Goals sync is best-effort
  }
}

async function updateTaskStatus(taskId, newStatus, userId, isAdmin = false) {
  validateObjectId(taskId, 'task ID');

  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  const project = await ensureProjectAccess(task.project, userId, isAdmin);

  const isOwner    = String(project.owner || '') === String(userId);
  const isAssigned = Array.isArray(task.assignedTo) && task.assignedTo.some(u => String(u._id || u) === String(userId));
  const isMember   = project.members.some(
    (m) => String(m.userId) === String(userId)
  );

  // Admin أو Owner يقدر يعمل أي transition
  if (isAdmin || isOwner) {
    await checkDependencies(task, newStatus);
    const oldStatus = task.status;
    task.status = newStatus;
    await task.save();

    if (newStatus === 'Approved' && Array.isArray(task.assignedTo) && task.assignedTo.length > 0) {
      await _rewardUser(task);
      try {
        const { notifyTaskApproved } = require('./notification.service');
        try {
          await Promise.all(
            task.assignedTo.map((u) => notifyTaskApproved(task._id, u, userId, task.project))
          );
        } catch {}
      } catch {}

    } else if (Array.isArray(task.assignedTo) && !task.assignedTo.some(u => String(u) === String(userId))) {
      try {
        const { notifyStatusChanged } = require('./notification.service');
        await notifyStatusChanged(task._id, userId, newStatus, task.project);
      } catch {}
    }

    await _syncLinkedGoals(task._id, newStatus);
    return task;
  }

  // Member عادي
  if (!isMember)
    throw new AppError('You must be a project member to update tasks', 403);

  const isUnassigned = !task.assignedTo || task.assignedTo.length === 0;
  const perms = project.permissions || {};

  // Member يقدر يغير الـ tasks المسندة له بس أو اللي مش مسندة لحد أو لو الصلاحية مفتوحة
  if (!isAssigned && !isUnassigned && !perms.memberCanEditAnyTask)
    throw new AppError('You can only update tasks assigned to you or unassigned tasks', 403);

  if (!perms.memberCanChangeToAnyStatus) {
    const restricted = perms.memberRestrictedStatuses || ['Approved'];
    if (restricted.includes(newStatus))
      throw new AppError(`Members cannot change tasks to "${newStatus}" status`, 403);
  }

  await checkDependencies(task, newStatus);
  task.status = newStatus;
  await task.save();
  await _syncLinkedGoals(task._id, newStatus);
  return task;
}

// ─────────────────────────────────────────
// Exports
// ─────────────────────────────────────────

// ───  ──────────────────────────────────────
// CREATE SINGLE TASK
// ──────────────────────────────────────

async function _rewardUser(task) {
  if (!Array.isArray(task.assignedTo) || task.assignedTo.length === 0) return;
  await User.updateMany(
    { _id: { $in: task.assignedTo } },
    { $inc: { completedTasks: 1 } }
  );
}

async function createTask(projectId, userId, taskData, isAdmin = false) {
  validateObjectId(projectId, 'project ID');
  
  const project = await ensureProjectAccess(projectId, userId, isAdmin, ['taskStatuses']);
  const allowedStatuses = project?.taskStatuses?.length
    ? project.taskStatuses
    : ['Todo', 'In-Progress', 'Review', 'Done', 'Approved'];


  const requestedStatus = taskData.status === 'Doing'
    ? 'In-Progress'
    : taskData.status === 'To do'
      ? 'Todo'
      : taskData.status;


  const normalizedStatus = requestedStatus && allowedStatuses.includes(requestedStatus)
    ? requestedStatus
    : 'Todo';


  const labels = Array.isArray(taskData.labels)
    ? taskData.labels
    : String(taskData.labels || '')
        .split(',')
        .map((label) => label.trim())
        .filter(Boolean);

  let resolvedAssignedTo = taskData.assignedTo || taskData.assigneeId || null;
  if (resolvedAssignedTo === 'me') {
    resolvedAssignedTo = [userId];

  } else if (Array.isArray(resolvedAssignedTo)) {
    resolvedAssignedTo = resolvedAssignedTo.filter(id => mongoose.Types.ObjectId.isValid(id));

  } else if (resolvedAssignedTo && mongoose.Types.ObjectId.isValid(resolvedAssignedTo)) {
    resolvedAssignedTo = [resolvedAssignedTo];
    
  } else {
    resolvedAssignedTo = [];
  }

  // Only owner/admin can assign tasks to others (or members with permission)
  const isOwner = String(project.owner || '') === String(userId);
  const perms = project.permissions || {};
  if (!isAdmin && !isOwner && !perms.memberCanAssignOthers && resolvedAssignedTo.length > 0 && !resolvedAssignedTo.every(id => String(id) === String(userId))) {
    resolvedAssignedTo = [userId]; // Default to self if member tries to assign to others without permission
  }

  const task = new Task({
    project: projectId,
    title: taskData.title || taskData.name || 'Untitled Task',
    description: taskData.description || '',
    taskType: taskData.taskType || 'Task',
    assignedRole: taskData.assignedRole || 'Developer',
    assignedTo: resolvedAssignedTo,
    priority: taskData.priority || 'Medium',
    status: normalizedStatus,
    visibility: taskData.visibility || 'team',
    dependsOn: Array.isArray(taskData.dependsOn)
      ? taskData.dependsOn.filter((id) => mongoose.Types.ObjectId.isValid(id))
      : [],
    startDate: taskData.startDate || null,
    deadline: taskData.deadline || taskData.endDate || null,
    storyPoints: Number.isFinite(Number(taskData.storyPoints)) ? Number(taskData.storyPoints) : 0,
    labels,
    customFields: taskData.customFields || {},
  });

  await task.save();
  await task.populate('assignedTo', 'email username avatar');

  // Send notification if assigned to someone else
  if (resolvedAssignedTo && resolvedAssignedTo.length > 0) {
    const others = resolvedAssignedTo.filter(id => String(id) !== String(userId));
    if (others.length > 0) {
      try {
        const { notifyTaskAssigned } = require('./notification.service');
        others.forEach(async (id) => {
          await notifyTaskAssigned(task._id, id, userId, projectId);
        });
      } catch {}
    }
  }

  return task;
}

// ─────────────────────────────────────────
// UPDATE TASK (fields only, not status)
// ─────────────────────────────────────────

async function updateTask(taskId, userId, updates, isAdmin = false) {
  validateObjectId(taskId, 'task ID');

  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  const project = await ensureProjectAccess(task.project, userId, isAdmin, ['taskStatuses']);
  const allowedStatuses = project?.taskStatuses?.length
    ? project.taskStatuses
    : ['Todo', 'In-Progress', 'Review', 'Done', 'Approved'];

  // Non-admins can only edit if assigned to them, or if it is unassigned (or if permitted)
  if (!isAdmin) {
    const isOwner = String(project.owner || '') === String(userId);
    const isAssigned = Array.isArray(task.assignedTo) && task.assignedTo.some(u => String(u._id || u) === String(userId));
    const isUnassigned = !task.assignedTo || task.assignedTo.length === 0;
    const perms = project.permissions || {};
    
    if (!isOwner && !isAssigned && !isUnassigned && !perms.memberCanEditAnyTask)
      throw new AppError('You can only edit tasks assigned to you, unassigned tasks, or owned projects', 403);
  }

  // Map frontend fields to backend fields
  if (updates.name) task.title = updates.name;
  if (updates.description !== undefined) task.description = updates.description;
  if (updates.assigneeId !== undefined || updates.assignedTo !== undefined) {
    let assignedTo = updates.assigneeId !== undefined ? updates.assigneeId : updates.assignedTo;
    if (assignedTo === 'me') {
      task.assignedTo = [userId];
    } else if (Array.isArray(assignedTo)) {
      task.assignedTo = assignedTo.filter(id => mongoose.Types.ObjectId.isValid(id));
    } else if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
      task.assignedTo = [assignedTo];
    } else {
      task.assignedTo = [];
    }
  }
  if (updates.priority !== undefined) task.priority = updates.priority;
  if (updates.taskType !== undefined) task.taskType = updates.taskType;
  if (updates.startDate !== undefined) task.startDate = updates.startDate || null;
  if (updates.deadline !== undefined) task.deadline = updates.deadline;
  if (updates.endDate !== undefined) task.deadline = updates.endDate;
  if (updates.storyPoints !== undefined) task.storyPoints = Number.isFinite(Number(updates.storyPoints)) ? Number(updates.storyPoints) : task.storyPoints;
  if (updates.labels !== undefined) {
    task.labels = Array.isArray(updates.labels)
      ? updates.labels
      : String(updates.labels || '')
          .split(',')
          .map((label) => label.trim())
          .filter(Boolean);
  }
  if (updates.customFields !== undefined) {
    task.customFields = updates.customFields;
  }
  if (updates.assignedRole !== undefined) task.assignedRole = updates.assignedRole;
  if (updates.dependsOn !== undefined) {
    if (!Array.isArray(updates.dependsOn)) {
      task.dependsOn = updates.dependsOn ? [updates.dependsOn] : [];
    } else {
      task.dependsOn = updates.dependsOn.filter((id) => mongoose.Types.ObjectId.isValid(id));
    }
  }

  // Handle section → status mapping
  if (updates.section) {
    const statusMap = { 'To do': 'Todo', 'Doing': 'In-Progress', 'Done': 'Done' };
    const mappedStatus = statusMap[updates.section] || updates.section;
    if (allowedStatuses.includes(mappedStatus)) task.status = mappedStatus;
  }
  if (updates.status !== undefined) {
    if (!allowedStatuses.includes(updates.status)) {
      throw new AppError('Invalid status for this project workflow', 400);
    }
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

  // Only project owner or admin can delete (or members with permission)
  if (!isAdmin) {
    const isOwner = String(project.owner || '') === String(userId);
    if (!isOwner) {
      const perms = project.permissions || {};
      if (!perms.memberCanDeleteTask)
        throw new AppError('Only project owner can delete tasks', 403);
    }
  }

  await Task.findByIdAndDelete(taskId);
  return { success: true, message: 'Task deleted' };
}

// ─────────────────────────────────────────
// GET PROJECT BOARD — tasks grouped by status
// ─────────────────────────────────────────

async function getProjectBoard(projectId, userId, isAdmin = false) {
  validateObjectId(projectId, 'project ID');

  const project = await ensureProjectAccess(projectId, userId, isAdmin);

  const match = { project: new mongoose.Types.ObjectId(String(projectId)) };

  const groups = await Task.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'users',
        localField: 'assignedTo',
        foreignField: '_id',
        as: 'assignedTo',
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        tasks: { $push: '$$CURRENT' },
      },
    },
    {
      $project: {
        _id: 0,
        status: '$_id',
        count: 1,
        tasks: {
          _id: 1,
          title: 1,
          description: 1,
          assignedTo: {
            $map: {
              input: '$tasks.assignedTo',
              as: 'assignee',
              in: {
                _id: '$$assignee._id',
                email: '$$assignee.email',
                username: '$$assignee.username',
                avatar: '$$assignee.avatar',
              }
            }
          },
          assignedRole: 1,
          priority: 1,
          status: 1,
          deadline: 1,
          labels: 1,
          storyPoints: 1,
          taskType: 1,
          createdAt: 1,
        },
      },
    },
    { $sort: { status: 1 } },
  ]);

  // Adjust assignedTo mapping for individual tasks
  groups.forEach(group => {
    group.tasks.forEach(task => {
       task.assignedTo = task.assignedTo.map(arr => arr[0] || null).filter(Boolean);
    });
  });

  return groups;
}

async function addComment(taskId, userId, text, isAdmin = false) {
  if (!text?.trim()) throw new AppError('Comment text is required', 400);

  const { task } = await ensureTaskAccess(taskId, userId, isAdmin);
  task.comments.push({ user: userId, text: text.trim().slice(0, 2000) });
  await task.save();
  await task.populate('comments.user', 'email username avatar');

  try {
    const { notifyCommentAdded } = require('./notification.service');
    await notifyCommentAdded(task._id, userId, task.project);
  } catch {}

  return task.comments;
}

async function getComments(taskId, userId, isAdmin = false) {
  await ensureTaskAccess(taskId, userId, isAdmin);

  const task = await Task.findById(taskId)
    .select('comments')
    .populate('comments.user', 'email username avatar');
  return task?.comments || [];
}

async function getSubtasksForUser(taskId, userId, isAdmin = false) {
  const { task } = await ensureTaskAccess(taskId, userId, isAdmin);

  return Task.find({ parentTask: task._id, project: task.project })
    .populate('assignedTo', 'email username avatar')
    .sort({ createdAt: 1 });
}

async function attachFile(taskId, userId, fileData, isAdmin = false) {
  if (!fileData || !fileData.url) throw new AppError('No file uploaded', 400);

  const { task, project } = await ensureTaskAccess(taskId, userId, isAdmin);

  if (!isAdmin) {
    const isOwner = String(project.owner || '') === String(userId);
    const isAssigned = Array.isArray(task.assignedTo) && task.assignedTo.some(u => String(u._id || u) === String(userId));
    const isUnassigned = !task.assignedTo || task.assignedTo.length === 0;
    const perms = project.permissions || {};
    
    if (!isOwner && !isAssigned && !isUnassigned && !perms.memberCanEditAnyTask) {
      throw new AppError('You can only upload attachments to tasks assigned to you, unassigned tasks, or owned projects', 403);
    }
  }

  if (!task.attachments) task.attachments = [];
  if (task.attachments.length >= 5) {
    throw new AppError('Maximum 5 attachments per task', 400);
  }

  task.attachments.push({
    url:   fileData.url,
    name:  fileData.name,
    type:  fileData.type,
    size:  fileData.size,
  });
  await task.save();
  return { attachments: task.attachments };
}

async function removeAttachment(taskId, userId, attachmentId, isAdmin = false) {
  const { task, project } = await ensureTaskAccess(taskId, userId, isAdmin);

  if (!isAdmin) {
    const isOwner = String(project.owner || '') === String(userId);
    const isAssigned = Array.isArray(task.assignedTo) && task.assignedTo.some(u => String(u._id || u) === String(userId));
    const isUnassigned = !task.assignedTo || task.assignedTo.length === 0;
    const perms = project.permissions || {};
    
    if (!isOwner && !isAssigned && !isUnassigned && !perms.memberCanEditAnyTask) {
      throw new AppError('You can only remove attachments from tasks assigned to you, unassigned tasks, or owned projects', 403);
    }
  }

  if (task.attachments) {
    task.attachments = task.attachments.filter(a => String(a._id) !== String(attachmentId));
    await task.save();
  }
  return { attachments: task.attachments };
}

module.exports = {
  createTasksByAI,
  generateAIPlanPreview,
  acceptAIPlan,
  getAIWorkspace,
  updateAIWorkspace,
  createTask,
  getDashboardTasks,
  getProjectTasks,
  getProjectBoard,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  addComment,
  getComments,
  getSubtasksForUser,
  attachFile,
  removeAttachment
};
