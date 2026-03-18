const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Team member
  title: { type: String, required: true },
  description: { type: String, required: true },
  assignedRole: { type: String, required: true }, // Role (Backend, Frontend, etc.)
  status: { type: String, enum: ['Todo', 'In-Progress', 'Review', 'Done'], default: 'Todo' },
  xpPoints: { type: Number, default: 50 },
  deadline: { type: Date },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  aiInstructions: { type: String }, // AI-generated task instructions
  submittedWork: { type: String }, // Team member submission
  repoLink: { type: String }, // GitHub/GitLab link
  submissionType: { type: String, enum: ['link', 'text', 'file'], default: 'text' },
  aiReview: { type: String }, // AI manager review
  aiRating: { type: Number, min: 0, max: 100 }, // AI rating (0-100)
  feedback: { type: String }, // AI feedback
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Compound index: project tasks are almost always queried filtered + sorted by project + date
taskSchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
