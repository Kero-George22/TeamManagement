const portfolioService = require('../services/portfolio.service');
const asyncWrapper = require('../utils/asyncWrapper');
const { success, error } = require('../utils/apiResponse');

/**
 * Get user's portfolio
 */
const getPortfolio = asyncWrapper(async (req, res) => {
    const userId = req.user._id;
    
    const portfolio = await portfolioService.getUserPortfolio(userId);
    
    return success(res, portfolio, 'Portfolio retrieved successfully');
});

/**
 * Get portfolio statistics
 */
const getPortfolioStats = asyncWrapper(async (req, res) => {
    const userId = req.user._id;
    
    const stats = await portfolioService.getPortfolioStats(userId);
    
    return success(res, stats, 'Portfolio statistics retrieved');
});

/**
 * Export portfolio as JSON
 */
const exportPortfolioJSON = asyncWrapper(async (req, res) => {
    const userId = req.user._id;
    
    const data = await portfolioService.exportPortfolioJSON(userId);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="portfolio-${userId}.json"`);
    
    return res.json(data);
});

/**
 * Export portfolio as Markdown
 */
const exportPortfolioMarkdown = asyncWrapper(async (req, res) => {
    const userId = req.user._id;
    const user = req.user;
    
    const markdown = await portfolioService.exportPortfolioMarkdown(userId);
    
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${user.username}-portfolio.md"`);
    
    return res.send(markdown);
});

/**
 * Export portfolio as CSV
 */
const exportPortfolioCSV = asyncWrapper(async (req, res) => {
    const userId = req.user._id;
    const user = req.user;
    
    const csv = await portfolioService.exportPortfolioCSV(userId);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${user.username}-portfolio.csv"`);
    
    return res.send(csv);
});

/**
 * Get public portfolio view (for sharing)
 */
const getPublicPortfolio = asyncWrapper(async (req, res) => {
    const { userId } = req.params;
    
    const portfolio = await portfolioService.getUserPortfolio(userId);
    
    // Hide email in public view
    const publicPortfolio = {
        ...portfolio,
        profile: {
            ...portfolio.profile,
            email: undefined
        }
    };
    
    return success(res, publicPortfolio, 'Public portfolio retrieved');
});

module.exports = {
    getPortfolio,
    getPortfolioStats,
    exportPortfolioJSON,
    exportPortfolioMarkdown,
    exportPortfolioCSV,
    getPublicPortfolio
};
