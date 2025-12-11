import User from '../models/User.js';
import Course from '../models/Course.js';
import Counsellor from '../models/Counsellor.js';
import Session from '../models/Session.js';

import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Middleware to verify JWT and admin role
const authAdmin = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Ensure uploads directory exists
const uploadsDir = './uploads';
const videosDir = './uploads/videos';
const pdfsDir = './uploads/pdfs';

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir);
if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, videosDir);
    } else if (file.mimetype === 'application/pdf') {
      cb(null, pdfsDir);
    } else {
      cb(new Error('Invalid file type'), null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only video and PDF files are allowed'));
    }
  }
});

// Get all users
router.get('/users', authAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all courses
router.get('/courses', authAdmin, async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new course
router.post('/courses', authAdmin, async (req, res) => {
  try {
    const { title, description, category, instructor, duration, isPublished } = req.body;
    console.log('Creating course with data:', { title, description, category, instructor, duration, isPublished });

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Title, description, and category are required' });
    }

    const course = new Course({
      title,
      description,
      category,
      instructor: instructor || '',
      duration: duration || '',
      isPublished: isPublished !== undefined ? isPublished : true,
      createdBy: req.user.userId,
      creatorRole: 'admin',
      approvalStatus: 'approved'
    });

    console.log('Course object created, attempting to save...');
    const savedCourse = await course.save();
    console.log('Course saved successfully:', savedCourse._id);
    res.status(201).json(savedCourse);
  } catch (error) {
    console.error('Error creating course:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.errors) {
      console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single course with modules
router.get('/courses/:id', authAdmin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a course
router.put('/courses/:id', authAdmin, async (req, res) => {
  try {
    const { title, description, category, instructor, duration, isPublished } = req.body;

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { title, description, category, instructor, duration, isPublished },
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a course
router.delete('/courses/:id', authAdmin, async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add module to course
router.post('/courses/:courseId/modules', authAdmin, async (req, res) => {
  try {
    const { title, description } = req.body;
    const { courseId } = req.params;

    if (!title) {
      return res.status(400).json({ message: 'Module title is required' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Add new module
    course.modules.push({
      title,
      description: description || '',
      order: course.modules.length
    });

    await course.save();

    const newModule = course.modules[course.modules.length - 1];
    res.status(201).json({ message: 'Module added successfully', module: newModule });
  } catch (error) {
    console.error('Error adding module:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete module from course
router.delete('/courses/:courseId/modules/:moduleId', authAdmin, async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const module = course.modules.id(moduleId);
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    // Delete associated files if they exist
    if (module.video && module.video.url) {
      const videoPath = path.join('.', module.video.url);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }

    if (module.pdf && module.pdf.url) {
      const pdfPath = path.join('.', module.pdf.url);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }

    module.deleteOne();
    await course.save();

    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Error deleting module:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Approve counsellor
router.put('/counsellors/:id/approve', authAdmin, async (req, res) => {
  try {
    const counsellor = await Counsellor.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
    res.json(counsellor);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject counsellor
router.put('/counsellors/:id/reject', authAdmin, async (req, res) => {
  try {
    const counsellor = await Counsellor.findByIdAndDelete(req.params.id);
    if (!counsellor) {
      return res.status(404).json({ message: 'Counsellor not found' });
    }
    res.json({ message: 'Counsellor application rejected and removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all counsellors for approval
router.get('/counsellors', authAdmin, async (req, res) => {
  try {
    const counsellors = await Counsellor.find().populate('user', 'firstName lastName email');
    res.json(counsellors);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user status (activate/deactivate)
router.put('/users/:id/status', authAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all sessions
router.get('/sessions', authAdmin, async (req, res) => {
  try {
    const sessions = await Session.find()
      .populate('user', 'firstName lastName email')
      .populate({
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

// Get admin dashboard stats
router.get('/dashboard-stats', authAdmin, async (req, res) => {
  try {
    // Get real statistics from database
    const totalUsers = await User.countDocuments();
    const activeCounsellors = await Counsellor.countDocuments({ isApproved: true });
    const totalCourses = await Course.countDocuments({ isPublished: true });

    // Sessions today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sessionsToday = await Session.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ['scheduled', 'confirmed', 'completed'] }
    });

    // Pending counsellors for approval
    const pendingCounsellors = await Counsellor.countDocuments({ isApproved: false });

    // Recent user growth (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      totalUsers,
      activeCounsellors,
      totalCourses,
      sessionsToday,
      pendingCounsellors,
      newUsersThisMonth
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get pending counsellor approvals for dashboard
router.get('/pending-approvals', authAdmin, async (req, res) => {
  try {
    const pendingCounsellors = await Counsellor.find({ isApproved: false })
      .populate('user', 'firstName lastName')
      .limit(5); // Limit to 5 for dashboard

    const formattedApprovals = pendingCounsellors.map(counsellor => ({
      id: counsellor._id,
      name: `${counsellor.user.firstName} ${counsellor.user.lastName}`,
      specialization: counsellor.specialization || 'Not specified',
      experience: counsellor.experience || 'Not specified',
      date: counsellor.createdAt ? new Date(counsellor.createdAt).toLocaleDateString() : 'N/A'
    }));

    res.json(formattedApprovals);
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload video to course module
router.post('/courses/:courseId/modules/:moduleId/upload-video', authAdmin, upload.single('video'), async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      // Delete uploaded file if course not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Course not found' });
    }

    const module = course.modules.id(moduleId);
    if (!module) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Module not found' });
    }

    // Delete old video if exists
    if (module.video && module.video.url) {
      const oldPath = path.join('.', module.video.url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Update module with new video
    module.video = {
      url: `/uploads/videos/${req.file.filename}`,
      fileId: req.file.filename,
      size: req.file.size,
      format: req.file.mimetype
    };

    await course.save();
    res.json({ message: 'Video uploaded successfully', video: module.video });
  } catch (error) {
    console.error('Error uploading video:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload PDF to course module
router.post('/courses/:courseId/modules/:moduleId/upload-pdf', authAdmin, upload.single('pdf'), async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Course not found' });
    }

    const module = course.modules.id(moduleId);
    if (!module) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Module not found' });
    }

    // Delete old PDF if exists
    if (module.pdf && module.pdf.url) {
      const oldPath = path.join('.', module.pdf.url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Update module with new PDF
    module.pdf = {
      url: `/uploads/pdfs/${req.file.filename}`,
      fileId: req.file.filename,
      fileName: req.file.originalname,
      size: req.file.size
    };

    await course.save();
    res.json({ message: 'PDF uploaded successfully', pdf: module.pdf });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete video from module
router.delete('/courses/:courseId/modules/:moduleId/video', authAdmin, async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const module = course.modules.id(moduleId);
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    if (module.video && module.video.url) {
      const filePath = path.join('.', module.video.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      module.video = undefined;
      await course.save();
      res.json({ message: 'Video deleted successfully' });
    } else {
      res.status(404).json({ message: 'No video found' });
    }
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete PDF from module
router.delete('/courses/:courseId/modules/:moduleId/pdf', authAdmin, async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const module = course.modules.id(moduleId);
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    if (module.pdf && module.pdf.url) {
      const filePath = path.join('.', module.pdf.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      module.pdf = undefined;
      await course.save();
      res.json({ message: 'PDF deleted successfully' });
    } else {
      res.status(404).json({ message: 'No PDF found' });
    }
  } catch (error) {
    console.error('Error deleting PDF:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;