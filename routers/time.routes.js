const express = require('express');
const router = express.Router();
const timeController = require('../controllers/time.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.use(requireAuth);

// GET  /time/me/running   — get my currently running/paused timer
router.get('/me/running', timeController.getMyRunningEntry);

// POST /time/task/:taskId/start  — start timer for a task
router.post('/task/:taskId/start', timeController.startTracking);

// POST /time/:entryId/stop       — stop a running timer
router.post('/:entryId/stop', timeController.stopTracking);

// POST /time/:entryId/pause      — pause a running timer
router.post('/:entryId/pause', timeController.pauseTracking);

// POST /time/:entryId/resume     — resume a paused timer
router.post('/:entryId/resume', timeController.resumeTracking);

// GET  /time/task/:taskId/entries — all time entries for a task
router.get('/task/:taskId/entries', timeController.getTaskTimeEntries);

// GET  /time/task/:taskId/total   — total tracked time for a task
router.get('/task/:taskId/total', timeController.getTotalTrackedTime);

module.exports = router;
