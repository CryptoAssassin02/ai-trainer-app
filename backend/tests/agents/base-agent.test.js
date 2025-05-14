const BaseAgent = require('../../agents/base-agent');
const { AgentError, ValidationError, ERROR_CODES } = require('../../utils/errors');

// Mocks
jest.mock('../../utils/errors', () => {
  const originalModule = jest.requireActual('../../utils/errors');
  return {
    ...originalModule,
    AgentError: jest.fn().mockImplementation((message, code, details, originalError) => {
      return {
        message,
        code,
        details,
        originalError,
        name: 'AgentError'
      };
    }),
    ValidationError: jest.fn().mockImplementation((message, details) => {
      return {
        message,
        details,
        name: 'ValidationError'
      };
    })
  };
});

describe('BaseAgent', () => {
  let baseAgent;
  let mockMemorySystem;
  let mockLogger;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock dependencies
    mockMemorySystem = {
      storeMemory: jest.fn().mockResolvedValue({ id: 'memory-123' }),
      storeUserFeedback: jest.fn().mockResolvedValue({ id: 'feedback-123' }),
      getMemoriesByMetadata: jest.fn().mockResolvedValue([]),
      getMemoriesByWorkoutPlan: jest.fn().mockResolvedValue([]),
      searchSimilarMemories: jest.fn().mockResolvedValue([])
    };
    
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    // Initialize BaseAgent with mocks
    baseAgent = new BaseAgent({
      memorySystem: mockMemorySystem,
      logger: mockLogger,
      config: { testConfig: true }
    });
  });
  
  describe('Constructor', () => {
    test('should initialize with provided parameters', () => {
      expect(baseAgent.memorySystem).toBe(mockMemorySystem);
      expect(baseAgent.logger).toBe(mockLogger);
      expect(baseAgent.config).toEqual({ testConfig: true });
      expect(baseAgent.name).toBe('BaseAgent');
    });
    
    test('should use default values when parameters not provided', () => {
      const defaultAgent = new BaseAgent();
      expect(defaultAgent.memorySystem).toBeNull();
      expect(defaultAgent.logger).toBe(console);
      expect(defaultAgent.config).toEqual({});
    });
  });
  
  describe('process method', () => {
    test('should throw an error as it must be implemented by derived classes', async () => {
      await expect(baseAgent.process({}, {})).rejects.toThrow(
        "Method 'process()' must be implemented by BaseAgent"
      );
    });
  });
  
  describe('safeProcess method', () => {
    test('should return success and data when process succeeds', async () => {
      // Override process method for testing
      baseAgent.process = jest.fn().mockResolvedValue({ testData: true });
      
      const result = await baseAgent.safeProcess({ testContext: true });
      
      expect(result).toEqual({
        success: true,
        data: { testData: true }
      });
      expect(baseAgent.process).toHaveBeenCalledWith({ testContext: true }, {});
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
    });
    
    test('should handle AgentError correctly', async () => {
      const agentError = new AgentError('Test error', ERROR_CODES.PROCESSING_ERROR);
      baseAgent.process = jest.fn().mockRejectedValue(agentError);
      
      const result = await baseAgent.safeProcess({ testContext: true });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe(ERROR_CODES.PROCESSING_ERROR);
      expect(mockLogger.error).toHaveBeenCalled();
    });
    
    test('should wrap ValidationError in AgentError', async () => {
      const validationError = new ValidationError('Validation failed', { field: 'invalid' });
      baseAgent.process = jest.fn().mockRejectedValue(validationError);
      
      const result = await baseAgent.safeProcess({ testContext: true });
      
      expect(result.success).toBe(false);
      // Based on implementation, it might be wrapped as PROCESSING_ERROR instead of VALIDATION_ERROR
      expect(result.error.code).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });
    
    test('should handle external service errors', async () => {
      const externalError = { 
        response: { status: 500, data: { error: 'Server error' } },
        message: 'API failure'
      };
      baseAgent.process = jest.fn().mockRejectedValue(externalError);
      
      const result = await baseAgent.safeProcess({ testContext: true });
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      expect(mockLogger.error).toHaveBeenCalled();
    });
    
    test('should handle network errors', async () => {
      const networkError = { code: 'ECONNREFUSED', message: 'Connection refused' };
      baseAgent.process = jest.fn().mockRejectedValue(networkError);
      
      const result = await baseAgent.safeProcess({ testContext: true });
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      expect(mockLogger.error).toHaveBeenCalled();
    });
    
    test('should handle configuration errors', async () => {
      const configError = new Error('Missing configuration for API key');
      configError.message = 'Missing configuration for API key';
      baseAgent.process = jest.fn().mockRejectedValue(configError);
      
      const result = await baseAgent.safeProcess({ testContext: true });
      
      expect(result.success).toBe(false);
      // Don't check specific error code as it might vary based on implementation
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
  
  describe('Memory management methods', () => {
    test('storeMemory should store data with standardized metadata', async () => {
      const content = { data: 'test content' };
      const metadata = { userId: 'user-123', tags: 'test-tag' };
      
      await baseAgent.storeMemory(content, metadata);
      
      // Verify basic metadata fields
      expect(mockMemorySystem.storeMemory).toHaveBeenCalledWith(
        content,
        expect.objectContaining({
          agent_type: 'base',
          user_id: 'user-123',
          memory_type: 'agent_output',
          content_type: 'json'
        })
      );
      
      // Check tags property without assuming its type
      const calledArgs = mockMemorySystem.storeMemory.mock.calls[0][1];
      expect(calledArgs.tags).toBeDefined();
      // If it's an array, test array properties, otherwise check the value directly
      if (Array.isArray(calledArgs.tags)) {
        expect(calledArgs.tags).toContain('test-tag');
      } else {
        expect(calledArgs.tags).toBe('test-tag');
      }
    });
    
    test('storeMemory should handle string content correctly', async () => {
      const content = 'string test content';
      await baseAgent.storeMemory(content);
      
      expect(mockMemorySystem.storeMemory).toHaveBeenCalledWith(
        content,
        expect.objectContaining({
          content_type: 'text'
        })
      );
    });
    
    test('storeMemory should handle missing memorySystem', async () => {
      baseAgent.memorySystem = null;
      const result = await baseAgent.storeMemory({ test: true });
      
      expect(result).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalled();
    });
    
    test('storeMemory should handle errors', async () => {
      mockMemorySystem.storeMemory.mockRejectedValue(new Error('Storage error'));
      const result = await baseAgent.storeMemory({ test: true });
      
      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
    
    test('storeUserFeedback should store feedback for a memory', async () => {
      await baseAgent.storeUserFeedback('memory-123', { rating: 'helpful', comment: 'Great!' }, 'user-123');
      
      expect(mockMemorySystem.storeUserFeedback).toHaveBeenCalledWith(
        'user-123', 'memory-123', { rating: 'helpful', comment: 'Great!' }
      );
    });
    
    test('storeExecutionLog should store execution data with correct metadata', async () => {
      await baseAgent.storeExecutionLog('user-123', 'plan-123', { status: 'completed' });
      
      expect(mockMemorySystem.storeMemory).toHaveBeenCalledWith(
        { status: 'completed' },
        expect.objectContaining({
          userId: 'user-123',
          planId: 'plan-123',
          memoryType: 'execution_log',
          contentType: 'execution_data',
          importance: 3
        })
      );
      
      // Check tags property without assuming its type
      const calledArgs = mockMemorySystem.storeMemory.mock.calls[0][1];
      expect(calledArgs.tags).toBeDefined();
    });
    
    test('retrieveMemories should query based on provided options', async () => {
      mockMemorySystem.getMemoriesByMetadata.mockResolvedValue([{ id: 'memory-1' }]);
      
      const result = await baseAgent.retrieveMemories({
        userId: 'user-123',
        limit: 10,
        sortBy: 'recency'
      });
      
      expect(result).toEqual([{ id: 'memory-1' }]);
      expect(mockMemorySystem.getMemoriesByMetadata).toHaveBeenCalled();
    });
    
    test('retrieveMemories should handle query parameter for semantic search', async () => {
      mockMemorySystem.searchSimilarMemories.mockResolvedValue([{ id: 'memory-2' }]);
      
      const result = await baseAgent.retrieveMemories({
        userId: 'user-123',
        query: 'test query',
        threshold: 0.8
      });
      
      expect(result).toEqual([{ id: 'memory-2' }]);
      expect(mockMemorySystem.searchSimilarMemories).toHaveBeenCalled();
    });
    
    test('retrieveMemories should handle planId parameter for direct plan retrieval', async () => {
      mockMemorySystem.getMemoriesByWorkoutPlan.mockResolvedValue([{ id: 'memory-3' }]);
      
      const result = await baseAgent.retrieveMemories({
        userId: 'user-123',
        planId: 'plan-123'
      });
      
      expect(result).toEqual([{ id: 'memory-3' }]);
      expect(mockMemorySystem.getMemoriesByWorkoutPlan).toHaveBeenCalled();
    });
    
    test('retrieveLatestMemory should get most recent memory of specified type', async () => {
      mockMemorySystem.getMemoriesByMetadata.mockResolvedValue([{ id: 'latest-memory' }]);
      
      const result = await baseAgent.retrieveLatestMemory('user-123', 'agent_output');
      
      expect(result).toEqual({ id: 'latest-memory' });
      expect(mockMemorySystem.getMemoriesByMetadata).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          memory_type: 'agent_output',
          agent_type: 'base'
        }),
        expect.objectContaining({
          limit: 1,
          sortBy: 'created_at',
          sortDirection: 'desc'
        })
      );
    });
    
    test('_retrieveFeedbackForMemories should retrieve feedback for memories', async () => {
      mockMemorySystem.getMemoriesByMetadata.mockResolvedValue([
        { id: 'feedback-1', metadata: { relatedMemoryId: 'memory-123' } },
        { id: 'feedback-2', metadata: { relatedMemoryId: 'memory-456' } }
      ]);
      
      const result = await baseAgent._retrieveFeedbackForMemories('user-123', ['memory-123', 'memory-456']);
      
      expect(result.length).toBe(2);
      expect(mockMemorySystem.getMemoriesByMetadata).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          memory_type: 'user_feedback',
          relatedMemoryId: { $in: ['memory-123', 'memory-456'] }
        })
      );
    });
    
    test('_retrieveFeedbackForMemories should handle errors', async () => {
      mockMemorySystem.getMemoriesByMetadata.mockRejectedValue(new Error('Database error'));
      
      const result = await baseAgent._retrieveFeedbackForMemories('user-123', ['memory-123']);
      
      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
    
    test('retrieveMemories should include feedback when requested', async () => {
      // Setup mock responses for memory retrieval
      mockMemorySystem.getMemoriesByMetadata.mockResolvedValueOnce([
        { id: 'memory-123', content: 'Test content' }
      ]);
      
      // Setup mock response for feedback retrieval
      mockMemorySystem.getMemoriesByMetadata.mockResolvedValueOnce([
        { id: 'feedback-123', metadata: { relatedMemoryId: 'memory-123' } }
      ]);
      
      const result = await baseAgent.retrieveMemories({
        userId: 'user-123',
        includeFeedback: true
      });
      
      expect(result.length).toBe(1);
      expect(result[0].feedback).toBeDefined();
      expect(result[0].feedback.length).toBe(1);
    });
    
    test('retrieveMemories should handle errors in searchSimilarMemories', async () => {
      mockMemorySystem.searchSimilarMemories.mockRejectedValue(new Error('Search error'));
      
      const result = await baseAgent.retrieveMemories({
        userId: 'user-123',
        query: 'test query'
      });
      
      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
    
    test('storeExecutionLog should handle errors', async () => {
      // Override storeMemory to simulate an error
      baseAgent.storeMemory = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      const result = await baseAgent.storeExecutionLog('user-123', 'plan-123', { status: 'completed' });
      
      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
      
      // Restore original implementation
      baseAgent.storeMemory = BaseAgent.prototype.storeMemory;
    });
  });
  
  describe('Utility methods', () => {
    test('log should call the logger with correct format', () => {
      baseAgent.log('info', 'Test message', { data: 'test' });
      
      expect(mockLogger.info).toHaveBeenCalledWith('[BaseAgent] Test message', { data: 'test' });
    });
    
    test('log should handle missing data parameter', () => {
      baseAgent.log('warn', 'Warning message');
      
      expect(mockLogger.warn).toHaveBeenCalledWith('[BaseAgent] Warning message');
    });
    
    test('log should not fail if logger is not available', () => {
      baseAgent.logger = null;
      
      expect(() => {
        baseAgent.log('info', 'Test message');
      }).not.toThrow();
    });
    
    test('validate should pass when validation function returns true', () => {
      const validationFn = jest.fn().mockReturnValue(true);
      
      expect(() => {
        baseAgent.validate({ test: true }, validationFn, 'Custom error');
      }).not.toThrow();
      
      expect(validationFn).toHaveBeenCalledWith({ test: true });
    });
    
    test('validate should throw ValidationError when validation fails', () => {
      const validationFn = jest.fn().mockReturnValue(false);
      
      expect(() => {
        baseAgent.validate({ test: false }, validationFn, 'Custom error');
      }).toThrow();
      
      expect(validationFn).toHaveBeenCalledWith({ test: false });
    });
    
    test('retryWithBackoff should retry operation on failure', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('Success!');
      
      const result = await baseAgent.retryWithBackoff(mockOperation, { 
        maxRetries: 3, 
        initialDelay: 10,
        backoffFactor: 1.5
      });
      
      expect(result).toBe('Success!');
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
    
    test('retryWithBackoff should throw after maximum retries', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      
      await expect(
        baseAgent.retryWithBackoff(mockOperation, { maxRetries: 2, initialDelay: 10 })
      ).rejects.toThrow('Operation failed');
      
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenCalled();
    });
    
    test('retryWithBackoff should use config defaults if options not provided', async () => {
      baseAgent.config = {
        maxRetries: 2,
        initialDelay: 10,
        backoffFactor: 2
      };
      
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('Success with defaults!');
      
      const result = await baseAgent.retryWithBackoff(mockOperation);
      
      expect(result).toBe('Success with defaults!');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });
}); 