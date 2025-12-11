import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

const createAdmin = async () => {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const email = 'this.application.deep@gmail.com';
        const password = '@#$WiseDeep123';
        const firstName = 'Admin';
        const lastName = 'User';

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Check if user exists
        let user = await User.findOne({ email });

        if (user) {
            console.log('⚠️  User found. Updating to Admin role and resetting password...');
            user.password = hashedPassword;
            user.role = 'admin';
            user.firstName = firstName;
            user.lastName = lastName;
            user.isEmailVerified = true; // Ensure verified
            user.loginAttempts = 0;
            user.lockUntil = undefined;
            await user.save();
            console.log('✅ Admin account updated successfully!');
        } else {
            console.log('✨ Creating new Admin user...');
            user = new User({
                firstName,
                lastName,
                email,
                password: hashedPassword,
                role: 'admin',
                isEmailVerified: true,
                loginAttempts: 0
            });
            await user.save();
            console.log('✅ Admin account created successfully!');
        }

        console.log('-----------------------------------');
        console.log('📧 Email: ' + email);
        console.log('🔑 Password: ' + password);
        console.log('-----------------------------------');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
