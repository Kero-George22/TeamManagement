const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const isAdmin = require('../middlewares/isAdmin.middleware');

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Get platform analytics (admin only)
router.get('/platform', isAdmin, analyticsController.getPlatformAnalytics);

// Get project analytics
router.get('/project/:projectId', analyticsController.getProjectAnalytics);

module.exports = router;
