const User = require('../models/user.model');
const aiUsageService = require('../services/aiUsage.service');
const AppError = require('../utils/AppError');

/**
 * Express middleware to limit AI usage based on credits.
 * If the user has enough credits, it calls next(), and the controller should call `aiUsageService.consumeCredits` upon success.
 * Or we can automatically deduct it after the response is sent successfully.
 * To be safe with failures, we'll check first, and the controller is responsible for deducting.
 */
function aiLimiter(cost) {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) throw new AppError('User not found', 404);

      if (!aiUsageService.hasEnoughCredits(user, cost)) {
        const limit = aiUsageService.PLAN_LIMITS[user.plan || 'free'] || aiUsageService.PLAN_LIMITS.free;
        throw new AppError(`AI credit limit reached. Please upgrade to use more. (Limit: ${limit})`, 403);
      }

      // Attach the cost to req so the controller can consume it easily
      req.aiCost = cost;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = aiLimiter;
