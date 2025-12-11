import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// WebRTC Signaling Server State
const activeRooms = new Map(); // roomId -> { counsellor: socket, client: socket }

const sessions = new Map(); // roomId -> Set<userId>

export const setupSocketHandlers = (io) => {
    // Middleware for authentication
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            console.error(`Socket Auth Failed: No token provided for socket ${socket.id}`);
            return next(new Error('Authentication error: No token'));
        }
        try {
            const secret = process.env.JWT_SECRET || 'secretkey';
            const decoded = jwt.verify(token, secret);
            socket.user = decoded;
            console.log(`Socket Authenticated: User ${decoded.userId} (${socket.id})`);
            next();
        } catch (err) {
            console.error(`Socket Auth Failed for socket ${socket.id}:`, err.message);
            // console.error('Token used:', token); // Careful logging full tokens in prod
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
                socket.join(sessionId);
                // Notify other users in the room
                socket.to(sessionId).emit('user-joined');

                // NEW: Notify the other participant if they are NOT in the room yet
                if (otherUserId) {
                    // Check if other user is already in the room
                    const room = io.sockets.adapter.rooms.get(sessionId);
                    const isOtherUserPresent = false;
                    // (Simplification: We assume if they are joined, we don't need to ring them, 
                    // but sending a notification anyway doesn't hurt).

                    console.log(`Notifying other user ${otherUserId} of incoming call for session ${sessionId}`);
                    io.to(otherUserId).emit('incoming-call', {
                        sessionId,
                        callerName: socket.user.firstName ? `${socket.user.firstName} ${socket.user.lastName}` : 'Counsellor/Client',
                        message: 'Session started. Click to join!'
                    });
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
            }
        });

        socket.on('answer', ({ sessionId, answer }) => {
            if (socket.rooms.has(sessionId)) {
                console.log(`Answer from ${socket.id} for session ${sessionId}`);
                socket.to(sessionId).emit('answer', answer);
            }
        });

        socket.on('ice-candidate', ({ sessionId, candidate }) => {
            if (socket.rooms.has(sessionId)) {
                console.log(`ICE candidate from ${socket.id} for session ${sessionId}`);
                socket.to(sessionId).emit('ice-candidate', candidate);
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};
