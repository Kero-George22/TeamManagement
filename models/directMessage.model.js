const mongoose = require('mongoose');

const DMSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

DMSchema.index({ sender: 1, receiver: 1 });
DMSchema.index({ sender: 1, createdAt: -1 });
DMSchema.index({ receiver: 1, createdAt: -1 });
DMSchema.index({ receiver: 1, read: 1 });

module.exports = mongoose.model('DirectMessage', DMSchema);