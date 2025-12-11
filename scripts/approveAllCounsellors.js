import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Counsellor from '../models/Counsellor.js';

dotenv.config();

const approveAllCounsellors = async () => {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔄 Approving all counsellors...');

        const result = await Counsellor.updateMany(
            {}, // Match all counsellors
            {
                $set: {
                    isApproved: true
                }
            }
        );

        console.log(`✅ Successfully approved counsellors!`);
        console.log(`📊 Matched count: ${result.matchedCount}`);
        console.log(`✏️  Modified count: ${result.modifiedCount}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error approving counsellors:', error);
        process.exit(1);
    }
};

approveAllCounsellors();
