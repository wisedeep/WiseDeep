/**
 * Database Optimization Utilities
 * Aggregation pipelines and index management
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import Counsellor from '../models/Counsellor.js';
import Session from '../models/Session.js';
import Course from '../models/Course.js';
import Message from '../models/Message.js';

/**
 * Get conversations using aggregation pipeline
 * Optimizes the N+1 query problem in counsellor conversations
 * @param {string} counsellorId - Counsellor's ObjectId
 * @returns {Promise<Array>} Array of conversations
 */
export const getConversationsAggregation = async (counsellorId, userId) => {
    try {
        const counsellorObjectId = new mongoose.Types.ObjectId(counsellorId);
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Get unique client IDs from sessions
        const sessions = await Session.find({ counsellor: counsellorObjectId })
            .distinct('user');

        console.log(`[Aggregation] Found ${sessions.length} unique clients for counsellor ${counsellorId}`);
        console.log(`[Aggregation] Client IDs:`, sessions);

        if (sessions.length === 0) {
            console.log('[Aggregation] No clients found, returning empty.');
            return [];
        }

        // Aggregation pipeline for conversations
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender: userObjectId, receiver: { $in: sessions } },
                        { sender: { $in: sessions }, receiver: userObjectId }
                    ]
                }
            },
            {
                $sort: { sentAt: -1 }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$sender', userObjectId] },
                            '$receiver',
                            '$sender'
                        ]
                    },
                    latestMessage: { $first: '$$ROOT' },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$receiver', userObjectId] },
                                        { $eq: ['$read', false] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'client'
                }
            },
            {
                $unwind: '$client'
            },
            {
                $project: {
                    client: {
                        id: '$client._id',
                        name: { $concat: ['$client.firstName', ' ', '$client.lastName'] },
                        email: '$client.email'
                    },
                    latestMessage: {
                        content: '$latestMessage.content',
                        sentAt: '$latestMessage.sentAt',
                        read: '$latestMessage.read'
                    },
                    unreadCount: 1
                }
            },
            {
                $sort: { 'latestMessage.sentAt': -1 }
            }
        ]);

        console.log(`[Aggregation] Pipeline returned ${conversations.length} conversations`);
        return conversations;
    } catch (error) {
        console.error('Error in getConversationsAggregation:', error);
        throw error;
    }
};

/**
 * Get dashboard statistics using aggregation
 * Optimizes multiple count queries into single aggregation
 * @returns {Promise<Object>} Dashboard statistics
 */
export const getDashboardStatsAggregation = async () => {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [stats] = await Promise.all([
            // Combined stats aggregation
            User.aggregate([
                {
                    $facet: {
                        totalUsers: [{ $count: 'count' }],
                        newUsersThisMonth: [
                            { $match: { createdAt: { $gte: firstDayOfMonth } } },
                            { $count: 'count' }
                        ]
                    }
                }
            ]),
            // Can add more parallel aggregations here
        ]);

        const [counsellorStats] = await Counsellor.aggregate([
            {
                $facet: {
                    activeCounsellors: [
                        { $match: { isApproved: true } },
                        { $count: 'count' }
                    ],
                    pendingCounsellors: [
                        { $match: { isApproved: false } },
                        { $count: 'count' }
                    ]
                }
            }
        ]);

        const [sessionStats] = await Session.aggregate([
            {
                $facet: {
                    totalSessions: [{ $count: 'count' }],
                    sessionsThisMonth: [
                        { $match: { date: { $gte: firstDayOfMonth } } },
                        { $count: 'count' }
                    ],
                    completedSessions: [
                        { $match: { status: 'completed' } },
                        { $count: 'count' }
                    ]
                }
            }
        ]);

        return {
            totalUsers: stats[0].totalUsers[0]?.count || 0,
            newUsersThisMonth: stats[0].newUsersThisMonth[0]?.count || 0,
            activeCounsellors: counsellorStats.activeCounsellors[0]?.count || 0,
            pendingCounsellors: counsellorStats.pendingCounsellors[0]?.count || 0,
            totalSessions: sessionStats.totalSessions[0]?.count || 0,
            sessionsThisMonth: sessionStats.sessionsThisMonth[0]?.count || 0,
            completedSessions: sessionStats.completedSessions[0]?.count || 0
        };
    } catch (error) {
        console.error('Error in getDashboardStatsAggregation:', error);
        throw error;
    }
};

/**
 * Get counsellor clients with session stats using aggregation
 * @param {string} counsellorId - Counsellor's ObjectId
 * @returns {Promise<Array>} Array of clients with stats
 */
export const getCounsellorClientsAggregation = async (counsellorId) => {
    try {
        const counsellorObjectId = new mongoose.Types.ObjectId(counsellorId);

        const clients = await Session.aggregate([
            {
                $match: { counsellor: counsellorObjectId }
            },
            {
                $group: {
                    _id: '$user',
                    totalSessions: { $sum: 1 },
                    lastSession: { $max: '$date' },
                    nextSession: {
                        $min: {
                            $cond: [
                                { $gte: ['$date', new Date()] },
                                '$date',
                                null
                            ]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $project: {
                    id: '$user._id',
                    name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                    email: '$user.email',
                    totalSessions: 1,
                    lastSession: 1,
                    nextSession: 1
                }
            },
            {
                $sort: { lastSession: -1 }
            }
        ]);

        return clients;
    } catch (error) {
        console.error('Error in getCounsellorClientsAggregation:', error);
        throw error;
    }
};

/**
 * Add database indexes for performance optimization
 * Should be run once during deployment or migration
 */
export const addDatabaseIndexes = async () => {
    try {
        console.log('Adding database indexes...');

        // User indexes
        await User.collection.createIndex({ email: 1 }, { unique: true });
        await User.collection.createIndex({ role: 1 });
        await User.collection.createIndex({ createdAt: -1 });

        // Counsellor indexes
        await Counsellor.collection.createIndex({ user: 1 }, { unique: true });
        await Counsellor.collection.createIndex({ isApproved: 1 });
        await Counsellor.collection.createIndex({ rating: -1 });

        // Session indexes
        await Session.collection.createIndex({ user: 1, date: -1 });
        await Session.collection.createIndex({ counsellor: 1, date: -1 });
        await Session.collection.createIndex({ status: 1 });
        await Session.collection.createIndex({ date: 1, startTime: 1 });

        // Course indexes
        await Course.collection.createIndex({ isPublished: 1 });
        await Course.collection.createIndex({ category: 1 });
        await Course.collection.createIndex({ enrolledUsers: 1 });
        await Course.collection.createIndex({ createdBy: 1 });
        await Course.collection.createIndex({ approvalStatus: 1 });

        // Message indexes
        await Message.collection.createIndex({ sender: 1, receiver: 1, sentAt: -1 });
        await Message.collection.createIndex({ receiver: 1, isRead: 1 });
        await Message.collection.createIndex({ sentAt: -1 });

        console.log('Database indexes added successfully');
        return { success: true };
    } catch (error) {
        console.error('Error adding database indexes:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Check if indexes exist
 * @returns {Promise<Object>} Index information for all collections
 */
export const checkIndexes = async () => {
    try {
        const indexes = {
            users: await User.collection.getIndexes(),
            counsellors: await Counsellor.collection.getIndexes(),
            sessions: await Session.collection.getIndexes(),
            courses: await Course.collection.getIndexes(),
            messages: await Message.collection.getIndexes()
        };

        return indexes;
    } catch (error) {
        console.error('Error checking indexes:', error);
        throw error;
    }
};
