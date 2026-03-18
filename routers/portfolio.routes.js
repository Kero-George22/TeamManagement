const express = require('express');
const portfolioController = require('../controllers/portfolio.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

// Protected routes - require authentication
router.use(requireAuth);

// Get user's portfolio
router.get('/me', portfolioController.getPortfolio);

// Get portfolio statistics
router.get('/me/stats', portfolioController.getPortfolioStats);

// Export portfolio in different formats
router.get('/export/json', portfolioController.exportPortfolioJSON);
router.get('/export/markdown', portfolioController.exportPortfolioMarkdown);
router.get('/export/csv', portfolioController.exportPortfolioCSV);

// Public portfolio view (can be accessed without auth with link)
router.get('/public/:userId', portfolioController.getPublicPortfolio);

module.exports = router;
