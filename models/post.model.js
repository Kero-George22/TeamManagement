const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  tags: [{
    type: String,
    enum: ['SHOWCASE', 'HELP_WANTED', 'QA', 'DISCUSSION', 'MILESTONE'],
    default: 'DISCUSSION'
  }],
  linkedProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  linkedTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  upvoteCount: {
    type: Number,
    default: 0,
    index: true // Index for sorting by popularity (Q&A/Showcase)
  },
  commentCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for comments if needed later, but we'll fetch them separately for performance
postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post'
});

postSchema.index({ createdAt: -1 });
postSchema.index({ tags: 1, createdAt: -1 });
postSchema.index({ upvoteCount: -1, createdAt: -1 });

const Post = mongoose.model('Post', postSchema);
module.exports = Post;
