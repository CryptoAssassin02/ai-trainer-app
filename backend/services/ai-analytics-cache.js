const redis = require('redis');
const logger = require('../config/logger');
const { ApplicationError } = require('../utils/errors');

/**
 * ✅ TASK 2.7: AI Analytics Caching System
 * 
 * Provides intelligent caching for AI-generated analytics responses to:
 * - Reduce OpenAI API costs and response times
 * - Improve user experience with faster subsequent requests
 * - Implement smart cache invalidation based on data freshness
 * - Support different TTL strategies for different data types
 */
class AIAnalyticsCache {
  constructor(config = {}) {
    this.config = {
      // Redis connection configuration
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      },
      
      // TTL (Time To Live) configurations in seconds
      ttl: {
        insights: 3600,           // 1 hour - AI insights change with new data
        patterns: 7200,           // 2 hours - Patterns are more stable
        recommendations: 1800,    // 30 minutes - Recommendations should be fresh
        predictions: 14400,       // 4 hours - Goal predictions are longer-term
        userOverview: 900,        // 15 minutes - Overview data changes frequently
        trendAnalysis: 1800       // 30 minutes - Trend analysis is moderately stable
      },
      
      // Cache key prefixes for organization
      keyPrefixes: {
        insights: 'ai:insights',
        patterns: 'ai:patterns', 
        recommendations: 'ai:recommendations',
        predictions: 'ai:predictions',
        overview: 'analytics:overview',
        trends: 'analytics:trends'
      },
      
      // Cache performance settings
      maxCacheSize: '100mb',
      compressionEnabled: true,
      
      ...config
    };
    
    this.client = null;
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxConnectionRetries = 5;
  }

  /**
   * Initialize Redis connection with error handling and reconnection logic
   */
  async initialize() {
    try {
      if (this.isConnected) {
        return this.client;
      }

      logger.info('Initializing AI Analytics Cache (Redis)...');
      
      this.client = redis.createClient(this.config.redis);
      
      // Set up event handlers
      this.client.on('error', this._handleRedisError.bind(this));
      this.client.on('connect', this._handleRedisConnect.bind(this));
      this.client.on('ready', this._handleRedisReady.bind(this));
      this.client.on('end', this._handleRedisEnd.bind(this));
      
      // Connect to Redis
      await this.client.connect();
      
      // Test connection
      await this.client.ping();
      
      this.isConnected = true;
      this.connectionRetries = 0;
      
      logger.info('AI Analytics Cache initialized successfully');
      return this.client;
      
    } catch (error) {
      logger.error(`Failed to initialize AI Analytics Cache: ${error.message}`);
      this.isConnected = false;
      
      // Implement exponential backoff for reconnection
      if (this.connectionRetries < this.maxConnectionRetries) {
        this.connectionRetries++;
        const delay = Math.pow(2, this.connectionRetries) * 1000; // Exponential backoff
        logger.info(`Retrying cache connection in ${delay}ms (attempt ${this.connectionRetries}/${this.maxConnectionRetries})`);
        
        setTimeout(() => this.initialize(), delay);
      } else {
        logger.error('Max cache connection retries exceeded - operating without cache');
      }
      
      throw new ApplicationError(`Cache initialization failed: ${error.message}`);
    }
  }

  /**
   * Cache AI insights with intelligent TTL based on data freshness
   * @param {string} userId - User ID
   * @param {string} timeframe - Analysis timeframe
   * @param {Object} insights - AI insights data
   * @param {Object} options - Caching options
   */
  async cacheInsights(userId, timeframe, insights, options = {}) {
    if (!this.isConnected) {
      logger.warn('Cache not available - skipping insights caching');
      return false;
    }

    try {
      const cacheKey = this._buildCacheKey('insights', userId, timeframe, options.contextHash);
      const ttl = this._calculateDynamicTTL('insights', insights, options);
      
      // Add metadata for cache management
      const cacheData = {
        data: insights,
        metadata: {
          userId,
          timeframe,
          cachedAt: new Date().toISOString(),
          dataPoints: insights.metadata?.totalDataPoints || 0,
          confidenceScore: insights.metadata?.confidenceScore || 0,
          version: '1.0'
        }
      };
      
      await this.client.setEx(
        cacheKey, 
        ttl, 
        JSON.stringify(cacheData)
      );
      
      // Track cache statistics
      await this._trackCacheStats('insights', 'write', cacheKey.length);
      
      logger.debug(`Cached AI insights for user ${userId}, TTL: ${ttl}s`);
      return true;
      
    } catch (error) {
      logger.error(`Failed to cache insights: ${error.message}`);
      return false;
    }
  }

  /**
   * Retrieve cached AI insights with freshness validation
   * @param {string} userId - User ID  
   * @param {string} timeframe - Analysis timeframe
   * @param {Object} options - Retrieval options
   * @returns {Object|null} Cached insights or null if not found/stale
   */
  async getInsights(userId, timeframe, options = {}) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const cacheKey = this._buildCacheKey('insights', userId, timeframe, options.contextHash);
      const cachedData = await this.client.get(cacheKey);
      
      if (!cachedData) {
        await this._trackCacheStats('insights', 'miss');
        return null;
      }
      
      const parsedData = JSON.parse(cachedData);
      
      // Validate data freshness
      if (this._isDataStale(parsedData.metadata, options)) {
        logger.debug(`Cached insights stale for user ${userId} - invalidating`);
        await this.client.del(cacheKey);
        await this._trackCacheStats('insights', 'stale');
        return null;
      }
      
      await this._trackCacheStats('insights', 'hit');
      logger.debug(`Retrieved cached insights for user ${userId}`);
      
      return parsedData.data;
      
    } catch (error) {
      logger.error(`Failed to retrieve cached insights: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache pattern analysis results
   * @param {string} userId - User ID
   * @param {string} timeframe - Analysis timeframe  
   * @param {Array} patterns - Detected patterns
   * @param {Object} options - Caching options
   */
  async cachePatterns(userId, timeframe, patterns, options = {}) {
    if (!this.isConnected) {
      logger.warn('Cache not available - skipping pattern caching');
      return false;
    }

    try {
      const cacheKey = this._buildCacheKey('patterns', userId, timeframe);
      const ttl = this.config.ttl.patterns;
      
      const cacheData = {
        patterns,
        metadata: {
          userId,
          timeframe,
          cachedAt: new Date().toISOString(),
          patternCount: patterns.length,
          avgConfidence: patterns.reduce((sum, p) => sum + (p.confidence || 0), 0) / patterns.length
        }
      };
      
      await this.client.setEx(cacheKey, ttl, JSON.stringify(cacheData));
      await this._trackCacheStats('patterns', 'write');
      
      logger.debug(`Cached ${patterns.length} patterns for user ${userId}`);
      return true;
      
    } catch (error) {
      logger.error(`Failed to cache patterns: ${error.message}`);
      return false;
    }
  }

  /**
   * Retrieve cached patterns
   * @param {string} userId - User ID
   * @param {string} timeframe - Analysis timeframe
   * @returns {Array|null} Cached patterns or null if not found
   */
  async getPatterns(userId, timeframe) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const cacheKey = this._buildCacheKey('patterns', userId, timeframe);
      const cachedData = await this.client.get(cacheKey);
      
      if (!cachedData) {
        await this._trackCacheStats('patterns', 'miss');
        return null;
      }
      
      const parsedData = JSON.parse(cachedData);
      await this._trackCacheStats('patterns', 'hit');
      
      logger.debug(`Retrieved ${parsedData.patterns.length} cached patterns for user ${userId}`);
      return parsedData.patterns;
      
    } catch (error) {
      logger.error(`Failed to retrieve cached patterns: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache personalized recommendations
   * @param {string} userId - User ID
   * @param {Array} recommendations - AI recommendations
   * @param {Object} options - Caching options
   */
  async cacheRecommendations(userId, recommendations, options = {}) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const cacheKey = this._buildCacheKey('recommendations', userId, options.categories?.join(',') || 'all');
      const ttl = this.config.ttl.recommendations;
      
      const cacheData = {
        recommendations,
        metadata: {
          userId,
          categories: options.categories || [],
          cachedAt: new Date().toISOString(),
          recommendationCount: recommendations.length
        }
      };
      
      await this.client.setEx(cacheKey, ttl, JSON.stringify(cacheData));
      await this._trackCacheStats('recommendations', 'write');
      
      logger.debug(`Cached ${recommendations.length} recommendations for user ${userId}`);
      return true;
      
    } catch (error) {
      logger.error(`Failed to cache recommendations: ${error.message}`);
      return false;
    }
  }

  /**
   * Retrieve cached recommendations
   * @param {string} userId - User ID
   * @param {Object} options - Retrieval options
   * @returns {Array|null} Cached recommendations or null if not found
   */
  async getRecommendations(userId, options = {}) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const cacheKey = this._buildCacheKey('recommendations', userId, options.categories?.join(',') || 'all');
      const cachedData = await this.client.get(cacheKey);
      
      if (!cachedData) {
        await this._trackCacheStats('recommendations', 'miss');
        return null;
      }
      
      const parsedData = JSON.parse(cachedData);
      await this._trackCacheStats('recommendations', 'hit');
      
      logger.debug(`Retrieved ${parsedData.recommendations.length} cached recommendations for user ${userId}`);
      return parsedData.recommendations;
      
    } catch (error) {
      logger.error(`Failed to retrieve cached recommendations: ${error.message}`);
      return null;
    }
  }

  /**
   * Invalidate cache for specific user or pattern
   * @param {string} pattern - Cache pattern to invalidate
   * @param {string} userId - Optional user ID for user-specific invalidation
   */
  async invalidateCache(pattern, userId = null) {
    if (!this.isConnected) {
      return false;
    }

    try {
      let searchPattern;
      
      if (userId) {
        // User-specific invalidation
        searchPattern = `*:${userId}:*`;
      } else {
        // Pattern-based invalidation
        searchPattern = `${pattern}:*`;
      }
      
      const keys = await this.client.keys(searchPattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info(`Invalidated ${keys.length} cache entries for pattern: ${searchPattern}`);
      }
      
      await this._trackCacheStats('invalidation', 'bulk', keys.length);
      return true;
      
    } catch (error) {
      logger.error(`Failed to invalidate cache: ${error.message}`);
      return false;
    }
  }

  /**
   * Get cache statistics and health metrics
   * @returns {Object} Cache statistics
   */
  async getCacheStats() {
    if (!this.isConnected) {
      return { available: false };
    }

    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      // Parse Redis info
      const memoryUsed = this._parseRedisInfo(info, 'used_memory_human');
      const totalKeys = this._parseRedisInfo(keyspace, 'keys');
      
      // Get our custom stats
      const statsKey = 'ai:cache:stats';
      const customStats = await this.client.hGetAll(statsKey);
      
      return {
        available: true,
        memory: {
          used: memoryUsed,
          maxSize: this.config.maxCacheSize
        },
        keys: {
          total: parseInt(totalKeys) || 0,
          aiInsights: parseInt(customStats.insights_count) || 0,
          patterns: parseInt(customStats.patterns_count) || 0,
          recommendations: parseInt(customStats.recommendations_count) || 0
        },
        performance: {
          hitRate: this._calculateHitRate(customStats),
          avgResponseTime: parseFloat(customStats.avg_response_time) || 0
        },
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error(`Failed to get cache stats: ${error.message}`);
      return { available: false, error: error.message };
    }
  }

  /**
   * Clear all cache data (use with caution)
   * @param {boolean} confirm - Confirmation flag
   */
  async clearAll(confirm = false) {
    if (!confirm) {
      throw new ApplicationError('Cache clear operation requires explicit confirmation');
    }
    
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.flushDb();
      logger.warn('All cache data cleared');
      return true;
      
    } catch (error) {
      logger.error(`Failed to clear cache: ${error.message}`);
      return false;
    }
  }

  /**
   * Close Redis connection gracefully
   */
  async close() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.isConnected = false;
        logger.info('AI Analytics Cache connection closed');
      } catch (error) {
        logger.error(`Error closing cache connection: ${error.message}`);
      }
    }
  }

  // Private helper methods

  /**
   * Build cache key with consistent naming convention
   * @private
   */
  _buildCacheKey(type, userId, identifier, contextHash = null) {
    const prefix = this.config.keyPrefixes[type] || 'ai:cache';
    let key = `${prefix}:${userId}:${identifier}`;
    
    if (contextHash) {
      key += `:${contextHash}`;
    }
    
    return key;
  }

  /**
   * Calculate dynamic TTL based on data characteristics
   * @private
   */
  _calculateDynamicTTL(type, data, options = {}) {
    let baseTTL = this.config.ttl[type] || 3600;
    
    // Adjust TTL based on data quality and freshness
    if (data.metadata) {
      const dataPoints = data.metadata.totalDataPoints || 0;
      const confidence = data.metadata.confidenceScore || 0.5;
      
      // More data points = longer TTL (more stable)
      if (dataPoints > 100) {
        baseTTL *= 1.5;
      } else if (dataPoints < 10) {
        baseTTL *= 0.5;
      }
      
      // Higher confidence = longer TTL
      if (confidence > 0.8) {
        baseTTL *= 1.2;
      } else if (confidence < 0.5) {
        baseTTL *= 0.8;
      }
    }
    
    // Apply options-based adjustments
    if (options.extendTTL) {
      baseTTL *= 1.5;
    }
    if (options.shortenTTL) {
      baseTTL *= 0.5;
    }
    
    return Math.round(baseTTL);
  }

  /**
   * Check if cached data is stale based on business rules
   * @private
   */
  _isDataStale(metadata, options = {}) {
    const cachedAt = new Date(metadata.cachedAt);
    const now = new Date();
    const ageInHours = (now - cachedAt) / (1000 * 60 * 60);
    
    // Force refresh if new data has been added
    if (options.lastDataUpdate && new Date(options.lastDataUpdate) > cachedAt) {
      return true;
    }
    
    // Adaptive staleness based on data characteristics
    const dataPoints = metadata.dataPoints || 0;
    const confidence = metadata.confidenceScore || 0.5;
    
    let maxAge = 24; // Default max age in hours
    
    // Adjust based on data volume (more data = can be older)
    if (dataPoints > 100) {
      maxAge = 48;
    } else if (dataPoints < 10) {
      maxAge = 6;
    }
    
    // Adjust based on confidence (higher confidence = can be older)
    if (confidence > 0.8) {
      maxAge *= 1.5;
    } else if (confidence < 0.5) {
      maxAge *= 0.5;
    }
    
    return ageInHours > maxAge;
  }

  /**
   * Track cache performance statistics
   * @private
   */
  async _trackCacheStats(operation, type, value = 1) {
    try {
      const statsKey = 'ai:cache:stats';
      const field = `${operation}_${type}`;
      
      await this.client.hIncrBy(statsKey, field, value);
      await this.client.hIncrBy(statsKey, 'total_operations', 1);
      
      // Set expiry on stats key to prevent indefinite growth
      await this.client.expire(statsKey, 86400); // 24 hours
      
    } catch (error) {
      // Don't fail operations due to stats tracking errors
      logger.debug(`Cache stats tracking error: ${error.message}`);
    }
  }

  /**
   * Calculate cache hit rate from statistics
   * @private
   */
  _calculateHitRate(stats) {
    const hits = Object.keys(stats)
      .filter(key => key.endsWith('_hit'))
      .reduce((sum, key) => sum + parseInt(stats[key] || 0), 0);
    
    const misses = Object.keys(stats)
      .filter(key => key.endsWith('_miss'))
      .reduce((sum, key) => sum + parseInt(stats[key] || 0), 0);
    
    const total = hits + misses;
    return total > 0 ? (hits / total * 100).toFixed(2) : 0;
  }

  /**
   * Parse Redis INFO response
   * @private
   */
  _parseRedisInfo(info, key) {
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line.startsWith(key + ':')) {
        return line.split(':')[1];
      }
    }
    return null;
  }

  // Redis event handlers
  _handleRedisError(error) {
    logger.error(`Redis connection error: ${error.message}`);
    this.isConnected = false;
  }

  _handleRedisConnect() {
    logger.debug('Redis connection established');
  }

  _handleRedisReady() {
    logger.info('Redis client ready');
    this.isConnected = true;
  }

  _handleRedisEnd() {
    logger.info('Redis connection ended');
    this.isConnected = false;
  }
}

// Export singleton instance
let cacheInstance = null;

/**
 * Get or create AI Analytics Cache instance
 * @param {Object} config - Optional configuration override
 * @returns {AIAnalyticsCache} Cache instance
 */
function getAIAnalyticsCache(config = {}) {
  if (!cacheInstance) {
    cacheInstance = new AIAnalyticsCache(config);
  }
  return cacheInstance;
}

module.exports = {
  AIAnalyticsCache,
  getAIAnalyticsCache
}; 