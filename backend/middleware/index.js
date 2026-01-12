/**
 * @fileoverview Middleware index
 * Exports all middleware for easy import
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { env, logger, serverConfig } = require('../config');

const auth = require('./auth');
const validation = require('./validation');
const errorMiddleware = require('./error-middleware');
const rateLimit = require('./rateLimit');
const security = require('./security');
const { asyncHandler } = require('../utils/error-handlers');

// Configure all middleware
function configureMiddleware(app) {
  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin: env.security.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Body parsing
  app.use(express.json({ limit: serverConfig.maxRequestBodySize }));
  app.use(express.urlencoded({ extended: true, limit: serverConfig.maxRequestBodySize }));

  // Compression
  app.use(compression({ level: serverConfig.compressionLevel }));

  // Request logging
  app.use((req, res, next) => {
    const startTime = Date.now();

    // Log request
    logger.info(`Incoming ${req.method} ${req.url}`, {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Log response time on finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info(`Completed ${req.method} ${req.url}`, {
        statusCode: res.statusCode,
        duration: `${duration}ms`
      });
    });

    // Add response time header
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      res.set('X-Response-Time', `${duration}ms`);
    });

    next();
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);

    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: err.errors
      });
    }

    // Handle unauthorized errors
    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token or unauthorized'
      });
    }

    // Default error response
    res.status(500).json({
      status: 'error',
      message: env.server.isDevelopment ? err.message : 'Internal server error'
    });
  });
}

module.exports = {
  auth,
  validation,
  errorMiddleware,
  rateLimit,
  security,
  configureMiddleware,
  asyncHandler
}; 