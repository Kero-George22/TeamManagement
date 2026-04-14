const Post = require('../models/post.model');
const Comment = require('../models/comment.model');
const AppError = require('../utils/AppError');
const asyncWrapper = require('../utils/asyncWrapper');

const FEED_SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  top: { upvoteCount: -1, createdAt: -1 },
};

// ======================= POSTS =======================

exports.createPost = asyncWrapper(async (req, res, next) => {
  const { content, tags, linkedProject, linkedTask } = req.body;
  const author = req.user._id;

  const post = await Post.create({
    content,
    tags: tags || ['DISCUSSION'],
    linkedProject,
    linkedTask,
    author
  });

  res.status(201).json({
    status: 'success',
    data: { post }
  });
});

exports.getFeed = asyncWrapper(async (req, res, next) => {
  const { sort = 'newest', tag, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const sortConfig = FEED_SORTS[sort] || FEED_SORTS.newest;
  const filter = tag ? { tags: tag } : {};

  // Find posts, populating only essential fields for performance
  const [posts, total] = await Promise.all([
    Post.find(filter)
    .sort(sortConfig)
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .populate({ path: 'author', select: 'name email profilePic status' })
    .populate({ path: 'linkedProject', select: 'name color' })
    .populate({ path: 'linkedTask', select: 'name priority status' })
    .lean(), // Faster reads via Lean Mongoose objects when virtuals not strictly needed
    Post.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: posts.length,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
    data: { posts }
  });
});

exports.toggleUpvotePost = asyncWrapper(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const post = await Post.findById(postId);
  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  const isUpvoted = post.upvotes.includes(userId);

  if (isUpvoted) {
    // Remove upvote
    post.upvotes = post.upvotes.filter((id) => id.toString() !== userId.toString());
    post.upvoteCount -= 1;
  } else {
    // Add upvote
    post.upvotes.push(userId);
    post.upvoteCount += 1;
  }

  await post.save();

  res.status(200).json({
    status: 'success',
    data: {
      upvoteCount: post.upvoteCount,
      isUpvoted: !isUpvoted
    }
  });
});

// ======================= COMMENTS =======================

exports.addComment = asyncWrapper(async (req, res, next) => {
  const { postId } = req.params;
  const { content } = req.body;
  const author = req.user._id;

  const post = await Post.findById(postId);
  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  const comment = await Comment.create({ post: postId, content, author });

  // Atomic increment for post comments count
  await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

  await comment.populate({ path: 'author', select: 'name profilePic' });

  res.status(201).json({
    status: 'success',
    data: { comment }
  });
});

exports.getPostComments = asyncWrapper(async (req, res, next) => {
  const { postId } = req.params;
  const { page = 1, limit = 30 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));

  const [comments, total] = await Promise.all([
    Comment.find({ post: postId })
    .sort('-createdAt')
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .populate({ path: 'author', select: 'name profilePic' })
    .lean(),
    Comment.countDocuments({ post: postId }),
  ]);

  res.status(200).json({
    status: 'success',
    results: comments.length,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
    data: { comments }
  });
});
