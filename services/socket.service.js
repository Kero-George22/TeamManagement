const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Project = require('../models/project.model');
const DirectMessage = require('../models/directMessage.model');
const Message = require('../models/message.model');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env variable is not set');

let ioInstance = null;
const userSockets = new Map();

async function canAccessProject(projectId, userId) {
  if (!mongoose.Types.ObjectId.isValid(String(projectId))) return false;

  const project = await Project.findById(projectId).select('owner members').lean();
  if (!project) return false;

  const uid = String(userId);
  return (
    String(project.owner) === uid ||
    (project.members || []).some((m) => String(m.userId) === uid)
  );
}

function setIO(io) {
  ioInstance = io;
}

function setupSocket(io) {
  setIO(io);

  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token && socket.request.headers.cookie) {
        const match = socket.request.headers.cookie.match(/(?:^|;\s*)accessToken=([^;]+)/);
        if (match) token = match[1];
      }
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.sub).select('_id username email avatar');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = String(socket.user._id);

    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    // Auto-join the user's personal room for DMs and notifications
    socket.join(`user:${userId}`);

    User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(() => {});

    socket.on('join:project', async (projectId) => {
      if (projectId && await canAccessProject(projectId, userId)) {
        socket.join(`project:${projectId}`);
        socket.to(`project:${projectId}`).emit('user:online', { userId, username: socket.user.username });
      } else {
        socket.emit('error:forbidden', { message: 'You cannot join this project room' });
      }
    });

    socket.on('leave:project', async (projectId) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
        if (await canAccessProject(projectId, userId)) {
          socket.to(`project:${projectId}`).emit('user:offline', { userId });
        }
      }
    });

    // Keep this for backward compatibility if the client still emits it
    socket.on('join:dms', () => {
      socket.join(`user:${userId}`);
    });

    socket.on('office:message', async (data) => {
      const { projectId, message } = data;
      if (projectId && message && await canAccessProject(projectId, userId)) {
        if (message._id) {
          if (!mongoose.Types.ObjectId.isValid(String(message._id))) return;
          const exists = await Message.exists({ _id: message._id, project: projectId, user: userId });
          if (!exists) return socket.emit('error:forbidden', { message: 'Invalid office message' });
        }
        socket.to(`project:${projectId}`).emit('office:message', {
          ...message,
          user: { _id: socket.user._id, username: socket.user.username, avatar: socket.user.avatar },
        });
      }
    });

    socket.on('dm:message', async (data) => {
      const { receiverId, message } = data;
      if (receiverId && message && mongoose.Types.ObjectId.isValid(String(receiverId))) {
        if (String(receiverId) === userId) return;
        if (message._id) {
          if (!mongoose.Types.ObjectId.isValid(String(message._id))) return;
          const exists = await DirectMessage.exists({
            _id: message._id,
            sender: userId,
            receiver: receiverId,
          });
          if (!exists) return socket.emit('error:forbidden', { message: 'Invalid direct message' });
        } else {
          const receiverExists = await User.exists({ _id: receiverId });
          if (!receiverExists) return;
        }
        io.to(`user:${receiverId}`).emit('dm:message', {
          ...message,
          sender: { _id: socket.user._id, username: socket.user.username, avatar: socket.user.avatar },
        });
        io.to(`user:${receiverId}`).emit('notification', {
          type: 'dm',
          from: socket.user._id,
          message: `New message from ${socket.user.username}`,
        });
      }
    });

    socket.on('typing:start', async (data) => {
      const { projectId, receiverId } = data;
      if (projectId && await canAccessProject(projectId, userId)) {
        socket.to(`project:${projectId}`).emit('typing:update', { userId, username: socket.user.username, isTyping: true });
      }
      if (receiverId) {
        io.to(`user:${receiverId}`).emit('typing:update', { userId, username: socket.user.username, isTyping: true });
      }
    });

    socket.on('typing:stop', async (data) => {
      const { projectId, receiverId } = data;
      if (projectId && await canAccessProject(projectId, userId)) {
        socket.to(`project:${projectId}`).emit('typing:update', { userId, username: socket.user.username, isTyping: false });
      }
      if (receiverId) {
        io.to(`user:${receiverId}`).emit('typing:update', { userId, username: socket.user.username, isTyping: false });
      }
    });

    socket.on('task:updated', async (data) => {
      const { projectId, task } = data;
      if (projectId && await canAccessProject(projectId, userId)) {
        socket.to(`project:${projectId}`).emit('task:updated', task);
      }
    });

    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
      User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(() => {});
    });
  });

  return io;
}

function sendNotificationToUser(userId, notification) {
  const sockets = userSockets.get(String(userId));
  if (!sockets || !ioInstance) return;
  for (const socketId of sockets) {
    const sock = ioInstance.sockets.sockets.get(socketId);
    if (sock) sock.emit('notification', notification);
  }
}

function sendDirectMessageToUser(userId, message) {
  if (!ioInstance) return;
  ioInstance.to(`user:${String(userId)}`).emit('dm:message', message);
}

function emitToProject(projectId, event, data) {
  if (ioInstance) ioInstance.to(`project:${projectId}`).emit(event, data);
}

module.exports = { setupSocket, sendNotificationToUser, sendDirectMessageToUser, emitToProject };
