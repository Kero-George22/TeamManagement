const User = require('../models/user.model');
const AppError = require('../utils/AppError');

const PLAN_LIMITS = {
  free: 10,
  pro: 60,
  team: Infinity
};

/**
 * Ensures the user's credits are reset if a new month has started.
 * Mutates the user object but does not save.
 */
function ensureReset(user) {
  if (!user.aiUsage) {
    user.aiUsage = { credits: 0, totalUsed: 0, resetDate: new Date() };
  }

  if (!user.aiUsage.resetDate || user.aiUsage.resetDate < new Date()) {
    user.aiUsage.credits = 0;
    
    // Set next reset date to 30 days from now
    const nextReset = new Date();
    nextReset.setDate(nextReset.getDate() + 30);
    user.aiUsage.resetDate = nextReset;
  }
}

/**
 * Check if the user has enough credits
 */
function hasEnoughCredits(user, cost) {
  ensureReset(user);
  const limit = PLAN_LIMITS[user.plan || 'free'] || PLAN_LIMITS.free;
  return user.aiUsage.credits + cost <= limit;
}

/**
 * Consume credits atomically
 */
async function consumeCredits(userId, cost) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  ensureReset(user);
  
  const limit = PLAN_LIMITS[user.plan || 'free'] || PLAN_LIMITS.free;
  
  if (user.aiUsage.credits + cost > limit) {
    throw new AppError(`AI credit limit reached. Please upgrade to use more. (Limit: ${limit})`, 403);
  }

  user.aiUsage.credits += cost;
  user.aiUsage.totalUsed += cost;
  
  await user.save();
  return user.aiUsage;
}

/**
 * Get current usage stats
 */
async function getUsage(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  
  ensureReset(user);
  const limit = PLAN_LIMITS[user.plan || 'free'] || PLAN_LIMITS.free;
  
  return {
    used: user.aiUsage.credits,
    limit,
    resetsAt: user.aiUsage.resetDate,
    plan: user.plan || 'free'
  };
}

module.exports = {
  PLAN_LIMITS,
  hasEnoughCredits,
  consumeCredits,
  getUsage
};
