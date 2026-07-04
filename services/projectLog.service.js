const ProjectLog = require('../models/projectLog.model');
const Project = require('../models/project.model');
const AppError = require('../utils/AppError');

/**
 * Fetch project logs with pagination and filters.
 * Only accessible to project owner or site admins.
 */
exports.getProjectLogs = async (projectId, requesterId, isAdmin, filters, pageNum, limitNum) => {
  const project = await Project.findById(projectId).lean();
  if (!project) throw new AppError('Project not found', 404);

  // Check permissions (owner or admin)
  if (!isAdmin && project.owner.toString() !== requesterId.toString()) {
    throw new AppError('Only project owners can view activity logs', 403);
  }

  const query = { project: projectId };
  
  if (filters.action) query.action = filters.action;
  if (filters.actor) query.actor = filters.actor;
  if (filters.entityType) query.entityType = filters.entityType;

  const total = await ProjectLog.countDocuments(query);
  const skip = (pageNum - 1) * limitNum;

  const logs = await ProjectLog.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .populate('actor', '_id username email avatar')
    .lean();

  return {
    logs,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};

/**
 * Safely record a project log without throwing errors back to the client.
 * Fire-and-forget style.
 * 
 * @param {Object} payload
 * @param {String} payload.project - Project ObjectId
 * @param {String} payload.actor - User ObjectId
 * @param {String} payload.action - e.g., 'project updated'
 * @param {String} payload.entityType - 'project'|'task'|'member'|'joinRequest'|'ai'|'status'|'permissions'
 * @param {String} [payload.entityId] - ObjectId of the entity
 * @param {String} [payload.entityTitle] - Human-readable title
 * @param {String} payload.message - Description of the action
 * @param {Object} [payload.metadata] - Extra info
 */
exports.recordProjectLog = async (payload) => {
  try {
    await ProjectLog.create({
      project: payload.project,
      actor: payload.actor,
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId || null,
      entityTitle: payload.entityTitle || '',
      message: payload.message,
      metadata: payload.metadata || {},
    });
  } catch (error) {
    console.error('Failed to record project log:', error);
  }
};
