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
            return next(new Error('Authentication error'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id, 'User ID:', socket.user.userId);

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

                if (videoSession) {
                    if (videoSession.userId.toString() === socket.user.userId ||
                        videoSession.counsellorId.toString() === socket.user.userId) { // Note: counsellorId in VideoSession is Counsellor ID not User ID?
                        // Wait, VideoSession schema: counsellorId ref Counsellor.
                        // We need the User ID of that counsellor.
                        // This check is slightly complex because socket.user.userId is USER ID.
                        // videoSession.counsellorId is COUNSELLOR PROFILE ID.
                        // We need to resolve it.
                        const Counsellor = mongoose.model('Counsellor');
                        const counsellor = await Counsellor.findById(videoSession.counsellorId);
                        if (counsellor && counsellor.user.toString() === socket.user.userId) {
                            isAuthorized = true;
                        } else if (videoSession.userId.toString() === socket.user.userId) {
                            isAuthorized = true;
                        }
                    }
                }

                if (!isAuthorized && booking) {
                    // Check booking participants
                    const clientUserId = booking.user.toString();
                    const counsellorUserId = booking.counsellor.user.toString();

                    if (socket.user.userId === clientUserId || socket.user.userId === counsellorUserId) {
                        isAuthorized = true;
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
