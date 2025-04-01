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
// TODO: Import additional route modules when implemented
// const workoutRoutes = require('./workout');

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
  // TODO: Register additional route modules when implemented
  // apiRouter.use('/workouts', workoutRoutes);

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