import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Counsellor from '../models/Counsellor.js';

dotenv.config();

const checkCounsellor = async () => {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // ID from user logs
        const id = '693a9cf7473e381b6f24bcc8';
        // Note: If this ID is invalid hex, mongoose will throw. 
        // If it's valid hex but not found, it returns null.
        // The logs showed a 24 char hex, so likely valid format.

        // If ID is just 693a9cf... (short), it's truncated? 
        // Wait, log said: 693a9cf7473e381b6f24bcc8. That is 24 chars.

        // Find FIRST counsellor if specific ID fails/is mock
        const counsellor = await Counsellor.findOne();

        if (counsellor) {
            console.log('📋 Counsellor Found:');
            console.log('ID:', counsellor._id);
            console.log('Is Approved:', counsellor.isApproved);
            console.log('Availability:', JSON.stringify(counsellor.availability, null, 2));
        } else {
            console.log('❌ No counsellors found in database.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking counsellor:', error);
        process.exit(1);
    }
};

checkCounsellor();
