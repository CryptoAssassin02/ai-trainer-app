const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const analyticsController = require('../controllers/analytics');
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

// Rate limiter for analytics endpoints (more generous than workout generation)
const analyticsLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 60 * 1000 : 15 * 60 * 1000, // 1 minute in test, 15 minutes in production
  max: process.env.NODE_ENV === 'test' ? 100 : 50, // 100 requests per minute in test, 50 per 15 minutes in production
  message: {
    status: 'error',
    message: 'Too many analytics requests from this IP, please try again later'
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for analytics endpoint`, { ip: req.ip, endpoint: req.path });
    res.status(options.statusCode).send(options.message);
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Rate limiter for refresh operations (more restrictive)
const refreshLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 60 * 1000 : 60 * 60 * 1000, // 1 minute in test, 1 hour in production
  max: process.env.NODE_ENV === 'test' ? 20 : 5, // 20 requests per minute in test, 5 per hour in production
  message: {
    status: 'error',
    message: 'Too many analytics refresh requests from this IP, please try again after an hour'
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for analytics refresh`, { ip: req.ip });
    res.status(options.statusCode).send(options.message);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware to validate analytics query parameters
const validateAnalyticsQuery = (req, res, next) => {
  const { timeframe, groupBy, metrics } = req.query;
  
  // Validate timeframe format
  if (timeframe && !/^\d+\s+(days?|weeks?|months?)$/.test(timeframe)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid timeframe format. Use format like "30 days", "12 weeks", or "6 months".'
    });
  }
  
  // Validate groupBy values
  if (groupBy && !['day', 'week', 'month'].includes(groupBy)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid groupBy parameter. Must be one of: day, week, month.'
    });
  }
  
  // Validate metrics format
  if (metrics && typeof metrics === 'string') {
    const validMetrics = ['weight', 'workouts', 'wellness', 'adherence', 'strength'];
    const requestedMetrics = metrics.split(',').map(m => m.trim());
    const invalidMetrics = requestedMetrics.filter(m => !validMetrics.includes(m));
    
    if (invalidMetrics.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid metrics: ${invalidMetrics.join(', ')}. Valid metrics are: ${validMetrics.join(', ')}.`
      });
    }
  }
  
  next();
};

// Middleware to validate date parameters
const validateDateParams = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid startDate format. Use YYYY-MM-DD format.'
    });
  }
  
  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid endDate format. Use YYYY-MM-DD format.'
    });
  }
  
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({
      status: 'error',
      message: 'startDate cannot be greater than endDate.'
    });
  }
  
  // Validate date range is not too large (max 365 days)
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 365) {
      return res.status(400).json({
        status: 'error',
        message: 'Date range cannot exceed 365 days.'
      });
    }
  }
  
  next();
};

// Analytics Routes Definition

// GET /v1/analytics/health - Health check endpoint (no auth required)
router.get('/health',
  analyticsController.getAnalyticsHealth
);

// GET /v1/analytics/overview - Get analytics overview
router.get('/overview',
  authenticate,
  analyticsLimiter,
  validateAnalyticsQuery,
  analyticsController.getAnalyticsOverview
);

// GET /v1/analytics/trends - Get progress trends
router.get('/trends',
  authenticate,
  analyticsLimiter,
  validateAnalyticsQuery,
  analyticsController.getProgressTrends
);

// GET /v1/analytics/strength - Get strength progression
router.get('/strength',
  authenticate,
  analyticsLimiter,
  validateAnalyticsQuery,
  analyticsController.getStrengthProgression
);

// GET /v1/analytics/adherence - Get adherence metrics
router.get('/adherence',
  authenticate,
  analyticsLimiter,
  validateAnalyticsQuery,
  analyticsController.getAdherenceMetrics
);

// GET /v1/analytics/daterange - Get analytics for specific date range
router.get('/daterange',
  authenticate,
  analyticsLimiter,
  validateDateParams,
  analyticsController.getAnalyticsByDateRange
);

// POST /v1/analytics/refresh - Refresh analytics data
router.post('/refresh',
  authenticate,
  refreshLimiter,
  validateDateParams,
  analyticsController.refreshAnalytics
);

// ✅ TASK 2.5: AI Analytics Endpoints

// Rate limiter for AI endpoints (more restrictive due to OpenAI costs)
const aiAnalyticsLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 60 * 1000 : 60 * 60 * 1000, // 1 minute in test, 1 hour in production
  max: process.env.NODE_ENV === 'test' ? 30 : 10, // 30 requests per minute in test, 10 per hour in production
  message: {
    status: 'error',
    message: 'Too many AI analytics requests from this IP, please try again after an hour'
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for AI analytics endpoint`, { ip: req.ip, endpoint: req.path });
    res.status(options.statusCode).send(options.message);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware to validate AI analytics query parameters
const validateAIAnalyticsQuery = (req, res, next) => {
  const { timeframe, focusAreas, categories, maxRecommendations } = req.query;
  
  // Validate timeframe format
  if (timeframe && !/^\d+\s+(days?|weeks?|months?)$/.test(timeframe)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid timeframe format. Use format like "30 days", "12 weeks", or "6 months".'
    });
  }
  
  // Validate focusAreas
  if (focusAreas && typeof focusAreas === 'string') {
    const validFocusAreas = ['performance', 'adherence', 'progression', 'recommendations', 'motivation', 'health_optimization'];
    const requestedAreas = focusAreas.split(',').map(a => a.trim());
    const invalidAreas = requestedAreas.filter(a => !validFocusAreas.includes(a));
    
    if (invalidAreas.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid focusAreas: ${invalidAreas.join(', ')}. Valid areas are: ${validFocusAreas.join(', ')}.`
      });
    }
  }
  
  // Validate categories
  if (categories && typeof categories === 'string') {
    const validCategories = ['performance', 'adherence', 'progression', 'recommendations', 'motivation', 'health_optimization'];
    const requestedCategories = categories.split(',').map(c => c.trim());
    const invalidCategories = requestedCategories.filter(c => !validCategories.includes(c));
    
    if (invalidCategories.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid categories: ${invalidCategories.join(', ')}. Valid categories are: ${validCategories.join(', ')}.`
      });
    }
  }
  
  // Validate maxRecommendations
  if (maxRecommendations && (isNaN(parseInt(maxRecommendations)) || parseInt(maxRecommendations) < 1 || parseInt(maxRecommendations) > 50)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid maxRecommendations parameter. Must be a number between 1 and 50.'
    });
  }
  
  next();
};

// GET /v1/analytics/ai/insights - Get AI-powered insights
router.get('/ai/insights',
  authenticate,
  aiAnalyticsLimiter,
  validateAIAnalyticsQuery,
  analyticsController.getAIInsights
);

// GET /v1/analytics/ai/patterns - Get pattern analysis
router.get('/ai/patterns',
  authenticate,
  aiAnalyticsLimiter,
  validateAIAnalyticsQuery,
  analyticsController.getPatternAnalysis
);

// GET /v1/analytics/ai/recommendations - Get personalized recommendations
router.get('/ai/recommendations',
  authenticate,
  aiAnalyticsLimiter,
  validateAIAnalyticsQuery,
  analyticsController.getPersonalizedRecommendations
);

// GET /v1/analytics/ai/predictions/:goalType - Get goal predictions
router.get('/ai/predictions/:goalType',
  authenticate,
  aiAnalyticsLimiter,
  validateAIAnalyticsQuery,
  analyticsController.getGoalPredictions
);

// GET /v1/analytics/ai/comprehensive - Get comprehensive AI analytics
router.get('/ai/comprehensive',
  authenticate,
  aiAnalyticsLimiter,
  validateAIAnalyticsQuery,
  analyticsController.getComprehensiveAIAnalytics
);

// Error handling middleware specific to analytics routes
router.use((error, req, res, next) => {
  logger.error('Analytics route error:', { 
    error: error.message, 
    path: req.path, 
    method: req.method,
    userId: req.user?.id 
  });
  
  // Don't expose internal error details
  res.status(500).json({
    status: 'error',
    message: 'An error occurred while processing your analytics request.'
  });
});

module.exports = router; 