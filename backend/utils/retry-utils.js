const logger = require('../config/logger'); // Corrected path relative to backend/utils

/**
 * Delays execution for a specified number of milliseconds.
 * @param {number} ms - The number of milliseconds to wait.
 * @returns {Promise<void>} A promise that resolves after the delay.
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Options for retry
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.initialDelay - Initial delay in milliseconds
 * @param {number} options.backoffFactor - Factor to multiply delay by on each retry
 * @param {Function} options.shouldRetry - Function to determine if retry should occur
 * @returns {Promise<any>} - Return value of fn
 */
const retryWithBackoff = async (fn, options = {}) => {
  const maxRetries = options.maxRetries || 3;
  const initialDelay = options.initialDelay || 1000;
  const backoffFactor = options.backoffFactor || 2;
  const shouldRetry = options.shouldRetry || (() => true);

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }
      const delayTime = initialDelay * Math.pow(backoffFactor, attempt);
      await new Promise(resolve => setTimeout(resolve, delayTime));
    }
  }
  
  throw lastError;
};

module.exports = {
  retryWithBackoff
}; 