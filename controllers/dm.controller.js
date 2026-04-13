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

  const messages = await DirectMessage.find({
    $or: [
      { sender: currentUserId, receiver: userId },
      { sender: userId, receiver: currentUserId },
    ],
  }).sort({ createdAt: 1 }); // Oldest to newest for chat view

  // Mark received messages as read
  await DirectMessage.updateMany(
    { sender: userId, receiver: currentUserId, read: false },
    { $set: { read: true } }
  );

  return success(res, messages, 'Messages retrieved');
});

// ─────────────────────────────────────────
// GET CONVERSATIONS (INBOX)
// ─────────────────────────────────────────
exports.getConversations = asyncWrapper(async (req, res) => {
  const currentUserId = req.user._id;

  // Find all messages where user is sender or receiver
  const messages = await DirectMessage.find({
    $or: [{ sender: currentUserId }, { receiver: currentUserId }],
  }).sort({ createdAt: -1 });

  // Group by other user to get latest message per conversation
  const conversationsMap = new Map();
  let unreadTotal = 0;

  for (const msg of messages) {
    const isSender = msg.sender.toString() === currentUserId.toString();
    const otherUserId = isSender ? msg.receiver.toString() : msg.sender.toString();

    if (!conversationsMap.has(otherUserId)) {
      conversationsMap.set(otherUserId, {
        userId: otherUserId,
        latestMessage: msg.content,
        timestamp: msg.createdAt,
        unreadCount: (!isSender && !msg.read) ? 1 : 0,
      });
    } else {
      if (!isSender && !msg.read) {
        conversationsMap.get(otherUserId).unreadCount += 1;
      }
    }
  }

  // Fetch user details for all other users
  const userIds = Array.from(conversationsMap.keys());
  const users = await User.find({ _id: { $in: userIds } }).select('username email avatar');

  const conversations = users.map((user) => {
    const data = conversationsMap.get(user._id.toString());
    unreadTotal += data.unreadCount;
    return {
      user,
      latestMessage: data.latestMessage,
      timestamp: data.timestamp,
      unreadCount: data.unreadCount,
    };
  }).sort((a, b) => b.timestamp - a.timestamp);

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