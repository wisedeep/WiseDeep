import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

/**
 * Dedicated Video Call Socket Handler
 * Simple, clean implementation with caller/callee pattern
 */

// Track active video rooms: roomId -> { caller: socketId, callee: socketId }
const videoRooms = new Map();

export const setupVideoSocketHandler = (io) => {
    console.log('📹 Video Socket Handler initialized');

    io.on('connection', (socket) => {
        // User is already authenticated from main socket handler
        if (!socket.user) {
            console.error('❌ Socket connected without authentication');
            return;
        }

        // ==================== JOIN VIDEO ROOM ====================
        socket.on('video:join', async ({ sessionId, userRole }) => {
            try {
                console.log(`\n📹 [VIDEO JOIN] User ${socket.user.userId} joining session ${sessionId} as ${userRole}`);

                // Verify session access
                const Session = mongoose.model('Session');
                const booking = await Session.findById(sessionId).populate('counsellor');

                if (!booking) {
                    socket.emit('video:error', { message: 'Session not found' });
                    return;
                }

                // Verify user is participant
                const clientUserId = booking.user.toString();
                const counsellorUserId = booking.counsellor.user.toString();
                const userId = socket.user.userId;

                if (userId !== clientUserId && userId !== counsellorUserId) {
                    socket.emit('video:error', { message: 'Unauthorized' });
                    return;
                }

                // Determine actual role
                const isCounsellor = userId === counsellorUserId;
                const actualRole = isCounsellor ? 'caller' : 'callee';

                // Join socket room
                socket.join(sessionId);

                // Track in video rooms
                if (!videoRooms.has(sessionId)) {
                    videoRooms.set(sessionId, {});
                }

                const room = videoRooms.get(sessionId);
                if (actualRole === 'caller') {
                    room.caller = socket.id;
                } else {
                    room.callee = socket.id;
                }

                console.log(`✅ [VIDEO JOIN] User joined as ${actualRole}`);
                console.log(`📊 [ROOM STATE] Caller: ${room.caller ? '✓' : '✗'}, Callee: ${room.callee ? '✓' : '✗'}`);

                // Notify user of their role
                socket.emit('video:role-assigned', { role: actualRole });

                // If both users are present, notify caller to start
                if (room.caller && room.callee) {
                    console.log(`🎬 [READY] Both users present, notifying caller to create offer`);
                    io.to(room.caller).emit('video:ready-to-call');
                }

            } catch (error) {
                console.error('❌ [VIDEO JOIN ERROR]', error);
                socket.emit('video:error', { message: 'Failed to join video session' });
            }
        });

        // ==================== OFFER ====================
        socket.on('video:offer', ({ sessionId, offer }) => {
            console.log(`📤 [OFFER] Received from ${socket.id} for session ${sessionId}`);

            const room = videoRooms.get(sessionId);
            if (!room || !room.callee) {
                console.error('❌ [OFFER] No callee in room');
                return;
            }

            console.log(`📨 [OFFER] Forwarding to callee ${room.callee}`);
            io.to(room.callee).emit('video:offer', { offer });
        });

        // ==================== ANSWER ====================
        socket.on('video:answer', ({ sessionId, answer }) => {
            console.log(`📤 [ANSWER] Received from ${socket.id} for session ${sessionId}`);

            const room = videoRooms.get(sessionId);
            if (!room || !room.caller) {
                console.error('❌ [ANSWER] No caller in room');
                return;
            }

            console.log(`📨 [ANSWER] Forwarding to caller ${room.caller}`);
            io.to(room.caller).emit('video:answer', { answer });
        });

        // ==================== ICE CANDIDATE ====================
        socket.on('video:ice-candidate', ({ sessionId, candidate }) => {
            console.log(`🧊 [ICE] Received from ${socket.id}`);

            // Forward to the other user in the room
            socket.to(sessionId).emit('video:ice-candidate', { candidate });
        });

        // ==================== LEAVE ====================
        socket.on('video:leave', ({ sessionId }) => {
            console.log(`👋 [LEAVE] User ${socket.id} leaving session ${sessionId}`);

            const room = videoRooms.get(sessionId);
            if (room) {
                // Remove user from room
                if (room.caller === socket.id) {
                    delete room.caller;
                } else if (room.callee === socket.id) {
                    delete room.callee;
                }

                // Notify other user
                socket.to(sessionId).emit('video:peer-left');

                // Clean up empty room
                if (!room.caller && !room.callee) {
                    videoRooms.delete(sessionId);
                    console.log(`🗑️ [CLEANUP] Removed empty room ${sessionId}`);
                }
            }

            socket.leave(sessionId);
        });

        // ==================== DISCONNECT ====================
        socket.on('disconnect', () => {
            console.log(`🔌 [DISCONNECT] Socket ${socket.id} disconnected`);

            // Clean up from all video rooms
            for (const [sessionId, room] of videoRooms.entries()) {
                if (room.caller === socket.id || room.callee === socket.id) {
                    // Notify other user
                    socket.to(sessionId).emit('video:peer-left');

                    // Remove from room
                    if (room.caller === socket.id) delete room.caller;
                    if (room.callee === socket.id) delete room.callee;

                    // Clean up empty room
                    if (!room.caller && !room.callee) {
                        videoRooms.delete(sessionId);
                    }
                }
            }
        });
    });
};
