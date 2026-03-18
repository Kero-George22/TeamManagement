const express = require('express');
const submissionController = require('../controllers/submission.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const isAdmin = require('../middlewares/isAdmin.middleware');

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// User routes
router.post('/', submissionController.createSubmission);
router.get('/user/submissions', submissionController.getUserSubmissions);
router.get('/:submissionId', submissionController.getSubmissionDetails);

// Admin routes
router.get('/admin/review', isAdmin, submissionController.getSubmissionsForReview);
router.post('/:submissionId/ai-review', isAdmin, submissionController.getAIReview);
router.post('/:submissionId/request-human-review', isAdmin, submissionController.requestHumanReview);
router.post('/:submissionId/human-review', isAdmin, submissionController.submitHumanReview);
router.post('/:submissionId/approve', isAdmin, submissionController.approveSubmission);
router.post('/:submissionId/reject', isAdmin, submissionController.rejectSubmission);

module.exports = router;
