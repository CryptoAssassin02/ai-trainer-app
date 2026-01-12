const BaseAgent = require('./base-agent');
const { AgentError, ERROR_CODES } = require('../utils/errors');

/**
 * AnalyticsAgent - AI-powered analytics and insight generation
 * 
 * Responsibilities:
 * - Analyze user fitness data patterns using AI
 * - Generate personalized insights and recommendations
 * - Detect meaningful trends in workout and progress data
 * - Provide actionable feedback for fitness improvement
 * 
 * Follows established BaseAgent pattern with:
 * - Real OpenAI API integration (not mocks)
 * - Proper error handling with AgentError/ERROR_CODES
 * - Memory system integration for insight storage
 * - Cross-service dependencies (OpenAI + Analytics Service)
 */
class AnalyticsAgent extends BaseAgent {
  constructor({ openaiService, analyticsService, supabaseClient, memorySystem, logger, config = {} } = {}) {
    super({ memorySystem, logger, config });
    
    // Validate required dependencies following established pattern
    if (!openaiService) {
      throw new AgentError('OpenAI service instance is required for AnalyticsAgent.', ERROR_CODES.CONFIGURATION_ERROR);
    }
    
    if (!analyticsService) {
      throw new AgentError('Analytics service instance is required for AnalyticsAgent.', ERROR_CODES.CONFIGURATION_ERROR);
    }
    
    if (!supabaseClient) {
      throw new AgentError('Supabase client instance is required for AnalyticsAgent.', ERROR_CODES.CONFIGURATION_ERROR);
    }
    
    this.agentType = 'analytics';
    this.openaiService = openaiService;
    this.analyticsService = analyticsService;
    this.supabaseClient = supabaseClient;
    
    // Agent-specific configuration
    this.config = {
      maxTokens: 6000,
      temperature: 0.3, // Lower temperature for more consistent analytical insights
      model: 'gpt-4o-mini', // Cost-effective model for analytics
      insightCategories: ['performance', 'adherence', 'progression', 'recommendations'],
      ...config
    };
    
    this.logger?.info('AnalyticsAgent initialized', {
      agentType: this.agentType,
      model: this.config.model,
      hasMemorySystem: !!this.memorySystem
    });
  }
  
  /**
   * Main processing method following BaseAgent pattern
   * Analyzes user data and generates AI-powered insights
   * 
   * @param {Object} context - Analysis context
   * @param {string} context.userId - User identifier
   * @param {string} context.timeframe - Analysis timeframe (e.g., '7 days', '30 days')
   * @param {string[]} [context.focusAreas] - Specific areas to analyze
   * @param {Object} [context.additionalData] - Additional context data
   * @returns {Promise<Object>} Analysis result with insights and patterns
   */
  async process(context) {
    try {
      this.logger?.info('AnalyticsAgent processing started', { 
        userId: context.userId,
        timeframe: context.timeframe,
        focusAreas: context.focusAreas
      });
      
      // Step 1: Validate input context
      this._validateAnalysisContext(context);
      
      // Step 2: Gather comprehensive user data
      const userData = await this._gatherUserData(context);
      
      // Step 3: Detect patterns using AI-powered analysis
      const patterns = await this._detectPatterns(userData, context);
      
      // Step 4: Generate insights using OpenAI
      const insights = await this._generateInsights(patterns, userData, context);
      
      // Step 5: Store insights in memory system for future reference
      await this._storeInsights(context.userId, insights, patterns);
      
      // Step 6: Format response following established pattern
      const result = {
        status: 'success',
        data: {
          insights,
          patterns,
          metadata: {
            timeframe: context.timeframe,
            analysisDate: new Date().toISOString(),
            dataPoints: userData.totalDataPoints,
            confidenceScore: this._calculateConfidenceScore(userData, patterns)
          }
        },
        agentType: this.agentType,
        processingTime: Date.now() - (context.startTime || Date.now())
      };
      
      this.logger?.info('AnalyticsAgent processing completed successfully', {
        userId: context.userId,
        insightCount: insights.length,
        patternCount: patterns.length
      });
      
      return result;
      
    } catch (error) {
      this.logger?.error('AnalyticsAgent processing failed', {
        userId: context.userId,
        error: error.message,
        stack: error.stack
      });
      
      // Handle specific error types
      if (error instanceof AgentError) {
        throw error;
      }
      
      // Handle OpenAI API errors
      if (error.message?.includes('quota') || error.message?.includes('429')) {
        throw new AgentError(
          'AI service quota exceeded. Please try again later.',
          ERROR_CODES.QUOTA_EXCEEDED,
          { originalError: error.message }
        );
      }
      
      if (error.message?.includes('billing')) {
        throw new AgentError(
          'AI service billing setup required.',
          ERROR_CODES.CONFIGURATION_ERROR,
          { originalError: error.message }
        );
      }
      
      // Generic error handling
      throw new AgentError(
        'Failed to generate analytics insights',
        ERROR_CODES.PROCESSING_ERROR,
        { originalError: error.message }
      );
    }
  }
  
  /**
   * Validates the analysis context
   * @param {Object} context - Analysis context to validate
   * @private
   */
  _validateAnalysisContext(context) {
    if (!context.userId) {
      throw new AgentError('User ID is required for analytics analysis.', ERROR_CODES.VALIDATION_ERROR);
    }
    
    if (!context.timeframe) {
      throw new AgentError('Timeframe is required for analytics analysis.', ERROR_CODES.VALIDATION_ERROR);
    }
    
    // Validate timeframe format
    const validTimeframes = ['7 days', '14 days', '30 days', '90 days'];
    if (!validTimeframes.includes(context.timeframe)) {
      throw new AgentError(
        `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`,
        ERROR_CODES.VALIDATION_ERROR
      );
    }
  }
  
  /**
   * Gathers comprehensive user data for analysis
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>} Comprehensive user data
   * @private
   */
  async _gatherUserData(context) {
    try {
      this.logger?.debug('Gathering user data for analytics', { userId: context.userId });
      
      // Use analytics service to gather data (database-powered intelligence)
      const [overviewData, trendsData, adherenceData] = await Promise.all([
        this.analyticsService.getOverviewMetrics(context.userId, context.jwtToken, { timeframe: context.timeframe }),
        this.analyticsService.getTrendsData(context.userId, context.timeframe, context.jwtToken),
        this.analyticsService.getAdherenceMetrics(context.userId, context.jwtToken, { timeframe: context.timeframe })
      ]);
      
      // Aggregate additional context data
      const additionalContext = await this._gatherAdditionalContext(context);
      
      const userData = {
        overview: overviewData,
        trends: trendsData,
        adherence: adherenceData,
        additionalContext,
        totalDataPoints: this._calculateDataPoints(overviewData, trendsData, adherenceData),
        timeframe: context.timeframe,
        gatheringTimestamp: new Date().toISOString()
      };
      
      this.logger?.debug('User data gathered successfully', {
        userId: context.userId,
        totalDataPoints: userData.totalDataPoints
      });
      
      return userData;
      
    } catch (error) {
      this.logger?.error('Failed to gather user data', {
        userId: context.userId,
        error: error.message
      });
      
      throw new AgentError(
        'Failed to gather user data for analysis',
        ERROR_CODES.DATA_ACCESS_ERROR,
        { originalError: error.message }
      );
    }
  }
  
  /**
   * Detects patterns in user data using AI analysis
   * @param {Object} userData - User data to analyze
   * @param {Object} context - Analysis context
   * @returns {Promise<Array>} Detected patterns
   * @private
   */
  async _detectPatterns(userData, context) {
    try {
      this.logger?.debug('Detecting patterns in user data', { userId: context.userId });
      
      // Prepare pattern detection prompt
      const prompt = this._buildPatternDetectionPrompt(userData, context);
      
      // Use OpenAI to detect patterns
      const response = await this.openaiService.generateChatCompletion([
        {
          role: 'system',
          content: 'You are an expert fitness analytics AI specializing in pattern detection and trend analysis. Analyze the provided data to identify meaningful patterns, trends, and correlations in the user\'s fitness journey.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      });
      
      // Parse AI response to extract patterns
      const patterns = this._parsePatternResponse(response.content);
      
      this.logger?.debug('Patterns detected successfully', {
        userId: context.userId,
        patternCount: patterns.length
      });
      
      return patterns;
      
    } catch (error) {
      this.logger?.error('Failed to detect patterns', {
        userId: context.userId,
        error: error.message
      });
      
      // Provide fallback pattern detection
      return this._fallbackPatternDetection(userData);
    }
  }
  
  /**
   * Generates insights using OpenAI based on detected patterns
   * @param {Array} patterns - Detected patterns
   * @param {Object} userData - User data
   * @param {Object} context - Analysis context
   * @returns {Promise<Array>} Generated insights
   * @private
   */
  async _generateInsights(patterns, userData, context) {
    try {
      this.logger?.debug('Generating insights from patterns', { userId: context.userId });
      
      // Prepare insight generation prompt
      const prompt = this._buildInsightGenerationPrompt(patterns, userData, context);
      
      // Use OpenAI to generate insights
      const response = await this.openaiService.generateChatCompletion([
        {
          role: 'system',
          content: 'You are an expert fitness coach and data analyst. Generate actionable, personalized insights and recommendations based on the user\'s fitness data patterns. Focus on providing specific, practical advice that the user can implement to improve their fitness journey.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      });
      
      // Parse AI response to extract insights
      const insights = this._parseInsightResponse(response.content);
      
      this.logger?.debug('Insights generated successfully', {
        userId: context.userId,
        insightCount: insights.length
      });
      
      return insights;
      
    } catch (error) {
      this.logger?.error('Failed to generate insights', {
        userId: context.userId,
        error: error.message
      });
      
      // Provide fallback insights
      return this._fallbackInsightGeneration(patterns, userData);
    }
  }
  
  /**
   * Stores insights in memory system for future reference
   * @param {string} userId - User identifier
   * @param {Array} insights - Generated insights
   * @param {Array} patterns - Detected patterns
   * @private
   */
  async _storeInsights(userId, insights, patterns) {
    if (!this.memorySystem) {
      this.logger?.debug('No memory system available, skipping insight storage');
      return;
    }
    
    try {
      const memoryData = {
        type: 'analytics_insights',
        userId,
        insights,
        patterns,
        timestamp: new Date().toISOString(),
        agentType: this.agentType
      };
      
      await this.memorySystem.storeMemory(userId, 'analytics', memoryData);
      
      this.logger?.debug('Insights stored in memory system successfully', {
        userId,
        insightCount: insights.length
      });
      
    } catch (error) {
      this.logger?.warn('Failed to store insights in memory system', {
        userId,
        error: error.message
      });
      // Non-critical error, don't throw
    }
  }
  
  /**
   * Builds pattern detection prompt for OpenAI
   * @param {Object} userData - User data
   * @param {Object} context - Analysis context
   * @returns {string} Pattern detection prompt
   * @private
   */
  _buildPatternDetectionPrompt(userData, context) {
    const hasData = userData.totalDataPoints > 0;
    const dataStatus = hasData ? 'available' : 'limited or no data available';
    
    return `
Analyze the following fitness data to detect meaningful patterns and trends:

TIMEFRAME: ${context.timeframe}
DATA STATUS: ${dataStatus}
TOTAL DATA POINTS: ${userData.totalDataPoints}

OVERVIEW METRICS:
${JSON.stringify(userData.overview, null, 2)}

TRENDS DATA:
${JSON.stringify(userData.trends, null, 2)}

ADHERENCE DATA:
${JSON.stringify(userData.adherence, null, 2)}

${hasData ? `
Please identify patterns in the following areas:
1. Workout consistency and adherence trends
2. Performance progression or regression patterns
3. Exercise preferences and variety patterns
4. Timing and frequency patterns
5. Intensity and volume patterns
` : `
Since this user has limited workout data, focus on identifying these starter patterns:
1. Initial fitness journey stage (new user getting started)
2. Baseline establishment patterns (need to begin tracking)
3. Opportunity identification patterns (areas to start focusing on)
4. Motivation and engagement patterns (building initial habits)
5. Goal-setting patterns (establishing clear objectives)
`}

CRITICAL: You must return your response as a valid JSON array only. No explanatory text before or after.

Return your analysis as a JSON array of pattern objects, each with:
- type: The category of pattern (${hasData ? 'consistency, performance, preference, timing, intensity' : 'starter, baseline, opportunity, motivation, goal_setting'})
- description: Clear description of the pattern${hasData ? '' : ' (focused on getting started)'}
- confidence: Confidence score (0-1)${hasData ? '' : ' (use 0.7-0.8 for starter recommendations)'}
- dataPoints: Number of data points supporting this pattern
- timeRange: Time range where this pattern occurs
- significance: Why this pattern is meaningful${hasData ? '' : ' for a new fitness journey'}

${hasData ? `
Example format:
[
  {
    "type": "consistency",
    "description": "User maintains regular workout schedule",
    "confidence": 0.8,
    "dataPoints": 15,
    "timeRange": "30 days",
    "significance": "Regular exercise habit formation"
  }
]
` : `
Example format for new users:
[
  {
    "type": "starter",
    "description": "User is beginning their fitness journey",
    "confidence": 0.8,
    "dataPoints": 0,
    "timeRange": "30 days",
    "significance": "Perfect opportunity to establish baseline and set initial goals"
  },
  {
    "type": "opportunity", 
    "description": "Focus on consistency over intensity",
    "confidence": 0.7,
    "dataPoints": 0,
    "timeRange": "30 days",
    "significance": "Building sustainable habits is key for new fitness enthusiasts"
  }
]
`}

Focus on patterns that are actionable and meaningful for fitness improvement.
Return only the JSON array, no other text.
`;
  }
  
  /**
   * Builds insight generation prompt for OpenAI
   * @param {Array} patterns - Detected patterns
   * @param {Object} userData - User data
   * @param {Object} context - Analysis context
   * @returns {string} Insight generation prompt
   * @private
   */
  _buildInsightGenerationPrompt(patterns, userData, context) {
    const hasData = userData.totalDataPoints > 0;
    const hasPatterns = patterns && patterns.length > 0;
    
    return `
Based on the detected patterns and user data, generate personalized fitness insights and recommendations:

DETECTED PATTERNS:
${JSON.stringify(patterns, null, 2)}

USER DATA SUMMARY:
- Timeframe: ${context.timeframe}
- Total Data Points: ${userData.totalDataPoints}
- Data Status: ${hasData ? 'Sufficient data available' : 'New user - limited data'}
- Pattern Count: ${patterns.length}
- Overview: ${JSON.stringify(userData.overview, null, 2)}

${hasData && hasPatterns ? `
Generate insights in the following categories based on your analysis:
1. PERFORMANCE: Insights about strength/endurance/fitness improvements
2. ADHERENCE: Insights about workout consistency and habit formation
3. PROGRESSION: Insights about long-term progress and goal achievement
4. RECOMMENDATIONS: Specific actionable recommendations for improvement
` : `
Since this is a new user with limited data, focus on these starter categories:
1. ADHERENCE: Getting started with consistency and habit formation
2. PERFORMANCE: Setting realistic initial goals and expectations
3. PROGRESSION: Planning for sustainable long-term growth
4. RECOMMENDATIONS: Essential first steps for fitness success
`}

CRITICAL: You must return your response as a valid JSON array only. No explanatory text before or after.

For each insight, provide:
- category: One of the categories above
- title: Clear, engaging title for the insight
- description: Detailed explanation of the insight
- actionable_steps: Array of specific steps the user can take
- priority: Priority level (high, medium, low)
- confidence: Confidence in this insight (0-1)
- supporting_data: Reference to specific data points that support this insight

${hasData && hasPatterns ? `
Example format:
[
  {
    "category": "ADHERENCE",
    "title": "Build Consistency",
    "description": "Focus on establishing regular workout habits",
    "actionable_steps": ["Schedule workouts", "Track progress"],
    "priority": "high",
    "confidence": 0.8,
    "supporting_data": "workout_frequency_data"
  }
]
` : `
Example format for new users:
[
  {
    "category": "ADHERENCE",
    "title": "Start Your Fitness Journey",
    "description": "Begin with small, manageable steps to build a sustainable routine",
    "actionable_steps": [
      "Choose 2-3 days per week for workouts",
      "Start with 20-30 minute sessions",
      "Focus on basic movements you enjoy",
      "Track your workouts in the app"
    ],
    "priority": "high",
    "confidence": 0.9,
    "supporting_data": "new_user_best_practices"
  },
  {
    "category": "PERFORMANCE",
    "title": "Set Realistic Goals",
    "description": "Establish achievable fitness goals to maintain motivation",
    "actionable_steps": [
      "Define 1-2 specific, measurable goals",
      "Plan weekly check-ins with yourself",
      "Celebrate small wins along the way"
    ],
    "priority": "high",
    "confidence": 0.8,
    "supporting_data": "goal_setting_framework"
  },
  {
    "category": "RECOMMENDATIONS",
    "title": "Build Your Foundation",
    "description": "Focus on fundamental movement patterns and consistency",
    "actionable_steps": [
      "Master bodyweight exercises first",
      "Learn proper form before adding weight",
      "Prioritize consistency over intensity",
      "Include rest days in your schedule"
    ],
    "priority": "medium",
    "confidence": 0.8,
    "supporting_data": "beginner_fitness_principles"
  }
]
`}

Focus on insights that are:
- Personalized and specific to this user's${hasData ? ' data' : ' stage'}
- Actionable with clear next steps
- Motivating and encouraging
- Evidence-based${hasData ? ' from the actual data patterns' : ' from fitness best practices'}

Return only the JSON array, no other text.
`;
  }
  
  /**
   * Parses pattern detection response from OpenAI
   * @param {string} responseContent - AI response content
   * @returns {Array} Parsed patterns
   * @private
   */
  _parsePatternResponse(responseContent) {
    try {
      // Handle OpenAI response format - extract content from response object
      let content = responseContent;
      if (typeof responseContent === 'object' && responseContent.content) {
        content = responseContent.content;
      }
      
      // Handle string response format (may include markdown code blocks)
      let cleanedResponse = (content || '').toString().trim();
      
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse
          .replace(/^```json\s*/, '')
          .replace(/\s*```$/, '');
      }
      
      // Try to fix incomplete JSON by attempting to close brackets/braces
      if (cleanedResponse && !cleanedResponse.endsWith(']')) {
        // If it looks like an incomplete JSON array, try to close it
        if (cleanedResponse.includes('[') && !cleanedResponse.includes(']')) {
          // Count open braces to see if we need to close them
          const openBraces = (cleanedResponse.match(/{/g) || []).length;
          const closeBraces = (cleanedResponse.match(/}/g) || []).length;
          const missingCloseBraces = openBraces - closeBraces;
          
          // Add missing closing braces
          cleanedResponse += '}}'.repeat(Math.max(0, missingCloseBraces));
          // Add closing array bracket
          cleanedResponse += ']';
        }
      }
      
      const patterns = JSON.parse(cleanedResponse);
      
      // Validate pattern structure
      return patterns.filter(pattern => 
        pattern.type && 
        pattern.description && 
        typeof pattern.confidence === 'number'
      );
      
    } catch (error) {
      this.logger?.warn('Failed to parse pattern response, attempting partial extraction', { 
        error: error.message,
        contentLength: responseContent?.length || 0
      });
      
      // Try to extract partial patterns if JSON parsing fails
      return this._extractPartialPatterns(responseContent);
    }
  }
  
  /**
   * Parses insight generation response from OpenAI
   * @param {string} responseContent - AI response content
   * @returns {Array} Parsed insights
   * @private
   */
  _parseInsightResponse(responseContent) {
    try {
      // Handle OpenAI response format - extract content from response object
      let content = responseContent;
      if (typeof responseContent === 'object' && responseContent.content) {
        content = responseContent.content;
      }
      
      // Handle string response format (may include markdown code blocks)
      let cleanedResponse = (content || '').toString().trim();
      
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse
          .replace(/^```json\s*/, '')
          .replace(/\s*```$/, '');
      }
      
      // Try to fix incomplete JSON by attempting to close brackets/braces
      if (cleanedResponse && !cleanedResponse.endsWith(']')) {
        // If it looks like an incomplete JSON array, try to close it
        if (cleanedResponse.includes('[') && !cleanedResponse.includes(']')) {
          // Count open braces to see if we need to close them
          const openBraces = (cleanedResponse.match(/{/g) || []).length;
          const closeBraces = (cleanedResponse.match(/}/g) || []).length;
          const missingCloseBraces = openBraces - closeBraces;
          
          // Add missing closing braces
          cleanedResponse += '}}'.repeat(Math.max(0, missingCloseBraces));
          // Add closing array bracket
          cleanedResponse += ']';
        }
      }
      
      const insights = JSON.parse(cleanedResponse);
      
      // Validate insight structure
      return insights.filter(insight => 
        insight.category && 
        insight.title && 
        insight.description &&
        insight.actionable_steps
      );
      
    } catch (error) {
      this.logger?.warn('Failed to parse insight response, attempting partial extraction', { 
        error: error.message,
        contentLength: responseContent?.length || 0
      });
      
      // Try to extract partial insights if JSON parsing fails
      return this._extractPartialInsights(responseContent);
    }
  }
  
  /**
   * Attempts to extract partial patterns from incomplete JSON response
   * @param {string} responseContent - Incomplete AI response
   * @returns {Array} Extracted partial patterns
   * @private
   */
  _extractPartialPatterns(responseContent) {
    const patterns = [];
    
    try {
      let content = responseContent;
      if (typeof responseContent === 'object' && responseContent.content) {
        content = responseContent.content;
      }
      
      const text = (content || '').toString();
      
      // Try to extract individual pattern objects using regex
      const patternMatches = text.match(/{[^{}]*"type"[^{}]*}/g);
      
      if (patternMatches) {
        patternMatches.forEach(match => {
          try {
            const pattern = JSON.parse(match);
            if (pattern.type && pattern.description) {
              patterns.push({
                type: pattern.type,
                description: pattern.description,
                confidence: pattern.confidence || 0.5,
                dataPoints: pattern.dataPoints || 0,
                timeRange: pattern.timeRange || '30 days',
                significance: pattern.significance || 'Pattern identified from partial data'
              });
            }
          } catch (e) {
            // Skip invalid pattern objects
          }
        });
      }
      
      // If still no patterns, create a basic starter pattern
      if (patterns.length === 0) {
        patterns.push({
          type: 'analysis_incomplete',
          description: 'Analysis in progress - partial data processed',
          confidence: 0.6,
          dataPoints: 0,
          timeRange: '30 days',
          significance: 'AI analysis encountered parsing issues but provided useful insights'
        });
      }
      
    } catch (error) {
      this.logger?.warn('Failed to extract partial patterns', { error: error.message });
    }
    
    return patterns;
  }
  
  /**
   * Attempts to extract partial insights from incomplete JSON response
   * @param {string} responseContent - Incomplete AI response
   * @returns {Array} Extracted partial insights
   * @private
   */
  _extractPartialInsights(responseContent) {
    const insights = [];
    
    try {
      let content = responseContent;
      if (typeof responseContent === 'object' && responseContent.content) {
        content = responseContent.content;
      }
      
      const text = (content || '').toString();
      
      // Try to extract individual insight objects using regex
      const insightMatches = text.match(/{[^{}]*"category"[^{}]*}/g);
      
      if (insightMatches) {
        insightMatches.forEach(match => {
          try {
            const insight = JSON.parse(match);
            if (insight.category && insight.title) {
              insights.push({
                category: insight.category,
                title: insight.title,
                description: insight.description || 'Insight extracted from partial response',
                actionable_steps: insight.actionable_steps || ['Continue monitoring progress'],
                priority: insight.priority || 'medium',
                confidence: insight.confidence || 0.6,
                supporting_data: insight.supporting_data || 'partial_analysis'
              });
            }
          } catch (e) {
            // Skip invalid insight objects
          }
        });
      }
      
      // If still no insights, create a basic starter insight
      if (insights.length === 0) {
        insights.push({
          category: 'GENERAL',
          title: 'Analysis in Progress',
          description: 'AI analysis is processing your data to provide personalized insights',
          actionable_steps: ['Continue tracking your workouts', 'Check back for updated insights'],
          priority: 'medium',
          confidence: 0.7,
          supporting_data: 'analysis_in_progress'
        });
      }
      
    } catch (error) {
      this.logger?.warn('Failed to extract partial insights', { error: error.message });
    }
    
    return insights;
  }
  
  /**
   * Provides fallback pattern detection when AI fails
   * @param {Object} userData - User data
   * @returns {Array} Fallback patterns
   * @private
   */
  _fallbackPatternDetection(userData) {
    const patterns = [];
    
    // Basic adherence pattern
    if (userData.adherence?.workoutFrequency) {
      patterns.push({
        type: 'consistency',
        description: `User maintains ${userData.adherence.workoutFrequency} workout frequency`,
        confidence: 0.7,
        dataPoints: userData.adherence.totalWorkouts || 0,
        timeRange: userData.timeframe,
        significance: 'Consistent workout frequency indicates good habit formation'
      });
    }
    
    // Basic performance pattern
    if (userData.trends?.performanceChange) {
      patterns.push({
        type: 'performance',
        description: `Performance trend: ${userData.trends.performanceChange}`,
        confidence: 0.6,
        dataPoints: userData.trends.dataPoints || 0,
        timeRange: userData.timeframe,
        significance: 'Performance trends indicate progress direction'
      });
    }
    
    return patterns;
  }
  
  /**
   * Provides fallback insight generation when AI fails
   * @param {Array} patterns - Detected patterns
   * @param {Object} userData - User data
   * @returns {Array} Fallback insights
   * @private
   */
  _fallbackInsightGeneration(patterns, userData) {
    const insights = [];
    
    // Basic adherence insight
    insights.push({
      category: 'ADHERENCE',
      title: 'Workout Consistency Analysis',
      description: `Based on your ${userData.timeframe} data, we can see your workout patterns.`,
      actionable_steps: ['Continue maintaining your current workout schedule', 'Consider tracking additional metrics'],
      priority: 'medium',
      confidence: 0.6,
      supporting_data: 'workout_frequency_data'
    });
    
    // Basic recommendation
    insights.push({
      category: 'RECOMMENDATIONS',
      title: 'Continue Your Fitness Journey',
      description: 'Keep up the great work with your fitness routine.',
      actionable_steps: ['Maintain consistency', 'Track your progress regularly'],
      priority: 'medium',
      confidence: 0.5,
      supporting_data: 'general_data'
    });
    
    return insights;
  }
  
  /**
   * Gathers additional context data
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>} Additional context data
   * @private
   */
  async _gatherAdditionalContext(context) {
    // Placeholder for additional context gathering
    // Could include user profile, goals, preferences, etc.
    return {
      focusAreas: context.focusAreas || [],
      additionalData: context.additionalData || {}
    };
  }
  
  /**
   * Calculates total data points available for analysis
   * @param {Object} overviewData - Overview metrics
   * @param {Object} trendsData - Trends data
   * @param {Object} adherenceData - Adherence data
   * @returns {number} Total data points
   * @private
   */
  _calculateDataPoints(overviewData, trendsData, adherenceData) {
    let total = 0;
    
    if (overviewData?.totalWorkouts) total += overviewData.totalWorkouts;
    if (trendsData?.dataPoints) total += trendsData.dataPoints;
    if (adherenceData?.totalWorkouts) total += adherenceData.totalWorkouts;
    
    return total;
  }
  
  /**
   * Calculates confidence score for the analysis
   * @param {Object} userData - User data
   * @param {Array} patterns - Detected patterns
   * @returns {number} Confidence score (0-1)
   * @private
   */
  _calculateConfidenceScore(userData, patterns) {
    const dataPointWeight = Math.min(userData.totalDataPoints / 20, 1) * 0.4; // Max 0.4 for data volume
    const patternWeight = Math.min(patterns.length / 5, 1) * 0.3; // Max 0.3 for pattern count
    const qualityWeight = 0.3; // Base quality score
    
    return Math.min(dataPointWeight + patternWeight + qualityWeight, 1);
  }
}

module.exports = AnalyticsAgent; 