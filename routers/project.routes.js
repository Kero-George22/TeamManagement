const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const isAdmin = require('../middlewares/isAdmin.middleware');

// Create project (admin only)
router.post('/', requireAuth, isAdmin, projectController.createProject);

// Get all projects with search/filter (authenticated users)
router.get('/', requireAuth, projectController.getProjects);

// Get single project by ID (authenticated users)
router.get('/:id', requireAuth, projectController.getProjectById);

// Join project (authenticated users)
router.post('/:projectId/join', requireAuth, projectController.joinProject);

// Get project members
router.get('/:id/members', requireAuth, projectController.getProjectMembers);

// Update project (owner only)
router.put('/:id', requireAuth, isAdmin, projectController.updateProject);

// Delete project (owner only)
router.delete('/:id', requireAuth, isAdmin, projectController.deleteProject);

module.exports = router;
