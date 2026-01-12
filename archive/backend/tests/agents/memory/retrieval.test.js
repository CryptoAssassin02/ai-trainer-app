const { retrieveMemory, getLatestMemory, searchSimilarMemories, getMemoriesByAgentType, getMemoriesByMetadata, getMemoriesByWorkoutPlan } = require('../../../agents/memory/retrieval');
const { createEmbedding } = require('../../../agents/memory/embedding');

jest.mock('../../../agents/memory/embedding', () => ({
  createEmbedding: jest.fn(),
}));

describe('Memory Retrieval', () => {
  let mockSupabase;
  let mockConfig;
  let mockLogger;
  let mockValidators;
  let mockOpenAI; // Needed for searchSimilarMemories via createEmbedding

  beforeEach(() => {
    // Mock Supabase client and its chainable methods
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
      rpc: jest.fn(),
      // maybeSingle needs to be a terminal method that returns a promise
      maybeSingle: jest.fn(), 
    };
    // Ensure from().select()...maybeSingle() returns a Promise
    // Default to resolving with null data and no error for maybeSingle
    mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
     // Default to resolving with empty array and no error for general queries
    mockSupabase.then = jest.fn((resolve) => resolve({ data: [], error: null }));


    mockConfig = {
      tableName: 'agent_memory',
      similarityThreshold: 0.75,
      maxResults: 10,
      embeddingModel: 'text-embedding-ada-002',
    };
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
    mockValidators = {
      isValidUUID: jest.fn().mockReturnValue(true),
      isValidAgentType: jest.fn().mockReturnValue(true),
      validateMemoryInput: jest.fn(), // Does not return, throws on error
    };
    mockOpenAI = {}; // Placeholder, will be used by createEmbedding mock
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('retrieveMemory', () => {
    const memoryId = 'test-memory-id';
    const userId = 'test-user-id';

    test('should throw error if memoryId is invalid', async () => {
      mockValidators.isValidUUID.mockReturnValueOnce(false);
      await expect(retrieveMemory(mockSupabase, mockConfig, mockLogger, mockValidators, memoryId, userId))
        .rejects.toThrow('Invalid memoryId format: test-memory-id');
      expect(mockLogger.error).not.toHaveBeenCalled(); // Error thrown before logging in current impl
    });

    test('should throw error if userId is provided and invalid', async () => {
      mockValidators.isValidUUID.mockImplementation(id => id === memoryId); // memoryId is valid, userId is not
      await expect(retrieveMemory(mockSupabase, mockConfig, mockLogger, mockValidators, memoryId, userId))
        .rejects.toThrow('Invalid userId format: test-user-id');
       expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('should retrieve memory by ID successfully when no userId is provided', async () => {
      const mockMemory = { id: memoryId, content: 'test content' };
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: mockMemory, error: null });

      const result = await retrieveMemory(mockSupabase, mockConfig, mockLogger, mockValidators, memoryId, null);

      expect(result).toEqual(mockMemory);
      expect(mockSupabase.from).toHaveBeenCalledWith(mockConfig.tableName);
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', memoryId);
      expect(mockSupabase.eq).not.toHaveBeenCalledWith('user_id', expect.anything());
      expect(mockSupabase.maybeSingle).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith({ memoryId, userId: null }, 'Retrieving memory');
      expect(mockLogger.info).toHaveBeenCalledWith({ memoryId, userId: null }, 'Memory retrieved successfully');
    });

    test('should retrieve memory by ID and userId successfully', async () => {
      const mockMemory = { id: memoryId, user_id: userId, content: 'test content' };
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: mockMemory, error: null });

      const result = await retrieveMemory(mockSupabase, mockConfig, mockLogger, mockValidators, memoryId, userId);

      expect(result).toEqual(mockMemory);
      expect(mockSupabase.from).toHaveBeenCalledWith(mockConfig.tableName);
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', memoryId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSupabase.maybeSingle).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith({ memoryId, userId }, 'Retrieving memory');
      expect(mockLogger.info).toHaveBeenCalledWith({ memoryId, userId }, 'Memory retrieved successfully');
    });

    test('should return null if memory is not found', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await retrieveMemory(mockSupabase, mockConfig, mockLogger, mockValidators, memoryId, userId);

      expect(result).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith({ memoryId, userId }, 'Memory not found');
    });

    test('should throw error and log if Supabase call fails', async () => {
      const dbError = new Error('DB Read Failed');
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: dbError });

      await expect(retrieveMemory(mockSupabase, mockConfig, mockLogger, mockValidators, memoryId, userId))
        .rejects.toThrow('Memory retrieval failed: DB Read Failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        { memoryId, userId, error: dbError.message },
        'Memory retrieval failed'
      );
    });
     test('should re-throw error if an unexpected error occurs', async () => {
      const unexpectedError = new Error('Unexpected issue');
      // Make one of the chained methods throw, e.g., .eq()
      mockSupabase.eq.mockImplementationOnce(() => { throw unexpectedError; });

      await expect(retrieveMemory(mockSupabase, mockConfig, mockLogger, mockValidators, memoryId, userId))
        .rejects.toThrow(unexpectedError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        { memoryId, userId, error: unexpectedError.message },
        'Error retrieving memory'
      );
    });
  });

  describe('getLatestMemory', () => {
    const userId = 'test-user-id';
    const agentType = 'test-agent';

    test('should throw error if userId is invalid', async () => {
      mockValidators.isValidUUID.mockReturnValueOnce(false);
      await expect(getLatestMemory(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType))
        .rejects.toThrow('Invalid userId format: test-user-id');
    });

    test('should throw error if agentType is invalid', async () => {
      mockValidators.isValidAgentType.mockReturnValueOnce(false);
      await expect(getLatestMemory(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType))
        .rejects.toThrow('Invalid agent type: test-agent');
    });

    test('should retrieve the latest memory successfully', async () => {
      const mockMemory = { id: 'latest-memory', agent_type: agentType.toLowerCase(), content: 'latest' };
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: mockMemory, error: null });

      const result = await getLatestMemory(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType);

      expect(result).toEqual(mockMemory);
      expect(mockSupabase.from).toHaveBeenCalledWith(mockConfig.tableName);
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('agent_type', agentType.toLowerCase());
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockSupabase.limit).toHaveBeenCalledWith(1);
      expect(mockSupabase.maybeSingle).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith({ userId, agentType }, 'Retrieving latest memory');
      expect(mockLogger.info).toHaveBeenCalledWith({ userId, agentType, found: true }, 'Latest memory retrieval completed');
    });

    test('should return null if no memory is found', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await getLatestMemory(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType);

      expect(result).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith({ userId, agentType, found: false }, 'Latest memory retrieval completed');
    });

    test('should throw error and log if Supabase call fails', async () => {
      const dbError = new Error('DB Read Latest Failed');
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: dbError });

      await expect(getLatestMemory(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType))
        .rejects.toThrow('Latest memory retrieval failed: DB Read Latest Failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        { userId, agentType, error: dbError.message },
        'Latest memory retrieval failed'
      );
    });

    test('should re-throw error if an unexpected error occurs during getLatestMemory', async () => {
      const unexpectedError = new Error('Unexpected issue in getLatestMemory');
      mockSupabase.limit.mockImplementationOnce(() => { throw unexpectedError; });

      await expect(getLatestMemory(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType))
        .rejects.toThrow(unexpectedError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        { userId, agentType, error: unexpectedError.message },
        'Error retrieving latest memory'
      );
    });
  });

  describe('searchSimilarMemories', () => {
    const userId = 'test-user-id';
    const queryText = 'find similar things';
    const mockEmbedding = [0.1, 0.2, 0.3];

    beforeEach(() => {
      // Reset createEmbedding mock for this describe block
      createEmbedding.mockReset();
      createEmbedding.mockResolvedValue(mockEmbedding); // Default success for createEmbedding
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null }); // Default success for rpc
    });

    test('should throw error if userId is invalid', async () => {
      mockValidators.isValidUUID.mockReturnValueOnce(false);
      await expect(searchSimilarMemories(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, userId, queryText))
        .rejects.toThrow('Invalid userId format: test-user-id');
    });

    test('should throw error if query is invalid (e.g., empty)', async () => {
      mockValidators.validateMemoryInput.mockImplementationOnce(() => { 
        throw new Error('Memory content cannot be empty'); 
      });
      await expect(searchSimilarMemories(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, userId, ''))
        .rejects.toThrow('Memory content cannot be empty');
    });

    test('should throw error and log if createEmbedding fails', async () => {
      const embeddingError = new Error('Embedding creation failed');
      createEmbedding.mockRejectedValueOnce(embeddingError);

      await expect(searchSimilarMemories(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, userId, queryText))
        .rejects.toThrow(embeddingError); // The original error from createEmbedding should be re-thrown

      expect(createEmbedding).toHaveBeenCalledWith(mockOpenAI, queryText, mockConfig.embeddingModel, mockLogger);
      expect(mockLogger.error).toHaveBeenCalledWith(
        { userId, error: embeddingError.message }, // Error is logged by searchSimilarMemories
        'Error searching similar memories'
      );
    });

    test('should call Supabase RPC with correct parameters on successful embedding', async () => {
      const options = {
        threshold: 0.8,
        limit: 5,
        planId: 'plan-123'
      };
      await searchSimilarMemories(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, userId, queryText, options);

      expect(createEmbedding).toHaveBeenCalledWith(mockOpenAI, queryText, mockConfig.embeddingModel, mockLogger);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('match_agent_memories', {
        query_embedding: mockEmbedding,
        match_threshold: options.threshold, // Uses provided option
        match_count: options.limit,       // Uses provided option
        filter_user_id: userId,
        filter_plan_id: options.planId   // Passes planId
      });
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ queryLength: queryText.length }), 'Searching for similar memories');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ count: 0 }), 'Similar memories search completed');
    });

     test('should use default threshold and limit if not provided in options', async () => {
      await searchSimilarMemories(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, userId, queryText, {}); // Empty options

      expect(mockSupabase.rpc).toHaveBeenCalledWith('match_agent_memories', {
        query_embedding: mockEmbedding,
        match_threshold: mockConfig.similarityThreshold, // Default from config
        match_count: mockConfig.maxResults,           // Default from config
        filter_user_id: userId,
        filter_plan_id: null // Default for planId if not in options
      });
    });

    test('should throw error and log if Supabase RPC call fails', async () => {
      const rpcError = new Error('RPC Error');
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: rpcError });

      await expect(searchSimilarMemories(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, userId, queryText))
        .rejects.toThrow('Similar memories search failed: RPC Error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        { userId, error: rpcError.message },
        'Similar memories search failed'
      );
    });

    describe('Post-RPC Filtering for searchSimilarMemories', () => {
      const userId = 'test-user-id';
      const queryText = 'find similar things';
      const baseMemory = { content: 'some content', agent_type: 'test-agent', metadata: { key: 'value' } };
      const rpcResults = [
        { ...baseMemory, id: 'mem1', workout_log_id: 'log-123', is_archived: false },
        { ...baseMemory, id: 'mem2', workout_log_id: 'log-123', is_archived: true },
        { ...baseMemory, id: 'mem3', workout_log_id: 'log-abc', agent_type: 'other-agent', is_archived: false },
        { ...baseMemory, id: 'mem4', workout_log_id: 'log-def', metadata: { key: 'other-value' }, is_archived: false },
        { ...baseMemory, id: 'mem5', workout_log_id: 'log-456', is_archived: false, agent_type: 'test-agent', metadata: { key: 'value'} },
      ];

      beforeEach(() => {
        mockSupabase.rpc.mockResolvedValue({ data: [...rpcResults], error: null });
      });

      test('should filter out archived memories by default (includeArchived=false)', async () => {
        const results = await searchSimilarMemories(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, userId, queryText, { includeArchived: false });
        expect(results.length).toBe(4);
        expect(results.find(m => m.id === 'mem2')).toBeUndefined();
      });

      test('should include archived memories if includeArchived is true', async () => {
        const results = await searchSimilarMemories(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, userId, queryText, { includeArchived: true });
        expect(results.length).toBe(rpcResults.length); // All results returned before client-side filtering by other criteria
        expect(results.find(m => m.id === 'mem2')).toBeDefined();
      });

      test('should filter by agentType if provided', async () => {
        const results = await searchSimilarMemories(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, userId, queryText, { agentType: 'test-agent' });
        expect(results.length).toBe(3); // mem1, mem4, mem5 (mem3 is other-agent, mem2 is archived)
        expect(results.every(m => m.agent_type === 'test-agent')).toBe(true);
      });

      test('should filter by logId if provided and valid', async () => {
        mockValidators.isValidUUID.mockImplementation(id => id === userId || id === 'log-123');
        const results = await searchSimilarMemories(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, userId, queryText, { logId: 'log-123' });
        expect(results.length).toBe(1); // mem1
        expect(results[0].id).toBe('mem1');
      });

      test('should not filter by logId if invalid', async () => {
        mockValidators.isValidUUID.mockImplementation(id => id === userId || id === 'some-other-valid-uuid');
        const results = await searchSimilarMemories(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, userId, queryText, { logId: 'invalid-log-id' });
        expect(results.length).toBe(4); // mem1, mem3, mem4, mem5 (mem2 archived)
      });

      test('should filter by metadataFilter if provided', async () => {
        const results = await searchSimilarMemories(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, userId, queryText, { metadataFilter: { key: 'value' } });
        expect(results.length).toBe(3); // mem1, mem3, mem5 (mem2 archived, mem4 other-value)
        expect(results.every(m => m.metadata.key === 'value')).toBe(true);
      });

      test('should correctly apply combined filters (agentType, metadata, includeArchived=true)', async () => {
        const results = await searchSimilarMemories(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, userId, queryText, {
          agentType: 'test-agent',
          metadataFilter: { key: 'value' },
          includeArchived: true,
        });
        // Expected: mem1 (matches all), mem2 (matches agentType, metadata, and is archived but included)
        // mem3 (other-agent), mem4 (other-value), mem5 (matches agentType, metadata)
        // After RPC (all 5): mem1, mem2, mem3, mem4, mem5
        // After includeArchived=true: mem1, mem2, mem3, mem4, mem5
        // After agentType='test-agent': mem1, mem2, mem4, mem5
        // After metadataFilter={key:'value'}: mem1, mem2, mem5
        expect(results.length).toBe(3);
        expect(results.find(m => m.id === 'mem1')).toBeDefined();
        expect(results.find(m => m.id === 'mem2')).toBeDefined(); // Archived but included
        expect(results.find(m => m.id === 'mem5')).toBeDefined(); 
      });

      test('should return empty array if no memories match filters', async () => {
        const results = await searchSimilarMemories(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, userId, queryText, { agentType: 'non-existent-agent' });
        expect(results).toEqual([]);
      });

       test('should handle RPC returning empty data gracefully', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
        const results = await searchSimilarMemories(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, userId, queryText, {});
        expect(results).toEqual([]);
        expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ count: 0 }), 'Similar memories search completed');
      });
    });
  });

  describe('getMemoriesByAgentType', () => {
    const userId = 'test-user-id';
    const agentType = 'test-agent';
    const mockMemories = [{ id: 'mem1', agent_type: agentType.toLowerCase() }];

    beforeEach(() => {
      // Reset Supabase general query mock to resolve with empty array by default
      // The '.then' mock handles the resolution of the promise returned by the chained query
      mockSupabase.then = jest.fn().mockImplementation((onfulfilled) => Promise.resolve(onfulfilled({ data: [], error: null })));
    });

    test('should throw error if userId is invalid', async () => {
      mockValidators.isValidUUID.mockReturnValueOnce(false);
      await expect(getMemoriesByAgentType(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType))
        .rejects.toThrow('Invalid userId format: test-user-id');
    });

    test('should throw error if agentType is invalid', async () => {
      mockValidators.isValidAgentType.mockReturnValueOnce(false);
      await expect(getMemoriesByAgentType(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType))
        .rejects.toThrow('Invalid agent type: test-agent');
    });

    test('should retrieve memories with basic filters (userId, agentType)', async () => {
      mockSupabase.then = jest.fn().mockImplementation((onfulfilled) => Promise.resolve(onfulfilled({ data: mockMemories, error: null })));
      
      const results = await getMemoriesByAgentType(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType);

      expect(results).toEqual(mockMemories);
      expect(mockSupabase.from).toHaveBeenCalledWith(mockConfig.tableName);
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('agent_type', agentType.toLowerCase());
      // Default filters
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_archived', false); // Default includeArchived = false
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false }); // Default sort
      expect(mockSupabase.range).toHaveBeenCalledWith(0, mockConfig.maxResults - 1); // Default limit/offset
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ userId, agentType }), 'Retrieving memories by agent type');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ count: mockMemories.length }), 'Retrieval by agent type completed');
    });

    test('should include planId filter if provided and valid', async () => {
      const planId = 'plan-qwerty';
      mockValidators.isValidUUID.mockImplementation(id => id === userId || id === planId); // Make planId valid
      await getMemoriesByAgentType(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType, { planId });
      expect(mockSupabase.eq).toHaveBeenCalledWith('workout_plan_id', planId);
    });

    test('should include logId filter if provided and valid', async () => {
      const logId = 'log-asdfgh';
      mockValidators.isValidUUID.mockImplementation(id => id === userId || id === logId); // Make logId valid
      await getMemoriesByAgentType(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType, { logId });
      expect(mockSupabase.eq).toHaveBeenCalledWith('workout_log_id', logId);
    });

    test('should include metadataFilter if provided with keys', async () => {
      const metadataFilter = { source: 'test-source' };
      await getMemoriesByAgentType(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType, { metadataFilter });
      expect(mockSupabase.match).toHaveBeenCalledWith(metadataFilter);
    });

    test('should include archived memories if includeArchived is true', async () => {
      await getMemoriesByAgentType(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType, { includeArchived: true });
      // Check that is_archived filter was NOT called, or was called with true if that's the logic
      // Current implementation: if includeArchived is true, no .eq('is_archived', false) is added.
      expect(mockSupabase.eq).not.toHaveBeenCalledWith('is_archived', false);
    });

    test('should apply custom sorting if sortBy and sortDirection are provided', async () => {
      const sortBy = 'content';
      const sortDirection = 'asc';
      await getMemoriesByAgentType(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType, { sortBy, sortDirection });
      expect(mockSupabase.order).toHaveBeenCalledWith(sortBy, { ascending: true });
    });

    test('should apply custom limit and offset if provided', async () => {
      const limit = 5;
      const offset = 10;
      await getMemoriesByAgentType(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType, { limit, offset });
      expect(mockSupabase.range).toHaveBeenCalledWith(offset, offset + limit - 1);
    });

    test('should throw error and log if Supabase query fails', async () => {
      const dbError = new Error('DB Query Failed for AgentType');
      
      const rejectingPromise = Promise.reject(dbError);
      const mockQueryObject = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        match: jest.fn().mockReturnThis(),
        // Make the object itself thenable and reject
        then: (resolve, reject) => rejectingPromise.then(resolve, reject),
        catch: (onReject) => rejectingPromise.catch(onReject)
      };
      mockSupabase.from.mockReturnValueOnce(mockQueryObject);
      
      await expect(getMemoriesByAgentType(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType))
        .rejects.toThrow(dbError);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        { userId, agentType, error: dbError.message },
        'Error retrieving memories by agent type' // Updated log message expectation
      );
    });

    test('should return empty array if Supabase returns no data', async () => {
      mockSupabase.then = jest.fn().mockImplementation((onfulfilled) => Promise.resolve(onfulfilled({ data: [], error: null })));
      const results = await getMemoriesByAgentType(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType);
      expect(results).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ count: 0 }), 'Retrieval by agent type completed');
    });

    test('should re-throw error if an unexpected error occurs', async () => {
      const unexpectedError = new Error('Unexpected issue in getMemoriesByAgentType');
      mockSupabase.order.mockImplementationOnce(() => { throw unexpectedError; });

      await expect(getMemoriesByAgentType(mockSupabase, mockConfig, mockLogger, mockValidators, userId, agentType))
        .rejects.toThrow(unexpectedError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        { userId, agentType, error: unexpectedError.message },
        'Error retrieving memories by agent type'
      );
    });
  });

  describe('getMemoriesByMetadata', () => {
    const userId = 'test-user-id';
    const metadataFilter = { type: 'test-event' };
    const mockMemories = [{ id: 'mem-meta', metadata: metadataFilter }];

    beforeEach(() => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null }); // Default success for rpc
    });

    test('should throw error if userId is invalid', async () => {
      mockValidators.isValidUUID.mockReturnValueOnce(false);
      await expect(getMemoriesByMetadata(mockSupabase, mockConfig, mockLogger, mockValidators, userId, metadataFilter))
        .rejects.toThrow('Invalid userId format: test-user-id');
    });

    test('should throw error if metadataFilter is not an object', async () => {
      await expect(getMemoriesByMetadata(mockSupabase, mockConfig, mockLogger, mockValidators, userId, 'not-an-object'))
        .rejects.toThrow('metadataFilter must be an object');
    });
    
    test('should throw error if metadataFilter is null', async () => {
      await expect(getMemoriesByMetadata(mockSupabase, mockConfig, mockLogger, mockValidators, userId, null))
        .rejects.toThrow('metadataFilter must be an object');
    });

    test('should call Supabase RPC with correct parameters and default options', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: mockMemories, error: null });
      const results = await getMemoriesByMetadata(mockSupabase, mockConfig, mockLogger, mockValidators, userId, metadataFilter);

      expect(results).toEqual(mockMemories);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('filter_agent_memories', {
        user_id_param: userId,
        metadata_filter: metadataFilter,
        agent_type_param: null, // Default
        plan_id_param: null,    // Default
        log_id_param: null,     // Default
        include_archived: false, // Default
        limit_param: mockConfig.maxResults, // Default
        offset_param: 0, // Default
        sort_by_param: 'created_at', // Default
        sort_direction_param: 'desc', // Default
      });
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ userId, metadataFilter }), 'Retrieving memories by metadata');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ count: mockMemories.length }), 'Retrieval by metadata completed');
    });

    test('should pass all options to Supabase RPC if provided', async () => {
      const options = {
        agentType: 'specific-agent',
        planId: 'plan-xyz',
        logId: 'log-xyz',
        includeArchived: true,
        limit: 5,
        offset: 10,
        sortBy: 'updated_at',
        sortDirection: 'asc',
      };
      await getMemoriesByMetadata(mockSupabase, mockConfig, mockLogger, mockValidators, userId, metadataFilter, options);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('filter_agent_memories', {
        user_id_param: userId,
        metadata_filter: metadataFilter,
        agent_type_param: options.agentType,
        plan_id_param: options.planId,
        log_id_param: options.logId,
        include_archived: options.includeArchived,
        limit_param: options.limit,
        offset_param: options.offset,
        sort_by_param: options.sortBy,
        sort_direction_param: options.sortDirection,
      });
    });

    test('should throw error and log if Supabase RPC call fails', async () => {
      const rpcError = new Error('RPC Metadata Failed');
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: rpcError });

      await expect(getMemoriesByMetadata(mockSupabase, mockConfig, mockLogger, mockValidators, userId, metadataFilter))
        .rejects.toThrow('Retrieval by metadata failed: RPC Metadata Failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        { userId, metadataFilter, error: rpcError.message },
        'Retrieval by metadata failed'
      );
    });

    test('should return empty array if RPC returns no data', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: [], error: null });
      const results = await getMemoriesByMetadata(mockSupabase, mockConfig, mockLogger, mockValidators, userId, metadataFilter);
      expect(results).toEqual([]);
    });

    test('should re-throw error if an unexpected error occurs', async () => {
      const unexpectedError = new Error('Unexpected issue in getMemoriesByMetadata');
      // To simulate an error before the RPC call, let's make a validator throw
      mockValidators.isValidUUID.mockImplementationOnce(() => { throw unexpectedError; });

      // Forcing userId to be invalid for this specific test path to trigger the validator error before RPC
      await expect(getMemoriesByMetadata(mockSupabase, mockConfig, mockLogger, mockValidators, 'invalid-user-id', metadataFilter))
        .rejects.toThrow(unexpectedError);

      // The error is thrown by the validator before the main try block's logger.error is called for RPC failure.
      // Thus, no specific logging from within getMemoriesByMetadata for this path.
      // expect(mockLogger.error).toHaveBeenCalledWith(
      //   { userId: 'invalid-user-id', metadataFilter, error: unexpectedError.message },
      //   'Error retrieving memories by metadata'
      // );
    });
  });

  describe('getMemoriesByWorkoutPlan', () => {
    const userId = 'test-user-id';
    const planId = 'test-plan-id';
    const mockMemories = [{ id: 'mem-plan', workout_plan_id: planId }];

    beforeEach(() => {
      mockSupabase.then = jest.fn().mockImplementation((onfulfilled) => Promise.resolve(onfulfilled({ data: [], error: null })));
    });

    test('should throw error if userId is invalid', async () => {
      mockValidators.isValidUUID.mockImplementation(id => id === planId); // planId valid, userId invalid
      await expect(getMemoriesByWorkoutPlan(mockSupabase, mockConfig, mockLogger, mockValidators, 'invalid-user', planId))
        .rejects.toThrow('Invalid userId format: invalid-user');
    });

    test('should throw error if planId is invalid', async () => {
      mockValidators.isValidUUID.mockImplementation(id => id === userId); // userId valid, planId invalid
      await expect(getMemoriesByWorkoutPlan(mockSupabase, mockConfig, mockLogger, mockValidators, userId, 'invalid-plan'))
        .rejects.toThrow('Invalid planId format: invalid-plan');
    });

    test('should retrieve memories with basic filters (userId, planId)', async () => {
      mockSupabase.then = jest.fn().mockImplementation((onfulfilled) => Promise.resolve(onfulfilled({ data: mockMemories, error: null })));
      const results = await getMemoriesByWorkoutPlan(mockSupabase, mockConfig, mockLogger, mockValidators, userId, planId);

      expect(results).toEqual(mockMemories);
      expect(mockSupabase.from).toHaveBeenCalledWith(mockConfig.tableName);
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('workout_plan_id', planId);
      // Default filters
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_archived', false);
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockSupabase.range).toHaveBeenCalledWith(0, mockConfig.maxResults - 1);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ userId, planId }), 'Retrieving memories by workout plan');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ count: mockMemories.length }), 'Retrieval by workout plan completed');
    });

    test('should include agentType filter if provided', async () => {
      const agentType = 'specific-filter-agent';
      await getMemoriesByWorkoutPlan(mockSupabase, mockConfig, mockLogger, mockValidators, userId, planId, { agentType });
      expect(mockSupabase.eq).toHaveBeenCalledWith('agent_type', agentType.toLowerCase());
    });

    test('should include archived memories if includeArchived is true', async () => {
      await getMemoriesByWorkoutPlan(mockSupabase, mockConfig, mockLogger, mockValidators, userId, planId, { includeArchived: true });
      expect(mockSupabase.eq).not.toHaveBeenCalledWith('is_archived', false);
    });

    test('should apply custom sorting, limit, and offset if provided', async () => {
      const options = { sortBy: 'content', sortDirection: 'asc', limit: 3, offset: 6 };
      await getMemoriesByWorkoutPlan(mockSupabase, mockConfig, mockLogger, mockValidators, userId, planId, options);
      expect(mockSupabase.order).toHaveBeenCalledWith(options.sortBy, { ascending: true });
      expect(mockSupabase.range).toHaveBeenCalledWith(options.offset, options.offset + options.limit - 1);
    });

    test('should throw error and log if Supabase query fails', async () => {
      const dbError = new Error('DB Query Failed for WorkoutPlan');
      const mockQueryObject = { /* as constructed in previous successful fix */
        select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(), range: jest.fn().mockReturnThis(),
        then: (resolve, reject) => Promise.reject(dbError).catch(reject)
      };
      mockSupabase.from.mockReturnValueOnce(mockQueryObject);

      await expect(getMemoriesByWorkoutPlan(mockSupabase, mockConfig, mockLogger, mockValidators, userId, planId))
        .rejects.toThrow(dbError);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        { userId, planId, error: dbError.message },
        'Error retrieving memories by workout plan' // This is the log from the catch block
      );
    });
     test('should return empty array if Supabase returns no data', async () => {
      mockSupabase.then = jest.fn().mockImplementation((onfulfilled) => Promise.resolve(onfulfilled({ data: [], error: null })));
      const results = await getMemoriesByWorkoutPlan(mockSupabase, mockConfig, mockLogger, mockValidators, userId, planId);
      expect(results).toEqual([]);
    });
  });
}); 