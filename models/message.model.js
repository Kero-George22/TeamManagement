const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: { type: String },      // denormalized so we never need to populate
  avatar:   { type: String },      // denormalized avatar URL / base64
  role:     { type: String },      // member's role in the project
  content: { type: String, required: true, trim: true, maxLength: 2000 },
  type: { type: String, enum: ['user', 'ai', 'system'], default: 'user' },
}, { timestamps: true });

messageSchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
