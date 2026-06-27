const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  // If project is null, it's a personal note
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  reminderDate: { type: Date, default: null },
  isCompleted: { type: Boolean, default: false }
}, { timestamps: true });

NoteSchema.index({ project: 1, user: 1 });
NoteSchema.index({ user: 1, reminderDate: 1 });

module.exports = mongoose.model('Note', NoteSchema);
