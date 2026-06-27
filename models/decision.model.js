const mongoose = require('mongoose');

const DecisionSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  dateDecided: { type: Date, default: Date.now }
}, { timestamps: true });

DecisionSchema.index({ project: 1, dateDecided: -1 });

module.exports = mongoose.model('Decision', DecisionSchema);
