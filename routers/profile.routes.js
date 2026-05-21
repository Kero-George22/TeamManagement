const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { uploadAvatar } = require('../middlewares/upload.middleware');

router.get( '/me',              requireAuth, profileController.getMyProfile);
router.put( '/me',              requireAuth, profileController.updateMyProfile);
router.post('/me/avatar',       requireAuth, uploadAvatar, profileController.uploadAvatar);
router.get( '/public/:userId',              profileController.getPublicProfile);
router.get( '/:userId',         requireAuth, profileController.getUserProfile);

module.exports = router;