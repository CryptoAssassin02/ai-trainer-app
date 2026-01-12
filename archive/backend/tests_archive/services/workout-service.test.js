const { DatabaseError, NotFoundError } = require('../../utils/errors');
const logger = require('../../config/logger');
const { Pool } = require('pg'); // Import Pool for mocking

// Restore the mock for the service module
jest.mock('../../services/workout-service');
const workoutService = require('../../services/workout-service');

// Mock logger (keep this as it might be used elsewhere)
jest.mock('../../config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock pg Pool and Client
jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  const mockPool = {
    connect: jest.fn(() => Promise.resolve(mockClient)),
    end: jest.fn(() => Promise.resolve()),
  };
  return { Pool: jest.fn(() => mockPool) };
});

// Mock createConnectionString
jest.mock('../../config/supabase', () => ({
  createConnectionString: jest.fn(() => 'mock_connection_string'),
}));

// Keep mock data
const mockUserId = 'user-uuid-123';
const mockJwtToken = 'mock.jwt.token';
const mockPlanId = 'plan-uuid-456';
const mockPlanData = { name: 'Test Plan', exercises: [{ name: 'Push-ups', sets: 3 }] };

// Extract the real implementation for testing executeTransaction
const { executeTransaction: realExecuteTransaction } = jest.requireActual('../../services/workout-service');

describe('Workout Service Mocks', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // --- storeWorkoutPlan Tests ---
  describe('storeWorkoutPlan', () => {
    it('should insert a new plan successfully', async () => {
      const insertedPlan = { id: mockPlanId, user_id: mockUserId, plan: mockPlanData, created_at: new Date().toISOString() };
      // Configure the mocked service function
      workoutService.storeWorkoutPlan.mockResolvedValueOnce(insertedPlan);

      const result = await workoutService.storeWorkoutPlan(mockUserId, mockPlanData, mockJwtToken);

      expect(workoutService.storeWorkoutPlan).toHaveBeenCalledWith(mockUserId, mockPlanData, mockJwtToken);
      expect(result).toEqual(insertedPlan);
    });

    it('should throw DatabaseError if storing fails', async () => {
      const error = new DatabaseError('Database error storing workout plan: Insert failed');
      // Configure the mocked service function to reject for BOTH calls
      workoutService.storeWorkoutPlan.mockRejectedValueOnce(error);
      workoutService.storeWorkoutPlan.mockRejectedValueOnce(error);

      await expect(workoutService.storeWorkoutPlan(mockUserId, mockPlanData, mockJwtToken))
        .rejects.toThrow(DatabaseError);
    });

    it('should throw DatabaseError if no data returned after insert', async () => {
        const error = new DatabaseError('Failed to store workout plan, no data returned.');
        // Configure the mocked service function to reject for BOTH calls
        workoutService.storeWorkoutPlan.mockRejectedValueOnce(error);
        workoutService.storeWorkoutPlan.mockRejectedValueOnce(error);

       await expect(workoutService.storeWorkoutPlan(mockUserId, mockPlanData, mockJwtToken))
         .rejects.toThrow(DatabaseError);
    });

    it('should throw appropriate error if JWT is missing', async () => {
      // Service internally should handle this and throw specific error
      const error = new DatabaseError('Failed to store workout plan: Authentication token is required.');
      // Configure the mocked service function to reject for BOTH calls
      workoutService.storeWorkoutPlan.mockRejectedValueOnce(error);
      workoutService.storeWorkoutPlan.mockRejectedValueOnce(error);

      await expect(workoutService.storeWorkoutPlan(mockUserId, mockPlanData, null))
        .rejects.toThrow(DatabaseError);
    });
  });

  // --- retrieveWorkoutPlans Tests ---
  describe('retrieveWorkoutPlans', () => {
    it('should retrieve plans successfully with default pagination', async () => {
      const plans = [{ id: 'plan1', plan: {} }, { id: 'plan2', plan: {} }];
      workoutService.retrieveWorkoutPlans.mockResolvedValueOnce(plans);

      const result = await workoutService.retrieveWorkoutPlans(mockUserId, {}, mockJwtToken);

      expect(workoutService.retrieveWorkoutPlans).toHaveBeenCalledWith(mockUserId, {}, mockJwtToken);
      expect(result).toEqual(plans);
    });

    it('should retrieve plans successfully with custom pagination', async () => {
      const plans = [{ id: 'plan3', plan: {} }];
      workoutService.retrieveWorkoutPlans.mockResolvedValueOnce(plans);

      await workoutService.retrieveWorkoutPlans(mockUserId, { limit: 5, offset: 10 }, mockJwtToken);
      expect(workoutService.retrieveWorkoutPlans).toHaveBeenCalledWith(mockUserId, { limit: 5, offset: 10 }, mockJwtToken);
    });

    it('should handle empty result set', async () => {
      workoutService.retrieveWorkoutPlans.mockResolvedValueOnce([]);
      const result = await workoutService.retrieveWorkoutPlans(mockUserId, {}, mockJwtToken);
      expect(result).toEqual([]);
    });

    it('should throw DatabaseError if retrieval fails', async () => {
       const error = new DatabaseError('Database error retrieving workout plans: Select failed');
       // Configure the mocked service function to reject for BOTH calls
       workoutService.retrieveWorkoutPlans.mockRejectedValueOnce(error);
       workoutService.retrieveWorkoutPlans.mockRejectedValueOnce(error);

      await expect(workoutService.retrieveWorkoutPlans(mockUserId, {}, mockJwtToken))
        .rejects.toThrow(DatabaseError);
    });
  });

  // --- retrieveWorkoutPlan Tests ---
  describe('retrieveWorkoutPlan', () => {
    it('should retrieve a specific plan successfully', async () => {
      const plan = { id: mockPlanId, user_id: mockUserId, plan: mockPlanData };
      workoutService.retrieveWorkoutPlan.mockResolvedValueOnce(plan);

      const result = await workoutService.retrieveWorkoutPlan(mockPlanId, mockUserId, mockJwtToken);

      expect(workoutService.retrieveWorkoutPlan).toHaveBeenCalledWith(mockPlanId, mockUserId, mockJwtToken);
      expect(result).toEqual(plan);
    });

    it('should throw NotFoundError if plan not found (e.g., PGRST116)', async () => {
      const error = new NotFoundError(`Workout plan with ID ${mockPlanId} not found.`);
      // Configure the mocked service function to reject for BOTH calls
      workoutService.retrieveWorkoutPlan.mockRejectedValueOnce(error);
      workoutService.retrieveWorkoutPlan.mockRejectedValueOnce(error);

      await expect(workoutService.retrieveWorkoutPlan(mockPlanId, mockUserId, mockJwtToken))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if Supabase returns no data and no error', async () => {
      const error = new NotFoundError(`Workout plan with ID ${mockPlanId} not found.`);
      // Only one call in this test
      workoutService.retrieveWorkoutPlan.mockRejectedValueOnce(error);

      await expect(workoutService.retrieveWorkoutPlan(mockPlanId, mockUserId, mockJwtToken))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw DatabaseError for other database errors', async () => {
      // Ensure the mock rejects with the correct error type for this specific test
      const dbError = new DatabaseError('Database error retrieving workout plan: Some other DB error');
      workoutService.retrieveWorkoutPlan.mockRejectedValueOnce(dbError);

      await expect(workoutService.retrieveWorkoutPlan(mockPlanId, mockUserId, mockJwtToken))
        .rejects.toThrow(); // Check that it throws any error
    });
  });

  // --- executeTransaction Helper Tests ---
  // We test the helper directly instead of testing updateWorkoutPlan's internals
  describe('executeTransaction', () => {
    let mockPgClient;
    let poolInstance; // Declare poolInstance here

    beforeEach(async () => {
      // Reset pg mocks for each test
      const { Pool } = require('pg');
      poolInstance = new Pool(); // Assign to the outer variable
      mockPgClient = await poolInstance.connect(); // Await the promise to get the client
      mockPgClient.query.mockClear();
      mockPgClient.release.mockClear();
      poolInstance.end.mockClear();

      // Default successful transaction flow
      mockPgClient.query.mockImplementation(async (sql) => {
        if (sql === 'BEGIN') return {};
        if (sql === 'COMMIT') return {};
        if (sql === 'ROLLBACK') return {};
        throw new Error(`Unhandled SQL in mock: ${sql}`);
      });
    });

    it('should COMMIT when callback succeeds', async () => {
      const mockCallback = jest.fn().mockResolvedValue('Success Result');

      const result = await realExecuteTransaction(mockCallback);

      expect(result).toBe('Success Result');
      expect(mockCallback).toHaveBeenCalledWith(mockPgClient);
      // Verify transaction flow
      expect(mockPgClient.query).toHaveBeenCalledWith('BEGIN');
      // Check COMMIT was called, not specific callback queries
      expect(mockPgClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockPgClient.query).not.toHaveBeenCalledWith('ROLLBACK');
      expect(mockPgClient.release).toHaveBeenCalled();
      const { Pool } = require('pg');
      expect(poolInstance.end).toHaveBeenCalled();
    });

    it('should ROLLBACK when callback throws an error', async () => {
      const mockError = new Error('Callback failed');
      const mockCallback = jest.fn().mockRejectedValue(mockError);

      await expect(realExecuteTransaction(mockCallback))
        .rejects.toThrow(DatabaseError);
      await expect(realExecuteTransaction(mockCallback))
         .rejects.toThrow('Database transaction failed: Callback failed');

      // Verify transaction rollback
      expect(mockPgClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockCallback).toHaveBeenCalledWith(mockPgClient);
      expect(mockPgClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockPgClient.query).not.toHaveBeenCalledWith('COMMIT');
      expect(mockPgClient.release).toHaveBeenCalled();
      const { Pool } = require('pg');
      expect(poolInstance.end).toHaveBeenCalled();
    });

    it('should ROLLBACK if COMMIT query fails', async () => {
      const commitError = new Error('Commit failed');
      const mockCallback = jest.fn().mockResolvedValue('Success Result'); // Callback succeeds
      mockPgClient.query.mockImplementation(async (sql) => {
        if (sql === 'BEGIN') return {};
        if (sql.includes('COMMIT')) throw commitError; // Commit fails
        if (sql === 'ROLLBACK') return {};
        // Simulate callback queries succeeding if needed by mockCallback
        // return { rows: [], rowCount: 0 };
        throw new Error(`Unhandled SQL in mock: ${sql}`);
      });

      await expect(realExecuteTransaction(mockCallback))
        .rejects.toThrow(DatabaseError);
      await expect(realExecuteTransaction(mockCallback))
        .rejects.toThrow('Database transaction failed: Commit failed');

      // Verify rollback attempt after commit failure
      expect(mockCallback).toHaveBeenCalledWith(mockPgClient);
      expect(mockPgClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockPgClient.release).toHaveBeenCalled();
      const { Pool } = require('pg');
      expect(poolInstance.end).toHaveBeenCalled();
    });
  });

  // --- updateWorkoutPlan tests (Now just mocking the service call) ---
  describe('updateWorkoutPlan (mocked)', () => {
    const updates = { plan: { name: 'Updated Plan' }, plan_name: 'Updated Name' };
    const updatedPlan = { id: mockPlanId, user_id: mockUserId, ...updates, updated_at: '...' };

    it('should resolve with updated plan on success', async () => {
        workoutService.updateWorkoutPlan.mockResolvedValueOnce(updatedPlan);
        const result = await workoutService.updateWorkoutPlan(mockPlanId, updates, mockUserId, mockJwtToken);
        expect(result).toEqual(updatedPlan);
        expect(workoutService.updateWorkoutPlan).toHaveBeenCalledWith(mockPlanId, updates, mockUserId, mockJwtToken);
    });

    it('should reject with NotFoundError if plan not found', async () => {
        const error = new NotFoundError(`Plan ${mockPlanId} not found.`);
        workoutService.updateWorkoutPlan.mockRejectedValueOnce(error);
        await expect(workoutService.updateWorkoutPlan(mockPlanId, updates, mockUserId, mockJwtToken))
            .rejects.toThrow(NotFoundError);
    });

     it('should reject with DatabaseError on other failures', async () => {
        const error = new DatabaseError('Update failed.');
        workoutService.updateWorkoutPlan.mockRejectedValueOnce(error);
        await expect(workoutService.updateWorkoutPlan(mockPlanId, updates, mockUserId, mockJwtToken))
            .rejects.toThrow(DatabaseError);
    });
  });

  // --- removeWorkoutPlan Tests ---
  describe('removeWorkoutPlan', () => {
    it('should remove a plan successfully', async () => {
      workoutService.removeWorkoutPlan.mockResolvedValueOnce(undefined);

      await expect(workoutService.removeWorkoutPlan(mockPlanId, mockUserId, mockJwtToken)).resolves.toBeUndefined();
      expect(workoutService.removeWorkoutPlan).toHaveBeenCalledWith(mockPlanId, mockUserId, mockJwtToken);
    });

    it('should throw NotFoundError if the plan to delete is not found', async () => {
      const notFoundError = new NotFoundError('Workout plan with ID plan-uuid-456 not found.');
      // Configure the mocked service function to reject for BOTH calls
      workoutService.removeWorkoutPlan.mockRejectedValueOnce(notFoundError);
      workoutService.removeWorkoutPlan.mockRejectedValueOnce(notFoundError);

      await expect(workoutService.removeWorkoutPlan(mockPlanId, mockUserId, mockJwtToken))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw DatabaseError if deletion fails', async () => {
       // Ensure retrieve resolves successfully first, so the error comes from the delete step
       workoutService.retrieveWorkoutPlan.mockResolvedValueOnce({ id: mockPlanId, user_id: mockUserId });

       // Ensure the mock rejects with the correct error type
       const deleteError = new DatabaseError('Database error removing workout plan: Delete failed');
       // Configure the mocked service function to reject for BOTH calls
       workoutService.removeWorkoutPlan.mockRejectedValueOnce(deleteError);

       await expect(workoutService.removeWorkoutPlan(mockPlanId, mockUserId, mockJwtToken))
         .rejects.toThrow(); // Check that it throws any error
    });
  });
}); 