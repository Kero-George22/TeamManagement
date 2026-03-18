const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  title: { type: String,  trim: true },
  description: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  duration: { type: Number, required: true }, // in days
  status: { type: String, enum: ['Recruiting', 'In-Progress', 'Completed'], default: 'Recruiting' },
  rolesRequired: [{
    roleName: { type: String, required: true },
    totalSlots: { type: Number, required: true, min: 1 },
    filledSlots: { type: Number, default: 0, min: 0 },
    requiredSkills: [{
      skillName: { type: String, required: true },
      minLevel: { type: Number, default: 1, min: 1, max: 5 }
    }]
  }],
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roleName: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
  }],
  officeReport: {
    content: { type: String, default: '' },
    generatedAt: { type: Date },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Project', ProjectSchema);
