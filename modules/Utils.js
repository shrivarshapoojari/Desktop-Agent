/**
 * Utility Functions Module
 * Contains helper functions used across the application
 */
class Utils {
  /**
   * Parse time formats and convert to HH:MM format
   * @param {string} timeString - Time string to parse
   * @returns {string|null} Parsed time in HH:MM format or null if invalid
   */
  parseTimeFormat(timeString) {
    if (!timeString) return null;
    
    const time = timeString.toLowerCase().trim();
    
    // First, extract time from natural language phrases
    let cleanTime = time;
    
    // Handle phrases like "today at 17:59", "at 3pm", "in 2 hours", etc.
    const naturalPatterns = [
      // "today at HH:MM" or "at HH:MM"
      /(?:today\s+at\s+|at\s+)?(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)/,
      // "in X minutes" - convert to actual time
      /in\s+(\d+)\s+minutes?/,
      // "in X hours" - convert to actual time
      /in\s+(\d+)\s+hours?/
    ];
    
    // Handle "in X minutes/hours" conversions
    if (time.includes('in ') && (time.includes('minute') || time.includes('hour'))) {
      const now = new Date();
      
      const minutesMatch = time.match(/in\s+(\d+)\s+minutes?/);
      const hoursMatch = time.match(/in\s+(\d+)\s+hours?/);
      
      if (minutesMatch) {
        const minutes = parseInt(minutesMatch[1]);
        const futureTime = new Date(now.getTime() + minutes * 60000);
        cleanTime = `${futureTime.getHours().toString().padStart(2, '0')}:${futureTime.getMinutes().toString().padStart(2, '0')}`;
      } else if (hoursMatch) {
        const hours = parseInt(hoursMatch[1]);
        const futureTime = new Date(now.getTime() + hours * 3600000);
        cleanTime = `${futureTime.getHours().toString().padStart(2, '0')}:${futureTime.getMinutes().toString().padStart(2, '0')}`;
      }
    } else {
      // Extract time from natural language
      for (const pattern of naturalPatterns) {
        const match = time.match(pattern);
        if (match && match[1]) {
          cleanTime = match[1].trim();
          break;
        }
      }
    }
    
    // Now parse the cleaned time
    const patterns = [
      // 12-hour format with am/pm
      /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/,
      // 24-hour format
      /^(\d{1,2}):(\d{2})$/,
      // Just hour (assume :00)
      /^(\d{1,2})$/
    ];
    
    for (const pattern of patterns) {
      const match = cleanTime.match(pattern);
      if (match) {
        let hours = parseInt(match[1]);
        let minutes = parseInt(match[2] || 0);
        
        // Handle am/pm
        if (match[3]) {
          if (match[3] === 'pm' && hours !== 12) hours += 12;
          if (match[3] === 'am' && hours === 12) hours = 0;
        }
        
        // Validate time
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      }
    }
    
    return null; // Return null if no valid time found
  }

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Bytes to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted byte string
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Format duration in seconds to human readable format
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration string
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Validate email address format
   * @param {string} email - Email address to validate
   * @returns {boolean} True if valid email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid URL format
   */
  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate random ID
   * @param {number} length - Length of the ID
   * @returns {string} Random ID string
   */
  generateRandomId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Capitalize first letter of string
   * @param {string} string - String to capitalize
   * @returns {string} Capitalized string
   */
  capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * Get current timestamp in various formats
   * @param {string} format - Format type ('iso', 'locale', 'timestamp')
   * @returns {string|number} Formatted timestamp
   */
  getCurrentTimestamp(format = 'iso') {
    const now = new Date();
    
    switch (format) {
      case 'iso':
        return now.toISOString();
      case 'locale':
        return now.toLocaleString();
      case 'timestamp':
        return now.getTime();
      case 'date':
        return now.toDateString();
      case 'time':
        return now.toTimeString();
      default:
        return now.toISOString();
    }
  }

  /**
   * Delay execution for specified milliseconds
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Debounce function calls
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function calls
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Deep clone an object
   * @param {Object} obj - Object to clone
   * @returns {Object} Cloned object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === "object") {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }

  /**
   * Check if object is empty
   * @param {Object} obj - Object to check
   * @returns {boolean} True if object is empty
   */
  isEmpty(obj) {
    if (obj === null || obj === undefined) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    if (typeof obj === 'string') return obj.trim().length === 0;
    return false;
  }

  /**
   * Get random element from array
   * @param {Array} array - Array to pick from
   * @returns {*} Random element
   */
  getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Shuffle array elements
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Export singleton instance
export const utils = new Utils();
