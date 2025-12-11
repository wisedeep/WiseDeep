import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

dotenv.config();

const verifyAllUsers = async () => {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔄 Updating all users to verified status...');

        const result = await User.updateMany(
            {}, // Match all users
            {
                $set: {
                    isEmailVerified: true,
                    emailVerificationToken: undefined,
                    emailVerificationExpires: undefined
                }
            }
        );

        console.log(`✅ Successfully updated users!`);
        console.log(`📊 Matched count: ${result.matchedCount}`);
        console.log(`✏️  Modified count: ${result.modifiedCount}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating users:', error);
        process.exit(1);
    }
};

verifyAllUsers();
