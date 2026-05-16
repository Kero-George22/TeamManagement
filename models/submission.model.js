const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    task:   { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    project:{ type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },

    status: {
      type: String,
      enum: ['pending', 'under_review', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },

    submissionType: { type: String, enum: ['link', 'text', 'file'], default: 'text' },
    submittedWork:  { type: String, default: '' },
    repoLink:         { type: String, default: '' },
    submissionLink:   { type: String, default: '' },
    attachment:       { type: String, default: '' },

    score:          { type: Number, min: 0, max: 100 },
    aiReview:       { type: String },
    aiFeedback:     { type: String },
    humanFeedback:  { type: String },
    codeQualityScore: { type: Number, min: 0, max: 10 },

    needsHumanReview: { type: Boolean, default: false },
    portfolioVisible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

submissionSchema.index({ user: 1, status: 1 });
submissionSchema.index({ project: 1, status: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
