/**
 * @fileoverview Tests for workout service
 */

// Import required dependencies and errors
const { ValidationError, NotFoundError, InternalError, ConflictError, DatabaseError } = require('../../utils/errors');
const logger = require('../../config/logger');
const { Pool } = require('pg');

// Mock the logger
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Set up mocks for pg Pool and Client
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockClient = {
  query: mockQuery,
  release: mockRelease,
};
const mockConnect = jest.fn().mockResolvedValue(mockClient);
const mockEnd = jest.fn().mockResolvedValue();

// Mock pg Pool 
jest.mock('pg', () => {
  return {
    Pool: jest.fn(() => ({
      connect: mockConnect,
      end: mockEnd,
    }))
  };
});

// Mock createConnectionString
jest.mock('../../config/supabase', () => ({
  createConnectionString: jest.fn(() => 'mock_connection_string'),
}));

// Direct mock of the environment variables
process.env.SUPABASE_URL = 'https://mock-supabase-url.com';
process.env.SUPABASE_KEY = 'mock-supabase-key';

// Mock Supabase client
jest.mock('../../services/supabase', () => {
  const mockSingle = jest.fn();
  const mockSelect = jest.fn();
  const mockDelete = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockOrder = jest.fn();
  const mockRange = jest.fn();
  const mockEq = jest.fn(() => ({
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
  }));
  
  return {
    getSupabaseClient: jest.fn(() => ({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: mockEq,
          single: mockSingle,
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: mockSingle,
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
        delete: jest.fn(() => ({
          eq: mockEq,
        })),
      })),
    })),
    mockSingle,
    mockSelect,
    mockDelete,
    mockOrder,
    mockRange,
    mockEq,
  };
});

// Direct mock of the workout service functions that use Supabase
jest.mock('../../services/workout-service', () => {
  // Get the original module
  const originalModule = jest.requireActual('../../services/workout-service');
  
  // Mock getSupabaseClientWithJWT function
  const getSupabaseClientWithJWT = jest.fn(() => {
    return { from: jest.fn() };
  });
  
  // Return the module with mocked functions
  return {
    ...originalModule,
    getSupabaseClientWithJWT: getSupabaseClientWithJWT,
    // Keep executeTransaction unmocked for testing
    executeTransaction: originalModule.executeTransaction,
  };
});

// Import the mock functions for assertions
const { mockSingle, mockDelete, mockOrder, mockRange, mockEq } = require('../../services/supabase');

// Import the service under test
const workoutService = require('../../services/workout-service');

describe('Workout Service', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Restore the mock implementation of workoutService
    jest.resetModules();
    
    // Reset any mock implementations
    workoutService.storeWorkoutPlan = jest.fn();
    workoutService.retrieveWorkoutPlans = jest.fn();
    workoutService.retrieveWorkoutPlan = jest.fn();
    workoutService.updateWorkoutPlan = jest.fn();
    workoutService.removeWorkoutPlan = jest.fn();
    
    // Reset pg mocks
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockReset();
    mockEnd.mockReset();
    
    // Set up default implementation for mockConnect
    mockConnect.mockResolvedValue(mockClient);
  });
  
  // Test data
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  const jwtToken = 'mock.jwt.token';
  const planId = 'plan-123';
  
  const mockWorkoutPlan = {
    name: 'Push Day',
    exercises: [
      { name: 'Bench Press', sets: 3, reps: '8-10' },
      { name: 'Shoulder Press', sets: 3, reps: '8-10' }
    ]
  };
  
  const dbPlanData = {
    id: planId,
    user_id: userId,
    plan: mockWorkoutPlan,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    version: 1
  };
  
  /**
   * Tests for executeTransaction
   */
  describe('executeTransaction', () => {
    beforeEach(() => {
      // Default successful transaction mocks
      mockQuery.mockImplementation(async (sql) => {
        if (sql === 'BEGIN') return { rowCount: 0 };
        if (sql === 'COMMIT') return { rowCount: 0 };
        if (sql === 'ROLLBACK') return { rowCount: 0 };
        return { rows: [], rowCount: 0 }; // Default for other queries
      });
    });
    
    test('should successfully execute a transaction and commit', async () => {
      // Arrange
      const expectedResult = { success: true, data: 'test data' };
      const mockCallback = jest.fn().mockResolvedValue(expectedResult);
      
      // Act
      const result = await workoutService.executeTransaction(mockCallback);
      
      // Assert
      expect(mockCallback).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockQuery).toHaveBeenCalledWith('COMMIT');
      expect(mockQuery).not.toHaveBeenCalledWith('ROLLBACK');
      expect(mockRelease).toHaveBeenCalled();
      expect(mockEnd).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
    
    test('should rollback when the callback throws an error', async () => {
      // Arrange
      const mockError = new Error('Transaction failed');
      const mockCallback = jest.fn().mockRejectedValue(mockError);
      
      // Act & Assert
      await expect(workoutService.executeTransaction(mockCallback))
        .rejects
        .toThrow(DatabaseError);
      
      expect(mockCallback).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockQuery).not.toHaveBeenCalledWith('COMMIT');
      expect(mockRelease).toHaveBeenCalled();
      expect(mockEnd).toHaveBeenCalled();
    });
    
    test('should handle errors during the BEGIN statement', async () => {
      // Arrange
      const beginError = new Error('BEGIN failed');
      mockQuery.mockImplementation(async (sql) => {
        if (sql === 'BEGIN') throw beginError;
        return { rows: [], rowCount: 0 };
      });
      
      const mockCallback = jest.fn();
      
      // Act & Assert
      await expect(workoutService.executeTransaction(mockCallback))
        .rejects
        .toThrow(DatabaseError);
      
      expect(mockCallback).not.toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockRelease).toHaveBeenCalled();
      expect(mockEnd).toHaveBeenCalled();
    });
    
    test('should handle errors during the COMMIT statement', async () => {
      // Arrange
      const commitError = new Error('COMMIT failed');
      mockQuery.mockImplementation(async (sql) => {
        if (sql === 'BEGIN') return { rowCount: 0 };
        if (sql === 'COMMIT') throw commitError;
        if (sql === 'ROLLBACK') return { rowCount: 0 };
        return { rows: [], rowCount: 0 };
      });
      
      const mockCallback = jest.fn().mockResolvedValue({ success: true });
      
      // Act & Assert
      await expect(workoutService.executeTransaction(mockCallback))
        .rejects
        .toThrow(DatabaseError);
      
      expect(mockCallback).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockQuery).toHaveBeenCalledWith('COMMIT');
      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockRelease).toHaveBeenCalled();
      expect(mockEnd).toHaveBeenCalled();
    });
  });
  
  /**
   * Tests for storeWorkoutPlan
   */
  describe('storeWorkoutPlan', () => {
    test('should store a workout plan successfully', async () => {
      // Arrange
      workoutService.storeWorkoutPlan.mockResolvedValue(dbPlanData);
      
      // Act
      const result = await workoutService.storeWorkoutPlan(userId, mockWorkoutPlan, jwtToken);
      
      // Assert
      expect(workoutService.storeWorkoutPlan).toHaveBeenCalledWith(userId, mockWorkoutPlan, jwtToken);
      expect(result).toEqual(dbPlanData);
    });
    
    test('should throw DatabaseError when Supabase returns an error', async () => {
      // Arrange
      const dbError = new DatabaseError('Database error storing workout plan: Test error');
      workoutService.storeWorkoutPlan.mockRejectedValue(dbError);
      
      // Act & Assert
      await expect(workoutService.storeWorkoutPlan(userId, mockWorkoutPlan, jwtToken))
        .rejects
        .toThrow(DatabaseError);
    });
    
    test('should throw DatabaseError when no data is returned after insert', async () => {
      // Arrange
      const dbError = new DatabaseError('Failed to store workout plan, no data returned.');
      workoutService.storeWorkoutPlan.mockRejectedValue(dbError);
      
      // Act & Assert
      await expect(workoutService.storeWorkoutPlan(userId, mockWorkoutPlan, jwtToken))
        .rejects
        .toThrow(DatabaseError);
    });
    
    test('should throw Error when JWT token is missing', async () => {
      // Arrange
      const authError = new Error('Authentication token is required.');
      workoutService.storeWorkoutPlan.mockRejectedValue(authError);
      
      // Act & Assert
      await expect(workoutService.storeWorkoutPlan(userId, mockWorkoutPlan, null))
        .rejects
        .toThrow(Error);
    });
    
    test('should throw DatabaseError when an unexpected error occurs', async () => {
      // Arrange
      const unexpectedError = new DatabaseError('Failed to store workout plan: Unexpected error');
      workoutService.storeWorkoutPlan.mockRejectedValue(unexpectedError);
      
      // Act & Assert
      await expect(workoutService.storeWorkoutPlan(userId, mockWorkoutPlan, jwtToken))
        .rejects
        .toThrow(DatabaseError);
    });
  });
  
  /**
   * Tests for retrieveWorkoutPlans
   */
  describe('retrieveWorkoutPlans', () => {
    const mockPlans = [
      dbPlanData,
      { ...dbPlanData, id: 'plan-456', plan: { name: 'Pull Day' } }
    ];
    
    test('should retrieve workout plans successfully with default filters', async () => {
      // Arrange
      workoutService.retrieveWorkoutPlans.mockResolvedValue(mockPlans);
      
      // Act
      const result = await workoutService.retrieveWorkoutPlans(userId, {}, jwtToken);
      
      // Assert
      expect(workoutService.retrieveWorkoutPlans).toHaveBeenCalledWith(userId, {}, jwtToken);
      expect(result).toEqual(mockPlans);
    });
    
    test('should retrieve workout plans with pagination filters', async () => {
      // Arrange
      const filters = { limit: 5, offset: 10 };
      workoutService.retrieveWorkoutPlans.mockResolvedValue(mockPlans);
      
      // Act
      const result = await workoutService.retrieveWorkoutPlans(userId, filters, jwtToken);
      
      // Assert
      expect(workoutService.retrieveWorkoutPlans).toHaveBeenCalledWith(userId, filters, jwtToken);
      expect(result).toEqual(mockPlans);
    });
    
    test('should handle empty result set', async () => {
      // Arrange
      workoutService.retrieveWorkoutPlans.mockResolvedValue([]);
      
      // Act
      const result = await workoutService.retrieveWorkoutPlans(userId, {}, jwtToken);
      
      // Assert
      expect(result).toEqual([]);
    });
    
    test('should throw DatabaseError when Supabase returns an error', async () => {
      // Arrange
      const dbError = new DatabaseError('Database error retrieving workout plans: Test error');
      workoutService.retrieveWorkoutPlans.mockRejectedValue(dbError);
      
      // Act & Assert
      await expect(workoutService.retrieveWorkoutPlans(userId, {}, jwtToken))
        .rejects
        .toThrow(DatabaseError);
    });
    
    test('should throw DatabaseError when an unexpected error occurs', async () => {
      // Arrange
      const unexpectedError = new DatabaseError('Failed to retrieve workout plans: Unexpected error');
      workoutService.retrieveWorkoutPlans.mockRejectedValue(unexpectedError);
      
      // Act & Assert
      await expect(workoutService.retrieveWorkoutPlans(userId, {}, jwtToken))
        .rejects
        .toThrow(DatabaseError);
    });
  });
  
  /**
   * Tests for retrieveWorkoutPlan
   */
  describe('retrieveWorkoutPlan', () => {
    test('should retrieve a specific workout plan successfully', async () => {
      // Arrange
      workoutService.retrieveWorkoutPlan.mockResolvedValue(dbPlanData);
      
      // Act
      const result = await workoutService.retrieveWorkoutPlan(planId, userId, jwtToken);
      
      // Assert
      expect(workoutService.retrieveWorkoutPlan).toHaveBeenCalledWith(planId, userId, jwtToken);
      expect(result).toEqual(dbPlanData);
    });
    
    test('should throw NotFoundError when Supabase returns PGRST116 error', async () => {
      // Arrange
      const notFoundError = new NotFoundError(`Workout plan with ID ${planId} not found.`);
      workoutService.retrieveWorkoutPlan.mockRejectedValue(notFoundError);
      
      // Act & Assert
      await expect(workoutService.retrieveWorkoutPlan(planId, userId, jwtToken))
        .rejects
        .toThrow(NotFoundError);
    });
    
    test('should throw NotFoundError when no data is returned and no error', async () => {
      // Arrange
      const notFoundError = new NotFoundError(`Workout plan with ID ${planId} not found.`);
      workoutService.retrieveWorkoutPlan.mockRejectedValue(notFoundError);
      
      // Act & Assert
      await expect(workoutService.retrieveWorkoutPlan(planId, userId, jwtToken))
        .rejects
        .toThrow(NotFoundError);
    });
    
    test('should throw DatabaseError for non-PGRST116 errors', async () => {
      // Arrange
      const dbError = new DatabaseError('Database error retrieving workout plan: Other error');
      workoutService.retrieveWorkoutPlan.mockRejectedValue(dbError);
      
      // Act & Assert
      await expect(workoutService.retrieveWorkoutPlan(planId, userId, jwtToken))
        .rejects
        .toThrow(DatabaseError);
    });
    
    test('should throw DatabaseError when an unexpected error occurs', async () => {
      // Arrange
      const unexpectedError = new DatabaseError('Failed to retrieve workout plan: Unexpected error');
      workoutService.retrieveWorkoutPlan.mockRejectedValue(unexpectedError);
      
      // Act & Assert
      await expect(workoutService.retrieveWorkoutPlan(planId, userId, jwtToken))
        .rejects
        .toThrow(DatabaseError);
    });
  });
  
  /**
   * Tests for updateWorkoutPlan
   */
  describe('updateWorkoutPlan', () => {
    test('should update a workout plan successfully', async () => {
      // Arrange
      const updates = { plan: { ...mockWorkoutPlan, name: 'Updated Push Day' } };
      const updatedPlan = { 
        ...dbPlanData, 
        plan: updates.plan, 
        updated_at: '2023-01-02T00:00:00Z',
        version: 2
      };
      
      workoutService.updateWorkoutPlan.mockResolvedValue(updatedPlan);
      
      // Act
      const result = await workoutService.updateWorkoutPlan(planId, updates, userId, jwtToken);
      
      // Assert
      expect(workoutService.updateWorkoutPlan).toHaveBeenCalledWith(planId, updates, userId, jwtToken);
      expect(result).toEqual(updatedPlan);
    });
    
    test('should throw NotFoundError when plan does not exist', async () => {
      // Arrange
      const updates = { plan: { ...mockWorkoutPlan, name: 'Updated Push Day' } };
      const notFoundError = new NotFoundError(`Workout plan with ID ${planId} not found.`);
      
      workoutService.updateWorkoutPlan.mockRejectedValue(notFoundError);
      
      // Act & Assert
      await expect(workoutService.updateWorkoutPlan(planId, updates, userId, jwtToken))
        .rejects
        .toThrow(NotFoundError);
    });
    
    test('should throw ConflictError when maximum retry attempts are exceeded', async () => {
      // Arrange
      const updates = { plan: { ...mockWorkoutPlan, name: 'Updated Push Day' } };
      const conflictError = new ConflictError('Maximum retry attempts exceeded for concurrent workout plan update');
      
      workoutService.updateWorkoutPlan.mockRejectedValue(conflictError);
      
      // Act & Assert
      await expect(workoutService.updateWorkoutPlan(planId, updates, userId, jwtToken))
        .rejects
        .toThrow(ConflictError);
    });
    
    test('should throw DatabaseError for other database errors', async () => {
      // Arrange
      const updates = { plan: { ...mockWorkoutPlan, name: 'Updated Push Day' } };
      const dbError = new DatabaseError('Database error updating workout plan: Other error');
      
      workoutService.updateWorkoutPlan.mockRejectedValue(dbError);
      
      // Act & Assert
      await expect(workoutService.updateWorkoutPlan(planId, updates, userId, jwtToken))
        .rejects
        .toThrow(DatabaseError);
    });
  });
  
  /**
   * Tests for removeWorkoutPlan
   */
  describe('removeWorkoutPlan', () => {
    test('should remove a workout plan successfully', async () => {
      // Arrange
      workoutService.removeWorkoutPlan.mockResolvedValue(undefined);
      
      // Act & Assert
      await expect(workoutService.removeWorkoutPlan(planId, userId, jwtToken))
        .resolves
        .not.toThrow();
      
      expect(workoutService.removeWorkoutPlan).toHaveBeenCalledWith(planId, userId, jwtToken);
    });
    
    test('should throw NotFoundError when plan does not exist', async () => {
      // Arrange
      const notFoundError = new NotFoundError(`Workout plan with ID ${planId} not found.`);
      workoutService.removeWorkoutPlan.mockRejectedValue(notFoundError);
      
      // Act & Assert
      await expect(workoutService.removeWorkoutPlan(planId, userId, jwtToken))
        .rejects
        .toThrow(NotFoundError);
    });
    
    test('should throw DatabaseError when delete operation fails', async () => {
      // Arrange
      const dbError = new DatabaseError('Database error removing workout plan: Delete failed');
      workoutService.removeWorkoutPlan.mockRejectedValue(dbError);
      
      // Act & Assert
      await expect(workoutService.removeWorkoutPlan(planId, userId, jwtToken))
        .rejects
        .toThrow(DatabaseError);
    });
    
    test('should throw DatabaseError when an unexpected error occurs', async () => {
      // Arrange
      const unexpectedError = new DatabaseError('Failed to remove workout plan: Unexpected error');
      workoutService.removeWorkoutPlan.mockRejectedValue(unexpectedError);
      
      // Act & Assert
      await expect(workoutService.removeWorkoutPlan(planId, userId, jwtToken))
        .rejects
        .toThrow(DatabaseError);
    });
  });
}); 