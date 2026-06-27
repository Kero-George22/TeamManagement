const mongoose = require('mongoose');

const InstructionSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  targetRole: { type: String, default: 'All' },
  priority: { type: String, enum: ['Normal', 'High'], default: 'Normal' }
}, { timestamps: true });

InstructionSchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model('Instruction', InstructionSchema);
