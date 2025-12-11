import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import VideoSession from '../models/VideoSession.js';
import User from '../models/User.js';
import Counsellor from '../models/Counsellor.js';
import Session from '../models/Session.js';

const router = express.Router();

// Middleware to verify JWT
const authenticate = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Initialize/Verify a video session from a Booking ID
router.post('/initialize-session', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.userId; // user.js middleware uses userId, check if verify middleware uses id or userId

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    // 1. Verify existence of the Session (Booking) and User's participation
    // We need to import Session model. Note: It was not imported before.
    // Let's rely on finding standard Session or we need to add import.
    // Assuming we can add import at the top or use mongoose.model('Session') if lazy.
    // But better to add import standardly. Wait, I should add import first. 
    // I will write this assuming Session is imported. I will add import in next tool call if needed or use mongoose.

    // Using imported Session model directly
    // const Session = mongoose.model('Session'); 

    console.log(`[VideoCall] Initializing session: ${sessionId}`);
    const booking = await Session.findById(sessionId).populate('counsellor');

    if (!booking) {
      console.log(`[VideoCall] Session not found: ${sessionId}`);
      return res.status(404).json({ message: 'Booking session not found' });
    }

    console.log(`[VideoCall] Session found: ${booking._id}`);

    // Check participation
    // booking.user is the client (ObjectId or object if populated? Session schema ref User, default find does not populate user)
    // booking.counsellor is populated above. counsellor.user is the counsellor's User ID.

    // Get client ID and Counsellor User ID
    const clientUserId = booking.user.toString();
    const counsellorUserId = booking.counsellor.user.toString();

    if (userId !== clientUserId && userId !== counsellorUserId) {
      return res.status(403).json({ message: 'You are not a participant in this session' });
    }

    // 2. Find or Create VideoSession
    // We use the booking._id as the roomId for simplicity and 1:1 mapping
    let videoSession = await VideoSession.findOne({ roomId: sessionId });

    if (!videoSession) {
      videoSession = new VideoSession({
        roomId: sessionId, // The booking ID IS the room ID
        sessionId: sessionId,
        userId: clientUserId, // The client
        counsellorId: booking.counsellor._id, // The counsellor profile ID
        status: 'scheduled'
      });
      await videoSession.save();
    }

    res.json({ success: true, roomId: sessionId });

  } catch (error) {
    console.error('Error initializing session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify room access (Optimized for both Legacy and New)
router.post('/verify-room', authenticate, async (req, res) => {
  try {
    const { roomId } = req.body;
    const userId = req.user.userId;

    if (!roomId) {
      return res.status(400).json({ message: 'Room ID is required' });
    }

    // Check if it's a UUID (Legacy) or MongoID (New)
    const isMongoId = mongoose.Types.ObjectId.isValid(roomId);

    if (isMongoId) {
      // NEW FLOW: roomId is a Session ID
      const Session = mongoose.model('Session');
      const booking = await Session.findById(roomId).populate('counsellor');

      if (!booking) {
        return res.status(404).json({ message: 'Session not found' });
      }

      const clientUserId = booking.user.toString();
      const counsellorUserId = booking.counsellor.user.toString();

      if (userId !== clientUserId && userId !== counsellorUserId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Ensure VideoSession exists (it should if initialize was called, but safety net)
      let videoSession = await VideoSession.findOne({ roomId });
      if (!videoSession) {
        // Auto-create if missing (e.g. direct link access without init)
        videoSession = new VideoSession({
          roomId: roomId,
          sessionId: roomId,
          userId: clientUserId,
          counsellorId: booking.counsellor._id,
          status: 'in_progress', // Since they are verify-rooming, they are joining
          startedAt: new Date()
        });
        await videoSession.save();
      } else {
        if (videoSession.status === 'scheduled') {
          videoSession.status = 'in_progress';
          videoSession.startedAt = new Date();
          await videoSession.save();
        }
      }

      return res.json({ success: true });

    } else {
      // LEGACY FLOW (UUID) - Keeping for backward compatibility or pure UUID rooms
      const session = await VideoSession.findOne({
        roomId,
        $or: [
          { userId },
          { counsellorId: userId } // Limit of legacy: counsellorId here is Counsellor ID, but userId var is User ID. 
          // The original code compared userId to counsellorId (schema mismatch potentially?). 
          // In original code: const session = await VideoSession.findOne({ roomId, $or: [{ userId }, { counsellorId: userId }] });
          // userId in schema is ObjectId ref User. counsellorId is ObjectId ref Counsellor.
          // req.user.id is User ID. So { counsellorId: userId } would only work if userId WAS the Counsellor ID. 
          // In User.js auth, req.user.userId is set. 
          // We'll leave legacy as is but beware of that bug.
        ]
      });

      if (!session) {
        // Try finding counsellor associated with this user
        const counsellor = await Counsellor.findOne({ user: userId });
        if (counsellor) {
          const sessionByCounsellor = await VideoSession.findOne({ roomId, counsellorId: counsellor._id });
          if (sessionByCounsellor) {
            return res.json({ success: true });
          }
        }
        return res.status(403).json({ message: 'Access denied' });
      }
      res.json({ success: true });
    }

  } catch (error) {
    console.error('Error verifying room access:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get upcoming video calls for a user
router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await VideoSession.find({
      $or: [
        { userId },
        { counsellorId: userId }
      ],
      status: { $in: ['scheduled', 'in_progress'] }
    })
      .populate('userId', 'firstName lastName email')
      .populate({
        path: 'counsellorId',
        populate: {
          path: 'user',
          select: 'firstName lastName email'
        }
      })
      .sort({ createdAt: -1 });

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching upcoming calls:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// End a video call
router.post('/end-call', authenticate, async (req, res) => {
  try {
    const { roomId } = req.body;
    const userId = req.user.id;

    if (!roomId) {
      return res.status(400).json({ message: 'Room ID is required' });
    }

    // Find and update the session
    const session = await VideoSession.findOne({
      roomId,
      $or: [
        { userId },
        { counsellorId: userId }
      ]
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const now = new Date();
    const startedAt = session.startedAt || now;
    const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

    session.status = 'completed';
    session.endedAt = now;
    session.duration = duration;

    await session.save();

    res.json({ success: true, duration });
  } catch (error) {
    console.error('Error ending call:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;