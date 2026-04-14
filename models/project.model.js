const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true },
    owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate:   { type: Date,   required: true },
    duration:    { type: Number, required: true }, // in days

    status: {
      type:    String,
      enum:    ['Recruiting', 'In-Progress', 'Completed'],
      default: 'Recruiting',
    },

    taskStatuses: {
      type: [String],
      default: ['Todo', 'In-Progress', 'Review', 'Done', 'Approved'],
    },

    // ─── Visibility ────────────────────────
    isPrivate:   { type: Boolean, default: false },
    inviteToken: { type: String,  default: null },  // set on creation if isPrivate

    // ─── Roles ─────────────────────────────
    rolesRequired: [
      {
        roleName:    { type: String, required: true },
        totalSlots:  { type: Number, required: true, min: 1 },
        filledSlots: { type: Number, default: 0,     min: 0 },
        requiredSkills: [
          {
            skillName: { type: String, required: true },
            minLevel:  { type: Number, default: 1, min: 1, max: 5 },
          },
        ],
      },
    ],

    // ─── Members ───────────────────────────
    members: [
      {
        userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        roleName: { type: String, required: true },
        joinedAt: { type: Date,   default: Date.now },
      },
    ],

    // ─── Join Requests (public projects) ───
    joinRequests: [
      {
        userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        roleName:    { type: String, required: true },
        status:      { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
        requestedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// ─── Indexes ───────────────────────────────
ProjectSchema.index({ isPrivate: 1, status: 1 });          // discovery queries
ProjectSchema.index({ 'members.userId': 1 });               // "projects I joined"
ProjectSchema.index({ owner: 1 });                          // "projects I own"
ProjectSchema.index({ inviteToken: 1 }, { sparse: true });  // invite link lookup

module.exports = mongoose.model('Project', ProjectSchema);