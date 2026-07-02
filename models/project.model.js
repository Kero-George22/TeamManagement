const mongoose = require('mongoose');

const PROJECT_CATEGORIES = [
  'Software Development',
  'Web Development',
  'Mobile Development',
  'Data Science & AI',
  'DevOps & Cloud',
  'Cybersecurity',
  'Blockchain',
  'IoT & Hardware',
  'Game Development',
  'UI/UX Design',
  'Business & Marketing',
  'Finance & Accounting',
  'Engineering',
  'Education & Training',
  'Healthcare',
  'E-commerce',
  'Social Impact',
  'Research & Development',
  'Other',
];

const PROJECT_LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust',
  'Swift', 'Kotlin', 'Ruby', 'PHP', 'Dart', 'R', 'MATLAB', 'Scala',
  'HTML/CSS', 'SQL', 'Shell', 'No-Code', 'Other',
];

const ProjectSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true },
    owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate:   { type: Date,   required: true },
    duration:    { type: Number, required: true }, // in days

    category:    { type: String, enum: PROJECT_CATEGORIES, default: 'Other' },
    language:    { type: String, enum: PROJECT_LANGUAGES, default: 'Other' },

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

    // ─── Community Features ───────────────
    likes:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    bookmarks:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lookingFor:   { type: String, default: '' }, // e.g., "Frontend developer, UI designer"

    // ─── Custom Fields Templates ──────────
    customFields: [
      {
        name: { type: String, required: true },
        type: { type: String, enum: ['text', 'number', 'date', 'boolean'], default: 'text' },
      }
    ],

    // ─── Member Permissions ──────────────────
    permissions: {
      memberCanEditAnyTask:       { type: Boolean, default: false },
      memberCanDeleteTask:        { type: Boolean, default: false },
      memberCanChangeToAnyStatus: { type: Boolean, default: true },
      memberRestrictedStatuses:   { type: [String], default: ['Approved'] },
      memberCanCreateStatus:      { type: Boolean, default: false },
      memberCanEditStatus:        { type: Boolean, default: false },
      memberCanDeleteStatus:      { type: Boolean, default: false },
      memberCanAssignOthers:      { type: Boolean, default: false },
    },

    aiWorkspace: {
      guidance:      { type: String, default: '' },
      plan:          { type: mongoose.Schema.Types.Mixed, default: null },
      plannerStatus: { type: String, default: '' },
      mode:          { type: String, enum: ['plan', 'ask'], default: 'plan' },
      messages: [
        {
          role:      { type: String, enum: ['user', 'model'], required: true },
          content:   { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
        }
      ],
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      updatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// ─── Indexes ───────────────────────────────
ProjectSchema.index({ isPrivate: 1, status: 1 });          // discovery queries
ProjectSchema.index({ 'members.userId': 1 });               // "projects I joined"
ProjectSchema.index({ owner: 1 });                          // "projects I own"
ProjectSchema.index({ inviteToken: 1 }, { sparse: true });  // invite link lookup
ProjectSchema.index({ category: 1 });                       // category filtering
ProjectSchema.index({ language: 1 });                       // language filtering
ProjectSchema.index({ owner: 1, createdAt: -1 });           // User's projects list
ProjectSchema.index({ 'members.userId': 1, createdAt: -1 }); // Joined projects list

module.exports = mongoose.model('Project', ProjectSchema);
module.exports.PROJECT_CATEGORIES = PROJECT_CATEGORIES;
module.exports.PROJECT_LANGUAGES = PROJECT_LANGUAGES;
