const mongoose = require('mongoose');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const AppError = require('../utils/AppError');
const { sendNotificationToUser } = require('./socket.service');

// Import email service fallback
let emailService;
try { emailService = require('../utils/email.service'); } catch { emailService = null; }

async function createNotification({ recipientId, type, title, message, data = {} }) {
  if (!mongoose.Types.ObjectId.isValid(recipientId)) return null;

  const notification = await Notification.create({
    recipient: recipientId,
    type,
    title,
    message,
    data,
  });

  // Real-time push via Socket.io (use toObject for clean serialization)
  sendNotificationToUser(recipientId, notification.toObject());

  // Email fallback
  try {
    const recipient = await User.findById(recipientId).select('email').lean();
    if (recipient?.email && emailService) {
      await emailService.sendMail({
        to: recipient.email,
        subject: title,
        html: `<p>${message}</p>`,
        text: message,
      });
      await Notification.findByIdAndUpdate(notification._id, { emailed: true });
    }
  } catch {
    // Email is best-effort
  }

  return notification;
}

async function getNotifications(userId, page = 1, limit = 50) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Notification.countDocuments({ recipient: userId }),
    Notification.countDocuments({ recipient: userId, read: false }),
  ]);

  return {
    notifications,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    unreadCount,
  };
}

async function markAsRead(notificationId, userId) {
  if (!mongoose.Types.ObjectId.isValid(notificationId))
    throw new AppError('Invalid notification ID', 400);

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { $set: { read: true } },
    { new: true }
  );

  if (!notification) throw new AppError('Notification not found', 404);
  return notification;
}

async function markAllAsRead(userId) {
  const result = await Notification.updateMany(
    { recipient: userId, read: false },
    { $set: { read: true } }
  );
  return { modifiedCount: result.modifiedCount };
}

async function deleteNotification(notificationId, userId) {
  if (!mongoose.Types.ObjectId.isValid(notificationId))
    throw new AppError('Invalid notification ID', 400);

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) throw new AppError('Notification not found', 404);
  return { ok: true };
}

async function getUnreadCount(userId) {
  return Notification.countDocuments({ recipient: userId, read: false });
}

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
};
