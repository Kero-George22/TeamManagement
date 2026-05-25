const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const requireAdmin = require('../middlewares/isAdmin.middleware');

router.use(requireAuth);
router.use(requireAdmin);

router.get('/stats', adminController.getPlatformStats);
router.get('/users', adminController.getUsers);
router.put('/users/:id/ban', adminController.toggleUserBan);
router.delete('/users/:id', adminController.deleteUser);
router.get('/projects', adminController.getProjects);
router.delete('/projects/:id', adminController.deleteProject);

module.exports = router;
