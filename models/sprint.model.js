const mongoose = require('mongoose');

const SprintSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true }, // e.g., "Sprint 04: Auth System"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['Planned', 'Active', 'Completed'], default: 'Planned' },
    goal: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Sprint', SprintSchema);
