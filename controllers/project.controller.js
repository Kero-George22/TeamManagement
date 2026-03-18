const projectService = require('../services/project.service');
const asyncWrapper = require('../utils/asyncWrapper');
const { success, error } = require('../utils/apiResponse');

/**
 * CREATE PROJECT
 * - Basic validation: required fields, data types
 * - Calls service with sanitized data
 * - Service handles business logic (role validation, etc.)
 */
const createProject = asyncWrapper(async (req, res) => {
  const { title, description, startDate, duration, status, rolesRequired } = req.body;

  // Basic validation - required fields
  if (!title || typeof title !== 'string' || !title.trim()) {
    return error(res, 'Title is required and must be a non-empty string', 400);
  }

  if (!description || typeof description !== 'string' || !description.trim()) {
    return error(res, 'Description is required and must be a non-empty string', 400);
  }

  if (!startDate) {
    return error(res, 'Start date is required', 400);
  }

  if (duration === undefined || duration === null) {
    return error(res, 'Duration is required', 400);
  }

  if (typeof duration !== 'number' || duration <= 0) {
    return error(res, 'Duration must be a positive number', 400);
  }

  if (!rolesRequired || !Array.isArray(rolesRequired)) {
    return error(res, 'rolesRequired must be an array', 400);
  }

  if (rolesRequired.length === 0) {
    return error(res, 'At least one role is required', 400);
  }

  // Basic validation - roles array
  for (const role of rolesRequired) {
    if (!role.roleName || typeof role.roleName !== 'string') {
      return error(res, 'Each role must have a valid roleName', 400);
    }
    if (typeof role.totalSlots !== 'number' || role.totalSlots <= 0) {
      return error(res, 'Each role must have totalSlots as a positive number', 400);
    }
  }

  // Call service to handle advanced validation and create project
  const project = await projectService.createProject(
    {
      title: title.trim(),
      description: description.trim(),
      startDate,
      duration,
      status: status || 'Recruiting',
      rolesRequired,
    },
    req.user._id // owner is the authenticated user
  );

  return success(res, project, 'Project created successfully', 201);
});

/**
 * GET ALL PROJECTS
 * - Basic validation: query parameters types
 * - Calls service to fetch and filter projects
 * - Service handles search logic
 */
const getProjects = asyncWrapper(async (req, res) => {
  const { roleName, status, page = 1, limit = 10 } = req.query;

  // Basic validation - page and limit
  let pageNum = parseInt(page);
  let limitNum = parseInt(limit);

  if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) limitNum = 10;

  // Build filters object
  const filters = {};
  if (roleName && typeof roleName === 'string') filters.roleName = roleName.trim();
  if (status && typeof status === 'string') filters.status = status.trim();

  // Call service to fetch projects
  const result = await projectService.getAllProjects(filters, pageNum, limitNum);

  return success(res, result, 'Projects retrieved successfully');
});

/**
 * GET PROJECT BY ID
 * - Basic validation: project ID format
 * - Calls service to fetch single project
 * - Service handles authorization checks if needed
 */
const getProjectById = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  // Basic validation - ID presence
  if (!id || typeof id !== 'string') {
    return error(res, 'Valid project ID is required', 400);
  }

  // Call service to fetch project
  const project = await projectService.getProjectById(id);

  return success(res, project, 'Project retrieved successfully');
});

/**
 * JOIN PROJECT
 * - Basic validation: project ID, role name
 * - Calls service to handle business logic
 * - Service checks: available slots, duplicate join, user status, etc.
 */
const joinProject = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;
  const { roleName } = req.body;

  // Basic validation - project ID
  if (!projectId || typeof projectId !== 'string') {
    return error(res, 'Valid project ID is required', 400);
  }

  // Basic validation - role name
  if (!roleName || typeof roleName !== 'string' || !roleName.trim()) {
    return error(res, 'Role name is required and must be a non-empty string', 400);
  }

  // Call service to handle join logic and business rules
  const project = await projectService.joinProject(projectId, req.user._id, roleName.trim());

  return success(res, project, 'Successfully joined project', 200);
});

/**
 * UPDATE PROJECT
 * - Basic validation: project ID, update fields format
 * - Calls service to handle business logic
 * - Service checks: ownership, status constraints, role changes, etc.
 */
const updateProject = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Basic validation - project ID
  if (!id || typeof id !== 'string') {
    return error(res, 'Valid project ID is required', 400);
  }

  // Basic validation - at least one field to update
  if (!updates || Object.keys(updates).length === 0) {
    return error(res, 'At least one field to update is required', 400);
  }

  // Basic validation - update fields types
  if (updates.title !== undefined && (typeof updates.title !== 'string' || !updates.title.trim())) {
    return error(res, 'Title must be a non-empty string', 400);
  }

  if (updates.description !== undefined && (typeof updates.description !== 'string' || !updates.description.trim())) {
    return error(res, 'Description must be a non-empty string', 400);
  }

  if (updates.duration !== undefined && (typeof updates.duration !== 'number' || updates.duration <= 0)) {
    return error(res, 'Duration must be a positive number', 400);
  }

  if (updates.rolesRequired !== undefined && !Array.isArray(updates.rolesRequired)) {
    return error(res, 'rolesRequired must be an array', 400);
  }

  // Call service to handle update with business logic
  const project = await projectService.updateProject(id, updates, req.user._id);

  return success(res, project, 'Project updated successfully');
});

/**
 * DELETE PROJECT
 * - Basic validation: project ID
 * - Calls service to handle deletion with business logic
 * - Service checks: ownership, project status, etc.
 */
const deleteProject = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  // Basic validation - project ID
  if (!id || typeof id !== 'string') {
    return error(res, 'Valid project ID is required', 400);
  }

  // Call service to handle deletion
  await projectService.deleteProject(id, req.user._id);

  return success(res, {}, 'Project deleted successfully');
});

/**
 * GET PROJECT MEMBERS
 * Returns all members of a project with their profile info
 */
const getProjectMembers = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  if (!id || typeof id !== 'string') {
    return error(res, 'Valid project ID is required', 400);
  }

  const members = await projectService.getProjectMembers(id);
  return success(res, members, 'Project members retrieved');
});

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  joinProject,
  updateProject,
  deleteProject,
  getProjectMembers,
};
