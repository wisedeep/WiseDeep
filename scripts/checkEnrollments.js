import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from '../models/Course.js';

dotenv.config();

const checkEnrollments = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const courses = await Course.find({});

        console.log('=== COURSE ENROLLMENT STATUS ===\n');

        courses.forEach((course, index) => {
            console.log(`${index + 1}. Course: ${course.title}`);
            console.log(`   ID: ${course._id}`);
            console.log(`   Enrolled Users: ${course.enrolledUsers ? course.enrolledUsers.length : 0}`);
            if (course.enrolledUsers && course.enrolledUsers.length > 0) {
                console.log(`   User IDs: ${course.enrolledUsers.join(', ')}`);
            }
            console.log('');
        });

        mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkEnrollments();
