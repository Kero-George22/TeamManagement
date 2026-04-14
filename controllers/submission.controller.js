const Submission = require('../models/submission.model');
const Task = require('../models/task.model');
const User = require('../models/user.model');
const asyncWrapper = require('../utils/asyncWrapper');
const { success, error } = require('../utils/apiResponse');

/**
 * Create a new submission
 */
const createSubmission = asyncWrapper(async (req, res) => {
    const userId = req.user._id;
    const { taskId, description, repositoryUrl, demoUrl } = req.body;

    if (!taskId || !description) {
        return error(res, 'Task ID and description required', 400);
    }

    const task = await Task.findById(taskId);
    if (!task) {
        return error(res, 'Task not found', 404);
    }

    const submission = new Submission({
        task: taskId,
        user: userId,
        project: task.project,
        content: description,
        repoLink: repositoryUrl,
        submissionLink: demoUrl,
        reviewStatus: 'ai-review'
    });

    await submission.save();

    return success(res, { submissionId: submission._id }, 'Submission created successfully', 201);
});

/**
 * Get submissions for review (admin/reviewer)
 */
const getSubmissionsForReview = asyncWrapper(async (req, res) => {
    const { status, reviewStatus, page = 1, limit = 20 } = req.query;

    if (!req.user.isAdmin) {
        return error(res, 'Unauthorized', 403);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const query = {};
    if (status) query.status = status;
    if (reviewStatus) query.reviewStatus = reviewStatus;

    const [submissions, total] = await Promise.all([
      Submission.find(query)
        .populate('user', 'username email')
        .populate('task', 'title description')
        .populate('project', 'title')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Submission.countDocuments(query),
    ]);

    return success(res, {
      submissions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }, 'Submissions retrieved');
});

/**
 * Get AI review for a submission
 */
const getAIReview = asyncWrapper(async (req, res) => {
    const { submissionId } = req.params;

    const submission = await Submission.findById(submissionId);
    if (!submission) {
        return error(res, 'Submission not found', 404);
    }

    // Simulate AI review (in production, use real AI service)
    const aiReview = {
        score: Math.floor(Math.random() * 50) + 50, // 50-100
        feedback: `Good work on this submission. Code is well-structured and follows best practices. Consider improving error handling and adding more unit tests.`,
        issues: [
            { severity: 'warning', message: 'Missing error handling in async function' },
            { severity: 'info', message: 'Consider adding unit tests' }
        ],
        suggestsHumanReview: false
    };

    submission.aiFeedback = aiReview.feedback;
    submission.score = aiReview.score;
    submission.reviewStatus = aiReview.suggestsHumanReview ? 'pending-human-review' : 'completed';
    submission.status = aiReview.score >= 60 ? 'accepted' : 'rejected';

    await submission.save();

    return success(res, aiReview, 'AI review completed');
});

/**
 * Request human review for a submission
 */
const requestHumanReview = asyncWrapper(async (req, res) => {
    const { submissionId, reason } = req.body;

    if (!submissionId) {
        return error(res, 'Submission ID required', 400);
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
        return error(res, 'Submission not found', 404);
    }

    submission.humanReviewRequired = true;
    submission.reviewStatus = 'pending-human-review';
    await submission.save();

    return success(res, { submissionId }, 'Human review requested');
});

/**
 * Submit human review for a submission
 */
const submitHumanReview = asyncWrapper(async (req, res) => {
    const reviewerId = req.user._id;
    const { submissionId, feedback, score, approved } = req.body;

    if (!submissionId || !feedback || score === undefined || approved === undefined) {
        return error(res, 'Submission ID, feedback, score, and approved status required', 400);
    }

    if (!req.user.isAdmin) {
        return error(res, 'Unauthorized - only admins can review', 403);
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
        return error(res, 'Submission not found', 404);
    }

    submission.humanReviewer = reviewerId;
    submission.humanFeedback = feedback;
    submission.score = score;
    submission.status = approved ? 'accepted' : 'rejected';
    submission.reviewStatus = 'human-reviewed';
    submission.reviewedAt = new Date();

    await submission.save();

    // Update completion stats if accepted
    if (approved) {
        await User.findByIdAndUpdate(submission.user, {
            $inc: {
                completedTasks: 1
            }
        });
    }

    return success(res, { submissionId, status: submission.status }, 'Human review submitted');
});

/**
 * Get user's submissions
 */
const getUserSubmissions = asyncWrapper(async (req, res) => {
    const userId = req.user._id;
    const { status, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const query = { user: userId };
    if (status) query.status = status;

    const [submissions, total] = await Promise.all([
      Submission.find(query)
        .populate('task', 'title description')
        .populate('project', 'title')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Submission.countDocuments(query),
    ]);

    return success(res, {
      submissions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }, 'User submissions retrieved');
});

/**
 * Get submission details
 */
const getSubmissionDetails = asyncWrapper(async (req, res) => {
    const { submissionId } = req.params;

    const submission = await Submission.findById(submissionId)
        .populate('user', 'username email')
        .populate('task', 'title description')
        .populate('project', 'title')
        .populate('humanReviewer', 'username');

    if (!submission) {
        return error(res, 'Submission not found', 404);
    }

    // Check authorization
    if (submission.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
        return error(res, 'Unauthorized', 403);
    }

    return success(res, submission, 'Submission details retrieved');
});

/**
 * Approve submission (AI review)
 */
const approveSubmission = asyncWrapper(async (req, res) => {
    const { submissionId } = req.params;

    if (!req.user.isAdmin) {
        return error(res, 'Unauthorized', 403);
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
        return error(res, 'Submission not found', 404);
    }

    submission.status = 'accepted';
    submission.reviewStatus = 'completed';
    submission.reviewedAt = new Date();

    await submission.save();

    // Update completion stats
    await User.findByIdAndUpdate(submission.user, {
        $inc: {
            completedTasks: 1
        }
    });

    return success(res, {}, 'Submission approved');
});

/**
 * Reject submission
 */
const rejectSubmission = asyncWrapper(async (req, res) => {
    const { submissionId } = req.params;
    const { reason } = req.body;

    if (!req.user.isAdmin) {
        return error(res, 'Unauthorized', 403);
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
        return error(res, 'Submission not found', 404);
    }

    submission.status = 'rejected';
    submission.humanFeedback = reason || submission.aiFeedback;
    submission.reviewStatus = 'completed';
    submission.reviewedAt = new Date();

    await submission.save();

    return success(res, {}, 'Submission rejected');
});

module.exports = {
    createSubmission,
    getSubmissionsForReview,
    getAIReview,
    requestHumanReview,
    submitHumanReview,
    getUserSubmissions,
    getSubmissionDetails,
    approveSubmission,
    rejectSubmission
};
