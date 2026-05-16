const submissionService = require('../services/submission.service');
const asyncWrapper = require('../utils/asyncWrapper');
const { success } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

const createSubmission = asyncWrapper(async (req, res) => {
  const submission = await submissionService.createSubmission(req.user._id, req.body);
  return success(res, submission, 'Submission created', 201);
});

const getUserSubmissions = asyncWrapper(async (req, res) => {
  const submissions = await submissionService.getUserSubmissions(req.user._id);
  return success(res, { submissions }, 'Submissions retrieved');
});

const getSubmissionDetails = asyncWrapper(async (req, res) => {
  const submission = await submissionService.getSubmissionDetails(
    req.params.submissionId,
    req.user._id,
    req.user.isAdmin
  );
  return success(res, submission, 'Submission retrieved');
});

const getSubmissionsForReview = asyncWrapper(async (req, res) => {
  const status = req.query.status || 'pending';
  const submissions = await submissionService.getSubmissionsForReview(status);
  return success(res, { submissions }, 'Review queue retrieved');
});

const getAIReview = asyncWrapper(async (req, res) => {
  const submission = await submissionService.runAIReview(req.params.submissionId);
  return success(res, submission, 'AI review completed');
});

const requestHumanReview = asyncWrapper(async (req, res) => {
  const submission = await submissionService.requestHumanReview(req.params.submissionId);
  return success(res, submission, 'Human review requested');
});

const submitHumanReview = asyncWrapper(async (req, res) => {
  const { score, feedback, decision } = req.body;
  if (!decision) throw new AppError('Decision is required (accept or reject)', 400);

  const submission = await submissionService.submitHumanReview(req.params.submissionId, {
    score,
    feedback,
    decision,
  });
  return success(res, submission, 'Human review submitted');
});

const approveSubmission = asyncWrapper(async (req, res) => {
  const submission = await submissionService.approveSubmission(req.params.submissionId);
  return success(res, submission, 'Submission approved');
});

const rejectSubmission = asyncWrapper(async (req, res) => {
  const submission = await submissionService.rejectSubmission(
    req.params.submissionId,
    req.body.feedback
  );
  return success(res, submission, 'Submission rejected');
});

module.exports = {
  createSubmission,
  getUserSubmissions,
  getSubmissionDetails,
  getSubmissionsForReview,
  getAIReview,
  requestHumanReview,
  submitHumanReview,
  approveSubmission,
  rejectSubmission,
};
