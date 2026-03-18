const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth.middleware');
const { getMessages, sendMessage, getAIStatus, getOfficeOverview } = require('../controllers/office.controller');

router.use(requireAuth);

router.get('/:projectId/messages', getMessages);
router.post('/:projectId/messages', sendMessage);
router.get('/:projectId/overview', getOfficeOverview);
router.get('/:projectId/status', getAIStatus);

module.exports = router;
