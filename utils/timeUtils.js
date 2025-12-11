/**
 * Time Utilities for Session Booking
 * Handles time parsing, validation, and calculations
 */

/**
 * Parse 12-hour time format to 24-hour format
 * @param {string} timeString - Time in format "HH:MM AM/PM"
 * @returns {Object} { hours: number, minutes: number, isValid: boolean }
 */
export const parseTime12Hour = (timeString) => {
    try {
        if (!timeString || typeof timeString !== 'string') {
            return { hours: 0, minutes: 0, isValid: false, error: 'Invalid time string' };
        }

        const timeParts = timeString.trim().split(' ');
        if (timeParts.length !== 2) {
            return { hours: 0, minutes: 0, isValid: false, error: 'Invalid time format. Expected "HH:MM AM/PM"' };
        }

        const [time, period] = timeParts;
        const [hoursStr, minutesStr] = time.split(':');

        if (!hoursStr || !minutesStr) {
            return { hours: 0, minutes: 0, isValid: false, error: 'Invalid time format' };
        }

        let hours = parseInt(hoursStr, 10);
        const minutes = parseInt(minutesStr, 10);

        if (isNaN(hours) || isNaN(minutes)) {
            return { hours: 0, minutes: 0, isValid: false, error: 'Invalid hours or minutes' };
        }

        if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
            return { hours: 0, minutes: 0, isValid: false, error: 'Hours must be 1-12, minutes 0-59' };
        }

        const upperPeriod = period.toUpperCase();
        if (upperPeriod !== 'AM' && upperPeriod !== 'PM') {
            return { hours: 0, minutes: 0, isValid: false, error: 'Period must be AM or PM' };
        }

        // Convert to 24-hour format
        if (upperPeriod === 'PM' && hours !== 12) {
            hours += 12;
        } else if (upperPeriod === 'AM' && hours === 12) {
            hours = 0;
        }

        return { hours, minutes, isValid: true };
    } catch (error) {
        return { hours: 0, minutes: 0, isValid: false, error: error.message };
    }
};

/**
 * Calculate end time based on start time and duration
 * @param {Date} date - Base date
 * @param {string} startTime - Start time in "HH:MM AM/PM" format
 * @param {number} duration - Duration in minutes
 * @returns {Object} { endDateTime: Date, endTimeString: string, isValid: boolean }
 */
export const calculateEndTime = (date, startTime, duration) => {
    try {
        const parsed = parseTime12Hour(startTime);
        if (!parsed.isValid) {
            return { endDateTime: null, endTimeString: '', isValid: false, error: parsed.error };
        }

        const startDateTime = new Date(date);
        startDateTime.setHours(parsed.hours, parsed.minutes, 0, 0);

        if (isNaN(startDateTime.getTime())) {
            return { endDateTime: null, endTimeString: '', isValid: false, error: 'Invalid date' };
        }

        const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

        if (isNaN(endDateTime.getTime())) {
            return { endDateTime: null, endTimeString: '', isValid: false, error: 'Invalid end time calculation' };
        }

        const endHours = endDateTime.getHours();
        const endMinutes = endDateTime.getMinutes();
        const endPeriod = endHours >= 12 ? 'PM' : 'AM';
        const displayHours = endHours % 12 || 12;
        const endTimeString = `${displayHours}:${endMinutes.toString().padStart(2, '0')} ${endPeriod}`;

        return { endDateTime, endTimeString, isValid: true };
    } catch (error) {
        return { endDateTime: null, endTimeString: '', isValid: false, error: error.message };
    }
};

/**
 * Check if a time is within a given range
 * @param {Date} startDateTime - Start time to check
 * @param {Date} endDateTime - End time to check
 * @param {Date} rangeStart - Range start
 * @param {Date} rangeEnd - Range end
 * @returns {boolean}
 */
export const isTimeInRange = (startDateTime, endDateTime, rangeStart, rangeEnd) => {
    return startDateTime >= rangeStart && endDateTime <= rangeEnd;
};

/**
 * Parse availability time string to Date object
 * @param {Date} baseDate - Base date
 * @param {string} timeString - Time in "HH:MM" format (24-hour)
 * @returns {Date}
 */
export const parseAvailabilityTime = (baseDate, timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
};

/**
 * Validate time format
 * @param {string} timeString - Time string to validate
 * @returns {Object} { isValid: boolean, error?: string }
 */
export const validateTimeFormat = (timeString) => {
    const parsed = parseTime12Hour(timeString);
    return { isValid: parsed.isValid, error: parsed.error };
};

/**
 * Format date for database storage
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Object} { date: Date, isValid: boolean, error?: string }
 */
export const parseDateString = (dateString) => {
    try {
        if (!dateString || typeof dateString !== 'string') {
            return { date: null, isValid: false, error: 'Invalid date string' };
        }

        const dateObj = new Date(dateString);

        if (isNaN(dateObj.getTime())) {
            return { date: null, isValid: false, error: 'Invalid date format. Expected YYYY-MM-DD' };
        }

        return { date: dateObj, isValid: true };
    } catch (error) {
        return { date: null, isValid: false, error: error.message };
    }
};

/**
 * Check if date is in the past
 * @param {Date} date - Date to check
 * @returns {boolean}
 */
export const isDateInPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
};

/**
 * Get day name from date
 * @param {Date} date - Date object
 * @returns {string} Day name (e.g., "Monday")
 */
export const getDayName = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
};
