const express = require('express');
const portfolioController = require('../controllers/portfolio.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public portfolio (no auth)
router.get('/public/:userId', portfolioController.getPublicPortfolio);

// Protected routes
router.use(requireAuth);

router.get('/me', portfolioController.getPortfolio);

// Get portfolio statistics
router.get('/me/stats', portfolioController.getPortfolioStats);

// Export portfolio in different formats
router.get('/export/json', portfolioController.exportPortfolioJSON);
router.get('/export/markdown', portfolioController.exportPortfolioMarkdown);
router.get('/export/csv', portfolioController.exportPortfolioCSV);

module.exports = router;
