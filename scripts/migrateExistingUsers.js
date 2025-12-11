import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

// Migration script to update existing users with new authentication fields
async function migrateExistingUsers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all existing users
        const users = await User.find({});
        console.log(`\n📊 Found ${users.length} existing users to migrate`);

        let migratedCount = 0;
        let alreadyMigratedCount = 0;

        for (const user of users) {
            // Check if user already has the new fields
            if (user.isEmailVerified === undefined) {
                // Mark existing users as email verified (grandfathering)
                user.isEmailVerified = true;
                user.loginAttempts = 0;
                await user.save();
                migratedCount++;
                console.log(`✓ Migrated user: ${user.email}`);
            } else {
                alreadyMigratedCount++;
            }
        }

        console.log(`\n✅ Migration completed successfully!`);
        console.log(`   - Migrated: ${migratedCount} users`);
        console.log(`   - Already migrated: ${alreadyMigratedCount} users`);
        console.log(`   - Total: ${users.length} users\n`);

        // Close connection
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
}

// Run migration
migrateExistingUsers();
