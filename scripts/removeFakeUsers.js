import mongoose from 'mongoose';
import User from '../models/User.js';
import Counsellor from '../models/Counsellor.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saffron-serenity';

// List of fake users to remove
const fakeUserEmails = [
    'sarah@wisedeep.com',
    'michael@wisedeep.com',
    'john.doe@example.com',
    'jane.smith@example.com'
];

async function removeFakeUsers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('\n🗑️  Removing fake users...');

        for (const email of fakeUserEmails) {
            // Find the user
            const user = await User.findOne({ email });

            if (user) {
                console.log(`\n📧 Found user: ${user.firstName} ${user.lastName} (${email})`);

                // If user is a counsellor, delete counsellor profile first
                if (user.role === 'counsellor') {
                    const counsellor = await Counsellor.findOne({ user: user._id });
                    if (counsellor) {
                        await Counsellor.deleteOne({ _id: counsellor._id });
                        console.log(`   ✅ Deleted counsellor profile`);
                    }
                }

                // Delete the user
                await User.deleteOne({ _id: user._id });
                console.log(`   ✅ Deleted user account`);
            } else {
                console.log(`\n⚠️  User not found: ${email}`);
            }
        }

        console.log('\n✨ Cleanup complete!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

removeFakeUsers();
