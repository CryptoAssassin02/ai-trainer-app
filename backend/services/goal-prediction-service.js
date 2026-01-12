const { AnalyticsAgent } = require('../agents/analytics-agent');
const OpenAIService = require('./openai-service');
const logger = require('../config/logger');
const { DatabaseError, NotFoundError, ApplicationError } = require('../utils/errors');
const { getSupabaseClientWithToken } = require('./supabase');

/**
 * Goal Prediction Service
 * AI-powered goal achievement prediction and timeline estimation
 * Following established analytics integration rules and patterns
 */
class GoalPredictionService {
  constructor({ analyticsAgent, analyticsService, supabaseClient, logger: serviceLogger }) {
    this.analyticsAgent = analyticsAgent;
    this.analyticsService = analyticsService;
    this.supabaseClient = supabaseClient;
    this.logger = serviceLogger || logger;
    this.openaiService = new OpenAIService();
    this.predictionCache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Predict goal achievement probability and timeline
   * ✅ FOLLOWS RULE: JWT Token Parameter Ordering (userId, jwtToken, options)
   * @param {string} userId - The user ID
   * @param {string} jwtToken - JWT token for authentication
   * @param {object} goalDefinition - Goal definition with type, target, timeframe
   * @param {object} options - Optional parameters
   * @returns {Promise<object>} Goal prediction results
   */
  async predictGoalAchievement(userId, jwtToken, goalDefinition, options = {}) {
    try {
      if (!jwtToken) {
        throw new ApplicationError('JWT token required for goal prediction');
      }

      if (!userId) {
        throw new ApplicationError('User ID required for goal prediction');
      }

      if (!goalDefinition || !goalDefinition.type || !goalDefinition.target) {
        throw new ApplicationError('Goal definition with type and target required');
      }

      this.logger.info(`Predicting goal achievement for user: ${userId}, goal type: ${goalDefinition.type}`);

      // Check cache first
      const cacheKey = `${userId}-${JSON.stringify(goalDefinition)}`;
      const cachedResult = this._getCachedPrediction(cacheKey);
      if (cachedResult && !options.force) {
        this.logger.debug(`Returning cached goal prediction for user: ${userId}`);
        return cachedResult;
      }

      // ✅ FOLLOWS RULE: Consistent JWT token parameter ordering
      const progressData = await this._getCurrentProgress(userId, jwtToken, goalDefinition.type);
      const trendData = await this._getProgressTrends(userId, jwtToken, goalDefinition.type, '6months');
      const userProfile = await this._getUserProfile(userId, jwtToken);
      
      // ✅ FOLLOWS RULE: Real AI Integration with robust response handling
      const aiResponse = await this._generateAIPrediction(userId, {
        currentProgress: progressData,
        historicalTrends: trendData,
        userProfile: userProfile,
        goalTarget: goalDefinition.target,
        timeframe: goalDefinition.timeframe,
        goalType: goalDefinition.type
      });

      const result = {
        status: 'success',
        data: {
          goalType: goalDefinition.type,
          achievementProbability: aiResponse.probability,
          estimatedTimeToCompletion: aiResponse.timeEstimate,
          confidenceScore: aiResponse.confidence,
          recommendedAdjustments: aiResponse.recommendations,
          milestones: aiResponse.milestones,
          riskFactors: aiResponse.risks,
          predictionDate: new Date().toISOString(),
          dataQuality: this._assessDataQuality(progressData, trendData)
        }
      };

      // Cache the result
      this._cacheResult(cacheKey, result);

      return result;

    } catch (error) {
      this.logger.error('Goal prediction error:', error);
      
      // Return fallback prediction for better UX
      return this._getFallbackPrediction(goalDefinition, error);
    }
  }

  /**
   * Track goal progress and milestone achievements
   * ✅ FOLLOWS RULE: JWT Token Parameter Ordering consistency
   * @param {string} userId - User ID
   * @param {string} jwtToken - JWT token
   * @param {string} goalId - Goal ID to track
   * @param {object} options - Options
   * @returns {Promise<object>} Progress tracking results
   */
  async trackGoalProgress(userId, jwtToken, goalId, options = {}) {
    try {
      if (!jwtToken) {
        throw new ApplicationError('JWT token required for goal tracking');
      }

      const goal = await this._getGoalDefinition(goalId, jwtToken);
      if (!goal) {
        throw new NotFoundError(`Goal not found: ${goalId}`);
      }

      if (goal.user_id !== userId) {
        throw new ApplicationError('Unauthorized access to goal');
      }

      // ✅ FOLLOWS RULE: JWT Token Parameter Ordering
      const currentMetrics = await this._getCurrentMetrics(userId, jwtToken, goal.type);
      
      const progressPercentage = this._calculateProgressPercentage(
        goal.baseline || {},
        currentMetrics,
        goal.target
      );

      const milestones = await this._checkMilestoneAchievements(
        goalId,
        progressPercentage,
        jwtToken
      );

      // Update progress in database
      await this._updateGoalProgress(goalId, progressPercentage, jwtToken);

      return {
        status: 'success',
        data: {
          goalId,
          goalType: goal.type,
          progressPercentage: Math.round(progressPercentage * 100) / 100,
          currentValue: currentMetrics.value,
          targetValue: goal.target.value,
          milestonesAchieved: milestones,
          lastUpdated: new Date().toISOString(),
          onTrack: progressPercentage >= this._getExpectedProgress(goal),
          daysRemaining: this._calculateDaysRemaining(goal)
        }
      };

    } catch (error) {
      this.logger.error('Goal tracking error:', error);
      throw error;
    }
  }

  /**
   * Generate AI prediction using OpenAI with robust error handling
   * ✅ FOLLOWS RULE: Robust AI Response Parsing with 6000+ tokens
   * @private
   * @param {string} userId - User ID
   * @param {object} context - Prediction context
   * @returns {Promise<object>} AI prediction response
   */
  async _generateAIPrediction(userId, context) {
    try {
      const prompt = this._buildPredictionPrompt(context);
      
      this.logger.debug(`Generating AI prediction for user: ${userId}`);
      
      const response = await this.openaiService.generateChatCompletion({
        messages: [{
          role: 'system',
          content: `You are an expert fitness coach and data analyst. Analyze user fitness data and provide realistic goal achievement predictions in strict JSON format. 
          
          Always respond with a valid JSON object containing:
          - probability (0-1): realistic achievement probability
          - timeEstimate (string): estimated time to completion
          - confidence (0-1): confidence in prediction
          - recommendations (array): specific actionable recommendations
          - milestones (array): key milestones with dates and descriptions
          - risks (array): potential risk factors
          
          Base predictions on data trends, not optimistic assumptions.`
        }, {
          role: 'user',
          content: prompt
        }],
        maxTokens: 6000, // ✅ FOLLOWS RULE: Adequate token limit for complex JSON
        temperature: 0.3,
        responseFormat: { type: 'json_object' }
      });

      // ✅ FOLLOWS RULE: Robust JSON parsing with fallback mechanisms
      return await this._parseAIResponse(response, {
        probability: 0.5,
        timeEstimate: 'Unable to estimate - insufficient data',
        confidence: 0.1,
        recommendations: ['Consult with a fitness professional', 'Track more data points'],
        milestones: [],
        risks: ['Insufficient historical data for accurate prediction']
      });
      
    } catch (error) {
      this.logger.error('AI prediction generation failed:', error);
      
      // ✅ FOLLOWS RULE: Fallback for AI failures
      return {
        probability: 0.5,
        timeEstimate: 'Unable to estimate due to AI service unavailable',
        confidence: 0.1,
        recommendations: ['AI service temporarily unavailable - try again later'],
        milestones: [],
        risks: ['AI prediction service currently unavailable']
      };
    }
  }

  /**
   * Parse AI response with robust error handling
   * ✅ FOLLOWS RULE: Robust AI Response Parsing with truncation detection
   * @private
   * @param {object} response - OpenAI response
   * @param {object} fallbackData - Fallback data if parsing fails
   * @returns {Promise<object>} Parsed response
   */
  async _parseAIResponse(response, fallbackData) {
    try {
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // ✅ FOLLOWS RULE: Handle potential JSON truncation
      const cleanedContent = content.trim();
      if (!cleanedContent.endsWith('}') && !cleanedContent.endsWith(']')) {
        this.logger.warn('OpenAI response appears truncated, attempting recovery');
        const recovered = this._attemptJSONRecovery(cleanedContent);
        return JSON.parse(recovered);
      }

      const parsed = JSON.parse(cleanedContent);
      
      // ✅ FOLLOWS RULE: Validate required fields
      const requiredFields = ['probability', 'timeEstimate', 'confidence', 'recommendations'];
      const missingFields = requiredFields.filter(field => parsed[field] === undefined);
      
      if (missingFields.length > 0) {
        throw new Error(`AI response missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate data types and ranges
      if (typeof parsed.probability !== 'number' || parsed.probability < 0 || parsed.probability > 1) {
        parsed.probability = 0.5;
      }
      
      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
        parsed.confidence = 0.3;
      }

      if (!Array.isArray(parsed.recommendations)) {
        parsed.recommendations = fallbackData.recommendations;
      }

      if (!Array.isArray(parsed.milestones)) {
        parsed.milestones = [];
      }

      if (!Array.isArray(parsed.risks)) {
        parsed.risks = fallbackData.risks;
      }

      return parsed;
      
    } catch (parseError) {
      this.logger.error('AI response parsing failed:', parseError.message);
      return fallbackData;
    }
  }

  /**
   * Attempt to recover truncated JSON
   * @private
   * @param {string} truncatedJson - Truncated JSON string
   * @returns {string} Recovered JSON string
   */
  _attemptJSONRecovery(truncatedJson) {
    try {
      // Try to close the JSON object/array
      if (truncatedJson.includes('{') && !truncatedJson.endsWith('}')) {
        // Count open braces
        const openBraces = (truncatedJson.match(/\{/g) || []).length;
        const closeBraces = (truncatedJson.match(/\}/g) || []).length;
        const missingBraces = openBraces - closeBraces;
        
        return truncatedJson + '}'.repeat(missingBraces);
      }
      
      if (truncatedJson.includes('[') && !truncatedJson.endsWith(']')) {
        // Count open brackets
        const openBrackets = (truncatedJson.match(/\[/g) || []).length;
        const closeBrackets = (truncatedJson.match(/\]/g) || []).length;
        const missingBrackets = openBrackets - closeBrackets;
        
        return truncatedJson + ']'.repeat(missingBrackets);
      }
      
      return truncatedJson;
    } catch (error) {
      this.logger.error('JSON recovery failed:', error);
      return truncatedJson;
    }
  }

  /**
   * Build prediction prompt for AI
   * @private
   * @param {object} context - Context data
   * @returns {string} Formatted prompt
   */
  _buildPredictionPrompt(context) {
    return `
Analyze this fitness data and predict goal achievement:

GOAL DETAILS:
- Type: ${context.goalType}
- Target: ${JSON.stringify(context.goalTarget)}
- Timeframe: ${context.timeframe || 'Not specified'}

CURRENT PROGRESS:
${JSON.stringify(context.currentProgress, null, 2)}

HISTORICAL TRENDS (6 months):
${JSON.stringify(context.historicalTrends, null, 2)}

USER PROFILE:
${JSON.stringify(context.userProfile, null, 2)}

Please provide a realistic assessment including:
1. Achievement probability (0-1)
2. Estimated completion time
3. Confidence score (0-1)
4. Specific recommendations
5. Key milestones with dates
6. Potential risk factors

Respond in valid JSON format only.
`;
  }

  /**
   * Get current progress data
   * ✅ FOLLOWS RULE: JWT Token Parameter Ordering
   * @private
   */
  async _getCurrentProgress(userId, jwtToken, goalType) {
    try {
      const supabaseWithAuth = getSupabaseClientWithToken(jwtToken);
      
      // Get latest analytics data
      const { data: analytics, error } = await supabaseWithAuth
        .from('user_analytics_aggregates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw new DatabaseError(`Failed to get progress data: ${error.message}`);

      const latestAnalytics = analytics[0] || {};

      // Map goal type to relevant metrics
      const progressMapping = {
        'weight_loss': {
          current: latestAnalytics.current_weight || 0,
          trend: latestAnalytics.weight_trend || 'stable',
          adherence: latestAnalytics.workout_adherence_rate || 0
        },
        'muscle_gain': {
          current: latestAnalytics.current_weight || 0,
          strength: latestAnalytics.strength_progression || 0,
          trend: latestAnalytics.strength_trend || 'stable',
          adherence: latestAnalytics.workout_adherence_rate || 0
        },
        'endurance': {
          current: latestAnalytics.endurance_score || 0,
          trend: latestAnalytics.endurance_trend || 'stable',
          adherence: latestAnalytics.workout_adherence_rate || 0
        },
        'strength': {
          current: latestAnalytics.strength_progression || 0,
          trend: latestAnalytics.strength_trend || 'stable',
          adherence: latestAnalytics.workout_adherence_rate || 0
        }
      };

      return progressMapping[goalType] || {
        current: 0,
        trend: 'unknown',
        adherence: 0
      };

    } catch (error) {
      this.logger.error(`Error getting current progress for ${goalType}:`, error);
      return { current: 0, trend: 'unknown', adherence: 0 };
    }
  }

  /**
   * Get progress trends over time
   * ✅ FOLLOWS RULE: JWT Token Parameter Ordering
   * @private
   */
  async _getProgressTrends(userId, jwtToken, goalType, timeRange) {
    try {
      const supabaseWithAuth = getSupabaseClientWithToken(jwtToken);
      
      let dateFilter;
      switch (timeRange) {
        case '1month':
          dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '3months':
          dateFilter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '6months':
        default:
          dateFilter = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
          break;
      }

      const { data: trends, error } = await supabaseWithAuth
        .from('user_analytics_aggregates')
        .select('created_at, workout_adherence_rate, strength_progression, current_weight, endurance_score')
        .eq('user_id', userId)
        .gte('created_at', dateFilter.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw new DatabaseError(`Failed to get trend data: ${error.message}`);

      return trends || [];

    } catch (error) {
      this.logger.error(`Error getting progress trends for ${goalType}:`, error);
      return [];
    }
  }

  /**
   * Get user profile data
   * ✅ FOLLOWS RULE: JWT Token Parameter Ordering
   * @private
   */
  async _getUserProfile(userId, jwtToken) {
    try {
      const supabaseWithAuth = getSupabaseClientWithToken(jwtToken);
      
      const { data: profile, error } = await supabaseWithAuth
        .from('profiles')
        .select('age, gender, height, weight, preferences, goals')
        .eq('id', userId)
        .single();

      if (error) throw new DatabaseError(`Failed to get user profile: ${error.message}`);

      return profile || {};

    } catch (error) {
      this.logger.error('Error getting user profile:', error);
      return {};
    }
  }

  /**
   * Calculate progress percentage
   * @private
   */
  _calculateProgressPercentage(baseline, current, target) {
    try {
      if (!baseline.value || !current.current || !target.value) {
        return 0;
      }

      const progress = (current.current - baseline.value) / (target.value - baseline.value);
      return Math.max(0, Math.min(1, progress)); // Clamp between 0 and 1

    } catch (error) {
      this.logger.error('Error calculating progress percentage:', error);
      return 0;
    }
  }

  /**
   * Cache management methods
   * @private
   */
  _getCachedPrediction(key) {
    const cached = this.predictionCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  _cacheResult(key, result) {
    this.predictionCache.set(key, {
      data: result,
      timestamp: Date.now()
    });
  }

  /**
   * Get fallback prediction when AI fails
   * @private
   */
  _getFallbackPrediction(goalDefinition, error) {
    return {
      status: 'success',
      data: {
        goalType: goalDefinition.type,
        achievementProbability: 0.5,
        estimatedTimeToCompletion: 'Unable to estimate - service temporarily unavailable',
        confidenceScore: 0.1,
        recommendedAdjustments: [
          'AI prediction service is temporarily unavailable',
          'Please try again later',
          'Consider consulting with a fitness professional'
        ],
        milestones: [],
        riskFactors: ['Prediction service unavailable'],
        predictionDate: new Date().toISOString(),
        fallback: true,
        error: error.message
      }
    };
  }

  /**
   * Assess data quality for prediction confidence
   * @private
   */
  _assessDataQuality(progressData, trendData) {
    const hasProgressData = progressData && progressData.current > 0;
    const hasTrendData = trendData && trendData.length > 0;
    const hasRecentData = trendData && trendData.length > 0 && 
      new Date(trendData[trendData.length - 1].created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    if (hasProgressData && hasTrendData && hasRecentData) {
      return 'high';
    } else if (hasProgressData && hasTrendData) {
      return 'medium';
    } else if (hasProgressData) {
      return 'low';
    } else {
      return 'insufficient';
    }
  }

  /**
   * Create a new goal with baseline metrics
   * ✅ FOLLOWS RULE: JWT Token Parameter Ordering (userId, jwtToken, goalDefinition)
   * @param {string} userId - User ID
   * @param {string} jwtToken - JWT token
   * @param {object} goalDefinition - Goal definition
   * @returns {Promise<object>} Created goal
   */
  async createGoal(userId, jwtToken, goalDefinition) {
    try {
      if (!jwtToken) {
        throw new ApplicationError('JWT token required for goal creation');
      }

      if (!userId) {
        throw new ApplicationError('User ID required for goal creation');
      }

      if (!goalDefinition || !goalDefinition.type || !goalDefinition.target) {
        throw new ApplicationError('Goal definition with type and target required');
      }

      this.logger.info(`Creating goal for user: ${userId}, type: ${goalDefinition.type}`);

      const supabaseWithAuth = getSupabaseClientWithToken(jwtToken);
      
      // Get current baseline metrics
      const baselineMetrics = await this._getCurrentProgress(userId, jwtToken, goalDefinition.type);
      
      // Create goal record
      const goalData = {
        user_id: userId,
        type: goalDefinition.type,
        target: goalDefinition.target,
        baseline: {
          value: baselineMetrics.current,
          recordedAt: new Date().toISOString()
        },
        timeframe: goalDefinition.timeframe,
        description: goalDefinition.description || `${goalDefinition.type} goal`,
        status: 'active',
        created_at: new Date().toISOString()
      };

      const { data: createdGoal, error } = await supabaseWithAuth
        .from('user_goals')
        .insert(goalData)
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Failed to create goal: ${error.message}`);
      }

      return {
        status: 'success',
        data: {
          goalId: createdGoal.id,
          type: createdGoal.type,
          target: createdGoal.target,
          baseline: createdGoal.baseline,
          timeframe: createdGoal.timeframe,
          status: createdGoal.status,
          createdAt: createdGoal.created_at
        }
      };

    } catch (error) {
      this.logger.error('Goal creation error:', error);
      throw error;
    }
  }

  /**
   * Update an existing goal
   * ✅ FOLLOWS RULE: JWT Token Parameter Ordering (userId, jwtToken, goalId, updates)
   * @param {string} userId - User ID
   * @param {string} jwtToken - JWT token
   * @param {string} goalId - Goal ID
   * @param {object} updates - Goal updates
   * @returns {Promise<object>} Updated goal
   */
  async updateGoal(userId, jwtToken, goalId, updates) {
    try {
      if (!jwtToken) {
        throw new ApplicationError('JWT token required for goal update');
      }

      if (!goalId) {
        throw new ApplicationError('Goal ID required for goal update');
      }

      this.logger.info(`Updating goal for user: ${userId}, goalId: ${goalId}`);

      const supabaseWithAuth = getSupabaseClientWithToken(jwtToken);
      
      // Verify goal exists and belongs to user
      const { data: existingGoal, error: fetchError } = await supabaseWithAuth
        .from('user_goals')
        .select('*')
        .eq('id', goalId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !existingGoal) {
        throw new NotFoundError(`Goal not found: ${goalId}`);
      }

      // Prepare update data
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data: updatedGoal, error } = await supabaseWithAuth
        .from('user_goals')
        .update(updateData)
        .eq('id', goalId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Failed to update goal: ${error.message}`);
      }

      return {
        status: 'success',
        data: {
          goalId: updatedGoal.id,
          type: updatedGoal.type,
          target: updatedGoal.target,
          timeframe: updatedGoal.timeframe,
          status: updatedGoal.status,
          description: updatedGoal.description,
          updatedAt: updatedGoal.updated_at
        }
      };

    } catch (error) {
      this.logger.error('Goal update error:', error);
      throw error;
    }
  }

  /**
   * Get all goals for a user
   * ✅ FOLLOWS RULE: JWT Token Parameter Ordering (userId, jwtToken, options)
   * @param {string} userId - User ID
   * @param {string} jwtToken - JWT token
   * @param {object} options - Filter options
   * @returns {Promise<object>} User goals
   */
  async getUserGoals(userId, jwtToken, options = {}) {
    try {
      if (!jwtToken) {
        throw new ApplicationError('JWT token required for retrieving goals');
      }

      if (!userId) {
        throw new ApplicationError('User ID required for retrieving goals');
      }

      this.logger.info(`Retrieving goals for user: ${userId}`);

      const supabaseWithAuth = getSupabaseClientWithToken(jwtToken);
      
      let query = supabaseWithAuth
        .from('user_goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.status) {
        query = query.eq('status', options.status);
      }
      
      if (options.type) {
        query = query.eq('type', options.type);
      }
      
      if (options.timeframe) {
        query = query.eq('timeframe', options.timeframe);
      }

      const { data: goals, error } = await query;

      if (error) {
        throw new DatabaseError(`Failed to retrieve goals: ${error.message}`);
      }

      // Calculate progress for each goal
      const goalsWithProgress = await Promise.all(
        (goals || []).map(async (goal) => {
          try {
            const currentMetrics = await this._getCurrentProgress(userId, jwtToken, goal.type);
            const progressPercentage = this._calculateProgressPercentage(
              goal.baseline || {},
              currentMetrics,
              goal.target
            );

            return {
              ...goal,
              progressPercentage: Math.round(progressPercentage * 100) / 100,
              onTrack: progressPercentage >= this._getExpectedProgress(goal),
              daysRemaining: this._calculateDaysRemaining(goal)
            };
          } catch (progressError) {
            this.logger.warn(`Failed to calculate progress for goal ${goal.id}:`, progressError);
            return {
              ...goal,
              progressPercentage: 0,
              onTrack: false,
              daysRemaining: null
            };
          }
        })
      );

      return {
        status: 'success',
        data: {
          goals: goalsWithProgress,
          totalGoals: goalsWithProgress.length,
          activeGoals: goalsWithProgress.filter(g => g.status === 'active').length,
          completedGoals: goalsWithProgress.filter(g => g.status === 'completed').length
        }
      };

    } catch (error) {
      this.logger.error('Goal retrieval error:', error);
      throw error;
    }
  }

  /**
   * Get goal definition by ID
   * @private
   * @param {string} goalId - Goal ID
   * @param {string} jwtToken - JWT token
   * @returns {Promise<object>} Goal definition
   */
  async _getGoalDefinition(goalId, jwtToken) {
    try {
      const supabaseWithAuth = getSupabaseClientWithToken(jwtToken);
      
      const { data: goal, error } = await supabaseWithAuth
        .from('user_goals')
        .select('*')
        .eq('id', goalId)
        .single();

      if (error) {
        throw new DatabaseError(`Failed to get goal definition: ${error.message}`);
      }

      return goal;

    } catch (error) {
      this.logger.error('Error getting goal definition:', error);
      return null;
    }
  }

  /**
   * Get current metrics for goal tracking
   * @private
   * @param {string} userId - User ID
   * @param {string} jwtToken - JWT token
   * @param {string} goalType - Goal type
   * @returns {Promise<object>} Current metrics
   */
  async _getCurrentMetrics(userId, jwtToken, goalType) {
    try {
      const supabaseWithAuth = getSupabaseClientWithToken(jwtToken);
      
      // Get latest analytics data
      const { data: analytics, error } = await supabaseWithAuth
        .from('user_analytics_aggregates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw new DatabaseError(`Failed to get current metrics: ${error.message}`);

      const latestAnalytics = analytics[0] || {};

      // Map goal type to current value
      const metricsMapping = {
        'weight_loss': { value: latestAnalytics.current_weight || 0 },
        'muscle_gain': { value: latestAnalytics.current_weight || 0 },
        'strength': { value: latestAnalytics.strength_progression || 0 },
        'endurance': { value: latestAnalytics.endurance_score || 0 },
        'body_composition': { value: latestAnalytics.body_fat_percentage || 0 }
      };

      return metricsMapping[goalType] || { value: 0 };

    } catch (error) {
      this.logger.error(`Error getting current metrics for ${goalType}:`, error);
      return { value: 0 };
    }
  }

  /**
   * Check milestone achievements
   * @private
   * @param {string} goalId - Goal ID
   * @param {number} progressPercentage - Current progress percentage
   * @param {string} jwtToken - JWT token
   * @returns {Promise<Array>} Achieved milestones
   */
  async _checkMilestoneAchievements(goalId, progressPercentage, jwtToken) {
    try {
      // Define standard milestones
      const milestones = [
        { percentage: 0.25, name: '25% Complete', description: 'Quarter way there!' },
        { percentage: 0.5, name: '50% Complete', description: 'Halfway to your goal!' },
        { percentage: 0.75, name: '75% Complete', description: 'Three quarters complete!' },
        { percentage: 1.0, name: 'Goal Achieved', description: 'Congratulations! Goal completed!' }
      ];

      const achievedMilestones = milestones.filter(
        milestone => progressPercentage >= milestone.percentage
      );

      return achievedMilestones;

    } catch (error) {
      this.logger.error('Error checking milestone achievements:', error);
      return [];
    }
  }

  /**
   * Update goal progress in database
   * @private
   * @param {string} goalId - Goal ID
   * @param {number} progressPercentage - Progress percentage
   * @param {string} jwtToken - JWT token
   */
  async _updateGoalProgress(goalId, progressPercentage, jwtToken) {
    try {
      const supabaseWithAuth = getSupabaseClientWithToken(jwtToken);
      
      const { error } = await supabaseWithAuth
        .from('user_goals')
        .update({ 
          progress_percentage: progressPercentage,
          last_progress_update: new Date().toISOString()
        })
        .eq('id', goalId);

      if (error) {
        throw new DatabaseError(`Failed to update goal progress: ${error.message}`);
      }

    } catch (error) {
      this.logger.error('Error updating goal progress:', error);
      // Don't throw error here to avoid affecting main flow
    }
  }

  /**
   * Get expected progress based on goal timeframe
   * @private
   * @param {object} goal - Goal object
   * @returns {number} Expected progress percentage
   */
  _getExpectedProgress(goal) {
    try {
      if (!goal.created_at || !goal.timeframe) {
        return 0;
      }

      const startDate = new Date(goal.created_at);
      const currentDate = new Date();
      
      // Calculate timeframe in days
      let timeframeDays;
      switch (goal.timeframe) {
        case '1month':
          timeframeDays = 30;
          break;
        case '3months':
          timeframeDays = 90;
          break;
        case '6months':
          timeframeDays = 180;
          break;
        case '1year':
          timeframeDays = 365;
          break;
        default:
          timeframeDays = 90; // Default to 3 months
      }

      const elapsedDays = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
      const expectedProgress = Math.min(1, elapsedDays / timeframeDays);

      return expectedProgress;

    } catch (error) {
      this.logger.error('Error calculating expected progress:', error);
      return 0;
    }
  }

  /**
   * Calculate days remaining for goal
   * @private
   * @param {object} goal - Goal object
   * @returns {number} Days remaining
   */
  _calculateDaysRemaining(goal) {
    try {
      if (!goal.created_at || !goal.timeframe) {
        return null;
      }

      const startDate = new Date(goal.created_at);
      const currentDate = new Date();
      
      let timeframeDays;
      switch (goal.timeframe) {
        case '1month':
          timeframeDays = 30;
          break;
        case '3months':
          timeframeDays = 90;
          break;
        case '6months':
          timeframeDays = 180;
          break;
        case '1year':
          timeframeDays = 365;
          break;
        default:
          timeframeDays = 90;
      }

      const elapsedDays = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, timeframeDays - elapsedDays);

      return remainingDays;

    } catch (error) {
      this.logger.error('Error calculating days remaining:', error);
      return null;
    }
  }
}

module.exports = GoalPredictionService; 