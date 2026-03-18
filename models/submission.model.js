const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  submissionLink: {
    type: String,
    trim: true
  },
  repoLink: {
    type: String,
    trim: true
  },
  submissionType: {
    type: String,
    enum: ['link', 'text', 'file'],
    default: 'text'
  },
  content: {
    type: String,
    required: true
  },
  aiFeedback: {
    type: String
  },
  humanReviewRequired: {
    type: Boolean,
    default: false
  },
  humanReviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  humanFeedback: {
    type: String
  },
  reviewStatus: {
    type: String,
    enum: ['ai-review', 'pending-human-review', 'human-reviewed', 'completed'],
    default: 'ai-review'
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  reviewedAt: {
    type: Date
  },
  portfolioVisible: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
SubmissionSchema.index({ user: 1, task: 1 });
SubmissionSchema.index({ status: 1 });
SubmissionSchema.index({ project: 1 });

module.exports = mongoose.model('Submission', SubmissionSchema);
