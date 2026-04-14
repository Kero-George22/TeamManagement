const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─────────────────────────────────────────
// Project tasks
// ─────────────────────────────────────────

// GET  /tasks/:projectId         — all tasks for a project
// POST /tasks/:projectId/generate — AI generates tasks
router.get( '/:projectId',          requireAuth, taskController.getProjectTasks);
router.post('/:projectId/generate', requireAuth, taskController.createTasksByAI);
router.post('/:projectId',          requireAuth, taskController.createTask);

// ─────────────────────────────────────────
// Single task
// NOTE: /task/:taskId prefix avoids conflict with /:projectId above
// ─────────────────────────────────────────

// GET   /tasks/task/:taskId        — get task details
// PATCH /tasks/task/:taskId/status — update status (member or owner)
router.get(  '/task/:taskId',         requireAuth, taskController.getTaskById);
router.patch('/task/:taskId/status',  requireAuth, taskController.updateTaskStatus);
router.put(  '/task/:taskId',         requireAuth, taskController.updateTask);
router.delete('/task/:taskId',        requireAuth, taskController.deleteTask);

// Upload attachment
router.post('/task/:taskId/attachment', requireAuth, upload.single('file'), taskController.uploadAttachment);

// Comments
router.get( '/task/:taskId/comments', requireAuth, taskController.getComments);
router.post('/task/:taskId/comments', requireAuth, taskController.addComment);

// Subtasks
router.get('/task/:taskId/subtasks',  requireAuth, taskController.getSubtasks);

module.exports = router;