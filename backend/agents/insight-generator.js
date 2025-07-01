const { AgentError, ERROR_CODES } = require('../utils/errors');

/**
 * InsightGenerator - AI-powered insight generation engine
 * 
 * Transforms detected patterns into actionable, personalized insights using:
 * - Advanced prompt engineering for insight generation
 * - Structured output generation with flexible parsing
 * - Multi-category insight classification
 * - Confidence scoring and priority ranking
 * - Graceful degradation for AI failures
 * 
 * Follows OpenAI API best practices for structured output and
 * error handling with fallback mechanisms.
 */
class InsightGenerator {
  constructor({ openaiService, logger, config = {} } = {}) {
    if (!openaiService) {
      throw new AgentError('OpenAI service is required for InsightGenerator.', ERROR_CODES.CONFIGURATION_ERROR);
    }
    
    this.openaiService = openaiService;
    this.logger = logger;
    
    this.config = {
      // AI model configuration
      model: 'gpt-4o-mini',
      maxTokens: 3000,
      temperature: 0.4, // Balanced creativity for insights
      
      // Insight configuration
      maxInsightsPerCategory: 3,
      minConfidence: 0.6,
      priorityThreshold: 0.7,
      
      // Categories for insight generation
      categories: [
        'PERFORMANCE',
        'ADHERENCE', 
        'PROGRESSION',
        'RECOMMENDATIONS',
        'MOTIVATION',
        'HEALTH_OPTIMIZATION'
      ],
      
      // Priority levels
      priorityLevels: ['high', 'medium', 'low'],
      
      ...config
    };
    
    this.logger?.info('InsightGenerator initialized', {
      model: this.config.model,
      categories: this.config.categories.length,
      maxTokens: this.config.maxTokens
    });
  }
  
  /**
   * Main insight generation method
   * Transforms patterns into actionable insights
   * 
   * @param {Array} patterns - Detected patterns from pattern detection
   * @param {Object} userData - Original user data
   * @param {Object} context - Analysis context
   * @returns {Promise<Array>} Generated insights with priorities and actions
   */
  async generateInsights(patterns, userData, context) {
    try {
      this.logger?.debug('Starting insight generation', {
        userId: context.userId,
        patternCount: patterns.length,
        categories: this.config.categories
      });
      
      // Validate input data
      this._validateInputData(patterns, userData, context);
      
      // Generate insights for each category
      const insightsByCategory = await this._generateInsightsByCategory(patterns, userData, context);
      
      // Flatten and rank all insights
      const allInsights = this._flattenInsights(insightsByCategory);
      const rankedInsights = this._rankInsightsByPriority(allInsights);
      
      // Apply confidence filtering
      const filteredInsights = this._filterByConfidence(rankedInsights);
      
      // Enhance insights with action plans
      const enhancedInsights = await this._enhanceWithActionPlans(filteredInsights, context);
      
      this.logger?.debug('Insight generation completed', {
        userId: context.userId,
        totalInsights: allInsights.length,
        filteredInsights: filteredInsights.length,
        finalInsights: enhancedInsights.length
      });
      
      return enhancedInsights;
      
    } catch (error) {
      this.logger?.error('Insight generation failed', {
        userId: context.userId,
        error: error.message
      });
      
      // Provide fallback insights if AI generation fails
      return this._generateFallbackInsights(patterns, userData, context);
    }
  }
  
  /**
   * Generates insights for each category using AI
   * @param {Array} patterns - Detected patterns
   * @param {Object} userData - User data
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>} Insights organized by category
   * @private
   */
  async _generateInsightsByCategory(patterns, userData, context) {
    const insightsByCategory = {};
    
    // Process categories in parallel for efficiency
    const categoryPromises = this.config.categories.map(async (category) => {
      try {
        const categoryInsights = await this._generateCategoryInsights(category, patterns, userData, context);
        return { category, insights: categoryInsights };
      } catch (error) {
        this.logger?.warn('Failed to generate insights for category', {
          category,
          error: error.message
        });
        return { category, insights: [] };
      }
    });
    
    const results = await Promise.all(categoryPromises);
    
    results.forEach(({ category, insights }) => {
      insightsByCategory[category] = insights;
    });
    
    return insightsByCategory;
  }
  
  /**
   * Generates insights for a specific category
   * @param {string} category - Insight category
   * @param {Array} patterns - Detected patterns
   * @param {Object} userData - User data
   * @param {Object} context - Analysis context
   * @returns {Promise<Array>} Category-specific insights
   * @private
   */
  async _generateCategoryInsights(category, patterns, userData, context) {
    try {
      // Filter patterns relevant to this category
      const relevantPatterns = this._filterPatternsForCategory(category, patterns);
      
      if (relevantPatterns.length === 0) {
        return [];
      }
      
      // Build category-specific prompt
      const prompt = this._buildCategoryPrompt(category, relevantPatterns, userData, context);
      
      // Generate insights using OpenAI
      const response = await this.openaiService.generateChatCompletion([
        {
          role: 'system',
          content: this._getCategorySystemPrompt(category)
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
      
      // Parse AI response
      const insights = this._parseInsightResponse(response.content, category);
      
      this.logger?.debug('Generated insights for category', {
        category,
        insightCount: insights.length,
        patternCount: relevantPatterns.length
      });
      
      return insights;
      
    } catch (error) {
      this.logger?.warn('Failed to generate category insights', {
        category,
        error: error.message
      });
      
      // Return fallback insights for this category
      return this._generateFallbackCategoryInsights(category, patterns);
    }
  }
  
  /**
   * Filters patterns relevant to a specific category
   * @param {string} category - Insight category
   * @param {Array} patterns - All detected patterns
   * @returns {Array} Relevant patterns for the category
   * @private
   */
  _filterPatternsForCategory(category, patterns) {
    const categoryMapping = {
      'PERFORMANCE': ['performance', 'strength', 'endurance', 'progression'],
      'ADHERENCE': ['consistency', 'timing', 'frequency'],
      'PROGRESSION': ['performance', 'trend', 'improvement'],
      'RECOMMENDATIONS': ['preference', 'variety', 'optimization'],
      'MOTIVATION': ['satisfaction', 'engagement', 'behavioral'],
      'HEALTH_OPTIMIZATION': ['recovery', 'safety', 'balance']
    };
    
    const relevantTypes = categoryMapping[category] || [];
    
    return patterns.filter(pattern => 
      relevantTypes.some(type => 
        pattern.type?.toLowerCase().includes(type) ||
        pattern.subtype?.toLowerCase().includes(type) ||
        pattern.description?.toLowerCase().includes(type)
      )
    );
  }
  
  /**
   * Gets system prompt for a specific category
   * @param {string} category - Insight category
   * @returns {string} Category-specific system prompt
   * @private
   */
  _getCategorySystemPrompt(category) {
    const prompts = {
      'PERFORMANCE': `You are an expert fitness coach analyzing performance data. Generate insights about strength, endurance, and fitness improvements. Focus on objective performance metrics and progression indicators.`,
      
      'ADHERENCE': `You are a behavioral fitness specialist analyzing workout consistency and habits. Generate insights about adherence patterns, timing preferences, and habit formation. Focus on actionable strategies to improve consistency.`,
      
      'PROGRESSION': `You are a fitness progression analyst examining long-term trends and development. Generate insights about progress patterns, milestone achievements, and goal advancement. Focus on trajectory analysis and future projections.`,
      
      'RECOMMENDATIONS': `You are a personalized fitness advisor creating specific recommendations. Generate actionable advice based on user preferences and patterns. Focus on concrete, implementable suggestions for improvement.`,
      
      'MOTIVATION': `You are a fitness motivation specialist analyzing engagement and satisfaction patterns. Generate insights about what drives the user and how to maintain motivation. Focus on psychological factors and engagement strategies.`,
      
      'HEALTH_OPTIMIZATION': `You are a wellness optimization expert analyzing overall health and balance patterns. Generate insights about recovery, injury prevention, and holistic fitness. Focus on sustainable, health-first approaches.`
    };
    
    return prompts[category] || prompts['RECOMMENDATIONS'];
  }
  
  /**
   * Builds category-specific prompt for insight generation
   * @param {string} category - Insight category
   * @param {Array} patterns - Relevant patterns
   * @param {Object} userData - User data
   * @param {Object} context - Analysis context
   * @returns {string} Generated prompt
   * @private
   */
  _buildCategoryPrompt(category, patterns, userData, context) {
    return `
Generate ${category} insights based on the following data:

ANALYSIS CONTEXT:
- User ID: ${context.userId}
- Timeframe: ${context.timeframe}
- Total Data Points: ${userData.totalDataPoints}

RELEVANT PATTERNS:
${JSON.stringify(patterns, null, 2)}

USER DATA SUMMARY:
${JSON.stringify({
  overview: userData.overview,
  trends: userData.trends,
  adherence: userData.adherence
}, null, 2)}

Please generate ${Math.min(this.config.maxInsightsPerCategory, 3)} high-quality insights for the ${category} category.

For each insight, provide:
- title: Clear, engaging title (max 60 characters)
- description: Detailed explanation of the insight (100-200 words)
- actionable_steps: Array of 2-4 specific, implementable action items
- priority: "high", "medium", or "low" based on impact and urgency
- confidence: Confidence score (0.0-1.0) based on data quality and pattern strength
- supporting_data: Reference to specific patterns or data points that support this insight
- impact_potential: Brief description of potential impact if action is taken
- time_to_implement: Estimated time to see results ("immediate", "1-2 weeks", "1-2 months")

INSIGHT QUALITY CRITERIA:
- Personalized and specific to this user's actual data
- Actionable with clear, concrete steps
- Evidence-based from the provided patterns
- Motivating and encouraging in tone
- Realistic and achievable

Return as a JSON array of insight objects. Ensure valid JSON format without markdown code blocks.
`;
  }
  
  /**
   * Parses insight response from OpenAI
   * @param {string} responseContent - AI response content
   * @param {string} category - Insight category
   * @returns {Array} Parsed insights
   * @private
   */
  _parseInsightResponse(responseContent, category) {
    try {
      // Handle OpenAI response format (may include markdown code blocks)
      let cleanedResponse = responseContent.trim();
      
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse
          .replace(/^```json\s*/, '')
          .replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse
          .replace(/^```\s*/, '')
          .replace(/\s*```$/, '');
      }
      
      const insights = JSON.parse(cleanedResponse);
      
      // Validate and enhance insight structure
      return insights
        .filter(insight => this._validateInsightStructure(insight))
        .map(insight => ({
          ...insight,
          category,
          id: this._generateInsightId(category, insight.title),
          generated_at: new Date().toISOString(),
          source: 'ai_generated'
        }));
        
    } catch (error) {
      this.logger?.warn('Failed to parse insight response', {
        category,
        error: error.message,
        responsePreview: responseContent.slice(0, 200)
      });
      
      // Try to extract insights from malformed JSON
      return this._extractInsightsFromMalformedResponse(responseContent, category);
    }
  }
  
  /**
   * Validates insight structure
   * @param {Object} insight - Insight object to validate
   * @returns {boolean} Whether insight is valid
   * @private
   */
  _validateInsightStructure(insight) {
    const requiredFields = ['title', 'description', 'actionable_steps', 'priority', 'confidence'];
    
    return requiredFields.every(field => {
      const hasField = insight.hasOwnProperty(field);
      if (!hasField) {
        this.logger?.debug('Missing required field in insight', { field, insight: insight.title });
      }
      return hasField;
    }) && 
    Array.isArray(insight.actionable_steps) &&
    typeof insight.confidence === 'number' &&
    insight.confidence >= 0 && insight.confidence <= 1 &&
    this.config.priorityLevels.includes(insight.priority);
  }
  
  /**
   * Extracts insights from malformed AI response
   * @param {string} responseContent - Malformed response
   * @param {string} category - Insight category
   * @returns {Array} Extracted insights
   * @private
   */
  _extractInsightsFromMalformedResponse(responseContent, category) {
    const insights = [];
    
    try {
      // Simple pattern matching for basic insight extraction
      const titleMatches = responseContent.match(/"title":\s*"([^"]+)"/g) || [];
      const descriptionMatches = responseContent.match(/"description":\s*"([^"]+)"/g) || [];
      
      for (let i = 0; i < Math.min(titleMatches.length, descriptionMatches.length); i++) {
        const title = titleMatches[i].match(/"title":\s*"([^"]+)"/)?.[1];
        const description = descriptionMatches[i].match(/"description":\s*"([^"]+)"/)?.[1];
        
        if (title && description) {
          insights.push({
            title,
            description,
            actionable_steps: ['Review this insight with your fitness routine'],
            priority: 'medium',
            confidence: 0.5,
            category,
            id: this._generateInsightId(category, title),
            generated_at: new Date().toISOString(),
            source: 'ai_extracted'
          });
        }
      }
    } catch (error) {
      this.logger?.warn('Failed to extract insights from malformed response', {
        category,
        error: error.message
      });
    }
    
    return insights;
  }
  
  /**
   * Generates unique insight ID
   * @param {string} category - Insight category
   * @param {string} title - Insight title
   * @returns {string} Generated ID
   * @private
   */
  _generateInsightId(category, title) {
    const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const timestamp = Date.now().toString(36);
    return `${category.toLowerCase()}_${normalized}_${timestamp}`;
  }
  
  /**
   * Flattens insights from all categories
   * @param {Object} insightsByCategory - Insights organized by category
   * @returns {Array} Flattened insights array
   * @private
   */
  _flattenInsights(insightsByCategory) {
    const allInsights = [];
    
    Object.entries(insightsByCategory).forEach(([category, insights]) => {
      allInsights.push(...insights);
    });
    
    return allInsights;
  }
  
  /**
   * Ranks insights by priority and confidence
   * @param {Array} insights - All insights
   * @returns {Array} Ranked insights
   * @private
   */
  _rankInsightsByPriority(insights) {
    const priorityWeights = { high: 3, medium: 2, low: 1 };
    
    return insights.sort((a, b) => {
      // Primary sort by priority
      const priorityDiff = priorityWeights[b.priority] - priorityWeights[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Secondary sort by confidence
      return b.confidence - a.confidence;
    });
  }
  
  /**
   * Filters insights by minimum confidence threshold
   * @param {Array} insights - All insights
   * @returns {Array} Filtered insights
   * @private
   */
  _filterByConfidence(insights) {
    return insights.filter(insight => 
      insight.confidence >= this.config.minConfidence
    );
  }
  
  /**
   * Enhances insights with detailed action plans
   * @param {Array} insights - Filtered insights
   * @param {Object} context - Analysis context
   * @returns {Promise<Array>} Enhanced insights
   * @private
   */
  async _enhanceWithActionPlans(insights, context) {
    // For now, return insights as-is
    // In future, could use additional AI calls to enhance action plans
    
    return insights.map(insight => ({
      ...insight,
      enhanced_at: new Date().toISOString(),
      user_id: context.userId,
      timeframe: context.timeframe
    }));
  }
  
  /**
   * Generates fallback insights when AI fails
   * @param {Array} patterns - Detected patterns
   * @param {Object} userData - User data
   * @param {Object} context - Analysis context
   * @returns {Array} Fallback insights
   * @private
   */
  _generateFallbackInsights(patterns, userData, context) {
    this.logger?.info('Generating fallback insights', {
      userId: context.userId,
      patternCount: patterns.length
    });
    
    const fallbackInsights = [];
    
    // Generate basic adherence insight
    if (userData.adherence?.workoutFrequency) {
      fallbackInsights.push({
        id: this._generateInsightId('ADHERENCE', 'workout_consistency'),
        title: 'Workout Consistency Analysis',
        description: `Based on your ${context.timeframe} data, we can analyze your workout consistency patterns. Maintaining regular workout schedules is crucial for achieving fitness goals.`,
        actionable_steps: [
          'Continue maintaining your current workout schedule',
          'Track your workouts to identify patterns',
          'Set realistic consistency goals'
        ],
        category: 'ADHERENCE',
        priority: 'medium',
        confidence: 0.7,
        supporting_data: 'workout_frequency_data',
        impact_potential: 'Improved consistency leads to better long-term results',
        time_to_implement: '1-2 weeks',
        generated_at: new Date().toISOString(),
        source: 'fallback_generated'
      });
    }
    
    // Generate basic recommendations
    fallbackInsights.push({
      id: this._generateInsightId('RECOMMENDATIONS', 'continue_progress'),
      title: 'Continue Your Fitness Journey',
      description: 'Your fitness data shows engagement with your workout routine. Consistency and progressive overload are key principles for continued improvement.',
      actionable_steps: [
        'Maintain regular workout schedule',
        'Track your progress with metrics',
        'Consider gradually increasing workout intensity',
        'Focus on proper form and technique'
      ],
      category: 'RECOMMENDATIONS',
      priority: 'medium',
      confidence: 0.6,
      supporting_data: 'general_activity_data',
      impact_potential: 'Structured approach leads to sustainable progress',
      time_to_implement: 'immediate',
      generated_at: new Date().toISOString(),
      source: 'fallback_generated'
    });
    
    // Add pattern-specific insights
    patterns.forEach(pattern => {
      if (pattern.type === 'consistency' && pattern.confidence > 0.7) {
        fallbackInsights.push({
          id: this._generateInsightId('PERFORMANCE', 'pattern_based'),
          title: 'Consistency Pattern Detected',
          description: `Your data shows ${pattern.description}. This indicates good habit formation in your fitness routine.`,
          actionable_steps: [
            'Build on your consistency strengths',
            'Identify what makes your routine sustainable',
            'Consider optimizing timing and structure'
          ],
          category: 'PERFORMANCE',
          priority: 'medium',
          confidence: pattern.confidence,
          supporting_data: pattern.type,
          impact_potential: 'Leveraging existing strengths accelerates progress',
          time_to_implement: '1-2 weeks',
          generated_at: new Date().toISOString(),
          source: 'pattern_based'
        });
      }
    });
    
    return fallbackInsights;
  }
  
  /**
   * Generates fallback insights for a specific category
   * @param {string} category - Insight category
   * @param {Array} patterns - Detected patterns
   * @returns {Array} Fallback category insights
   * @private
   */
  _generateFallbackCategoryInsights(category, patterns) {
    const fallbackMap = {
      'PERFORMANCE': {
        title: 'Performance Analysis',
        description: 'Continue focusing on progressive overload and consistent training to improve performance.',
        actionable_steps: ['Track key performance metrics', 'Focus on form over intensity', 'Allow adequate recovery time']
      },
      'ADHERENCE': {
        title: 'Consistency Focus',
        description: 'Building consistent workout habits is the foundation of fitness success.',
        actionable_steps: ['Schedule workouts at the same time', 'Start with shorter sessions if needed', 'Track completion rates']
      },
      'RECOMMENDATIONS': {
        title: 'General Recommendations',
        description: 'Focus on fundamentals: consistency, progressive overload, and recovery.',
        actionable_steps: ['Maintain regular schedule', 'Track progress metrics', 'Listen to your body']
      }
    };
    
    const fallback = fallbackMap[category] || fallbackMap['RECOMMENDATIONS'];
    
    return [{
      id: this._generateInsightId(category, fallback.title),
      title: fallback.title,
      description: fallback.description,
      actionable_steps: fallback.actionable_steps,
      category,
      priority: 'medium',
      confidence: 0.5,
      supporting_data: 'general_patterns',
      impact_potential: 'Basic improvements support overall fitness goals',
      time_to_implement: '1-2 weeks',
      generated_at: new Date().toISOString(),
      source: 'category_fallback'
    }];
  }
  
  /**
   * Validates input data for insight generation
   * @param {Array} patterns - Detected patterns
   * @param {Object} userData - User data
   * @param {Object} context - Analysis context
   * @private
   */
  _validateInputData(patterns, userData, context) {
    if (!Array.isArray(patterns)) {
      throw new AgentError('Patterns must be an array for insight generation.', ERROR_CODES.VALIDATION_ERROR);
    }
    
    if (!userData) {
      throw new AgentError('User data is required for insight generation.', ERROR_CODES.VALIDATION_ERROR);
    }
    
    if (!context?.userId) {
      throw new AgentError('User ID is required in context for insight generation.', ERROR_CODES.VALIDATION_ERROR);
    }
  }
}

module.exports = InsightGenerator; 