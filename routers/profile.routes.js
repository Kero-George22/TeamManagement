const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get( '/me',        requireAuth, profileController.getMyProfile);
router.put( '/me',        requireAuth, profileController.updateMyProfile);
router.get( '/:userId',   requireAuth, profileController.getUserProfile);

module.exports = router;