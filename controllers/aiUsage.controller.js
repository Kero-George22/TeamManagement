const aiUsageService = require('../services/aiUsage.service');
const asyncWrapper = require('../utils/asyncWrapper');
const { success } = require('../utils/apiResponse');

const getUsage = asyncWrapper(async (req, res) => {
  const usage = await aiUsageService.getUsage(req.user._id);
  return success(res, usage, 'AI usage retrieved');
});

module.exports = {
  getUsage
};
