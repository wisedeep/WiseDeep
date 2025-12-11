import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Counsellor from './models/Counsellor.js';
import Course from './models/Course.js';
import Note from './models/Note.js';
import dotenv from 'dotenv';

dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Counsellor.deleteMany({});
    await Course.deleteMany({});
    await Note.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const adminPassword = await bcrypt.hash('@#$WiseDeep123', 12);
    const admin = new User({
      firstName: 'WiseDeep',
      lastName: 'Admin',
      email: 'this.application.deep@gmail.com',
      password: adminPassword,
      role: 'admin',
    });
    await admin.save();
    console.log('Admin user created: this.application.deep@gmail.com');

    // Create counsellor users and profiles
    const counsellorsData = [
      {
        firstName: 'Dr. Sarah',
        lastName: 'Williams',
        email: 'sarah@wisedeep.com',
        password: 'counsellor123',
        role: 'counsellor',
        specialization: 'Christian Spiritual Guidance',
        credentials: 'PhD in Psychology, Certified Spiritual Counsellor',
        bio: 'With 12 years of experience helping individuals find peace through spiritual guidance and modern psychology.',
        experience: '12 years',
        isApproved: true,
        rating: 4.9,
        totalReviews: 320,
      },
      {
        firstName: 'Dr. Michael',
        lastName: 'Chen',
        email: 'michael@wisedeep.com',
        password: 'counsellor123',
        role: 'counsellor',
        specialization: 'Buddhist Counselling',
        credentials: 'MA in Buddhist Studies, Licensed Therapist',
        bio: 'Specializing in mindfulness-based therapy and Buddhist principles for mental wellness.',
        experience: '8 years',
        isApproved: true,
        rating: 4.7,
        totalReviews: 245,
      },
    ];

    for (const counsellorData of counsellorsData) {
      const counsellorPassword = await bcrypt.hash(counsellorData.password, 12);
      const user = new User({
        firstName: counsellorData.firstName,
        lastName: counsellorData.lastName,
        email: counsellorData.email,
        password: counsellorPassword,
        role: counsellorData.role,
      });
      await user.save();

      const counsellor = new Counsellor({
        user: user._id,
        specialization: counsellorData.specialization,
        credentials: counsellorData.credentials,
        bio: counsellorData.bio,
        experience: counsellorData.experience,
        isApproved: counsellorData.isApproved,
        rating: counsellorData.rating,
        totalReviews: counsellorData.totalReviews,
        availability: [
          { day: 'Monday', startTime: '09:00', endTime: '17:00' },
          { day: 'Wednesday', startTime: '10:00', endTime: '18:00' },
          { day: 'Friday', startTime: '09:00', endTime: '16:00' },
        ],
      });
      await counsellor.save();
    }
    console.log('Counsellor users and profiles created');

    // Create regular users
    const usersData = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'user123',
        role: 'user',
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        password: 'user123',
        role: 'user',
      },
    ];

    const users = [];
    for (const userData of usersData) {
      const userPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userPassword,
        role: userData.role,
      });
      await user.save();
      users.push(user);
    }
    console.log('Regular users created');

    // Create courses
    const coursesData = [
      {
        title: 'Introduction to Mindfulness Meditation',
        description: 'Learn the basics of mindfulness meditation and how it can help with daily stress management.',
        category: 'Meditation',
        instructor: 'Dr. Sarah Williams',
        duration: '4 weeks',
        modules: [
          {
            title: 'Understanding Mindfulness',
            content: 'Learn what mindfulness is and its benefits for mental health.',
            videoUrl: 'https://example.com/video1',
          },
          {
            title: 'Basic Breathing Techniques',
            content: 'Master fundamental breathing exercises for relaxation.',
            videoUrl: 'https://example.com/video2',
          },
          {
            title: 'Daily Practice Integration',
            content: 'How to incorporate mindfulness into your daily routine.',
            videoUrl: 'https://example.com/video3',
          },
        ],
        enrolledUsers: [users[0]._id],
        isPublished: true,
      },
      {
        title: 'Spiritual Growth Through Sacred Texts',
        description: 'Explore wisdom from Bhagavad Gita, Bible, and Quran for personal development.',
        category: 'Spiritual Studies',
        instructor: 'Dr. Michael Chen',
        duration: '6 weeks',
        modules: [
          {
            title: 'Introduction to Sacred Texts',
            content: 'Overview of major spiritual texts and their teachings.',
            videoUrl: 'https://example.com/video4',
          },
          {
            title: 'Applying Ancient Wisdom Today',
            content: 'How to apply timeless wisdom to modern challenges.',
            videoUrl: 'https://example.com/video5',
          },
        ],
        enrolledUsers: [users[1]._id],
        isPublished: true,
      },
    ];

    for (const courseData of coursesData) {
      const course = new Course(courseData);
      await course.save();
    }
    console.log('Courses created');

    // Create sample notes
    const notesData = [
      {
        user: users[0]._id,
        title: 'My First Meditation Experience',
        content: 'Today I tried mindfulness meditation for the first time. It was challenging to quiet my mind, but I felt more peaceful afterward. I need to practice consistency.',
        tags: ['meditation', 'mindfulness', 'beginner'],
        category: 'reflection',
      },
      {
        user: users[1]._id,
        title: 'Weekly Goals',
        content: 'This week I want to focus on: 1) Daily meditation practice 2) Reading Bhagavad Gita chapters 3) Journaling my thoughts 4) One counselling session',
        tags: ['goals', 'spirituality', 'progress'],
        category: 'goal',
      },
    ];

    for (const noteData of notesData) {
      const note = new Note(noteData);
      await note.save();
    }
    console.log('Sample notes created');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();