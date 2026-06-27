const express = require('express');
const router = express.Router();
const teamFeatureController = require('../controllers/teamFeature.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.use(requireAuth);

// Polls
router.post('/:projectId/polls', teamFeatureController.createPoll);
router.get('/:projectId/polls', teamFeatureController.getPolls);
router.post('/:projectId/polls/:pollId/vote', teamFeatureController.votePoll);
router.patch('/:projectId/polls/:pollId/close', teamFeatureController.closePoll);
router.delete('/:projectId/polls/:pollId', teamFeatureController.deletePoll);

// Suggestions
router.post('/:projectId/suggestions', teamFeatureController.createSuggestion);
router.get('/:projectId/suggestions', teamFeatureController.getSuggestions);
router.patch('/:projectId/suggestions/:suggestionId/vote', teamFeatureController.toggleSuggestionVote);
router.patch('/:projectId/suggestions/:suggestionId/status', teamFeatureController.updateSuggestionStatus);

// Decisions
router.post('/:projectId/decisions', teamFeatureController.createDecision);
router.get('/:projectId/decisions', teamFeatureController.getDecisions);

// Instructions
router.post('/:projectId/instructions', teamFeatureController.createInstruction);
router.get('/:projectId/instructions', teamFeatureController.getInstructions);

// Notes (can be global or project specific)
router.post('/notes', teamFeatureController.createNote);
router.get('/notes', teamFeatureController.getNotes);
router.delete('/notes/:noteId', teamFeatureController.deleteNote);

module.exports = router;
