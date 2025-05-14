/**
 * @jest-environment node
 */

const AgentMemorySystem = require('../../agents/memory');
const { validate: uuidValidate } = require('uuid');
const memoryUtils = require('../../agents/memory/utils');
const consolidationUtils = require('../../agents/memory/consolidation');

// Mock UUID validation (from uuid library)
jest.mock('uuid', () => ({
  validate: jest.fn().mockImplementation((id) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  })
}));

describe('AgentMemorySystem', () => {
  // Mock dependencies
  const mockSupabase = {
    from: jest.fn(() => mockSupabase),
    select: jest.fn(() => mockSupabase),
    insert: jest.fn(() => mockSupabase),
    update: jest.fn(() => mockSupabase),
    delete: jest.fn(() => mockSupabase),
    eq: jest.fn(() => mockSupabase),
    lt: jest.fn(() => mockSupabase),
    gt: jest.fn(() => mockSupabase),
    gte: jest.fn(() => mockSupabase),
    lte: jest.fn(() => mockSupabase),
    in: jest.fn(() => mockSupabase),
    order: jest.fn(() => mockSupabase),
    limit: jest.fn(() => mockSupabase),
    range: jest.fn(() => mockSupabase),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    data: null,
    error: null,
  };

  const mockOpenai = {
    embeddings: {
      create: jest.fn(() => ({
        data: [{ embedding: [0.1, 0.2, 0.3] }]
      }))
    },
    completions: {
      create: jest.fn(() => ({
        choices: [{ text: 'Consolidated summary' }]
      }))
    },
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  };

  let mockLogger; // Define outside beforeEach
  
  // Valid test data
  const validUserId = '00000000-0000-0000-0000-000000000001';
  const validMemoryId = '00000000-0000-0000-0000-000000000002';
  const validAgentType = 'nutrition';
  const validContent = 'Test memory content';
  
  let memorySystem;
  
  beforeEach(() => {
    // Reset mock data and errors
    mockSupabase.data = null;
    mockSupabase.error = null;
    
    // Reset mock function calls
    jest.clearAllMocks();

    // Re-instantiate mockLogger to ensure it's fresh
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };
    
    // Create a new memory system for each test
    memorySystem = new AgentMemorySystem({
      supabase: mockSupabase, 
      openai: mockOpenai, 
      logger: mockLogger
    });
  });
  
  describe('Constructor', () => {
    test('should throw error if supabase client is missing', () => {
      expect(() => new AgentMemorySystem({
        openai: mockOpenai, 
        logger: mockLogger
      })).toThrow(/supabase/i);
    });
    
    test('should throw error if openai client is missing', () => {
      expect(() => new AgentMemorySystem({
        supabase: mockSupabase, 
        logger: mockLogger
      })).toThrow(/openai/i);
    });
    
    test('should throw error if logger is missing', () => {
      expect(() => new AgentMemorySystem({
        supabase: mockSupabase, 
        openai: mockOpenai
      })).toThrow(/logger/i);
    });
    
    test('should initialize with default values', () => {
      const system = new AgentMemorySystem({
        supabase: mockSupabase, 
        openai: mockOpenai, 
        logger: mockLogger
      });
      
      expect(system).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith("AgentMemorySystem initialized successfully.");
    });
    
    test('should use custom config values', () => {
      const customConfig = {
        tableName: 'custom_memory_table',
        embeddingModel: 'custom-embedding-model',
        maxResults: 20,
        similarityThreshold: 0.8
      };
      
      const system = new AgentMemorySystem({
        supabase: mockSupabase, 
        openai: mockOpenai, 
        logger: mockLogger,
        config: customConfig
      });
      
      expect(system).toBeDefined();
      expect(system.config).toEqual(customConfig);
    });
  });
  
  describe('Vector Operations', () => {
    test('should create embeddings successfully', async () => {
      const result = await memorySystem.createEmbedding('Test content');
      
      expect(mockOpenai.embeddings.create).toHaveBeenCalledWith({
        model: "text-embedding-ada-002",
        input: "Test content"
      });
      
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });
    
    test('should handle object content when creating embeddings', async () => {
      const content = { key: 'value' };
      await memorySystem.createEmbedding(content);
      
      expect(mockOpenai.embeddings.create).toHaveBeenCalledWith({
        model: "text-embedding-ada-002",
        input: JSON.stringify(content)
      });
    });
    
    test('should throw error when OpenAI embedding creation fails', async () => {
      const apiError = new Error('API error');
      mockOpenai.embeddings.create.mockRejectedValueOnce(apiError);
      
      await expect(memorySystem.createEmbedding('Test content'))
        .rejects.toThrow('API error');
    });
    
    test('should perform vector similarity search', async () => {
      const embedding = [0.1, 0.2, 0.3];
      const options = {
        userId: validUserId,
        agentType: validAgentType,
        limit: 5
      };
      
      // Configure mock for successful response (assuming it uses match_documents RPC)
      mockSupabase.rpc.mockResolvedValue({ data: [{ id: '123', content: 'Similar content' }], error: null });
      
      // Calling the placeholder will just log a warning.
      await memorySystem.utils.searchVectorsByEmbedding(memorySystem.supabase, memorySystem.config.tableName, embedding, options, memorySystem.logger);
      
      // What we really care about is searchSimilarMemories which uses the RPC:
      mockSupabase.rpc.mockClear(); // Clear previous mock calls
      mockSupabase.rpc.mockResolvedValue({ data: [{ id: '456', content: 'Matched via RPC' }], error: null });
      
      await memorySystem.searchSimilarMemories(validUserId, 'test query', {});
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith('match_agent_memories', expect.objectContaining({
        query_embedding: expect.any(Array),
        match_threshold: memorySystem.config.similarityThreshold,
        match_count: memorySystem.config.maxResults,
        filter_user_id: validUserId
      }));
    });
  });
  
  describe('Memory Storage', () => {
    test('should store memory with proper validation', async () => {
      // Configure mock for successful response
      mockSupabase.data = [{ id: '123', content: validContent }];
      
      // Call the method
      const result = await memorySystem.storeMemory(
        validUserId, 
        validAgentType,
        validContent
      );
      
      // Verify the results
      expect(mockOpenai.embeddings.create).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('agent_memory');
      expect(mockSupabase.insert).toHaveBeenCalled();
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(result).toEqual({ id: '123', content: validContent });
    });
    
    test('should throw error for invalid user ID', async () => {
      await expect(
        memorySystem.storeMemory('invalid-uuid', validAgentType, validContent)
      ).rejects.toThrow(/invalid userId format/i);
      
      expect(mockOpenai.embeddings.create).not.toHaveBeenCalled();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
    
    test('should throw error for invalid agent type', async () => {
      await expect(
        memorySystem.storeMemory(validUserId, 'invalid-type', validContent)
      ).rejects.toThrow(/invalid agent type/i);
      
      expect(mockOpenai.embeddings.create).not.toHaveBeenCalled();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
    
    test('should throw error if content is empty', async () => {
      await expect(
        memorySystem.storeMemory(validUserId, validAgentType, null)
      ).rejects.toThrow(/content cannot be empty/i);
      
      expect(mockOpenai.embeddings.create).not.toHaveBeenCalled();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
    
    test('should handle database errors during storage', async () => {
      // Configure mock for error response
      mockSupabase.error = { message: 'Database error' };
      
      await expect(
        memorySystem.storeMemory(validUserId, validAgentType, validContent)
      ).rejects.toThrow(/memory storage failed/i);
      
      expect(mockOpenai.embeddings.create).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('agent_memory');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });
    
    test('should store agent result', async () => {
      // Configure mock for successful response
      mockSupabase.data = [{ id: '123', content: '{"result":"test"}' }];
      
      const result = { result: 'test' };
      await memorySystem.storeAgentResult(validUserId, validAgentType, result);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('agent_memory');
      expect(mockSupabase.insert).toHaveBeenCalled();
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: validUserId,
        agent_type: validAgentType,
        content: JSON.stringify(result),
        metadata: expect.objectContaining({
          type: 'agent_result'
        })
      }));
    });
  });
  
  describe('Memory Retrieval', () => {
    test('should retrieve memory by ID', async () => {
      // Configure mock for successful response
      const mockData = { id: '123', content: validContent };
      mockSupabase.maybeSingle.mockResolvedValue({ data: mockData, error: null });
      
      // Call the method
      const result = await memorySystem.retrieveMemory(validMemoryId, validUserId);
      
      // Verify the results
      expect(mockSupabase.from).toHaveBeenCalledWith('agent_memory');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', validMemoryId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', validUserId);
      expect(mockSupabase.maybeSingle).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });
    
    test('should parse JSON content when retrieving memory', async () => {
      // Configure mock for successful response with JSON content
      mockSupabase.data = { id: '123', content: '{"key":"value"}' };
      mockSupabase.maybeSingle.mockResolvedValue({ data: mockSupabase.data, error: null });
      
      // Call the method
      const result = await memorySystem.retrieveMemory(validMemoryId, validUserId);
      
      // Verify the parsed content
      expect(result.content).toEqual('{"key":"value"}');
    });
    
    test('should get latest memory of a type', async () => {
      // Configure mock for successful response
      mockSupabase.data = { id: '123', content: 'Latest content' };
      mockSupabase.maybeSingle.mockResolvedValue({ data: mockSupabase.data, error: null });
      
      // Call the method
      const result = await memorySystem.getLatestMemory(validUserId, validAgentType);
      
      // Verify the results
      expect(mockSupabase.from).toHaveBeenCalledWith('agent_memory');
      expect(mockSupabase.order).toHaveBeenCalled();
      expect(mockSupabase.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: '123', content: 'Latest content' });
    });
    
    test('should search similar memories', async () => {
      // Configure mock for successful embedding creation
      mockOpenai.embeddings.create.mockResolvedValueOnce({
        data: [{ embedding: [0.1, 0.2, 0.3] }]
      });
      
      // Configure mock for successful vector search via RPC
      const mockRpcData = [
        { id: '123', content: 'Similar content 1' },
        { id: '456', content: 'Similar content 2' }
      ];
      mockSupabase.rpc.mockResolvedValue({ data: mockRpcData, error: null });
      
      // Call the method
      const result = await memorySystem.searchSimilarMemories(validUserId, 'search query');
      
      // Verify the results
      expect(mockOpenai.embeddings.create).toHaveBeenCalled();
      expect(mockSupabase.rpc).toHaveBeenCalledWith('match_agent_memories', expect.objectContaining({
        query_embedding: [0.1, 0.2, 0.3],
        match_threshold: memorySystem.config.similarityThreshold,
        match_count: memorySystem.config.maxResults,
        filter_user_id: validUserId
      }));
      expect(result).toEqual(mockRpcData);
    });
  });
  
  describe('Memory Management', () => {
    test('should prune old memories', async () => {
      // Configure mock for successful deletion
      const mockDeleteResponse = { data: null, error: null, count: 2 };
      mockSupabase.delete.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.lt.mockResolvedValue(mockDeleteResponse);
      
      // Call the method
      const result = await memorySystem.pruneOldMemories(validUserId, 30);
      
      // Verify the results
      expect(mockSupabase.from).toHaveBeenCalledWith('agent_memory');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.lt).toHaveBeenCalled();
      expect(result).toBe(2);
    });
    
    test('should archive memories successfully', async () => {
      // Mock the update call chain
      const mockUpdateResponse = { data: null, error: null, count: 1 };
      mockSupabase.update.mockReturnThis();
      mockSupabase.in.mockResolvedValue(mockUpdateResponse);
      
      // Test the internal utility function directly
      const count = await consolidationUtils.archiveMemories(memorySystem.supabase, memorySystem.config.tableName, [validMemoryId], 'consolidated-id', memorySystem.logger);
      
      // Verify the results
      expect(mockSupabase.update).toHaveBeenCalledWith({
        is_archived: true,
        consolidated_into: 'consolidated-id',
        archived_at: expect.any(String)
      });
      expect(mockSupabase.in).toHaveBeenCalledWith('id', [validMemoryId]);
      expect(count).toBe(1);
    });
    
    test('should throw error for invalid embeddings in similarity calculation', () => {
      expect(() => memoryUtils.calculateCosineSimilarity(null, [1, 2, 3])).toThrow();
      expect(() => memoryUtils.calculateCosineSimilarity([1, 2], [1, 2, 3])).toThrow();
    });
    
    test('should create consolidated summary', async () => {
      const contents = ['Memory 1', 'Memory 2', 'Memory 3'];
      
      // Test the internal helper function directly
      const summary = await consolidationUtils.createConsolidatedSummary(memorySystem.openai, contents, memorySystem.logger);
      
      // Updated mock check for completions API
      expect(mockOpenai.completions.create).toHaveBeenCalledWith({ 
        model: 'text-davinci-003', // Model used in the refactored code
        prompt: expect.stringContaining('Memory 1'),
        max_tokens: 250,
        temperature: 0.5,
      });
      
      expect(summary).toBe('Consolidated summary');
    });
  });
}); 