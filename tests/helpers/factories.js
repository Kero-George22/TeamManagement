const crypto = require('crypto');
const Project = require('../../models/project.model');
const Task = require('../../models/task.model');

async function createProject(owner, overrides = {}) {
  return Project.create({
    title: overrides.title || 'Test Project',
    description: overrides.description || 'A project for tests',
    owner: owner._id || owner,
    startDate: overrides.startDate || new Date(),
    duration: overrides.duration || 14,
    category: overrides.category || 'Software Development',
    language: overrides.language || 'JavaScript',
    status: overrides.status || 'Recruiting',
    isPrivate: overrides.isPrivate || false,
    inviteToken: overrides.inviteToken || crypto.randomBytes(16).toString('hex'),
    taskStatuses: overrides.taskStatuses || ['Todo', 'In-Progress', 'Review', 'Done', 'Approved'],
    rolesRequired: overrides.rolesRequired || [{ roleName: 'Developer', totalSlots: 2, filledSlots: 0 }],
    members: overrides.members || [],
    joinRequests: overrides.joinRequests || [],
  });
}

async function createTask(project, overrides = {}) {
  return Task.create({
    project: project._id || project,
    title: overrides.title || 'Test Task',
    description: overrides.description || 'A task for tests',
    assignedRole: overrides.assignedRole || 'Developer',
    assignedTo: overrides.assignedTo || [],
    priority: overrides.priority || 'Medium',
    status: overrides.status || 'Todo',
    deadline: overrides.deadline,
    storyPoints: overrides.storyPoints ?? 3,
    labels: overrides.labels || [],
  });
}

module.exports = {
  createProject,
  createTask,
};
