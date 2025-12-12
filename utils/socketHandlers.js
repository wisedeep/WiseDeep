import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// WebRTC Signaling Server State
const activeRooms = new Map(); // roomId -> { counsellor: socket, client: socket }
const sessions = new Map(); // roomId -> Set<userId>
const videoRooms = new Map(); // NEW: Track video call rooms - sessionId -> { caller: socketId, callee: socketId }

export const setupSocketHandlers = (io) => {
    // Middleware for authentication
    io.use((socket, next) => {
        console.log(`🔐 [AUTH] Socket ${socket.id} attempting to connect...`);
        const token = socket.handshake.auth.token;
        if (!token) {
            console.error(`❌ [AUTH FAILED] No token provided for socket ${socket.id}`);
            return next(new Error('Authentication error: No token'));
        }
        try {
            const secret = process.env.JWT_SECRET || 'secretkey';
            const decoded = jwt.verify(token, secret);
            socket.user = decoded;
            console.log(`✅ [AUTH SUCCESS] User ${decoded.userId} authenticated (${socket.id})`);
            next();
        } catch (err) {
            console.error(`❌ [AUTH FAILED] Socket ${socket.id}: ${err.message}`);
            return next(new Error(`Authentication error: ${err.message}`));
        }
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id, 'User ID:', socket.user.userId);
        // User joins their own personal room for notifications
        socket.join(socket.user.userId);

        // Video Call Signaling Events
        socket.on('join-video-call', async (sessionId) => {
            try {
                // Verify if user is allowed to join this session
                const VideoSession = mongoose.model('VideoSession');
                const Session = mongoose.model('Session');

                // Allow join if it's a known VideoSession or a valid Booking Session
                const videoSession = await VideoSession.findOne({ roomId: sessionId });
                const booking = await Session.findById(sessionId).populate('counsellor');

                let isAuthorized = false;
                let otherUserId = null;
                let sessionType = 'session';

                if (videoSession) {
                    if (videoSession.userId.toString() === socket.user.userId) {
                        // Current is Client, other is Counsellor
                        isAuthorized = true;
                        // Ideally we need to find the counsellor's user ID. 
                        // But videoSession stores counsellor PROFILE ID. 
                        // We'll skip notification for ad-hoc video sessions for now or need extra lookup.
                    } else if (videoSession.counsellorId.toString() === socket.user.userId) {
                        // This logic is tricky if socket.user.userId is comparing to counsellorId (Profile vs User).
                        // Assuming authorized for now if simpler checks pass from before.
                        isAuthorized = true;
                    }
                    // For legacy video session support
                }

                if (!isAuthorized && booking) {
                    // Check booking participants
                    const clientUserId = booking.user.toString();
                    const counsellorUserId = booking.counsellor.user.toString();

                    if (socket.user.userId === clientUserId) {
                        isAuthorized = true;
                        otherUserId = counsellorUserId;
                    } else if (socket.user.userId === counsellorUserId) {
                        isAuthorized = true;
                        otherUserId = clientUserId;
                    }
                }

                if (!isAuthorized) {
                    console.log(`Unauthorized join attempt by ${socket.user.userId} for session ${sessionId}`);
                    socket.emit('error', { message: 'Unauthorized access to session' });
                    return;
                }

                console.log(`User ${socket.id} (${socket.user.userId}) joining video call: ${sessionId}`);

                // Check if there are already users in the room BEFORE joining
                const room = io.sockets.adapter.rooms.get(sessionId);
                const existingParticipants = room ? room.size : 0;
                console.log(`Room ${sessionId} currently has ${existingParticipants} participant(s)`);

                // Join the room
                socket.join(sessionId);

                // If someone is already in the room, notify them that a new user joined
                // AND notify the current user that someone is waiting
                if (existingParticipants > 0) {
                    console.log(`Notifying existing participants in room ${sessionId} that user ${socket.id} joined`);

                    // Get the first existing participant's socket ID for comparison
                    const existingSocketId = Array.from(room)[0];

                    // Determine who is "polite" (creates offer) based on socket ID comparison
                    // This ensures deterministic role assignment and prevents race conditions
                    const isCurrentUserPolite = socket.id > existingSocketId;
                    const isExistingUserPolite = !isCurrentUserPolite;

                    console.log(`Role assignment: Current user (${socket.id}) is ${isCurrentUserPolite ? 'POLITE' : 'IMPOLITE'}`);
                    console.log(`Role assignment: Existing user (${existingSocketId}) is ${isExistingUserPolite ? 'POLITE' : 'IMPOLITE'}`);

                    // Notify existing participant with their role
                    socket.to(sessionId).emit('user-joined', { isPolite: isExistingUserPolite });

                    // Notify current user with their role
                    socket.emit('user-joined', { isPolite: isCurrentUserPolite });
                } else {
                    console.log(`User ${socket.id} is the first to join room ${sessionId}`);
                }

                // NEW: Notify the other participant if they are NOT in the room yet
                if (otherUserId) {
                    // Check if other user is already in the room
                    const isOtherUserPresent = room && Array.from(room).some(socketId => {
                        const otherSocket = io.sockets.sockets.get(socketId);
                        return otherSocket && otherSocket.user.userId === otherUserId;
                    });

                    if (!isOtherUserPresent) {
                        console.log(`Notifying other user ${otherUserId} of incoming call for session ${sessionId}`);
                        io.to(otherUserId).emit('incoming-call', {
                            sessionId,
                            callerName: socket.user.firstName ? `${socket.user.firstName} ${socket.user.lastName}` : 'Counsellor/Client',
                            message: 'Session started. Click to join!'
                        });
                    } else {
                        console.log(`Other user ${otherUserId} is already in room ${sessionId}`);
                    }
                }

            } catch (error) {
                console.error('Error in join-video-call:', error);
                socket.emit('error', { message: 'Server error during join' });
            }
        });

        socket.on('offer', ({ sessionId, offer }) => {
            // Basic check: is user in room?
            if (socket.rooms.has(sessionId)) {
                console.log(`Offer from ${socket.id} for session ${sessionId}`);
                socket.to(sessionId).emit('offer', offer);
            } else {
                console.error(`User ${socket.id} not in room ${sessionId} when sending offer`);
            }
        });

        socket.on('answer', ({ sessionId, answer }) => {
            if (socket.rooms.has(sessionId)) {
                console.log(`Answer from ${socket.id} for session ${sessionId}`);
                socket.to(sessionId).emit('answer', answer);
            } else {
                console.error(`User ${socket.id} not in room ${sessionId} when sending answer`);
            }
        });

        socket.on('ice-candidate', ({ sessionId, candidate }) => {
            if (socket.rooms.has(sessionId)) {
                console.log(`ICE candidate from ${socket.id} for session ${sessionId}`);
                socket.to(sessionId).emit('ice-candidate', candidate);
            } else {
                console.error(`User ${socket.id} not in room ${sessionId} when sending ICE candidate`);
            }
        });

        // ==================== NEW VIDEO CALL EVENTS ====================
        socket.on('video:join', async ({ sessionId, userRole }) => {
            try {
                console.log(`\n📹 [VIDEO JOIN] User ${socket.user.userId} joining session ${sessionId}`);

                const Session = mongoose.model('Session');
                const booking = await Session.findById(sessionId).populate('counsellor');

                if (!booking) {
                    socket.emit('video:error', { message: 'Session not found' });
                    return;
                }

                const clientUserId = booking.user.toString();
                const counsellorUserId = booking.counsellor.user.toString();
                const userId = socket.user.userId;

                if (userId !== clientUserId && userId !== counsellorUserId) {
                    socket.emit('video:error', { message: 'Unauthorized' });
                    return;
                }

                const isCounsellor = userId === counsellorUserId;
                const actualRole = isCounsellor ? 'caller' : 'callee';

                socket.join(sessionId);

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
                socket.emit('video:role-assigned', { role: actualRole });

                if (room.caller && room.callee) {
                    console.log(`🎬 [READY] Both users present`);
                    io.to(room.caller).emit('video:ready-to-call');
                }
            } catch (error) {
                console.error('❌ [VIDEO JOIN ERROR]', error);
                socket.emit('video:error', { message: 'Failed to join video session' });
            }
        });

        socket.on('video:offer', ({ sessionId, offer }) => {
            console.log(`📤 [OFFER] Received for session ${sessionId}`);
            const room = videoRooms.get(sessionId);
            if (room && room.callee) {
                io.to(room.callee).emit('video:offer', { offer });
            }
        });

        socket.on('video:answer', ({ sessionId, answer }) => {
            console.log(`📤 [ANSWER] Received for session ${sessionId}`);
            const room = videoRooms.get(sessionId);
            if (room && room.caller) {
                io.to(room.caller).emit('video:answer', { answer });
            }
        });

        socket.on('video:ice-candidate', ({ sessionId, candidate }) => {
            socket.to(sessionId).emit('video:ice-candidate', { candidate });
        });

        socket.on('video:leave', ({ sessionId }) => {
            const room = videoRooms.get(sessionId);
            if (room) {
                if (room.caller === socket.id) delete room.caller;
                if (room.callee === socket.id) delete room.callee;
                socket.to(sessionId).emit('video:peer-left');
                if (!room.caller && !room.callee) {
                    videoRooms.delete(sessionId);
                }
            }
            socket.leave(sessionId);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            // Clean up video rooms
            for (const [sessionId, room] of videoRooms.entries()) {
                if (room.caller === socket.id || room.callee === socket.id) {
                    socket.to(sessionId).emit('video:peer-left');
                    if (room.caller === socket.id) delete room.caller;
                    if (room.callee === socket.id) delete room.callee;
                    if (!room.caller && !room.callee) {
                        videoRooms.delete(sessionId);
                    }
                }
            }
        });
    });
};
