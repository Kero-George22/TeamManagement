const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:    { type: String, required: true },
  postedAt:{ type: Date, default: Date.now },
});

const taskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null }, // subtask support
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  taskType: { type: String, default: 'Task' },
  assignedRole: { type: String, required: true },
  status: { type: String, default: 'Todo' },
  startDate: { type: Date },
  deadline: { type: Date },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  storyPoints: { type: Number, min: 0, default: 0 },
  labels: [{ type: String }],
  aiInstructions: { type: String },
  submittedWork: { type: String },
  repoLink: { type: String },
  submissionType: { type: String, enum: ['link', 'text', 'file'], default: 'text' },
  attachment: { type: String },
  aiReview: { type: String },
  aiRating: { type: Number, min: 0, max: 100 },
  feedback: { type: String },
  dependsOn: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
  }],
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Indexes
taskSchema.index({ project: 1, createdAt: -1 });
taskSchema.index({ project: 1, assignedTo: 1, createdAt: -1 });
taskSchema.index({ project: 1, assignedRole: 1, createdAt: -1 });
taskSchema.index({ parentTask: 1 });
taskSchema.index({ dependsOn: 1 });
taskSchema.index({ assignedTo: 1, createdAt: -1 }); // Dashboard queries
taskSchema.index({ assignedRole: 1, createdAt: -1 }); // Role-based filtering

module.exports = mongoose.model('Task', taskSchema);
