const Project = require('../models/project.model');
const skillService = require('./skill.service');


async function createProject(data, ownerId) {
  const { title, description, startDate, duration, status, rolesRequired } = data;

  // Check for duplicate roles
  const roleNames = {};
  for (const role of rolesRequired) {
    const name = role.roleName.toLowerCase();
    if (roleNames[name]) {
      const err = new Error('Duplicate role names are not allowed');
      err.status = 400;
      throw err;
    }
    roleNames[name] = true;
  }

 
  let totalSlots = 0;
  for (const role of rolesRequired) {
    totalSlots += role.totalSlots;
  }
  if (totalSlots > 100) {
    const err = new Error('Total slots cannot exceed 100');
    err.status = 400;
    throw err;
  }


  const preparedRoles = [];
  for (const role of rolesRequired) {
    preparedRoles.push({
      roleName: role.roleName,
      totalSlots: role.totalSlots,
      filledSlots: 0,
      requiredSkills: role.requiredSkills || []
    });
  }

  const project = new Project({
    title,
    description,
    owner: ownerId,
    startDate,
    duration,
    status: status || 'Recruiting',
    rolesRequired: preparedRoles,
    members: [],
  });

  await project.save();
  await project.populate({ path: 'owner', select: 'email' });
  return project;
}

// GET ALL PROJECTS WITH FILTERS
async function getAllProjects(filters = {}, page = 1, limit = 10) {
  const query = {};

  // Add status filter
  if (filters.status) {
    const validStatuses = ['active', 'paused', 'completed'];
    if (!validStatuses.includes(filters.status)) {
      const err = new Error(`Invalid status. Use: ${validStatuses.join(', ')}`);
      err.status = 400;
      throw err;
    }
    query.status = filters.status;
  }

  // Add role name search (case-insensitive)
  if (filters.roleName) {
    query['rolesRequired.roleName'] = { $regex: filters.roleName, $options: 'i' };
  }

  // Calculate skip for pagination
  const skip = (page - 1) * limit;

  // Get projects and total count
  const projects = await Project.find(query)
    .populate('owner', 'email')
    .populate('members.userId', 'email')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await Project.countDocuments(query);

  return {
    projects,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// GET SINGLE PROJECT
async function getProjectById(projectId) {
  // Basic ObjectId validation
  if (!projectId || projectId.length !== 24) {
    const err = new Error('Invalid project ID');
    err.status = 400;
    throw err;
  }

  const project = await Project.findById(projectId)
    .populate('owner', 'email username avatar')
    .populate('members.userId', 'email username avatar');

  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }

  return project;
}

// JOIN PROJECT
async function joinProject(projectId, userId, roleName) {
  // Validate project ID
  if (!projectId || projectId.length !== 24) {
    const err = new Error('Invalid project ID');
    err.status = 400;
    throw err;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }

  // Check project status - only recruiting projects accept joins
  if (project.status !== 'Recruiting') {
    const err = new Error(`Cannot join project with status: ${project.status}`);
    err.status = 400;
    throw err;
  }

  // Find the role in project
  let roleFound = null;
  let roleIndex = -1;
  for (let i = 0; i < project.rolesRequired.length; i++) {
    if (project.rolesRequired[i].roleName.toLowerCase() === roleName.toLowerCase()) {
      roleFound = project.rolesRequired[i];
      roleIndex = i;
      break;
    }
  }

  if (!roleFound) {
    const err = new Error(`Role "${roleName}" not available in this project`);
    err.status = 400;
    throw err;
  }

  // Check if slots available
  if (roleFound.filledSlots >= roleFound.totalSlots) {
    const err = new Error(`No available slots for ${roleName}`);
    err.status = 400;
    throw err;
  }

  // Check skill eligibility
  const eligibility = await skillService.checkSkillEligibility(userId, roleFound.requiredSkills);
  if (!eligibility.eligible) {
    const err = new Error(`Skill requirements not met: ${eligibility.reasons.join(', ')}`);
    err.status = 400;
    throw err;
  }

  // Check if user already joined
  for (const member of project.members) {
    if (member.userId.toString() === userId.toString()) {
      const err = new Error('You already joined this project');
      err.status = 400;
      throw err;
    }
  }

  // Enforce one project per user
  const alreadyInProject = await Project.findOne({ 'members.userId': userId });
  if (alreadyInProject) {
    const err = new Error(`You are already a member of "${alreadyInProject.title}". Complete that project before joining another.`);
    err.status = 400;
    throw err;
  }

  // Add user to members
  project.members.push({
    userId,
    roleName,
    joinedAt: new Date(),
  });

  // Increase filled slots
  project.rolesRequired[roleIndex].filledSlots += 1;

  // Check if all slots are filled - if yes, change status to In-Progress
  let allFilled = true;
  for (const role of project.rolesRequired) {
    if (role.filledSlots < role.totalSlots) {
      allFilled = false;
      break;
    }
  }
  if (allFilled) {
    project.status = 'In-Progress';
  }

  await project.save();
  await project.populate([
    { path: 'owner', select: 'email' },
    { path: 'members.userId', select: 'email' },
  ]);
  return project;
}

// UPDATE PROJECT
async function updateProject(projectId, updates, userId) {
  // Validate project ID
  if (!projectId || projectId.length !== 24) {
    const err = new Error('Invalid project ID');
    err.status = 400;
    throw err;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }

  // Only owner can update
  if (project.owner.toString() !== userId.toString()) {
    const err = new Error('Only project owner can update');
    err.status = 403;
    throw err;
  }

  // Cannot update roles if project is not recruiting
  if (updates.rolesRequired && project.status !== 'Recruiting') {
    const err = new Error(`Cannot modify roles when project is ${project.status}`);
    err.status = 400;
    throw err;
  }

  // Update allowed fields
  if (updates.title) {
    project.title = updates.title;
  }

  if (updates.description) {
    project.description = updates.description;
  }

  if (updates.startDate) {
    project.startDate = updates.startDate;
  }

  if (updates.duration) {
    project.duration = updates.duration;
  }

  if (updates.status) {
    const validStatuses = ['Recruiting', 'In-Progress', 'Completed'];
    if (!validStatuses.includes(updates.status)) {
      const err = new Error(`Invalid status. Use: ${validStatuses.join(', ')}`);
      err.status = 400;
      throw err;
    }
    project.status = updates.status;
  }

  if (updates.rolesRequired) {
    // Check for duplicate roles
    const roleNames = {};
    for (const role of updates.rolesRequired) {
      const name = role.roleName.toLowerCase();
      if (roleNames[name]) {
        const err = new Error('Duplicate role names not allowed');
        err.status = 400;
        throw err;
      }
      roleNames[name] = true;
    }

    // Check that new slots are not less than filled slots
    for (const newRole of updates.rolesRequired) {
      const oldRole = project.rolesRequired.find(r => r.roleName === newRole.roleName);
      if (oldRole && newRole.totalSlots < oldRole.filledSlots) {
        const err = new Error(`Cannot reduce slots below ${oldRole.filledSlots} (current filled)`);
        err.status = 400;
        throw err;
      }
    }

    project.rolesRequired = updates.rolesRequired;
  }

  await project.save();
  await project.populate({ path: 'owner', select: 'email' });
  return project;
}

// DELETE PROJECT
async function deleteProject(projectId, userId) {
  // Validate project ID
  if (!projectId || projectId.length !== 24) {
    const err = new Error('Invalid project ID');
    err.status = 400;
    throw err;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }

  // Only owner can delete
  if (project.owner.toString() !== userId.toString()) {
    const err = new Error('Only project owner can delete');
    err.status = 403;
    throw err;
  }

  // Cannot delete completed projects
  if (project.status === 'Completed') {
    const err = new Error('Cannot delete completed projects');
    err.status = 400;
    throw err;
  }

  // Cannot delete if members exist
  if (project.members.length > 0) {
    const err = new Error('Cannot delete project with members');
    err.status = 400;
    throw err;
  }

  await Project.deleteOne({ _id: projectId });
  return { ok: true };
}

// GET PROJECT MEMBERS
async function getProjectMembers(projectId) {
  if (!projectId || projectId.length !== 24) {
    const err = new Error('Invalid project ID');
    err.status = 400;
    throw err;
  }

  const project = await Project.findById(projectId)
    .populate('members.userId', 'email username avatar xp level reliabilityScore');

  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }

  return project.members.map(m => ({
    user: m.userId,
    role: m.roleName,
    joinedAt: m.joinedAt
  }));
}

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  joinProject,
  updateProject,
  deleteProject,
  getProjectMembers,
};
