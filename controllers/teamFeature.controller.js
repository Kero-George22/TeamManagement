const asyncWrapper = require('../utils/asyncWrapper');
const { success } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const Poll = require('../models/poll.model');
const Suggestion = require('../models/suggestion.model');
const Note = require('../models/note.model');
const Decision = require('../models/decision.model');
const Instruction = require('../models/instruction.model');
const Project = require('../models/project.model');

// Helper to verify project membership
const verifyMembership = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) throw new AppError('Project not found', 404);
  const isOwner = project.owner.toString() === userId.toString();
  const isMember = project.members.some(m => m.userId.toString() === userId.toString());
  if (!isOwner && !isMember) {
    throw new AppError('You must be a team member to access this resource', 403);
  }
  return project;
};

// ─────────────────────────────────────────
// POLLS
// ─────────────────────────────────────────

exports.createPoll = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;
  const { question, options, expiresAt } = req.body;
  await verifyMembership(projectId, req.user._id);

  if (!question || !options || options.length < 2) {
    throw new AppError('Question and at least 2 options are required', 400);
  }

  const poll = await Poll.create({
    project: projectId,
    creator: req.user._id,
    question,
    options: options.map(opt => ({ text: opt, votes: [] })),
    expiresAt
  });

  return success(res, poll, 'Poll created successfully', 201);
});

exports.getPolls = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;
  await verifyMembership(projectId, req.user._id);

  const polls = await Poll.find({ project: projectId })
    .populate('creator', 'username avatar')
    .sort({ createdAt: -1 });

  return success(res, polls, 'Polls retrieved successfully');
});

exports.votePoll = asyncWrapper(async (req, res) => {
  const { projectId, pollId } = req.params;
  const { optionId } = req.body;
  await verifyMembership(projectId, req.user._id);

  const poll = await Poll.findById(pollId);
  if (!poll) throw new AppError('Poll not found', 404);
  if (!poll.isActive) throw new AppError('Poll is closed', 400);

  // Remove existing vote if any
  poll.options.forEach(opt => {
    opt.votes = opt.votes.filter(vId => vId.toString() !== req.user._id.toString());
  });

  // Add new vote
  const option = poll.options.id(optionId);
  if (!option) throw new AppError('Option not found', 404);
  option.votes.push(req.user._id);

  await poll.save();
  return success(res, poll, 'Vote recorded successfully');
});

// ─────────────────────────────────────────
// SUGGESTIONS
// ─────────────────────────────────────────

exports.createSuggestion = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;
  const { title, description } = req.body;
  await verifyMembership(projectId, req.user._id);

  const suggestion = await Suggestion.create({
    project: projectId,
    creator: req.user._id,
    title,
    description
  });

  return success(res, suggestion, 'Suggestion created successfully', 201);
});

exports.getSuggestions = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;
  await verifyMembership(projectId, req.user._id);

  const suggestions = await Suggestion.find({ project: projectId })
    .populate('creator', 'username avatar')
    .sort({ createdAt: -1 });

  return success(res, suggestions, 'Suggestions retrieved successfully');
});

exports.toggleSuggestionVote = asyncWrapper(async (req, res) => {
  const { projectId, suggestionId } = req.params;
  const { type } = req.body; // 'up' or 'down'
  await verifyMembership(projectId, req.user._id);

  const suggestion = await Suggestion.findById(suggestionId);
  if (!suggestion) throw new AppError('Suggestion not found', 404);

  const userIdStr = req.user._id.toString();

  if (type === 'up') {
    suggestion.downvotes = suggestion.downvotes.filter(id => id.toString() !== userIdStr);
    if (!suggestion.upvotes.some(id => id.toString() === userIdStr)) {
      suggestion.upvotes.push(req.user._id);
    } else {
      suggestion.upvotes = suggestion.upvotes.filter(id => id.toString() !== userIdStr);
    }
  } else if (type === 'down') {
    suggestion.upvotes = suggestion.upvotes.filter(id => id.toString() !== userIdStr);
    if (!suggestion.downvotes.some(id => id.toString() === userIdStr)) {
      suggestion.downvotes.push(req.user._id);
    } else {
      suggestion.downvotes = suggestion.downvotes.filter(id => id.toString() !== userIdStr);
    }
  }

  await suggestion.save();
  return success(res, suggestion, 'Vote updated successfully');
});

exports.updateSuggestionStatus = asyncWrapper(async (req, res) => {
  const { projectId, suggestionId } = req.params;
  const { status } = req.body;
  
  const project = await verifyMembership(projectId, req.user._id);
  const isOwner = project.owner.toString() === req.user._id.toString();
  if (!isOwner) throw new AppError('Only project owner can update status', 403);

  const suggestion = await Suggestion.findByIdAndUpdate(suggestionId, { status }, { new: true });
  return success(res, suggestion, 'Suggestion status updated');
});

// ─────────────────────────────────────────
// NOTES
// ─────────────────────────────────────────

exports.createNote = asyncWrapper(async (req, res) => {
  const { projectId, title, content, reminderDate } = req.body;
  
  if (projectId) {
    await verifyMembership(projectId, req.user._id);
  }

  const note = await Note.create({
    project: projectId || null,
    user: req.user._id,
    title,
    content,
    reminderDate
  });

  return success(res, note, 'Note created successfully', 201);
});

exports.getNotes = asyncWrapper(async (req, res) => {
  const { projectId } = req.query;
  
  const filter = { user: req.user._id };
  if (projectId) {
    await verifyMembership(projectId, req.user._id);
    filter.project = projectId;
  }

  const notes = await Note.find(filter).sort({ createdAt: -1 });
  return success(res, notes, 'Notes retrieved successfully');
});

exports.deleteNote = asyncWrapper(async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.noteId, user: req.user._id });
  if (!note) throw new AppError('Note not found or unauthorized', 404);
  return success(res, {}, 'Note deleted successfully');
});

// ─────────────────────────────────────────
// DECISIONS
// ─────────────────────────────────────────

exports.createDecision = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;
  const { title, description } = req.body;
  await verifyMembership(projectId, req.user._id);

  const decision = await Decision.create({
    project: projectId,
    decidedBy: req.user._id,
    title,
    description
  });

  return success(res, decision, 'Decision recorded successfully', 201);
});

exports.getDecisions = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;
  await verifyMembership(projectId, req.user._id);

  const decisions = await Decision.find({ project: projectId })
    .populate('decidedBy', 'username avatar')
    .sort({ dateDecided: -1 });

  return success(res, decisions, 'Decisions retrieved successfully');
});

// ─────────────────────────────────────────
// INSTRUCTIONS
// ─────────────────────────────────────────

exports.createInstruction = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;
  const { title, content, targetRole, priority } = req.body;
  await verifyMembership(projectId, req.user._id);

  const instruction = await Instruction.create({
    project: projectId,
    author: req.user._id,
    title,
    content,
    targetRole,
    priority
  });

  return success(res, instruction, 'Instruction created successfully', 201);
});

exports.getInstructions = asyncWrapper(async (req, res) => {
  const { projectId } = req.params;
  await verifyMembership(projectId, req.user._id);

  const instructions = await Instruction.find({ project: projectId })
    .populate('author', 'username avatar')
    .sort({ priority: -1, createdAt: -1 });

  return success(res, instructions, 'Instructions retrieved successfully');
});
