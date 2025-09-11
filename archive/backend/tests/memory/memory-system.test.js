const AgentMemorySystem = require('../../agents/memory/core');
const { validate: uuidValidate } = require('uuid');

// Mock dependencies
jest.mock('uuid', () => ({
  validate: jest.fn().mockReturnValue(true) // Default to valid UUID
}));

// Mock the storage and retrieval modules
jest.mock('../../agents/memory/storage', () => ({
  storeMemory: jest.fn().mockResolvedValue({ id: 'memory-123' }),
  storeAgentResult: jest.fn().mockResolvedValue({ id: 'result-123' }),
  storeUserFeedback: jest.fn().mockResolvedValue({ id: 'feedback-123' }),
  storeSystemEvent: jest.fn().mockResolvedValue({ id: 'event-123' })
}));

jest.mock('../../agents/memory/retrieval', () => ({
  retrieveMemory: jest.fn().mockResolvedValue({ id: 'memory-123', content: 'test content' }),
  getLatestMemory: jest.fn().mockResolvedValue({ id: 'memory-123', content: 'latest content' }),
  searchSimilarMemories: jest.fn().mockResolvedValue([{ id: 'memory-123', content: 'similar content' }]),
  getMemoriesByAgentType: jest.fn().mockResolvedValue([{ id: 'memory-123', content: 'agent specific content' }]),
  getMemoriesByMetadata: jest.fn().mockResolvedValue([{ id: 'memory-123', content: 'metadata specific content' }]),
  getMemoriesByWorkoutPlan: jest.fn().mockResolvedValue([{ id: 'memory-123', content: 'plan specific content' }])
}));

jest.mock('../../agents/memory/consolidation', () => ({
  consolidateMemories: jest.fn().mockResolvedValue({ 
    consolidated: 1,
    archived: 2
  }),
  pruneOldMemories: jest.fn().mockResolvedValue({
    pruned: 3
  })
}));

jest.mock('../../agents/memory/embedding', () => ({
  createEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]) // Return a simple vector
}));

jest.mock('../../agents/memory/utils', () => ({
  initVectorStore: jest.fn().mockResolvedValue(true)
}));

describe('AgentMemorySystem', () => {
  let memorySystem;
  let mockSupabase;
  let mockOpenAI;
  let mockLogger;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock dependencies
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis()
    };
    
    mockOpenAI = {
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [{ embedding: [0.1, 0.2, 0.3] }]
        })
      }
    };
    
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    // Initialize AgentMemorySystem with mocks
    memorySystem = new AgentMemorySystem({
      supabase: mockSupabase,
      openai: mockOpenAI,
      logger: mockLogger,
      config: {
        tableName: 'test_agent_memory'
      }
    });
  });
  
  describe('Constructor', () => {
    test('should initialize with provided dependencies', () => {
      expect(memorySystem.supabase).toBe(mockSupabase);
      expect(memorySystem.openai).toBe(mockOpenAI);
      expect(memorySystem.logger).toBe(mockLogger);
      expect(memorySystem.config.tableName).toBe('test_agent_memory');
    });
    
    test('should throw error if Supabase client is not provided', () => {
      const constructorFn = () => {
        new AgentMemorySystem({
          openai: mockOpenAI,
          logger: mockLogger
        });
      };
      
      expect(constructorFn).toThrow('Supabase client instance');
    });
    
    test('should throw error if OpenAI client is not provided', () => {
      const constructorFn = () => {
        new AgentMemorySystem({
          supabase: mockSupabase,
          logger: mockLogger
        });
      };
      
      expect(constructorFn).toThrow('OpenAI client instance');
    });
    
    test('should throw error if logger is not provided', () => {
      const constructorFn = () => {
        new AgentMemorySystem({
          supabase: mockSupabase,
          openai: mockOpenAI
        });
      };
      
      expect(constructorFn).toThrow('Logger instance');
    });
    
    test('should use default config values if not provided', () => {
      const memSys = new AgentMemorySystem({
        supabase: mockSupabase,
        openai: mockOpenAI,
        logger: mockLogger
      });
      
      expect(memSys.config.tableName).toBe('agent_memory'); // Default value
      expect(memSys.config.embeddingModel).toBe('text-embedding-ada-002'); // Default value
    });
  });
  
  describe('Storage Operations', () => {
    test('storeMemory should store memory with correct parameters', async () => {
      const storage = require('../../agents/memory/storage');
      
      const userId = 'user-123';
      const agentType = 'workout';
      const content = { exercise: 'squat', sets: 3 };
      const metadata = { important: true };
      
      await memorySystem.storeMemory(userId, agentType, content, metadata);
      
      expect(storage.storeMemory).toHaveBeenCalledWith(
        mockSupabase,
        mockOpenAI,
        memorySystem.config,
        mockLogger,
        memorySystem.validators,
        userId,
        agentType,
        content,
        metadata
      );
    });
    
    test('storeAgentResult should store agent result with correct parameters', async () => {
      const storage = require('../../agents/memory/storage');
      
      const userId = 'user-123';
      const agentType = 'nutrition';
      const result = { calories: 2000, protein: 150 };
      
      await memorySystem.storeAgentResult(userId, agentType, result);
      
      expect(storage.storeAgentResult).toHaveBeenCalledWith(
        mockSupabase,
        mockOpenAI,
        memorySystem.config,
        mockLogger,
        memorySystem.validators,
        userId,
        agentType,
        result
      );
    });
    
    test('storeUserFeedback should store feedback with correct parameters', async () => {
      const storage = require('../../agents/memory/storage');
      
      const userId = 'user-123';
      const memoryId = 'memory-123';
      const feedback = { rating: 'positive', comment: 'Great workout!' };
      
      await memorySystem.storeUserFeedback(userId, memoryId, feedback);
      
      expect(storage.storeUserFeedback).toHaveBeenCalledWith(
        mockSupabase,
        memorySystem.config,
        mockLogger,
        memorySystem.validators,
        userId,
        memoryId,
        feedback
      );
    });
    
    test('storeSystemEvent should store system event with correct parameters', async () => {
      const storage = require('../../agents/memory/storage');
      
      const userId = 'user-123';
      const eventType = 'workout_completed';
      const eventData = { duration: 45, exercises: 10 };
      
      await memorySystem.storeSystemEvent(userId, eventType, eventData);
      
      expect(storage.storeSystemEvent).toHaveBeenCalledWith(
        mockSupabase,
        memorySystem.config,
        mockLogger,
        memorySystem.validators,
        userId,
        eventType,
        eventData
      );
    });
  });
  
  describe('Retrieval Operations', () => {
    test('retrieveMemory should retrieve memory with correct parameters', async () => {
      const retrieval = require('../../agents/memory/retrieval');
      
      const memoryId = 'memory-123';
      const userId = 'user-123';
      
      await memorySystem.retrieveMemory(memoryId, userId);
      
      expect(retrieval.retrieveMemory).toHaveBeenCalledWith(
        mockSupabase,
        memorySystem.config,
        mockLogger,
        memorySystem.validators,
        memoryId,
        userId
      );
    });
    
    test('getLatestMemory should get latest memory with correct parameters', async () => {
      const retrieval = require('../../agents/memory/retrieval');
      
      const userId = 'user-123';
      const agentType = 'workout';
      
      await memorySystem.getLatestMemory(userId, agentType);
      
      expect(retrieval.getLatestMemory).toHaveBeenCalledWith(
        mockSupabase,
        memorySystem.config,
        mockLogger,
        memorySystem.validators,
        userId,
        agentType
      );
    });
    
    test('searchSimilarMemories should search memories with correct parameters', async () => {
      const retrieval = require('../../agents/memory/retrieval');
      
      const userId = 'user-123';
      const query = 'workout plan with squats';
      const options = { threshold: 0.8, limit: 5 };
      
      await memorySystem.searchSimilarMemories(userId, query, options);
      
      expect(retrieval.searchSimilarMemories).toHaveBeenCalledWith(
        mockSupabase,
        mockOpenAI,
        memorySystem.config,
        mockLogger,
        memorySystem.validators,
        userId,
        query,
        options
      );
    });
    
    test('getMemoriesByAgentType should get memories by type with correct parameters', async () => {
      const retrieval = require('../../agents/memory/retrieval');
      
      const userId = 'user-123';
      const agentType = 'nutrition';
      const options = { limit: 10, sortBy: 'created_at' };
      
      await memorySystem.getMemoriesByAgentType(userId, agentType, options);
      
      expect(retrieval.getMemoriesByAgentType).toHaveBeenCalledWith(
        mockSupabase,
        memorySystem.config,
        mockLogger,
        memorySystem.validators,
        userId,
        agentType,
        options
      );
    });
    
    test('getMemoriesByMetadata should get memories by metadata with correct parameters', async () => {
      const retrieval = require('../../agents/memory/retrieval');
      
      const userId = 'user-123';
      const metadataFilter = { type: 'workout_plan' };
      const options = { limit: 15, sortBy: 'created_at' };
      
      await memorySystem.getMemoriesByMetadata(userId, metadataFilter, options);
      
      expect(retrieval.getMemoriesByMetadata).toHaveBeenCalledWith(
        mockSupabase,
        memorySystem.config,
        mockLogger,
        memorySystem.validators,
        userId,
        metadataFilter,
        options
      );
    });
  });
  
  describe('Consolidation & Pruning Operations', () => {
    test('consolidateMemories should consolidate memories with correct parameters', async () => {
      const consolidation = require('../../agents/memory/consolidation');
      
      const userId = 'user-123';
      const options = { agentType: 'workout', maxBatchSize: 10 };
      
      await memorySystem.consolidateMemories(userId, options);
      
      expect(consolidation.consolidateMemories).toHaveBeenCalledWith(
        expect.objectContaining({
          supabase: mockSupabase,
          openai: mockOpenAI,
          config: memorySystem.config,
          logger: mockLogger,
          validators: memorySystem.validators
        }),
        userId,
        options
      );
    });
    
    test('pruneOldMemories should prune old memories with correct parameters', async () => {
      const consolidation = require('../../agents/memory/consolidation');
      
      const userId = 'user-123';
      const days = 90; // 90 days
      
      await memorySystem.pruneOldMemories(userId, days);
      
      expect(consolidation.pruneOldMemories).toHaveBeenCalledWith(
        expect.objectContaining({
          supabase: mockSupabase,
          config: memorySystem.config,
          logger: mockLogger,
          validators: memorySystem.validators
        }),
        userId,
        days
      );
    });
  });
  
  describe('Utility & Initialization Operations', () => {
    test('initVectorStore should initialize vector store with correct parameters', async () => {
      const utils = require('../../agents/memory/utils');
      
      await memorySystem.initVectorStore();
      
      expect(utils.initVectorStore).toHaveBeenCalledWith(
        mockSupabase,
        memorySystem.config,
        mockLogger
      );
    });
    
    test('createEmbedding should create embedding with correct parameters', async () => {
      const embeddingUtils = require('../../agents/memory/embedding');
      
      const content = { data: 'test content' };
      
      await memorySystem.createEmbedding(content);
      
      expect(embeddingUtils.createEmbedding).toHaveBeenCalledWith(
        mockOpenAI,
        JSON.stringify(content),
        memorySystem.config.embeddingModel,
        mockLogger
      );
    });
    
    test('createEmbedding should handle string content correctly', async () => {
      const embeddingUtils = require('../../agents/memory/embedding');
      
      const content = 'test content as string';
      
      await memorySystem.createEmbedding(content);
      
      expect(embeddingUtils.createEmbedding).toHaveBeenCalledWith(
        mockOpenAI,
        content, // Should not stringify string content
        memorySystem.config.embeddingModel,
        mockLogger
      );
    });
  });
}); 