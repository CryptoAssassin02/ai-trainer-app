const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { env, logger } = require('./config');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Initialize express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: env.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log when the request finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      statusCode: res.statusCode,
      userAgent: req.headers['user-agent'],
      duration: `${duration}ms`
    });
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date(),
    environment: env.env
  });
});

// Register API routes
app.use('/api', routes);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start the server
const startServer = () => {
  const port = env.port || 8000;
  
  app.listen(port, () => {
    logger.info(`Server running in ${env.env} mode on port ${port}`);
  });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  // In production, perform graceful shutdown
  if (env.isProduction) {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  // Always exit on uncaught exceptions
  process.exit(1);
});

// Export the app and start function
module.exports = {
  app,
  startServer
}; 