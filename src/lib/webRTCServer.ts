// src/lib/webRTCServer.ts
import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { RateLimiter } from './rateLimiter';
import { Presence } from './presence';
import { RoomManager, Room } from '../types/room';

// Define custom Socket interface with user property
interface CustomSocket extends Socket {
  user?: {
    id: string;
    [key: string]: any;
  };
}

// Initialize components
const app = express();
const server = createServer(app);
const presence = new Presence();
const roomManager = new RoomManager();

// Rate limiting
const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,           // 100 requests per minute
  message: 'Too many requests, please try again later.'
});

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Apply middleware
io.use(rateLimiter.middleware());

// Authentication middleware with proper typing
io.use((socket: CustomSocket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey') as { id: string };
    socket.user = { id: decoded.id };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return next(new Error('Authentication failed'));
  }
});

// Connection handler
io.on('connection', (socket: CustomSocket) => {
  if (!socket.user) {
    console.error('No user associated with socket');
    return socket.disconnect(true);
  }

  console.log('User connected:', socket.user.id);

  // Set up presence
  presence.userConnected(socket.user.id, socket.id, {
    connectedAt: Date.now()
  });

  // Notify user about their presence
  socket.emit('presence-update', presence.getUserPresence(socket.user.id));
  
  // Handle room joining
  socket.on('join-room', async ({ roomId, options }: { roomId: string; options?: any }) => {
    try {
      if (!roomId) throw new Error('Room ID is required');
      
      // Leave any existing rooms
      await handleLeaveRooms(socket);
      
      // Get or create room
      let room = roomManager.getRoom(roomId);
      if (!room) {
        room = roomManager.createRoom(roomId, {
          createdBy: socket.user.id,
          ...options
        });
      }
      
      // Add user to room
      roomManager.addParticipant(roomId, socket.user.id);
      
      // Join the room
      await socket.join(roomId);
      
      // Notify others
      socket.to(roomId).emit('user-joined', {
        userId: socket.user.id,
        roomId,
        timestamp: Date.now()
      });
      
      // Send room info to the user
      socket.emit('room-info', {
        ...room,
        participants: Array.from(room.participants)
      });
      
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to join room' 
      });
    }
  });
  
  // Handle leaving rooms
  async function handleLeaveRooms(socket: CustomSocket) {
    const rooms = Array.from(socket.rooms).filter(id => id !== socket.id);
    
    for (const roomId of rooms) {
      socket.leave(roomId);
      roomManager.removeParticipant(roomId, socket.user.id);
      
      // Notify others
      socket.to(roomId).emit('user-left', {
        userId: socket.user!.id,
        roomId,
        timestamp: Date.now()
      });
    }
  }
  
  // Handle disconnection
  socket.on('disconnect', async () => {
    if (!socket.user) return;

    console.log('User disconnected:', socket.user.id);

    // Update presence
    presence.userDisconnected(socket.id);

    // Leave all rooms
    await handleLeaveRooms(socket);
  });
  
  // WebRTC signaling
  socket.on('offer', handleWebRTCEvent('offer'));
  socket.on('answer', handleWebRTCEvent('answer'));
  socket.on('ice-candidate', handleWebRTCEvent('ice-candidate'));
  
  function handleWebRTCEvent(event: string) {
    return (data: any) => {
      const { to, ...payload } = data;
      if (to && socket.user) {
        socket.to(to).emit(event, {
          ...payload,
          from: socket.user.id,
          timestamp: Date.now()
        });
      }
    };
  }
  
  // Chat messages
  socket.on('send-message', ({ roomId, message }: { roomId: string; message: string }) => {
    if (!socket.user) return;
    
    const room = roomManager.getRoom(roomId);
    if (!room || !room.participants.has(socket.user.id)) {
      return socket.emit('error', { message: 'Not in this room' });
    }
    
    const messageData = {
      userId: socket.user.id,
      roomId,
      message,
      timestamp: Date.now()
    };
    
    io.to(roomId).emit('receive-message', messageData);
  });
});

// Error handling
io.on('error', (error) => {
  console.error('Socket.IO error:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});

export { server, io };
