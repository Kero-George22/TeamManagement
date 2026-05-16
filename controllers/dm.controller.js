const DirectMessage = require('../models/directMessage.model');
const User = require('../models/user.model');
const asyncWrapper = require('../utils/asyncWrapper');
const { success } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

// ─────────────────────────────────────────
// SEND A MESSAGE
// ─────────────────────────────────────────
exports.sendMessage = asyncWrapper(async (req, res) => {
  const { receiverId, content } = req.body;
  const senderId = req.user._id;

  if (!receiverId) throw new AppError('Receiver ID is required', 400);
  if (!content?.trim()) throw new AppError('Message content is required', 400);

  const receiver = await User.findById(receiverId);
  if (!receiver) throw new AppError('Receiver not found', 404);

  const message = await DirectMessage.create({
    sender: senderId,
    receiver: receiverId,
    content: content.trim(),
  });

  return success(res, message, 'Message sent successfully', 201);
});

// ─────────────────────────────────────────
// GET MESSAGES WITH A SPECIFIC USER
// ─────────────────────────────────────────
exports.getMessages = asyncWrapper(async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;
  const { page = 1, limit = 50 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

  const threadFilter = {
    $or: [
      { sender: currentUserId, receiver: userId },
      { sender: userId, receiver: currentUserId },
    ],
  };

  const [messages, total] = await Promise.all([
    DirectMessage.find(threadFilter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    DirectMessage.countDocuments(threadFilter),
  ]);

  // Mark received messages as read
  await DirectMessage.updateMany(
    { sender: userId, receiver: currentUserId, read: false },
    { $set: { read: true } }
  );

  return success(res, {
    messages: messages.reverse(),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  }, 'Messages retrieved');
});

// ─────────────────────────────────────────
// GET CONVERSATIONS (INBOX)
// ─────────────────────────────────────────
exports.getConversations = asyncWrapper(async (req, res) => {
  const currentUserId = req.user._id;
  const { page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const currentUserObjectId = currentUserId;

  const [groupedConversations, unreadSummary] = await Promise.all([
    DirectMessage.aggregate([
      { $match: { $or: [{ sender: currentUserObjectId }, { receiver: currentUserObjectId }] } },
      {
        $project: {
          sender: 1,
          receiver: 1,
          content: 1,
          createdAt: 1,
          read: 1,
          otherUserId: {
            $cond: [{ $eq: ['$sender', currentUserObjectId] }, '$receiver', '$sender'],
          },
          unreadFromOther: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiver', currentUserObjectId] },
                  { $eq: ['$read', false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$otherUserId',
          latestMessage: { $first: '$content' },
          timestamp: { $first: '$createdAt' },
          unreadCount: { $sum: '$unreadFromOther' },
        },
      },
      { $sort: { timestamp: -1 } },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
    ]),
    DirectMessage.aggregate([
      { $match: { receiver: currentUserObjectId, read: false } },
      { $count: 'total' },
    ]),
  ]);

  const userIds = groupedConversations.map((conversation) => conversation._id);
  const users = userIds.length > 0
    ? await User.find({ _id: { $in: userIds } })
        .select('username email avatar')
        .lean()
    : [];
  const userById = new Map(users.map((user) => [String(user._id), user]));

  const conversations = groupedConversations
    .map((conversation) => ({
      user: userById.get(String(conversation._id)) || null,
      latestMessage: conversation.latestMessage,
      timestamp: conversation.timestamp,
      unreadCount: conversation.unreadCount,
    }))
    .filter((conversation) => !!conversation.user);

  const unreadTotal = unreadSummary[0]?.total || 0;

  return success(res, { conversations, unreadTotal }, 'Conversations retrieved');
});

// ─────────────────────────────────────────
// SEARCH USERS TO MESSAGE
// ─────────────────────────────────────────
exports.searchUsers = asyncWrapper(async (req, res) => {
  const { query } = req.query;
  const currentUserId = req.user._id;

  if (!query) return success(res, [], 'Search query required');

  const users = await User.find({
    _id: { $ne: currentUserId },
    $or: [
      { username: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
    ]
  }).select('username email avatar').limit(10);

  return success(res, users, 'Users retrieved');
});