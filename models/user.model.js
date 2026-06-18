const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },

    isVerified: { type: Boolean, default: false },
    isAdmin:    { type: Boolean, default: false },
    isBanned:   { type: Boolean, default: false },
    
    refreshTokens: [{ type: String }],

    verificationToken:         { type: String },
    verificationTokenExpires:  { type: Date },
    pendingEmail:              { type: String, lowercase: true, trim: true },
    resetPasswordToken:        { type: String },
    resetPasswordTokenExpires: { type: Date },

    // ─── Profile ───────────────────────────
    username: { type: String, trim: true },
    avatar:   { type: String },
    bio:      { type: String, trim: true, maxlength: 1000 },
    headline: { type: String, trim: true, maxlength: 120 },
    location: { type: String, trim: true, maxlength: 100 },
    lastSeen: { type: Date, default: Date.now },

    role:     { type: String, trim: true, maxlength: 50 },
    skills: [{ type: String, trim: true, maxlength: 50 }],
    interests: [{ type: String, trim: true, maxlength: 50 }],
    hasCompletedOnboarding: { type: Boolean, default: false },

    socials: {
      whatsapp: { type: String, trim: true, maxlength: 300 },
      facebook: { type: String, trim: true, maxlength: 300 },
      linkedin: { type: String, trim: true, maxlength: 300 },
      twitter:  { type: String, trim: true, maxlength: 300 },
      github:   { type: String, trim: true, maxlength: 300 },
    },

    completedTasks: { type: Number, default: 0, min: 0 },

    // ─── 2FA ───────────────────────────────
    twoFA: {
      enabled:     { type: Boolean, default: false },
      secret:      { type: String, select: false },
      backupCodes: [{ type: String, select: false }]
    },

    // ─── AI Usage & Plan ───────────────────
    plan: { type: String, enum: ['free', 'pro', 'team'], default: 'free' },
    aiUsage: {
      credits:   { type: Number, default: 0 },
      resetDate: { type: Date },
      totalUsed: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Indexes for search performance
UserSchema.index({ username: 1 }, { sparse: true });
UserSchema.index({ verificationToken: 1 }, { sparse: true });    // email verification flow
UserSchema.index({ resetPasswordToken: 1 }, { sparse: true });   // password reset flow
UserSchema.index({ refreshTokens: 1 }, { sparse: true });         // logout / token revocation
// note: email index is auto-created by unique:true — do not add manually



UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, await bcrypt.genSalt(10));
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.models?.User || mongoose.model('User', UserSchema);