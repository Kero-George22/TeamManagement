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

    skills: [{ type: String, trim: true, maxlength: 50 }],

    socials: {
      whatsapp: { type: String, trim: true, maxlength: 300 },
      facebook: { type: String, trim: true, maxlength: 300 },
      linkedin: { type: String, trim: true, maxlength: 300 },
      twitter:  { type: String, trim: true, maxlength: 300 },
      github:   { type: String, trim: true, maxlength: 300 },
    },

    completedTasks: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Indexes for search performance
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
// Collation-based index for case-insensitive regex searches
UserSchema.index({ username: 1, email: 1 });

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