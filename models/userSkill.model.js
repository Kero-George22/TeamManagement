const mongoose = require('mongoose');

const UserSkillSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    skill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
    level: { type: Number, min: 1, max: 5, default: 1 }, // 1: Beginner, 5: Expert
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
}, {
    timestamps: true
});

// Ensure a user has a unique entry per skill
UserSkillSchema.index({ user: 1, skill: 1 }, { unique: true });

module.exports = mongoose.model('UserSkill', UserSkillSchema);
