/**
 * File Upload Utilities
 * Handles file validation, upload configuration, and cleanup
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Allowed file types
 */
export const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm'
];

export const ALLOWED_PDF_TYPES = [
    'application/pdf'
];

export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
];

/**
 * File size limits (in bytes)
 */
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_PDF_SIZE = 10 * 1024 * 1024;    // 10MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5MB

/**
 * Validate file type
 * @param {Object} file - Multer file object
 * @param {Array} allowedTypes - Array of allowed MIME types
 * @returns {Object} { isValid: boolean, error?: string }
 */
export const validateFileType = (file, allowedTypes) => {
    if (!file) {
        return { isValid: false, error: 'No file provided' };
    }

    if (!allowedTypes.includes(file.mimetype)) {
        return {
            isValid: false,
            error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
        };
    }

    return { isValid: true };
};

/**
 * Validate file size
 * @param {Object} file - Multer file object
 * @param {number} maxSize - Maximum size in bytes
 * @returns {Object} { isValid: boolean, error?: string }
 */
export const validateFileSize = (file, maxSize) => {
    if (!file) {
        return { isValid: false, error: 'No file provided' };
    }

    if (file.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
        return {
            isValid: false,
            error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`
        };
    }

    return { isValid: true };
};

/**
 * Get file extension from filename
 * @param {string} filename - File name
 * @returns {string} File extension
 */
export const getFileExtension = (filename) => {
    return path.extname(filename).toLowerCase();
};

/**
 * Clean up file (safe deletion)
 * @param {string} filePath - Path to file
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
export const cleanupFile = async (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            return { success: true };
        }
        return { success: true, message: 'File does not exist' };
    } catch (error) {
        console.error('Error cleaning up file:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
export const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

/**
 * Configure multer storage
 * @param {string} destination - Upload destination directory
 * @returns {multer.StorageEngine}
 */
export const configureStorage = (destination) => {
    ensureDirectoryExists(destination);

    return multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, destination);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = getFileExtension(file.originalname);
            cb(null, file.fieldname + '-' + uniqueSuffix + ext);
        }
    });
};

/**
 * Create multer upload middleware with validation
 * @param {Object} options - Configuration options
 * @param {string} options.destination - Upload destination
 * @param {Array} options.allowedTypes - Allowed MIME types
 * @param {number} options.maxSize - Maximum file size
 * @returns {multer.Multer}
 */
export const createUploadMiddleware = (options) => {
    const { destination, allowedTypes, maxSize } = options;

    const storage = configureStorage(destination);

    return multer({
        storage: storage,
        limits: {
            fileSize: maxSize
        },
        fileFilter: (req, file, cb) => {
            const typeValidation = validateFileType(file, allowedTypes);

            if (!typeValidation.isValid) {
                return cb(new Error(typeValidation.error), false);
            }

            cb(null, true);
        }
    });
};

/**
 * Video upload middleware
 */
export const videoUpload = createUploadMiddleware({
    destination: './uploads/videos',
    allowedTypes: ALLOWED_VIDEO_TYPES,
    maxSize: MAX_VIDEO_SIZE
});

/**
 * PDF upload middleware
 */
export const pdfUpload = createUploadMiddleware({
    destination: './uploads/pdfs',
    allowedTypes: ALLOWED_PDF_TYPES,
    maxSize: MAX_PDF_SIZE
});

/**
 * Image upload middleware
 */
export const imageUpload = createUploadMiddleware({
    destination: './uploads/images',
    allowedTypes: ALLOWED_IMAGE_TYPES,
    maxSize: MAX_IMAGE_SIZE
});

/**
 * Validate and get file metadata
 * @param {Object} file - Multer file object
 * @returns {Object} File metadata
 */
export const getFileMetadata = (file) => {
    if (!file) {
        return null;
    }

    return {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        url: `/uploads/${path.basename(path.dirname(file.path))}/${file.filename}`
    };
};
