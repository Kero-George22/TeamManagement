const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['task_assigned', 'task_updated', 'mention', 'dm', 'join_request', 'project_invite', 'comment', 'status_change'],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    link: { type: String },
  },
  read: { type: Boolean, default: false, index: true },
  emailed: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
