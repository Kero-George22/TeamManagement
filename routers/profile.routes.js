const express = require('express');
const profileController = require('../controllers/profile.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Get my profile
router.get('/me', profileController.getMyProfile);

// Update my profile
router.put('/me', profileController.updateMyProfile);

// Get my statistics
router.get('/me/stats', profileController.getMyStatistics);

// Get leaderboard
router.get('/leaderboard', profileController.getLeaderboard);

// Get user rank
router.get('/:userId/rank', profileController.getUserRank);

// Get user statistics
router.get('/:userId/stats', profileController.getUserStatistics);

// Get user profile by ID
router.get('/:userId', profileController.getUserProfile);

module.exports = router;
