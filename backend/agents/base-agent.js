/**
 * BaseAgent - Foundation class for all agent implementations
 * Provides standardized error handling, logging, and memory integration
 */
const { AgentError, ValidationError, ERROR_CODES } = require('../utils/errors');

class BaseAgent {
  /**
   * Create a new BaseAgent instance
   * @param {Object} config - Configuration object
   * @param {Object} [config.memorySystem=null] - Memory system for storing and retrieving agent memories
   * @param {Object} [config.logger=console] - Logger instance
   * @param {Object} [config.config={}] - Agent-specific configuration
   */
  constructor({ memorySystem = null, logger = console, config = {} } = {}) {
    this.memorySystem = memorySystem;
    this.logger = logger;
    this.config = config;
    this.name = this.constructor.name;
  }

  /**
   * Process input data - must be implemented by derived classes
   * @param {Object} context - Input data for processing
   * @param {Object} [options={}] - Processing options
   * @returns {Promise<Object>} - Processing result
   */
  async process(context, options = {}) {
    throw new Error(`Method 'process()' must be implemented by ${this.name}`);
  }

  /**
   * Safely process input with standardized error handling
   * @param {Object} context - Input data for processing
   * @param {Object} [options={}] - Processing options
   * @returns {Promise<Object>} - Standardized result object { success: boolean, data?: any, error?: AgentError }
   */
  async safeProcess(context, options = {}) {
    try {
      this.log('info', `process START`);
      const result = await this.process(context, options);
      this.log('info', `process END`);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      let agentError;

      // Check if it's already an AgentError or ValidationError
      if (error instanceof AgentError) {
        agentError = error;
      } else if (error instanceof ValidationError) {
        // Wrap ValidationError in AgentError with specific code
        agentError = new AgentError(
          error.message,
          ERROR_CODES.VALIDATION_ERROR,
          error.errors || error.details,
          error
        );
      } 
      // Check for common error types that indicate external service issues
      else if (error.response && error.response.status >= 500) { // Axios-like error for external API failure
        agentError = new AgentError(
          `External service error: ${error.message}`,
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { statusCode: error.response.status, data: error.response.data },
          error
        );
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') { // Network errors
         agentError = new AgentError(
          `External service connection error: ${error.message}`,
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { originalCode: error.code },
          error
        );
      } 
      // Check for configuration or resource related errors (example)
      else if (error.message.includes('Missing configuration')) {
         agentError = new AgentError(
          error.message,
          ERROR_CODES.CONFIGURATION_ERROR,
          null,
          error
        );
      } 
      // Default to general processing error
      else {
        agentError = new AgentError(
          `Agent processing error: ${error.message}`,
          ERROR_CODES.PROCESSING_ERROR,
          null,
          error
        );
      }

      this.log('error', `Process error: ${agentError.message}`, {
        errorCode: agentError.code,
        details: agentError.details,
        originalStack: agentError.originalError ? agentError.originalError.stack : null
      });

      return {
        success: false,
        error: agentError // Return the full AgentError object
      };
    }
  }

  // --- MEMORY MANAGEMENT METHODS ---

  /**
   * Store data in the memory system with standardized metadata
   * @param {string|Object} content - Content to store
   * @param {Object} [metadata={}] - Additional metadata
   * @param {string} [metadata.userId] - User ID associated with this memory
   * @param {string} [metadata.memoryType='agent_output'] - Type of memory (agent_output, user_feedback, system_event)
   * @param {string} [metadata.contentType] - Type of content being stored
   * @param {string} [metadata.planId] - Associated plan ID if applicable
   * @param {string} [metadata.workoutPlanId] - Explicit workout plan ID for foreign key relationship
   * @param {string} [metadata.workoutLogId] - Explicit workout log ID for foreign key relationship
   * @param {string|Array<string>} [metadata.tags] - Tags for categorizing the memory
   * @param {number} [metadata.importance=1] - Importance score (1-5) for retrieval prioritization
   * @returns {Promise<Object|null>} - Stored memory or null if memory system not available
   */
  async storeMemory(content, metadata = {}) {
    if (!this.memorySystem) {
      this.log('debug', 'Memory system not available, skipping memory storage');
      return null;
    }

    try {
      const agentType = this.name.replace('Agent', '').toLowerCase();
      
      // Standardize tags if provided as string
      const tags = metadata.tags 
        ? (Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags]) 
        : [];
      
      // Extract and normalize plan/log IDs for explicit foreign key relationships
      const workoutPlanId = metadata.workoutPlanId || metadata.planId || null;
      const workoutLogId = metadata.workoutLogId || metadata.logId || null;
      
      // Create standardized metadata structure
      const standardizedMetadata = {
        agent_type: agentType,
        userId: metadata.userId || null,
        user_id: metadata.userId || null,
        memory_type: metadata.memoryType || 'agent_output',
        content_type: metadata.contentType || (typeof content === 'object' ? 'json' : 'text'),
        plan_id: metadata.planId || null,
        tags: tags,
        importance: metadata.importance || 1,
        // Include explicit workout IDs for foreign key relationships
        workout_plan_id: workoutPlanId,
        workout_log_id: workoutLogId,
        timestamp: new Date().toISOString(),
        // Preserve original metadata fields
        ...metadata
      };
      
      // Log with structured format
      this.log('debug', `Storing memory with metadata`, { 
        agent_type: agentType,
        memory_type: standardizedMetadata.memory_type,
        content_type: standardizedMetadata.content_type,
        user_id: standardizedMetadata.user_id ? `${standardizedMetadata.user_id.substring(0, 8)}...` : null,
        content_size: typeof content === 'string' ? content.length : JSON.stringify(content).length,
        workout_plan_id: workoutPlanId ? `${workoutPlanId.substring(0, 8)}...` : null,
        workout_log_id: workoutLogId ? `${workoutLogId.substring(0, 8)}...` : null
      });
      
      return await this.memorySystem.storeMemory(content, standardizedMetadata);
    } catch (error) {
      this.log('warn', `Failed to store memory: ${error.message}`, { error });
      return null;
    }
  }

  /**
   * Store user feedback on agent outputs
   * @param {string} memoryId - ID of the original memory being given feedback on
   * @param {Object} feedback - User feedback content
   * @param {string} feedback.rating - User rating (e.g., 'helpful', 'not_helpful')
   * @param {string} [feedback.comment] - Optional user comment
   * @param {string} [userId] - User ID providing the feedback
   * @returns {Promise<Object|null>} - Stored feedback memory or null if memory system not available
   */
  async storeUserFeedback(memoryId, feedback, userId = null) {
    if (!this.memorySystem) {
      this.log('debug', 'Memory system not available, skipping feedback storage');
      return null;
    }

    try {
      this.log('info', `Storing user feedback for memory ${memoryId}`, { 
        memory_id: memoryId,
        feedback_type: feedback.rating
      });
      
      return await this.memorySystem.storeUserFeedback(userId, memoryId, feedback);
    } catch (error) {
      this.log('warn', `Failed to store user feedback: ${error.message}`, { error });
      return null;
    }
  }

  /**
   * Store a log of completed plan execution
   * @param {string} userId - User ID associated with this execution log
   * @param {string} planId - ID of the plan that was executed
   * @param {Object} executionData - Details about the execution
   * @param {string} executionData.status - Execution status (completed, partial, failed)
   * @param {Object} [executionData.results] - Results of the execution
   * @param {Object} [executionData.metrics] - Metrics from the execution
   * @returns {Promise<Object|null>} - Stored execution log or null if memory system not available
   */
  async storeExecutionLog(userId, planId, executionData) {
    if (!this.memorySystem) {
      this.log('debug', 'Memory system not available, skipping execution log storage');
      return null;
    }

    try {
      const agentType = this.name.replace('Agent', '').toLowerCase();
      
      this.log('info', `Storing execution log for user ${userId}, plan ${planId}`, { 
        status: executionData.status,
        agent_type: agentType
      });
      
      return await this.storeMemory(executionData, {
        userId,
        planId,
        memoryType: 'execution_log',
        contentType: 'execution_data',
        importance: 3, // Medium-high importance for learning from past executions
        tags: ['execution', executionData.status]
      });
    } catch (error) {
      this.log('warn', `Failed to store execution log: ${error.message}`, { error });
      return null;
    }
  }

  /**
   * Retrieve memories from the memory system with optional filtering
   * @param {Object} options - Retrieval options
   * @param {string} [options.userId] - User ID to retrieve memories for
   * @param {string|Array<string>} [options.agentTypes] - Filter by specific agent types
   * @param {string|Object} [options.query] - Semantic search query (text or structured object)
   * @param {number} [options.limit=5] - Maximum number of memories to retrieve
   * @param {number} [options.threshold=0.7] - Similarity threshold for semantic search
   * @param {Object} [options.metadata={}] - Additional metadata filters
   * @param {boolean} [options.includeFeedback=false] - Whether to include user feedback in results
   * @param {string} [options.sortBy='recency'] - Sort by 'recency', 'relevance', or 'importance'
   * @param {string} [options.planId] - Filter by associated workout plan ID
   * @param {string} [options.logId] - Filter by associated workout log ID
   * @returns {Promise<Array>} - Array of relevant memories
   */
  async retrieveMemories(options = {}) {
    if (!this.memorySystem) {
      this.log('debug', 'Memory system not available, skipping memory retrieval');
      return [];
    }

    try {
      const agentType = this.name.replace('Agent', '').toLowerCase();
      const {
        userId,
        agentTypes = [agentType],
        query = null,
        limit = 5,
        threshold = 0.7,
        metadata = {},
        includeFeedback = false,
        sortBy = 'recency',
        planId = null,
        logId = null
      } = options;
      
      this.log('info', `Retrieving memories`, { 
        userId: userId ? `${userId.substring(0, 8)}...` : null,
        agentTypes: Array.isArray(agentTypes) ? agentTypes : [agentTypes],
        limit,
        hasQuery: !!query,
        sortBy,
        hasPlanFilter: !!planId,
        hasLogFilter: !!logId
      });
      
      let memories = [];
      
      // If we have a plan ID and no specific query, use direct plan retrieval
      if (planId && !query) {
        memories = await this.memorySystem.getMemoriesByWorkoutPlan(userId, planId, {
          limit,
          agentType: Array.isArray(agentTypes) && agentTypes.length === 1 ? agentTypes[0] : null,
          sortBy: sortBy === 'recency' ? 'created_at' : (sortBy === 'version' ? 'version' : 'importance'),
          sortDirection: 'desc'
        });
      }
      // If query is provided, perform semantic search
      else if (query) {
        const searchOptions = {
          filter: {
            agent_type: Array.isArray(agentTypes) ? agentTypes : [agentTypes],
            ...metadata
          },
          limit,
          threshold
        };
        
        memories = await this.memorySystem.searchSimilarMemories(userId, query, searchOptions);
      } 
      // Otherwise, retrieve by agent type and metadata
      else {
        const queryOptions = { 
          limit,
          sortBy: sortBy === 'recency' ? 'created_at' : (sortBy === 'version' ? 'version' : 'importance'),
          sortDirection: 'desc'
        };
        
        memories = await this.memorySystem.getMemoriesByMetadata(userId, {
          agent_type: Array.isArray(agentTypes) ? agentTypes : [agentTypes],
          ...metadata
        }, queryOptions);
      }
      
      // Include feedback if requested
      if (includeFeedback && memories.length > 0) {
        const memoryIds = memories.map(m => m.id);
        const feedback = await this._retrieveFeedbackForMemories(userId, memoryIds);
        
        // Attach feedback to memories
        memories = memories.map(memory => ({
          ...memory,
          feedback: feedback.filter(f => f.metadata?.relatedMemoryId === memory.id)
        }));
      }
      
      this.log('info', `Retrieved ${memories.length} memories`);
      return memories;
    } catch (error) {
      this.log('warn', `Failed to retrieve memories: ${error.message}`, { error });
      return [];
    }
  }

  /**
   * Helper method to retrieve feedback for a set of memories
   * @private
   * @param {string} userId - User ID
   * @param {Array<string>} memoryIds - Array of memory IDs to retrieve feedback for
   * @returns {Promise<Array>} - Array of feedback memories
   */
  async _retrieveFeedbackForMemories(userId, memoryIds) {
    try {
      return await this.memorySystem.getMemoriesByMetadata(userId, {
        memory_type: 'user_feedback',
        relatedMemoryId: { $in: memoryIds }
      });
    } catch (error) {
      this.log('warn', `Failed to retrieve feedback: ${error.message}`, { error });
      return [];
    }
  }
  
  /**
   * Retrieve the most recent memory of a specific type for a user
   * @param {string} userId - User ID
   * @param {string} [memoryType='agent_output'] - Type of memory to retrieve
   * @param {Object} [metadata={}] - Additional metadata filters
   * @returns {Promise<Object|null>} - Most recent memory or null if not found
   */
  async retrieveLatestMemory(userId, memoryType = 'agent_output', metadata = {}) {
    if (!this.memorySystem) {
      this.log('debug', 'Memory system not available, skipping latest memory retrieval');
      return null;
    }

    try {
      const agentType = this.name.replace('Agent', '').toLowerCase();
      
      this.log('info', `Retrieving latest memory for user ${userId}`, { 
        memory_type: memoryType,
        agent_type: agentType
      });
      
      const memories = await this.memorySystem.getMemoriesByMetadata(userId, {
        memory_type: memoryType,
        agent_type: agentType,
        ...metadata
      }, { 
        limit: 1,
        sortBy: 'created_at',
        sortDirection: 'desc'
      });
      
      return memories.length > 0 ? memories[0] : null;
    } catch (error) {
      this.log('warn', `Failed to retrieve latest memory: ${error.message}`, { error });
      return null;
    }
  }

  /**
   * Log a message with standard format
   * @param {string} level - Log level ('debug', 'info', 'warn', 'error')
   * @param {string} message - Log message
   * @param {Object} [data] - Optional data to log
   */
  log(level, message, data) {
    if (!this.logger) return;
    
    const formattedMessage = `[${this.name}] ${message}`;
    
    if (data !== undefined) {
      this.logger[level](formattedMessage, data);
    } else {
      this.logger[level](formattedMessage);
    }
  }

  /**
   * Validate input against requirements
   * @param {Object} input - Input to validate
   * @param {Function} validator - Validation function
   * @param {string} [errorMessage="Validation failed"] - Error message
   * @throws {ValidationError} If validation fails
   */
  validate(input, validator, errorMessage = "Validation failed") {
    if (!validator(input)) {
      throw new ValidationError(errorMessage);
    }
  }

  /**
   * Retry an operation with exponential backoff
   * @param {Function} operation - Operation to retry
   * @param {Object} [options={}] - Retry options
   * @param {number} [options.maxRetries=3] - Maximum number of retries
   * @param {number} [options.initialDelay=1000] - Initial delay in milliseconds
   * @param {number} [options.backoffFactor=1.5] - Backoff factor
   * @returns {Promise<*>} - Operation result
   */
  async retryWithBackoff(operation, options = {}) {
    const maxRetries = options.maxRetries || this.config.maxRetries || 3;
    const initialDelay = options.initialDelay || this.config.initialDelay || 1000;
    const backoffFactor = options.backoffFactor || this.config.backoffFactor || 1.5;
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.log('debug', `Attempt ${attempt}/${maxRetries}`);
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = initialDelay * Math.pow(backoffFactor, attempt - 1);
          this.log('warn', `Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    this.log('error', `All ${maxRetries} attempts failed. Last error: ${lastError.message}`);
    throw lastError;
  }
}

module.exports = BaseAgent; 