const { storeMemory, storeAgentResult, storeUserFeedback, storeSystemEvent } = require('../../../agents/memory/storage');
const { createEmbedding } = require('../../../agents/memory/embedding');

jest.mock('../../../agents/memory/embedding', () => ({
  createEmbedding: jest.fn(),
}));

describe('Memory Storage Functions', () => {
  let mockSupabase;
  let mockOpenAI;
  let mockConfig;
  let mockLogger;
  let mockValidators;

  beforeEach(() => {
    const supabaseSelf = {
      from: jest.fn(() => supabaseSelf),
      insert: jest.fn(), // Will be configured in nested beforeEach to return { select: jest.fn() }
      select: jest.fn(() => supabaseSelf),
      eq: jest.fn(() => supabaseSelf),
      maybeSingle: jest.fn(),
    };
    mockSupabase = supabaseSelf;

    mockOpenAI = {};
    mockConfig = {
      tableName: 'agent_memory',
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
      validateMemoryInput: jest.fn(),
    };

    createEmbedding.mockClear();
    mockValidators.isValidUUID.mockClear().mockReturnValue(true); // Ensure it defaults to true
    mockValidators.isValidAgentType.mockClear().mockReturnValue(true); // Ensure it defaults to true
    mockValidators.validateMemoryInput.mockClear();
    // Clear Jest mock function calls for supabase methods
    mockSupabase.from.mockClear();
    mockSupabase.insert.mockClear();
    mockSupabase.select.mockClear();
    mockSupabase.eq.mockClear();
    mockSupabase.maybeSingle.mockClear();
  });

  describe('storeMemory', () => {
    const validUserId = '123e4567-e89b-12d3-a456-426614174000';
    const validAgentType = 'test_agent';
    const validContent = 'This is a test memory.';
    const mockEmbedding = [0.1, 0.2, 0.3];
    let expectedDefaultRecord;

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
      createEmbedding.mockResolvedValue(mockEmbedding);
      
      expectedDefaultRecord = {
        id: 'mem_123',
        user_id: validUserId,
        agent_type: validAgentType.toLowerCase(),
        content: validContent,
        embedding: mockEmbedding,
        metadata: {},
        created_at: new Date().toISOString(),
        is_archived: false,
        workout_plan_id: null,
        workout_log_id: null,
      };
    });

    afterEach(() => {
        jest.useRealTimers();
        mockSupabase.insert.mockReset(); // Reset insert mock after each test in this suite
    });

    test('should throw error for invalid userId', async () => {
      mockValidators.isValidUUID.mockReturnValueOnce(false);
      await expect(storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, 'invalid-uuid', validAgentType, validContent))
        .rejects.toThrow('Invalid userId format: invalid-uuid');
    });

    test('should throw error for invalid agentType', async () => {
      mockValidators.isValidAgentType.mockReturnValueOnce(false);
      await expect(storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, 'invalid_agent', validContent))
        .rejects.toThrow('Invalid agent type: invalid_agent');
    });

    test('should throw error for invalid content', async () => {
      mockValidators.validateMemoryInput.mockImplementationOnce(() => { throw new Error('Memory content cannot be empty'); });
      await expect(storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, ''))
        .rejects.toThrow('Memory content cannot be empty');
    });

    test('should stringify object content before embedding and storage', async () => {
      const objectContent = { key: 'value', nested: { num: 1 } };
      const stringifiedContent = JSON.stringify(objectContent);
      const specificRecord = { ...expectedDefaultRecord, id: 'mem_obj', content: stringifiedContent }; 
      const mockInsertSelect = jest.fn().mockResolvedValueOnce({ data: [specificRecord], error: null });
      mockSupabase.insert.mockReturnValueOnce({ select: mockInsertSelect });

      await storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, objectContent);

      expect(createEmbedding).toHaveBeenCalledWith(mockOpenAI, stringifiedContent, mockConfig.embeddingModel, mockLogger);
      expect(mockSupabase.from).toHaveBeenCalledWith(mockConfig.tableName);
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        content: stringifiedContent,
        user_id: validUserId,
        agent_type: validAgentType.toLowerCase(),
        embedding: mockEmbedding,
        metadata: {},
        created_at: new Date('2023-01-01T00:00:00.000Z').toISOString(),
        is_archived: false,
        workout_plan_id: null,
        workout_log_id: null,
      }));
      expect(mockInsertSelect).toHaveBeenCalledTimes(1);
    });

    test('should call createEmbedding with correct arguments', async () => {
      const mockInsertSelect = jest.fn().mockResolvedValueOnce({ data: [expectedDefaultRecord], error: null });
      mockSupabase.insert.mockReturnValueOnce({ select: mockInsertSelect });
      await storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, validContent);
      expect(createEmbedding).toHaveBeenCalledWith(mockOpenAI, validContent, mockConfig.embeddingModel, mockLogger);
    });

    test('should throw error if createEmbedding fails', async () => {
      const embeddingError = new Error('Embedding failed');
      createEmbedding.mockRejectedValueOnce(embeddingError);

      await expect(storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, validContent))
        .rejects.toThrow(embeddingError);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({ error: 'Embedding failed' }), "Error storing memory");
    });

    test('should insert correctly constructed record and return data on success', async () => {
      const mockInsertSelect = jest.fn().mockResolvedValueOnce({ data: [expectedDefaultRecord], error: null });
      mockSupabase.insert.mockReturnValueOnce({ select: mockInsertSelect });
      const result = await storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, validContent);

      expect(mockSupabase.from).toHaveBeenCalledWith(mockConfig.tableName);
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: validUserId,
        agent_type: validAgentType.toLowerCase(),
        content: validContent,
        embedding: mockEmbedding,
        metadata: {},
        created_at: new Date('2023-01-01T00:00:00.000Z').toISOString(),
        is_archived: false,
        workout_plan_id: null,
        workout_log_id: null,
      }));
      expect(mockInsertSelect).toHaveBeenCalledTimes(1); 
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ memoryId: expectedDefaultRecord.id }), "Memory stored successfully");
      expect(result).toEqual(expectedDefaultRecord);
    });

    test('should throw error if database insert fails', async () => {
      const dbError = new Error('DB insert failed');
      const mockInsertSelect = jest.fn().mockResolvedValueOnce({ data: null, error: dbError });
      mockSupabase.insert.mockReturnValueOnce({ select: mockInsertSelect });

      await expect(storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, validContent))
        .rejects.toThrow(`Memory storage failed: ${dbError.message}`);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({ error: dbError.message }), "Memory storage failed");
    });

    test('should return null if database insert returns no data (edge case)', async () => {
      const mockInsertSelect = jest.fn().mockResolvedValueOnce({ data: null, error: null }); 
      mockSupabase.insert.mockReturnValueOnce({ select: mockInsertSelect });
      const result = await storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, validContent);
      expect(result).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ memoryId: undefined }), "Memory stored successfully");
    });

    describe('Metadata Handling (Relationship IDs)', () => {
      const validPlanId = 'plan_123e4567-e89b-12d3-a456-plan1111';
      const validLogId = 'log_123e4567-e89b-12d3-a456-log22222';
      
      // Helper to set up insert mock for these tests
      const setupInsertMock = (expectedRecordData) => {
        const mockInsertSelect = jest.fn().mockResolvedValueOnce({ data: [expectedRecordData], error: null });
        mockSupabase.insert.mockReturnValueOnce({ select: mockInsertSelect });
        return mockInsertSelect;
      };

      test('should include workout_plan_id if valid planId is in metadata', async () => {
        const metadata = { planId: validPlanId };
        const mockInsertSelect = setupInsertMock({ ...expectedDefaultRecord, workout_plan_id: validPlanId, metadata });
        await storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, validContent, metadata);
        expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ workout_plan_id: validPlanId, metadata }));
        expect(mockInsertSelect).toHaveBeenCalledTimes(1);
      });

      test('should include workout_plan_id if valid workout_plan_id is in metadata', async () => {
        const metadata = { workout_plan_id: validPlanId };
        const mockInsertSelect = setupInsertMock({ ...expectedDefaultRecord, workout_plan_id: validPlanId, metadata });
        await storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, validContent, metadata);
        expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ workout_plan_id: validPlanId, metadata }));
        expect(mockInsertSelect).toHaveBeenCalledTimes(1);
      });

      test('should include workout_plan_id if valid workoutPlanId is in metadata', async () => {
        const metadata = { workoutPlanId: validPlanId };
        const mockInsertSelect = setupInsertMock({ ...expectedDefaultRecord, workout_plan_id: validPlanId, metadata });
        await storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, validContent, metadata);
        expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ workout_plan_id: validPlanId, metadata }));
        expect(mockInsertSelect).toHaveBeenCalledTimes(1);
      });

      test('should include workout_log_id if valid logId is in metadata', async () => {
        const metadata = { logId: validLogId };
        const mockInsertSelect = setupInsertMock({ ...expectedDefaultRecord, workout_log_id: validLogId, metadata });
        await storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, validContent, metadata);
        expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ workout_log_id: validLogId, metadata }));
        expect(mockInsertSelect).toHaveBeenCalledTimes(1);
      });
      
      test('should include workout_log_id if valid workout_log_id is in metadata', async () => {
        const metadata = { workout_log_id: validLogId };
        const mockInsertSelect = setupInsertMock({ ...expectedDefaultRecord, workout_log_id: validLogId, metadata });
        await storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, validContent, metadata);
        expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ workout_log_id: validLogId, metadata }));
        expect(mockInsertSelect).toHaveBeenCalledTimes(1);
      });

      test('should include workout_log_id if valid workoutLogId is in metadata', async () => {
        const metadata = { workoutLogId: validLogId };
        const mockInsertSelect = setupInsertMock({ ...expectedDefaultRecord, workout_log_id: validLogId, metadata });
        await storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, validContent, metadata);
        expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ workout_log_id: validLogId, metadata }));
        expect(mockInsertSelect).toHaveBeenCalledTimes(1);
      });

      test('should set workout_plan_id to null if planId in metadata is invalid', async () => {
        mockValidators.isValidUUID.mockReturnValueOnce(true).mockReturnValueOnce(false);
        const metadata = { planId: 'invalid-plan-id' };
        const mockInsertSelect = setupInsertMock({ ...expectedDefaultRecord, workout_plan_id: null, metadata });
        await storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, validContent, metadata);
        expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ workout_plan_id: null, metadata }));
        expect(mockValidators.isValidUUID).toHaveBeenCalledTimes(2);
        expect(mockInsertSelect).toHaveBeenCalledTimes(1);
      });

      test('should set workout_log_id to null if logId in metadata is invalid', async () => {
        mockValidators.isValidUUID.mockReturnValueOnce(true).mockReturnValueOnce(false);
        const metadata = { logId: 'invalid-log-id' };
        const mockInsertSelect = setupInsertMock({ ...expectedDefaultRecord, workout_log_id: null, metadata });
        await storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, validContent, metadata);
        expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ workout_log_id: null, metadata }));
        expect(mockValidators.isValidUUID).toHaveBeenCalledTimes(2);
        expect(mockInsertSelect).toHaveBeenCalledTimes(1);
      });

      test('should set both to null if metadata is empty', async () => {
        const metadata = {};
        // This test now needs its own insert mock setup
        const mockInsertSelect = setupInsertMock({ ...expectedDefaultRecord, workout_plan_id: null, workout_log_id: null, metadata });
        await storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, validContent, metadata);
        expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ workout_plan_id: null, workout_log_id: null, metadata }));
        expect(mockValidators.isValidUUID).toHaveBeenCalledTimes(1);
        expect(mockInsertSelect).toHaveBeenCalledTimes(1);
      });

      test('should include both workout_plan_id and workout_log_id if valid ones are in metadata', async () => {
        const metadata = { planId: validPlanId, logId: validLogId };
        mockValidators.isValidUUID.mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValueOnce(true);
        const mockInsertSelect = setupInsertMock({ ...expectedDefaultRecord, workout_plan_id: validPlanId, workout_log_id: validLogId, metadata });
        await storeMemory(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, validContent, metadata);
        expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ workout_plan_id: validPlanId, workout_log_id: validLogId, metadata }));
        expect(mockValidators.isValidUUID).toHaveBeenCalledTimes(3);
        expect(mockInsertSelect).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('storeAgentResult', () => {
    const validUserId = 'user_agent_res_123';
    const validAgentType = 'result_agent';
    const agentResultContent = { data: 'some agent result' };
    const mockStoredMemory = { id: 'mem_agent_res_456'}; // Simplified for this test

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2023-02-01T10:00:00.000Z'));
      createEmbedding.mockResolvedValue([0.4,0.5,0.6]);
      // storeAgentResult calls storeMemory, so we mock the insert().select() for storeMemory's call
      const agentResultInsertSelectMock = jest.fn().mockResolvedValue({data: [mockStoredMemory], error: null});
      mockSupabase.insert.mockReturnValue({ select: agentResultInsertSelectMock });
    });

    afterEach(() => {
        jest.useRealTimers();
        mockSupabase.insert.mockReset();
    });

    test('should call storeMemory with correct userId, agentType, result, and metadata', async () => {
      const result = await storeAgentResult(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, agentResultContent);

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: validUserId,
        agent_type: validAgentType.toLowerCase(),
        content: JSON.stringify(agentResultContent),
        metadata: {
          type: 'agent_result',
          timestamp: new Date('2023-02-01T10:00:00.000Z').toISOString(),
        }
      }));
      expect(mockLogger.info).toHaveBeenCalledWith({ userId: validUserId, agentType: validAgentType }, "Storing agent result");
      expect(result).toEqual(mockStoredMemory);
    });

    test('should propagate errors from storeMemory', async () => {
        const storeMemoryError = new Error("Failed to store base memory");
        createEmbedding.mockRejectedValueOnce(storeMemoryError); // Simulate failure within storeMemory

        await expect(storeAgentResult(mockSupabase, mockOpenAI, mockConfig, mockLogger, mockValidators, validUserId, validAgentType, agentResultContent))
            .rejects.toThrow(storeMemoryError);
    });
  });

  describe('storeUserFeedback', () => {
    const validUserId = 'user_feedback_123';
    const validMemoryId = 'mem_original_456';
    const validFeedback = 'This is great!';
    const mockOriginalMemory = {
      id: validMemoryId,
      workout_plan_id: 'plan_abc',
      workout_log_id: 'log_def',
    };
    const mockStoredFeedback = { id: 'feedback_mem_789', /* ... other fields */ };

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2023-03-01T12:00:00.000Z'));
      // Default success for original memory fetch (select...eq...eq.maybeSingle())
      mockSupabase.maybeSingle.mockResolvedValue({ data: mockOriginalMemory, error: null });
      
      // Configure the select that follows an insert for storeUserFeedback
      const feedbackInsertSelectMock = jest.fn().mockResolvedValue({ data: [mockStoredFeedback], error: null });
      mockSupabase.insert.mockReturnValue({ select: feedbackInsertSelectMock });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    // Validation Tests
    test('should throw error for invalid userId', async () => {
      mockValidators.isValidUUID.mockImplementationOnce(id => id !== 'invalid-user-id'); // Fails for 'invalid-user-id'
      await expect(storeUserFeedback(mockSupabase, mockConfig, mockLogger, mockValidators, 'invalid-user-id', validMemoryId, validFeedback))
        .rejects.toThrow('Invalid userId format: invalid-user-id');
      expect(mockValidators.isValidUUID).toHaveBeenCalledWith('invalid-user-id');
    });

    test('should throw error for invalid memoryId', async () => {
      mockValidators.isValidUUID
        .mockReturnValueOnce(true) // for userId
        .mockReturnValueOnce(false); // for memoryId
      await expect(storeUserFeedback(mockSupabase, mockConfig, mockLogger, mockValidators, validUserId, 'invalid-mem-id', validFeedback))
        .rejects.toThrow('Invalid memoryId format: invalid-mem-id');
      expect(mockValidators.isValidUUID).toHaveBeenNthCalledWith(1, validUserId);
      expect(mockValidators.isValidUUID).toHaveBeenNthCalledWith(2, 'invalid-mem-id');
    });

    test('should throw error for invalid feedback content', async () => {
      mockValidators.validateMemoryInput.mockImplementationOnce(() => { throw new Error('Feedback content cannot be empty'); });
      await expect(storeUserFeedback(mockSupabase, mockConfig, mockLogger, mockValidators, validUserId, validMemoryId, ''))
        .rejects.toThrow('Feedback content cannot be empty');
      expect(mockValidators.validateMemoryInput).toHaveBeenCalledWith('');
    });

    // Original Memory Fetch Tests
    test('should call Supabase correctly to fetch original memory', async () => {
      await storeUserFeedback(mockSupabase, mockConfig, mockLogger, mockValidators, validUserId, validMemoryId, validFeedback);

      expect(mockSupabase.from).toHaveBeenCalledWith(mockConfig.tableName);
      expect(mockSupabase.select).toHaveBeenCalledWith('id, workout_plan_id, workout_log_id');
      expect(mockSupabase.eq).toHaveBeenNthCalledWith(1, 'id', validMemoryId);
      expect(mockSupabase.eq).toHaveBeenNthCalledWith(2, 'user_id', validUserId);
      expect(mockSupabase.maybeSingle).toHaveBeenCalledTimes(1);
    });

    test('should throw specific error if original memory fetch fails (DB error)', async () => {
      const fetchDbError = new Error('Original fetch failed');
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: fetchDbError });

      await expect(storeUserFeedback(mockSupabase, mockConfig, mockLogger, mockValidators, validUserId, validMemoryId, validFeedback))
        .rejects.toThrow(`Feedback storage failed: ${fetchDbError.message}`);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ userId: validUserId, memoryId: validMemoryId, error: fetchDbError.message }),
        "Feedback storage failed: Original memory lookup error"
      );
    });

    test('should throw specific error if original memory not found', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null }); // Not found

      await expect(storeUserFeedback(mockSupabase, mockConfig, mockLogger, mockValidators, validUserId, validMemoryId, validFeedback))
        .rejects.toThrow('Feedback storage failed: Original memory not found');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ userId: validUserId, memoryId: validMemoryId, error: 'Original memory not found' }),
        "Feedback storage failed: Original memory lookup error"
      );
    });

    // Feedback Handling & Database Insert Tests
    test('should stringify object feedback before storage', async () => {
      const objectFeedback = { rating: 5, comment: "Excellent!" };
      const stringifiedFeedback = JSON.stringify(objectFeedback);
      // Mock for the insert().select() of the feedback record
      const mockFeedbackInsertSelect = jest.fn().mockResolvedValueOnce({ data: [mockStoredFeedback], error: null });
      mockSupabase.insert.mockReturnValueOnce({ select: mockFeedbackInsertSelect });

      await storeUserFeedback(mockSupabase, mockConfig, mockLogger, mockValidators, validUserId, validMemoryId, objectFeedback);
      
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ content: stringifiedFeedback }));
      expect(mockFeedbackInsertSelect).toHaveBeenCalledTimes(1);
    });

    test('should insert correctly constructed feedback record and return data on success', async () => {
      const mockFeedbackInsertSelect = jest.fn().mockResolvedValueOnce({ data: [mockStoredFeedback], error: null });
      mockSupabase.insert.mockReturnValueOnce({ select: mockFeedbackInsertSelect });

      const result = await storeUserFeedback(mockSupabase, mockConfig, mockLogger, mockValidators, validUserId, validMemoryId, validFeedback);

      expect(mockSupabase.from).toHaveBeenCalledWith(mockConfig.tableName); // Called for fetch and insert
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: validUserId,
        agent_type: 'system',
        content: validFeedback,
        metadata: {
          type: 'user_feedback',
          relatedMemoryId: validMemoryId,
          timestamp: new Date('2023-03-01T12:00:00.000Z').toISOString(),
        },
        created_at: new Date('2023-03-01T12:00:00.000Z').toISOString(),
        is_archived: false,
        workout_plan_id: mockOriginalMemory.workout_plan_id, // Copied from original
        workout_log_id: mockOriginalMemory.workout_log_id,   // Copied from original
      }));
      expect(mockFeedbackInsertSelect).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ feedbackId: mockStoredFeedback.id }), "User feedback stored successfully");
      expect(result).toEqual(mockStoredFeedback);
    });

    test('should throw error if feedback database insert fails', async () => {
      const dbError = new Error('Feedback DB insert failed');
      const mockFeedbackInsertSelect = jest.fn().mockResolvedValueOnce({ data: null, error: dbError });
      mockSupabase.insert.mockReturnValueOnce({ select: mockFeedbackInsertSelect });

      await expect(storeUserFeedback(mockSupabase, mockConfig, mockLogger, mockValidators, validUserId, validMemoryId, validFeedback))
        .rejects.toThrow(`Feedback storage failed: ${dbError.message}`);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({ error: dbError.message }), "Feedback storage failed");
    });

    test('should return null if feedback insert returns no data but no error (edge case)', async () => {
      const mockFeedbackInsertSelect = jest.fn().mockResolvedValueOnce({ data: null, error: null });
      mockSupabase.insert.mockReturnValueOnce({ select: mockFeedbackInsertSelect });

      const result = await storeUserFeedback(mockSupabase, mockConfig, mockLogger, mockValidators, validUserId, validMemoryId, validFeedback);
      expect(result).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ feedbackId: undefined }), "User feedback stored successfully");
    });

  });

  describe('storeSystemEvent', () => {
    const validUserId = 'user_event_456';
    const validEventType = 'USER_LOGIN';
    const eventData = { ip_address: '127.0.0.1' };
    const mockStoredEvent = { id: 'event_mem_123', /* ... other fields */ };

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2023-04-01T15:00:00.000Z'));
      // Configure the insert().select() for storeSystemEvent
      const systemEventInsertSelectMock = jest.fn().mockResolvedValue({ data: [mockStoredEvent], error: null });
      mockSupabase.insert.mockReturnValue({ select: systemEventInsertSelectMock });
    });

    afterEach(() => {
      jest.useRealTimers();
      mockSupabase.insert.mockReset();
    });

    // Validation Tests
    test('should throw error for invalid userId', async () => {
      mockValidators.isValidUUID.mockReturnValueOnce(false);
      await expect(storeSystemEvent(mockSupabase, mockConfig, mockLogger, mockValidators, 'invalid-user', validEventType, eventData))
        .rejects.toThrow('Invalid userId format: invalid-user');
    });

    test('should throw error for invalid eventType (using validateMemoryInput)', async () => {
      mockValidators.validateMemoryInput.mockImplementationOnce(() => { throw new Error('Event type cannot be empty'); });
      await expect(storeSystemEvent(mockSupabase, mockConfig, mockLogger, mockValidators, validUserId, '', eventData))
        .rejects.toThrow('Event type cannot be empty');
    });

    // Event Data Handling & Database Insert Tests
    test('should stringify object eventData before storage', async () => {
      const objectEventData = { detail: 'some system info', code: 500 };
      const stringifiedEventData = JSON.stringify(objectEventData);
      // Re-mock insert for this specific call if needed, or ensure beforeEach is sufficient
      // For this test, the specific mock in beforeEach should cover it.

      await storeSystemEvent(mockSupabase, mockConfig, mockLogger, mockValidators, validUserId, validEventType, objectEventData);
      
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ content: stringifiedEventData }));
    });

    test('should insert correctly constructed event record and return data on success', async () => {
      const result = await storeSystemEvent(mockSupabase, mockConfig, mockLogger, mockValidators, validUserId, validEventType, eventData);

      expect(mockSupabase.from).toHaveBeenCalledWith(mockConfig.tableName);
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: validUserId,
        agent_type: 'system',
        content: JSON.stringify(eventData), // Assuming eventData is an object here
        metadata: {
          type: 'system_event',
          eventType: validEventType,
          timestamp: new Date('2023-04-01T15:00:00.000Z').toISOString(),
        },
        created_at: new Date('2023-04-01T15:00:00.000Z').toISOString(),
        is_archived: false,
      }));
      // Get the mock for select() that was returned by insert()
      const insertReturnValue = mockSupabase.insert.mock.results[0].value;
      expect(insertReturnValue.select).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ eventId: mockStoredEvent.id }), "System event stored successfully");
      expect(result).toEqual(mockStoredEvent);
    });

    test('should handle non-object eventData correctly', async () => {
      const stringEventData = "User logged out";
      await storeSystemEvent(mockSupabase, mockConfig, mockLogger, mockValidators, validUserId, validEventType, stringEventData);
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ content: stringEventData }));
    });

    test('should throw error if event database insert fails', async () => {
      const dbError = new Error('Event DB insert failed');
      // Override the insert mock for this test
      const systemEventInsertSelectMockError = jest.fn().mockResolvedValueOnce({ data: null, error: dbError });
      mockSupabase.insert.mockReturnValueOnce({ select: systemEventInsertSelectMockError });

      await expect(storeSystemEvent(mockSupabase, mockConfig, mockLogger, mockValidators, validUserId, validEventType, eventData))
        .rejects.toThrow(`System event storage failed: ${dbError.message}`);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({ error: dbError.message }), "System event storage failed");
    });

    test('should return null if event insert returns no data but no error (edge case)', async () => {
      const systemEventInsertSelectNoData = jest.fn().mockResolvedValueOnce({ data: null, error: null });
      mockSupabase.insert.mockReturnValueOnce({ select: systemEventInsertSelectNoData });

      const result = await storeSystemEvent(mockSupabase, mockConfig, mockLogger, mockValidators, validUserId, validEventType, eventData);
      expect(result).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ eventId: undefined }), "System event stored successfully");
    });
  });
}); 