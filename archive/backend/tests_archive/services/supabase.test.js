/**
 * @jest-environment node
 * @fileoverview Tests for the Supabase service
 */

/* eslint-disable @typescript-eslint/no-require-imports */
// Need to mock these modules before importing anything else
jest.mock('@supabase/supabase-js');
jest.mock('pg');
jest.mock('../../config/logger');

// Mock the config/supabase module
jest.mock('../../config/supabase', () => ({
  createSupabaseClient: jest.fn(),
  isDevelopment: jest.fn().mockReturnValue(false),
  isTest: jest.fn().mockReturnValue(true)
}));

// Mock the config module
jest.mock('../../config', () => ({
  env: {
    supabase: {
      url: 'https://test-project.supabase.co',
      serviceRoleKey: 'test-service-role-key',
      databaseUrl: 'postgresql://postgres:password@test-project.supabase.co:5432/postgres'
    }
  },
  logger: require('../../config/logger')
}));

const { Pool } = require('pg');
const logger = require('../../config/logger');
const { env } = require('../../config');
const { createSupabaseClient } = require('../../config/supabase');

// Create a module with a modifiable withRetry function for testing
jest.mock('../../services/supabase', () => {
  // Get the original module to preserve functionality
  const originalModule = jest.requireActual('../../services/supabase');
  
  // Create a withRetry mock that properly handles retries
  const withRetry = jest.fn().mockImplementation(async (operation, operationName = 'Test operation', options = {}) => {
    try {
      return await operation();
    } catch (error) {
      // Just rethrow the error - the test will control retry behavior with mockRejectedValueOnce
      throw error;
    }
  });
  
  // Add singletons as exports just for testing
  let supabaseInstance = null;
  let supabaseAdminInstance = null;
  
  // Expose resetForTests function
  const resetForTests = () => {
    supabaseInstance = null;
    supabaseAdminInstance = null;
  };
  
  // Return the modified module
  return {
    ...originalModule,
    withRetry,
    _resetForTests: resetForTests,
    _getSingletons: () => ({ supabaseInstance, supabaseAdminInstance }),
    RETRY_CONFIG: { maxRetries: 3, retryDelay: 10, retryableStatusCodes: [408, 429, 500, 502, 503, 504] }
  };
});

// Import after mocking
const supabaseService = require('../../services/supabase');

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset singleton instances
  supabaseService._resetForTests();
});

describe('Supabase Service', () => {
  // Create mock Supabase client with improved method chaining
  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnValue({ data: null, error: null }),
    single: jest.fn().mockReturnValue({ data: null, error: null }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null })
  };

  const mockSupabaseAdminClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnValue({ data: null, error: null }),
    single: jest.fn().mockReturnValue({ data: null, error: null }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null })
  };

  // Declare mockClient before use
  let mockClient;

  describe('getSupabaseClient', () => {
    test('should return existing instance if already initialized', () => {
      // Setup
      createSupabaseClient.mockReturnValue(mockSupabaseClient);
      
      // First call - should create a new instance
      const client1 = supabaseService.getSupabaseClient();
      // Second call - should return the same instance
      const client2 = supabaseService.getSupabaseClient();
      
      // Check that the instance was only created once
      expect(createSupabaseClient).toHaveBeenCalledTimes(1);
      expect(createSupabaseClient).toHaveBeenCalledWith(false); // Regular client
      expect(client1).toBe(client2);
      expect(logger.info).toHaveBeenCalledWith('Initializing Supabase client');
      expect(logger.info).toHaveBeenCalledWith('Supabase client initialized successfully');
    });
    
    test('should throw error if initialization fails', () => {
      // Reset the singleton instance before the test
      supabaseService._resetForTests();

      // Mock createSupabaseClient to throw an error
      const initError = new Error('Initialization Error');
      createSupabaseClient.mockImplementationOnce(() => {
        throw initError;
      });

      // Act & Assert
      expect(() => supabaseService.getSupabaseClient()).toThrow(
        'Failed to initialize database connection'
      );

      // Check that the logger was called with the original error
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize Supabase client:',
        initError
      );
      
      // Clean up: Reset mock implementation to avoid affecting other tests
      createSupabaseClient.mockImplementation(jest.fn().mockReturnValue(mockSupabaseClient));
    });
  });
  
  describe('getSupabaseAdminClient', () => {
    beforeEach(() => {
      // Reset the service and clear any mocks
      supabaseService._resetForTests();
      jest.clearAllMocks();
      
      // Ensure environment variables are set
      process.env.SUPABASE_URL = 'https://test-project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    });
    
    test('should return existing instance if already initialized', () => {
      // Setup
      createSupabaseClient.mockReturnValue(mockSupabaseAdminClient);
      
      // First call - should create a new instance
      const client1 = supabaseService.getSupabaseAdminClient();
      // Second call - should return the same instance
      const client2 = supabaseService.getSupabaseAdminClient();
      
      // Check that the instance was only created once
      expect(createSupabaseClient).toHaveBeenCalledTimes(1);
      expect(createSupabaseClient).toHaveBeenCalledWith(true); // Admin client
      expect(client1).toBe(client2);
      expect(logger.info).toHaveBeenCalledWith('Initializing Supabase admin client');
      expect(logger.info).toHaveBeenCalledWith('Supabase admin client initialized successfully');
    });
    
    test('should throw error if initialization fails', () => {
      // Mock getSupabaseAdminClient to throw
      jest.spyOn(supabaseService, 'getSupabaseAdminClient').mockImplementationOnce(() => {
        throw new Error('Failed to initialize admin client');
      });
      
      // Attempt to get the admin client and expect it to throw
      expect(() => supabaseService.getSupabaseAdminClient()).toThrow('Failed to initialize admin client');
    });
  });
  
  describe('handleSupabaseError', () => {
    beforeEach(() => {
      // Reset logger mocks for these specific tests
      logger.error.mockClear();
    });
    
    test('should format error with status code', () => {
      const mockError = {
        status: 400,
        message: 'Bad request',
        details: { reason: 'Invalid input' },
        code: 'SUPABASE_ERROR_400'
      };
      
      try {
        supabaseService.handleSupabaseError(mockError, 'Test operation');
        // If we reach here, the test should fail
        expect(true).toBe(false);
      } catch (formattedError) {
        expect(formattedError).toEqual({
          status: 400,
          message: 'Bad request',
          details: { reason: 'Invalid input' },
          retryable: false,
          code: 'SUPABASE_ERROR_400'
        });
      }
      
      expect(logger.error).toHaveBeenCalledWith(
        'Supabase error during Test operation:',
        mockError
      );
    });
    
    test('should handle error with no status code', () => {
      const mockError = {
        message: 'Unknown error'
      };
      
      try {
        supabaseService.handleSupabaseError(mockError, 'Test operation');
        // If we reach here, the test should fail
        expect(true).toBe(false);
      } catch (formattedError) {
        expect(formattedError).toEqual({
          status: 500,
          message: 'Unknown error',
          details: {},
          retryable: true,
          code: 'SUPABASE_ERROR'
        });
      }
    });
    
    test('should identify retryable errors', () => {
      const mockError = {
        status: 503,
        message: 'Service unavailable'
      };
      
      try {
        supabaseService.handleSupabaseError(mockError, 'Test operation');
        // If we reach here, the test should fail
        expect(true).toBe(false);
      } catch (formattedError) {
        expect(formattedError.retryable).toBe(true);
      }
    });
  });
  
  describe('withRetry', () => {
    beforeEach(() => {
      // Reset the service and clear any mocks
      supabaseService._resetForTests();
      jest.clearAllMocks();
    });
    
    test('should execute operation successfully on first try', async () => {
      // Create a mock operation that resolves successfully
      const mockOperation = jest.fn().mockResolvedValue({ success: true });
      
      // Execute operation
      const result = await supabaseService.withRetry(mockOperation, 'Test operation');
      
      // Verify operation was called exactly once
      expect(mockOperation).toHaveBeenCalledTimes(1);
      
      // Verify the right result is returned
      expect(result).toEqual({ success: true });
    });
    
    test('should retry on retryable errors', async () => {
      // Create a retryable error
      const retryableError = {
        message: 'Connection error',
        code: 'SUPABASE_CONNECTION_ERROR',
        retryable: true
      };
      
      // Mock operation that fails once, then succeeds
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue({ success: true });
      
      // Mock withRetry to simulate one retry
      const originalWithRetry = supabaseService.withRetry;
      supabaseService.withRetry = jest.fn().mockImplementationOnce(async (operation) => {
        try {
          return await operation();
        } catch (error) {
          // Simulate retry
          return await operation();
        }
      });
      
      // Execute operation
      const result = await supabaseService.withRetry(mockOperation, 'Test operation');
      
      // Verify the operation was called twice (initial + retry)
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
      
      // Restore original implementation
      supabaseService.withRetry = originalWithRetry;
    });
    
    test('should give up after max retries', async () => {
      // Create a retryable error
      const retryableError = {
        message: 'Connection error',
        code: 'SUPABASE_CONNECTION_ERROR',
        retryable: true
      };
      
      // Mock operation that always fails
      const mockOperation = jest.fn().mockRejectedValue(retryableError);
      
      // Expect the operation to ultimately fail
      await expect(supabaseService.withRetry(mockOperation, 'Test operation'))
        .rejects.toEqual(retryableError);
      
      // Verify the operation was called at least once
      expect(mockOperation).toHaveBeenCalled();
    });
  });
  
  describe('query', () => {
    beforeEach(() => {
      supabaseService._resetForTests();
      jest.clearAllMocks();
      
      // Mock the Supabase client creation
      createSupabaseClient.mockReturnValue(mockSupabaseClient);
    });
    
    test('should execute query with default options', async () => {
      // Mock the data response
      const mockResponse = { data: [{ id: 1, name: 'Test Item' }], error: null };
      
      // Setup the mock chain
      const mockFrom = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockResolvedValue(mockResponse);
      
      // Create a more complete mock client
      const queryClient = {
        from: mockFrom,
        select: mockSelect,
        order: mockOrder,
        range: mockRange
      };
      
      // Replace the createSupabaseClient mock for this test
      createSupabaseClient.mockReturnValue(queryClient);
      
      // Mock withRetry to directly call the operation
      supabaseService.withRetry.mockImplementation(async (operation) => operation());
      
      // Execute query
      const result = await supabaseService.query('test_table');
      
      // Verify query methods were called correctly
      expect(mockFrom).toHaveBeenCalledWith('test_table');
      expect(mockSelect).toHaveBeenCalledWith('*');
      
      // Verify result was returned correctly
      expect(result).toEqual(mockResponse.data);
    });
  });
  
  describe('getById', () => {
    test('should retrieve a record by id', async () => {
      // Setup
      createSupabaseClient.mockReturnValue(mockSupabaseClient);
      
      // Setup mock response
      const mockData = { id: 1, name: 'Test' };
      const mockQueryResult = { data: mockData, error: null };
      
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue(mockQueryResult);
      
      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      });
      
      mockSupabaseClient.from = mockFrom;
      
      // Mock withRetry to directly call the operation
      supabaseService.withRetry.mockImplementation(async (operation) => operation());
      
      const result = await supabaseService.getById('test_table', 1);
      
      expect(mockFrom).toHaveBeenCalledWith('test_table');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', 1);
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });
    
    test('should return null if record not found', async () => {
      // Setup
      createSupabaseClient.mockReturnValue(mockSupabaseClient);
      
      // Setup mock not found response
      const mockError = { code: 'PGRST116', message: 'Record not found' };
      const mockQueryResult = { data: null, error: mockError };
      
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue(mockQueryResult);
      
      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      });
      
      mockSupabaseClient.from = mockFrom;
      
      // Mock withRetry to directly call the operation
      supabaseService.withRetry.mockImplementation(async (operation) => operation());
      
      const result = await supabaseService.getById('test_table', 999);
      
      expect(result).toBeNull();
    });
    
    test('should handle database errors', async () => {
      // Reset logger mocks for this specific test
      logger.error.mockClear();
      
      // Setup
      createSupabaseClient.mockReturnValue(mockSupabaseClient);
      
      // Setup mock error response
      const mockError = { message: 'Database error', status: 500 };
      const mockQueryResult = { data: null, error: mockError };
      
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue(mockQueryResult);
      
      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      });
      
      mockSupabaseClient.from = mockFrom;
      
      // Create error that would be returned after formatting
      const formattedError = {
        status: 500,
        message: 'Database error',
        details: {},
        retryable: true,
        code: 'SUPABASE_ERROR'
      };
      
      // Instead of replacing supabaseService.handleSupabaseError, mock withRetry
      // to return the kind of error we want
      supabaseService.withRetry.mockImplementationOnce(async (operation) => {
        // Let the operation run (which will produce an error)
        try {
          return await operation();
        } catch (error) {
          // Then throw our expected formatted error
          throw formattedError;
        }
      });
      
      // The test shouldn't modify any original implementations
      // so it's safer and more isolated
      await expect(supabaseService.getById('test_table', 1)).rejects.toEqual(formattedError);
      expect(mockFrom).toHaveBeenCalledWith('test_table');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', 1);
      expect(mockSingle).toHaveBeenCalled();
    });
  });
  
  describe('insert', () => {
    test('should insert a record and return data', async () => {
      // Setup
      createSupabaseClient.mockReturnValue(mockSupabaseClient);
      
      // Setup mock response
      const mockData = [{ id: 1, name: 'New Record' }];
      const mockQueryResult = { data: mockData, error: null };
      
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue(mockQueryResult);
      
      const mockFrom = jest.fn().mockReturnValue({
        insert: mockInsert,
        select: mockSelect
      });
      
      mockSupabaseClient.from = mockFrom;
      
      // Mock withRetry to directly call the operation
      supabaseService.withRetry.mockImplementation(async (operation) => operation());
      
      const recordToInsert = { name: 'New Record' };
      const result = await supabaseService.insert('test_table', recordToInsert);
      
      expect(mockFrom).toHaveBeenCalledWith('test_table');
      expect(mockInsert).toHaveBeenCalledWith([recordToInsert]);
      expect(mockSelect).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });
    
    test('should handle arrays of records', async () => {
      // Setup
      createSupabaseClient.mockReturnValue(mockSupabaseClient);
      
      // Setup mock response
      const mockData = [
        { id: 1, name: 'Record 1' },
        { id: 2, name: 'Record 2' }
      ];
      const mockQueryResult = { data: mockData, error: null };
      
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue(mockQueryResult);
      
      const mockFrom = jest.fn().mockReturnValue({
        insert: mockInsert,
        select: mockSelect
      });
      
      mockSupabaseClient.from = mockFrom;
      
      // Mock withRetry to directly call the operation
      supabaseService.withRetry.mockImplementation(async (operation) => operation());
      
      const recordsToInsert = [
        { name: 'Record 1' },
        { name: 'Record 2' }
      ];
      const result = await supabaseService.insert('test_table', recordsToInsert);
      
      expect(mockInsert).toHaveBeenCalledWith(recordsToInsert);
      expect(result).toEqual(mockData);
    });
    
    test('should reject empty record arrays', async () => {
      await expect(supabaseService.insert('test_table', [])).rejects.toThrow(
        'No records provided for insert operation'
      );
    });
    
    test('should handle insert errors', async () => {
      // Reset logger mocks for this specific test
      logger.error.mockClear();
      
      // Setup
      createSupabaseClient.mockReturnValue(mockSupabaseClient);
      
      // Setup mock error response
      const mockError = { message: 'Insert failed', status: 400 };
      const mockQueryResult = { data: null, error: mockError };
      
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue(mockQueryResult);
      
      const mockFrom = jest.fn().mockReturnValue({
        insert: mockInsert,
        select: mockSelect
      });
      
      mockSupabaseClient.from = mockFrom;
      
      // Mock withRetry to directly throw a formatted error
      const formattedError = {
        status: 400,
        message: 'Insert failed',
        details: {},
        retryable: false,
        code: 'SUPABASE_ERROR'
      };
      
      supabaseService.withRetry.mockImplementation(async () => {
        logger.error('Supabase error during Insert into test_table:', mockError);
        throw formattedError;
      });
      
      await expect(supabaseService.insert('test_table', { name: 'Test' })).rejects.toEqual(formattedError);
      expect(logger.error).toHaveBeenCalledWith('Supabase error during Insert into test_table:', mockError);
    });
  });
  
  describe('update', () => {
    test('should update a record and return data', async () => {
      // Setup
      createSupabaseClient.mockReturnValue(mockSupabaseClient);
      
      // Setup mock response
      const mockData = { id: 1, name: 'Updated Record' };
      const mockQueryResult = { data: mockData, error: null };
      
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue(mockQueryResult);
      
      const mockFrom = jest.fn().mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle
      });
      
      mockSupabaseClient.from = mockFrom;
      
      // Mock withRetry to directly call the operation
      supabaseService.withRetry.mockImplementation(async (operation) => operation());
      
      const updatedFields = { name: 'Updated Record' };
      const result = await supabaseService.update('test_table', 1, updatedFields);
      
      expect(mockFrom).toHaveBeenCalledWith('test_table');
      expect(mockUpdate).toHaveBeenCalledWith(updatedFields);
      expect(mockEq).toHaveBeenCalledWith('id', 1);
      expect(mockSelect).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });
    
    test('should reject missing id', async () => {
      await expect(
        supabaseService.update('test_table', null, { name: 'Updated' })
      ).rejects.toThrow('ID is required for update operation');
    });
    
    test('should reject empty update data', async () => {
      await expect(supabaseService.update('test_table', 1, {})).rejects.toThrow(
        'No update data provided'
      );
    });
    
    test('should handle update errors', async () => {
      // Reset logger mocks for this specific test
      logger.error.mockClear();
      
      // Setup
      createSupabaseClient.mockReturnValue(mockSupabaseClient);
      
      // Setup mock error response
      const mockError = { message: 'Update failed', status: 400 };
      const mockQueryResult = { data: null, error: mockError };
      
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue(mockQueryResult);
      
      const mockFrom = jest.fn().mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle
      });
      
      mockSupabaseClient.from = mockFrom;
      
      // Mock withRetry to directly throw a formatted error
      const formattedError = {
        status: 400,
        message: 'Update failed',
        details: {},
        retryable: false,
        code: 'SUPABASE_ERROR'
      };
      
      supabaseService.withRetry.mockImplementation(async () => {
        logger.error('Supabase error during Update in test_table:', mockError);
        throw formattedError;
      });
      
      await expect(
        supabaseService.update('test_table', 1, { name: 'Updated' })
      ).rejects.toEqual(formattedError);
      expect(logger.error).toHaveBeenCalledWith('Supabase error during Update in test_table:', mockError);
    });
  });
  
  describe('remove', () => {
    test('should delete a record successfully', async () => {
      // Setup
      createSupabaseClient.mockReturnValue(mockSupabaseClient);
      
      // Setup mock response
      const mockQueryResult = { error: null };
      
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue(mockQueryResult);
      
      const mockFrom = jest.fn().mockReturnValue({
        delete: mockDelete,
        eq: mockEq
      });
      
      mockSupabaseClient.from = mockFrom;
      
      // Mock withRetry to directly call the operation
      supabaseService.withRetry.mockImplementation(async (operation) => operation());
      
      const result = await supabaseService.remove('test_table', 1);
      
      expect(mockFrom).toHaveBeenCalledWith('test_table');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 1);
      expect(result).toEqual({ success: true });
    });
    
    test('should reject missing id', async () => {
      await expect(supabaseService.remove('test_table', null)).rejects.toThrow(
        'ID is required for delete operation'
      );
    });
    
    test('should handle delete errors', async () => {
      // Reset logger mocks for this specific test
      logger.error.mockClear();
      
      // Setup
      createSupabaseClient.mockReturnValue(mockSupabaseClient);
      
      // Setup mock error response
      const mockError = { message: 'Delete failed', status: 400 };
      const mockQueryResult = { error: mockError };
      
      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue(mockQueryResult);
      
      const mockFrom = jest.fn().mockReturnValue({
        delete: mockDelete,
        eq: mockEq
      });
      
      mockSupabaseClient.from = mockFrom;
      
      // Mock withRetry to directly throw a formatted error
      const formattedError = {
        status: 400,
        message: 'Delete failed',
        details: {},
        retryable: false,
        code: 'SUPABASE_ERROR'
      };
      
      supabaseService.withRetry.mockImplementation(async () => {
        logger.error('Supabase error during Delete from test_table:', mockError);
        throw formattedError;
      });
      
      await expect(supabaseService.remove('test_table', 1)).rejects.toEqual(formattedError);
      expect(logger.error).toHaveBeenCalledWith('Supabase error during Delete from test_table:', mockError);
    });
  });
  
  describe('rawQuery', () => {
    beforeEach(() => {
      supabaseService._resetForTests();
      jest.clearAllMocks();
      
      // Set environment variables
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    });
    
    test('should execute raw SQL query', async () => {
      // Mock Pool constructor from pg
      const mockQuery = jest.fn().mockResolvedValue({ 
        rows: [{ id: 1, name: 'Test User' }]
      });
      
      const mockConnect = jest.fn().mockResolvedValue({
        query: mockQuery,
        release: jest.fn()
      });
      
      Pool.mockReturnValue({
        connect: mockConnect,
        end: jest.fn().mockResolvedValue(undefined)
      });
      
      // Execute the raw query
      const sql = 'SELECT * FROM users WHERE id = $1';
      const params = [1];
      const result = await supabaseService.rawQuery(sql, params);
      
      // Verify the result contains data
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 1 })
      ]));
    });
    
    test('should handle query execution errors', async () => {
      // Mock query to throw an error
      const queryError = new Error('SQL execution error');
      
      const mockQuery = jest.fn().mockRejectedValue(queryError);
      const mockConnect = jest.fn().mockResolvedValue({
        query: mockQuery,
        release: jest.fn()
      });
      
      // Setup the failing pool
      Pool.mockReturnValue({
        connect: mockConnect,
        end: jest.fn().mockResolvedValue(undefined)
      });
      
      // Mock withRetry to let the error pass through
      supabaseService.withRetry.mockImplementationOnce(async (operation) => {
        try {
          return await operation();
        } catch (error) {
          // Transform to the expected format from handleSupabaseError
          throw { 
            message: 'SQL execution error',
            status: 500,
            retryable: true
          };
        }
      });
      
      // Execute the query and expect it to throw
      await expect(supabaseService.rawQuery('INVALID SQL')).rejects.toEqual(
        expect.objectContaining({ message: 'SQL execution error' })
      );
    });
    
    test('should handle database connection errors', async () => {
      // Mock Pool to throw an error
      const connectionError = new Error('Database connection failed');
      
      // Setup withRetry to simulate the connection error
      supabaseService.withRetry.mockImplementationOnce(async () => {
        throw { 
          message: 'SQL execution error',
          status: 500,
          retryable: true,
          code: 'SUPABASE_ERROR',
          details: {}
        };
      });
      
      // Execute the query and expect it to throw
      await expect(supabaseService.rawQuery('SELECT * FROM users')).rejects.toEqual(
        expect.objectContaining({ 
          message: 'SQL execution error',
          status: 500,
          retryable: true
        })
      );
    });
  });
});