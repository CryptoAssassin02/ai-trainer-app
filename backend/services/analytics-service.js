const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const { DatabaseError, NotFoundError, ApplicationError } = require('../utils/errors');
const logger = require('../config/logger');
const { createConnectionString } = require('../config/supabase');
const { getSupabaseClientWithToken } = require('./supabase');

// ✅ TASK 2.4: Import AnalyticsAgent and related services for AI functionality
const AnalyticsAgent = require('../agents/analytics-agent');
const PatternDetector = require('../agents/pattern-detector');
const InsightGenerator = require('../agents/insight-generator');
const OpenAIService = require('./openai-service');
const AgentMemorySystem = require('../agents/memory');

// ✅ TASK 2.4: Initialize AI services following real AI integration patterns
let analyticsAgent = null;
let isInitialized = false;

/**
 * ✅ TASK 2.4: Initialize AI services for analytics agent
 * Follows real AI integration rules with proper service instances
 */
async function initializeAIServices() {
  if (isInitialized) return analyticsAgent;
  
  try {
    logger.info('Initializing AI services for analytics agent...');
    
    // Initialize OpenAI service with explicit verification
    const openaiService = new OpenAIService();
    await openaiService.initClient();
    
    // Verify service initialization
    if (typeof openaiService.generateChatCompletion !== 'function') {
      throw new ApplicationError('OpenAI service initialization failed - missing generateChatCompletion method');
    }
    
    // Initialize Supabase client for database operations
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Initialize memory system with cross-service dependencies
    const memorySystem = new AgentMemorySystem({
      supabase: supabaseClient,
      openai: openaiService,
      logger: logger
    });
    
    // Initialize analytics agent with all required services
    analyticsAgent = new AnalyticsAgent({
      openaiService: openaiService,
      analyticsService: {
        getOverviewMetrics,
        getProgressTrends,
        getStrengthProgression,
        getAdherenceMetrics,
        getTrendsData
      },
      supabaseClient: supabaseClient,
      memorySystem: memorySystem,
      logger: logger
    });
    
    isInitialized = true;
    logger.info('AI services initialized successfully for analytics agent');
    
    return analyticsAgent;
    
  } catch (error) {
    logger.error('Failed to initialize AI services for analytics agent:', error);
    throw new ApplicationError(`AI services initialization failed: ${error.message}`);
  }
}

/**
 * Executes a series of database operations within a transaction for analytics operations.
 * @param {Function} callback - An async function that receives a connected 'pg' client and performs operations.
 * @returns {Promise<any>} The result returned by the callback function.
 * @throws {DatabaseError} If the transaction fails.
 */
async function executeAnalyticsTransaction(callback) {
  let pool;
  let client;
  try {
    const connectionString = createConnectionString('transactionPooler', true); // Use service role for transactions
    pool = new Pool({ connectionString });
    client = await pool.connect();

    await client.query('BEGIN');
    logger.debug('Analytics database transaction started.');

    const result = await callback(client);

    await client.query('COMMIT');
    logger.debug('Analytics database transaction committed.');
    return result;
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      logger.error('Analytics database transaction rolled back due to error.', { error: error.message });
    }
    logger.error(`Analytics transaction error: ${error.message}`);
    
    if (error instanceof DatabaseError || error instanceof NotFoundError || error instanceof ApplicationError) {
      throw error;
    } else {
      throw new DatabaseError(`Analytics database transaction failed: ${error.message}`);
    }
  } finally {
    if (client) {
      client.release();
    }
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * Retrieves comprehensive analytics overview for a user
 * @param {string} userId - The user ID
 * @param {string} jwtToken - The user's JWT for RLS
 * @param {object} options - Optional parameters (timeframe, metrics)
 * @returns {Promise<object>} Overview analytics data
 * @throws {DatabaseError} If the database operation fails
 */
async function getOverviewMetrics(userId, jwtToken, options = {}) {
  const supabase = getSupabaseClientWithToken(jwtToken);
  const { 
    timeframe = '30 days',
    includeProjections = false 
  } = options;
  
  logger.debug(`Retrieving analytics overview for user: ${userId}, timeframe: ${timeframe}`);

  try {
    // Calculate date range based on timeframe
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (timeframe.includes('7') ? 7 : timeframe.includes('90') ? 90 : 30));
    
    // Get aggregated analytics data
    const { data: analytics, error } = await supabase
      .from('user_analytics_aggregates')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      logger.error(`Supabase error retrieving analytics overview for user ${userId}: ${error.message}`);
      throw new DatabaseError(`Database error retrieving analytics overview: ${error.message}`);
    }

    if (!analytics || analytics.length === 0) {
      logger.info(`No analytics data found for user ${userId} in timeframe ${timeframe}`);
      return {
        userId,
        timeframe,
        hasData: false,
        overview: {
          workouts: { completed: 0, consistency: 0 },
          physical: { weightChange: 0, bodyFatChange: 0 },
          wellness: { overallScore: 0, trends: {} }
        }
      };
    }

    // Calculate overview metrics
    const latestData = analytics[0];
    const oldestData = analytics[analytics.length - 1];
    
    // Debug weight change calculation
    logger.debug(`Weight change calculation: latest=${latestData.avg_weight}, oldest=${oldestData.avg_weight}, analytics count=${analytics.length}`);
    
    const overview = {
      workouts: {
        completed: analytics.reduce((sum, day) => sum + (day.workouts_completed || 0), 0),
        totalExercises: analytics.reduce((sum, day) => sum + (day.total_exercises || 0), 0),
        avgDifficulty: calculateAverage(analytics, 'avg_difficulty'),
        avgSatisfaction: calculateAverage(analytics, 'avg_satisfaction'),
        consistency: latestData.workout_consistency_score || 0
      },
      physical: {
        currentWeight: latestData.avg_weight,
        weightChange: (latestData.avg_weight != null && oldestData.avg_weight != null) 
          ? (latestData.avg_weight - oldestData.avg_weight)
          : 0,
        currentBodyFat: latestData.avg_body_fat_percentage,
        bodyFatChange: (latestData.avg_body_fat_percentage != null && oldestData.avg_body_fat_percentage != null)
          ? (latestData.avg_body_fat_percentage - oldestData.avg_body_fat_percentage)
          : 0
      },
      wellness: {
        overallScore: latestData.wellness_trend_score || calculateWellnessScore(latestData),
        mood: latestData.avg_mood_score,
        sleep: latestData.avg_sleep_score,
        energy: latestData.avg_energy_level,
        stress: latestData.avg_stress_level
      },
      adherence: {
        workout: latestData.workout_consistency_score || 0,
        nutrition: latestData.nutrition_consistency_score || 0,
        overall: latestData.overall_adherence_score || 0
      }
    };

    logger.info(`Analytics overview retrieved successfully for user ${userId}: ${analytics.length} days of data`);
    
    return {
      userId,
      timeframe,
      hasData: true,
      overview,
      dataQuality: calculateAverage(analytics, 'data_quality_score'),
      lastUpdated: latestData.last_calculated
    };

  } catch (error) {
    logger.error(`Error in getOverviewMetrics for user ${userId}: ${error.message}`);
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to retrieve analytics overview: ${error.message}`);
  }
}

/**
 * Retrieves detailed progress trends for a user
 * @param {string} userId - The user ID
 * @param {string} jwtToken - The user's JWT for RLS
 * @param {object} options - Optional parameters (timeframe, metrics)
 * @returns {Promise<object>} Progress trends data
 * @throws {DatabaseError} If the database operation fails
 */
async function getProgressTrends(userId, jwtToken, options = {}) {
  const supabase = getSupabaseClientWithToken(jwtToken);
  const { 
    timeframe = '90 days',
    groupBy = 'week',
    metrics = ['weight', 'workouts', 'wellness']
  } = options;
  
  logger.debug(`Retrieving progress trends for user: ${userId}, timeframe: ${timeframe}, groupBy: ${groupBy}`);

  try {
    const startDate = new Date();
    const days = timeframe.includes('30') ? 30 : timeframe.includes('90') ? 90 : timeframe.includes('365') ? 365 : 90;
    startDate.setDate(startDate.getDate() - days);
    
    // Get analytics data for trends
    const { data: analytics, error } = await supabase
      .from('user_analytics_aggregates')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      logger.error(`Supabase error retrieving progress trends for user ${userId}: ${error.message}`);
      throw new DatabaseError(`Database error retrieving progress trends: ${error.message}`);
    }

    if (!analytics || analytics.length === 0) {
      return {
        userId,
        timeframe,
        hasData: false,
        trends: {}
      };
    }

    // Group data by specified timeframe
    const groupedData = groupDataByTimeframe(analytics, groupBy);
    
    // Calculate trends for each metric
    const trends = {};
    
    if (metrics.includes('weight')) {
      trends.weight = calculateTrend(groupedData, 'avg_weight');
    }
    
    if (metrics.includes('workouts')) {
      trends.workouts = {
        completed: calculateTrend(groupedData, 'workouts_completed'),
        difficulty: calculateTrend(groupedData, 'avg_difficulty'),
        satisfaction: calculateTrend(groupedData, 'avg_satisfaction')
      };
    }
    
    if (metrics.includes('wellness')) {
      trends.wellness = {
        mood: calculateTrend(groupedData, 'avg_mood_score'),
        sleep: calculateTrend(groupedData, 'avg_sleep_score'),
        energy: calculateTrend(groupedData, 'avg_energy_level'),
        stress: calculateTrend(groupedData, 'avg_stress_level')
      };
    }

    logger.info(`Progress trends retrieved successfully for user ${userId}: ${Object.keys(trends).length} metrics`);
    
    return {
      userId,
      timeframe,
      groupBy,
      hasData: true,
      trends,
      dataPoints: analytics.length,
      lastUpdated: analytics[analytics.length - 1]?.last_calculated
    };

  } catch (error) {
    logger.error(`Error in getProgressTrends for user ${userId}: ${error.message}`);
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to retrieve progress trends: ${error.message}`);
  }
}

/**
 * Retrieves strength progression data for a user
 * @param {string} userId - The user ID
 * @param {string} jwtToken - The user's JWT for RLS
 * @param {object} options - Optional parameters (timeframe, exercises)
 * @returns {Promise<object>} Strength progression data
 * @throws {DatabaseError} If the database operation fails
 */
async function getStrengthProgression(userId, jwtToken, options = {}) {
  const { timeframe = '90 days' } = options;
  
  logger.debug(`Retrieving strength progression for user: ${userId}, timeframe: ${timeframe}`);

  try {
    const days = timeframe.includes('30') ? 30 : timeframe.includes('90') ? 90 : timeframe.includes('365') ? 365 : 90;
    
    const result = await executeAnalyticsTransaction(async (pgClient) => {
      const { rows } = await pgClient.query(
        'SELECT calculate_strength_progression($1, $2) as progression_data',
        [userId, days]
      );
      
      return rows[0]?.progression_data || {};
    });

    logger.info(`Strength progression retrieved successfully for user ${userId}`);
    
    return {
      userId,
      timeframe,
      hasData: Object.keys(result).length > 0,
      progression: result,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`Error in getStrengthProgression for user ${userId}: ${error.message}`);
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to retrieve strength progression: ${error.message}`);
  }
}

/**
 * Retrieves adherence metrics for a user
 * @param {string} userId - The user ID
 * @param {string} jwtToken - The user's JWT for RLS
 * @param {object} options - Optional parameters (timeframe)
 * @returns {Promise<object>} Adherence metrics data
 * @throws {DatabaseError} If the database operation fails
 */
async function getAdherenceMetrics(userId, jwtToken, options = {}) {
  const { timeframe = '30 days' } = options;
  
  logger.debug(`Retrieving adherence metrics for user: ${userId}, timeframe: ${timeframe}`);

  try {
    const days = timeframe.includes('7') ? 7 : timeframe.includes('30') ? 30 : timeframe.includes('90') ? 90 : 30;
    
    const result = await executeAnalyticsTransaction(async (pgClient) => {
      const { rows } = await pgClient.query(
        'SELECT compute_adherence_metrics($1, $2) as adherence_data',
        [userId, days]
      );
      
      return rows[0]?.adherence_data || {};
    });

    logger.info(`Adherence metrics retrieved successfully for user ${userId}`);
    
    return {
      userId,
      timeframe,
      hasData: Object.keys(result).length > 0,
      adherence: result,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`Error in getAdherenceMetrics for user ${userId}: ${error.message}`);
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to retrieve adherence metrics: ${error.message}`);
  }
}

/**
 * Refreshes analytics data for a user
 * @param {string} userId - The user ID
 * @param {string} jwtToken - The user's JWT for RLS
 * @param {object} options - Optional parameters (startDate, endDate)
 * @returns {Promise<object>} Refresh operation result
 * @throws {DatabaseError} If the database operation fails
 */
async function refreshUserAnalytics(userId, jwtToken, options = {}) {
  const { 
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate = new Date().toISOString().split('T')[0]
  } = options;
  
  logger.debug(`Refreshing analytics for user: ${userId}, from ${startDate} to ${endDate}`);

  try {
    const result = await executeAnalyticsTransaction(async (pgClient) => {
      await pgClient.query(
        'SELECT refresh_user_analytics($1, $2::date, $3::date)',
        [userId, startDate, endDate]
      );
      
      return { refreshed: true, startDate, endDate };
    });

    logger.info(`Analytics refreshed successfully for user ${userId}: ${startDate} to ${endDate}`);
    
    return {
      userId,
      operation: 'refresh',
      success: true,
      dateRange: { startDate, endDate },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`Error in refreshUserAnalytics for user ${userId}: ${error.message}`);
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Failed to refresh analytics: ${error.message}`);
  }
}

// Helper functions
function calculateAverage(data, field) {
  const validValues = data.filter(item => item[field] != null).map(item => item[field]);
  return validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : null;
}

function calculateWellnessScore(data) {
  const mood = data.avg_mood_score || 5;
  const sleep = data.avg_sleep_score || 5;
  const energy = data.avg_energy_level || 5;
  const stress = data.avg_stress_level || 5;
  
  return (mood + sleep + energy + (10 - stress)) / 4;
}

function groupDataByTimeframe(data, groupBy) {
  const grouped = {};
  
  data.forEach(item => {
    let key;
    const date = new Date(item.date);
    
    switch (groupBy) {
      case 'day':
        key = item.date;
        break;
      case 'week':
        key = item.week_start;
        break;
      case 'month':
        key = item.month_start;
        break;
      default:
        key = item.date;
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });
  
  return grouped;
}

function calculateTrend(groupedData, field) {
  const keys = Object.keys(groupedData).sort();
  const values = keys.map(key => {
    const dayData = groupedData[key];
    return calculateAverage(dayData, field);
  }).filter(val => val != null);
  
  if (values.length < 2) {
    return { trend: 'insufficient_data', values: [] };
  }
  
  // Simple linear trend calculation
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const change = lastValue - firstValue;
  const percentChange = firstValue !== 0 ? (change / firstValue) * 100 : 0;
  
  return {
    trend: change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable',
    change,
    percentChange,
    values: keys.map((key, index) => ({ date: key, value: values[index] })),
    firstValue,
    lastValue
  };
}

/**
 * ✅ TASK 2.4: Enhanced method to get trends data (wrapper for existing getProgressTrends)
 * This provides a consistent interface for the AnalyticsAgent
 */
async function getTrendsData(userId, timeframe = '30 days', jwtToken = null) {
  try {
    // Use existing getProgressTrends method with appropriate options
    const options = {
      timeframe,
      groupBy: 'week',
      metrics: ['weight', 'workouts', 'wellness']
    };
    
    const trends = await getProgressTrends(userId, jwtToken, options);
    
    // Return in format expected by AnalyticsAgent
    return {
      userId,
      timeframe,
      hasData: trends.hasData,
      trends: trends.trends,
      dataPoints: trends.dataPoints || 0,
      lastUpdated: trends.lastUpdated
    };
    
  } catch (error) {
    logger.error(`Error in getTrendsData for user ${userId}: ${error.message}`);
    throw error;
  }
}

/**
 * ✅ TASK 2.4: New AI insights method integrating AnalyticsAgent
 * Generates AI-powered insights and recommendations
 */
async function getAIInsights(userId, timeframe = '30 days', jwtToken) {
  try {
    logger.info(`Generating AI insights for user: ${userId}, timeframe: ${timeframe}`);
    
    // Ensure AI services are initialized
    const agent = await initializeAIServices();
    
    if (!agent) {
      throw new ApplicationError('AnalyticsAgent not available - AI services initialization required');
    }
    
    // Prepare context for AI analysis
    const context = {
      userId,
      timeframe,
      jwtToken,
      focusAreas: ['performance', 'adherence', 'progression'],
      startTime: Date.now()
    };
    
    // Use AnalyticsAgent to generate insights
    const result = await agent.process(context);
    
    if (result.status !== 'success') {
      throw new ApplicationError(`AI insight generation failed: ${result.message || 'Unknown error'}`);
    }
    
    logger.info(`AI insights generated successfully for user ${userId}: ${result.data.insights.length} insights`);
    
    return {
      status: 'success',
      data: {
        insights: result.data.insights,
        patterns: result.data.patterns,
        metadata: {
          ...result.data.metadata,
          aiGenerated: true
        },
        processingTime: result.processingTime
      },
      message: 'AI insights generated successfully.'
    };
    
  } catch (error) {
    logger.error(`Error generating AI insights for user ${userId}: ${error.message}`);
    
    if (error instanceof ApplicationError) {
      throw error;
    }
    
    throw new DatabaseError(`Failed to generate AI insights: ${error.message}`);
  }
}

/**
 * ✅ TASK 2.4: Pattern analysis method using AI pattern detection
 * Detects patterns in user data using sophisticated algorithms
 */
async function getPatternAnalysis(userId, timeframe = '30 days', jwtToken) {
  try {
    logger.info(`Analyzing patterns for user: ${userId}, timeframe: ${timeframe}`);
    
    // Initialize pattern detector with database connection
    const supabaseClient = getSupabaseClientWithToken(jwtToken);
    const patternDetector = new PatternDetector({
      supabaseClient: supabaseClient,
      logger: logger
    });
    
    // Gather user data for pattern analysis
    const userData = {
      overview: await getOverviewMetrics(userId, jwtToken, { timeframe }),
      trends: await getTrendsData(userId, timeframe, jwtToken),
      adherence: await getAdherenceMetrics(userId, jwtToken, { timeframe }),
      totalDataPoints: 0
    };
    
    // Calculate total data points
    userData.totalDataPoints = (userData.overview?.overview?.workouts?.completed || 0) +
                              (userData.trends?.dataPoints || 0) +
                              (userData.adherence?.adherence?.totalWorkouts || 0);
    
    // Detect patterns using AI-powered analysis
    const patterns = await patternDetector.detectPatterns(userData, { userId, timeframe });
    
    logger.info(`Pattern analysis completed for user ${userId}: ${patterns.length} patterns detected`);
    
    return {
      status: 'success',
      data: {
        patterns,
        userData: {
          hasData: userData.totalDataPoints > 0,
          dataPoints: userData.totalDataPoints
        },
        analysisDate: new Date().toISOString()
      },
      message: 'Pattern analysis completed successfully.'
    };
    
  } catch (error) {
    logger.error(`Error in pattern analysis for user ${userId}: ${error.message}`);
    
    if (error instanceof DatabaseError || error instanceof ApplicationError) {
      throw error;
    }
    
    throw new DatabaseError(`Failed to analyze patterns: ${error.message}`);
  }
}

/**
 * ✅ TASK 2.4: Personalized recommendations method
 * Generates actionable recommendations based on user data and AI analysis
 */
async function getPersonalizedRecommendations(userId, jwtToken, options = {}) {
  try {
    const { 
      timeframe = '30 days',
      categories = ['performance', 'adherence', 'progression', 'recommendations'],
      maxRecommendations = 10
    } = options;
    
    logger.info(`Generating personalized recommendations for user: ${userId}`);
    
    // Use AI insights to generate recommendations
    const aiInsights = await getAIInsights(userId, timeframe, jwtToken);
    
    if (!aiInsights.data?.insights) {
      return {
        status: 'success',
        data: {
          recommendations: [],
          hasData: false,
          message: 'Insufficient data for personalized recommendations'
        }
      };
    }
    
    // Filter and format recommendations from AI insights
    const recommendations = aiInsights.data.insights
      .filter(insight => categories.includes(insight.category?.toLowerCase()))
      .sort((a, b) => {
        // Sort by priority (high > medium > low) then by confidence
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const priorityDiff = (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
        if (priorityDiff !== 0) return priorityDiff;
        return (b.confidence || 0) - (a.confidence || 0);
      })
      .slice(0, maxRecommendations)
      .map(insight => ({
        id: insight.id,
        title: insight.title,
        description: insight.description,
        actionableSteps: insight.actionable_steps || insight.actionableSteps || [],
        priority: insight.priority,
        confidence: insight.confidence,
        category: insight.category,
        estimatedImpact: insight.impact_potential || 'Positive impact on fitness journey',
        timeToImplement: insight.time_to_implement || 'varies'
      }));
    
    logger.info(`Generated ${recommendations.length} personalized recommendations for user ${userId}`);
    
    return {
      status: 'success',
      data: {
        recommendations,
        hasData: recommendations.length > 0,
        totalRecommendations: recommendations.length,
        categories: [...new Set(recommendations.map(r => r.category))],
        generatedAt: new Date().toISOString()
      },
      message: `${recommendations.length} personalized recommendations generated successfully.`
    };
    
  } catch (error) {
    logger.error(`Error generating personalized recommendations for user ${userId}: ${error.message}`);
    
    if (error instanceof DatabaseError || error instanceof ApplicationError) {
      throw error;
    }
    
    throw new DatabaseError(`Failed to generate personalized recommendations: ${error.message}`);
  }
}

/**
 * ✅ TASK 2.4: Goal prediction method using AI analysis
 * Predicts goal achievement likelihood based on current progress
 */
async function getGoalPredictions(userId, goalType, jwtToken, options = {}) {
  try {
    const { timeframe = '90 days' } = options;
    
    logger.info(`Generating goal predictions for user: ${userId}, goal type: ${goalType}`);
    
    // Get comprehensive data for prediction
    const [overview, trends, patterns] = await Promise.all([
      getOverviewMetrics(userId, jwtToken, { timeframe }),
      getTrendsData(userId, timeframe, jwtToken),
      getPatternAnalysis(userId, timeframe, jwtToken)
    ]);
    
    // Ensure AI services are initialized
    const agent = await initializeAIServices();
    
    if (!agent) {
      throw new ApplicationError('AnalyticsAgent not available for goal predictions');
    }
    
    // Use AI to analyze goal achievement probability
    const context = {
      userId,
      timeframe,
      goalType,
      userData: { overview, trends, patterns: patterns.data.patterns },
      focusAreas: ['progression', 'adherence'],
      predictionType: 'goal_achievement'
    };
    
    const result = await agent.process(context);
    
    if (result.status !== 'success') {
      throw new ApplicationError(`Goal prediction failed: ${result.message || 'Unknown error'}`);
    }
    
    // Format prediction results
    const prediction = {
      goalType,
      achievementProbability: result.data.metadata?.confidenceScore || 0.5,
      timeToGoal: _estimateTimeToGoal(trends, goalType),
      keyFactors: _extractKeyFactors(result.data.insights, patterns.data.patterns),
      recommendations: result.data.insights
        .filter(insight => insight.category === 'RECOMMENDATIONS')
        .slice(0, 3),
      dataQuality: overview.dataQuality || 0.7
    };
    
    logger.info(`Goal predictions generated for user ${userId}: ${(prediction.achievementProbability * 100).toFixed(1)}% likelihood`);
    
    return {
      status: 'success',
      data: {
        prediction,
        generatedAt: new Date().toISOString(),
        basedOnData: {
          timeframe,
          dataPoints: overview.overview?.workouts?.completed || 0
        }
      },
      message: 'Goal predictions generated successfully.'
    };
    
  } catch (error) {
    logger.error(`Error generating goal predictions for user ${userId}: ${error.message}`);
    
    if (error instanceof DatabaseError || error instanceof ApplicationError) {
      throw error;
    }
    
    throw new DatabaseError(`Failed to generate goal predictions: ${error.message}`);
  }
}

// ✅ TASK 2.4: Helper methods for goal predictions
function _estimateTimeToGoal(trends, goalType) {
  // Simple estimation based on current trends
  if (!trends.hasData || !trends.trends) {
    return 'insufficient_data';
  }
  
  // Basic estimation logic (can be enhanced with more sophisticated algorithms)
  const progressRate = trends.trends.weight?.percentChange || 0;
  
  if (Math.abs(progressRate) < 0.1) {
    return '6-12 months'; // Slow progress
  } else if (Math.abs(progressRate) < 0.5) {
    return '3-6 months'; // Moderate progress
  } else {
    return '1-3 months'; // Fast progress
  }
}

function _extractKeyFactors(insights, patterns) {
  const factors = [];
  
  // Extract key factors from insights
  insights.forEach(insight => {
    if (insight.category === 'PERFORMANCE' || insight.category === 'ADHERENCE') {
      factors.push({
        factor: insight.title,
        impact: insight.priority === 'high' ? 'major' : 'moderate',
        description: insight.description.substring(0, 100) + '...'
      });
    }
  });
  
  // Extract key factors from patterns
  patterns.forEach(pattern => {
    if (pattern.confidence > 0.7) {
      factors.push({
        factor: pattern.type,
        impact: pattern.confidence > 0.8 ? 'major' : 'moderate',
        description: pattern.description.substring(0, 100) + '...'
      });
    }
  });
  
  return factors.slice(0, 5); // Return top 5 factors
}

module.exports = {
  executeAnalyticsTransaction,
  getOverviewMetrics,
  getProgressTrends,
  getStrengthProgression,
  getAdherenceMetrics,
  refreshUserAnalytics,
  getTrendsData,
  getAIInsights,
  getPatternAnalysis,
  getPersonalizedRecommendations,
  getGoalPredictions
}; 