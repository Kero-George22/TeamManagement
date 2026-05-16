const express = require('express');
const goalController = require('../controllers/goal.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', goalController.listGoals);
router.post('/', goalController.createGoal);
router.post('/import-local', goalController.importLocalGoals);
router.patch('/:id', goalController.updateGoal);
router.delete('/:id', goalController.deleteGoal);

module.exports = router;
