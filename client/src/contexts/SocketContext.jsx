import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimers = useRef({});

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const socket = io({
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:dms');
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('typing:update', ({ userId, username, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) return { ...prev, [userId]: username };
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      // Auto-clear after 3s
      if (isTyping) {
        clearTimeout(typingTimers.current[userId]);
        typingTimers.current[userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }, 3000);
      }
    });

    socket.on('office:message', (message) => {
      // Dispatch custom event so pages can listen
      window.dispatchEvent(new CustomEvent('office:message', { detail: message }));
    });

    socket.on('dm:message', (message) => {
      window.dispatchEvent(new CustomEvent('dm:message', { detail: message }));
    });

    socket.on('notification', (notification) => {
      window.dispatchEvent(new CustomEvent('notification', { detail: notification }));
    });

    socket.on('task:updated', (task) => {
      window.dispatchEvent(new CustomEvent('task:updated', { detail: task }));
    });

    socket.on('user:online', ({ userId, username }) => {
      window.dispatchEvent(new CustomEvent('user:online', { detail: { userId, username } }));
    });

    socket.on('user:offline', ({ userId }) => {
      window.dispatchEvent(new CustomEvent('user:offline', { detail: { userId } }));
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  const joinProject = useCallback((projectId) => {
    socketRef.current?.emit('join:project', projectId);
  }, []);

  const leaveProject = useCallback((projectId) => {
    socketRef.current?.emit('leave:project', projectId);
  }, []);

  const joinDMs = useCallback(() => {
    socketRef.current?.emit('join:dms');
  }, []);

  const emitOfficeMessage = useCallback((projectId, message) => {
    socketRef.current?.emit('office:message', { projectId, message });
  }, []);

  const emitDMMessage = useCallback((receiverId, message) => {
    socketRef.current?.emit('dm:message', { receiverId, message });
  }, []);

  const emitTypingStart = useCallback((target) => {
    socketRef.current?.emit('typing:start', target);
  }, []);

  const emitTypingStop = useCallback((target) => {
    socketRef.current?.emit('typing:stop', target);
  }, []);

  const emitTaskUpdated = useCallback((projectId, task) => {
    socketRef.current?.emit('task:updated', { projectId, task });
  }, []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      typingUsers,
      joinProject,
      leaveProject,
      joinDMs,
      emitOfficeMessage,
      emitDMMessage,
      emitTypingStart,
      emitTypingStop,
      emitTaskUpdated,
    }}>
      {children}
    </SocketContext.Provider>
  );
}
