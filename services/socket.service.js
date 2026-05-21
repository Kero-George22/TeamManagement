const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

let ioInstance = null;
const userSockets = new Map();

function setIO(io) {
  ioInstance = io;
}

function setupSocket(io) {
  setIO(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
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

    socket.on('join:project', (projectId) => {
      if (projectId) {
        socket.join(`project:${projectId}`);
        socket.to(`project:${projectId}`).emit('user:online', { userId, username: socket.user.username });
      }
    });

    socket.on('leave:project', (projectId) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
        socket.to(`project:${projectId}`).emit('user:offline', { userId });
      }
    });

    // Keep this for backward compatibility if the client still emits it
    socket.on('join:dms', () => {
      socket.join(`user:${userId}`);
    });

    socket.on('office:message', (data) => {
      const { projectId, message } = data;
      if (projectId && message) {
        socket.to(`project:${projectId}`).emit('office:message', {
          ...message,
          user: { _id: socket.user._id, username: socket.user.username, avatar: socket.user.avatar },
        });
      }
    });

    socket.on('dm:message', (data) => {
      const { receiverId, message } = data;
      if (receiverId && message) {
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

    socket.on('typing:start', (data) => {
      const { projectId, receiverId } = data;
      if (projectId) {
        socket.to(`project:${projectId}`).emit('typing:update', { userId, username: socket.user.username, isTyping: true });
      }
      if (receiverId) {
        io.to(`user:${receiverId}`).emit('typing:update', { userId, username: socket.user.username, isTyping: true });
      }
    });

    socket.on('typing:stop', (data) => {
      const { projectId, receiverId } = data;
      if (projectId) {
        socket.to(`project:${projectId}`).emit('typing:update', { userId, username: socket.user.username, isTyping: false });
      }
      if (receiverId) {
        io.to(`user:${receiverId}`).emit('typing:update', { userId, username: socket.user.username, isTyping: false });
      }
    });

    socket.on('task:updated', (data) => {
      const { projectId, task } = data;
      if (projectId) {
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

function emitToProject(projectId, event, data) {
  if (ioInstance) ioInstance.to(`project:${projectId}`).emit(event, data);
}

module.exports = { setupSocket, sendNotificationToUser, emitToProject };
