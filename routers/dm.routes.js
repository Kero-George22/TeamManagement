const express = require('express');
const router = express.Router();
const dmController = require('../controllers/dm.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.use(requireAuth);

router.post('/', dmController.sendMessage);
router.get('/conversations', dmController.getConversations);
router.get('/search', dmController.searchUsers);
router.get('/:userId', dmController.getMessages);

module.exports = router;