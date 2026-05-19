const projectService = require('../services/project.service');
const asyncWrapper = require('../utils/asyncWrapper');
const { success } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

// ─────────────────────────────────────────
// CREATE PROJECT
// ─────────────────────────────────────────

const createProject = asyncWrapper(async (req, res) => {
  const { title, description, startDate, duration, status, rolesRequired, isPrivate, category, language } = req.body;

  if (!title?.trim())       throw new AppError('Title is required', 400);
  if (!description?.trim()) throw new AppError('Description is required', 400);
  if (!startDate)           throw new AppError('Start date is required', 400);
  if (!duration || typeof duration !== 'number' || duration <= 0)
    throw new AppError('Duration must be a positive number', 400);
  if (!Array.isArray(rolesRequired) || rolesRequired.length === 0)
    throw new AppError('At least one role is required', 400);

  for (const role of rolesRequired) {
    if (!role.roleName?.trim())
      throw new AppError('Each role must have a valid roleName', 400);
    if (typeof role.totalSlots !== 'number' || role.totalSlots <= 0)
      throw new AppError('Each role must have totalSlots as a positive number', 400);
  }

  const project = await projectService.createProject(
    { title: title.trim(), description: description.trim(), startDate, duration, status, rolesRequired, isPrivate, category, language },
    req.user._id
  );

  return success(res, project, 'Project created successfully', 201);
});

// ─────────────────────────────────────────
// GET ALL PROJECTS (public discovery)
// ─────────────────────────────────────────

const getProjects = asyncWrapper(async (req, res) => {
  const { roleName, status, page = 1, limit = 10 } = req.query;

  const pageNum  = Math.max(1,   parseInt(page)  || 1);
  const limitNum = Math.min(20, parseInt(limit) || 10);

  const filters = {};
  if (roleName) filters.roleName = String(roleName).trim();
  if (status)   filters.status   = String(status).trim();

  const result = await projectService.getAllProjects(filters, pageNum, limitNum, req.user._id);
  return success(res, result, 'Projects retrieved successfully');
});

// ─────────────────────────────────────────
// EXPLORE — team finder (recruiting projects + match %)
// ─────────────────────────────────────────

const exploreProjects = asyncWrapper(async (req, res) => {
  const {
    role,
    category,
    status,
    sort,
    q,
    durationMin,
    durationMax,
    page = 1,
    limit = 12,
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(30, parseInt(limit, 10) || 12);

  const filters = {};
  if (role)        filters.roleName   = String(role).trim();
  if (category)    filters.category   = String(category).trim();
  if (status)      filters.status     = String(status).trim();
  if (sort)        filters.sort       = String(sort).trim();
  if (q)           filters.q          = String(q).trim();
  if (durationMin) filters.durationMin = durationMin;
  if (durationMax) filters.durationMax = durationMax;

  const result = await projectService.exploreProjects(
    filters,
    pageNum,
    limitNum,
    req.user._id
  );
  return success(res, result, 'Explore projects retrieved');
});

// ─────────────────────────────────────────
// GET PROJECT BY ID
// ─────────────────────────────────────────

const getProjectById = asyncWrapper(async (req, res) => {
  const project = await projectService.getProjectById(req.params.id, req.user?._id);
  return success(res, project, 'Project retrieved successfully');
});

// ─────────────────────────────────────────
// GET PROJECT BY INVITE TOKEN (private)
// ─────────────────────────────────────────

const getProjectByInviteToken = asyncWrapper(async (req, res) => {
  const { token } = req.params;
  const project = await projectService.getProjectByInviteToken(token);
  return success(res, project, 'Project retrieved successfully');
});

// ─────────────────────────────────────────
// REQUEST TO JOIN (public projects)
// ─────────────────────────────────────────

const requestToJoin = asyncWrapper(async (req, res) => {
  const { roleName } = req.body;

  if (!roleName?.trim()) throw new AppError('Role name is required', 400);

  const result = await projectService.requestToJoin(
    req.params.projectId,
    req.user._id,
    roleName.trim()
  );
  return success(res, result, result.message);
});

// ─────────────────────────────────────────
// JOIN VIA INVITE LINK (private projects)
// ─────────────────────────────────────────

const joinViaInvite = asyncWrapper(async (req, res) => {
  const { token } = req.params;
  const { roleName } = req.body;

  if (!roleName?.trim()) throw new AppError('Role name is required', 400);

  const project = await projectService.joinViaInvite(token, req.user._id, roleName.trim());
  return success(res, project, 'Successfully joined project');
});

// ─────────────────────────────────────────
// HANDLE JOIN REQUEST (owner accepts/rejects)
// ─────────────────────────────────────────

const handleJoinRequest = asyncWrapper(async (req, res) => {
  const { projectId, requestId } = req.params;
  const { action } = req.body;

  if (!['accept', 'reject'].includes(action))
    throw new AppError('Action must be "accept" or "reject"', 400);

  const result = await projectService.handleJoinRequest(
    projectId,
    requestId,
    action,
    req.user._id
  );
  return success(res, result, `Request ${action}ed successfully`);
});

// ─────────────────────────────────────────
// GET JOIN REQUESTS (owner only)
// ─────────────────────────────────────────

const getJoinRequests = asyncWrapper(async (req, res) => {
  const requests = await projectService.getJoinRequests(req.params.projectId, req.user._id);
  return success(res, requests, 'Join requests retrieved');
});

// ─────────────────────────────────────────
// UPDATE PROJECT
// ─────────────────────────────────────────

const updateProject = asyncWrapper(async (req, res) => {
  const updates = req.body;

  if (!updates || Object.keys(updates).length === 0)
    throw new AppError('At least one field to update is required', 400);

  if (updates.title !== undefined && !updates.title?.trim())
    throw new AppError('Title must be a non-empty string', 400);

  if (updates.duration !== undefined && (typeof updates.duration !== 'number' || updates.duration <= 0))
    throw new AppError('Duration must be a positive number', 400);

  if (updates.rolesRequired !== undefined && !Array.isArray(updates.rolesRequired))
    throw new AppError('rolesRequired must be an array', 400);

  if (updates.taskStatuses !== undefined && !Array.isArray(updates.taskStatuses))
    throw new AppError('taskStatuses must be an array', 400);

  const project = await projectService.updateProject(req.params.id, updates, req.user._id);
  return success(res, project, 'Project updated successfully');
});

// ─────────────────────────────────────────
// DELETE PROJECT
// ─────────────────────────────────────────

const deleteProject = asyncWrapper(async (req, res) => {
  await projectService.deleteProject(req.params.id, req.user._id);
  return success(res, {}, 'Project deleted successfully');
});

// ─────────────────────────────────────────
// GET PROJECT MEMBERS
// ─────────────────────────────────────────

const getProjectMembers = asyncWrapper(async (req, res) => {
  const members = await projectService.getProjectMembers(req.params.id);
  return success(res, members, 'Project members retrieved');
});

// ─────────────────────────────────────────
// TOGGLE LIKE
// ─────────────────────────────────────────

const toggleLike = asyncWrapper(async (req, res) => {
  const result = await projectService.toggleLike(req.params.id, req.user._id);
  return success(res, result, result.liked ? 'Project liked' : 'Like removed');
});

// ─────────────────────────────────────────
// TOGGLE BOOKMARK
// ─────────────────────────────────────────

const toggleBookmark = asyncWrapper(async (req, res) => {
  const result = await projectService.toggleBookmark(req.params.id, req.user._id);
  return success(res, result, result.bookmarked ? 'Project bookmarked' : 'Bookmark removed');
});

// ─────────────────────────────────────────
// Exports
// ─────────────────────────────────────────

module.exports = {
  createProject,
  getProjects,
  exploreProjects,
  getProjectById,
  getProjectByInviteToken,
  requestToJoin,
  joinViaInvite,
  handleJoinRequest,
  getJoinRequests,
  updateProject,
  deleteProject,
  getProjectMembers,
  toggleLike,
  toggleBookmark,
};