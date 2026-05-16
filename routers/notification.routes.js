const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.use(requireAuth);

// GET  /notifications              — paginated list
router.get('/', notificationController.getNotifications);

// GET  /notifications/unread-count — unread count
router.get('/unread-count', notificationController.getUnreadCount);

// PATCH /notifications/:notificationId/read — mark one as read
router.patch('/:notificationId/read', notificationController.markAsRead);

// PATCH /notifications/read-all     — mark all as read
router.patch('/read-all', notificationController.markAllAsRead);

// DELETE /notifications/:notificationId — delete one
router.delete('/:notificationId', notificationController.deleteNotification);

module.exports = router;
