const timeService = require('../services/time.service');
const asyncWrapper = require('../utils/asyncWrapper');
const { success } = require('../utils/apiResponse');

const startTracking = asyncWrapper(async (req, res) => {
  const { taskId } = req.params;
  const { description } = req.body;
  const entry = await timeService.startTracking(taskId, req.user._id, description, req.user.isAdmin);
  return success(res, entry, 'Timer started', 201);
});

const stopTracking = asyncWrapper(async (req, res) => {
  const { entryId } = req.params;
  const entry = await timeService.stopTracking(entryId, req.user._id);
  return success(res, entry, 'Timer stopped');
});

const pauseTracking = asyncWrapper(async (req, res) => {
  const { entryId } = req.params;
  const entry = await timeService.pauseTracking(entryId, req.user._id);
  return success(res, entry, 'Timer paused');
});

const resumeTracking = asyncWrapper(async (req, res) => {
  const { entryId } = req.params;
  const entry = await timeService.resumeTracking(entryId, req.user._id);
  return success(res, entry, 'Timer resumed');
});

const getTaskTimeEntries = asyncWrapper(async (req, res) => {
  const { taskId } = req.params;
  const entries = await timeService.getTaskTimeEntries(taskId, req.user._id, req.user.isAdmin);
  return success(res, entries, 'Time entries retrieved');
});

const getTotalTrackedTime = asyncWrapper(async (req, res) => {
  const { taskId } = req.params;
  const result = await timeService.getTotalTrackedTime(taskId, req.user._id, req.user.isAdmin);
  return success(res, result, 'Total tracked time retrieved');
});

const getMyRunningEntry = asyncWrapper(async (req, res) => {
  const entry = await timeService.getMyRunningEntry(req.user._id);
  return success(res, entry || null, entry ? 'Running timer found' : 'No active timer');
});

module.exports = {
  startTracking,
  stopTracking,
  pauseTracking,
  resumeTracking,
  getTaskTimeEntries,
  getTotalTrackedTime,
  getMyRunningEntry,
};
