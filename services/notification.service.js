const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const AppError = require('../utils/AppError');

async function createNotification(data) {
  const { recipient, sender, type, title, message, task, project, comment, metadata = {} } = data;

  if (!recipient) throw new AppError('Recipient is required', 400);
  if (!type) throw new AppError('Notification type is required', 400);
  if (!title) throw new AppError('Notification title is required', 400);
  if (!message) throw new AppError('Notification message is required', 400);

  // Don't notify yourself
  if (sender && String(sender) === String(recipient)) return null;

  const notification = await Notification.create({
    recipient,
    sender,
    type,
    title,
    message,
    task,
    project,
    comment,
    metadata,
  });

  return notification;
}

async function getUserNotifications(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find({ recipient: userId })
      .populate('sender', 'username email avatar')
      .populate('task', 'title status')
      .populate('project', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ recipient: userId }),
  ]);

  return {
    notifications,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function getUnreadCount(userId) {
  return Notification.countDocuments({ recipient: userId, read: false });
}

async function markAsRead(notificationId, userId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { $set: { read: true } },
    { new: true }
  );

  if (!notification) throw new AppError('Notification not found', 404);
  return notification;
}

async function markAllAsRead(userId) {
  await Notification.updateMany(
    { recipient: userId, read: false },
    { $set: { read: true } }
  );
  return { ok: true };
}

async function deleteNotification(notificationId, userId) {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) throw new AppError('Notification not found', 404);
  return { ok: true };
}

// Helper: Send task-related notifications
async function notifyTaskAssigned(taskId, assigneeId, assignedBy, projectId) {
  const task = await require('../models/task.model').findById(taskId).select('title');
  const project = await require('../models/project.model').findById(projectId).select('title');

  return createNotification({
    recipient: assigneeId,
    sender: assignedBy,
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: `You've been assigned to "${task?.title || 'a task'}" in ${project?.title || 'a project'}`,
    task: taskId,
    project: projectId,
  });
}

async function notifyStatusChanged(taskId, userId, newStatus, projectId) {
  const task = await require('../models/task.model').findById(taskId).select('title assignedTo');
  if (!task?.assignedTo) return null;

  const project = await require('../models/project.model').findById(projectId).select('title');

  return createNotification({
    recipient: task.assignedTo,
    sender: userId,
    type: 'task_status_changed',
    title: 'Task Status Updated',
    message: `"${task.title}" moved to ${newStatus}`,
    task: taskId,
    project: projectId,
    metadata: { newStatus },
  });
}

async function notifyCommentAdded(taskId, commenterId, projectId) {
  const task = await require('../models/task.model').findById(taskId).select('title assignedTo');
  if (!task?.assignedTo) return null;

  const project = await require('../models/project.model').findById(projectId).select('title');

  return createNotification({
    recipient: task.assignedTo,
    sender: commenterId,
    type: 'comment_added',
    title: 'New Comment',
    message: `New comment on "${task.title}"`,
    task: taskId,
    project: projectId,
  });
}

async function notifyDeadlineReminder(taskId, assigneeId, projectId) {
  const task = await require('../models/task.model').findById(taskId).select('title');
  const project = await require('../models/project.model').findById(projectId).select('title');

  return createNotification({
    recipient: assigneeId,
    type: 'deadline_reminder',
    title: 'Deadline Reminder',
    message: `"${task?.title || 'A task'}" is due in 24 hours`,
    task: taskId,
    project: projectId,
  });
}

async function notifyOverdue(taskId, assigneeId, projectId) {
  const task = await require('../models/task.model').findById(taskId).select('title');
  const project = await require('../models/project.model').findById(projectId).select('title');

  return createNotification({
    recipient: assigneeId,
    type: 'overdue_alert',
    title: 'Task Overdue',
    message: `"${task?.title || 'A task'}" is overdue`,
    task: taskId,
    project: projectId,
  });
}

async function notifyTaskApproved(taskId, assigneeId, approvedBy, projectId) {
  const task = await require('../models/task.model').findById(taskId).select('title');
  const project = await require('../models/project.model').findById(projectId).select('title');

  return createNotification({
    recipient: assigneeId,
    sender: approvedBy,
    type: 'task_approved',
    title: 'Task Approved',
    message: `"${task?.title || 'Your task'}" has been approved!`,
    task: taskId,
    project: projectId,
  });
}

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  notifyTaskAssigned,
  notifyStatusChanged,
  notifyCommentAdded,
  notifyDeadlineReminder,
  notifyOverdue,
  notifyTaskApproved,
};
