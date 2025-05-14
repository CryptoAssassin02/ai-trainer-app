/**
 * @fileoverview Sanitization Utilities
 * Provides functions for sanitizing and validating user input
 */

const sanitizeHtml = require('sanitize-html');
const logger = require('../config/logger');
const { ApiError } = require('./errors');

/**
 * Default configuration for HTML sanitization
 * Strips out all HTML by default for maximum safety
 */
const DEFAULT_SANITIZE_OPTIONS = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false
};

/**
 * Less strict configuration for HTML sanitization
 * Allows some basic formatting tags but no scripts or styles
 */
const RELAXED_SANITIZE_OPTIONS = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'b', 'i', 'u', 'em', 'strong',
    'ul', 'ol', 'li', 'a', 'span', 'code', 'pre'
  ],
  allowedAttributes: {
    'a': ['href', 'target', 'rel'],
    'span': ['style'],
    'code': ['class'],
    'pre': ['class']
  },
  allowedStyles: {
    'span': {
      'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
      'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/]
    }
  },
  disallowedTagsMode: 'discard',
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false,
  transformTags: {
    'a': (tagName, attribs) => {
      // Force _blank links to use noopener and noreferrer
      if (attribs.target === '_blank') {
        return {
          tagName,
          attribs: {
            ...attribs,
            rel: 'noopener noreferrer'
          }
        };
      }
      return { tagName, attribs };
    }
  }
};

/**
 * Sanitize HTML content from user input
 * 
 * @param {string} input - Text that may contain HTML
 * @param {Object} options - Custom sanitize-html options (optional)
 * @returns {string} Sanitized text
 */
const sanitizeUserHtml = (input, options = {}) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Use strict defaults unless otherwise specified
  const sanitizeOptions = options.relaxed 
    ? { ...RELAXED_SANITIZE_OPTIONS, ...options }
    : { ...DEFAULT_SANITIZE_OPTIONS, ...options };
  
  try {
    return sanitizeHtml(input, sanitizeOptions);
  } catch (error) {
    logger.error('Error sanitizing HTML input:', error);
    // Return empty string if there was an error during sanitization
    return '';
  }
};

/**
 * Sanitize a plain text input (no HTML allowed)
 * Removes all HTML tags and controls the string length
 * 
 * @param {string} input - Text input to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized text
 */
const sanitizeText = (input, maxLength = 0) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Strip all HTML tags
  let sanitized = sanitizeUserHtml(input);
  
  // Remove any control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Trim and enforce max length if specified
  sanitized = sanitized.trim();
  if (maxLength > 0 && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Special sanitization for SQL-like inputs
 * Helps prevent SQL injection by escaping common characters
 * Note: This is a defense-in-depth measure. Always use parameterized queries!
 * 
 * @param {string} input - Input that might contain SQL
 * @returns {string} Sanitized input safe for SQL
 */
const sanitizeSql = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Replace dangerous SQL characters
  return input
    .replace(/'/g, "''") 
    .replace(/\\/g, '\\\\') 
    .replace(/;/g, '') 
    .replace(/--.*$/gm, '') // Remove single line comments to end of line
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments (non-greedy)
    // .replace(/\/\*/g, '') // Old: Remove block comment start
    // .replace(/\*\//g, ''); // Old: Remove block comment end
};

/**
 * Sanitize objects recursively
 * Processes all string properties in an object or elements in an array
 * 
 * @param {Object|Array} obj - Object or Array to sanitize
 * @param {function} sanitizeFunc - Sanitization function to apply
 * @returns {Object|Array} New object or array with sanitized properties/elements
 */
const sanitizeObject = (obj, sanitizeFunc = sanitizeText) => {
  if (!obj || typeof obj !== 'object') {
    // Return non-objects directly (including strings, numbers, null, undefined)
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    // Map over array elements
    return obj.map(item => {
        // If item is a string, apply sanitizeFunc
        if (typeof item === 'string') {
            return sanitizeFunc(item);
        }
        // If item is an object (or nested array), recurse
        if (typeof item === 'object' && item !== null) {
            return sanitizeObject(item, sanitizeFunc);
        }
        // Otherwise (number, boolean, null), return as is
        return item;
    });
  }
  
  // Handle objects (same logic as before)
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeFunc(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value, sanitizeFunc);
    } else {
      result[key] = value;
    }
  }
  
  return result;
};

/**
 * Strip any potentially harmful content from user profile fields
 * 
 * @param {Object} profileData - User profile data
 * @returns {Object} Sanitized profile data
 */
const sanitizeProfileData = (profileData) => {
  if (!profileData || typeof profileData !== 'object') {
    return {};
  }
  
  // Define a custom sanitization function for specific profile fields
  const sanitizeProfileField = (field, value) => {
    switch (field) {
      case 'name':
        return sanitizeText(value, 100);
      case 'bio':
        // Allow limited HTML in bio
        return sanitizeUserHtml(value, {
          relaxed: true,
          allowedTags: ['b', 'i', 'em', 'strong', 'br'],
          allowedAttributes: {}
        });
      case 'email':
        // Just sanitize as text, the validation step will check email format
        return sanitizeText(value, 255);
      default:
        return sanitizeText(value);
    }
  };
  
  // Sanitize each field based on custom rules
  const result = {};
  for (const [key, value] of Object.entries(profileData)) {
    if (typeof value === 'string') {
      result[key] = sanitizeProfileField(key, value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
};

/**
 * Sanitize a workout plan
 * 
 * @param {Object} workoutPlan - Workout plan data
 * @returns {Object} Sanitized workout plan
 */
const sanitizeWorkoutPlan = (workoutPlan) => {
  if (!workoutPlan || typeof workoutPlan !== 'object') {
    return {};
  }
  
  // Define sanitization rules for different workout fields
  const sanitizedPlan = { ...workoutPlan };
  
  // Sanitize the basic text fields
  if (sanitizedPlan.planName) {
    sanitizedPlan.planName = sanitizeText(sanitizedPlan.planName, 100);
  }
  
  if (sanitizedPlan.reasoning) {
    // Allow limited HTML in reasoning
    sanitizedPlan.reasoning = sanitizeUserHtml(sanitizedPlan.reasoning, {
      relaxed: true
    });
  }
  
  // Sanitize exercises array
  if (Array.isArray(sanitizedPlan.exercises)) {
    sanitizedPlan.exercises = sanitizedPlan.exercises.map(exercise => {
      if (!exercise || typeof exercise !== 'object') return {};
      
      return {
        ...exercise,
        name: sanitizeText(exercise.name, 100),
        notes: exercise.notes ? sanitizeText(exercise.notes, 500) : '',
        repsOrRange: exercise.repsOrRange ? sanitizeText(exercise.repsOrRange, 20) : ''
      };
    });
  }
  
  // Sanitize research insights
  if (Array.isArray(sanitizedPlan.researchInsights)) {
    sanitizedPlan.researchInsights = sanitizedPlan.researchInsights.map(insight => {
      return typeof insight === 'string' ? sanitizeUserHtml(insight, { relaxed: true }) : '';
    });
  }
  
  return sanitizedPlan;
};

/**
 * Validate an email address
 * 
 * @param {string} email - Email address to validate
 * @returns {boolean} Whether the email is valid
 */
const isValidEmail = (email) => {
  if (typeof email !== 'string') {
    return false;
  }
  
  // Use a reasonable regex for email validation
  // This is intentionally permissive - strict validation is handled by Joi schema
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate a URL
 * 
 * @param {string} url - URL to validate
 * @returns {boolean} Whether the URL is valid
 */
const isValidUrl = (url) => {
  if (typeof url !== 'string') {
    return false;
  }
  
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (error) {
    return false;
  }
};

/**
 * Validate and sanitize an input object against expected properties
 * 
 * @param {Object} input - Input object to validate
 * @param {Array<string>} allowedProps - List of allowed property names
 * @param {boolean} strict - If true, reject any input with extra properties
 * @returns {Object} Sanitized input object
 */
const validateProps = (input, allowedProps, strict = false) => {
  if (!input || typeof input !== 'object') {
    throw new ApiError('Invalid input data', 400);
  }
  
  const sanitized = {};
  const inputKeys = Object.keys(input);
  
  // Check for unexpected properties in strict mode
  if (strict && inputKeys.some(key => !allowedProps.includes(key))) {
    const unexpectedProps = inputKeys.filter(key => !allowedProps.includes(key));
    throw new ApiError(`Unexpected properties: ${unexpectedProps.join(', ')}`, 400);
  }
  
  // Copy only allowed properties
  for (const prop of allowedProps) {
    if (input[prop] !== undefined) {
      sanitized[prop] = typeof input[prop] === 'string'
        ? sanitizeText(input[prop])
        : input[prop];
    }
  }
  
  return sanitized;
};

module.exports = {
  sanitizeUserHtml,
  sanitizeText,
  sanitizeSql,
  sanitizeObject,
  sanitizeProfileData,
  sanitizeWorkoutPlan,
  isValidEmail,
  isValidUrl,
  validateProps
}; 