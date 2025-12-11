import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Counsellor from '../models/Counsellor.js';

dotenv.config();

const updateAvailability = async () => {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const newAvailability = days.map(day => ({
            day,
            startTime: '09:00', // 9 AM
            endTime: '17:00'    // 5 PM
        }));

        console.log('🔄 Updating all counsellors availability to 7 days a week (9-5)...');

        const result = await Counsellor.updateMany(
            {}, // Match all
            {
                $set: {
                    availability: newAvailability,
                    isApproved: true // Ensure approved too
                }
            }
        );

        console.log(`✅ Successfully updated availability!`);
        console.log(`📊 Matched count: ${result.matchedCount}`);
        console.log(`✏️  Modified count: ${result.modifiedCount}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating availability:', error);
        process.exit(1);
    }
};

updateAvailability();
