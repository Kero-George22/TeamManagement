const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date },
  reliabilityScore: { type: Number, default: 0 },

  // Profile
  username: { type: String, trim: true },
  avatar: { type: String }, // URL to avatar image
  bio: { type: String, trim: true, maxlength: 500 },
  lastSeen: { type: Date, default: Date.now },
  
  // Gamification
  totalXP: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  completedTasks: { type: Number, default: 0 },
  badges: [{ type: String }], // Array of badge IDs

  // Skills & Assessments
  skills: {
    Frontend: {
      level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], default: null },
      score: { type: Number, default: 0 },
      lastAssessmentDate: Date,
      assessmentId: mongoose.Schema.Types.ObjectId
    },
    Backend: {
      level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], default: null },
      score: { type: Number, default: 0 },
      lastAssessmentDate: Date,
      assessmentId: mongoose.Schema.Types.ObjectId
    },
    FullStack: {
      level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], default: null },
      score: { type: Number, default: 0 },
      lastAssessmentDate: Date,
      assessmentId: mongoose.Schema.Types.ObjectId
    },
    DevOps: {
      level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], default: null },
      score: { type: Number, default: 0 },
      lastAssessmentDate: Date,
      assessmentId: mongoose.Schema.Types.ObjectId
    },
    DataScience: {
      level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], default: null },
      score: { type: Number, default: 0 },
      lastAssessmentDate: Date,
      assessmentId: mongoose.Schema.Types.ObjectId
    }
  },

  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true
});

// Index for leaderboard queries
UserSchema.index({ totalXP: -1 });
UserSchema.index({ level: -1 });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = require('mongoose').models?.User || mongoose.model('User', UserSchema);
