const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// Create tasks - AI manager assigns tasks based on project
router.post('/:projectId/ai-generate', requireAuth, taskController.createTasksByAI);

// Get current user's tasks
router.get('/my', requireAuth, taskController.getMyTasks);

// Get all tasks for a project
router.get('/:projectId', requireAuth, taskController.getProjectTasks);

// Get single task details
router.get('/task/:taskId', requireAuth, taskController.getTaskById);

// Claim a task (assign to current user)
router.post('/:taskId/claim', requireAuth, taskController.claimTask);

// Submit work for review
router.post('/:taskId/submit', requireAuth, taskController.submitWork);

// Request AI manager review
router.post('/:taskId/request-review', requireAuth, taskController.requestAIReview);

// Get team performance analysis
router.get('/:projectId/performance', requireAuth, taskController.getTeamPerformance);

module.exports = router;
