/**
 * @fileoverview API Routes Index
 * Aggregates all route handlers for the application
 */

const express = require('express');
const os = require('os');
const { env } = require('../config');

const router = express.Router();

// Health check route
router.get('/health', (req, res) => {
  const uptime = process.uptime();
  const uptimeFormatted = {
    days: Math.floor(uptime / 86400),
    hours: Math.floor((uptime % 86400) / 3600),
    minutes: Math.floor((uptime % 3600) / 60),
    seconds: Math.floor(uptime % 60)
  };

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.env,
    server: {
      uptime: uptimeFormatted,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      cpuLoad: os.loadavg(),
      platform: process.platform,
      arch: process.arch
    }
  });
});

// Import route modules
const authRoutes = require('./auth');
const healthRoutes = require('./v1/health');
const profileRoutes = require('./profile');
const nutritionRoutes = require('./nutrition');
const workoutRoutes = require('./workout');
const workoutLogRoutes = require('./workout-log');
const checkInRoutes = require('./check-in');
const macroRoutes = require('./macros');
const notificationRoutes = require('./notifications');
const dataTransferRoutes = require('./data-transfer');
// TODO: Import additional route modules when implemented

// Register routes
function registerRoutes(app) {
  // API version prefix
  const apiRouter = express.Router();
  
  // Mount health check at root level
  app.use(router);

  // Register route modules
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/health', healthRoutes);
  apiRouter.use('/profile', profileRoutes);
  apiRouter.use('/nutrition', nutritionRoutes); // Updated: use /nutrition prefix to match API structure
  apiRouter.use('/macros', macroRoutes); // New: mount macro routes under /macros prefix
  apiRouter.use('/workouts', workoutRoutes);
  apiRouter.use('/', workoutLogRoutes); // Mount workout log routes at root level since they have full paths
  apiRouter.use('/progress', checkInRoutes); // Mount check-in routes under /progress to match the intended API structure
  apiRouter.use('/notifications', notificationRoutes);
  apiRouter.use('/', dataTransferRoutes); // Mount data transfer routes at root level since they have full paths

  // Mount versioned API routes
  app.use('/v1', apiRouter);

  // 404 handler for undefined routes
  app.use((req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'Route not found',
      path: req.originalUrl
    });
  });
}

module.exports = registerRoutes; 