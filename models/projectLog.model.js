const mongoose = require('mongoose');

const ProjectLogSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    entityType: {
      type: String,
      enum: ['project', 'task', 'member', 'joinRequest', 'ai', 'status', 'permissions'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    entityTitle: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Indexes for fast lookup on the logs page
ProjectLogSchema.index({ project: 1, createdAt: -1 });
ProjectLogSchema.index({ project: 1, action: 1, createdAt: -1 });
ProjectLogSchema.index({ project: 1, actor: 1, createdAt: -1 });

module.exports = mongoose.model('ProjectLog', ProjectLogSchema);
