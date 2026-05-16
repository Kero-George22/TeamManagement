const mongoose = require('mongoose');
const Goal = require('../models/goal.model');
const { GOAL_COLORS } = require('../models/goal.model');
const AppError = require('../utils/AppError');

function validateObjectId(id, label = 'ID') {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError(`Invalid ${label}`, 400);
}

function normalizeColor(color) {
  if (color && GOAL_COLORS.includes(color)) return color;
  return GOAL_COLORS[Math.floor(Math.random() * GOAL_COLORS.length)];
}

async function listGoals(userId) {
  return Goal.find({ user: userId })
    .sort({ completed: 1, createdAt: -1 })
    .populate('project', 'title')
    .populate('task', 'title status')
    .lean();
}

async function createGoal(userId, data = {}) {
  const title = String(data.title || '').trim();
  if (!title) throw new AppError('Goal title is required', 400);

  const goal = await Goal.create({
    user: userId,
    title,
    description: String(data.description || '').trim(),
    completed: !!data.completed,
    color: normalizeColor(data.color),
    progress: Math.min(100, Math.max(0, parseInt(data.progress, 10) || 0)),
    project: data.projectId && mongoose.Types.ObjectId.isValid(data.projectId) ? data.projectId : null,
    task: data.taskId && mongoose.Types.ObjectId.isValid(data.taskId) ? data.taskId : null,
    targetDate: data.targetDate ? new Date(data.targetDate) : null,
  });

  return goal;
}

async function updateGoal(userId, goalId, updates = {}) {
  validateObjectId(goalId, 'goal ID');

  const goal = await Goal.findOne({ _id: goalId, user: userId });
  if (!goal) throw new AppError('Goal not found', 404);

  if (updates.title !== undefined) {
    const title = String(updates.title).trim();
    if (!title) throw new AppError('Goal title cannot be empty', 400);
    goal.title = title;
  }
  if (updates.description !== undefined) goal.description = String(updates.description).trim();
  if (updates.completed !== undefined) {
    goal.completed = !!updates.completed;
    if (goal.completed && goal.progress < 100) goal.progress = 100;
    if (!goal.completed && goal.progress === 100) goal.progress = 50;
  }
  if (updates.color !== undefined) goal.color = normalizeColor(updates.color);
  if (updates.progress !== undefined) {
    goal.progress = Math.min(100, Math.max(0, parseInt(updates.progress, 10) || 0));
  }
  if (updates.projectId !== undefined) {
    goal.project = updates.projectId && mongoose.Types.ObjectId.isValid(updates.projectId)
      ? updates.projectId
      : null;
  }
  if (updates.taskId !== undefined) {
    goal.task = updates.taskId && mongoose.Types.ObjectId.isValid(updates.taskId)
      ? updates.taskId
      : null;
  }
  if (updates.targetDate !== undefined) {
    goal.targetDate = updates.targetDate ? new Date(updates.targetDate) : null;
  }

  await goal.save();
  return goal.populate([
    { path: 'project', select: 'title' },
    { path: 'task', select: 'title status' },
  ]);
}

async function deleteGoal(userId, goalId) {
  validateObjectId(goalId, 'goal ID');

  const goal = await Goal.findOneAndDelete({ _id: goalId, user: userId });
  if (!goal) throw new AppError('Goal not found', 404);
  return goal;
}

async function importLocalGoals(userId, localGoals = []) {
  if (!Array.isArray(localGoals) || localGoals.length === 0)
    return { imported: 0, goals: await listGoals(userId) };

  const existing = await Goal.countDocuments({ user: userId });
  if (existing > 0) {
    return { imported: 0, goals: await listGoals(userId), skipped: true };
  }

  const docs = localGoals
    .filter((g) => g && (g.title || g.description))
    .map((g) => ({
      user: userId,
      title: String(g.title || 'Untitled goal').trim(),
      description: String(g.description || '').trim(),
      completed: !!g.completed,
      color: normalizeColor(g.color),
      progress: g.completed ? 100 : Math.min(100, Math.max(0, parseInt(g.progress, 10) || 30)),
    }));

  if (docs.length) await Goal.insertMany(docs);

  return { imported: docs.length, goals: await listGoals(userId) };
}

async function completeGoalsForTask(taskId) {
  if (!mongoose.Types.ObjectId.isValid(taskId)) return;
  await Goal.updateMany(
    { task: taskId, completed: false },
    { $set: { completed: true, progress: 100 } }
  );
}

module.exports = {
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  importLocalGoals,
  completeGoalsForTask,
};
