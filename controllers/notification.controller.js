const notificationService = require('../services/notification.service');
const asyncWrapper = require('../utils/asyncWrapper');
const { success } = require('../utils/apiResponse');

const getNotifications = asyncWrapper(async (req, res) => {
  const { page, limit } = req.query;
  const result = await notificationService.getNotifications(req.user._id, page, limit);
  return success(res, result, 'Notifications retrieved');
});

const getUnreadCount = asyncWrapper(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);
  return success(res, { count }, 'Unread count retrieved');
});

const markAsRead = asyncWrapper(async (req, res) => {
  const { notificationId } = req.params;
  const notification = await notificationService.markAsRead(notificationId, req.user._id);
  return success(res, notification, 'Notification marked as read');
});

const markAllAsRead = asyncWrapper(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user._id);
  return success(res, result, 'All notifications marked as read');
});

const deleteNotification = asyncWrapper(async (req, res) => {
  const { notificationId } = req.params;
  await notificationService.deleteNotification(notificationId, req.user._id);
  return success(res, null, 'Notification deleted');
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
