#!/usr/bin/env node

/**
 * @fileoverview Application entry point
 * Initializes and starts the server
 */

const { startServer } = require('./server');
const { logger } = require('./config');

// Start the server
try {
  startServer();
  logger.info('Server initialized successfully');
} catch (error) {
  logger.error('Failed to start server:', error);
  process.exit(1);
} 