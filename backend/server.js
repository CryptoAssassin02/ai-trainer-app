const express = require('express');
const cookieParser = require('cookie-parser');
const { env, logger } = require('./config');
const routes = require('./routes');
const { notFoundHandler, globalErrorHandler, handleFatalError } = require('./middleware/error-middleware');
const { setupSecurityMiddleware } = require('./middleware/security');
const { apiLimiters } = require('./middleware/rateLimit');
const { cleanupBlacklistedTokens } = require('./utils/jwt');

// Initialize express app
const app = express();

// Parse cookies for CSRF and session management
app.use(cookieParser());

// Apply comprehensive security middleware
setupSecurityMiddleware(app);

// Body parsers with size limits to prevent DoS attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Generate a unique request ID for tracing
  const requestId = require('crypto').randomBytes(16).toString('hex');
  req.requestId = requestId;
  
  // Add request ID to response headers for client-side debugging
  res.setHeader('X-Request-ID', requestId);
  
  // Log when the request finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Determine log level based on status code
    const logLevel = res.statusCode >= 500 ? 'error' : 
                     res.statusCode >= 400 ? 'warn' : 
                     'info';
    
    // Log request completion using requestFormat helper
    logger[logLevel](`${req.method} ${req.originalUrl} completed in ${duration}ms`, {
      ...logger.requestFormat(req, res),
      requestId,
      duration: `${duration}ms`
    });
  });
  
  next();
});

// Apply rate limiting to the entire API
app.use('/api', apiLimiters.standard);

// Health check endpoint (unprotected)
// app.get('/health', (req, res) => { ... }); // Remove or move

// Register API routes by calling the exported function
routes(app); // Call the function instead of using it as middleware

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// Cleanup function to run periodically
const performCleanupTasks = async () => {
  try {
    // Clean up expired blacklisted tokens
    const removedTokens = await cleanupBlacklistedTokens();
    if (removedTokens > 0) {
      logger.info(`Cleaned up ${removedTokens} expired blacklisted tokens`);
    }
    
    // Run other cleanup tasks here if needed
  } catch (error) {
    logger.error('Error during cleanup tasks:', error);
  }
};

// Schedule periodic cleanup tasks (every hour)
let cleanupInterval;
const startCleanupInterval = () => {
  // Clear existing interval if any
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  
  // Run every hour
  cleanupInterval = setInterval(performCleanupTasks, 60 * 60 * 1000);
  
  // Also run immediately on startup
  performCleanupTasks().catch(err => {
    logger.error('Initial cleanup task failed:', err);
  });
};

// Function to stop the cleanup interval (for testing/shutdown)
const stopCleanupInterval = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    logger.info('Cleanup interval stopped.');
    cleanupInterval = null;
  }
};

// Graceful shutdown function
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, starting graceful shutdown...`);
  
  // Clear cleanup interval
  stopCleanupInterval();
  
  // Close all other resources (DB connections, etc.)
  // ...
  
  // Exit process
  process.exit(0);
};

// Start the server
const startServer = () => {
  const port = env.port || 8000;
  
  const server = app.listen(port, () => {
    logger.info(`Server running in ${env.env} mode on port ${port}`);
    
    // Store server reference globally for handleFatalError
    global.server = server;
    
    // Start cleanup tasks
    startCleanupInterval();
  });
  
  // Set timeouts for keeping connections alive
  server.keepAliveTimeout = 65000; // 65 seconds
  server.headersTimeout = 66000; // 66 seconds (slightly more than keepAliveTimeout)
  
  return server;
};

// Handle graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections using enhanced handler
process.on('unhandledRejection', (err) => {
  handleFatalError(err, 'unhandledRejection');
});

// Handle uncaught exceptions using enhanced handler
process.on('uncaughtException', (err) => {
  handleFatalError(err, 'uncaughtException');
});

// Call startServer to actually start the server if this file is run directly
if (require.main === module) {
  startServer();
}

// Export the app and start/stop functions
module.exports = {
  app,
  startServer,
  stopCleanupInterval
}; 