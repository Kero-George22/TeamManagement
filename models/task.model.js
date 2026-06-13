const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:    { type: String, required: true },
  postedAt:{ type: Date, default: Date.now },
});

const taskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null }, // subtask support
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  title: { type: String, required: true },
  description: { type: String, default: '' },
  taskType: { type: String, default: 'Task' },
  assignedRole: { type: String, required: true },
  status: { type: String, default: 'Todo' },
  visibility: { type: String, enum: ['private', 'team', 'public'], default: 'team' },
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

}, { timestamps: true });

// Indexes
taskSchema.index({ project: 1, status: 1, createdAt: -1 });      // covers all project-level queries
taskSchema.index({ project: 1, assignedTo: 1, createdAt: -1 });   // dashboard: project + member filter
taskSchema.index({ assignedTo: 1, createdAt: -1 });               // user dashboard queries
taskSchema.index({ parentTask: 1 }, { sparse: true });             // subtask lookup
taskSchema.index({ dependsOn: 1 }, { sparse: true });              // dependency lookup
taskSchema.index({ deadline: 1, status: 1 }, { sparse: true });    // overdue / reminder queries

module.exports = mongoose.model('Task', taskSchema);
