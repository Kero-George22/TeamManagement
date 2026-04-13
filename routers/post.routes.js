const express = require('express');
const { requireAuth } = require('../middlewares/auth.middleware');
const postController = require('../controllers/post.controller');

const router = express.Router();

router.use(requireAuth); // Secure feed

// Posts endpoints
router.post('/', postController.createPost);
router.get('/', postController.getFeed);
router.post('/:postId/upvote', postController.toggleUpvotePost);

// Comments endpoints
router.post('/:postId/comments', postController.addComment);
router.get('/:postId/comments', postController.getPostComments);

module.exports = router;
