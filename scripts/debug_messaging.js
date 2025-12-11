
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load models
import User from '../models/User.js';
import Counsellor from '../models/Counsellor.js';
import Session from '../models/Session.js';
import Message from '../models/Message.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const debugState = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // 1. Check Users
        const users = await User.find({}, 'firstName lastName email role');
        console.log(`\n--- Users (${users.length}) ---`);
        users.forEach(u => console.log(`${u._id} | ${u.firstName} ${u.role} | ${u.email}`));

        // 2. Check Counsellors
        const counsellors = await Counsellor.find({}).populate('user', 'firstName email');
        console.log(`\n--- Counsellors (${counsellors.length}) ---`);
        counsellors.forEach(c => console.log(`${c._id} | User: ${c.user?._id} (${c.user?.email})`));

        // 3. Check Sessions
        const sessions = await Session.find({});
        console.log(`\n--- Sessions (${sessions.length}) ---`);
        sessions.forEach(s => console.log(`Session: ${s._id} | Counsellor: ${s.counsellor} | User: ${s.user} | Status: ${s.status}`));

        // 4. Check Messages
        const messages = await Message.countDocuments({});
        console.log(`\n--- Total Messages: ${messages} ---`);

        console.log('\n--- Diagnosis ---');
        if (sessions.length === 0) {
            console.log('CRITICAL: No sessions found. Messaging logic requires existing sessions between Counsellor and User.');
        } else {
            console.log('Sessions exist. Checking for valid links...');
            // Logic from routes/counsellor.js
            for (const counsellor of counsellors) {
                const linkedSessions = await Session.find({ counsellor: counsellor._id });
                console.log(`Counsellor ${counsellor._id} has ${linkedSessions.length} linked sessions.`);

                const uniqueUsers = [...new Set(linkedSessions.map(s => s.user.toString()))];
                console.log(`Unique Clients for Counsellor ${counsellor._id}:`, uniqueUsers);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

debugState();
