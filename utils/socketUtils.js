// Socket.io utility for real-time notifications
import { io as ClientIO } from "socket.io-client";
let io = null;
let clientSocket = null;

// Track counsellor socket connections: counsellorId -> Set of socket IDs
const counsellorSockets = new Map();

// Track user socket connections: userId -> Set of socket IDs
const userSockets = new Map();

export const setSocketInstance = (socketInstance) => {
  io = socketInstance;

  // Set up socket connections
  io.on('connection', (socket) => {
    // Store counsellor ID when they connect
    socket.on('register-counsellor', (counsellorId) => {
      if (!counsellorSockets.has(counsellorId)) {
        counsellorSockets.set(counsellorId, new Set());
      }
      counsellorSockets.get(counsellorId).add(socket.id);
      console.log(`Counsellor ${counsellorId} registered with socket ${socket.id}`);
    });

    // Store user ID when they connect
    socket.on('register-user', (userId) => {
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
      console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    // Clean up when socket disconnects
    socket.on('disconnect', () => {
      // Remove from counsellor sockets
      for (const [counsellorId, sockets] of counsellorSockets.entries()) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          counsellorSockets.delete(counsellorId);
        }
      }

      // Remove from user sockets
      for (const [userId, sockets] of userSockets.entries()) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });
};

export const emitToCounsellor = (counsellorId, event, data) => {
  if (io) {
    const sockets = counsellorSockets.get(counsellorId);
    if (sockets && sockets.size > 0) {
      // Emit to specific counsellor's sockets
      sockets.forEach(socketId => {
        io.to(socketId).emit(event, { ...data, counsellorId });
      });
    } else {
      // Fallback: emit to all clients and let them filter by counsellorId
      io.emit(event, { ...data, counsellorId });
    }
  }
};

export const emitToUser = (userId, event, data) => {
  if (io) {
    const sockets = userSockets.get(userId);
    if (sockets && sockets.size > 0) {
      // Emit to specific user's sockets
      sockets.forEach(socketId => {
        io.to(socketId).emit(event, { ...data, userId });
      });
    } else {
      // Fallback: emit to all clients and let them filter by userId
      io.emit(event, { ...data, userId });
    }
  }
};

export const emitSessionUpdate = (counsellorId, data) => {
  emitToCounsellor(counsellorId, 'session-updated', data);
};

// Client-side socket utilities
export const initializeClientSocket = () => {
  if (typeof window !== 'undefined' && !clientSocket) {
    // Use VITE_API_URL if available (exposed by Vite), otherwise fallback to current origin or default
    let socketUrl = 'http://localhost:5000'; // Default fallback

    try {
      if (import.meta.env && import.meta.env.VITE_API_URL) {
        socketUrl = import.meta.env.VITE_API_URL.replace('/api', '');
      } else if (window.location.host.includes('localhost')) {
        // If running locally but no env var (fallback), assume port 5000 for backend
        socketUrl = 'http://localhost:5000';
      } else {
        // Production fallback
        socketUrl = window.location.origin;
      }
    } catch (e) {
      // Fallback for environments where import.meta might fail or be undefined
      socketUrl = 'http://localhost:5000';
    }

    clientSocket = ClientIO(socketUrl, {
      auth: {
        token: localStorage.getItem('token')
      }
    });
  }
  return clientSocket;
};

export const getClientSocket = () => {
  return clientSocket;
};

export const disconnectClientSocket = () => {
  if (clientSocket) {
    clientSocket.disconnect();
    clientSocket = null;
  }
};