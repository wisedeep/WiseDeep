import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Session from '../models/Session.js';
import Note from '../models/Note.js';
import Counsellor from '../models/Counsellor.js';
import Message from '../models/Message.js';
import {
  parseTime12Hour,
  calculateEndTime,
  parseDateString,
  isDateInPast,
  getDayName,
  parseAvailabilityTime,
  isTimeInRange
} from '../utils/timeUtils.js';
import { sessionBookingSchema, validateData } from '../utils/validationSchemas.js';
import { emitToCounsellor, emitToUser } from '../utils/socketUtils.js';

const router = express.Router();


// Middleware to verify JWT
const authUser = (req, res, next) => {
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

// Get user profile
router.get('/profile', authUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', authUser, async (req, res) => {
  try {
    const { firstName, lastName, email, username, bio } = req.body;
    const updateData = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (username !== undefined) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all published courses
router.get('/courses', authUser, async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get published courses for public display
router.get('/courses/public', async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Enroll in a course
router.post('/courses/:courseId/enroll', authUser, async (req, res) => {
  try {
    console.log('Enrollment request for course:', req.params.courseId, 'by user:', req.user.userId);

    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Initialize enrolledUsers array if it doesn't exist
    if (!course.enrolledUsers) {
      course.enrolledUsers = [];
    }

    // Check if user is already enrolled
    if (!course.enrolledUsers.includes(req.user.userId)) {
      course.enrolledUsers.push(req.user.userId);
      await course.save();
      console.log('User enrolled successfully');
    } else {
      console.log('User already enrolled');
    }

    res.json({ message: 'Successfully enrolled in course' });
  } catch (error) {
    console.error('Enrollment error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user notes
router.get('/notes', authUser, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user.userId });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new note
router.post('/notes', authUser, async (req, res) => {
  try {
    const { title, content } = req.body;
    const note = new Note({
      title,
      content,
      user: req.user.userId
    });
    await note.save();
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update note
router.put('/notes/:id', authUser, async (req, res) => {
  try {
    const { title, content } = req.body;
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { title, content },
      { new: true }
    );
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete note
router.delete('/notes/:id', authUser, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user.userId });
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Book session - Refactored with utility functions
router.post('/sessions', authUser, async (req, res) => {
  try {
    const { counsellor, date, startTime, duration } = req.body;

    // Validate input using Zod schema
    const validation = validateData(sessionBookingSchema, { counsellor, date, startTime, duration });
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Validate counsellor ObjectId
    if (!mongoose.Types.ObjectId.isValid(counsellor)) {
      return res.status(400).json({ message: 'Invalid counsellor ID' });
    }

    // Check if counsellor exists and is approved
    const counsellorDoc = await Counsellor.findById(counsellor);
    if (!counsellorDoc || !counsellorDoc.isApproved) {
      return res.status(404).json({ message: 'Counsellor not found or not available' });
    }

    // Parse and validate date
    // After Zod validation, date might already be a Date object
    let dateObj;
    if (date instanceof Date) {
      dateObj = date;
    } else {
      const dateValidation = parseDateString(date);
      if (!dateValidation.isValid) {
        return res.status(400).json({ message: dateValidation.error });
      }
      dateObj = dateValidation.date;
    }

    // Check if date is in the past
    if (isDateInPast(dateObj)) {
      return res.status(400).json({ message: 'Cannot book sessions in the past' });
    }

    // Parse and validate start time
    const timeValidation = parseTime12Hour(startTime);
    if (!timeValidation.isValid) {
      return res.status(400).json({ message: timeValidation.error });
    }

    // Calculate end time
    const endTimeCalc = calculateEndTime(dateObj, startTime, duration);
    if (!endTimeCalc.isValid) {
      return res.status(400).json({ message: endTimeCalc.error });
    }
    const { endDateTime, endTimeString: endTime } = endTimeCalc;

    // Create start date time for availability checking
    const startDateTime = new Date(dateObj);
    startDateTime.setHours(timeValidation.hours, timeValidation.minutes, 0, 0);

    // Check counsellor availability for this day
    const dayName = getDayName(dateObj);
    const dayAvailability = counsellorDoc.availability?.find(slot => slot.day === dayName);

    if (!dayAvailability) {
      return res.status(400).json({ message: `Counsellor is not available on ${dayName}` });
    }

    // Check if requested time falls within counsellor's availability
    const availStartTime = parseAvailabilityTime(dateObj, dayAvailability.startTime);
    const availEndTime = parseAvailabilityTime(dateObj, dayAvailability.endTime);

    if (!isTimeInRange(startDateTime, endDateTime, availStartTime, availEndTime)) {
      return res.status(400).json({
        message: `Requested time is outside counsellor availability (${dayAvailability.startTime} - ${dayAvailability.endTime})`
      });
    }

    // Check for conflicting sessions
    const conflictingSession = await Session.findOne({
      counsellor,
      date: {
        $gte: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
        $lt: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1)
      },
      status: { $in: ['scheduled', 'confirmed'] },
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    });

    if (conflictingSession) {
      return res.status(400).json({ message: 'This time slot is already booked' });
    }

    // Create session
    const session = new Session({
      user: req.user.userId,
      counsellor,
      date: dateObj,
      startTime,
      endTime,
      duration
    });

    await session.save();

    // Emit real-time notification to counsellor
    try {
      emitToCounsellor(counsellor, 'session-booked', {
        counsellorId: counsellor,
        sessionId: session._id,
        userId: req.user.userId,
        date: dateObj,
        startTime,
        duration
      });
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
      // We don't fail the request if socket emission fails
    }

    // Return populated session
    const populatedSession = await Session.findById(session._id).populate({
      path: 'counsellor',
      populate: {
        path: 'user',
        select: 'firstName lastName'
      }
    });

    res.json(populatedSession);
  } catch (error) {
    console.error('Error booking session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// Get enrolled courses
router.get('/courses/enrolled', authUser, async (req, res) => {
  try {
    const courses = await Course.find({ enrolledUsers: req.user.userId });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single course details
router.get('/courses/:courseId', authUser, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user sessions
router.get('/sessions', authUser, async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user.userId }).populate({
      path: 'counsellor',
      populate: {
        path: 'user',
        select: 'firstName lastName'
      }
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel session
router.put('/sessions/:id/cancel', authUser, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, user: req.user.userId });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (session.status !== 'scheduled') {
      return res.status(400).json({ message: 'Only scheduled sessions can be cancelled' });
    }
    session.status = 'cancelled';
    await session.save();
    res.json({ message: 'Session cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reschedule session
router.put('/sessions/:id/reschedule', authUser, async (req, res) => {
  try {
    const { date, startTime, duration } = req.body;

    // Validate required fields
    if (!date || !startTime || !duration) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const session = await Session.findOne({ _id: req.params.id, user: req.user.userId });
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

    // Parse startTime and calculate endTime (reuse logic from booking)
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

    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    const endHours = endDateTime.getHours();
    const endMinutes = endDateTime.getMinutes();
    const endPeriod = endHours >= 12 ? 'PM' : 'AM';
    let displayHours = endHours % 12;
    if (displayHours === 0) displayHours = 12;
    const endTime = `${displayHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')} ${endPeriod}`;

    // Update session
    session.date = dateObj;
    session.startTime = startTime;
    session.endTime = endTime;
    session.duration = duration;

    await session.save();

    const populatedSession = await Session.findById(session._id).populate({
      path: 'counsellor',
      populate: {
        path: 'user',
        select: 'firstName lastName'
      }
    });

    res.json(populatedSession);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get approved counsellors
router.get('/counsellors', authUser, async (req, res) => {
  try {
    const counsellors = await Counsellor.find({ isApproved: true }).populate('user', 'firstName lastName');
    res.json(counsellors);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available time slots for a counsellor on a specific date
router.get('/counsellors/:counsellorId/availability', authUser, async (req, res) => {
  try {
    const { counsellorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    // Validate counsellor exists and is approved
    const counsellor = await Counsellor.findById(counsellorId);
    if (!counsellor || !counsellor.isApproved) {
      return res.status(404).json({ message: 'Counsellor not found' });
    }

    // Parse the requested date
    const requestedDate = new Date(date);
    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Get the day of the week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = requestedDate.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];

    // Find counsellor's availability for this day
    const dayAvailability = counsellor.availability?.find(slot => slot.day === dayName);

    if (!dayAvailability) {
      return res.json({ availableSlots: [] }); // No availability for this day
    }

    // Get existing bookings for this date and counsellor
    const existingSessions = await Session.find({
      counsellor: counsellorId,
      date: {
        $gte: new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate()),
        $lt: new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate() + 1)
      },
      status: { $in: ['scheduled', 'confirmed'] } // Only consider active bookings
    });

    // Generate all possible 1-hour slots within the counsellor's availability
    const availableSlots = [];
    const startTime = dayAvailability.startTime; // e.g., "09:00"
    const endTime = dayAvailability.endTime; // e.g., "17:00"

    // Parse start and end times
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    let currentHour = startHour;
    let currentMinute = startMinute;

    // Generate slots in 12-hour format with AM/PM
    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      // Format time slot
      let displayHour = currentHour % 12;
      if (displayHour === 0) displayHour = 12;
      const period = currentHour >= 12 ? 'PM' : 'AM';
      const timeSlot = `${displayHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')} ${period}`;

      // Check if this slot conflicts with existing sessions
      const slotStart = new Date(requestedDate);
      slotStart.setHours(currentHour, currentMinute, 0, 0);

      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000); // 1 hour later

      let isAvailable = true;
      for (const session of existingSessions) {
        // Parse session times
        const sessionTimeParts = session.startTime.split(' ');
        if (sessionTimeParts.length === 2) {
          const [time, sessionPeriod] = sessionTimeParts;
          let [sessionHour, sessionMinute] = time.split(':').map(Number);

          if (sessionPeriod === 'PM' && sessionHour !== 12) sessionHour += 12;
          if (sessionPeriod === 'AM' && sessionHour === 12) sessionHour = 0;

          const sessionStart = new Date(requestedDate);
          sessionStart.setHours(sessionHour, sessionMinute, 0, 0);
          const sessionEnd = new Date(sessionStart.getTime() + session.duration * 60 * 1000);

          // Check for overlap
          if (slotStart < sessionEnd && slotEnd > sessionStart) {
            isAvailable = false;
            break;
          }
        }
      }

      if (isAvailable) {
        availableSlots.push(timeSlot);
      }

      // Move to next hour
      const nextDate = new Date(requestedDate);
      nextDate.setHours(currentHour + 1, currentMinute, 0, 0);
      currentHour = nextDate.getHours();
      // Minute stays the same
    }

    res.json({ availableSlots });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// AI Chat endpoint
router.post('/ai-chat', authUser, async (req, res) => {
  console.log("🔥 AI Chat endpoint hit");

  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Message is required' });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('❌ GOOGLE_API_KEY missing from environment variables');
      return res.status(500).json({ message: 'AI service configuration error: API Key missing' });
    }

    console.log("🤖 Initializing Gemini AI...");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = `You are an AI spiritual counsellor trained in the wisdom of the Bhagavad Gita, Vedas, Quran, Bible, and modern psychology. 
    Provide guidance, support, and counseling to users seeking spiritual and emotional well-being.
    Be compassionate, non-judgmental, draw from scriptures and psychology, and respect all traditions.`;

    console.log("📤 Sending request to Gemini...");
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [{ text: "Understood. I am ready to provide compassionate spiritual guidance based on these principles." }],
        },
      ],
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    console.log("✅ Gemini response received");
    res.json({ message: responseText });

  } catch (error) {
    console.error("❌ AI Chat Route Error:", error);

    // Check for specific error types
    if (error.message?.includes('API_KEY_INVALID')) {
      return res.status(500).json({ message: "Invalid API Key. Please check your configuration." });
    }

    if (error.message?.includes('SAFETY')) {
      return res.status(400).json({ message: "I'm sorry, I cannot respond to that message due to safety guidelines." });
    }

    res.status(500).json({
      message: "AI service error. Please try again later.",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get messages between user and counsellor
router.get('/messages/:counsellorId', authUser, async (req, res) => {
  try {
    const { counsellorId } = req.params;

    // Verify counsellor exists
    const counsellor = await Counsellor.findById(counsellorId);
    if (!counsellor) {
      return res.status(404).json({ message: 'Counsellor not found' });
    }

    // Verify user has sessions with this counsellor
    const hasSession = await Session.findOne({
      user: req.user.userId,
      counsellor: counsellorId
    });

    if (!hasSession) {
      return res.status(403).json({ message: 'You can only message counsellors you have sessions with' });
    }

    // Get counsellor's user ID
    const counsellorUser = await User.findById(counsellor.user);
    if (!counsellorUser) {
      return res.status(404).json({ message: 'Counsellor user not found' });
    }

    // Fetch messages
    const messages = await Message.find({
      $or: [
        { sender: req.user.userId, receiver: counsellorUser._id },
        { sender: counsellorUser._id, receiver: req.user.userId }
      ]
    })
      .populate('sender', 'firstName lastName role')
      .populate('receiver', 'firstName lastName role')
      .sort({ sentAt: 1 });

    // Mark messages from counsellor as read
    await Message.updateMany(
      { sender: counsellorUser._id, receiver: req.user.userId, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send message to counsellor
router.post('/messages/send', authUser, async (req, res) => {
  try {
    const { counsellorId, content } = req.body;

    if (!counsellorId || !content) {
      return res.status(400).json({ message: 'Counsellor ID and content are required' });
    }

    // Verify counsellor exists
    const counsellor = await Counsellor.findById(counsellorId);
    if (!counsellor) {
      return res.status(404).json({ message: 'Counsellor not found' });
    }

    // Verify user has sessions with this counsellor
    const hasSession = await Session.findOne({
      user: req.user.userId,
      counsellor: counsellorId
    });

    if (!hasSession) {
      return res.status(403).json({ message: 'You can only message counsellors you have sessions with' });
    }

    // Get counsellor's user ID
    const counsellorUser = await User.findById(counsellor.user);
    if (!counsellorUser) {
      return res.status(404).json({ message: 'Counsellor user not found' });
    }

    // Create message
    const message = new Message({
      sender: req.user.userId,
      receiver: counsellorUser._id,
      content,
      messageType: 'text'
    });

    await message.save();
    await message.populate('sender', 'firstName lastName');
    await message.populate('receiver', 'firstName lastName');

    // Emit real-time notification to counsellor
    try {
      emitToUser(counsellorUser._id.toString(), 'receive-message', message);
      console.log('Message emitted to counsellor:', counsellorUser._id.toString());
    } catch (socketError) {
      console.error('Error emitting message to counsellor:', socketError);
    }

    res.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all conversations (list of counsellors with latest message)
router.get('/conversations', authUser, async (req, res) => {
  try {
    // Get all unique counsellors user has sessions with
    const sessions = await Session.find({ user: req.user.userId })
      .populate({
        path: 'counsellor',
        populate: {
          path: 'user',
          select: 'firstName lastName email'
        }
      });

    const counsellorIds = [...new Set(sessions.map(s => s.counsellor._id.toString()))];

    const conversations = await Promise.all(
      counsellorIds.map(async (counsellorId) => {
        const counsellor = await Counsellor.findById(counsellorId).populate('user', 'firstName lastName email');
        if (!counsellor || !counsellor.user) return null;

        const counsellorUserId = counsellor.user._id;

        const latestMessage = await Message.findOne({
          $or: [
            { sender: req.user.userId, receiver: counsellorUserId },
            { sender: counsellorUserId, receiver: req.user.userId }
          ]
        })
          .populate('sender', 'firstName lastName')
          .sort({ sentAt: -1 });

        const unreadCount = await Message.countDocuments({
          sender: counsellorUserId,
          receiver: req.user.userId,
          read: false
        });

        return {
          counsellor: {
            id: counsellor._id,
            name: `${counsellor.user.firstName} ${counsellor.user.lastName}`,
            email: counsellor.user.email,
            specialization: counsellor.specialization
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

// Course Review Endpoints

// Submit a review for a course
router.post('/courses/:courseId/reviews', authUser, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, comment } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is enrolled
    if (!course.enrolledUsers.includes(req.user.userId)) {
      return res.status(403).json({ message: 'You must be enrolled in this course to review it' });
    }

    // Import CourseReview model
    const CourseReview = (await import('../models/CourseReview.js')).default;

    // Check if user already reviewed this course
    const existingReview = await CourseReview.findOne({
      course: courseId,
      user: req.user.userId
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this course. Use PUT to update your review.' });
    }

    // Create review
    const review = new CourseReview({
      course: courseId,
      user: req.user.userId,
      rating,
      comment: comment || ''
    });

    await review.save();

    // Update course rating statistics
    const reviews = await CourseReview.find({ course: courseId });
    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    course.averageRating = averageRating;
    course.totalReviews = totalReviews;
    await course.save();

    // Populate user details for response
    await review.populate('user', 'firstName lastName');

    res.status(201).json(review);
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all reviews for a course
router.get('/courses/:courseId/reviews', async (req, res) => {
  try {
    const { courseId } = req.params;

    const CourseReview = (await import('../models/CourseReview.js')).default;

    const reviews = await CourseReview.find({ course: courseId })
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update own review
router.put('/reviews/:reviewId', authUser, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    // Validate rating
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const CourseReview = (await import('../models/CourseReview.js')).default;

    const review = await CourseReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check ownership
    if (review.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You can only edit your own reviews' });
    }

    // Update review
    if (rating) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    await review.save();

    // Recalculate course rating
    const reviews = await CourseReview.find({ course: review.course });
    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    await Course.findByIdAndUpdate(review.course, {
      averageRating,
      totalReviews
    });

    await review.populate('user', 'firstName lastName');
    res.json(review);
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete own review
router.delete('/reviews/:reviewId', authUser, async (req, res) => {
  try {
    const { reviewId } = req.params;

    const CourseReview = (await import('../models/CourseReview.js')).default;

    const review = await CourseReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check ownership
    if (review.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You can only delete your own reviews' });
    }

    const courseId = review.course;
    await review.deleteOne();

    // Recalculate course rating
    const reviews = await CourseReview.find({ course: courseId });
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    await Course.findByIdAndUpdate(courseId, {
      averageRating,
      totalReviews
    });

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;