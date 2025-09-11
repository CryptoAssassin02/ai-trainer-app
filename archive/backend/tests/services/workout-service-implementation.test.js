/**
 * @fileoverview Implementation Tests for workout service
 * 
 * These tests focus on the internal logic and database interactions
 * of the workout service, mocking external dependencies like the 
 * pg Pool/Client and Supabase client.
 */

// Import required dependencies and errors
const { DatabaseError, NotFoundError, ConflictError } = require('../../utils/errors');
const logger = require('../../config/logger');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js'); // Import createClient for mocking
const { createConnectionString } = require('../../config/supabase');

// Mock the logger
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// --- Mock pg Pool and Client ---
const mockPgQuery = jest.fn();
const mockPgRelease = jest.fn();
const mockPgClient = {
  query: mockPgQuery,
  release: mockPgRelease,
};
const mockPgConnect = jest.fn().mockResolvedValue(mockPgClient);
const mockPgEnd = jest.fn().mockResolvedValue();

jest.mock('pg', () => {
  return {
    Pool: jest.fn(() => ({
      connect: mockPgConnect,
      end: mockPgEnd,
    }))
  };
});
// --- End Mock pg Pool and Client ---

// --- Mock Supabase Client ---
// Define mocks for Supabase methods similar to profile-service tests
let mockSupabaseData = null;
let mockSupabaseError = null;
const mockSupabaseSingle = jest.fn(); // To be configured per test
const mockSupabaseEq = jest.fn(() => ({ single: mockSupabaseSingle })); // Simplified chain for example
const mockSupabaseSelect = jest.fn(() => ({ eq: mockSupabaseEq })); // Simplified
const mockSupabaseInsert = jest.fn(() => ({ select: jest.fn(() => ({ single: mockSupabaseSingle })) })); // Simplified
const mockSupabaseUpdate = jest.fn(() => ({ eq: jest.fn(() => ({ select: jest.fn(() => ({ single: mockSupabaseSingle })) })) })); // Simplified
const mockSupabaseDelete = jest.fn(() => ({ eq: mockSupabaseEq })); // Simplified

const mockSupabaseFrom = jest.fn(() => ({
  select: mockSupabaseSelect,
  insert: mockSupabaseInsert,
  update: mockSupabaseUpdate,
  delete: mockSupabaseDelete,
  // Add other methods like order, range if needed for retrieveWorkoutPlans
  order: jest.fn().mockReturnThis(), 
  range: jest.fn().mockReturnThis(),
}));

// Mock createClient from @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom
  }))
}));

// Mock helper function within workout-service that creates the client
// This might be more complex depending on how getSupabaseClientWithJWT is implemented/exported
// For now, we rely on mocking createClient directly.

// Mock createConnectionString
jest.mock('../../config/supabase', () => ({
  createConnectionString: jest.fn(() => 'mock_connection_string'),
}));
// --- End Mock Supabase Client ---


// Import the service under test AFTER mocks are defined
const workoutService = require('../../services/workout-service');

// --- Test Suite ---
describe('Workout Service - Implementation Tests', () => {
  let originalSupabaseUrl, originalSupabaseKey;

  // --- Common Test Data ---
  const basePlanData = { name: 'Test Plan', exercises: [{ name: 'Push Ups', sets: 3 }] };
  const dbPlanData = { 
      id: 'plan-default-id', 
      user_id: 'user-default-id', 
      plan: basePlanData, 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(),
      version: 1
  }; 
  // --- End Common Test Data ---

  // Set mock env vars before all tests in this suite
  beforeAll(() => {
    originalSupabaseUrl = process.env.SUPABASE_URL;
    originalSupabaseKey = process.env.SUPABASE_KEY;
    process.env.SUPABASE_URL = 'mock-url';
    process.env.SUPABASE_KEY = 'mock-key';
  });

  // Restore original env vars after all tests in this suite
  afterAll(() => {
    process.env.SUPABASE_URL = originalSupabaseUrl;
    process.env.SUPABASE_KEY = originalSupabaseKey;
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Reset specific mock implementations/states
    mockPgQuery.mockReset();
    mockPgRelease.mockReset();
    mockPgConnect.mockReset().mockResolvedValue(mockPgClient); // Ensure connect resolves by default
    mockPgEnd.mockReset();
    
    // Reset Supabase mocks (if needed - clearing mocks might be enough)
    mockSupabaseSingle.mockReset();
    mockSupabaseEq.mockReset().mockReturnValue({ single: mockSupabaseSingle }); // Reset return value
    mockSupabaseSelect.mockReset().mockReturnValue({ eq: mockSupabaseEq });
    mockSupabaseInsert.mockReset().mockReturnValue({ select: jest.fn(() => ({ single: mockSupabaseSingle })) });
    mockSupabaseUpdate.mockReset().mockReturnValue({ eq: jest.fn(() => ({ select: jest.fn(() => ({ single: mockSupabaseSingle })) })) });
    mockSupabaseDelete.mockReset().mockReturnValue({ eq: mockSupabaseEq });
    mockSupabaseFrom.mockClear();
    
    // Default Supabase mock behavior (can be overridden in tests)
    mockSupabaseSingle.mockImplementation(async () => {
      if (mockSupabaseError) {
        // Simulate Supabase error structure
        return { data: null, error: mockSupabaseError }; 
      }
      return { data: mockSupabaseData, error: null };
    });
    mockSupabaseData = null;
    mockSupabaseError = null;
  });

  // --- executeTransaction Tests ---
  describe('executeTransaction', () => {
    
    beforeEach(() => {
      // Default successful transaction query mocks
      mockPgQuery.mockImplementation(async (sql) => {
        console.log(`Mock pg query received: ${sql}`); // Debug log
        if (sql === 'BEGIN') return { rowCount: 0 };
        if (sql === 'COMMIT') return { rowCount: 0 };
        if (sql === 'ROLLBACK') return { rowCount: 0 };
        // Default for other queries within the transaction
        return { rows: [{ result: 'callback_query_success' }], rowCount: 1 }; 
      });
    });

    test('should successfully execute a transaction and commit', async () => {
      const expectedResult = { success: true, data: 'callback result' };
      const mockCallback = jest.fn().mockResolvedValue(expectedResult);

      const result = await workoutService.executeTransaction(mockCallback);

      expect(createConnectionString).toHaveBeenCalledWith('transactionPooler', true);
      expect(Pool).toHaveBeenCalledWith({ connectionString: 'mock_connection_string' });
      expect(mockPgConnect).toHaveBeenCalledTimes(1);
      expect(mockPgQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockCallback).toHaveBeenCalledWith(mockPgClient); // Callback received the client
      expect(mockPgQuery).toHaveBeenCalledWith('COMMIT');
      expect(mockPgQuery).not.toHaveBeenCalledWith('ROLLBACK');
      expect(mockPgRelease).toHaveBeenCalledTimes(1);
      expect(mockPgEnd).toHaveBeenCalledTimes(1); // Pool should be closed
      expect(result).toEqual(expectedResult);
      expect(logger.debug).toHaveBeenCalledWith('Database transaction started.');
      expect(logger.debug).toHaveBeenCalledWith('Database transaction committed.');
    });

    test('should rollback transaction if callback throws error', async () => {
      const callbackError = new Error('Callback failed!');
      const mockCallback = jest.fn().mockRejectedValue(callbackError);

      await expect(workoutService.executeTransaction(mockCallback))
        .rejects.toThrow(DatabaseError);
      // Check underlying error message if needed
      await expect(workoutService.executeTransaction(mockCallback))
          .rejects.toThrow(`Database transaction failed: ${callbackError.message}`);


      expect(mockPgConnect).toHaveBeenCalledTimes(2); // Called twice due to expect(...).rejects
      expect(mockPgQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockCallback).toHaveBeenCalledWith(mockPgClient);
      expect(mockPgQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockPgQuery).not.toHaveBeenCalledWith('COMMIT');
      expect(mockPgRelease).toHaveBeenCalledTimes(2);
      expect(mockPgEnd).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith('Database transaction rolled back due to error.', { error: callbackError.message });
      expect(logger.error).toHaveBeenCalledWith(`Transaction error: ${callbackError.message}`);
    });

    test('should handle error during pool.connect()', async () => {
        const connectError = new Error('Failed to connect');
        mockPgConnect.mockRejectedValueOnce(connectError); // Fail connection once
        const mockCallback = jest.fn(); // Callback shouldn't be called

        // Combine assertions into a single expect block
        await expect(workoutService.executeTransaction(mockCallback))
            .rejects.toThrow(new DatabaseError(`Database transaction failed: ${connectError.message}`));
        // await expect(workoutService.executeTransaction(mockCallback))
        //     .rejects.toThrow(`Database transaction failed: ${connectError.message}`); // Remove second assertion

        expect(mockCallback).not.toHaveBeenCalled();
        expect(mockPgQuery).not.toHaveBeenCalledWith('BEGIN');
        expect(mockPgRelease).not.toHaveBeenCalled(); // Client wasn't acquired
        // expect(mockPgEnd).toHaveBeenCalledTimes(2); // Pool is now ended only once
        expect(mockPgEnd).toHaveBeenCalledTimes(1); // Corrected expectation
        expect(logger.error).toHaveBeenCalledWith(`Transaction error: ${connectError.message}`);
    });

    test('should handle error during BEGIN query', async () => {
      const beginError = new Error('BEGIN failed');
      mockPgQuery.mockImplementation(async (sql) => {
        if (sql === 'BEGIN') throw beginError;
        return { rowCount: 0 };
      });
      const mockCallback = jest.fn();

      await expect(workoutService.executeTransaction(mockCallback))
        .rejects.toThrow(DatabaseError);
      await expect(workoutService.executeTransaction(mockCallback))
         .rejects.toThrow(`Database transaction failed: ${beginError.message}`);

      expect(mockPgConnect).toHaveBeenCalledTimes(2);
      expect(mockPgQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockCallback).not.toHaveBeenCalled();
      expect(mockPgQuery).toHaveBeenCalledWith('ROLLBACK'); // Should still attempt rollback
      expect(mockPgRelease).toHaveBeenCalledTimes(2);
      expect(mockPgEnd).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith('Database transaction rolled back due to error.', { error: beginError.message });
      expect(logger.error).toHaveBeenCalledWith(`Transaction error: ${beginError.message}`);
    });
    
    test('should handle error during COMMIT query', async () => {
        const commitError = new Error('COMMIT failed');
        mockPgQuery.mockImplementation(async (sql) => {
            if (sql === 'BEGIN') return { rowCount: 0 };
            if (sql === 'COMMIT') throw commitError;
            if (sql === 'ROLLBACK') return { rowCount: 0 };
            return { rows: [], rowCount: 0 }; // Callback query succeeds
        });
        const mockCallback = jest.fn().mockResolvedValue({ success: true }); // Callback succeeds

        await expect(workoutService.executeTransaction(mockCallback))
            .rejects.toThrow(DatabaseError);
        await expect(workoutService.executeTransaction(mockCallback))
           .rejects.toThrow(`Database transaction failed: ${commitError.message}`);

        expect(mockPgConnect).toHaveBeenCalledTimes(2);
        expect(mockPgQuery).toHaveBeenCalledWith('BEGIN');
        expect(mockCallback).toHaveBeenCalledWith(mockPgClient);
        expect(mockPgQuery).toHaveBeenCalledWith('COMMIT');
        expect(mockPgQuery).toHaveBeenCalledWith('ROLLBACK'); // Should rollback on commit failure
        expect(mockPgRelease).toHaveBeenCalledTimes(2);
        expect(mockPgEnd).toHaveBeenCalledTimes(2);
        expect(logger.error).toHaveBeenCalledWith('Database transaction rolled back due to error.', { error: commitError.message });
        expect(logger.error).toHaveBeenCalledWith(`Transaction error: ${commitError.message}`);
    });

  });

  // --- storeWorkoutPlan Tests ---
  describe('storeWorkoutPlan', () => {
    const userId = 'user-store-test';
    const jwtToken = 'store-jwt';
    const planData = { name: 'Test Plan', exercises: [{ name: 'Push Ups', sets: 3 }] };
    // Use the common dbPlanData structure but override specific fields
    const expectedDbRecord = { 
        ...dbPlanData, // Spread the base structure
        id: 'plan-xyz', 
        user_id: userId, 
        plan: planData,
    };

    test('should store workout plan and return the created record', async () => {
      // Arrange: Mock Supabase insert to succeed
      mockSupabaseData = expectedDbRecord;
      mockSupabaseError = null;

      // Act
      const result = await workoutService.storeWorkoutPlan(userId, planData, jwtToken);

      // Assert
      expect(createClient).toHaveBeenCalledWith(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY,
        { global: { headers: { Authorization: `Bearer ${jwtToken}` } } }
      );
      expect(mockSupabaseFrom).toHaveBeenCalledWith('workout_plans');
      expect(mockSupabaseInsert).toHaveBeenCalledWith({
        user_id: userId,
        plan: planData,
      });
      // Check that the nested select().single() was called implicitly
      expect(mockSupabaseSingle).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedDbRecord);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Workout plan stored successfully for user: ${userId}, Plan ID: ${expectedDbRecord.id}`));
    });

    test('should throw DatabaseError if Supabase insert fails', async () => {
      // Arrange: Mock Supabase insert to fail
      const dbError = { message: 'Insert failed', code: 'DB_INSERT_ERR' };
      mockSupabaseData = null;
      mockSupabaseError = dbError;

      // Act & Assert
      await expect(workoutService.storeWorkoutPlan(userId, planData, jwtToken))
        .rejects.toThrow(DatabaseError);
      await expect(workoutService.storeWorkoutPlan(userId, planData, jwtToken))
         .rejects.toThrow(`Database error storing workout plan: ${dbError.message}`);

      expect(mockSupabaseSingle).toHaveBeenCalledTimes(2); // Called twice due to expect.rejects
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Supabase error storing workout plan for user ${userId}: ${dbError.message}`));
    });

    test('should throw DatabaseError if insert returns no data', async () => {
        // Arrange: Mock Supabase insert to succeed but return null data
        mockSupabaseData = null; 
        mockSupabaseError = null;

        // Act & Assert
        await expect(workoutService.storeWorkoutPlan(userId, planData, jwtToken))
            .rejects.toThrow(DatabaseError);
        await expect(workoutService.storeWorkoutPlan(userId, planData, jwtToken))
            .rejects.toThrow('Failed to store workout plan, no data returned.');
            
        expect(mockSupabaseSingle).toHaveBeenCalledTimes(2); // Called twice
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`No data returned after inserting workout plan for user ${userId}`));
    });

    test('should throw Error if JWT token is null or undefined', async () => {
        // Act & Assert: Test with null JWT
        await expect(workoutService.storeWorkoutPlan(userId, planData, null))
            .rejects.toThrow('Authentication token is required.');
            
        // Act & Assert: Test with undefined JWT
        await expect(workoutService.storeWorkoutPlan(userId, planData, undefined))
            .rejects.toThrow('Authentication token is required.');
            
        // Ensure Supabase client wasn't even created
        expect(createClient).not.toHaveBeenCalled(); 
    });

  });

  // --- retrieveWorkoutPlans Tests ---
  describe('retrieveWorkoutPlans', () => {
    const userId = 'user-retrieve-multi';
    const jwtToken = 'retrieve-multi-jwt';
    const mockPlan1 = { ...dbPlanData, id: 'plan-1', user_id: userId, plan: {name: 'Plan 1'} };
    const mockPlan2 = { ...dbPlanData, id: 'plan-2', user_id: userId, plan: {name: 'Plan 2'} };
    const mockPlans = [mockPlan1, mockPlan2];
    
    // Define mocks used within this describe block
    let mockRangeFn, mockOrderFn, mockEqFn, mockSelectFn, mockFromFn;
    
    beforeEach(() => {
        // Reset specific Supabase mocks for this scope
        mockSupabaseSingle.mockReset();
        mockSupabaseEq.mockReset();
        mockSupabaseSelect.mockReset();
        mockSupabaseFrom.mockReset();
        
        // Set up the chainable mock structure for retrieveWorkoutPlans
        mockRangeFn = jest.fn().mockImplementation(async () => {
            if (mockSupabaseError) return { data: null, error: mockSupabaseError };
            return { data: mockSupabaseData, error: null };
        });
        mockOrderFn = jest.fn(() => ({ range: mockRangeFn }));
        mockEqFn = jest.fn(() => ({ order: mockOrderFn }));
        mockSelectFn = jest.fn(() => ({ eq: mockEqFn }));
        mockFromFn = jest.fn(() => ({ select: mockSelectFn }));
        
        // Point the main mock createClient to use this structure
        createClient.mockImplementation(() => ({ from: mockFromFn }));
    });

    test('should retrieve workout plans with default limit/offset', async () => {
      // Arrange
      mockSupabaseData = mockPlans;
      mockSupabaseError = null;

      // Act
      const result = await workoutService.retrieveWorkoutPlans(userId, {}, jwtToken);

      // Assert
      expect(createClient).toHaveBeenCalledWith(expect.any(String), expect.any(String), { global: { headers: { Authorization: `Bearer ${jwtToken}` } } });
      expect(mockFromFn).toHaveBeenCalledWith('workout_plans');
      expect(mockSelectFn).toHaveBeenCalledWith('*');
      expect(mockEqFn).toHaveBeenCalledWith('user_id', userId);
      expect(mockOrderFn).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockRangeFn).toHaveBeenCalledWith(0, 9); // Default limit 10 -> offset 0, range 9
      expect(result).toEqual(mockPlans);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Retrieved ${mockPlans.length} workout plans for user: ${userId}`));
    });
    
    test('should retrieve workout plans with specific limit/offset', async () => {
      // Arrange
      mockSupabaseData = [mockPlan1]; // Simulate only one plan returned with pagination
      mockSupabaseError = null;
      const filters = { limit: 5, offset: 10 };

      // Act
      const result = await workoutService.retrieveWorkoutPlans(userId, filters, jwtToken);

      // Assert
      expect(mockRangeFn).toHaveBeenCalledWith(10, 14); // offset 10, limit 5 -> range(10, 14)
      expect(result).toEqual([mockPlan1]);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Retrieved 1 workout plans for user: ${userId}`));
    });
    
    test('should return empty array when no plans are found', async () => {
        // Arrange
        mockSupabaseData = []; // Simulate empty result
        mockSupabaseError = null;
        
        // Act
        const result = await workoutService.retrieveWorkoutPlans(userId, {}, jwtToken);
        
        // Assert
        expect(result).toEqual([]);
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Retrieved 0 workout plans for user: ${userId}`));
    });

    test('should throw DatabaseError if Supabase select fails', async () => {
      // Arrange
      const dbError = { message: 'Select failed', code: 'DB_SELECT_ERR' };
      mockSupabaseData = null;
      mockSupabaseError = dbError;

      // Act & Assert
      await expect(workoutService.retrieveWorkoutPlans(userId, {}, jwtToken))
        .rejects.toThrow(DatabaseError);
       await expect(workoutService.retrieveWorkoutPlans(userId, {}, jwtToken))
         .rejects.toThrow(`Database error retrieving workout plans: ${dbError.message}`);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Supabase error retrieving workout plans for user ${userId}: ${dbError.message}`));
    });
    
    // TODO: Add test for searchTerm filter when implemented
  });

  // --- retrieveWorkoutPlan Tests ---
  describe('retrieveWorkoutPlan', () => {
    const userId = 'user-retrieve-single';
    const planId = 'plan-single-test';
    const jwtToken = 'retrieve-single-jwt';
    const mockPlan = { ...dbPlanData, id: planId, user_id: userId }; // Use common data
    
    // Define mocks used within this describe block
    let mockEqFn, mockSingleFn, mockSelectFn, mockFromFn;
    
    beforeEach(() => {
        // Reset specific Supabase mocks for this scope
        mockSupabaseSingle.mockReset();
        mockSupabaseEq.mockReset();
        mockSupabaseSelect.mockReset();
        mockSupabaseFrom.mockReset();
        
        // Set up the chainable mock structure for retrieveWorkoutPlan
        mockSingleFn = jest.fn().mockImplementation(async () => {
            if (mockSupabaseError) return { data: null, error: mockSupabaseError };
            return { data: mockSupabaseData, error: null };
        });
        mockEqFn = jest.fn(() => ({ single: mockSingleFn }));
        mockSelectFn = jest.fn(() => ({ eq: mockEqFn }));
        mockFromFn = jest.fn(() => ({ select: mockSelectFn }));
        
        // Point the main mock createClient to use this structure
        createClient.mockImplementation(() => ({ from: mockFromFn }));
    });
    
    test('should retrieve a single workout plan successfully', async () => {
      // Arrange
      mockSupabaseData = mockPlan;
      mockSupabaseError = null;

      // Act
      const result = await workoutService.retrieveWorkoutPlan(planId, userId, jwtToken);

      // Assert
      expect(createClient).toHaveBeenCalledWith(expect.any(String), expect.any(String), { global: { headers: { Authorization: `Bearer ${jwtToken}` } } });
      expect(mockFromFn).toHaveBeenCalledWith('workout_plans');
      expect(mockSelectFn).toHaveBeenCalledWith('*');
      expect(mockEqFn).toHaveBeenCalledWith('id', planId);
      expect(mockSingleFn).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPlan);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Workout plan ID: ${planId} retrieved successfully for user: ${userId}`));
    });

    test('should throw NotFoundError if Supabase returns PGRST116 error', async () => {
      // Arrange
      const dbError = { message: 'Results contain 0 rows', code: 'PGRST116' };
      mockSupabaseData = null;
      mockSupabaseError = dbError;

      // Act & Assert
      await expect(workoutService.retrieveWorkoutPlan(planId, userId, jwtToken))
        .rejects.toThrow(NotFoundError);
      await expect(workoutService.retrieveWorkoutPlan(planId, userId, jwtToken))
        .rejects.toThrow(`Workout plan with ID ${planId} not found.`);

      expect(mockSingleFn).toHaveBeenCalledTimes(2); // Called twice
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`Workout plan ID: ${planId} not found for user: ${userId}.`));
    });

    test('should throw NotFoundError if Supabase returns null data without error', async () => {
      // Arrange
      mockSupabaseData = null;
      mockSupabaseError = null;

      // Act & Assert
      await expect(workoutService.retrieveWorkoutPlan(planId, userId, jwtToken))
        .rejects.toThrow(NotFoundError);
       await expect(workoutService.retrieveWorkoutPlan(planId, userId, jwtToken))
        .rejects.toThrow(`Workout plan with ID ${planId} not found.`);
        
      expect(mockSingleFn).toHaveBeenCalledTimes(2); // Called twice
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`Workout plan ID: ${planId} not found for user: ${userId} (no data returned).`));
    });

    test('should throw DatabaseError for non-PGRST116 Supabase errors', async () => {
      // Arrange
      const dbError = { message: 'Connection failed', code: 'CONN_ERR' };
      mockSupabaseData = null;
      mockSupabaseError = dbError;

      // Act & Assert
      await expect(workoutService.retrieveWorkoutPlan(planId, userId, jwtToken))
        .rejects.toThrow(DatabaseError);
       await expect(workoutService.retrieveWorkoutPlan(planId, userId, jwtToken))
        .rejects.toThrow(`Database error retrieving workout plan: ${dbError.message}`);
        
      expect(mockSingleFn).toHaveBeenCalledTimes(2); // Called twice
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Supabase error retrieving workout plan ${planId} for user ${userId}: ${dbError.message}`));
    });
  });

  // --- updateWorkoutPlan Tests ---
  describe('updateWorkoutPlan', () => {
    const userId = 'user-update-test';
    const planId = 'plan-update-test';
    const jwtToken = 'update-jwt';
    const initialVersion = 1;
    const initialPlan = { 
        ...dbPlanData, 
        id: planId, 
        user_id: userId, 
        plan: { name: 'Initial Plan' },
        version: initialVersion 
    };
    const updates = { plan: { name: 'Updated Plan Name' } };

    // Store mock responses keyed by query type/args for stateful mocking
    let mockSelectResponses = {};
    let mockUpdateResponses = {};
    let mockSelectError = null;
    let mockUpdateError = null;

    beforeEach(() => {
        // Reset stateful mock config
        mockSelectResponses = {};
        mockUpdateResponses = {};
        mockSelectError = null;
        mockUpdateError = null;
        
        mockPgQuery.mockReset();
        mockPgRelease.mockReset();
        mockPgConnect.mockReset().mockResolvedValue(mockPgClient);
        mockPgEnd.mockReset();
        
        // Stateful mock implementation for pg query
        mockPgQuery.mockImplementation(async (sql, params) => {
            const queryType = sql.trim().split(' ')[0].toUpperCase();
            console.log(`Stateful Mock pg query: ${queryType}`, params); // Debug log
            
            if (queryType === 'BEGIN') return { rowCount: 0 };
            if (queryType === 'COMMIT') return { rowCount: 0 };
            if (queryType === 'ROLLBACK') return { rowCount: 0 }; // Ensure rollback always resolves cleanly

            if (queryType === 'SELECT') {
                if (mockSelectError) throw mockSelectError;
                // Ensure params is an array before joining
                const key = Array.isArray(params) ? params.join('_') : 'default'; 
                console.log(`SELECT key generated: ${key}, looking in:`, mockSelectResponses); // Debug log
                return mockSelectResponses[key] || { rows: [], rowCount: 0 }; // Default empty
            }

            if (queryType === 'UPDATE') {
                if (mockUpdateError) throw mockUpdateError;
                // Ensure params is an array before accessing last element
                const versionParam = Array.isArray(params) ? params[params.length - 1] : null; 
                const key = versionParam !== null ? `v${versionParam}` : 'default';
                console.log(`UPDATE key generated: ${key}, looking in:`, mockUpdateResponses); // Debug log
                return mockUpdateResponses[key] || { rows: [], rowCount: 0 }; // Default no update
            }
            
            console.warn(`Unhandled mock query: ${sql}`);
            return { rows: [], rowCount: 0 }; 
        });
    });

    test('should update workout plan successfully on first attempt', async () => {
        // Arrange:
        const updatedPlanRecord = { ...initialPlan, plan: updates.plan, version: initialVersion + 1, updated_at: new Date().toISOString() };
        const selectKey = [planId, userId].join('_');
        const updateKey = `v${initialVersion}`;
        
        mockSelectResponses = { [selectKey]: { rows: [initialPlan], rowCount: 1 } }; // Reset specifically
        mockUpdateResponses = { [updateKey]: { rows: [updatedPlanRecord], rowCount: 1 } }; // Reset specifically

        // Act
        const result = await workoutService.updateWorkoutPlan(planId, updates, userId, jwtToken);

        // Assert
        expect(result).toEqual(updatedPlanRecord);
        expect(mockPgQuery).toHaveBeenCalledWith('BEGIN');
        expect(mockPgQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM workout_plans'), [planId, userId]);
        expect(mockPgQuery).toHaveBeenCalledWith('COMMIT');
        expect(mockPgQuery).not.toHaveBeenCalledWith('ROLLBACK');
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Workout plan ID: ${planId} updated successfully for user: ${userId} on attempt 1.`));
    });

    test('should throw NotFoundError if initial fetch fails', async () => {
      // Arrange: Mock SELECT to return no rows
      const selectKey = [planId, userId].join('_');
      mockSelectResponses[selectKey] = { rows: [], rowCount: 0 };

      // Act & Assert
      await expect(workoutService.updateWorkoutPlan(planId, updates, userId, jwtToken))
        .rejects.toThrow(NotFoundError);
      await expect(workoutService.updateWorkoutPlan(planId, updates, userId, jwtToken))
        .rejects.toThrow(`Workout plan with ID ${planId} not found.`);
        
      // Ensure transaction was rolled back
      expect(mockPgQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockPgQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM workout_plans'), [planId, userId]);
      expect(mockPgQuery).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE workout_plans SET'));
      expect(mockPgQuery).toHaveBeenCalledWith('ROLLBACK'); 
      expect(mockPgQuery).not.toHaveBeenCalledWith('COMMIT');
    });

    test('should retry and succeed if version conflict occurs once', async () => {
        // Arrange: Use stateful mock
        const v1Plan = { ...initialPlan, version: 1 };
        const v2Plan = { ...initialPlan, version: 2 }; // Plan after external update
        const finalUpdatedPlan = { ...v2Plan, plan: updates.plan, version: 3, updated_at: new Date().toISOString() };
        const selectKey = [planId, userId].join('_');

        // Setup responses for the stateful mock
        mockSelectResponses = { [selectKey]: { rows: [v1Plan], rowCount: 1 } }; // Initial SELECT gets v1
        mockUpdateResponses = { 
            'v1': { rows: [], rowCount: 0 },            // UPDATE v1 fails (conflict)
            'v2': { rows: [finalUpdatedPlan], rowCount: 1 } // UPDATE v2 succeeds
        };

        // Need to modify the select response *after* the first failed update
        let selectCallCount = 0;
        mockPgQuery.mockImplementation(async (sql, params) => {
            const queryType = sql.trim().split(' ')[0].toUpperCase();
            console.log(`Retry Test Mock pg query: ${queryType}`, params);

            if (queryType === 'BEGIN' || queryType === 'COMMIT' || queryType === 'ROLLBACK') return { rowCount: 0 };

            if (queryType === 'SELECT') {
                selectCallCount++;
                const key = Array.isArray(params) ? params.join('_') : 'default'; 
                // On the second SELECT (conflict check or retry fetch), return v2
                if (selectCallCount >= 2) { 
                    console.log('   Returning v2 for SELECT');
                    return { rows: [v2Plan], rowCount: 1 };
                }
                console.log('   Returning v1 for SELECT');
                return { rows: [v1Plan], rowCount: 1 }; // First SELECT returns v1
            }

            if (queryType === 'UPDATE') {
                const versionParam = Array.isArray(params) ? params[params.length - 1] : null; 
                const key = versionParam !== null ? `v${versionParam}` : 'default';
                console.log(`   UPDATE key ${key} requested`);
                return mockUpdateResponses[key] || { rows: [], rowCount: 0 }; 
            }
            return { rows: [], rowCount: 0 }; 
        });
            
        // Act
        const result = await workoutService.updateWorkoutPlan(planId, updates, userId, jwtToken);

        // Assert
        expect(result).toEqual(finalUpdatedPlan);
        expect(result.version).toBe(3);
        // Ensure COMMIT was called, and exactly ONE ROLLBACK
        const commitCalls = mockPgQuery.mock.calls.filter(call => call[0] === 'COMMIT');
        const rollbackCalls = mockPgQuery.mock.calls.filter(call => call[0] === 'ROLLBACK');
        expect(commitCalls.length).toBeGreaterThan(0);
        expect(rollbackCalls.length).toBe(1); // Should be exactly 1 rollback
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Workout plan ID: ${planId} updated successfully for user: ${userId} on attempt 2.`));
    });
    
    test('should throw ConflictError if version conflict persists after max retries', async () => {
        const MAX_RETRIES = 3; 
        let currentVersion = initialVersion;
        const selectKey = [planId, userId].join('_');

        // More complex stateful mock for multiple retries
        mockPgQuery.mockImplementation(async (sql, params) => {
            const queryType = sql.trim().split(' ')[0].toUpperCase();
            console.log(`Conflict Test Mock pg query: ${queryType}`, params, `Current test version: ${currentVersion}`);

            if (queryType === 'BEGIN' || queryType === 'COMMIT' || queryType === 'ROLLBACK') return { rowCount: 0 };

            if (queryType === 'SELECT') {
                // Always return the plan with the current mock version
                const currentPlan = { ...initialPlan, version: currentVersion };
                return { rows: [currentPlan], rowCount: 1 };
            }

            if (queryType === 'UPDATE') {
                // Always fail the update, simulating conflict
                currentVersion++; // Increment version as if external update happened
                return { rows: [], rowCount: 0 }; 
            }
            return { rows: [], rowCount: 0 }; 
        });

        // Act & Assert
        await expect(workoutService.updateWorkoutPlan(planId, updates, userId, jwtToken))
            .rejects.toThrow(ConflictError);
        await expect(workoutService.updateWorkoutPlan(planId, updates, userId, jwtToken))
           .rejects.toThrow(`Maximum retry attempts exceeded for concurrent workout plan update`);
           
        // Check logs
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`Maximum retry attempts (${MAX_RETRIES}) exceeded for concurrent workout plan update for plan ${planId}.`));
        // Check final rollback occurred (implementation detail: check it was called)
        const rollbackCalls = mockPgQuery.mock.calls.filter(call => call[0] === 'ROLLBACK');
        expect(rollbackCalls.length).toBeGreaterThanOrEqual(1); // Should have rolled back at least once on final failure
    });

    test('should throw DatabaseError if update fails for non-conflict reason', async () => {
        // Arrange:
        const updateDbError = new Error('Internal DB Error during UPDATE');
        const selectKey = [planId, userId].join('_');
      
        // Reset stateful mock for this specific sequence
        mockPgQuery.mockImplementation(async (sql, params) => {
             const queryType = sql.trim().split(' ')[0].toUpperCase();
             console.log(`Non-conflict Error Test Mock pg query: ${queryType}`, params);

             if (queryType === 'BEGIN') return { rowCount: 0 };
             // Ensure ROLLBACK returns cleanly even after rejection
             if (queryType === 'ROLLBACK') return { rowCount: 0 }; 
             if (queryType === 'COMMIT') return { rowCount: 0 };

             if (queryType === 'SELECT') {
                 return { rows: [initialPlan], rowCount: 1 }; // SELECT ok
             }
             if (queryType === 'UPDATE') {
                 throw updateDbError; // UPDATE fails
             }
             return { rows: [], rowCount: 0 };
        });

        // Act & Assert
        await expect(workoutService.updateWorkoutPlan(planId, updates, userId, jwtToken))
            .rejects.toThrow(DatabaseError);
        // Check the specific error message passed through
        await expect(workoutService.updateWorkoutPlan(planId, updates, userId, jwtToken))
            .rejects.toThrow(updateDbError.message); // Expecting the original error message

        expect(mockPgQuery).toHaveBeenCalledWith('BEGIN');
        expect(mockPgQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM workout_plans'), [planId, userId]);
        expect(mockPgQuery).toHaveBeenCalledWith('ROLLBACK');
        expect(mockPgQuery).not.toHaveBeenCalledWith('COMMIT');
        expect(logger.error).toHaveBeenCalledWith(`Transaction error: ${updateDbError.message}`); // Ensure the original error is logged
    });
    
  });

  // --- removeWorkoutPlan Tests ---
  describe('removeWorkoutPlan', () => {
    const userId = 'user-remove-test';
    const planId = 'plan-remove-test';
    const jwtToken = 'remove-jwt';
    const mockPlan = { ...dbPlanData, id: planId, user_id: userId, version: 1 }; // Existing plan

    // Define mocks consistently for this suite
    let mockSelectEqFn, mockSelectSingleFn, mockSelectFn;
    let mockDeleteEqFn, mockDeleteFn;
    let mockFromFn; // Single mockFromFn for this suite

    beforeEach(() => {
        // Reset all relevant Supabase mock functions
        mockSelectEqFn = jest.fn();
        mockSelectSingleFn = jest.fn();
        mockSelectFn = jest.fn(() => ({ eq: mockSelectEqFn })); // Chain select -> eq
        mockDeleteEqFn = jest.fn();
        mockDeleteFn = jest.fn(() => ({ eq: mockDeleteEqFn }));   // Chain delete -> eq
        mockFromFn = jest.fn(() => ({                           // Chain from -> select/delete
            select: mockSelectFn,
            delete: mockDeleteFn
        }));

        // Configure the main createClient mock for THIS suite
        // Ensure it returns the fromFn configured above
        createClient.mockImplementation(() => ({ from: mockFromFn }));

        // --- Default Mock Behaviors for Success ---
        // Default: SELECT finds the plan
        mockSelectEqFn.mockImplementation(() => ({ single: mockSelectSingleFn }));
        mockSelectSingleFn.mockResolvedValue({ data: mockPlan, error: null });
        // Default: DELETE succeeds
        mockDeleteEqFn.mockResolvedValue({ data: [mockPlan], error: null }); // Often returns deleted data

        // Reset logger mocks too
        logger.info.mockClear();
        logger.warn.mockClear();
        logger.error.mockClear();
        logger.debug.mockClear();
    });

    test('should remove workout plan successfully', async () => {
        // Arrange: Default beforeEach setup handles success

        // Act
        await workoutService.removeWorkoutPlan(planId, userId, jwtToken);

        // Assert
        // 1. Check the internal retrieve call's Supabase interaction
        expect(mockFromFn).toHaveBeenCalledWith('workout_plans'); // Called for retrieve
        expect(mockSelectFn).toHaveBeenCalledWith('*');
        expect(mockSelectEqFn).toHaveBeenCalledWith('id', planId);
        expect(mockSelectSingleFn).toHaveBeenCalledTimes(1);

        // 2. Check the delete call's Supabase interaction
        expect(mockFromFn).toHaveBeenCalledWith('workout_plans'); // Called for delete
        expect(mockDeleteFn).toHaveBeenCalledTimes(1);
        expect(mockDeleteEqFn).toHaveBeenCalledWith('id', planId);

        // 3. Check logs and result (removeWorkoutPlan returns void on success)
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Workout plan ID: ${planId} retrieved successfully for user: ${userId}`)); // From internal retrieve
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Workout plan ID: ${planId} removed successfully for user: ${userId}`)); // From remove
        expect(logger.error).not.toHaveBeenCalled();
    });

    test('should throw NotFoundError if retrieveWorkoutPlan fails', async () => {
        // Arrange: Modify the SELECT mock behavior for this test to simulate not found
        const retrieveError = { message: 'Results contain 0 rows', code: 'PGRST116' };
        mockSelectSingleFn.mockResolvedValue({ data: null, error: retrieveError }); // Simulate retrieve failure

        // Act & Assert
        await expect(workoutService.removeWorkoutPlan(planId, userId, jwtToken))
            .rejects.toThrow(NotFoundError);
        // Run again to check the error message
        await expect(workoutService.removeWorkoutPlan(planId, userId, jwtToken))
            .rejects.toThrow(`Workout plan with ID ${planId} not found.`);

        // Ensure retrieve was attempted, but delete was not
        expect(mockSelectEqFn).toHaveBeenCalledWith('id', planId);
        expect(mockSelectSingleFn).toHaveBeenCalledTimes(2); // Called twice due to rejects
        expect(mockDeleteFn).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`Workout plan ID: ${planId} not found for user: ${userId}.`)); // From internal retrieve
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error in removeWorkoutPlan for plan ${planId}, user ${userId}: Workout plan with ID ${planId} not found.`));
    });

    test('should throw DatabaseError if Supabase delete fails', async () => {
        // Arrange: Retrieve succeeds (default), but DELETE fails
        const dbError = { message: 'Delete failed', code: 'DB_DELETE_ERR' };
        // Modify the DELETE mock behavior for this test
        mockDeleteEqFn.mockResolvedValue({ data: null, error: dbError });

        // Act & Assert
        await expect(workoutService.removeWorkoutPlan(planId, userId, jwtToken))
            .rejects.toThrow(DatabaseError);
        // Run again to check message
        await expect(workoutService.removeWorkoutPlan(planId, userId, jwtToken))
            .rejects.toThrow(`Database error removing workout plan: ${dbError.message}`);

        // Check SELECT call happened successfully
        expect(mockSelectEqFn).toHaveBeenCalledWith('id', planId);
        expect(mockSelectSingleFn).toHaveBeenCalledTimes(2); // Called twice

        // Check DELETE call was attempted
        expect(mockDeleteFn).toHaveBeenCalledTimes(2);
        expect(mockDeleteEqFn).toHaveBeenCalledTimes(2);

        // Check logs
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Workout plan ID: ${planId} retrieved successfully for user: ${userId}`)); // From retrieve
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Supabase error removing workout plan ${planId} for user ${userId}: ${dbError.message}`)); // From delete failure
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error in removeWorkoutPlan for plan ${planId}, user ${userId}: Database error removing workout plan: ${dbError.message}`)); // From final catch
    });

    // Test for JWT token missing is implicit as retrieveWorkoutPlan would handle it first

  });

}); 