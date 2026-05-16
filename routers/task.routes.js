const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const multer = require('multer');
const path = require('path');

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/zip', 'application/json'];
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
  cb(new Error(`File type ${file.mimetype} is not allowed`));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ─────────────────────────────────────────
// Project tasks
// ─────────────────────────────────────────

// GET /tasks/dashboard/overview — dashboard tasks in one call
router.get('/dashboard/overview', requireAuth, taskController.getDashboardTasks);

// GET  /tasks/:projectId         — all tasks for a project
// GET  /tasks/:projectId/board   — board view grouped by status
// POST /tasks/:projectId/generate — AI generates tasks
router.get( '/:projectId',          requireAuth, taskController.getProjectTasks);
router.get( '/:projectId/board',    requireAuth, taskController.getBoardView);
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