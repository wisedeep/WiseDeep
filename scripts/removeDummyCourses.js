import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from '../models/Course.js';

dotenv.config();

const removeDummyCourses = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // List of dummy/hardcoded course titles to remove
        const dummyCourseTitles = [
            'Mindfulness & Meditation',
            'Bhagavad Gita Wisdom',
            'Stress Management',
            'Anxiety Relief',
            'Depression Support',
            'Spiritual Awakening',
            'Yoga for Mental Health',
            'Meditation Basics',
            'Inner Peace Journey',
            'Emotional Wellness'
        ];

        // Find all courses
        const allCourses = await Course.find({});
        console.log(`\nTotal courses in database: ${allCourses.length}`);

        // Show all course titles
        console.log('\nAll courses:');
        allCourses.forEach((course, index) => {
            console.log(`${index + 1}. ${course.title} (ID: ${course._id})`);
        });

        // Find dummy courses
        const dummyCourses = await Course.find({
            title: { $in: dummyCourseTitles }
        });

        console.log(`\nFound ${dummyCourses.length} dummy courses to remove:`);
        dummyCourses.forEach(course => {
            console.log(`- ${course.title} (ID: ${course._id})`);
        });

        // Delete dummy courses
        if (dummyCourses.length > 0) {
            const result = await Course.deleteMany({
                title: { $in: dummyCourseTitles }
            });
            console.log(`\n✅ Deleted ${result.deletedCount} dummy courses`);
        } else {
            console.log('\n✅ No dummy courses found to delete');
        }

        // Show remaining courses
        const remainingCourses = await Course.find({});
        console.log(`\n📚 Remaining courses: ${remainingCourses.length}`);
        remainingCourses.forEach((course, index) => {
            console.log(`${index + 1}. ${course.title} (ID: ${course._id})`);
        });

        mongoose.connection.close();
        console.log('\n✅ Database cleanup completed!');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

removeDummyCourses();
