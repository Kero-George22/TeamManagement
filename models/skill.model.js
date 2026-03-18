const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    category: { type: String, enum: ['Frontend', 'Backend', 'Fullstack', 'DevOps', 'Design', 'Mobile', 'Data', 'Other'], default: 'Other' },
    description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Skill', SkillSchema);
