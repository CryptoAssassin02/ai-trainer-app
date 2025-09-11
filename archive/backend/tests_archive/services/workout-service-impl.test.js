/**
 * @fileoverview Implementation tests for workout service
 * 
 * These tests verify the actual implementation of the workout service,
 * focusing especially on concurrency handling and version tracking
 */

const {
  ValidationError,
  NotFoundError,
  DatabaseError,
  ConflictError
} = require('../../utils/errors');

// Mock the Supabase client
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();

jest.mock('../../services/supabase', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: mockFrom
  }))
}));

// Mock the pg Pool and Client for transaction testing
const mockPgClient = {
  query: jest.fn(),
  release: jest.fn(),
};

const mockPool = {
  connect: jest.fn(() => Promise.resolve(mockPgClient)),
  end: jest.fn(() => Promise.resolve()),
};

// Create a better mock for the PostgreSQL Pool
jest.mock('pg', () => {
  return { 
    Pool: jest.fn().mockImplementation(() => mockPool)
  };
});

// Mock createConnectionString
jest.mock('../../config/supabase', () => ({
  createConnectionString: jest.fn(() => 'mock_connection_string'),
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
jest.mock('../../config/logger', () => mockLogger);

// Import the service under test (the real implementation)
const workoutService = require('../../services/workout-service');

// --- Store original executeTransaction --- 
// We need the original for the first test, but will mock it for the second.
const originalExecuteTransaction = workoutService.executeTransaction;

describe('Workout Service Implementation', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    mockPgClient.query.mockReset();
    // Restore original executeTransaction before each test, mock specifically if needed
    workoutService.executeTransaction = originalExecuteTransaction; 
  });
  
  // Test data
  const userId = 'user-123';
  const jwtToken = 'valid.jwt.token';
  const planId = 'plan-123';
  
  describe('updateWorkoutPlan', () => {
    it('should update a workout plan successfully', async () => {
      // Test uses the *original* executeTransaction with mocked pgClient
      
      // Set up the mock responses for pg client
      const currentPlan = {
        id: planId,
        user_id: userId,
        plan_data: { name: 'Original Plan', exercises: [] },
        version: 1
      };
      
      const updatedPlan = {
        id: planId,
        user_id: userId,
        plan_data: { name: 'Updated Plan', exercises: [] },
        version: 2,
        updated_at: new Date().toISOString()
      };
      
      // Set up the query mock to return appropriate results based on the query
      mockPgClient.query.mockImplementation((sql, params) => {
        // 'BEGIN' and 'COMMIT' queries for transaction control
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          // These usually don't return rows/rowCount in the same way
          return Promise.resolve(); // Adjust if your pg driver behaves differently
        }
        
        // SELECT query to fetch the current plan
        if (sql.includes('SELECT * FROM workout_plans')) {
          return Promise.resolve({
            rows: [currentPlan],
            rowCount: 1
          });
        }
        
        // UPDATE query to update the plan
        if (sql.includes('UPDATE workout_plans')) {
          return Promise.resolve({
            rows: [updatedPlan],
            rowCount: 1
          });
        }
        
        // Default empty response for any other queries
        return Promise.resolve({ rows: [], rowCount: 0 });
      });
      
      // Execute the function under test
      const updates = {
        plan_data: { name: 'Updated Plan', exercises: [] }
      };
      
      const result = await workoutService.updateWorkoutPlan(
        planId, updates, userId, jwtToken
      );
      
      // Verify the result
      expect(result).toBeDefined();
      expect(result.id).toBe(planId);
      expect(result.version).toBe(2);
      expect(result.plan_data.name).toBe('Updated Plan');
      
      // Verify the client.query was called with the expected SQL
      // Check BEGIN and COMMIT without expecting parameters
      expect(mockPgClient.query).toHaveBeenCalledWith('BEGIN');
      
      expect(mockPgClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM workout_plans'),
        [planId, userId]
      );
      
      // Check the parameters for the UPDATE more carefully
      const updateCall = mockPgClient.query.mock.calls.find(call => call[0].includes('UPDATE workout_plans'));
      expect(updateCall).toBeDefined();
      expect(updateCall[0]).toContain('plan_data = $1');
      expect(updateCall[0]).toContain('updated_at = $2');
      expect(updateCall[0]).toContain('version = $3');
      expect(updateCall[0]).toContain('WHERE id = $4 AND user_id = $5 AND version = $6');
      expect(updateCall[1].length).toBe(6);
      expect(updateCall[1][0]).toBe(JSON.stringify(updates.plan_data)); // plan_data
      expect(updateCall[1][2]).toBe(currentPlan.version + 1); // new version
      expect(updateCall[1][3]).toBe(planId);
      expect(updateCall[1][4]).toBe(userId);
      expect(updateCall[1][5]).toBe(currentPlan.version); // old version
      
      expect(mockPgClient.query).toHaveBeenCalledWith('COMMIT');
    });
    
    it('should handle version conflicts and retry successfully', async () => {
      // Test now uses the *original* executeTransaction with mocked pgClient 
      // to verify the corrected retry logic in updateWorkoutPlan.
      let queryAttempts = 0; // Track SELECT * calls specifically
      
      const updatedPlanAfterRetry = {
          id: planId,
          user_id: userId,
          plan_data: { name: 'Updated Plan', exercises: [] },
          version: 3, // Version after successful retry
          updated_at: new Date().toISOString()
      };
      
      // Mock pgClient.query to simulate the database state across attempts
      mockPgClient.query.mockImplementation((sql, params) => {
          mockLogger.debug(`[Retry Test pgClient] SQL: ${sql.substring(0,100)}...`);
          // Common transaction commands
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return Promise.resolve(); 
          }
          
          // SELECT * for initial fetch
          if (sql.includes('SELECT * FROM workout_plans')) {
            queryAttempts++; // Increment only on SELECT *
            const versionForSelect = queryAttempts === 1 ? 1 : 2; // Version is 1 on first SELECT, 2 on second
            mockLogger.debug(`[Retry Test pgClient Attempt ${queryAttempts}] Responding to SELECT * with version ${versionForSelect}`);
            return Promise.resolve({
              rows: [{
                id: planId,
                user_id: userId,
                plan_data: { name: 'Original Plan' },
                version: versionForSelect 
              }],
              rowCount: 1
            });
          }
          
          // UPDATE workout_plans
          if (sql.includes('UPDATE workout_plans')) {
            // Only check the version passed in the WHERE clause for the first attempt
            if (queryAttempts === 1 && params && params.length >= 6 && params[5] === 1) {
              // First attempt with correct initial version fails - simulate conflict
              mockLogger.debug(`[Retry Test pgClient Attempt ${queryAttempts}] Responding to UPDATE with conflict (rowCount 0)`);
              return Promise.resolve({ rows: [], rowCount: 0 });
            } else if (queryAttempts === 2 && params && params.length >= 6 && params[5] === 2) {
              // Second attempt with correct incremented version succeeds
              mockLogger.debug(`[Retry Test pgClient Attempt ${queryAttempts}] Responding to UPDATE with success`);
              return Promise.resolve({ 
                rows: [updatedPlanAfterRetry], // Return the final state
                rowCount: 1 
              });
            } else {
                mockLogger.warn(`[Retry Test pgClient Attempt ${queryAttempts}] Unexpected UPDATE call or parameters.`);
                 return Promise.resolve({ rows: [], rowCount: 0 }); // Unexpected update attempt
            }
          }
          
          // SELECT version check after failed update (only after first attempt)
          if (sql.includes('SELECT version FROM workout_plans') && queryAttempts === 1) {
              mockLogger.debug(`[Retry Test pgClient Attempt ${queryAttempts}] Responding to SELECT version check with version 2`);
              return Promise.resolve({ rows: [{ version: 2 }], rowCount: 1 }); // Simulate version increased by other process
          }
          
          // Default case
          mockLogger.warn(`[Retry Test pgClient Attempt ${queryAttempts}] Unhandled SQL: ${sql.substring(0,100)}...`);
          return Promise.resolve({ rows: [], rowCount: 0 });
      });
      
      // Execute the function under test
      const updates = {
        plan_data: { name: 'Updated Plan', exercises: [] }
      };
      
      // We expect updateWorkoutPlan to handle the retry internally now
      const result = await workoutService.updateWorkoutPlan(
        planId, updates, userId, jwtToken
      );
      
      // Verify the result matches the final successful attempt
      expect(result).toEqual(updatedPlanAfterRetry);
      
      // Verify the key pgClient interactions occurred as expected across retries
      expect(mockPgClient.query).toHaveBeenCalledWith('BEGIN');
      const selectStarCalls = mockPgClient.query.mock.calls.filter(call => call[0].includes('SELECT * FROM workout_plans'));
      expect(selectStarCalls.length).toBe(2); // Called for initial attempt and retry
      
      const updateCalls = mockPgClient.query.mock.calls.filter(call => call[0].includes('UPDATE workout_plans'));
      expect(updateCalls.length).toBe(2); // Called for initial attempt (failed) and retry (succeeded)
      expect(updateCalls[0][1][5]).toBe(1); // First update attempt used version 1
      expect(updateCalls[1][1][5]).toBe(2); // Second update attempt used version 2
      
      const selectVersionCalls = mockPgClient.query.mock.calls.filter(call => call[0].includes('SELECT version FROM workout_plans'));
      expect(selectVersionCalls.length).toBe(1); // Called once after the first failed update
      
      expect(mockPgClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
}); 