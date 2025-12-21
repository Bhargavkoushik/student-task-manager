/**
 * Timezone Utilities
 * Handles conversion between UTC (stored in DB) and user's local timezone
 */

/**
 * Get user's timezone
 * Uses browser's Intl API to detect timezone
 * @returns {string} IANA timezone identifier (e.g., 'America/New_York')
 */
export const getUserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Failed to detect timezone, using UTC:', error);
    return 'UTC';
  }
};

/**
 * Get user's timezone offset in minutes
 * @returns {number} Offset in minutes (e.g., -300 for EST)
 */
export const getTimezoneOffset = () => {
  return new Date().getTimezoneOffset();
};

/**
 * Convert UTC date string to local Date object
 * @param {string} utcDateString - ISO 8601 date string from backend
 * @returns {Date} Local Date object
 */
export const utcToLocal = (utcDateString) => {
  if (!utcDateString) return null;
  return new Date(utcDateString);
};

/**
 * Convert local Date object to UTC ISO string for backend
 * @param {Date|string} localDate - Local date (Date object or string)
 * @returns {string} UTC ISO string
 */
export const localToUTC = (localDate) => {
  if (!localDate) return null;
  const date = typeof localDate === 'string' ? new Date(localDate) : localDate;
  return date.toISOString();
};

/**
 * Format date for input field (YYYY-MM-DD)
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date string for input fields
 */
export const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format date for display with timezone awareness
 * @param {string} dateString - ISO date string
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDateForDisplay = (dateString, options = {}) => {
  if (!dateString) return 'No due date';
  
  const date = new Date(dateString);
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: getUserTimezone(),
    ...options
  };
  
  return date.toLocaleDateString('en-US', defaultOptions);
};

/**
 * Format datetime for display with timezone
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted datetime string
 */
export const formatDateTimeForDisplay = (dateString) => {
  if (!dateString) return 'Not set';
  
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: getUserTimezone()
  });
};

/**
 * Format time for display (HH:MM)
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted time string
 */
export const formatTimeForDisplay = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: getUserTimezone()
  });
};

/**
 * Combine date and time into ISO string
 * Used when creating reminders with specific times
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @param {string} timeString - Time string (HH:MM)
 * @returns {string} UTC ISO string
 */
export const combineDateAndTime = (dateString, timeString) => {
  if (!dateString) return null;
  
  // Create date in local timezone
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = (timeString || '00:00').split(':').map(Number);
  
  const localDate = new Date(year, month - 1, day, hours, minutes, 0);
  return localDate.toISOString();
};

/**
 * Get timezone display name
 * @returns {string} Timezone abbreviation (e.g., 'EST', 'PST')
 */
export const getTimezoneDisplay = () => {
  try {
    const timezone = getUserTimezone();
    const shortName = new Date().toLocaleTimeString('en-US', {
      timeZoneName: 'short',
      timeZone: timezone
    }).split(' ')[2];
    
    return shortName || timezone;
  } catch (error) {
    console.warn('Falling back to UTC timezone display:', error);
    return 'UTC';
  }
};

/**
 * Check if date is overdue (accounting for timezone)
 * @param {string} dateString - Due date
 * @param {boolean} isCompleted - Task completion status
 * @returns {boolean} True if overdue
 */
export const isOverdue = (dateString, isCompleted = false) => {
  if (!dateString || isCompleted) return false;
  const dueDate = new Date(dateString);
  const now = new Date();
  return dueDate < now;
};

/**
 * Store timezone preference in localStorage
 * @param {string} timezone - IANA timezone identifier
 */
export const storeTimezonePreference = (timezone) => {
  try {
    localStorage.setItem('userTimezone', timezone);
  } catch (error) {
    console.warn('Failed to store timezone preference:', error);
  }
};

/**
 * Get stored timezone preference or detect from browser
 * @returns {string} IANA timezone identifier
 */
export const getStoredTimezone = () => {
  try {
    return localStorage.getItem('userTimezone') || getUserTimezone();
  } catch (error) {
    console.warn('Falling back to detected timezone:', error);
    return getUserTimezone();
  }
};
