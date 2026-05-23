const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// ─────────────────────────────────────────
// Discovery
// ─────────────────────────────────────────
router.get('/', requireAuth, projectController.getProjects);
router.get('/explore', requireAuth, projectController.exploreProjects);

// ─────────────────────────────────────────
// Create
// ─────────────────────────────────────────
router.post('/', requireAuth, projectController.createProject);

// ─────────────────────────────────────────
// Private project — invite link
// ─────────────────────────────────────────
router.get( '/invite/:token',              requireAuth, projectController.getProjectByInviteToken);
router.post('/invite/:token/join',         requireAuth, projectController.joinViaInvite);

// ─────────────────────────────────────────
// Single project
// ─────────────────────────────────────────
router.get(   '/:id',         requireAuth, projectController.getProjectById);
router.put(   '/:id',         requireAuth, projectController.updateProject);
router.delete('/:id',         requireAuth, projectController.deleteProject);

// ─────────────────────────────────────────
// Members
// ─────────────────────────────────────────
router.get('/:id/members', requireAuth, projectController.getProjectMembers);
router.delete('/:id/members/:userId', requireAuth, projectController.removeMember);

// ─────────────────────────────────────────
// Join requests — public projects
// ─────────────────────────────────────────
router.post('/:projectId/join',                        requireAuth, projectController.requestToJoin);
router.get( '/:projectId/join-requests',               requireAuth, projectController.getJoinRequests);
router.patch('/:projectId/join-requests/:requestId',   requireAuth, projectController.handleJoinRequest);

// ─────────────────────────────────────────
// Like & Bookmark
// ─────────────────────────────────────────
router.post('/:id/like',      requireAuth, projectController.toggleLike);
router.post('/:id/bookmark',  requireAuth, projectController.toggleBookmark);

module.exports = router;