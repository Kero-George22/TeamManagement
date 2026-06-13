const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: [
      'task_assigned',
      'task_status_changed',
      'comment_added',
      'mention',
      'deadline_reminder',
      'overdue_alert',
      'task_approved',
      'join_request',
      'join_request_accepted',
      'join_request_rejected',
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  // Reference data
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  comment: { type: mongoose.Schema.Types.ObjectId },
  // Metadata
  metadata: { type: Object, default: {} },
}, { timestamps: true });

// Indexes
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
