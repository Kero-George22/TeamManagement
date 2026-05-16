const mongoose = require('mongoose');

const GOAL_COLORS = ['blue', 'purple', 'red', 'orange', 'green', 'pink', 'yellow', 'teal'];

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    completed: { type: Boolean, default: false, index: true },
    color: { type: String, enum: GOAL_COLORS, default: 'blue' },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    targetDate: { type: Date, default: null },
  },
  { timestamps: true }
);

goalSchema.index({ user: 1, completed: 1, createdAt: -1 });

module.exports = mongoose.model('Goal', goalSchema);
module.exports.GOAL_COLORS = GOAL_COLORS;
