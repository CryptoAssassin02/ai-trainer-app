/**
 * @fileoverview Configuration index file
 * This file consolidates all configuration modules and exports them
 */

const env = require('./env');
const logger = require('./logger');

// Server-specific configurations
const serverConfig = {
  // Default values for server configuration
  maxRequestBodySize: '50mb',
  requestTimeout: 30000, // 30 seconds
  compressionLevel: 6,
  trustProxy: true
};

// Export configurations
module.exports = {
  env,
  logger,
  serverConfig
}; 