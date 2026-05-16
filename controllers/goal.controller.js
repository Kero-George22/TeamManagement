const goalService = require('../services/goal.service');
const asyncWrapper = require('../utils/asyncWrapper');
const { success } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

const listGoals = asyncWrapper(async (req, res) => {
  const goals = await goalService.listGoals(req.user._id);
  return success(res, { goals }, 'Goals retrieved');
});

const createGoal = asyncWrapper(async (req, res) => {
  const goal = await goalService.createGoal(req.user._id, req.body);
  return success(res, goal, 'Goal created', 201);
});

const updateGoal = asyncWrapper(async (req, res) => {
  const goal = await goalService.updateGoal(req.user._id, req.params.id, req.body);
  return success(res, goal, 'Goal updated');
});

const deleteGoal = asyncWrapper(async (req, res) => {
  await goalService.deleteGoal(req.user._id, req.params.id);
  return success(res, {}, 'Goal deleted');
});

const importLocalGoals = asyncWrapper(async (req, res) => {
  const { goals } = req.body;
  if (!Array.isArray(goals)) throw new AppError('goals array is required', 400);

  const result = await goalService.importLocalGoals(req.user._id, goals);
  return success(res, result, 'Goals imported');
});

module.exports = {
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  importLocalGoals,
};
