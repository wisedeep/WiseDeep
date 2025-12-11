/**
 * Validation Schemas using Zod
 * Centralized validation for API requests
 */

import { z } from 'zod';

/**
 * Session booking validation schema
 */
export const sessionBookingSchema = z.object({
    counsellor: z.string().min(1, 'Counsellor ID is required'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    startTime: z.string().regex(/^\d{1,2}:\d{2} (AM|PM)$/i, 'Time must be in HH:MM AM/PM format'),
    duration: z.number().min(15, 'Duration must be at least 15 minutes').max(180, 'Duration cannot exceed 180 minutes')
});

/**
 * Course creation validation schema
 */
export const courseSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    category: z.string().min(1, 'Category is required'),
    instructor: z.string().min(1, 'Instructor is required'),
    duration: z.string().min(1, 'Duration is required'),
    thumbnail: z.string().url('Invalid thumbnail URL').optional(),
    modules: z.array(z.object({
        title: z.string().min(1, 'Module title is required'),
        description: z.string().optional(),
        duration: z.number().min(0).optional(),
        order: z.number().min(0).optional(),
        isFree: z.boolean().optional()
    })).optional()
});

/**
 * Availability validation schema
 */
export const availabilitySchema = z.array(z.object({
    day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
    startTime: z.string().regex(/^\d{1,2}:\d{2}$/, 'Start time must be in HH:MM format'),
    endTime: z.string().regex(/^\d{1,2}:\d{2}$/, 'End time must be in HH:MM format')
}));

/**
 * Message validation schema
 */
export const messageSchema = z.object({
    receiverId: z.string().min(1, 'Receiver ID is required'),
    content: z.string().min(1, 'Message content is required').max(5000, 'Message too long')
});

/**
 * Note validation schema
 */
export const noteSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    content: z.string().min(1, 'Content is required').max(50000, 'Content too long')
});

/**
 * Profile update validation schema
 */
export const profileUpdateSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50, 'First name too long').optional(),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long').optional(),
    email: z.string().email('Invalid email format').optional(),
    phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number').optional(),
    bio: z.string().max(1000, 'Bio too long').optional()
});

/**
 * Counsellor profile validation schema
 */
export const counsellorProfileSchema = profileUpdateSchema.extend({
    specialization: z.string().min(1, 'Specialization is required').optional(),
    credentials: z.string().min(1, 'Credentials are required').optional(),
    experience: z.string().optional()
});

/**
 * Session review validation schema
 */
export const sessionReviewSchema = z.object({
    rating: z.number().min(0, 'Rating must be at least 0').max(5, 'Rating cannot exceed 5'),
    review: z.string().max(1000, 'Review too long').optional()
});

/**
 * Helper function to validate data against schema
 * @param {z.ZodSchema} schema - Zod schema
 * @param {any} data - Data to validate
 * @returns {Object} { success: boolean, data?: any, errors?: any }
 */
export const validateData = (schema, data) => {
    try {
        const validated = schema.parse(data);
        return { success: true, data: validated };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                errors: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            };
        }
        return { success: false, errors: [{ message: 'Validation failed' }] };
    }
};
