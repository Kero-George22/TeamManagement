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
    roleName:       role.roleName,
    totalSlots:     role.totalSlots,
    filledSlots:    0,
    requiredSkills: role.requiredSkills || [],
  }));
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
  const { title, description, startDate, duration, status, rolesRequired, isPrivate } = data;

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
    rolesRequired: prepareRoles(rolesRequired),
    isPrivate:     !!isPrivate,
    inviteToken,
    members:       [],
    joinRequests:  [],
  });

  await project.save();
  await project.populate({ path: 'owner', select: 'email username avatar' });
  return project;
}

// ─────────────────────────────────────────
// GET ALL PROJECTS — public discovery
// ─────────────────────────────────────────

async function getAllProjects(filters = {}, page = 1, limit = 10, userId = null) {
  // Base condition: public projects OR user's own/joined projects
  const orConditions = [{ isPrivate: false }];
  if (userId) {
    const uid = new mongoose.Types.ObjectId(String(userId));
    orConditions.push({ owner: uid });
    orConditions.push({ 'members.userId': uid });
  }
  const query = { $or: orConditions };

  if (filters.status) {
    const valid = ['Recruiting', 'In-Progress', 'Completed'];
    if (!valid.includes(filters.status))
      throw new AppError(`Invalid status. Use: ${valid.join(', ')}`, 400);
    query.status = filters.status;
  }

  if (filters.roleName)
    query['rolesRequired.roleName'] = { $regex: filters.roleName, $options: 'i' };

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

  // Ensure ALL projects eventually get an inviteToken to allow sharing
  if (!project.inviteToken || project.inviteToken === null) {
    project.inviteToken = crypto.randomBytes(16).toString('hex');
    await project.save();
  }

  return project;
}

// ─────────────────────────────────────────
// GET PROJECT BY INVITE TOKEN
// ─────────────────────────────────────────

async function getProjectByInviteToken(token) {
  if (!token) throw new AppError('Invite token is required', 400);

  const project = await Project.findOne({ inviteToken: token })
    .populate('owner', 'email username avatar');

  if (!project) throw new AppError('Invalid or expired invite link', 404);
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

  const alreadyIn = await Project.findOne({ 'members.userId': userId }, 'title').lean();
  if (alreadyIn)
    throw new AppError(
      `You are already a member of "${alreadyIn.title}". Complete it before joining another.`,
      400
    );

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

  const alreadyIn = await Project.findOne({ 'members.userId': userId }, 'title').lean();
  if (alreadyIn)
    throw new AppError(
      `You are already a member of "${alreadyIn.title}". Complete it before joining another.`,
      400
    );

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
          roleName: { $regex: new RegExp(`^${roleName}$`, 'i') },
          $expr:    { $lt: ['$filledSlots', '$totalSlots'] },
        },
      },
    },
    {
      $push: { members: { userId, roleName, joinedAt: new Date() } },
      $inc:  { 'rolesRequired.$[role].filledSlots': 1 },
    },
    {
      arrayFilters: [{ 'role.roleName': { $regex: new RegExp(`^${roleName}$`, 'i') } }],
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

  if (action === 'reject') {
    request.status = 'rejected';
    await project.save();
    return { ok: true, message: 'Request rejected' };
  }

  // Accept — تحقق إن الـ slot لسه متاح
  const role = project.rolesRequired.find(
    (r) => r.roleName.toLowerCase() === request.roleName.toLowerCase()
  );
  if (!role || role.filledSlots >= role.totalSlots)
    throw new AppError('No available slots for this role anymore', 400);

  const alreadyIn = await Project.findOne(
    { 'members.userId': request.userId, _id: { $ne: projectId } },
    'title'
  ).lean();
  if (alreadyIn)
    throw new AppError(`User is already a member of "${alreadyIn.title}"`, 400);

  request.status = 'accepted';
  project.members.push({ userId: request.userId, roleName: request.roleName, joinedAt: new Date() });
  role.filledSlots += 1;

  await project.save();
  await _checkAndActivate(project);

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

  const project = await Project.findById(projectId)
    .select('owner joinRequests')
    .populate('joinRequests.userId', 'email username avatar');

  if (!project) throw new AppError('Project not found', 404);

  if (String(project.owner) !== String(ownerId))
    throw new AppError('Only the project owner can view join requests', 403);

  return (project.joinRequests || []).filter((r) => r.status === 'pending');
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
// GET PROJECT MEMBERS
// ─────────────────────────────────────────

async function getProjectMembers(projectId) {
  validateObjectId(projectId, 'project ID');

  const project = await Project.findById(projectId).populate(
    'members.userId',
    'email username avatar reliabilityScore'
  );
  if (!project) throw new AppError('Project not found', 404);

  return project.members.map((m) => ({
    user:     m.userId,
    role:     m.roleName,
    joinedAt: m.joinedAt,
  }));
}

// ─────────────────────────────────────────
// Exports
// ─────────────────────────────────────────

module.exports = {
  createProject,
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
};