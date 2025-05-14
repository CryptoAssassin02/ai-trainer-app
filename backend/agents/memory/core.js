const validators = require('./validators');
const storage = require('./storage');
const retrieval = require('./retrieval');
const consolidation = require('./consolidation');
const embeddingUtils = require('./embedding');
const utils = require('./utils');

/**
 * @class AgentMemorySystem
 * @description Core system for storing and retrieving memory data for AI agents.
 * Orchestrates operations across specialized modules.
 */
class AgentMemorySystem {
  /**
   * Creates a new AgentMemorySystem instance
   * @param {Object} dependencies - Dependency object
   * @param {Object} dependencies.supabase - Supabase client instance
   * @param {Object} dependencies.openai - OpenAI client instance
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.config - Optional configuration options
   * @throws {Error} If required dependencies are missing
   */
  constructor({ supabase, openai, logger, config = {} }) {
    // Validate essential dependencies
    if (!supabase) {
      if (logger && typeof logger.error === 'function') {
        logger.error("AgentMemorySystem Initialization Error: Supabase client instance is required.");
      }
      throw new Error("AgentMemorySystem requires a Supabase client instance.");
    }
    
    if (!openai) {
      if (logger && typeof logger.error === 'function') {
        logger.error("AgentMemorySystem Initialization Error: OpenAI client instance is required.");
      }
      throw new Error("AgentMemorySystem requires an OpenAI client instance.");
    }
    
    if (!logger || typeof logger.info !== 'function' || typeof logger.error !== 'function') {
      throw new Error("AgentMemorySystem requires a valid Logger instance with info and error methods.");
    }

    // Store dependencies
    this.supabase = supabase;
    this.openai = openai;
    this.logger = logger;
    this.validators = validators; // Use imported validators
    
    // Configure settings with defaults
    this.config = {
      tableName: 'agent_memory',
      embeddingModel: 'text-embedding-ada-002',
      maxResults: 10,
      similarityThreshold: 0.7,
      ...config
    };

    // Expose utility functions if needed, or keep them internal
    this.utils = utils;
    this.embeddingUtils = embeddingUtils;
    
    this.logger.info("AgentMemorySystem initialized successfully.");
  }
  
  // --- Storage Methods --- //
  
  /** Delegates to storage.storeMemory */
  async storeMemory(userId, agentType, content, metadata = {}) {
    return storage.storeMemory(
      this.supabase, this.openai, this.config, this.logger, this.validators,
      userId, agentType, content, metadata
    );
  }
  
  /** Delegates to storage.storeAgentResult */
  async storeAgentResult(userId, agentType, result) {
    return storage.storeAgentResult(
      this.supabase, this.openai, this.config, this.logger, this.validators,
      userId, agentType, result
    );
  }
  
  /** Delegates to storage.storeUserFeedback */
  async storeUserFeedback(userId, memoryId, feedback) {
    return storage.storeUserFeedback(
      this.supabase, this.config, this.logger, this.validators,
      userId, memoryId, feedback
    );
  }
  
  /** Delegates to storage.storeSystemEvent */
  async storeSystemEvent(userId, eventType, eventData) {
    return storage.storeSystemEvent(
      this.supabase, this.config, this.logger, this.validators,
      userId, eventType, eventData
    );
  }
  
  // --- Retrieval Methods --- //
  
  /** Delegates to retrieval.retrieveMemory */
  async retrieveMemory(memoryId, userId) {
    return retrieval.retrieveMemory(
      this.supabase, this.config, this.logger, this.validators,
      memoryId, userId
    );
  }
  
  /** Delegates to retrieval.getLatestMemory */
  async getLatestMemory(userId, agentType) {
    return retrieval.getLatestMemory(
      this.supabase, this.config, this.logger, this.validators,
      userId, agentType
    );
  }
  
  /** Delegates to retrieval.searchSimilarMemories */
  async searchSimilarMemories(userId, query, options = {}) {
    return retrieval.searchSimilarMemories(
      this.supabase, this.openai, this.config, this.logger, this.validators,
      userId, query, options
    );
  }
  
  /** Delegates to retrieval.getMemoriesByAgentType */
  async getMemoriesByAgentType(userId, agentType, options = {}) {
    return retrieval.getMemoriesByAgentType(
      this.supabase, this.config, this.logger, this.validators,
      userId, agentType, options
    );
  }
  
  /** Delegates to retrieval.getMemoriesByMetadata */
  async getMemoriesByMetadata(userId, metadataFilter = {}, options = {}) {
    return retrieval.getMemoriesByMetadata(
      this.supabase, this.config, this.logger, this.validators,
      userId, metadataFilter, options
    );
  }
  
  // --- Consolidation & Pruning Methods --- //
  
  /** Delegates to consolidation.consolidateMemories */
  async consolidateMemories(userId, options = {}) {
    return consolidation.consolidateMemories(
      { supabase: this.supabase, openai: this.openai, config: this.config, logger: this.logger, validators: this.validators },
      userId, options
    );
  }
  
  /** Delegates to consolidation.pruneOldMemories */
  async pruneOldMemories(userId, days = 180) {
    return consolidation.pruneOldMemories(
      { supabase: this.supabase, config: this.config, logger: this.logger, validators: this.validators },
      userId, days
    );
  }
  
  // --- Utility & Initialization --- //
  
  /** Delegates to utils.initVectorStore */
  async initVectorStore() {
    return this.utils.initVectorStore(this.supabase, this.config, this.logger);
  }
  
  /** Delegates to embeddingUtils.createEmbedding */
  async createEmbedding(content) {
    const contentString = typeof content === 'object' 
        ? JSON.stringify(content) 
        : content;
    return this.embeddingUtils.createEmbedding(
      this.openai, contentString, this.config.embeddingModel, this.logger
    );
  }
}

module.exports = AgentMemorySystem; 