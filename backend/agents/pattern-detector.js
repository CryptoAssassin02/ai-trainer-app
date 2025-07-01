const { AgentError, ERROR_CODES } = require('../utils/errors');

/**
 * PatternDetector - Advanced pattern detection system for fitness analytics
 * 
 * Provides sophisticated pattern detection capabilities including:
 * - Temporal pattern analysis (consistency, frequency, timing)
 * - Performance pattern detection (progression, regression, plateaus)
 * - Exercise preference and variety analysis
 * - Behavioral pattern recognition
 * - Statistical trend analysis
 * 
 * Leverages database-powered intelligence with fuzzy matching and
 * statistical analysis to identify meaningful patterns in user data.
 */
class PatternDetector {
  constructor({ supabaseClient, logger, config = {} } = {}) {
    if (!supabaseClient) {
      throw new AgentError('Supabase client is required for PatternDetector.', ERROR_CODES.CONFIGURATION_ERROR);
    }
    
    this.supabaseClient = supabaseClient;
    this.logger = logger;
    
    this.config = {
      // Pattern detection thresholds
      minDataPoints: 3,
      confidenceThreshold: 0.6,
      significanceThreshold: 0.05,
      
      // Temporal analysis settings
      consistencyWindow: 7, // days
      trendWindow: 14, // days
      seasonalityWindow: 30, // days
      
      // Statistical thresholds
      correlationThreshold: 0.3,
      changeThreshold: 0.1, // 10% change
      
      // Exercise matching settings
      similarityThreshold: 0.4,
      fuzzyMatchThreshold: 0.6,
      
      ...config
    };
    
    this.logger?.info('PatternDetector initialized', {
      minDataPoints: this.config.minDataPoints,
      confidenceThreshold: this.config.confidenceThreshold
    });
  }
  
  /**
   * Main pattern detection method
   * Analyzes user data to identify all types of patterns
   * 
   * @param {Object} userData - Comprehensive user data
   * @param {Object} context - Analysis context
   * @returns {Promise<Array>} Detected patterns with confidence scores
   */
  async detectPatterns(userData, context = {}) {
    try {
      this.logger?.info('Pattern detection started', { 
        userId: context.userId,
        dataPoints: userData.totalDataPoints
      });

      // For new users or users with limited data, provide starter patterns
      if (userData.totalDataPoints < this.config.minDataPoints) {
        this.logger?.info('Providing starter patterns for new user', { 
          userId: context.userId,
          dataPoints: userData.totalDataPoints,
          minRequired: this.config.minDataPoints
        });
        
        return this._generateStarterPatterns(userData, context);
      }
      
      this.logger?.debug('Starting comprehensive pattern detection', {
        userId: context.userId,
        timeframe: context.timeframe,
        totalDataPoints: userData.totalDataPoints
      });
      
      // Validate input data
      this._validateInputData(userData);
      
      // Run parallel pattern detection
      const [
        temporalPatterns,
        performancePatterns,
        exercisePatterns,
        behavioralPatterns,
        statisticalPatterns
      ] = await Promise.all([
        this._detectTemporalPatterns(userData, context),
        this._detectPerformancePatterns(userData, context),
        this._detectExercisePatterns(userData, context),
        this._detectBehavioralPatterns(userData, context),
        this._detectStatisticalPatterns(userData, context)
      ]);
      
      // Combine and rank patterns
      const allPatterns = [
        ...temporalPatterns,
        ...performancePatterns,
        ...exercisePatterns,
        ...behavioralPatterns,
        ...statisticalPatterns
      ];
      
      // Filter and rank patterns by significance
      const significantPatterns = this._filterSignificantPatterns(allPatterns);
      const rankedPatterns = this._rankPatternsByImportance(significantPatterns);
      
      this.logger?.debug('Pattern detection completed', {
        userId: context.userId,
        totalPatternsFound: allPatterns.length,
        significantPatterns: significantPatterns.length,
        finalPatterns: rankedPatterns.length
      });
      
      return rankedPatterns;
      
    } catch (error) {
      this.logger?.error('Pattern detection failed', {
        userId: context.userId,
        error: error.message
      });
      
      throw new AgentError(
        'Failed to detect patterns in user data',
        ERROR_CODES.PROCESSING_ERROR,
        { originalError: error.message }
      );
    }
  }
  
  /**
   * Detects temporal patterns (timing, consistency, frequency)
   * @param {Object} userData - User data
   * @param {Object} context - Analysis context
   * @returns {Promise<Array>} Temporal patterns
   * @private
   */
  async _detectTemporalPatterns(userData, context) {
    const patterns = [];
    
    try {
      // Analyze workout consistency patterns
      const consistencyPattern = await this._analyzeWorkoutConsistency(userData, context);
      if (consistencyPattern) patterns.push(consistencyPattern);
      
      // Analyze workout timing patterns
      const timingPatterns = await this._analyzeWorkoutTiming(userData, context);
      patterns.push(...timingPatterns);
      
      // Analyze frequency patterns
      const frequencyPattern = await this._analyzeWorkoutFrequency(userData, context);
      if (frequencyPattern) patterns.push(frequencyPattern);
      
      // Analyze seasonal patterns (if enough data)
      const seasonalPatterns = await this._analyzeSeasonalPatterns(userData, context);
      patterns.push(...seasonalPatterns);
      
    } catch (error) {
      this.logger?.warn('Temporal pattern detection encountered issues', {
        error: error.message
      });
    }
    
    return patterns;
  }
  
  /**
   * Detects performance-related patterns (progression, plateaus, regression)
   * @param {Object} userData - User data
   * @param {Object} context - Analysis context
   * @returns {Promise<Array>} Performance patterns
   * @private
   */
  async _detectPerformancePatterns(userData, context) {
    const patterns = [];
    
    try {
      // Analyze strength progression patterns
      const strengthPatterns = await this._analyzeStrengthProgression(userData, context);
      patterns.push(...strengthPatterns);
      
      // Analyze endurance patterns
      const endurancePatterns = await this._analyzeEnduranceProgression(userData, context);
      patterns.push(...endurancePatterns);
      
      // Detect plateau patterns
      const plateauPatterns = await this._detectPlateauPatterns(userData, context);
      patterns.push(...plateauPatterns);
      
      // Analyze volume progression
      const volumePatterns = await this._analyzeVolumeProgression(userData, context);
      patterns.push(...volumePatterns);
      
      // Detect performance regression
      const regressionPatterns = await this._detectRegressionPatterns(userData, context);
      patterns.push(...regressionPatterns);
      
    } catch (error) {
      this.logger?.warn('Performance pattern detection encountered issues', {
        error: error.message
      });
    }
    
    return patterns;
  }
  
  /**
   * Detects exercise preference and variety patterns
   * @param {Object} userData - User data
   * @param {Object} context - Analysis context
   * @returns {Promise<Array>} Exercise patterns
   * @private
   */
  async _detectExercisePatterns(userData, context) {
    const patterns = [];
    
    try {
      // Analyze exercise preferences using database intelligence
      const preferencePatterns = await this._analyzeExercisePreferences(userData, context);
      patterns.push(...preferencePatterns);
      
      // Analyze workout variety
      const varietyPatterns = await this._analyzeWorkoutVariety(userData, context);
      patterns.push(...varietyPatterns);
      
      // Detect muscle group focus patterns
      const muscleGroupPatterns = await this._analyzeMuscleGroupFocus(userData, context);
      patterns.push(...muscleGroupPatterns);
      
      // Analyze equipment usage patterns
      const equipmentPatterns = await this._analyzeEquipmentUsage(userData, context);
      patterns.push(...equipmentPatterns);
      
    } catch (error) {
      this.logger?.warn('Exercise pattern detection encountered issues', {
        error: error.message
      });
    }
    
    return patterns;
  }
  
  /**
   * Detects behavioral patterns (adherence, motivation, adaptation)
   * @param {Object} userData - User data
   * @param {Object} context - Analysis context
   * @returns {Promise<Array>} Behavioral patterns
   * @private
   */
  async _detectBehavioralPatterns(userData, context) {
    const patterns = [];
    
    try {
      // Analyze adherence patterns
      const adherencePatterns = await this._analyzeAdherencePatterns(userData, context);
      patterns.push(...adherencePatterns);
      
      // Detect motivation fluctuation patterns
      const motivationPatterns = await this._analyzeMotivationPatterns(userData, context);
      patterns.push(...motivationPatterns);
      
      // Analyze adaptation patterns
      const adaptationPatterns = await this._analyzeAdaptationPatterns(userData, context);
      patterns.push(...adaptationPatterns);
      
      // Detect dropout risk patterns
      const riskPatterns = await this._analyzeDropoutRiskPatterns(userData, context);
      patterns.push(...riskPatterns);
      
    } catch (error) {
      this.logger?.warn('Behavioral pattern detection encountered issues', {
        error: error.message
      });
    }
    
    return patterns;
  }
  
  /**
   * Detects statistical patterns and correlations
   * @param {Object} userData - User data
   * @param {Object} context - Analysis context
   * @returns {Promise<Array>} Statistical patterns
   * @private
   */
  async _detectStatisticalPatterns(userData, context) {
    const patterns = [];
    
    try {
      // Analyze correlations between metrics
      const correlationPatterns = await this._analyzeMetricCorrelations(userData, context);
      patterns.push(...correlationPatterns);
      
      // Detect anomalies
      const anomalyPatterns = await this._detectAnomalies(userData, context);
      patterns.push(...anomalyPatterns);
      
      // Analyze trends
      const trendPatterns = await this._analyzeTrends(userData, context);
      patterns.push(...trendPatterns);
      
    } catch (error) {
      this.logger?.warn('Statistical pattern detection encountered issues', {
        error: error.message
      });
    }
    
    return patterns;
  }
  
  /**
   * Analyzes workout consistency patterns
   * @param {Object} userData - User data
   * @param {Object} context - Analysis context
   * @returns {Promise<Object|null>} Consistency pattern
   * @private
   */
  async _analyzeWorkoutConsistency(userData, context) {
    if (!userData.adherence?.workoutFrequency) return null;
    
    const { workoutFrequency, totalWorkouts } = userData.adherence;
    const expectedWorkouts = this._calculateExpectedWorkouts(workoutFrequency, context.timeframe);
    const consistency = totalWorkouts / expectedWorkouts;
    
    let consistencyLevel, description;
    if (consistency >= 0.9) {
      consistencyLevel = 'excellent';
      description = 'Highly consistent workout routine with excellent adherence';
    } else if (consistency >= 0.7) {
      consistencyLevel = 'good';
      description = 'Good workout consistency with room for improvement';
    } else if (consistency >= 0.5) {
      consistencyLevel = 'moderate';
      description = 'Moderate consistency with significant gaps in routine';
    } else {
      consistencyLevel = 'poor';
      description = 'Poor workout consistency indicating potential barriers';
    }
    
    return {
      type: 'consistency',
      subtype: 'workout_adherence',
      description,
      confidence: Math.min(consistency, 1.0),
      dataPoints: totalWorkouts,
      timeRange: context.timeframe,
      significance: 'Consistency is crucial for long-term fitness success',
      metrics: {
        consistencyScore: consistency,
        consistencyLevel,
        expectedWorkouts,
        actualWorkouts: totalWorkouts
      }
    };
  }
  
  /**
   * Analyzes workout timing patterns
   * @param {Object} userData - User data
   * @param {Object} context - Analysis context
   * @returns {Promise<Array>} Timing patterns
   * @private
   */
  async _analyzeWorkoutTiming(userData, context) {
    const patterns = [];
    
    try {
      // Query workout logs for timing analysis
      const { data: workoutLogs } = await this.supabaseClient
        .from('workout_logs')
        .select('created_at, workout_date')
        .eq('user_id', context.userId)
        .gte('workout_date', this._getDateRangeStart(context.timeframe))
        .order('workout_date', { ascending: true });
      
      if (!workoutLogs || workoutLogs.length < this.config.minDataPoints) {
        return patterns;
      }
      
      // Analyze day-of-week patterns
      const dayPattern = this._analyzeDayOfWeekPattern(workoutLogs);
      if (dayPattern) patterns.push(dayPattern);
      
      // Analyze time-of-day patterns (if created_at data available)
      const timePattern = this._analyzeTimeOfDayPattern(workoutLogs);
      if (timePattern) patterns.push(timePattern);
      
    } catch (error) {
      this.logger?.warn('Failed to analyze workout timing patterns', {
        error: error.message
      });
    }
    
    return patterns;
  }
  
  /**
   * Analyzes exercise preferences using database intelligence
   * @param {Object} userData - User data
   * @param {Object} context - Analysis context
   * @returns {Promise<Array>} Exercise preference patterns
   * @private
   */
  async _analyzeExercisePreferences(userData, context) {
    const patterns = [];
    
    try {
      // Query workout logs with exercise data
      const { data: exerciseLogs } = await this.supabaseClient
        .from('workout_logs')
        .select(`
          exercises,
          overall_difficulty,
          satisfaction,
          workout_date
        `)
        .eq('user_id', context.userId)
        .gte('workout_date', this._getDateRangeStart(context.timeframe))
        .not('exercises', 'is', null);
      
      if (!exerciseLogs || exerciseLogs.length < this.config.minDataPoints) {
        return patterns;
      }
      
      // Analyze exercise frequency and preferences
      const exerciseFrequency = this._calculateExerciseFrequency(exerciseLogs);
      const preferencePattern = this._identifyExercisePreferences(exerciseFrequency);
      if (preferencePattern) patterns.push(preferencePattern);
      
      // Analyze exercise-satisfaction correlation
      const satisfactionPattern = this._analyzeExerciseSatisfaction(exerciseLogs);
      if (satisfactionPattern) patterns.push(satisfactionPattern);
      
      // Use database to enhance exercise analysis
      const enhancedPatterns = await this._enhanceWithDatabaseExerciseData(patterns, exerciseFrequency);
      patterns.push(...enhancedPatterns);
      
    } catch (error) {
      this.logger?.warn('Failed to analyze exercise preferences', {
        error: error.message
      });
    }
    
    return patterns;
  }
  
  /**
   * Enhances exercise patterns with database-powered intelligence
   * @param {Array} patterns - Existing patterns
   * @param {Object} exerciseFrequency - Exercise frequency data
   * @returns {Promise<Array>} Enhanced patterns
   * @private
   */
  async _enhanceWithDatabaseExerciseData(patterns, exerciseFrequency) {
    const enhancedPatterns = [];
    
    try {
      // Get top exercises
      const topExercises = Object.entries(exerciseFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name]) => name);
      
      // Analyze muscle group preferences using database
      const muscleGroupAnalysis = await this._analyzeMuscleGroupPreferences(topExercises);
      if (muscleGroupAnalysis) enhancedPatterns.push(muscleGroupAnalysis);
      
      // Analyze exercise categories using database
      const categoryAnalysis = await this._analyzeExerciseCategoryPreferences(topExercises);
      if (categoryAnalysis) enhancedPatterns.push(categoryAnalysis);
      
    } catch (error) {
      this.logger?.warn('Failed to enhance patterns with database data', {
        error: error.message
      });
    }
    
    return enhancedPatterns;
  }
  
  /**
   * Analyzes muscle group preferences using database intelligence
   * @param {Array} topExercises - Most frequently performed exercises
   * @returns {Promise<Object|null>} Muscle group preference pattern
   * @private
   */
  async _analyzeMuscleGroupPreferences(topExercises) {
    try {
      const muscleGroupCounts = {};
      
      for (const exerciseName of topExercises) {
        const exerciseData = await this._findExerciseInDatabase(exerciseName);
        
        if (exerciseData && exerciseData.muscle_groups) {
          const muscleGroups = Array.isArray(exerciseData.muscle_groups) 
            ? exerciseData.muscle_groups 
            : [exerciseData.muscle_groups];
          
          muscleGroups.forEach(group => {
            muscleGroupCounts[group] = (muscleGroupCounts[group] || 0) + 1;
          });
        }
      }
      
      const sortedMuscleGroups = Object.entries(muscleGroupCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
      
      if (sortedMuscleGroups.length === 0) return null;
      
      const topMuscleGroup = sortedMuscleGroups[0][0];
      const preference = sortedMuscleGroups[0][1] / topExercises.length;
      
      return {
        type: 'preference',
        subtype: 'muscle_group',
        description: `Strong preference for ${topMuscleGroup} exercises`,
        confidence: preference,
        dataPoints: topExercises.length,
        timeRange: 'current_period',
        significance: 'Muscle group preferences indicate training focus and potential imbalances',
        metrics: {
          topMuscleGroup,
          preference,
          muscleGroupDistribution: Object.fromEntries(sortedMuscleGroups)
        }
      };
      
    } catch (error) {
      this.logger?.warn('Failed to analyze muscle group preferences', {
        error: error.message
      });
      return null;
    }
  }
  
  /**
   * Finds exercise in database using fuzzy matching
   * @param {string} exerciseName - Exercise name to search for
   * @returns {Promise<Object|null>} Exercise data from database
   * @private
   */
  async _findExerciseInDatabase(exerciseName) {
    try {
      // Extract keywords for fuzzy matching
      const keywords = this._extractExerciseKeywords(exerciseName);
      
      if (keywords.length === 0) return null;
      
      // Query database with fuzzy matching
      let query = this.supabaseClient.from('exercises').select('*');
      
      const orConditions = keywords.map(keyword => 
        `exercise_name.ilike.%${keyword}%`
      ).join(',');
      
      const { data: exercises } = await query.or(orConditions).limit(5);
      
      if (!exercises || exercises.length === 0) return null;
      
      // Find best match using similarity scoring
      let bestMatch = null;
      let bestSimilarity = 0;
      
      for (const exercise of exercises) {
        const similarity = this._calculateNameSimilarity(exerciseName, exercise.exercise_name);
        if (similarity > bestSimilarity && similarity >= this.config.similarityThreshold) {
          bestSimilarity = similarity;
          bestMatch = exercise;
        }
      }
      
      return bestMatch;
      
    } catch (error) {
      this.logger?.warn('Failed to find exercise in database', {
        exerciseName,
        error: error.message
      });
      return null;
    }
  }
  
  /**
   * Extracts keywords from exercise name for fuzzy matching
   * @param {string} exerciseName - Exercise name
   * @returns {Array} Extracted keywords
   * @private
   */
  _extractExerciseKeywords(exerciseName) {
    const keywordMap = {
      'bench press': ['bench', 'press'],
      'shoulder press': ['shoulder', 'press'],
      'chest press': ['chest', 'press'],
      'deadlift': ['deadlift'],
      'squat': ['squat'],
      'pull up': ['pull', 'up'],
      'pull-up': ['pull', 'up'],
      'push up': ['push', 'up'],
      'push-up': ['push', 'up']
    };
    
    const name = exerciseName.toLowerCase().trim();
    
    // Check predefined mappings first
    if (keywordMap[name]) return keywordMap[name];
    
    // Extract meaningful words
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'with', 'using'];
    return name
      .split(/[\s\-]+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 3); // Limit to 3 keywords for performance
  }
  
  /**
   * Calculates name similarity between two exercise names
   * @param {string} name1 - First exercise name
   * @param {string} name2 - Second exercise name
   * @returns {number} Similarity score (0-1)
   * @private
   */
  _calculateNameSimilarity(name1, name2) {
    const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const n1 = normalize(name1);
    const n2 = normalize(name2);
    
    // Simple substring matching with bonus for exact matches
    if (n1 === n2) return 1.0;
    if (n1.includes(n2) || n2.includes(n1)) return 0.8;
    
    // Keyword matching
    const keywords1 = this._extractExerciseKeywords(name1);
    const keywords2 = this._extractExerciseKeywords(name2);
    
    const commonKeywords = keywords1.filter(k1 => 
      keywords2.some(k2 => k1.includes(k2) || k2.includes(k1))
    );
    
    const maxKeywords = Math.max(keywords1.length, keywords2.length);
    return maxKeywords > 0 ? commonKeywords.length / maxKeywords : 0;
  }
  
  /**
   * Validates input data for pattern detection
   * @param {Object} userData - User data to validate
   * @private
   */
  _validateInputData(userData) {
    if (!userData) {
      throw new AgentError('User data is required for pattern detection.', ERROR_CODES.VALIDATION_ERROR);
    }
    
    if (userData.totalDataPoints < this.config.minDataPoints) {
      throw new AgentError(
        `Insufficient data points for pattern detection. Minimum ${this.config.minDataPoints} required.`,
        ERROR_CODES.VALIDATION_ERROR
      );
    }
  }
  
  /**
   * Filters patterns by significance threshold
   * @param {Array} patterns - All detected patterns
   * @returns {Array} Significant patterns
   * @private
   */
  _filterSignificantPatterns(patterns) {
    return patterns.filter(pattern => 
      pattern.confidence >= this.config.confidenceThreshold
    );
  }
  
  /**
   * Ranks patterns by importance and confidence
   * @param {Array} patterns - Significant patterns
   * @returns {Array} Ranked patterns
   * @private
   */
  _rankPatternsByImportance(patterns) {
    return patterns.sort((a, b) => {
      // Primary sort by confidence
      const confidenceDiff = b.confidence - a.confidence;
      if (Math.abs(confidenceDiff) > 0.1) return confidenceDiff;
      
      // Secondary sort by data points
      return b.dataPoints - a.dataPoints;
    });
  }
  
  /**
   * Calculates expected workouts based on frequency and timeframe
   * @param {string} frequency - Workout frequency
   * @param {string} timeframe - Analysis timeframe
   * @returns {number} Expected number of workouts
   * @private
   */
  _calculateExpectedWorkouts(frequency, timeframe) {
    const days = parseInt(timeframe.split(' ')[0]);
    const weeks = days / 7;
    
    const frequencyMap = {
      'daily': 7,
      '6x per week': 6,
      '5x per week': 5,
      '4x per week': 4,
      '3x per week': 3,
      '2x per week': 2,
      '1x per week': 1
    };
    
    const workoutsPerWeek = frequencyMap[frequency] || 3; // Default to 3x per week
    return Math.round(workoutsPerWeek * weeks);
  }
  
  /**
   * Gets start date for analysis timeframe
   * @param {string} timeframe - Analysis timeframe
   * @returns {string} Start date in ISO format
   * @private
   */
  _getDateRangeStart(timeframe) {
    const days = parseInt(timeframe.split(' ')[0]);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return startDate.toISOString().split('T')[0];
  }
  
  /**
   * Analyzes day-of-week workout patterns
   * @param {Array} workoutLogs - Workout log data
   * @returns {Object|null} Day pattern
   * @private
   */
  _analyzeDayOfWeekPattern(workoutLogs) {
    const dayCount = new Array(7).fill(0);
    
    workoutLogs.forEach(log => {
      const day = new Date(log.workout_date).getDay();
      dayCount[day]++;
    });
    
    const maxCount = Math.max(...dayCount);
    const preferredDay = dayCount.indexOf(maxCount);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    if (maxCount < 2) return null; // Not enough data for pattern
    
    const preference = maxCount / workoutLogs.length;
    
    return {
      type: 'timing',
      subtype: 'day_preference',
      description: `Prefers working out on ${dayNames[preferredDay]}s`,
      confidence: preference,
      dataPoints: workoutLogs.length,
      timeRange: 'weekly',
      significance: 'Day preferences can help optimize workout scheduling',
      metrics: {
        preferredDay: dayNames[preferredDay],
        preference,
        dayDistribution: dayCount
      }
    };
  }
  
  /**
   * Analyzes time-of-day workout patterns
   * @param {Array} workoutLogs - Workout log data
   * @returns {Object|null} Time pattern
   * @private
   */
  _analyzeTimeOfDayPattern(workoutLogs) {
    // This would analyze created_at timestamps if available
    // For now, return null as we need more detailed timestamp data
    return null;
  }
  
  /**
   * Calculates exercise frequency from workout logs
   * @param {Array} exerciseLogs - Exercise log data
   * @returns {Object} Exercise frequency map
   * @private
   */
  _calculateExerciseFrequency(exerciseLogs) {
    const frequency = {};
    
    exerciseLogs.forEach(log => {
      if (log.exercises && Array.isArray(log.exercises)) {
        log.exercises.forEach(exercise => {
          const name = exercise.name || exercise.exercise;
          if (name) {
            frequency[name] = (frequency[name] || 0) + 1;
          }
        });
      }
    });
    
    return frequency;
  }
  
  /**
   * Identifies exercise preferences from frequency data
   * @param {Object} exerciseFrequency - Exercise frequency map
   * @returns {Object|null} Exercise preference pattern
   * @private
   */
  _identifyExercisePreferences(exerciseFrequency) {
    const exercises = Object.entries(exerciseFrequency);
    if (exercises.length < 2) return null;
    
    exercises.sort(([,a], [,b]) => b - a);
    const topExercise = exercises[0];
    const totalExercises = exercises.reduce((sum, [,count]) => sum + count, 0);
    const preference = topExercise[1] / totalExercises;
    
    if (preference < 0.2) return null; // No strong preference
    
    return {
      type: 'preference',
      subtype: 'exercise',
      description: `Strong preference for ${topExercise[0]}`,
      confidence: preference,
      dataPoints: totalExercises,
      timeRange: 'current_period',
      significance: 'Exercise preferences indicate user engagement and satisfaction',
      metrics: {
        topExercise: topExercise[0],
        preference,
        exerciseCount: exercises.length
      }
    };
  }
  
  /**
   * Analyzes exercise-satisfaction correlation
   * @param {Array} exerciseLogs - Exercise log data
   * @returns {Object|null} Satisfaction pattern
   * @private
   */
  _analyzeExerciseSatisfaction(exerciseLogs) {
    const exerciseSatisfaction = {};
    
    exerciseLogs.forEach(log => {
      if (log.exercises && log.satisfaction && Array.isArray(log.exercises)) {
        log.exercises.forEach(exercise => {
          const name = exercise.name || exercise.exercise;
          if (name) {
            if (!exerciseSatisfaction[name]) {
              exerciseSatisfaction[name] = [];
            }
            exerciseSatisfaction[name].push(log.satisfaction);
          }
        });
      }
    });
    
    // Find exercise with highest average satisfaction
    let bestExercise = null;
    let highestSatisfaction = 0;
    
    Object.entries(exerciseSatisfaction).forEach(([exercise, satisfactions]) => {
      if (satisfactions.length >= 2) { // Need at least 2 data points
        const avgSatisfaction = satisfactions.reduce((sum, s) => sum + s, 0) / satisfactions.length;
        if (avgSatisfaction > highestSatisfaction) {
          highestSatisfaction = avgSatisfaction;
          bestExercise = exercise;
        }
      }
    });
    
    if (!bestExercise || highestSatisfaction < 7) return null; // Need satisfaction >= 7
    
    return {
      type: 'preference',
      subtype: 'satisfaction',
      description: `High satisfaction with ${bestExercise}`,
      confidence: highestSatisfaction / 10, // Normalize to 0-1
      dataPoints: exerciseSatisfaction[bestExercise].length,
      timeRange: 'current_period',
      significance: 'High satisfaction exercises should be prioritized in future plans',
      metrics: {
        topExercise: bestExercise,
        avgSatisfaction: highestSatisfaction,
        satisfactionCount: exerciseSatisfaction[bestExercise].length
      }
    };
  }
  
  // Placeholder methods for other pattern detection functions
  // These would be implemented with similar database-powered intelligence
  
  async _analyzeWorkoutFrequency(userData, context) {
    // Placeholder for frequency analysis
    return null;
  }
  
  async _analyzeSeasonalPatterns(userData, context) {
    // Placeholder for seasonal analysis
    return [];
  }
  
  async _analyzeStrengthProgression(userData, context) {
    // Placeholder for strength progression analysis
    return [];
  }
  
  async _analyzeEnduranceProgression(userData, context) {
    // Placeholder for endurance progression analysis
    return [];
  }
  
  async _detectPlateauPatterns(userData, context) {
    // Placeholder for plateau detection
    return [];
  }
  
  async _analyzeVolumeProgression(userData, context) {
    // Placeholder for volume progression analysis
    return [];
  }
  
  async _detectRegressionPatterns(userData, context) {
    // Placeholder for regression detection
    return [];
  }
  
  async _analyzeWorkoutVariety(userData, context) {
    // Placeholder for variety analysis
    return [];
  }
  
  async _analyzeMuscleGroupFocus(userData, context) {
    // Placeholder for muscle group analysis
    return [];
  }
  
  async _analyzeEquipmentUsage(userData, context) {
    // Placeholder for equipment usage analysis
    return [];
  }
  
  async _analyzeAdherencePatterns(userData, context) {
    // Placeholder for adherence analysis
    return [];
  }
  
  async _analyzeMotivationPatterns(userData, context) {
    // Placeholder for motivation analysis
    return [];
  }
  
  async _analyzeAdaptationPatterns(userData, context) {
    // Placeholder for adaptation analysis
    return [];
  }
  
  async _analyzeDropoutRiskPatterns(userData, context) {
    // Placeholder for dropout risk analysis
    return [];
  }
  
  async _analyzeMetricCorrelations(userData, context) {
    // Placeholder for correlation analysis
    return [];
  }
  
  async _detectAnomalies(userData, context) {
    // Placeholder for anomaly detection
    return [];
  }
  
  async _analyzeTrends(userData, context) {
    // Placeholder for trend analysis
    return [];
  }
  
  async _analyzeExerciseCategoryPreferences(topExercises) {
    // Placeholder for category preference analysis
    return null;
  }
  
  /**
   * Generates starter patterns for new users with limited data
   * @param {Object} userData - User data
   * @param {Object} context - Analysis context
   * @returns {Array} Starter patterns
   * @private
   */
  _generateStarterPatterns(userData, context) {
    const patterns = [];
    
    // Starter pattern - new user beginning fitness journey
    patterns.push({
      type: 'starter',
      category: 'behavioral',
      description: 'User is beginning their fitness journey',
      confidence: 0.8,
      dataPoints: 0,
      timeRange: context.timeframe || '30 days',
      significance: 'Perfect opportunity to establish baseline habits and set achievable goals',
      actionableInsights: [
        'Focus on consistency over intensity',
        'Start with 2-3 workouts per week',
        'Track workouts to build momentum'
      ]
    });
    
    // Opportunity pattern - establish baseline
    patterns.push({
      type: 'opportunity',
      category: 'behavioral',
      description: 'Opportunity to establish workout consistency',
      confidence: 0.75,
      dataPoints: 0,
      timeRange: context.timeframe || '30 days',
      significance: 'Building sustainable habits is crucial for long-term fitness success',
      actionableInsights: [
        'Schedule specific workout times',
        'Choose activities you enjoy',
        'Set realistic weekly goals'
      ]
    });
    
    // Goal-setting pattern
    patterns.push({
      type: 'goal_setting',
      category: 'behavioral',
      description: 'Need to establish clear fitness goals',
      confidence: 0.7,
      dataPoints: 0,
      timeRange: context.timeframe || '30 days',
      significance: 'Clear goals provide direction and motivation for fitness journey',
      actionableInsights: [
        'Define 1-2 specific, measurable goals',
        'Set both short-term and long-term objectives',
        'Plan regular progress reviews'
      ]
    });
    
    this.logger?.info('Generated starter patterns for new user', {
      userId: context.userId,
      patternCount: patterns.length
    });
    
    return patterns;
  }
}

module.exports = PatternDetector; 