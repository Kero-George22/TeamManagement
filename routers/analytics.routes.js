const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Get platform analytics (admin only)
router.get('/platform', analyticsController.getPlatformAnalytics);

// Get project analytics
router.get('/project/:projectId', analyticsController.getProjectAnalytics);

module.exports = router;
