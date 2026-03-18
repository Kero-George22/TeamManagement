const express = require('express');
const assessmentController = require('../controllers/assessment.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Get assessment questions for a skill area
router.get('/questions/:skillArea', assessmentController.getAssessmentQuestions);

// Start a new assessment
router.post('/start', assessmentController.startAssessment);

// Submit assessment answers
router.post('/submit', assessmentController.submitAssessment);

// Get user's assessment history
router.get('/history', assessmentController.getUserAssessments);

// Get specific assessment result
router.get('/result/:assessmentId', assessmentController.getAssessmentResult);

module.exports = router;
