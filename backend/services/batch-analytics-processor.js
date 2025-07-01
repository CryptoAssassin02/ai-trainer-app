const EventEmitter = require('events');
const logger = require('../config/logger');
const { ApplicationError, DatabaseError } = require('../utils/errors');
const analyticsService = require('./analytics-service');
const { getAIAnalyticsCache } = require('./ai-analytics-cache');

/**
 * ✅ TASK 2.8: Batch Analytics Processor
 * 
 * Provides background processing capabilities for analytics operations including:
 * - Queue system for managing analytics operations
 * - Background processing of large datasets
 * - Progress tracking and status updates
 * - Error handling with intelligent retry mechanisms
 * - Integration with analytics service and caching system
 * - Concurrent processing with resource management
 */
class BatchAnalyticsProcessor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Processing configuration
      maxConcurrentJobs: parseInt(process.env.BATCH_MAX_CONCURRENT) || 3,
      jobTimeout: parseInt(process.env.BATCH_JOB_TIMEOUT) || 300000, // 5 minutes
      retryAttempts: parseInt(process.env.BATCH_RETRY_ATTEMPTS) || 3,
      retryDelay: parseInt(process.env.BATCH_RETRY_DELAY) || 5000, // 5 seconds
      
      // Queue configuration
      maxQueueSize: parseInt(process.env.BATCH_MAX_QUEUE_SIZE) || 100,
      priorityLevels: ['low', 'normal', 'high', 'urgent'],
      
      // Progress tracking
      progressUpdateInterval: 10000, // 10 seconds
      statusPersistence: true,
      
      // Resource limits
      memoryLimit: '1GB',
      cpuLimit: 80, // percentage
      
      // Integration settings
      cacheEnabled: true,
      analyticsIntegration: true,
      
      ...config
    };
    
    // Job management
    this.jobQueue = new Map();
    this.activeJobs = new Map();
    this.completedJobs = new Map();
    this.failedJobs = new Map();
    
    // Processing state
    this.isProcessing = false;
    this.nextJobId = 1;
    this.totalJobsProcessed = 0;
    this.totalJobsFailed = 0;
    
    // Performance monitoring
    this.metrics = {
      avgProcessingTime: 0,
      successRate: 100,
      queueUtilization: 0,
      concurrencyUtilization: 0
    };
    
    // Cache integration
    this.cache = this.config.cacheEnabled ? getAIAnalyticsCache() : null;
    
    // Start processing
    this._initializeProcessor();
  }

  /**
   * Initialize the batch processor
   * @private
   */
  async _initializeProcessor() {
    try {
      logger.info('Initializing Batch Analytics Processor...');
      
      // Initialize cache if enabled
      if (this.cache) {
        try {
          await this.cache.initialize();
          logger.info('Cache integration enabled for batch processor');
        } catch (error) {
          logger.warn(`Cache initialization failed, continuing without cache: ${error.message}`);
          this.cache = null;
        }
      }
      
      // Start processing loop
      this._startProcessingLoop();
      
      // Set up cleanup intervals
      this._setupCleanupIntervals();
      
      logger.info('Batch Analytics Processor initialized successfully');
      this.emit('initialized');
      
    } catch (error) {
      logger.error(`Failed to initialize batch processor: ${error.message}`);
      throw new ApplicationError(`Batch processor initialization failed: ${error.message}`);
    }
  }

  /**
   * Submit a batch analytics job to the queue
   * @param {string} operation - The analytics operation to perform
   * @param {Object} params - Parameters for the operation
   * @param {Object} options - Job options (priority, userId, etc.)
   * @returns {Promise<string>} Job ID
   */
  async submitJob(operation, params, options = {}) {
    try {
      const jobId = this._generateJobId();
      
      // Validate queue capacity
      if (this.jobQueue.size >= this.config.maxQueueSize) {
        throw new ApplicationError(`Queue is full (${this.config.maxQueueSize} jobs). Please try again later.`);
      }
      
      // Validate operation
      if (!this._isValidOperation(operation)) {
        throw new ApplicationError(`Invalid operation: ${operation}`);
      }
      
      const job = {
        id: jobId,
        operation,
        params,
        options: {
          priority: options.priority || 'normal',
          userId: options.userId,
          timeframe: options.timeframe || '30 days',
          categories: options.categories || [],
          maxRetries: options.maxRetries || this.config.retryAttempts,
          timeout: options.timeout || this.config.jobTimeout,
          ...options
        },
        status: 'queued',
        createdAt: new Date().toISOString(),
        attempts: 0,
        progress: 0,
        error: null,
        result: null
      };
      
      // Add to queue with priority ordering
      this._addToQueue(job);
      
      logger.info(`Job ${jobId} submitted for operation: ${operation}`, {
        userId: options.userId,
        priority: job.options.priority,
        queueSize: this.jobQueue.size
      });
      
      // Emit job submitted event
      this.emit('jobSubmitted', job);
      
      // Update metrics
      this._updateQueueMetrics();
      
      return jobId;
      
    } catch (error) {
      logger.error(`Failed to submit job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get status of a specific job
   * @param {string} jobId - Job ID
   * @returns {Object|null} Job status or null if not found
   */
  getJobStatus(jobId) {
    // Check active jobs first
    if (this.activeJobs.has(jobId)) {
      return { ...this.activeJobs.get(jobId) };
    }
    
    // Check queued jobs
    for (const job of this.jobQueue.values()) {
      if (job.id === jobId) {
        return { ...job };
      }
    }
    
    // Check completed jobs
    if (this.completedJobs.has(jobId)) {
      return { ...this.completedJobs.get(jobId) };
    }
    
    // Check failed jobs
    if (this.failedJobs.has(jobId)) {
      return { ...this.failedJobs.get(jobId) };
    }
    
    return null;
  }

  /**
   * Get batch processor statistics
   * @returns {Object} Processor statistics
   */
  getProcessorStats() {
    return {
      queue: {
        size: this.jobQueue.size,
        maxSize: this.config.maxQueueSize,
        utilization: (this.jobQueue.size / this.config.maxQueueSize * 100).toFixed(2)
      },
      processing: {
        activeJobs: this.activeJobs.size,
        maxConcurrent: this.config.maxConcurrentJobs,
        utilization: (this.activeJobs.size / this.config.maxConcurrentJobs * 100).toFixed(2)
      },
      performance: {
        totalProcessed: this.totalJobsProcessed,
        totalFailed: this.totalJobsFailed,
        successRate: this.totalJobsProcessed > 0 
          ? ((this.totalJobsProcessed - this.totalJobsFailed) / this.totalJobsProcessed * 100).toFixed(2) 
          : 100,
        avgProcessingTime: this.metrics.avgProcessingTime
      },
      status: {
        isProcessing: this.isProcessing,
        lastUpdated: new Date().toISOString()
      }
    };
  }

  /**
   * Get queue overview with job details
   * @param {Object} filters - Optional filters
   * @returns {Object} Queue overview
   */
  getQueueOverview(filters = {}) {
    const queuedJobs = Array.from(this.jobQueue.values())
      .filter(job => this._matchesFilter(job, filters))
      .map(job => ({
        id: job.id,
        operation: job.operation,
        priority: job.options.priority,
        userId: job.options.userId,
        createdAt: job.createdAt,
        status: job.status
      }));
      
    const activeJobs = Array.from(this.activeJobs.values())
      .filter(job => this._matchesFilter(job, filters))
      .map(job => ({
        id: job.id,
        operation: job.operation,
        progress: job.progress,
        userId: job.options.userId,
        startedAt: job.startedAt,
        status: job.status
      }));
    
    return {
      queued: queuedJobs,
      active: activeJobs,
      summary: {
        totalQueued: queuedJobs.length,
        totalActive: activeJobs.length,
        totalCompleted: this.completedJobs.size,
        totalFailed: this.failedJobs.size
      }
    };
  }

  /**
   * Cancel a queued or active job
   * @param {string} jobId - Job ID to cancel
   * @returns {boolean} True if successfully cancelled
   */
  async cancelJob(jobId) {
    try {
      // Check if job is queued
      for (const [priority, jobs] of this.jobQueue) {
        const jobIndex = jobs.findIndex(job => job.id === jobId);
        if (jobIndex !== -1) {
          const job = jobs.splice(jobIndex, 1)[0];
          job.status = 'cancelled';
          job.cancelledAt = new Date().toISOString();
          
          logger.info(`Job ${jobId} cancelled from queue`);
          this.emit('jobCancelled', job);
          return true;
        }
      }
      
      // Check if job is active
      if (this.activeJobs.has(jobId)) {
        const job = this.activeJobs.get(jobId);
        job.status = 'cancelling';
        job.cancelRequested = true;
        
        logger.info(`Cancellation requested for active job ${jobId}`);
        this.emit('jobCancellationRequested', job);
        return true;
      }
      
      return false;
      
    } catch (error) {
      logger.error(`Failed to cancel job ${jobId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Clear completed and failed jobs (cleanup)
   * @param {Object} options - Cleanup options
   * @returns {Object} Cleanup results
   */
  clearCompletedJobs(options = {}) {
    const { 
      olderThan = 24 * 60 * 60 * 1000, // 24 hours
      keepRecent = 10,
      includeeFailed = true 
    } = options;
    
    const cutoffTime = new Date(Date.now() - olderThan);
    let clearedCompleted = 0;
    let clearedFailed = 0;
    
    // Clear old completed jobs
    const completedEntries = Array.from(this.completedJobs.entries())
      .sort((a, b) => new Date(b[1].completedAt) - new Date(a[1].completedAt));
      
    if (completedEntries.length > keepRecent) {
      const toKeep = completedEntries.slice(0, keepRecent);
      const toClear = completedEntries.slice(keepRecent)
        .filter(([id, job]) => new Date(job.completedAt) < cutoffTime);
      
      this.completedJobs.clear();
      toKeep.forEach(([id, job]) => this.completedJobs.set(id, job));
      clearedCompleted = toClear.length;
    }
    
    // Clear old failed jobs if requested
    if (includeeFailed) {
      const failedEntries = Array.from(this.failedJobs.entries())
        .sort((a, b) => new Date(b[1].failedAt) - new Date(a[1].failedAt));
        
      if (failedEntries.length > keepRecent) {
        const toKeep = failedEntries.slice(0, keepRecent);
        const toClear = failedEntries.slice(keepRecent)
          .filter(([id, job]) => new Date(job.failedAt) < cutoffTime);
        
        this.failedJobs.clear();
        toKeep.forEach(([id, job]) => this.failedJobs.set(id, job));
        clearedFailed = toClear.length;
      }
    }
    
    logger.info(`Cleanup completed: ${clearedCompleted} completed, ${clearedFailed} failed jobs cleared`);
    
    return {
      clearedCompleted,
      clearedFailed,
      remainingCompleted: this.completedJobs.size,
      remainingFailed: this.failedJobs.size
    };
  }

  /**
   * Shutdown the processor gracefully
   * @param {number} timeout - Timeout for graceful shutdown
   * @returns {Promise<boolean>} True if shutdown completed successfully
   */
  async shutdown(timeout = 30000) {
    try {
      logger.info('Initiating graceful shutdown of batch processor...');
      
      this.isProcessing = false;
      
      // Wait for active jobs to complete or timeout
      const startTime = Date.now();
      while (this.activeJobs.size > 0 && (Date.now() - startTime) < timeout) {
        logger.debug(`Waiting for ${this.activeJobs.size} active jobs to complete...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Force cancel remaining jobs if timeout exceeded
      if (this.activeJobs.size > 0) {
        logger.warn(`Forcing cancellation of ${this.activeJobs.size} remaining jobs`);
        for (const job of this.activeJobs.values()) {
          job.status = 'cancelled';
          job.error = 'Cancelled due to shutdown';
        }
      }
      
      // Close cache connection if available
      if (this.cache) {
        await this.cache.close();
      }
      
      logger.info('Batch processor shutdown completed');
      this.emit('shutdown');
      
      return true;
      
    } catch (error) {
      logger.error(`Error during batch processor shutdown: ${error.message}`);
      return false;
    }
  }

  // Private methods

  /**
   * Start the main processing loop
   * @private
   */
  _startProcessingLoop() {
    this.isProcessing = true;
    
    const processLoop = async () => {
      while (this.isProcessing) {
        try {
          // Process jobs if there's capacity and queued jobs
          if (this.activeJobs.size < this.config.maxConcurrentJobs && this.jobQueue.size > 0) {
            const job = this._getNextJob();
            if (job) {
              this._processJob(job);
            }
          }
          
          // Brief pause to prevent tight loop
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          logger.error(`Error in processing loop: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    };
    
    processLoop();
  }

  /**
   * Process a single job
   * @private
   */
  async _processJob(job) {
    const startTime = Date.now();
    
    try {
      // Move job to active status
      job.status = 'processing';
      job.startedAt = new Date().toISOString();
      job.attempts++;
      this.activeJobs.set(job.id, job);
      
      logger.info(`Started processing job ${job.id}: ${job.operation}`, {
        userId: job.options.userId,
        attempt: job.attempts
      });
      
      this.emit('jobStarted', job);
      
      // Set up timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), job.options.timeout);
      });
      
      // Process the job with timeout
      const processPromise = this._executeJob(job);
      
      const result = await Promise.race([processPromise, timeoutPromise]);
      
      // Check for cancellation
      if (job.cancelRequested) {
        throw new Error('Job cancelled by user request');
      }
      
      // Job completed successfully
      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date().toISOString();
      job.processingTime = Date.now() - startTime;
      
      // Move to completed jobs
      this.activeJobs.delete(job.id);
      this.completedJobs.set(job.id, job);
      
      // Update metrics
      this.totalJobsProcessed++;
      this._updateProcessingMetrics(job.processingTime);
      
      logger.info(`Job ${job.id} completed successfully`, {
        processingTime: job.processingTime,
        userId: job.options.userId
      });
      
      this.emit('jobCompleted', job);
      
    } catch (error) {
      await this._handleJobError(job, error, startTime);
    }
  }

  /**
   * Execute the actual job operation
   * @private
   */
  async _executeJob(job) {
    const { operation, params, options } = job;
    
    // Update progress
    job.progress = 10;
    this.emit('jobProgress', job);
    
    let result;
    
    switch (operation) {
      case 'generateAIInsights':
        result = await this._executeAIInsights(job);
        break;
        
      case 'analyzePatterns':
        result = await this._executePatternAnalysis(job);
        break;
        
      case 'generateRecommendations':
        result = await this._executeRecommendations(job);
        break;
        
      case 'predictGoals':
        result = await this._executeGoalPredictions(job);
        break;
        
      case 'bulkUserAnalysis':
        result = await this._executeBulkAnalysis(job);
        break;
        
      case 'refreshUserData':
        result = await this._executeDataRefresh(job);
        break;
        
      default:
        throw new ApplicationError(`Unknown operation: ${operation}`);
    }
    
    job.progress = 100;
    this.emit('jobProgress', job);
    
    return result;
  }

  /**
   * Execute AI insights generation
   * @private
   */
  async _executeAIInsights(job) {
    const { userId, timeframe, jwtToken } = job.params;
    
    job.progress = 25;
    this.emit('jobProgress', job);
    
    // Check cache first
    if (this.cache) {
      const cached = await this.cache.getInsights(userId, timeframe);
      if (cached) {
        logger.debug(`Using cached insights for job ${job.id}`);
        return cached;
      }
    }
    
    job.progress = 50;
    this.emit('jobProgress', job);
    
    // Generate new insights
    const result = await analyticsService.getAIInsights(userId, timeframe, jwtToken);
    
    job.progress = 75;
    this.emit('jobProgress', job);
    
    // Cache the result
    if (this.cache && result.status === 'success') {
      await this.cache.cacheInsights(userId, timeframe, result.data);
    }
    
    return result;
  }

  /**
   * Execute pattern analysis
   * @private
   */
  async _executePatternAnalysis(job) {
    const { userId, timeframe, jwtToken } = job.params;
    
    job.progress = 30;
    this.emit('jobProgress', job);
    
    // Check cache first
    if (this.cache) {
      const cached = await this.cache.getPatterns(userId, timeframe);
      if (cached) {
        return { patterns: cached };
      }
    }
    
    job.progress = 60;
    this.emit('jobProgress', job);
    
    const result = await analyticsService.getPatternAnalysis(userId, timeframe, jwtToken);
    
    // Cache patterns
    if (this.cache && result.status === 'success') {
      await this.cache.cachePatterns(userId, timeframe, result.data.patterns);
    }
    
    return result;
  }

  /**
   * Execute recommendations generation
   * @private
   */
  async _executeRecommendations(job) {
    const { userId, jwtToken, options } = job.params;
    
    job.progress = 40;
    this.emit('jobProgress', job);
    
    // Check cache first
    if (this.cache) {
      const cached = await this.cache.getRecommendations(userId, options);
      if (cached) {
        return { recommendations: cached };
      }
    }
    
    job.progress = 70;
    this.emit('jobProgress', job);
    
    const result = await analyticsService.getPersonalizedRecommendations(userId, jwtToken, options);
    
    // Cache recommendations
    if (this.cache && result.status === 'success') {
      await this.cache.cacheRecommendations(userId, result.data.recommendations, options);
    }
    
    return result;
  }

  /**
   * Execute goal predictions
   * @private
   */
  async _executeGoalPredictions(job) {
    const { userId, goalType, jwtToken, options } = job.params;
    
    job.progress = 50;
    this.emit('jobProgress', job);
    
    const result = await analyticsService.getGoalPredictions(userId, goalType, jwtToken, options);
    
    return result;
  }

  /**
   * Execute bulk analysis for multiple users
   * @private
   */
  async _executeBulkAnalysis(job) {
    const { userIds, operation, jwtTokens, options } = job.params;
    const results = [];
    const total = userIds.length;
    
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const jwtToken = jwtTokens[i];
      
      try {
        let result;
        switch (operation) {
          case 'insights':
            result = await analyticsService.getAIInsights(userId, options.timeframe, jwtToken);
            break;
          case 'patterns':
            result = await analyticsService.getPatternAnalysis(userId, options.timeframe, jwtToken);
            break;
          default:
            throw new Error(`Unknown bulk operation: ${operation}`);
        }
        
        results.push({ userId, status: 'success', data: result });
        
      } catch (error) {
        results.push({ userId, status: 'error', error: error.message });
      }
      
      // Update progress
      job.progress = Math.round((i + 1) / total * 100);
      this.emit('jobProgress', job);
    }
    
    return { results, summary: { total, successful: results.filter(r => r.status === 'success').length } };
  }

  /**
   * Execute data refresh
   * @private
   */
  async _executeDataRefresh(job) {
    const { userId, jwtToken, options } = job.params;
    
    job.progress = 50;
    this.emit('jobProgress', job);
    
    const result = await analyticsService.refreshUserAnalytics(userId, jwtToken, options);
    
    // Invalidate related cache entries
    if (this.cache) {
      await this.cache.invalidateCache('*', userId);
    }
    
    return result;
  }

  /**
   * Handle job errors with retry logic
   * @private
   */
  async _handleJobError(job, error, startTime) {
    job.error = error.message;
    job.processingTime = Date.now() - startTime;
    
    // Check if job should be retried
    if (job.attempts < job.options.maxRetries && !job.cancelRequested) {
      // Exponential backoff for retry
      const retryDelay = this.config.retryDelay * Math.pow(2, job.attempts - 1);
      
      logger.warn(`Job ${job.id} failed (attempt ${job.attempts}/${job.options.maxRetries}), retrying in ${retryDelay}ms: ${error.message}`);
      
      // Schedule retry
      setTimeout(() => {
        if (this.isProcessing) {
          job.status = 'queued';
          this._addToQueue(job);
        }
      }, retryDelay);
      
      this.activeJobs.delete(job.id);
      this.emit('jobRetry', job);
      
    } else {
      // Job failed permanently
      job.status = 'failed';
      job.failedAt = new Date().toISOString();
      
      this.activeJobs.delete(job.id);
      this.failedJobs.set(job.id, job);
      
      this.totalJobsFailed++;
      
      logger.error(`Job ${job.id} failed permanently: ${error.message}`, {
        userId: job.options.userId,
        attempts: job.attempts
      });
      
      this.emit('jobFailed', job);
    }
  }

  /**
   * Add job to priority queue
   * @private
   */
  _addToQueue(job) {
    const priority = job.options.priority;
    
    if (!this.jobQueue.has(priority)) {
      this.jobQueue.set(priority, []);
    }
    
    this.jobQueue.get(priority).push(job);
  }

  /**
   * Get next job from queue based on priority
   * @private
   */
  _getNextJob() {
    for (const priority of this.config.priorityLevels.reverse()) {
      const jobs = this.jobQueue.get(priority);
      if (jobs && jobs.length > 0) {
        const job = jobs.shift();
        if (jobs.length === 0) {
          this.jobQueue.delete(priority);
        }
        return job;
      }
    }
    return null;
  }

  /**
   * Generate unique job ID
   * @private
   */
  _generateJobId() {
    return `batch_${Date.now()}_${this.nextJobId++}`;
  }

  /**
   * Validate operation type
   * @private
   */
  _isValidOperation(operation) {
    const validOperations = [
      'generateAIInsights',
      'analyzePatterns', 
      'generateRecommendations',
      'predictGoals',
      'bulkUserAnalysis',
      'refreshUserData'
    ];
    return validOperations.includes(operation);
  }

  /**
   * Check if job matches filter criteria
   * @private
   */
  _matchesFilter(job, filters) {
    if (filters.userId && job.options.userId !== filters.userId) return false;
    if (filters.operation && job.operation !== filters.operation) return false;
    if (filters.status && job.status !== filters.status) return false;
    if (filters.priority && job.options.priority !== filters.priority) return false;
    return true;
  }

  /**
   * Update queue utilization metrics
   * @private
   */
  _updateQueueMetrics() {
    this.metrics.queueUtilization = this.jobQueue.size / this.config.maxQueueSize * 100;
    this.metrics.concurrencyUtilization = this.activeJobs.size / this.config.maxConcurrentJobs * 100;
  }

  /**
   * Update processing time metrics
   * @private
   */
  _updateProcessingMetrics(processingTime) {
    // Calculate rolling average
    const alpha = 0.1; // Smoothing factor
    if (this.metrics.avgProcessingTime === 0) {
      this.metrics.avgProcessingTime = processingTime;
    } else {
      this.metrics.avgProcessingTime = (alpha * processingTime) + ((1 - alpha) * this.metrics.avgProcessingTime);
    }
    
    // Update success rate
    if (this.totalJobsProcessed > 0) {
      this.metrics.successRate = ((this.totalJobsProcessed - this.totalJobsFailed) / this.totalJobsProcessed) * 100;
    }
  }

  /**
   * Setup cleanup intervals
   * @private
   */
  _setupCleanupIntervals() {
    // Clean up old jobs every hour
    setInterval(() => {
      this.clearCompletedJobs();
    }, 60 * 60 * 1000);
    
    // Update metrics every 30 seconds
    setInterval(() => {
      this._updateQueueMetrics();
      this.emit('metricsUpdated', this.metrics);
    }, 30000);
  }
}

// Export singleton instance
let processorInstance = null;

/**
 * Get or create Batch Analytics Processor instance
 * @param {Object} config - Optional configuration override
 * @returns {BatchAnalyticsProcessor} Processor instance
 */
function getBatchAnalyticsProcessor(config = {}) {
  if (!processorInstance) {
    processorInstance = new BatchAnalyticsProcessor(config);
  }
  return processorInstance;
}

module.exports = {
  BatchAnalyticsProcessor,
  getBatchAnalyticsProcessor
}; 