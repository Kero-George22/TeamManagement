const mongoose = require('mongoose');

const OptionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const PollSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: String, required: true },
  options: [OptionSchema],
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

PollSchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model('Poll', PollSchema);
