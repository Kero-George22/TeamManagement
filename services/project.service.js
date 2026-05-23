const mongoose = require('mongoose');
const crypto = require('crypto');
const Project = require('../models/project.model');
const AppError = require('../utils/AppError');

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function validateObjectId(id, label = 'ID') {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError(`Invalid ${label}`, 400);
}

function checkDuplicateRoles(roles) {
  const seen = new Set();
  for (const role of roles) {
    const name = role.roleName.toLowerCase();
    if (seen.has(name))
      throw new AppError('Duplicate role names are not allowed', 400);
    seen.add(name);
  }
}

function prepareRoles(roles) {
  return roles.map((role) => ({
    roleName:    role.roleName,
    totalSlots:  role.totalSlots,
    filledSlots: 0,
  }));
}

function normalizeTaskStatuses(statuses) {
  if (!Array.isArray(statuses)) return null;
  const cleaned = statuses
    .map((status) => String(status || '').trim())
    .filter(Boolean);
  const unique = [...new Set(cleaned)];
  if (unique.length === 0) {
    throw new AppError('taskStatuses must include at least one valid status', 400);
  }
  return unique;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function _checkAndActivate(project) {
  const allFilled = project.rolesRequired.every((r) => r.filledSlots >= r.totalSlots);
  if (allFilled && project.status === 'Recruiting') {
    project.status = 'In-Progress';
    await project.save();
  }
}

// ─────────────────────────────────────────
// CREATE PROJECT
// ─────────────────────────────────────────

async function createProject(data, ownerId) {
  const { title, description, startDate, duration, status, rolesRequired, isPrivate, taskStatuses, category, language } = data;

  checkDuplicateRoles(rolesRequired);

  const totalSlots = rolesRequired.reduce((sum, r) => sum + r.totalSlots, 0);
  if (totalSlots > 100)
    throw new AppError('Total slots cannot exceed 100', 400);

  const inviteToken = crypto.randomBytes(16).toString('hex');

  const project = new Project({
    title,
    description,
    owner:         ownerId,
    startDate,
    duration,
    status:        status || 'Recruiting',
    taskStatuses:  normalizeTaskStatuses(taskStatuses) || ['Todo', 'In-Progress', 'Review', 'Done', 'Approved'],
    rolesRequired: prepareRoles(rolesRequired),
    isPrivate:     !!isPrivate,
    category:      category || 'Other',
    language:      language || 'Other',
    inviteToken,
    members:       [],
    joinRequests:  [],
  });

  await project.save();
  await project.populate({ path: 'owner', select: 'email username avatar' });
  return project;
}

// ─────────────────────────────────────────
// EXPLORE — public projects with category filtering
// ─────────────────────────────────────────

function countOpenSlots(project) {
  return (project.rolesRequired || []).reduce(
    (acc, r) => acc + Math.max(0, (r.totalSlots || 0) - (r.filledSlots || 0)),
    0
  );
}

async function exploreProjects(filters = {}, page = 1, limit = 12, userId = null) {
  const query = { isPrivate: false };

  const status = filters.status || 'Recruiting';
  if (status !== 'all') {
    const valid = ['Recruiting', 'In-Progress', 'Completed'];
    if (!valid.includes(status))
      throw new AppError(`Invalid status. Use: ${valid.join(', ')}, or all`, 400);
    query.status = status;
  }

  if (userId) {
    const uid = new mongoose.Types.ObjectId(String(userId));
    query.$and = [
      { owner: { $ne: uid } },
      { members: { $not: { $elemMatch: { userId: uid } } } },
    ];
  }

  if (filters.category && filters.category !== 'all') {
    query.category = filters.category;
  }

  if (filters.language && filters.language !== 'all') {
    query.language = filters.language;
  }

  if (filters.roleName)
    query['rolesRequired.roleName'] = { $regex: escapeRegex(filters.roleName), $options: 'i' };

  if (filters.durationMin || filters.durationMax) {
    query.duration = {};
    if (filters.durationMin) query.duration.$gte = parseInt(filters.durationMin, 10);
    if (filters.durationMax) query.duration.$lte = parseInt(filters.durationMax, 10);
  }

  if (filters.q?.trim()) {
    const q = escapeRegex(filters.q.trim());
    query.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { lookingFor: { $regex: q, $options: 'i' } },
    ];
  }

  // Hard cap to prevent memory explosion — only fetch recent 500 projects
  const MAX_PROJECTS = 500;
  let projects = await Project.find(query)
    .populate('owner', 'email username avatar')
    .sort({ createdAt: -1 })
    .limit(MAX_PROJECTS)
    .lean();

  projects = projects.filter((p) => countOpenSlots(p) > 0);

  let enriched = projects.map((p) => {
    const end = new Date(p.startDate);
    end.setDate(end.getDate() + (p.duration || 0));
    return {
      ...p,
      openSlots: countOpenSlots(p),
      endDate: end,
      likesCount: (p.likes || []).length,
      bookmarksCount: (p.bookmarks || []).length,
      membersCount: (p.members || []).length + 1,
      collaboratorsCount: (p.collaborators || []).length,
    };
  });

  const sort = filters.sort || 'newest';
  if (sort === 'deadline') {
    enriched.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
  } else if (sort === 'slots') {
    enriched.sort((a, b) => b.openSlots - a.openSlots);
  } else if (sort === 'popular') {
    enriched.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
  } else {
    enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const total = enriched.length;
  const skip = (page - 1) * limit;
  const pageItems = enriched.slice(skip, skip + limit);

  return {
    projects: pageItems,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

// ─────────────────────────────────────────
// GET MY PROJECTS — user's own/joined projects
// ─────────────────────────────────────────

async function getAllProjects(filters = {}, page = 1, limit = 10, userId = null) {
  if (!userId) throw new AppError('User ID is required', 400);
  
  const uid = new mongoose.Types.ObjectId(String(userId));
  const query = { $or: [{ owner: uid }, { 'members.userId': uid }] };

  if (filters.status) {
    const valid = ['Recruiting', 'In-Progress', 'Completed'];
    if (!valid.includes(filters.status))
      throw new AppError(`Invalid status. Use: ${valid.join(', ')}`, 400);
    query.status = filters.status;
  }

  if (filters.roleName)
    query['rolesRequired.roleName'] = { $regex: escapeRegex(filters.roleName), $options: 'i' };

  const skip = (page - 1) * limit;

  const [result] = await Project.aggregate([
    { $match: query },
    {
      $facet: {
        data:  [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  const projects = await Project.populate(result.data, [
    { path: 'owner', select: 'email username avatar' },
  ]);

  return {
    projects,
    total:      result.total[0]?.count || 0,
    page,
    limit,
    totalPages: Math.ceil((result.total[0]?.count || 0) / limit),
  };
}

// ─────────────────────────────────────────
// GET SINGLE PROJECT
// ─────────────────────────────────────────

async function getProjectById(projectId, userId = null) {
  validateObjectId(projectId, 'project ID');

  const project = await Project.findById(projectId)
    .populate('owner',          'email username avatar')
    .populate('members.userId', 'email username avatar');

  if (!project) throw new AppError('Project not found', 404);

  if (project.isPrivate && userId) {
    const isOwner  = String(project.owner._id) === String(userId);
    const isMember = project.members.some(
      (m) => String(m.userId._id || m.userId) === String(userId)
    );
    if (!isOwner && !isMember)
      throw new AppError('This project is private', 403);
  }

  const isOwner = userId && String(project.owner._id || project.owner) === String(userId);

  if (isOwner && (!project.inviteToken || project.inviteToken === null)) {
    project.inviteToken = crypto.randomBytes(16).toString('hex');
    await project.save();
  }

  const output = project.toObject();
  if (!isOwner) delete output.inviteToken;
  return output;
}

// ─────────────────────────────────────────
// GET PROJECT BY INVITE TOKEN
// ─────────────────────────────────────────

async function getProjectByInviteToken(token) {
  if (!token) throw new AppError('Invite token is required', 400);

  const project = await Project.findOne({ inviteToken: token })
    .populate('owner', 'email username avatar')
    .lean();

  if (!project) throw new AppError('Invalid or expired invite link', 404);
  delete project.inviteToken;
  return project;
}

// ─────────────────────────────────────────
// REQUEST TO JOIN — public projects
// ─────────────────────────────────────────

async function requestToJoin(projectId, userId, roleName) {
  validateObjectId(projectId, 'project ID');

  const project = await Project.findById(projectId);
  if (!project) throw new AppError('Project not found', 404);

  if (project.isPrivate)
    throw new AppError('Use the invite link to join a private project', 400);

  if (project.status !== 'Recruiting')
    throw new AppError(`Cannot join a project with status: ${project.status}`, 400);

  if (String(project.owner) === String(userId))
    throw new AppError('You are the owner of this project', 400);

  const isAlreadyMember = (project.members || []).some(
    (m) => String(m.userId) === String(userId)
  );
  if (isAlreadyMember)
    throw new AppError('You are already a member of this project', 400);

  const alreadyRequested = (project.joinRequests || []).some(
    (r) => String(r.userId) === String(userId) && r.status === 'pending'
  );
  if (alreadyRequested)
    throw new AppError('You already have a pending request for this project', 400);

  const role = project.rolesRequired.find(
    (r) => r.roleName.toLowerCase() === roleName.toLowerCase()
  );
  if (!role)
    throw new AppError(`Role "${roleName}" is not available in this project`, 400);

  if (role.filledSlots >= role.totalSlots)
    throw new AppError(`No available slots for "${roleName}"`, 400);

  project.joinRequests.push({
    userId,
    roleName,
    status:      'pending',
    requestedAt: new Date(),
  });
  await project.save();

  // Notify the owner
  const notificationService = require('./notification.service');
  const socketService = require('./socket.service');
  const userObj = await require('../models/user.model').findById(userId).select('username');

  try {
    const notification = await notificationService.createNotification({
      recipient: project.owner,
      sender: userId,
      type: 'join_request',
      title: 'New Join Request',
      message: `${userObj?.username || 'Someone'} requested to join "${project.title}" as ${roleName}`,
      project: project._id,
    });
    if (notification) {
      socketService.sendNotificationToUser(project.owner, notification);
    }
  } catch (err) {
    console.error('Failed to send join request notification:', err);
  }

  return { ok: true, message: 'Join request sent — waiting for owner approval' };
}

// ─────────────────────────────────────────
// JOIN VIA INVITE LINK — private projects
// ─────────────────────────────────────────

async function joinViaInvite(token, userId, roleName) {
  if (!token) throw new AppError('Invite token is required', 400);

  const project = await Project.findOne({ inviteToken: token });
  if (!project) throw new AppError('Invalid or expired invite link', 404);

  if (project.status !== 'Recruiting')
    throw new AppError(`Cannot join a project with status: ${project.status}`, 400);

  const role = project.rolesRequired.find(
    (r) => r.roleName.toLowerCase() === roleName.toLowerCase()
  );
  if (!role)
    throw new AppError(`Role "${roleName}" is not available in this project`, 400);

  if (role.filledSlots >= role.totalSlots)
    throw new AppError(`No available slots for "${roleName}"`, 400);

  const updated = await Project.findOneAndUpdate(
    {
      _id:              project._id,
      inviteToken:      token,
      'members.userId': { $ne: userId },
      rolesRequired: {
        $elemMatch: {
          roleName: { $regex: new RegExp(`^${escapeRegex(roleName)}$`, 'i') },
          filledSlots: { $lt: role.totalSlots },
        },
      },
    },
    {
      $push: { members: { userId, roleName, joinedAt: new Date() } },
      $inc:  { 'rolesRequired.$[role].filledSlots': 1 },
    },
    {
      arrayFilters: [{ 'role.roleName': { $regex: new RegExp(`^${escapeRegex(roleName)}$`, 'i') } }],
      new: true,
    }
  );

  if (!updated)
    throw new AppError('Could not join — slot just filled or already a member', 400);

  await _checkAndActivate(updated);

  await updated.populate([
    { path: 'owner',          select: 'email username avatar' },
    { path: 'members.userId', select: 'email username avatar' },
  ]);

  return updated;
}

// ─────────────────────────────────────────
// HANDLE JOIN REQUEST — owner accepts / rejects
// ─────────────────────────────────────────

async function handleJoinRequest(projectId, requestId, action, ownerId) {
  validateObjectId(projectId, 'project ID');
  validateObjectId(requestId,  'request ID');

  if (!['accept', 'reject'].includes(action))
    throw new AppError('Action must be "accept" or "reject"', 400);

  const project = await Project.findById(projectId);
  if (!project) throw new AppError('Project not found', 404);

  if (String(project.owner) !== String(ownerId))
    throw new AppError('Only the project owner can handle join requests', 403);

  const request = (project.joinRequests || []).find(
    (r) => String(r._id) === String(requestId) && r.status === 'pending'
  );
  if (!request) throw new AppError('Join request not found or already handled', 404);

  const notificationService = require('./notification.service');
  const socketService = require('./socket.service');

  if (action === 'reject') {
    request.status = 'rejected';
    await project.save();
    
    try {
      const notification = await notificationService.createNotification({
        recipient: request.userId,
        sender: ownerId,
        type: 'join_request_rejected',
        title: 'Join Request Declined',
        message: `Your request to join "${project.title}" was declined.`,
        project: project._id,
      });
      if (notification) socketService.sendNotificationToUser(request.userId, notification);
    } catch (err) {
      console.error('Failed to notify rejection:', err);
    }

    return { ok: true, message: 'Request rejected' };
  }

  // Accept — تحقق إن الـ slot لسه متاح
  const role = project.rolesRequired.find(
    (r) => r.roleName.toLowerCase() === request.roleName.toLowerCase()
  );
  if (!role || role.filledSlots >= role.totalSlots)
    throw new AppError('No available slots for this role anymore', 400);

  request.status = 'accepted';
  project.members.push({ userId: request.userId, roleName: request.roleName, joinedAt: new Date() });
  role.filledSlots += 1;

  await project.save();
  await _checkAndActivate(project);

  try {
    const notification = await notificationService.createNotification({
      recipient: request.userId,
      sender: ownerId,
      type: 'join_request_accepted',
      title: 'Join Request Accepted!',
      message: `You are now a member of "${project.title}"!`,
      project: project._id,
    });
    if (notification) socketService.sendNotificationToUser(request.userId, notification);
  } catch (err) {
    console.error('Failed to notify acceptance:', err);
  }

  await project.populate([
    { path: 'owner',          select: 'email username avatar' },
    { path: 'members.userId', select: 'email username avatar' },
  ]);

  return project;
}

// ─────────────────────────────────────────
// GET JOIN REQUESTS — owner only
// ─────────────────────────────────────────

async function getJoinRequests(projectId, ownerId) {
  validateObjectId(projectId, 'project ID');

  const ownership = await Project.findById(projectId).select('owner').lean();

  if (!ownership) throw new AppError('Project not found', 404);

  if (String(ownership.owner) !== String(ownerId))
    throw new AppError('Only the project owner can view join requests', 403);

  const rows = await Project.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(String(projectId)) } },
    { $unwind: '$joinRequests' },
    { $match: { 'joinRequests.status': 'pending' } },
    {
      $lookup: {
        from: 'users',
        localField: 'joinRequests.userId',
        foreignField: '_id',
        as: 'requestUser',
      },
    },
    { $unwind: { path: '$requestUser', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: '$joinRequests._id',
        user: {
          _id: '$requestUser._id',
          email: '$requestUser.email',
          username: '$requestUser.username',
          avatar: '$requestUser.avatar',
        },
        roleName: '$joinRequests.roleName',
        status: '$joinRequests.status',
        requestedAt: '$joinRequests.requestedAt',
      },
    },
    { $sort: { requestedAt: -1 } },
  ]);

  return rows;
}

// ─────────────────────────────────────────
// UPDATE PROJECT
// ─────────────────────────────────────────

async function updateProject(projectId, updates, userId) {
  validateObjectId(projectId, 'project ID');

  const project = await Project.findById(projectId).select('owner status rolesRequired');
  if (!project) throw new AppError('Project not found', 404);

  if (project.owner.toString() !== userId.toString())
    throw new AppError('Only the project owner can update', 403);

  if (updates.rolesRequired && project.status !== 'Recruiting')
    throw new AppError(`Cannot modify roles when project is ${project.status}`, 400);

  const payload = {};
  for (const field of ['title', 'description', 'startDate', 'duration']) {
    if (updates[field] !== undefined) payload[field] = updates[field];
  }

  if (updates.status) {
    const valid = ['Recruiting', 'In-Progress', 'Completed'];
    if (!valid.includes(updates.status))
      throw new AppError(`Invalid status. Use: ${valid.join(', ')}`, 400);
    payload.status = updates.status;
  }

  if (updates.rolesRequired) {
    checkDuplicateRoles(updates.rolesRequired);
    for (const newRole of updates.rolesRequired) {
      const oldRole = project.rolesRequired.find(
        (r) => r.roleName.toLowerCase() === newRole.roleName.toLowerCase()
      );
      if (oldRole && newRole.totalSlots < oldRole.filledSlots)
        throw new AppError(
          `Cannot reduce slots below ${oldRole.filledSlots} (current filled) for "${newRole.roleName}"`,
          400
        );
    }
    payload.rolesRequired = updates.rolesRequired;
  }

  if (updates.taskStatuses !== undefined) {
    payload.taskStatuses = normalizeTaskStatuses(updates.taskStatuses);
  }

  return Project.findByIdAndUpdate(projectId, { $set: payload }, { new: true })
    .populate('owner', 'email username avatar');
}

// ─────────────────────────────────────────
// DELETE PROJECT
// ─────────────────────────────────────────

async function deleteProject(projectId, userId) {
  validateObjectId(projectId, 'project ID');

  const project = await Project.findById(projectId).select('owner status members');
  if (!project) throw new AppError('Project not found', 404);

  if (project.owner.toString() !== userId.toString())
    throw new AppError('Only the project owner can delete', 403);

  if (project.status === 'Completed')
    throw new AppError('Cannot delete completed projects', 400);

  if (project.members.length > 0)
    throw new AppError('Cannot delete a project that has members', 400);

  await Project.deleteOne({ _id: projectId });
  return { ok: true };
}

// ─────────────────────────────────────────
// TOGGLE LIKE
// ─────────────────────────────────────────

async function toggleLike(projectId, userId) {
  validateObjectId(projectId, 'project ID');
  validateObjectId(userId, 'user ID');

  const project = await Project.findById(projectId);
  if (!project) throw new AppError('Project not found', 404);

  const uid = String(userId);
  const likes = project.likes || [];
  const idx = likes.findIndex((id) => String(id) === uid);

  if (idx === -1) {
    likes.push(userId);
  } else {
    likes.splice(idx, 1);
  }

  project.likes = likes;
  await project.save();
  return { liked: idx === -1, likesCount: likes.length };
}

// ─────────────────────────────────────────
// TOGGLE BOOKMARK
// ─────────────────────────────────────────

async function toggleBookmark(projectId, userId) {
  validateObjectId(projectId, 'project ID');
  validateObjectId(userId, 'user ID');

  const project = await Project.findById(projectId);
  if (!project) throw new AppError('Project not found', 404);

  const uid = String(userId);
  const bookmarks = project.bookmarks || [];
  const idx = bookmarks.findIndex((id) => String(id) === uid);

  if (idx === -1) {
    bookmarks.push(userId);
  } else {
    bookmarks.splice(idx, 1);
  }

  project.bookmarks = bookmarks;
  await project.save();
  return { bookmarked: idx === -1, bookmarksCount: bookmarks.length };
}

// ─────────────────────────────────────────
// GET PROJECT MEMBERS
// ─────────────────────────────────────────

async function getProjectMembers(projectId, requesterId, isAdmin = false) {
  validateObjectId(projectId, 'project ID');

  const project = await Project.findById(projectId).populate(
    'members.userId',
    'email username avatar reliabilityScore'
  );
  if (!project) throw new AppError('Project not found', 404);

  const uid = String(requesterId || '');
  const isOwner = String(project.owner) === uid;
  const isMember = project.members.some((m) => String(m.userId?._id || m.userId) === uid);
  if (!isAdmin && !isOwner && !isMember) {
    throw new AppError('Only project members can view the member list', 403);
  }

  return project.members.map((m) => ({
    user:     m.userId,
    role:     m.roleName,
    joinedAt: m.joinedAt,
  }));
}

// ─────────────────────────────────────────
// REMOVE MEMBER
// ─────────────────────────────────────────

async function removeMember(projectId, memberUserId, requesterId) {
  validateObjectId(projectId, 'project ID');
  validateObjectId(memberUserId, 'member user ID');

  const project = await Project.findById(projectId).select('owner members rolesRequired');
  if (!project) throw new AppError('Project not found', 404);

  if (project.owner.toString() !== requesterId.toString())
    throw new AppError('Only the project owner can remove members', 403);

  if (project.owner.toString() === memberUserId.toString())
    throw new AppError('Cannot remove the project owner', 400);

  const member = project.members.find(
    (m) => m.userId.toString() === memberUserId.toString()
  );
  if (!member) throw new AppError('Member not found in project', 404);

  await Project.findByIdAndUpdate(projectId, {
    $pull: { members: { userId: memberUserId } },
    $inc:  { 'rolesRequired.$[role].filledSlots': -1 },
  }, {
    arrayFilters: [{ 'role.roleName': member.roleName, 'role.filledSlots': { $gt: 0 } }],
  });

  return { removedUserId: memberUserId, roleName: member.roleName };
}

// ─────────────────────────────────────────
// Exports
// ─────────────────────────────────────────

module.exports = {
  createProject,
  exploreProjects,
  getAllProjects,
  getProjectById,
  getProjectByInviteToken,
  requestToJoin,
  joinViaInvite,
  handleJoinRequest,
  getJoinRequests,
  updateProject,
  deleteProject,
  getProjectMembers,
  removeMember,
  toggleLike,
  toggleBookmark,
};
