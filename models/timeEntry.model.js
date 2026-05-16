const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: { type: Number, default: 0 }, // milliseconds
  pausedDuration: { type: Number, default: 0 }, // accumulated paused time
  status: {
    type: String,
    enum: ['running', 'paused', 'stopped'],
    default: 'running',
  },
  description: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

timeEntrySchema.index({ task: 1, user: 1 });
timeEntrySchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('TimeEntry', timeEntrySchema);
