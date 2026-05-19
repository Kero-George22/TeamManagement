const notificationService = require('../services/notification.service');
const asyncWrapper = require('../utils/asyncWrapper');
const { success } = require('../utils/apiResponse');

const getNotifications = asyncWrapper(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await notificationService.getUserNotifications(req.user._id, parseInt(page), parseInt(limit));
  return success(res, result, 'Notifications retrieved');
});

const getUnreadCount = asyncWrapper(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);
  return success(res, { count }, 'Unread count retrieved');
});

const markRead = asyncWrapper(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user._id);
  return success(res, notification, 'Notification marked as read');
});

const markAllRead = asyncWrapper(async (req, res) => {
  await notificationService.markAllAsRead(req.user._id);
  return success(res, {}, 'All notifications marked as read');
});

const deleteNotification = asyncWrapper(async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.user._id);
  return success(res, {}, 'Notification deleted');
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
};
