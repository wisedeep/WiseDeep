/**
 * Database Index Creation Script
 * Run this script once to add performance indexes to all collections
 * Usage: node scripts/createIndexes.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { addDatabaseIndexes, checkIndexes } from '../utils/dbOptimization.js';

dotenv.config();

const createIndexes = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB successfully\n');

        console.log('Checking existing indexes...');
        const existingIndexes = await checkIndexes();
        console.log('Existing indexes:');
        console.log(JSON.stringify(existingIndexes, null, 2));
        console.log('\n');

        console.log('Adding new indexes...');
        const result = await addDatabaseIndexes();

        if (result.success) {
            console.log('\n✅ All indexes created successfully!');

            console.log('\nVerifying indexes...');
            const newIndexes = await checkIndexes();
            console.log('Updated indexes:');
            console.log(JSON.stringify(newIndexes, null, 2));
        } else {
            console.error('\n❌ Error creating indexes:', result.error);
        }

        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

createIndexes();
