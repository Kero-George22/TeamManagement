const mongoose = require('mongoose');
const TimeEntry = require('../models/timeEntry.model');
const Task = require('../models/task.model');
const AppError = require('../utils/AppError');

function validateObjectId(id, label = 'ID') {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError(`Invalid ${label}`, 400);
}

async function startTracking(taskId, userId, description) {
  validateObjectId(taskId, 'task ID');

  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  // Check for existing running entry
  const running = await TimeEntry.findOne({ user: userId, status: 'running' });
  if (running)
    throw new AppError('You already have a running timer. Stop it first.', 400);

  const entry = await TimeEntry.create({
    task: taskId,
    user: userId,
    startTime: new Date(),
    status: 'running',
    description: description || '',
  });

  return entry;
}

async function stopTracking(entryId, userId) {
  validateObjectId(entryId, 'entry ID');

  const entry = await TimeEntry.findOne({ _id: entryId, user: userId });
  if (!entry) throw new AppError('Time entry not found', 404);
  if (entry.status === 'stopped')
    throw new AppError('Timer is already stopped', 400);

  const now = new Date();
  const totalElapsed = now.getTime() - entry.startTime.getTime();
  entry.duration = totalElapsed - entry.pausedDuration;
  entry.endTime = now;
  entry.status = 'stopped';
  await entry.save();

  return entry;
}

async function pauseTracking(entryId, userId) {
  validateObjectId(entryId, 'entry ID');

  const entry = await TimeEntry.findOne({ _id: entryId, user: userId });
  if (!entry) throw new AppError('Time entry not found', 404);
  if (entry.status !== 'running')
    throw new AppError('Timer is not running', 400);

  entry.pausedDuration += Date.now() - entry.startTime.getTime();
  entry.status = 'paused';
  await entry.save();

  return entry;
}

async function resumeTracking(entryId, userId) {
  validateObjectId(entryId, 'entry ID');

  const entry = await TimeEntry.findOne({ _id: entryId, user: userId });
  if (!entry) throw new AppError('Time entry not found', 404);
  if (entry.status !== 'paused')
    throw new AppError('Timer is not paused', 400);

  entry.startTime = new Date();
  entry.status = 'running';
  await entry.save();

  return entry;
}

async function getTaskTimeEntries(taskId, userId) {
  validateObjectId(taskId, 'task ID');

  const entries = await TimeEntry.find({ task: taskId, user: userId })
    .sort({ startTime: -1 })
    .lean();

  return entries;
}

async function getTotalTrackedTime(taskId, userId) {
  validateObjectId(taskId, 'task ID');

  const result = await TimeEntry.aggregate([
    { $match: { task: new mongoose.Types.ObjectId(String(taskId)), user: new mongoose.Types.ObjectId(String(userId)) } },
    { $group: { _id: null, totalMs: { $sum: '$duration' } } },
  ]);

  return { totalMs: result[0]?.totalMs || 0 };
}

async function getMyRunningEntry(userId) {
  const entry = await TimeEntry.findOne({ user: userId, status: { $in: ['running', 'paused'] } })
    .populate('task', 'title')
    .lean();

  return entry;
}

module.exports = {
  startTracking,
  stopTracking,
  pauseTracking,
  resumeTracking,
  getTaskTimeEntries,
  getTotalTrackedTime,
  getMyRunningEntry,
};
