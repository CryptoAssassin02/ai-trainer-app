const analyticsService = require('../services/analytics-service');
const GoalPredictionService = require('../services/goal-prediction-service');
const logger = require('../config/logger');
const { NotFoundError, DatabaseError, ApplicationError } = require('../utils/errors');
const { isValidUUID } = require('../agents/memory/validators'); // Import UUID validator

// Initialize Goal Prediction Service
const goalPredictionService = new GoalPredictionService({
  analyticsService: analyticsService,
  supabaseClient: require('../services/supabase').getSupabaseClient(),
  logger: logger
});

/**
 * Retrieves comprehensive analytics overview for the authenticated user
 */
async function getAnalyticsOverview(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];

  if (!userId || !jwtToken) {
    logger.warn('getAnalyticsOverview called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  logger.info(`Retrieving analytics overview for user: ${userId}`);

  try {
    // Extract options from query parameters
    const options = {
      timeframe: req.query.timeframe || '30 days',
      includeProjections: req.query.includeProjections === 'true'
    };

    const overview = await analyticsService.getOverviewMetrics(userId, jwtToken, options);
    
    logger.info(`Analytics overview retrieved successfully for user ${userId}`);
    return res.status(200).json({ 
      status: 'success', 
      data: overview,
      message: overview.hasData ? 'Analytics overview retrieved successfully.' : 'No analytics data available for the specified timeframe.'
    });

  } catch (error) {
    logger.error(`Error retrieving analytics overview for user ${userId}: ${error.message}`, { error });
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({ status: 'error', message: 'Failed to retrieve analytics overview due to a database issue.' });
    }
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve analytics overview due to an internal error.' });
  }
}

/**
 * Retrieves detailed progress trends for the authenticated user
 */
async function getProgressTrends(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];

  if (!userId || !jwtToken) {
    logger.warn('getProgressTrends called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  logger.info(`Retrieving progress trends for user: ${userId}`);

  try {
    // Extract options from query parameters
    const options = {
      timeframe: req.query.timeframe || '90 days',
      groupBy: req.query.groupBy || 'week',
      metrics: req.query.metrics ? req.query.metrics.split(',') : ['weight', 'workouts', 'wellness']
    };

    // Validate groupBy parameter
    const validGroupBy = ['day', 'week', 'month'];
    if (!validGroupBy.includes(options.groupBy)) {
      return res.status(400).json({ 
        status: 'error', 
        message: `Invalid groupBy parameter. Must be one of: ${validGroupBy.join(', ')}` 
      });
    }

    const trends = await analyticsService.getProgressTrends(userId, jwtToken, options);
    
    logger.info(`Progress trends retrieved successfully for user ${userId}: ${options.metrics.length} metrics`);
    return res.status(200).json({ 
      status: 'success', 
      data: trends,
      message: trends.hasData ? 'Progress trends retrieved successfully.' : 'No trend data available for the specified timeframe.'
    });

  } catch (error) {
    logger.error(`Error retrieving progress trends for user ${userId}: ${error.message}`, { error });
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({ status: 'error', message: 'Failed to retrieve progress trends due to a database issue.' });
    }
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve progress trends due to an internal error.' });
  }
}

/**
 * Retrieves strength progression data for the authenticated user
 */
async function getStrengthProgression(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];

  if (!userId || !jwtToken) {
    logger.warn('getStrengthProgression called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  logger.info(`Retrieving strength progression for user: ${userId}`);

  try {
    // Extract options from query parameters
    const options = {
      timeframe: req.query.timeframe || '90 days',
      exercises: req.query.exercises ? req.query.exercises.split(',') : undefined
    };

    const progression = await analyticsService.getStrengthProgression(userId, jwtToken, options);
    
    logger.info(`Strength progression retrieved successfully for user ${userId}`);
    return res.status(200).json({ 
      status: 'success', 
      data: progression,
      message: progression.hasData ? 'Strength progression retrieved successfully.' : 'No strength progression data available for the specified timeframe.'
    });

  } catch (error) {
    logger.error(`Error retrieving strength progression for user ${userId}: ${error.message}`, { error });
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({ status: 'error', message: 'Failed to retrieve strength progression due to a database issue.' });
    }
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve strength progression due to an internal error.' });
  }
}

/**
 * Retrieves adherence metrics for the authenticated user
 */
async function getAdherenceMetrics(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];

  if (!userId || !jwtToken) {
    logger.warn('getAdherenceMetrics called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  logger.info(`Retrieving adherence metrics for user: ${userId}`);

  try {
    // Extract options from query parameters
    const options = {
      timeframe: req.query.timeframe || '30 days'
    };

    const adherence = await analyticsService.getAdherenceMetrics(userId, jwtToken, options);
    
    logger.info(`Adherence metrics retrieved successfully for user ${userId}`);
    return res.status(200).json({ 
      status: 'success', 
      data: adherence,
      message: adherence.hasData ? 'Adherence metrics retrieved successfully.' : 'No adherence data available for the specified timeframe.'
    });

  } catch (error) {
    logger.error(`Error retrieving adherence metrics for user ${userId}: ${error.message}`, { error });
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({ status: 'error', message: 'Failed to retrieve adherence metrics due to a database issue.' });
    }
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve adherence metrics due to an internal error.' });
  }
}

/**
 * Refreshes analytics data for the authenticated user
 */
async function refreshAnalytics(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];

  if (!userId || !jwtToken) {
    logger.warn('refreshAnalytics called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  logger.info(`Refreshing analytics for user: ${userId}`);

  try {
    // Extract options from request body or query parameters
    const options = {
      startDate: req.body.startDate || req.query.startDate,
      endDate: req.body.endDate || req.query.endDate
    };

    // Validate date format if provided
    if (options.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(options.startDate)) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid startDate format. Use YYYY-MM-DD.' 
      });
    }

    if (options.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(options.endDate)) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid endDate format. Use YYYY-MM-DD.' 
      });
    }

    // Validate date range
    if (options.startDate && options.endDate && new Date(options.startDate) > new Date(options.endDate)) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'startDate cannot be greater than endDate.' 
      });
    }

    const refreshResult = await analyticsService.refreshUserAnalytics(userId, jwtToken, options);
    
    logger.info(`Analytics refreshed successfully for user ${userId}`);
    return res.status(200).json({ 
      status: 'success', 
      data: refreshResult,
      message: 'Analytics data refreshed successfully.'
    });

  } catch (error) {
    logger.error(`Error refreshing analytics for user ${userId}: ${error.message}`, { error });
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({ status: 'error', message: 'Failed to refresh analytics due to a database issue.' });
    }
    return res.status(500).json({ status: 'error', message: 'Failed to refresh analytics due to an internal error.' });
  }
}

/**
 * Retrieves analytics data for a specific date range
 */
async function getAnalyticsByDateRange(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];
  const { startDate, endDate } = req.query;

  if (!userId || !jwtToken) {
    logger.warn('getAnalyticsByDateRange called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  if (!startDate || !endDate) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'startDate and endDate query parameters are required.' 
    });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Invalid date format. Use YYYY-MM-DD.' 
    });
  }

  // Validate dates are actually valid dates
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  
  if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Invalid date values. Please provide valid dates in YYYY-MM-DD format.' 
    });
  }

  // Check if the date string represents the same date when parsed (catches things like 2024-13-01)
  if (startDateObj.toISOString().split('T')[0] !== startDate || 
      endDateObj.toISOString().split('T')[0] !== endDate) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Invalid date values. Please provide valid dates in YYYY-MM-DD format.' 
    });
  }

  // Validate date range
  if (startDateObj > endDateObj) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'startDate cannot be greater than endDate.' 
    });
  }

  logger.info(`Retrieving analytics by date range for user: ${userId}, from ${startDate} to ${endDate}`);

  try {
    // Calculate timeframe string for service
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const timeframe = `${diffDays} days`;

    const options = { timeframe };
    const overview = await analyticsService.getOverviewMetrics(userId, jwtToken, options);
    
    logger.info(`Analytics by date range retrieved successfully for user ${userId}: ${diffDays} days`);
    return res.status(200).json({ 
      status: 'success', 
      data: {
        ...overview,
        requestedDateRange: { startDate, endDate, daysCovered: diffDays }
      },
      message: overview.hasData ? 'Analytics data retrieved successfully for date range.' : 'No analytics data available for the specified date range.'
    });

  } catch (error) {
    logger.error(`Error retrieving analytics by date range for user ${userId}: ${error.message}`, { error });
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({ status: 'error', message: 'Failed to retrieve analytics data due to a database issue.' });
    }
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve analytics data due to an internal error.' });
  }
}

/**
 * Health check endpoint for analytics system
 */
async function getAnalyticsHealth(req, res) {
  logger.info('Analytics health check requested');
  
  try {
    // Basic health check - just return status
    return res.status(200).json({
      status: 'success',
      data: {
        service: 'analytics',
        healthy: true,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      },
      message: 'Analytics service is healthy.'
    });
  } catch (error) {
    logger.error(`Analytics health check failed: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: 'Analytics service health check failed.'
    });
  }
}

/**
 * ✅ TASK 2.5: Retrieves AI-powered insights for the authenticated user
 * Uses AnalyticsAgent to generate personalized insights and recommendations
 */
async function getAIInsights(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'User authentication required'
      });
    }

    // Extract JWT token from Authorization header
    const authHeader = req.headers.authorization;
    const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!jwtToken) {
      return res.status(401).json({
        status: 'error',
        message: 'JWT token required in Authorization header'
      });
    }
    
    const { timeframe = '30 days' } = req.query;
    
    logger.info(`Retrieving AI insights for user: ${userId}`);
    
    const result = await analyticsService.getAIInsights(userId, timeframe, jwtToken);
    
    logger.info(`AI insights retrieved successfully for user: ${userId}`);
    
    res.status(200).json(result);
    
  } catch (error) {
    logger.error(`Error retrieving AI insights for user ${req.user?.id}: ${error.message}`, {
      error: error.message,
      statusCode: error.statusCode || 500,
      details: error.details
    });
    
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
        code: error.code
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while retrieving AI insights'
    });
  }
}

/**
 * ✅ TASK 2.5: Retrieves pattern analysis for the authenticated user
 * Uses AI pattern detection to identify trends and behaviors
 */
async function getPatternAnalysis(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];

  if (!userId || !jwtToken) {
    logger.warn('getPatternAnalysis called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  logger.info(`Retrieving pattern analysis for user: ${userId}`);

  try {
    // Extract options from query parameters
    const options = {
      timeframe: req.query.timeframe || '30 days',
      patternTypes: req.query.patternTypes ? req.query.patternTypes.split(',') : ['temporal', 'performance', 'exercise', 'behavioral', 'statistical']
    };

    const analysis = await analyticsService.getPatternAnalysis(userId, options.timeframe, jwtToken);
    
    logger.info(`Pattern analysis retrieved successfully for user ${userId}: ${analysis.data.patterns.length} patterns detected`);
    return res.status(200).json({ 
      status: 'success', 
      data: analysis.data,
      message: analysis.message || 'Pattern analysis completed successfully.'
    });

  } catch (error) {
    logger.error(`Error retrieving pattern analysis for user ${userId}: ${error.message}`, { error });
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({ status: 'error', message: 'Failed to analyze patterns due to a database issue.' });
    }
    if (error instanceof ApplicationError) {
      return res.status(400).json({ status: 'error', message: error.message });
    }
    return res.status(500).json({ status: 'error', message: 'Failed to analyze patterns due to an internal error.' });
  }
}

/**
 * ✅ TASK 2.5: Retrieves personalized recommendations for the authenticated user
 * Uses AI analysis to generate actionable fitness recommendations
 */
async function getPersonalizedRecommendations(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];

  if (!userId || !jwtToken) {
    logger.warn('getPersonalizedRecommendations called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  logger.info(`Retrieving personalized recommendations for user: ${userId}`);

  try {
    // Extract options from query parameters
    const options = {
      timeframe: req.query.timeframe || '30 days',
      categories: req.query.categories ? req.query.categories.split(',') : ['performance', 'adherence', 'progression', 'recommendations'],
      maxRecommendations: req.query.maxRecommendations ? parseInt(req.query.maxRecommendations) : 10
    };

    // Validate maxRecommendations parameter
    if (isNaN(options.maxRecommendations) || options.maxRecommendations < 1 || options.maxRecommendations > 50) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid maxRecommendations parameter. Must be a number between 1 and 50.' 
      });
    }

    const recommendations = await analyticsService.getPersonalizedRecommendations(userId, jwtToken, options);
    
    logger.info(`Personalized recommendations retrieved successfully for user ${userId}: ${recommendations.data.totalRecommendations} recommendations`);
    return res.status(200).json({ 
      status: 'success', 
      data: recommendations.data,
      message: recommendations.message || 'Personalized recommendations generated successfully.'
    });

  } catch (error) {
    logger.error(`Error retrieving personalized recommendations for user ${userId}: ${error.message}`, { error });
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({ status: 'error', message: 'Failed to generate recommendations due to a database issue.' });
    }
    if (error instanceof ApplicationError) {
      return res.status(400).json({ status: 'error', message: error.message });
    }
    return res.status(500).json({ status: 'error', message: 'Failed to generate recommendations due to an internal error.' });
  }
}

/**
 * ✅ TASK 2.5: Retrieves goal predictions for the authenticated user
 * Uses AI analysis to predict goal achievement likelihood
 */
async function getGoalPredictions(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];
  const { goalType } = req.params;

  if (!userId || !jwtToken) {
    logger.warn('getGoalPredictions called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  if (!goalType) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'goalType parameter is required in the URL path.' 
    });
  }

  // Validate goalType parameter
  const validGoalTypes = ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'general_fitness'];
  if (!validGoalTypes.includes(goalType)) {
    return res.status(400).json({ 
      status: 'error', 
      message: `Invalid goalType. Must be one of: ${validGoalTypes.join(', ')}` 
    });
  }

  logger.info(`Retrieving goal predictions for user: ${userId}, goal type: ${goalType}`);

  try {
    // Extract options from query parameters
    const options = {
      timeframe: req.query.timeframe || '90 days'
    };

    const predictions = await analyticsService.getGoalPredictions(userId, goalType, jwtToken, options);
    
    logger.info(`Goal predictions retrieved successfully for user ${userId}: ${(predictions.data.prediction.achievementProbability * 100).toFixed(1)}% achievement likelihood`);
    return res.status(200).json({ 
      status: 'success', 
      data: predictions.data,
      message: predictions.message || 'Goal predictions generated successfully.'
    });

  } catch (error) {
    logger.error(`Error retrieving goal predictions for user ${userId}: ${error.message}`, { error });
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({ status: 'error', message: 'Failed to generate goal predictions due to a database issue.' });
    }
    if (error instanceof ApplicationError) {
      return res.status(400).json({ status: 'error', message: error.message });
    }
    return res.status(500).json({ status: 'error', message: 'Failed to generate goal predictions due to an internal error.' });
  }
}

/**
 * ✅ TASK 3.4: Comprehensive AI analytics endpoint combining insights, patterns, and recommendations
 * Provides a single endpoint for complete AI-powered analytics dashboard
 */
async function getComprehensiveAIAnalytics(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];

  if (!userId || !jwtToken) {
    logger.warn('getComprehensiveAIAnalytics called without userId or jwtToken in request context.');
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  }

  logger.info(`Retrieving comprehensive AI analytics for user: ${userId}`);

  try {
    // Extract options from query parameters
    const options = {
      timeframe: req.query.timeframe || '30 days',
      includeRecommendations: req.query.includeRecommendations !== 'false',
      maxRecommendations: req.query.maxRecommendations ? parseInt(req.query.maxRecommendations) : 5
    };

    // Validate maxRecommendations parameter
    if (isNaN(options.maxRecommendations) || options.maxRecommendations < 1 || options.maxRecommendations > 20) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid maxRecommendations parameter. Must be a number between 1 and 20.' 
      });
    }

    // Fetch all AI analytics data in parallel for efficiency
    const [insights, patterns, recommendations] = await Promise.all([
      analyticsService.getAIInsights(userId, options.timeframe, jwtToken),
      analyticsService.getPatternAnalysis(userId, options.timeframe, jwtToken),
      options.includeRecommendations ? 
        analyticsService.getPersonalizedRecommendations(userId, jwtToken, { 
          timeframe: options.timeframe, 
          maxRecommendations: options.maxRecommendations 
        }) : 
        Promise.resolve({ data: { recommendations: [], hasData: false } })
    ]);
    
    // Combine all data into comprehensive response
    const comprehensiveData = {
      insights: {
        total: insights.data.insights.length,
        highPriority: insights.data.insights.filter(i => i.priority === 'high').length,
        categories: [...new Set(insights.data.insights.map(i => i.category))],
        data: insights.data.insights
      },
      patterns: {
        total: patterns.data.patterns.length,
        highConfidence: patterns.data.patterns.filter(p => p.confidence > 0.8).length,
        types: [...new Set(patterns.data.patterns.map(p => p.type))],
        data: patterns.data.patterns
      },
      recommendations: {
        total: recommendations.data.recommendations.length,
        hasData: recommendations.data.hasData,
        categories: recommendations.data.categories || [],
        data: recommendations.data.recommendations
      },
      metadata: {
        timeframe: options.timeframe,
        generatedAt: new Date().toISOString(),
        aiGenerated: true,
        dataQuality: insights.data.metadata?.dataQuality || 0.7,
        processingTime: insights.data.processingTime
      }
    };
    
    logger.info(`Comprehensive AI analytics retrieved successfully for user ${userId}: ${comprehensiveData.insights.total} insights, ${comprehensiveData.patterns.total} patterns, ${comprehensiveData.recommendations.total} recommendations`);
    
    return res.status(200).json({ 
      status: 'success', 
      data: comprehensiveData,
      message: 'Comprehensive AI analytics generated successfully.'
    });

  } catch (error) {
    logger.error(`Error retrieving comprehensive AI analytics for user ${userId}: ${error.message}`, { error });
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({ status: 'error', message: 'Failed to generate comprehensive analytics due to a database issue.' });
    }
    if (error instanceof ApplicationError) {
      return res.status(400).json({ status: 'error', message: error.message });
    }
    return res.status(500).json({ status: 'error', message: 'Failed to generate comprehensive analytics due to an internal error.' });
  }
}

/**
 * ✅ TASK 3.4: Predict goal achievement probability and timeline
 * Following established controller patterns with proper authentication
 */
async function predictGoalAchievement(req, res) {
  try {
    const userId = req.user.id; // ✅ FOLLOWS RULE: Use req.user.id consistently
    const { goalDefinition } = req.body;
    const jwtToken = req.headers.authorization?.startsWith('Bearer ') 
      ? req.headers.authorization.substring(7) 
      : null;

    if (!jwtToken) {
      return res.status(401).json({
        status: 'error',
        message: 'JWT token required for goal prediction'
      });
    }

    if (!goalDefinition) {
      return res.status(400).json({
        status: 'error',
        message: 'Goal definition is required in request body'
      });
    }

    // Validate goal definition structure
    if (!goalDefinition.type || !goalDefinition.target) {
      return res.status(400).json({
        status: 'error',
        message: 'Goal definition must include type and target'
      });
    }

    // Validate goal type
    const validGoalTypes = ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'body_composition'];
    if (!validGoalTypes.includes(goalDefinition.type)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid goal type. Must be one of: ${validGoalTypes.join(', ')}`
      });
    }

    // Validate target structure
    if (!goalDefinition.target.value || typeof goalDefinition.target.value !== 'number') {
      return res.status(400).json({
        status: 'error',
        message: 'Goal target must include a numeric value'
      });
    }

    logger.info(`Predicting goal achievement for user: ${userId}, goal type: ${goalDefinition.type}`);

    // ✅ FOLLOWS RULE: JWT Token Parameter Ordering (userId, jwtToken, goalDefinition)
    const result = await goalPredictionService.predictGoalAchievement(
      userId,
      jwtToken,
      goalDefinition
    );

    logger.info(`Goal prediction completed successfully for user: ${userId}`);
    res.status(200).json(result);

  } catch (error) {
    logger.error('Goal prediction error:', error);
    
    if (error instanceof ApplicationError) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to predict goal achievement due to database issue'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to predict goal achievement'
    });
  }
}

/**
 * ✅ TASK 3.4: Track goal progress and milestone achievements
 * Following established authentication and parameter patterns
 */
async function getGoalProgress(req, res) {
  try {
    const userId = req.user.id; // ✅ FOLLOWS RULE: req.user.id consistency
    const { goalId } = req.params;
    const jwtToken = req.headers.authorization?.startsWith('Bearer ') 
      ? req.headers.authorization.substring(7) 
      : null;

    if (!jwtToken) {
      return res.status(401).json({
        status: 'error',
        message: 'JWT token required for goal tracking'
      });
    }

    if (!goalId) {
      return res.status(400).json({
        status: 'error',
        message: 'Goal ID is required in URL parameters'
      });
    }

    // Validate goalId format (should be UUID)
    if (!isValidUUID(goalId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid goal ID format'
      });
    }

    logger.info(`Tracking goal progress for user: ${userId}, goalId: ${goalId}`);

    // ✅ FOLLOWS RULE: JWT Token Parameter Ordering
    const result = await goalPredictionService.trackGoalProgress(
      userId,
      jwtToken,
      goalId
    );

    logger.info(`Goal progress retrieved successfully for user: ${userId}`);
    res.status(200).json(result);

  } catch (error) {
    logger.error('Goal tracking error:', error);
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error instanceof ApplicationError) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }

    if (error instanceof DatabaseError) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to track goal progress due to database issue'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to track goal progress'
    });
  }
}

/**
 * ✅ TASK 3.4: Create new goal with baseline metrics
 * Following established patterns with proper validation
 */
async function createGoal(req, res) {
  try {
    const userId = req.user.id; // ✅ FOLLOWS RULE: req.user.id consistency
    const { goalDefinition } = req.body;
    const jwtToken = req.headers.authorization?.startsWith('Bearer ') 
      ? req.headers.authorization.substring(7) 
      : null;

    if (!jwtToken) {
      return res.status(401).json({
        status: 'error',
        message: 'JWT token required for goal creation'
      });
    }

    if (!goalDefinition) {
      return res.status(400).json({
        status: 'error',
        message: 'Goal definition is required in request body'
      });
    }

    // Validate required fields
    const requiredFields = ['type', 'target', 'timeframe'];
    const missingFields = requiredFields.filter(field => !goalDefinition[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate goal type
    const validGoalTypes = ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'body_composition'];
    if (!validGoalTypes.includes(goalDefinition.type)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid goal type. Must be one of: ${validGoalTypes.join(', ')}`
      });
    }

    // Validate timeframe
    const validTimeframes = ['1month', '3months', '6months', '1year'];
    if (!validTimeframes.includes(goalDefinition.timeframe)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`
      });
    }

    logger.info(`Creating goal for user: ${userId}, type: ${goalDefinition.type}`);

    // ✅ FOLLOWS RULE: JWT Token Parameter Ordering
    const result = await goalPredictionService.createGoal(
      userId,
      jwtToken,
      goalDefinition
    );

    logger.info(`Goal created successfully for user: ${userId}`);
    res.status(201).json(result);

  } catch (error) {
    logger.error('Goal creation error:', error);
    
    if (error instanceof ApplicationError) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }

    if (error instanceof DatabaseError) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create goal due to database issue'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create goal'
    });
  }
}

/**
 * ✅ TASK 3.4: Update goal with new parameters
 * Following established patterns with proper validation
 */
async function updateGoal(req, res) {
  try {
    const userId = req.user.id; // ✅ FOLLOWS RULE: req.user.id consistency
    const { goalId } = req.params;
    const { updates } = req.body;
    const jwtToken = req.headers.authorization?.startsWith('Bearer ') 
      ? req.headers.authorization.substring(7) 
      : null;

    if (!jwtToken) {
      return res.status(401).json({
        status: 'error',
        message: 'JWT token required for goal update'
      });
    }

    if (!goalId) {
      return res.status(400).json({
        status: 'error',
        message: 'Goal ID is required in URL parameters'
      });
    }

    if (!isValidUUID(goalId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid goal ID format'
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Updates object is required in request body'
      });
    }

    // Validate allowed update fields
    const allowedFields = ['target', 'timeframe', 'description', 'priority'];
    const invalidFields = Object.keys(updates).filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid fields in updates: ${invalidFields.join(', ')}. Allowed fields: ${allowedFields.join(', ')}`
      });
    }

    logger.info(`Updating goal for user: ${userId}, goalId: ${goalId}`);

    // ✅ FOLLOWS RULE: JWT Token Parameter Ordering
    const result = await goalPredictionService.updateGoal(
      userId,
      jwtToken,
      goalId,
      updates
    );

    logger.info(`Goal updated successfully for user: ${userId}`);
    res.status(200).json(result);

  } catch (error) {
    logger.error('Goal update error:', error);
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error instanceof ApplicationError) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }

    if (error instanceof DatabaseError) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update goal due to database issue'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update goal'
    });
  }
}

/**
 * ✅ TASK 3.4: Get all goals for authenticated user
 * Following established patterns with proper authentication
 */
async function getUserGoals(req, res) {
  try {
    const userId = req.user.id; // ✅ FOLLOWS RULE: req.user.id consistency
    const jwtToken = req.headers.authorization?.startsWith('Bearer ') 
      ? req.headers.authorization.substring(7) 
      : null;

    if (!jwtToken) {
      return res.status(401).json({
        status: 'error',
        message: 'JWT token required for goal retrieval'
      });
    }

    // Extract query parameters for filtering
    const { status, type, timeframe } = req.query;
    const options = {};

    if (status) {
      const validStatuses = ['active', 'completed', 'paused', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid status filter. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      options.status = status;
    }

    if (type) {
      const validTypes = ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'body_composition'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid type filter. Must be one of: ${validTypes.join(', ')}`
        });
      }
      options.type = type;
    }

    if (timeframe) {
      const validTimeframes = ['1month', '3months', '6months', '1year'];
      if (!validTimeframes.includes(timeframe)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid timeframe filter. Must be one of: ${validTimeframes.join(', ')}`
        });
      }
      options.timeframe = timeframe;
    }

    logger.info(`Retrieving goals for user: ${userId}`);

    // ✅ FOLLOWS RULE: JWT Token Parameter Ordering
    const result = await goalPredictionService.getUserGoals(
      userId,
      jwtToken,
      options
    );

    logger.info(`Goals retrieved successfully for user: ${userId}, count: ${result.data?.goals?.length || 0}`);
    res.status(200).json(result);

  } catch (error) {
    logger.error('Goal retrieval error:', error);
    
    if (error instanceof DatabaseError) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve goals due to database issue'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve goals'
    });
  }
}

module.exports = {
  getAnalyticsOverview,
  getProgressTrends,
  getStrengthProgression,
  getAdherenceMetrics,
  refreshAnalytics,
  getAnalyticsByDateRange,
  getAnalyticsHealth,
  getAIInsights,
  getPatternAnalysis,
  getPersonalizedRecommendations,
  getGoalPredictions,
  getComprehensiveAIAnalytics,
  predictGoalAchievement,
  getGoalProgress,
  createGoal,
  updateGoal,
  getUserGoals
}; 