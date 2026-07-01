const mongoose = require('mongoose');
const Submission = require('../models/submission.model');
const Task = require('../models/task.model');
const Project = require('../models/project.model');
const User = require('../models/user.model');
const AppError = require('../utils/AppError');

let reviewWorkByAI;
try {
  reviewWorkByAI = require('./ai.manager').reviewWorkByAI;
} catch {
  reviewWorkByAI = null;
}

function validateObjectId(id, label = 'ID') {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError(`Invalid ${label}`, 400);
}

async function assertProjectAccess(projectId, userId, isAdmin) {
  const project = await Project.findById(projectId).lean();
  if (!project) throw new AppError('Project not found', 404);

  if (isAdmin) return project;

  const uid = String(userId);
  const isOwner = String(project.owner) === uid;
  const isMember = (project.members || []).some((m) => String(m.userId) === uid);
  if (!isOwner && !isMember) throw new AppError('Unauthorized', 403);

  return project;
}

async function createSubmission(userId, body) {
  const { taskId, submittedWork, repoLink, submissionLink, submissionType, attachment } = body;
  if (!taskId) throw new AppError('Task ID is required', 400);
  validateObjectId(taskId, 'task ID');

  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  const assignedId = task.assignedTo ? String(task.assignedTo) : null;
  if (assignedId && assignedId !== String(userId))
    throw new AppError('Only the assigned member can submit work for this task', 403);

  const type = submissionType || 'text';
  if (type === 'text' && !submittedWork?.trim() && !attachment)
    throw new AppError('Submission content is required', 400);
  if (type === 'link' && !repoLink?.trim() && !submissionLink?.trim())
    throw new AppError('A repository or demo link is required', 400);

  task.submissionType = type;
  if (submittedWork) task.submittedWork = submittedWork;
  if (repoLink) task.repoLink = repoLink;
  if (attachment) {
    if (!task.attachments) task.attachments = [];
    task.attachments.push({ url: attachment, name: 'Submission Attachment', type: 'unknown', size: 0 });
  }
  task.status = 'Review';
  task.updatedAt = new Date();
  await task.save();

  const existing = await Submission.findOne({ task: taskId, user: userId, status: { $in: ['pending', 'under_review'] } });
  if (existing) {
    existing.submissionType = type;
    existing.submittedWork = submittedWork || existing.submittedWork;
    existing.repoLink = repoLink || existing.repoLink;
    existing.submissionLink = submissionLink || existing.submissionLink;
    existing.attachment = attachment || existing.attachment;
    existing.status = 'pending';
    await existing.save();
    return existing.populate([
      { path: 'task', select: 'title status' },
      { path: 'project', select: 'title' },
    ]);
  }

  const submission = await Submission.create({
    user: userId,
    task: taskId,
    project: task.project,
    submissionType: type,
    submittedWork: submittedWork || '',
    repoLink: repoLink || task.repoLink || '',
    submissionLink: submissionLink || '',
    attachment: attachment || (task.attachments && task.attachments.length > 0 ? task.attachments[task.attachments.length - 1].url : ''),
    status: 'pending',
  });

  return submission.populate([
    { path: 'task', select: 'title status' },
    { path: 'project', select: 'title' },
  ]);
}

async function getUserSubmissions(userId) {
  return Submission.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate('task', 'title status')
    .populate('project', 'title')
    .lean();
}

async function getSubmissionDetails(submissionId, userId, isAdmin) {
  validateObjectId(submissionId, 'submission ID');

  const submission = await Submission.findById(submissionId)
    .populate('task', 'title description status assignedRole')
    .populate('project', 'title owner')
    .populate('user', 'username email avatar');

  if (!submission) throw new AppError('Submission not found', 404);

  const isOwner = String(submission.user._id) === String(userId);
  const projectOwner = String(submission.project?.owner) === String(userId);

  if (!isAdmin && !isOwner && !projectOwner)
    throw new AppError('Unauthorized', 403);

  return submission;
}

async function getSubmissionsForReview(status = 'pending') {
  const filter = status === 'all' ? {} : { status };
  return Submission.find(filter)
    .sort({ createdAt: -1 })
    .populate('user', 'username email avatar')
    .populate('task', 'title description submissionType')
    .populate('project', 'title')
    .lean();
}

async function runAIReview(submissionId) {
  validateObjectId(submissionId, 'submission ID');

  const submission = await Submission.findById(submissionId).populate('task');
  if (!submission) throw new AppError('Submission not found', 404);
  if (!reviewWorkByAI) throw new AppError('AI review is not configured', 503);

  const review = await reviewWorkByAI({
    title: submission.task.title,
    description: submission.task.description,
    submissionType: submission.submissionType,
    submittedWork: submission.submittedWork,
    repoLink: submission.repoLink || submission.submissionLink,
  });

  submission.score = review.rating;
  submission.aiReview = review.review;
  submission.aiFeedback = review.feedback;
  submission.codeQualityScore = review.codeQualityScore;
  submission.status = 'under_review';
  submission.needsHumanReview = review.rating < 70;
  await submission.save();

  if (submission.task) {
    submission.task.aiRating = review.rating;
    submission.task.aiReview = review.review;
    submission.task.feedback = review.feedback;
    await submission.task.save();
  }

  return submission;
}

async function approveSubmission(submissionId, adminId) {
  validateObjectId(submissionId, 'submission ID');

  const submission = await Submission.findById(submissionId);
  if (!submission) throw new AppError('Submission not found', 404);

  submission.status = 'accepted';
  submission.needsHumanReview = false;
  await submission.save();

  await Task.findByIdAndUpdate(submission.task, {
    status: 'Approved',
    aiRating: submission.score,
    feedback: submission.humanFeedback || submission.aiFeedback,
  });

  await User.findByIdAndUpdate(submission.user, { $inc: { completedTasks: 1 } });

  return submission;
}

async function rejectSubmission(submissionId, feedback) {
  validateObjectId(submissionId, 'submission ID');

  const submission = await Submission.findById(submissionId);
  if (!submission) throw new AppError('Submission not found', 404);

  submission.status = 'rejected';
  submission.humanFeedback = feedback || submission.humanFeedback || 'Submission rejected';
  await submission.save();

  await Task.findByIdAndUpdate(submission.task, {
    status: 'In-Progress',
    feedback: submission.humanFeedback,
  });

  return submission;
}

async function requestHumanReview(submissionId) {
  validateObjectId(submissionId, 'submission ID');

  const submission = await Submission.findByIdAndUpdate(
    submissionId,
    { $set: { needsHumanReview: true, status: 'under_review' } },
    { new: true }
  );
  if (!submission) throw new AppError('Submission not found', 404);
  return submission;
}

async function submitHumanReview(submissionId, { score, feedback, decision }) {
  validateObjectId(submissionId, 'submission ID');

  const submission = await Submission.findById(submissionId);
  if (!submission) throw new AppError('Submission not found', 404);

  if (score != null) submission.score = score;
  submission.humanFeedback = feedback || submission.humanFeedback;

  if (decision === 'accept') {
    submission.status = 'accepted';
    await submission.save();
    await Task.findByIdAndUpdate(submission.task, { status: 'Approved', feedback: submission.humanFeedback });
    await User.findByIdAndUpdate(submission.user, { $inc: { completedTasks: 1 } });
  } else if (decision === 'reject') {
    submission.status = 'rejected';
    await submission.save();
    await Task.findByIdAndUpdate(submission.task, { status: 'In-Progress', feedback: submission.humanFeedback });
  } else {
    submission.status = 'under_review';
    await submission.save();
  }

  return submission;
}

module.exports = {
  createSubmission,
  getUserSubmissions,
  getSubmissionDetails,
  getSubmissionsForReview,
  runAIReview,
  approveSubmission,
  rejectSubmission,
  requestHumanReview,
  submitHumanReview,
};
