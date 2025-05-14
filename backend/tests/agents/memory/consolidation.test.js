const { createConsolidatedSummary, archiveMemories, consolidateMemories, pruneOldMemories } = require('../../../agents/memory/consolidation');

// Mock dependencies
const mockOpenAI = {
  completions: {
    create: jest.fn(),
  },
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  // maybeSingle: jest.fn() // Will add later if needed for other functions
};

const mockConfig = {
  tableName: 'agent_memories_test',
};

const mockValidators = {
  isValidUUID: jest.fn(),
  isValidAgentType: jest.fn(),
};

// Mock storage (if consolidateMemories calls it directly, otherwise it's part of dependencies)
jest.mock('../../../agents/memory/storage', () => ({
  storeMemory: jest.fn(),
}));
const { storeMemory } = require('../../../agents/memory/storage');

// Import the module to spy on its functions if needed for specific tests
const consolidation = require('../../../agents/memory/consolidation');

describe('Memory Consolidation', () => {
  beforeEach(() => {
    // Clear all mock instances and calls to constructor and all methods:
    jest.clearAllMocks();
  });

  describe('createConsolidatedSummary', () => {
    it('should return "No memories to consolidate." if contents array is empty', async () => {
      const result = await createConsolidatedSummary(mockOpenAI, [], mockLogger);
      expect(result).toBe('No memories to consolidate.');
      expect(mockLogger.info).toHaveBeenCalledWith('No content provided for consolidation.');
      expect(mockOpenAI.completions.create).not.toHaveBeenCalled();
    });

    it('should return "No memories to consolidate." if contents is null', async () => {
      const result = await createConsolidatedSummary(mockOpenAI, null, mockLogger);
      expect(result).toBe('No memories to consolidate.');
      expect(mockLogger.info).toHaveBeenCalledWith('No content provided for consolidation.');
      expect(mockOpenAI.completions.create).not.toHaveBeenCalled();
    });

    it('should call OpenAI API and return summary on success', async () => {
      const contents = ['memory 1', 'memory 2'];
      const mockSummary = 'This is a consolidated summary.';
      mockOpenAI.completions.create.mockResolvedValueOnce({
        choices: [{ text: mockSummary }],
      });

      const result = await createConsolidatedSummary(mockOpenAI, contents, mockLogger);

      expect(result).toBe(mockSummary);
      expect(mockLogger.info).toHaveBeenCalledWith({ count: contents.length }, 'Creating consolidated memory summary');
      expect(mockOpenAI.completions.create).toHaveBeenCalledWith({
        model: 'text-davinci-003',
        prompt: expect.stringContaining('Memory 1:\nmemory 1\n\nMemory 2:\nmemory 2'),
        max_tokens: 250,
        temperature: 0.5,
      });
      expect(mockLogger.info).toHaveBeenCalledWith({ summaryLength: mockSummary.length }, 'Consolidated summary created');
    });

    it('should return "Summary generation failed." if OpenAI response has no choices', async () => {
      const contents = ['memory 1'];
      mockOpenAI.completions.create.mockResolvedValueOnce({ choices: [] });

      const result = await createConsolidatedSummary(mockOpenAI, contents, mockLogger);
      expect(result).toBe('Summary generation failed.');
      expect(mockLogger.info).toHaveBeenCalledWith({ count: contents.length }, 'Creating consolidated memory summary');
      expect(mockLogger.info).toHaveBeenCalledWith({ summaryLength: "Summary generation failed.".length }, 'Consolidated summary created'); // Implementation detail: logs summary even if it's the failure message
    });
    
    it('should return "Summary generation failed." if OpenAI response choice has no text', async () => {
        const contents = ['memory 1'];
        mockOpenAI.completions.create.mockResolvedValueOnce({ choices: [{ text: null }] });
  
        const result = await createConsolidatedSummary(mockOpenAI, contents, mockLogger);
        expect(result).toBe('Summary generation failed.');
    });

    it('should return error message if OpenAI API call fails', async () => {
      const contents = ['memory 1'];
      const errorMessage = 'OpenAI API error';
      const error = new Error(errorMessage);
      mockOpenAI.completions.create.mockRejectedValueOnce(error);

      // Now expect it to throw
      await expect(createConsolidatedSummary(mockOpenAI, contents, mockLogger))
        .rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        { error: errorMessage },
        'Error creating consolidated summary'
      );
    });
  });

  describe('archiveMemories', () => {
    const tableName = mockConfig.tableName;
    const consolidatedId = 'consolidated-uuid-123';

    beforeAll(() => {
      jest.useFakeTimers('modern');
      jest.setSystemTime(new Date('2023-01-01T12:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should return 0 if memoryIds array is empty', async () => {
      const result = await archiveMemories(mockSupabase, tableName, [], consolidatedId, mockLogger);
      expect(result).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith('No memory IDs provided for archiving.');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should return 0 if memoryIds is null', async () => {
      const result = await archiveMemories(mockSupabase, tableName, null, consolidatedId, mockLogger);
      expect(result).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith('No memory IDs provided for archiving.');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should call Supabase update and return count on success', async () => {
      const memoryIds = ['uuid-1', 'uuid-2'];
      const mockCount = memoryIds.length;
      // Mock the chained Supabase calls
      const mockUpdateResult = { count: mockCount, error: null };
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue(mockUpdateResult),
      });

      const result = await archiveMemories(mockSupabase, tableName, memoryIds, consolidatedId, mockLogger);

      expect(result).toBe(mockCount);
      expect(mockLogger.info).toHaveBeenCalledWith({ count: memoryIds.length, consolidatedId }, 'Archiving memories');
      expect(mockSupabase.from).toHaveBeenCalledWith(tableName);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        is_archived: true,
        archived_at: new Date('2023-01-01T12:00:00Z').toISOString(),
        consolidated_into: consolidatedId,
      });
      expect(mockSupabase.from().update().in).toHaveBeenCalledWith('id', memoryIds);
      expect(mockLogger.info).toHaveBeenCalledWith({ count: mockCount, consolidatedId }, 'Memories archived successfully');
    });

    it('should throw error if Supabase update fails', async () => {
      const memoryIds = ['uuid-1'];
      const errorMessage = 'Supabase update error';
      // Mock the chained Supabase calls to return an error
      const mockUpdateResult = { count: null, error: { message: errorMessage } };
       mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue(mockUpdateResult),
      });

      await expect(archiveMemories(mockSupabase, tableName, memoryIds, consolidatedId, mockLogger))
        .rejects.toThrow(`Archiving memories failed: ${errorMessage}`);

      expect(mockLogger.error).toHaveBeenCalledWith(
        { consolidatedId, error: errorMessage },
        'Archiving memories failed'
      );
    });

    it('should re-throw error if an unexpected error occurs during update logic', async () => {
      const memoryIds = ['uuid-1'];
      const unexpectedErrorMessage = 'Unexpected DB error';
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        // Make .in() itself throw, not just return an error object
        in: jest.fn().mockRejectedValue(new Error(unexpectedErrorMessage)), 
      });

      await expect(archiveMemories(mockSupabase, tableName, memoryIds, consolidatedId, mockLogger))
        .rejects.toThrow(unexpectedErrorMessage);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        { consolidatedId, error: unexpectedErrorMessage },
        'Error archiving memories'
      );
    });

  });

  describe('consolidateMemories', () => {
    const userId = 'user-uuid-456';
    const dependencies = {
      supabase: mockSupabase,
      openai: mockOpenAI,
      config: mockConfig,
      logger: mockLogger,
      validators: mockValidators,
    };

    beforeEach(() => {
      mockValidators.isValidUUID.mockReturnValue(true);
      mockValidators.isValidAgentType.mockReturnValue(true);
      storeMemory.mockClear();
      mockOpenAI.completions.create.mockClear();
      mockSupabase.from.mockReset();
    });

    afterEach(() => {
    });

    it('should throw error if userId is invalid', async () => {
      mockValidators.isValidUUID.mockReturnValueOnce(false);
      await expect(consolidateMemories(dependencies, 'invalid-user-id', {}))
        .rejects.toThrow('Invalid userId format: invalid-user-id');
    });

    it('should throw error if agentType is invalid', async () => {
      mockValidators.isValidAgentType.mockReturnValueOnce(false);
      await expect(consolidateMemories(dependencies, userId, { agentType: 'invalid-type' }))
        .rejects.toThrow('Invalid agent type: invalid-type');
    });

    it('should log info and return null if no old memories are found', async () => {
      const mockSelectResult = { data: [], error: null };
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockSelectResult),
      }));

      const result = await consolidateMemories(dependencies, userId, { days: 30 });

      expect(result).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ userId, days: 30 }), 'No memories older than threshold found for consolidation');
    });

    it('should throw error if fetching old memories fails', async () => {
      const fetchErrorMessage = 'DB fetch error';
      const mockSelectResult = { data: null, error: { message: fetchErrorMessage } };
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockSelectResult),
      }));

      await expect(consolidateMemories(dependencies, userId, {}))
        .rejects.toThrow(`Consolidation failed: ${fetchErrorMessage}`);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({ error: fetchErrorMessage }), 'Consolidation failed: Error fetching old memories');
    });

    it('should correctly filter by agentType and other conditions', async () => {
      const agentType = 'testagent';
      const days = 30;
      const maxToConsolidate = 10;
      const mockFinalResult = { data: [], error: null }; // Renamed for clarity

      const eqSpy = jest.fn();
      const ltSpy = jest.fn();
      const orderSpy = jest.fn();
      const limitSpy = jest.fn();
      
      const supabaseChainable = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(function(field, value) { 
          eqSpy(field, value);
          return this; 
        }),
        lt: jest.fn(function(field, value) {
          ltSpy(field, value);
          return this;
        }),
        order: jest.fn(function(field, options) {
          orderSpy(field, options);
          return this;
        }),
        limit: jest.fn(function(value) { // limit should also return 'this' for chaining
          limitSpy(value);
          return this;
        }),
        then: jest.fn((resolve, reject) => { // Make the chainable object itself thenable for `await query`
          resolve(mockFinalResult);
        }),
      };

      mockSupabase.from.mockImplementation(() => supabaseChainable);

      const thresholdDate = new Date(); // Date will be set by fake timers
      thresholdDate.setDate(thresholdDate.getDate() - days);

      await consolidateMemories(dependencies, userId, { agentType, days, maxToConsolidate });
      
      expect(mockSupabase.from).toHaveBeenCalledWith(mockConfig.tableName);
      expect(supabaseChainable.select).toHaveBeenCalledWith('id, content');
      
      // Check all eq calls
      expect(eqSpy).toHaveBeenCalledWith('user_id', userId);
      expect(eqSpy).toHaveBeenCalledWith('is_archived', false);
      expect(eqSpy).toHaveBeenCalledWith('agent_type', agentType.toLowerCase()); // This is the key addition
      
      expect(ltSpy).toHaveBeenCalledWith('created_at', thresholdDate.toISOString());
      expect(orderSpy).toHaveBeenCalledWith('created_at', { ascending: true });
      expect(limitSpy).toHaveBeenCalledWith(maxToConsolidate);
      expect(supabaseChainable.then).toHaveBeenCalled(); // Verify the await happened on our chainable
    });

    it('should successfully consolidate memories on happy path', async () => {
      const oldMemoriesData = [
        { id: 'old-uuid-1', content: 'Memory one content', created_at: '2022-12-01T00:00:00Z' },
        { id: 'old-uuid-2', content: 'Memory two content', created_at: '2022-12-15T00:00:00Z' },
      ];
      const mockFetchResult = { data: oldMemoriesData, error: null };
      const mockArchiveResult = { count: oldMemoriesData.length, error: null };
      
      // Mock for the SELECT fetch
      const fetchChainable = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve(mockFetchResult))
      };
      // Mock for the UPDATE archive
      const archiveChainable = {
          update: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue(mockArchiveResult) // archiveMemories awaits this
      };
      
      // Make supabase.from return the correct chainable mock based on usage pattern
      // This is tricky; let's mock it specific to the expected calls sequence
      mockSupabase.from
        .mockImplementationOnce(() => fetchChainable) // First call in consolidateMemories is SELECT
        .mockImplementationOnce(() => archiveChainable); // Second call is UPDATE via archiveMemories

      const mockSummaryText = 'Consolidated summary of memories.';
      // Mock the underlying OpenAI call directly
      mockOpenAI.completions.create.mockResolvedValueOnce({ choices: [{ text: mockSummaryText }] });

      const mockConsolidatedMemoryRecord = {
        id: 'new-consolidated-uuid',
        content: mockSummaryText,
      };
      // Mock the storeMemory call directly
      storeMemory.mockResolvedValue(mockConsolidatedMemoryRecord);

      // archiveMemories is no longer spied on, its successful result is mocked via archiveChainable

      const result = await consolidateMemories(dependencies, userId, { agentType: 'specificagent' });

      expect(result).toEqual(mockConsolidatedMemoryRecord);
      // Verify underlying mocks were called
      expect(mockOpenAI.completions.create).toHaveBeenCalledTimes(1);
      expect(storeMemory).toHaveBeenCalledTimes(1);
      expect(storeMemory).toHaveBeenCalledWith(
        mockSupabase, mockConfig, mockLogger, mockValidators, userId, 'specificagent', mockSummaryText, 
        expect.objectContaining({ type: 'consolidated_summary' })
      );
      // Verify the archive update was called
      expect(mockSupabase.from).toHaveBeenCalledTimes(2); // Once for select, once for update
      expect(archiveChainable.update).toHaveBeenCalled();
      expect(archiveChainable.in).toHaveBeenCalledWith('id', ['old-uuid-1', 'old-uuid-2']);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ consolidatedId: mockConsolidatedMemoryRecord.id }), 'Memory consolidation completed successfully');
    });

    it('should use "system" as agentType for storing summary if original agentType option was null', async () => {
        const oldMemoriesData = [{ id: 'old-uuid-1', content: 'Memory one', created_at: '2022-01-01T00:00:00Z' }];
        const mockFetchResult = { data: oldMemoriesData, error: null };
        const mockArchiveResult = { count: oldMemoriesData.length, error: null };

        // Mock for the SELECT fetch
        const fetchChainable = { then: jest.fn((resolve) => resolve(mockFetchResult)) };
        Object.assign(fetchChainable, { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), lt: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis() });
        
        // Mock for the UPDATE archive
        const archiveChainable = { update: jest.fn().mockReturnThis(), in: jest.fn().mockResolvedValue(mockArchiveResult) };

        mockSupabase.from
          .mockImplementationOnce(() => fetchChainable)
          .mockImplementationOnce(() => archiveChainable);

        mockOpenAI.completions.create.mockResolvedValueOnce({ choices: [{ text: 'summary' }] });
        const mockStoredSummary = { id: 'new-id' };
        storeMemory.mockResolvedValue(mockStoredSummary);
  
        await consolidateMemories(dependencies, userId, { agentType: null }); // Explicitly pass agentType: null
  
        expect(storeMemory).toHaveBeenCalledWith(
          expect.anything(), expect.anything(), expect.anything(), expect.anything(),
          userId,
          'system', // Key assertion
          'summary',
          expect.objectContaining({ consolidatedAgentType: null })
        );
         // Verify archive call happened
        expect(archiveChainable.in).toHaveBeenCalledWith('id', ['old-uuid-1']);
      });

    it('should throw error if createConsolidatedSummary throws', async () => {
        const oldMemoriesData = [{ id: 'old-uuid-1', content: 'Memory one', created_at: '2022-01-01T00:00:00Z' }];
        const mockFetchResult = { data: oldMemoriesData, error: null };
        // Use the robust mock with call counter for fetch
        const fetchChainable = {
            select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), lt: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(),
            then: jest.fn((resolve) => resolve(mockFetchResult))
        };
        const archiveChainable = { update: jest.fn().mockReturnThis(), in: jest.fn().mockResolvedValue({ count: 0, error: null }) }; 
        let callCount = 0;
        mockSupabase.from.mockImplementation((tableName) => {
            callCount++;
            if (callCount === 1) return fetchChainable;
            return archiveChainable; 
        });
        
        const summaryError = new Error('Summary creation failed');
        // Spy on the consolidate function itself for this test - REVERTING THIS
        // const createSummarySpy = jest.spyOn(consolidation, 'createConsolidatedSummary').mockRejectedValueOnce(summaryError);
        mockOpenAI.completions.create.mockRejectedValueOnce(summaryError); // Mock underlying OpenAI call to fail

        await expect(consolidateMemories(dependencies, userId, {}))
            .rejects.toThrow(summaryError); // Error should propagate
        
        expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({ error: summaryError.message }), 'Error during memory consolidation');
        expect(storeMemory).not.toHaveBeenCalled();
        expect(callCount).toBe(1); // Ensure only the fetch call was made to supabase.from
        
        // createSummarySpy.mockRestore(); // Restore the spy - REMOVED SPY
    });

    it('should throw error if storeMemory returns null', async () => {
        const oldMemoriesData = [{ id: 'old-uuid-1', content: 'Memory one', created_at: '2022-01-01T00:00:00Z' }];
        const mockFetchResult = { data: oldMemoriesData, error: null };
        // Use the robust mock
        const fetchChainable = {
            select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), lt: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(),
            then: jest.fn((resolve) => resolve(mockFetchResult))
        };
        // Provide both mocks even if archive isn't expected to be called
        const archiveChainable = { update: jest.fn().mockReturnThis(), in: jest.fn().mockResolvedValue({ count: 0, error: null }) }; 
        
        let callCount = 0;
        mockSupabase.from.mockImplementation((tableName) => {
            callCount++;
            if (callCount === 1) return fetchChainable;
            return archiveChainable; 
        });
            
        mockOpenAI.completions.create.mockResolvedValueOnce({ choices: [{ text: 'summary' }] });
        
        storeMemory.mockResolvedValue(null); // Mock storeMemory failure

        await expect(consolidateMemories(dependencies, userId, {}))
            .rejects.toThrow('Consolidation failed: Summary storage error');
        
        // Assert the *specific* log call first
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.objectContaining({ userId, agentType: null }),
            'Consolidation failed: Could not store the summary memory'
        );
        // Optionally assert the second, more generic log call from the outer catch
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Consolidation failed: Summary storage error' }), 
            'Error during memory consolidation'
        );
        
        expect(archiveChainable.update).not.toHaveBeenCalled(); 
    });

    it('should throw error if storeMemory throws an error', async () => {
        const oldMemoriesData = [{ id: 'old-uuid-1', content: 'Memory one', created_at: '2022-01-01T00:00:00Z' }];
        const mockFetchResult = { data: oldMemoriesData, error: null };
        // Use the robust mock
        const fetchChainable = {
            select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), lt: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(),
            then: jest.fn((resolve) => resolve(mockFetchResult))
        };
        mockSupabase.from.mockImplementation(() => fetchChainable);
        mockOpenAI.completions.create.mockResolvedValueOnce({ choices: [{ text: 'summary' }] });
        
        const storeError = new Error('Store memory DB error')
        storeMemory.mockRejectedValue(storeError); // Mock storeMemory failure

        await expect(consolidateMemories(dependencies, userId, {}))
            .rejects.toThrow(storeError); // Error should propagate
        
        expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({ error: storeError.message }), 'Error during memory consolidation');
    });

    it('should throw error if archiveMemories fails', async () => {
        const oldMemoriesData = [{ id: 'old-uuid-1', content: 'Memory one', created_at: '2022-01-01T00:00:00Z' }];
        const mockFetchResult = { data: oldMemoriesData, error: null };
        const mockArchiveError = new Error('Archive DB error');
        
        const fetchChainable = { /* ... thenable fetch mock ... */ then: jest.fn((resolve) => resolve(mockFetchResult)) };
        Object.assign(fetchChainable, { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), lt: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis() });
        
        // Mock for the UPDATE archive to fail
        const archiveChainable = { update: jest.fn().mockReturnThis(), in: jest.fn().mockRejectedValue(mockArchiveError) }; 

        mockSupabase.from
          .mockImplementationOnce(() => fetchChainable)
          .mockImplementationOnce(() => archiveChainable);

        mockOpenAI.completions.create.mockResolvedValueOnce({ choices: [{ text: 'summary' }] });
        const mockStoredSummary = { id: 'new-id' };
        storeMemory.mockResolvedValue(mockStoredSummary);

        await expect(consolidateMemories(dependencies, userId, {}))
            .rejects.toThrow(mockArchiveError); // Error should propagate

        expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({ error: mockArchiveError.message }), 'Error during memory consolidation');
    });

  });

  describe('pruneOldMemories', () => {
    const userId = 'user-uuid-789';
    const days = 180;
    const dependencies = { // Re-declare for clarity within this describe block
      supabase: mockSupabase,
      openai: mockOpenAI, // Not used by prune, but part of standard deps
      config: mockConfig,
      logger: mockLogger,
      validators: mockValidators,
    };

    beforeAll(() => {
      jest.useFakeTimers('modern');
      jest.setSystemTime(new Date('2024-01-01T00:00:00Z')); // Use a consistent time
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    beforeEach(() => {
      // Reset mocks relevant to pruneOldMemories
      mockValidators.isValidUUID.mockReturnValue(true);
      mockSupabase.from.mockReset(); 
    });

    it('should throw error if userId is invalid', async () => {
      mockValidators.isValidUUID.mockReturnValueOnce(false);
      await expect(pruneOldMemories(dependencies, 'invalid-user', days))
        .rejects.toThrow('Invalid userId format: invalid-user');
    });

    it('should call Supabase delete with correct filters and return count on success', async () => {
      const mockDeleteResult = { count: 5, error: null };
      const eqSpy = jest.fn();
      const ltSpy = jest.fn();
      const deleteChainable = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn(function(field, value) { eqSpy(field, value); return this; }),
        lt: jest.fn(function(field, value) { ltSpy(field, value); return this; }),
        then: jest.fn((resolve) => resolve(mockDeleteResult)), // Mocking the await part
      };
      // Need to intercept the delete() call itself
      const deleteSpy = jest.spyOn(deleteChainable, 'delete');
      // Mock the start of the chain
      mockSupabase.from.mockImplementation(() => deleteChainable); 
      
      const pruneThresholdDate = new Date('2024-01-01T00:00:00Z');
      pruneThresholdDate.setDate(pruneThresholdDate.getDate() - days);
      const expectedThresholdISO = pruneThresholdDate.toISOString();

      const result = await pruneOldMemories(dependencies, userId, days);

      expect(result).toBe(5);
      expect(mockLogger.info).toHaveBeenCalledWith({ userId, days }, 'Starting memory pruning process');
      expect(mockSupabase.from).toHaveBeenCalledWith(mockConfig.tableName);
      expect(deleteSpy).toHaveBeenCalled();
      expect(eqSpy).toHaveBeenCalledWith('user_id', userId);
      expect(eqSpy).toHaveBeenCalledWith('is_archived', true);
      expect(ltSpy).toHaveBeenCalledWith('archived_at', expectedThresholdISO);
      expect(mockLogger.info).toHaveBeenCalledWith({ userId, count: 5 }, 'Memory pruning completed successfully');
      
      deleteSpy.mockRestore();
    });
    
    it('should handle zero count correctly on success', async () => {
        const mockDeleteResult = { count: 0, error: null }; // Test zero count
        const deleteChainable = {
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            lt: jest.fn().mockReturnThis(),
            then: jest.fn((resolve) => resolve(mockDeleteResult)),
        };
        mockSupabase.from.mockImplementation(() => deleteChainable);

        const result = await pruneOldMemories(dependencies, userId, days);
        expect(result).toBe(0);
        expect(mockLogger.info).toHaveBeenCalledWith({ userId, count: 0 }, 'Memory pruning completed successfully');
    });

    it('should throw error if Supabase delete fails', async () => {
      const deleteErrorMessage = 'DB delete error';
      const mockDeleteResult = { count: null, error: { message: deleteErrorMessage } };
      const deleteChainable = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve(mockDeleteResult)), // Mock the resolution
      };
      mockSupabase.from.mockImplementation(() => deleteChainable);

      await expect(pruneOldMemories(dependencies, userId, days))
        .rejects.toThrow(`Memory pruning failed: ${deleteErrorMessage}`);
      expect(mockLogger.error).toHaveBeenCalledWith({ userId, error: deleteErrorMessage }, 'Memory pruning failed');
    });
    
     it('should re-throw unexpected errors during delete logic', async () => {
      const unexpectedError = new Error('Unexpected prune error');
       const deleteChainable = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        // Make lt throw the error
        lt: jest.fn().mockImplementation(() => { throw unexpectedError; }), 
      };
      mockSupabase.from.mockImplementation(() => deleteChainable);

      await expect(pruneOldMemories(dependencies, userId, days))
        .rejects.toThrow(unexpectedError);
      expect(mockLogger.error).toHaveBeenCalledWith({ userId, error: unexpectedError.message }, 'Error during memory pruning');
    });

  });
}); 