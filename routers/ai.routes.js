const express = require('express');
const router = express.Router();
const aiUsageController = require('../controllers/aiUsage.controller');
// We will add the other AI controllers here later (e.g. aiChat, etc.)
const { requireAuth } = require('../middlewares/auth.middleware');

const aiChatController = require('../controllers/aiChat.controller');
const aiLimiter = require('../middlewares/aiLimiter.middleware');

router.get('/usage', requireAuth, aiUsageController.getUsage);
router.post('/chat', requireAuth, aiLimiter(1), aiChatController.chat);

module.exports = router;
