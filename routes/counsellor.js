import express from 'express';
import jwt from 'jsonwebtoken';
import Counsellor from '../models/Counsellor.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import Message from '../models/Message.js';
import { getCounsellorClientsAggregation } from '../utils/dbOptimization.js';
import { emitToUser } from '../utils/socketUtils.js';

const router = express.Router();


// Middleware to verify JWT and counsellor role
const authCounsellor = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    if (decoded.role !== 'counsellor') {
      return res.status(403).json({ message: 'Access denied' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Get counsellor dashboard data
router.get('/dashboard', authCounsellor, async (req, res) => {
  try {
    const counsellor = await Counsellor.findOne({ user: req.user.userId }).populate('user');
    if (!counsellor) {
      return res.status(404).json({ message: 'Counsellor profile not found' });
    }

    // Calculate real stats from database
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Total sessions
    const totalSessions = await Session.countDocuments({ counsellor: counsellor._id });

    // This month's sessions
    const thisMonthSessions = await Session.countDocuments({
      counsellor: counsellor._id,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // Active clients (unique clients with sessions in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSessions = await Session.find({
      counsellor: counsellor._id,
      date: { $gte: thirtyDaysAgo }
    }).distinct('user');
    const activeClients = recentSessions.length;

    res.json({
      counsellor: {
        name: `${counsellor.user.firstName} ${counsellor.user.lastName}`,
        specialization: counsellor.specialization,
        rating: counsellor.rating,
        totalReviews: counsellor.totalReviews,
      },
      stats: {
        totalSessions,
        thisMonth: thisMonthSessions,
        activeClients,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update counsellor availability
router.put('/availability', authCounsellor, async (req, res) => {
  try {
    const { availability } = req.body;
    const counsellor = await Counsellor.findOneAndUpdate(
      { user: req.user.userId },
      { availability },
      { new: true }
    );
    res.json(counsellor);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get counsellor's schedule
router.get('/schedule', authCounsellor, async (req, res) => {
  try {
    const counsellor = await Counsellor.findOne({ user: req.user.userId });
    res.json(counsellor?.availability || []);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get counsellor's clients - Optimized with aggregation
router.get('/clients', authCounsellor, async (req, res) => {
  try {
    const counsellor = await Counsellor.findOne({ user: req.user.userId });
    if (!counsellor) {
      return res.status(404).json({ message: 'Counsellor profile not found' });
    }

    // Use optimized aggregation pipeline
    const clients = await getCounsellorClientsAggregation(counsellor._id.toString());

    // Format for frontend
    const formattedClients = clients.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      lastSession: client.lastSession,
      totalSessions: client.totalSessions,
      nextSession: client.nextSession,
      status: 'active' // Could be calculated based on recent activity
    }));

    return res.json(formattedClients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get counsellor's upcoming sessions
router.get('/sessions/upcoming', authCounsellor, async (req, res) => {
  try {
    const counsellor = await Counsellor.findOne({ user: req.user.userId });
    if (!counsellor) {
      return res.status(404).json({ message: 'Counsellor profile not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessions = await Session.find({
      counsellor: counsellor._id,
      date: { $gte: today },
      status: 'scheduled'
    })
      .populate('user', 'firstName lastName')
      .sort({ date: 1, startTime: 1 })
      .limit(10); // Limit to next 10 sessions

    const formattedSessions = sessions
      .filter(session => session.user) // Filter out sessions where user is null (deleted)
      .map(session => ({
        id: session._id,
        client: `${session.user.firstName} ${session.user.lastName}`,
        time: `${session.startTime} - ${session.endTime}`,
        type: 'Video Call',
        status: session.status,
        date: session.date.toISOString().split('T')[0],
      }));

    res.json(formattedSessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get counsellor profile
router.get('/profile', authCounsellor, async (req, res) => {
  try {
    let counsellor = await Counsellor.findOne({ user: req.user.userId }).populate('user');
    const user = await User.findById(req.user.userId);

    if (!counsellor) {
      // Create counsellor profile if it doesn't exist (empty by default)
      counsellor = new Counsellor({
        user: req.user.userId,
        specialization: '',
        bio: '',
        experience: null,
        phone: '',
        availability: [],
        notifications: {},
        isApproved: false
      });
      await counsellor.save();
      counsellor = await Counsellor.findById(counsellor._id).populate('user');
    }

    // Combine counsellor and user data
    const profileData = {
      ...counsellor.toObject(),
      firstName: counsellor.user.firstName,
      lastName: counsellor.user.lastName,
      email: counsellor.user.email
    };

    res.json(profileData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update counsellor profile
router.put('/profile', authCounsellor, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, specialization, bio, experience, availability, notifications } = req.body;

    // Update User model with personal info
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { firstName, lastName, email },
      { new: true }
    );

    // Update Counsellor model with counsellor-specific info
    const counsellor = await Counsellor.findOneAndUpdate(
      { user: req.user.userId },
      { phone, specialization, bio, experience, availability, notifications },
      { new: true }
    ).populate('user');

    res.json(counsellor);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send message to client
router.post('/messages/send', authCounsellor, async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ message: 'Receiver ID and content are required' });
    }

    const counsellor = await Counsellor.findOne({ user: req.user.userId });
    if (!counsellor) {
      return res.status(404).json({ message: 'Counsellor profile not found' });
    }

    // Verify receiver is a client of this counsellor
    const hasSession = await Session.findOne({
      counsellor: counsellor._id,
      user: receiverId
    });

    if (!hasSession) {
      return res.status(403).json({ message: 'You can only message your clients' });
    }

    const message = new Message({
      sender: req.user.userId,
      receiver: receiverId,
      content,
      messageType: 'text'
    });

    await message.save();
    await message.populate('sender', 'firstName lastName');
    await message.populate('receiver', 'firstName lastName');

    // Emit real-time message to receiver (client)
    try {
      emitToUser(receiverId, 'receive-message', message);
      console.log('Message emitted to user:', receiverId);
    } catch (socketError) {
      console.error('Error emitting message to user:', socketError);
    }

    res.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get messages between counsellor and client
router.get('/messages/:clientId', authCounsellor, async (req, res) => {
  try {
    const { clientId } = req.params;
    const counsellor = await Counsellor.findOne({ user: req.user.userId });

    if (!counsellor) {
      return res.status(404).json({ message: 'Counsellor profile not found' });
    }

    // Verify client is associated with this counsellor
    const hasSession = await Session.findOne({
      counsellor: counsellor._id,
      user: clientId
    });

    if (!hasSession) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user.userId, receiver: clientId },
        { sender: clientId, receiver: req.user.userId }
      ]
    })
      .populate('sender', 'firstName lastName role')
      .populate('receiver', 'firstName lastName role')
      .sort({ sentAt: 1 });

    // Mark messages from client as read
    await Message.updateMany(
      { sender: clientId, receiver: req.user.userId, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all conversations (list of clients with latest message)
router.get('/conversations', authCounsellor, async (req, res) => {
  try {
    const counsellor = await Counsellor.findOne({ user: req.user.userId });
    if (!counsellor) {
      return res.status(404).json({ message: 'Counsellor profile not found' });
    }

    // Get all unique clients counsellor has sessions with
    const sessions = await Session.find({ counsellor: counsellor._id })
      .populate('user', 'firstName lastName email');

    const clientIds = [...new Set(sessions.map(s => s.user._id.toString()))];

    const conversations = await Promise.all(
      clientIds.map(async (clientId) => {
        const client = await User.findById(clientId);
        if (!client) return null;

        const latestMessage = await Message.findOne({
          $or: [
            { sender: req.user.userId, receiver: clientId },
            { sender: clientId, receiver: req.user.userId }
          ]
        })
          .populate('sender', 'firstName lastName')
          .sort({ sentAt: -1 });

        const unreadCount = await Message.countDocuments({
          sender: clientId,
          receiver: req.user.userId,
          read: false
        });

        return {
          client: {
            id: client._id,
            name: `${client.firstName} ${client.lastName}`,
            email: client.email
          },
          latestMessage,
          unreadCount
        };
      })
    );

    // Filter out null values and sort by latest message
    const validConversations = conversations.filter(c => c !== null);
    validConversations.sort((a, b) => {
      const aTime = a.latestMessage ? new Date(a.latestMessage.sentAt) : new Date(0);
      const bTime = b.latestMessage ? new Date(b.latestMessage.sentAt) : new Date(0);
      return bTime - aTime;
    });

    res.json(validConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});



// Add a new session (for counsellors to schedule sessions with clients)
router.post('/sessions', authCounsellor, async (req, res) => {
  try {
    const { client, date, time, type } = req.body;
    const counsellor = await Counsellor.findOne({ user: req.user.userId });

    if (!counsellor) {
      return res.status(404).json({ message: 'Counsellor profile not found' });
    }

    // Validate client exists and is associated with this counsellor
    const clientUser = await User.findById(client);
    if (!clientUser) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if client has had sessions with this counsellor
    const existingSession = await Session.findOne({
      counsellor: counsellor._id,
      user: client
    });

    if (!existingSession) {
      return res.status(403).json({ message: 'Can only schedule sessions with existing clients' });
    }

    // Parse date and time
    const sessionDate = new Date(date);
    const timeParts = time.split(' ');
    if (timeParts.length !== 2) {
      return res.status(400).json({ message: 'Invalid time format' });
    }

    const [timeStr, period] = timeParts;
    let [hours, minutes] = timeStr.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    sessionDate.setHours(hours, minutes, 0, 0);

    // Check counsellor's availability
    const dayOfWeek = sessionDate.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];

    const dayAvailability = counsellor.availability?.find(slot => slot.day === dayName);
    if (!dayAvailability) {
      return res.status(400).json({ message: 'Counsellor is not available on this day' });
    }

    // Check time is within availability
    const availStart = dayAvailability.startTime;
    const availEnd = dayAvailability.endTime;

    const [availStartHour, availStartMin] = availStart.split(':').map(Number);
    const [availEndHour, availEndMin] = availEnd.split(':').map(Number);

    const availStartTime = new Date(sessionDate);
    availStartTime.setHours(availStartHour, availStartMin, 0, 0);

    const availEndTime = new Date(sessionDate);
    availEndTime.setHours(availEndHour, availEndMin, 0, 0);

    if (sessionDate < availStartTime || sessionDate >= availEndTime) {
      return res.status(400).json({ message: 'Time is outside counsellor availability' });
    }

    // Check for conflicts
    const endDateTime = new Date(sessionDate.getTime() + 60 * 60 * 1000); // 1 hour

    const endHours = endDateTime.getHours();
    const endMinutes = endDateTime.getMinutes();
    const endPeriod = endHours >= 12 ? 'PM' : 'AM';
    let displayHours = endHours % 12;
    if (displayHours === 0) displayHours = 12;
    const endTime = `${displayHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')} ${endPeriod}`;

    const conflictingSession = await Session.findOne({
      counsellor: counsellor._id,
      date: {
        $gte: new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate()),
        $lt: new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate() + 1)
      },
      status: { $in: ['scheduled', 'confirmed'] },
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: time }
        }
      ]
    });

    if (conflictingSession) {
      return res.status(400).json({ message: 'This time slot conflicts with an existing session' });
    }

    // Create the session
    const session = new Session({
      user: client,
      counsellor: counsellor._id,
      date: sessionDate,
      startTime: time,
      endTime,
      duration: 60,
      status: 'scheduled'
    });

    await session.save();
    const populatedSession = await Session.findById(session._id).populate('user', 'firstName lastName');

    res.status(201).json(populatedSession);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get counsellor's sessions for a specific date (for conflict checking)
router.get('/sessions', authCounsellor, async (req, res) => {
  try {
    const { date } = req.query;
    const counsellor = await Counsellor.findOne({ user: req.user.userId });

    if (!counsellor) {
      return res.status(404).json({ message: 'Counsellor profile not found' });
    }

    let query = { counsellor: counsellor._id };

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      query.date = { $gte: startDate, $lt: endDate };
    } else if (req.query.startDate && req.query.endDate) {
      query.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const sessions = await Session.find(query).populate('user', 'firstName lastName');
    const validSessions = sessions.filter(session => session.user);
    res.json(validSessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get counsellor's schedule stats
router.get('/schedule-stats', authCounsellor, async (req, res) => {
  try {
    const counsellor = await Counsellor.findOne({ user: req.user.userId });

    if (!counsellor) {
      return res.status(404).json({ message: 'Counsellor profile not found' });
    }

    // Sessions today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sessionsToday = await Session.countDocuments({
      counsellor: counsellor._id,
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ['scheduled', 'confirmed', 'completed'] }
    });

    // Sessions this week (7 days from today)
    const weekStart = new Date(today);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const sessionsThisWeek = await Session.countDocuments({
      counsellor: counsellor._id,
      date: { $gte: weekStart, $lt: weekEnd },
      status: { $in: ['scheduled', 'confirmed', 'completed'] }
    });

    // Calculate available hours this week
    let totalAvailableHours = 0;
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(currentDate.getDate() + i);
      const dayName = daysOfWeek[currentDate.getDay()];

      const dayAvailability = counsellor.availability?.find(slot => slot.day === dayName);
      if (dayAvailability) {
        const [startHour, startMin] = dayAvailability.startTime.split(':').map(Number);
        const [endHour, endMin] = dayAvailability.endTime.split(':').map(Number);

        const startTime = startHour + (startMin / 60);
        const endTime = endHour + (endMin / 60);
        const hoursForDay = endTime - startTime;

        // Subtract booked hours for this day
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const bookedSessions = await Session.find({
          counsellor: counsellor._id,
          date: { $gte: dayStart, $lt: dayEnd },
          status: { $in: ['scheduled', 'confirmed', 'completed'] }
        });

        // Each session is assumed to be 1 hour
        const bookedHours = bookedSessions.length;
        totalAvailableHours += Math.max(0, hoursForDay - bookedHours);
      }
    }

    res.json({
      sessionsToday,
      sessionsThisWeek,
      availableHours: Math.round(totalAvailableHours * 10) / 10
    });
  } catch (error) {
    console.error('Error fetching schedule stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reschedule a session (for counsellors)
router.put('/sessions/:id/reschedule', authCounsellor, async (req, res) => {
  try {
    const { date, startTime, duration } = req.body;
    const counsellor = await Counsellor.findOne({ user: req.user.userId });

    if (!counsellor) {
      return res.status(404).json({ message: 'Counsellor profile not found' });
    }

    const session = await Session.findOne({
      _id: req.params.id,
      counsellor: counsellor._id
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status !== 'scheduled') {
      return res.status(400).json({ message: 'Only scheduled sessions can be rescheduled' });
    }

    // Validate date format
    let dateObj;
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = new Date(date);
    }

    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Parse startTime and calculate endTime
    const timeParts = startTime.split(' ');
    if (timeParts.length !== 2) {
      return res.status(400).json({ message: 'Invalid startTime format' });
    }

    const [time, period] = timeParts;
    let [hours, minutes] = time.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 12 || minutes < 0 || minutes > 59) {
      return res.status(400).json({ message: 'Invalid time format' });
    }

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const startDateTime = new Date(dateObj);
    startDateTime.setHours(hours, minutes, 0, 0);

    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);

    const endHours = endDateTime.getHours();
    const endMinutes = endDateTime.getMinutes();
    const endPeriod = endHours >= 12 ? 'PM' : 'AM';
    let displayHours = endHours % 12;
    if (displayHours === 0) displayHours = 12;
    const endTime = `${displayHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')} ${endPeriod}`;

    // Check counsellor's availability
    const dayOfWeek = dateObj.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];

    const dayAvailability = counsellor.availability?.find(slot => slot.day === dayName);
    if (!dayAvailability) {
      return res.status(400).json({ message: 'Counsellor is not available on this day' });
    }

    // Check time is within availability
    const availStart = dayAvailability.startTime;
    const availEnd = dayAvailability.endTime;

    const [availStartHour, availStartMin] = availStart.split(':').map(Number);
    const [availEndHour, availEndMin] = availEnd.split(':').map(Number);

    const availStartTime = new Date(dateObj);
    availStartTime.setHours(availStartHour, availStartMin, 0, 0);

    const availEndTime = new Date(dateObj);
    availEndTime.setHours(availEndHour, availEndMin, 0, 0);

    if (startDateTime < availStartTime || endDateTime > availEndTime) {
      return res.status(400).json({ message: 'Time is outside counsellor availability' });
    }

    // Check for conflicts (excluding the current session)
    const conflictingSession = await Session.findOne({
      counsellor: counsellor._id,
      date: {
        $gte: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
        $lt: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1)
      },
      status: { $in: ['scheduled', 'confirmed'] },
      _id: { $ne: session._id }, // Exclude current session
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    });

    if (conflictingSession) {
      return res.status(400).json({ message: 'This time slot conflicts with an existing session' });
    }

    // Update session
    session.date = dateObj;
    session.startTime = startTime;
    session.endTime = endTime;
    session.duration = duration;

    await session.save();

    const populatedSession = await Session.findById(session._id).populate('user', 'firstName lastName');

    res.json(populatedSession);
  } catch (error) {
    console.error('Error rescheduling session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cancel a session (for counsellors)
router.put('/sessions/:id/cancel', authCounsellor, async (req, res) => {
  try {
    const counsellor = await Counsellor.findOne({ user: req.user.userId });
    if (!counsellor) {
      return res.status(404).json({ message: 'Counsellor profile not found' });
    }

    const session = await Session.findOne({
      _id: req.params.id,
      counsellor: counsellor._id
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.status = 'cancelled';
    await session.save();

    // Emit real-time update if needed
    if (session.user) {
      emitToUser(session.user.toString(), 'session-cancelled', session);
    }

    res.json(session);
  } catch (error) {
    console.error('Error cancelling session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;