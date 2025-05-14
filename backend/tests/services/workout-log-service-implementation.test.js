// Mock dependencies first
jest.mock('../../services/supabase', () => ({
  getSupabaseClientWithJWT: jest.fn(),
}));
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Now import the necessary things *after* mocks are defined
const { getSupabaseClientWithJWT } = require('../../services/supabase');
const logger = require('../../config/logger');
const { DatabaseError, NotFoundError, ValidationError } = require('../../utils/errors');
const { storeWorkoutLog, retrieveWorkoutLogs, retrieveWorkoutLog, updateWorkoutLog, deleteWorkoutLog } = require('../../services/workout-log-service');

describe('Workout Log Service Implementation Tests', () => {
  let mockSupabaseClient;

  beforeEach(() => {
    // Reset all mocks, including spies potentially set up in tests
    jest.clearAllMocks();

    // Setup default mock behavior for Supabase client
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      single: jest.fn(), // Define behavior per test
    };
    getSupabaseClientWithJWT.mockReturnValue(mockSupabaseClient);
  });

  // --- storeWorkoutLog Tests ---
  describe('storeWorkoutLog', () => {
    const userId = 'user-123';
    const jwtToken = 'valid.jwt.token';
    const logData = {
      plan_id: 'plan-abc',
      date: '2023-10-26',
      loggedExercises: [{ exerciseName: 'Squats', setsCompleted: [{ weightUsed: 100, repsCompleted: 10 }] }],
      // other necessary fields...
    };
    const mockStoredLog = { id: 'log-xyz', user_id: userId, ...logData };

    it('should store a workout log successfully', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockStoredLog, error: null });

      const result = await storeWorkoutLog(userId, logData, jwtToken);

      expect(getSupabaseClientWithJWT).toHaveBeenCalledWith(jwtToken);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('workout_logs');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({ user_id: userId, ...logData });
      expect(mockSupabaseClient.select).toHaveBeenCalled();
      expect(mockSupabaseClient.single).toHaveBeenCalled();
      expect(result).toEqual(mockStoredLog);
      expect(logger.info).toHaveBeenCalledWith(`Workout log stored successfully for user: ${userId}, Log ID: ${mockStoredLog.id}`);
    });

    it('should throw ValidationError if logData is missing required fields', async () => {
      const invalidLogData = { date: '2023-10-26' }; // Missing loggedExercises

      await expect(storeWorkoutLog(userId, invalidLogData, jwtToken))
        .rejects.toThrow(ValidationError);
      await expect(storeWorkoutLog(userId, invalidLogData, jwtToken))
        .rejects.toThrow('Invalid workout log data: date and loggedExercises are required.');
      expect(getSupabaseClientWithJWT).not.toHaveBeenCalled();
    });

    it('should throw DatabaseError if Supabase insert returns an error', async () => {
      const supabaseError = new Error('Insert failed');
      supabaseError.code = 'DB_INSERT_ERR';
      // Explicitly mock the promise resolution
      const mockPromise = Promise.resolve({ data: null, error: supabaseError });
      mockSupabaseClient.single.mockReturnValue(mockPromise);

      await expect(storeWorkoutLog(userId, logData, jwtToken))
        .rejects.toThrow(DatabaseError); // Check type first
      // Now check the specific message expected from the *inner* error handling
      await expect(storeWorkoutLog(userId, logData, jwtToken))
         .rejects.toThrow(`Database error storing workout log: ${supabaseError.message}`);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Supabase error storing workout log for user ${userId}: ${supabaseError.message}`));
      // Ensure the mock was actually awaited
      await mockPromise;
    });

    it('should throw DatabaseError if Supabase insert returns no data', async () => {
       // Explicitly mock the promise resolution
      const mockPromise = Promise.resolve({ data: null, error: null });
      mockSupabaseClient.single.mockReturnValue(mockPromise);

      await expect(storeWorkoutLog(userId, logData, jwtToken))
        .rejects.toThrow(DatabaseError); // Check type first
      // Now check the specific message expected from the *inner* error handling
      await expect(storeWorkoutLog(userId, logData, jwtToken))
         .rejects.toThrow('Failed to store workout log, no data returned.');
       expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`No data returned after inserting workout log for user ${userId}.`));
       // Ensure the mock was actually awaited
       await mockPromise;
    });

     it('should rethrow DatabaseError if caught', async () => {
        const dbError = new DatabaseError('Specific DB issue');
        mockSupabaseClient.single.mockImplementation(() => {
          throw dbError;
        });

        await expect(storeWorkoutLog(userId, logData, jwtToken)).rejects.toThrow(dbError);
    });

    it('should throw DatabaseError for unexpected errors during storage', async () => {
        const unexpectedError = new Error('Something unexpected broke');
        mockSupabaseClient.single.mockImplementation(() => {
          throw unexpectedError;
        });

        await expect(storeWorkoutLog(userId, logData, jwtToken)).rejects.toThrow(DatabaseError);
        await expect(storeWorkoutLog(userId, logData, jwtToken))
          .rejects.toThrow(`Failed to store workout log: ${unexpectedError.message}`);
         expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error in storeWorkoutLog for user ${userId}: ${unexpectedError.message}`));
    });

  });

  // --- retrieveWorkoutLogs Tests ---
  describe('retrieveWorkoutLogs', () => {
    const userId = 'user-123';
    const jwtToken = 'valid.jwt.token';
    const mockLogs = [
      { id: 'log-1', user_id: userId, date: '2023-10-26', plan_id: 'plan-abc' },
      { id: 'log-2', user_id: userId, date: '2023-10-25', plan_id: 'plan-def' },
    ];

    it('should retrieve logs successfully with default limit/offset', async () => {
      mockSupabaseClient.range.mockReturnThis(); // Keep chaining
      // Mock the final await query call
      const mockQuery = Promise.resolve({ data: mockLogs, error: null });
      mockSupabaseClient.range.mockReturnValue(mockQuery);

      const result = await retrieveWorkoutLogs(userId, {}, jwtToken);

      expect(getSupabaseClientWithJWT).toHaveBeenCalledWith(jwtToken);
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('workout_logs');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('date', { ascending: false });
      expect(mockSupabaseClient.range).toHaveBeenCalledWith(0, 9); // Default limit 10 -> range(0, 9)
      expect(result).toEqual(mockLogs);
      expect(logger.info).toHaveBeenCalledWith(`Retrieved ${mockLogs.length} workout logs for user: ${userId}`);
      await mockQuery; // Ensure promise was awaited
    });

    it('should retrieve logs successfully with pagination', async () => {
      const filters = { limit: 5, offset: 5 };
      const paginatedLogs = [ mockLogs[0] ]; // Simulate fewer logs returned
      mockSupabaseClient.range.mockReturnThis();
      const mockQuery = Promise.resolve({ data: paginatedLogs, error: null });
      mockSupabaseClient.range.mockReturnValue(mockQuery);

      const result = await retrieveWorkoutLogs(userId, filters, jwtToken);

      expect(mockSupabaseClient.range).toHaveBeenCalledWith(5, 9); // offset 5, limit 5 -> range(5, 9)
      expect(result).toEqual(paginatedLogs);
       expect(logger.info).toHaveBeenCalledWith(`Retrieved ${paginatedLogs.length} workout logs for user: ${userId}`);
      await mockQuery;
    });

    it('should retrieve logs successfully with date filters', async () => {
      const filters = { startDate: '2023-10-25', endDate: '2023-10-26' };
      mockSupabaseClient.range.mockReturnThis();
      const mockQuery = Promise.resolve({ data: mockLogs, error: null });
      mockSupabaseClient.range.mockReturnValue(mockQuery);

      await retrieveWorkoutLogs(userId, filters, jwtToken);

      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('date', filters.startDate);
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith('date', filters.endDate);
      await mockQuery;
    });

    it('should retrieve logs successfully with planId filter', async () => {
      const filters = { planId: 'plan-abc' };
      mockSupabaseClient.range.mockReturnThis();
      const mockQuery = Promise.resolve({ data: [mockLogs[0]], error: null }); // Only log-1 matches
      mockSupabaseClient.range.mockReturnValue(mockQuery);

      const result = await retrieveWorkoutLogs(userId, filters, jwtToken);

      // The first eq is for user_id, the second for plan_id
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('plan_id', filters.planId);
      expect(result).toEqual([mockLogs[0]]);
      await mockQuery;
    });

    it('should return an empty array if no logs are found', async () => {
      mockSupabaseClient.range.mockReturnThis();
      const mockQuery = Promise.resolve({ data: null, error: null }); // Simulate no data
      mockSupabaseClient.range.mockReturnValue(mockQuery);

      const result = await retrieveWorkoutLogs(userId, {}, jwtToken);

      expect(result).toEqual([]);
      expect(logger.info).toHaveBeenCalledWith(`Retrieved 0 workout logs for user: ${userId}`);
      await mockQuery;
    });

    it('should throw DatabaseError if Supabase select returns an error', async () => {
      const supabaseError = new Error('Select failed');
      mockSupabaseClient.range.mockReturnThis();
      const mockQuery = Promise.resolve({ data: null, error: supabaseError });
      mockSupabaseClient.range.mockReturnValue(mockQuery);

      await expect(retrieveWorkoutLogs(userId, {}, jwtToken))
        .rejects.toThrow(DatabaseError);
      await expect(retrieveWorkoutLogs(userId, {}, jwtToken))
        .rejects.toThrow(`Database error retrieving workout logs: ${supabaseError.message}`);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Supabase error retrieving workout logs for user ${userId}: ${supabaseError.message}`));
      await mockQuery;
    });

    it('should throw DatabaseError for unexpected errors during retrieval', async () => {
        const unexpectedError = new Error('Something unexpected broke during retrieval');
        // Make the initial 'from' call throw
        mockSupabaseClient.from.mockImplementation(() => {
            throw unexpectedError;
        });

        await expect(retrieveWorkoutLogs(userId, {}, jwtToken)).rejects.toThrow(DatabaseError);
        await expect(retrieveWorkoutLogs(userId, {}, jwtToken))
          .rejects.toThrow(`Failed to retrieve workout logs: ${unexpectedError.message}`);
         expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error in retrieveWorkoutLogs for user ${userId}: ${unexpectedError.message}`));
    });

  });

  // --- retrieveWorkoutLog Tests ---
  describe('retrieveWorkoutLog', () => {
    const logId = 'log-xyz';
    const userId = 'user-123';
    const jwtToken = 'valid.jwt.token';
    const mockLog = { id: logId, user_id: userId, date: '2023-10-26' };

    it('should retrieve a specific log successfully', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockLog, error: null });

      const result = await retrieveWorkoutLog(logId, userId, jwtToken);

      expect(getSupabaseClientWithJWT).toHaveBeenCalledWith(jwtToken);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('workout_logs');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', logId);
      expect(mockSupabaseClient.single).toHaveBeenCalled();
      expect(result).toEqual(mockLog);
      expect(logger.info).toHaveBeenCalledWith(`Workout log ID: ${logId} retrieved successfully for user: ${userId}`);
    });

    it('should throw NotFoundError if Supabase returns PGRST116 error', async () => {
      const notFoundError = new Error('Resource not found');
      notFoundError.code = 'PGRST116';
      const mockPromise = Promise.resolve({ data: null, error: notFoundError });
      mockSupabaseClient.single.mockReturnValue(mockPromise);

      await expect(retrieveWorkoutLog(logId, userId, jwtToken))
        .rejects.toThrow(NotFoundError);
      // Assert the specific message from the inner logic
      await expect(retrieveWorkoutLog(logId, userId, jwtToken))
        .rejects.toThrow(`Workout log with ID ${logId} not found.`);
      expect(logger.warn).toHaveBeenCalledWith(`Workout log ID: ${logId} not found for user: ${userId}.`);
      await mockPromise; // Ensure promise was awaited
    });

    it('should throw NotFoundError if Supabase returns zero rows message', async () => {
        const notFoundError = new Error('Results contain 0 rows');
        const mockPromise = Promise.resolve({ data: null, error: notFoundError });
        mockSupabaseClient.single.mockReturnValue(mockPromise);

        await expect(retrieveWorkoutLog(logId, userId, jwtToken))
          .rejects.toThrow(NotFoundError);
        // Assert the specific message from the inner logic
        await expect(retrieveWorkoutLog(logId, userId, jwtToken))
          .rejects.toThrow(`Workout log with ID ${logId} not found.`);
         expect(logger.warn).toHaveBeenCalledWith(`Workout log ID: ${logId} not found for user: ${userId}.`);
         await mockPromise; // Ensure promise was awaited
      });

    it('should throw NotFoundError if Supabase returns no data and no error', async () => {
      const mockPromise = Promise.resolve({ data: null, error: null });
      mockSupabaseClient.single.mockReturnValue(mockPromise);

      await expect(retrieveWorkoutLog(logId, userId, jwtToken))
        .rejects.toThrow(NotFoundError);
      // Assert the specific message from the inner logic
       await expect(retrieveWorkoutLog(logId, userId, jwtToken))
        .rejects.toThrow(`Workout log with ID ${logId} not found.`);
       expect(logger.warn).toHaveBeenCalledWith(`Workout log ID: ${logId} not found for user: ${userId} (no data returned).`);
       await mockPromise; // Ensure promise was awaited
    });

    it('should throw DatabaseError if Supabase select returns a different error', async () => {
      const dbError = new Error('DB connection failed');
      const mockPromise = Promise.resolve({ data: null, error: dbError });
      mockSupabaseClient.single.mockReturnValue(mockPromise);

      await expect(retrieveWorkoutLog(logId, userId, jwtToken))
        .rejects.toThrow(DatabaseError);
      // Assert the specific message from the inner logic
       await expect(retrieveWorkoutLog(logId, userId, jwtToken))
        .rejects.toThrow(`Database error retrieving workout log: ${dbError.message}`);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Supabase error retrieving workout log ${logId} for user ${userId}: ${dbError.message}`));
      await mockPromise; // Ensure promise was awaited
    });

     it('should throw DatabaseError for unexpected errors during single retrieval', async () => {
        const unexpectedError = new Error('Something unexpected broke during single retrieval');
        mockSupabaseClient.single.mockImplementation(() => {
            throw unexpectedError;
        });

        await expect(retrieveWorkoutLog(logId, userId, jwtToken)).rejects.toThrow(DatabaseError);
        await expect(retrieveWorkoutLog(logId, userId, jwtToken))
          .rejects.toThrow(`Failed to retrieve workout log: ${unexpectedError.message}`);
         expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error in retrieveWorkoutLog for log ${logId}, user ${userId}: ${unexpectedError.message}`));
    });
  });

  // --- updateWorkoutLog Tests ---
  describe('updateWorkoutLog', () => {
    const logId = 'log-xyz';
    const userId = 'user-123';
    const jwtToken = 'valid.jwt.token';
    const updates = { notes: 'Updated notes' };
    const mockExistingLog = { id: logId, user_id: userId, date: '2023-10-26', notes: 'Original' };
    // Create a mock function for dependency injection
    let mockRetrieveFn;

    beforeEach(() => {
        // Reset the mock function before each test
        mockRetrieveFn = jest.fn();
    });

    it('should update a workout log successfully', async () => {
      // Configure the mock retrieve function to succeed
      mockRetrieveFn.mockResolvedValue(mockExistingLog);

      const updatedLogData = { ...mockExistingLog, ...updates, updated_at: new Date().toISOString() };
      const mockUpdatePromise = Promise.resolve({ data: updatedLogData, error: null });
      mockSupabaseClient.single.mockReturnValue(mockUpdatePromise);

      // Pass the mock retrieve function as the last argument
      const result = await updateWorkoutLog(logId, updates, userId, jwtToken, mockRetrieveFn);

      // Assert that the mock retrieve function was called
      expect(mockRetrieveFn).toHaveBeenCalledWith(logId, userId, jwtToken);
      expect(getSupabaseClientWithJWT).toHaveBeenCalledWith(jwtToken);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('workout_logs');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(expect.objectContaining({
        ...updates,
        updated_at: expect.any(String),
      }));
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', logId);
      expect(mockSupabaseClient.select).toHaveBeenCalled();
      expect(mockSupabaseClient.single).toHaveBeenCalled();
      expect(result).toEqual(updatedLogData);
      expect(logger.info).toHaveBeenCalledWith(`Workout log ID: ${logId} updated successfully for user: ${userId}`);
      await mockUpdatePromise;
    });

    it('should re-throw NotFoundError if the provided retrieveFn fails with NotFoundError', async () => {
      const notFoundError = new NotFoundError(`Workout log with ID ${logId} not found.`);
      mockRetrieveFn.mockRejectedValue(notFoundError);

      // Expect the *exact* error instance thrown by the mock to be re-thrown
      await expect(updateWorkoutLog(logId, updates, userId, jwtToken, mockRetrieveFn))
        .rejects.toThrow(notFoundError);

      expect(mockRetrieveFn).toHaveBeenCalledWith(logId, userId, jwtToken);
      expect(mockSupabaseClient.update).not.toHaveBeenCalled();
      // Logger will still log the error message
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error in updateWorkoutLog for log ${logId}, user ${userId}: ${notFoundError.message}`));
    });

    it('should throw DatabaseError if Supabase update returns an error', async () => {
      mockRetrieveFn.mockResolvedValue(mockExistingLog);
      const supabaseError = new Error('Update failed');
      const mockUpdatePromise = Promise.resolve({ data: null, error: supabaseError });
      mockSupabaseClient.single.mockReturnValue(mockUpdatePromise);

      await expect(updateWorkoutLog(logId, updates, userId, jwtToken, mockRetrieveFn))
        .rejects.toThrow(DatabaseError);
      await expect(updateWorkoutLog(logId, updates, userId, jwtToken, mockRetrieveFn))
        .rejects.toThrow(`Database error updating workout log: ${supabaseError.message}`); // Specific update error message
      // ... other assertions ...
      await mockUpdatePromise;
    });

     it('should throw DatabaseError if Supabase update returns no data', async () => {
      mockRetrieveFn.mockResolvedValue(mockExistingLog);
      const mockUpdatePromise = Promise.resolve({ data: null, error: null });
      mockSupabaseClient.single.mockReturnValue(mockUpdatePromise);

      await expect(updateWorkoutLog(logId, updates, userId, jwtToken, mockRetrieveFn))
        .rejects.toThrow(DatabaseError);
      await expect(updateWorkoutLog(logId, updates, userId, jwtToken, mockRetrieveFn))
        .rejects.toThrow('Failed to update workout log, no data returned.'); // Specific no data error message
       // ... other assertions ...
      await mockUpdatePromise;
    });

     it('should throw DatabaseError for unexpected errors during update process', async () => {
        mockRetrieveFn.mockResolvedValue(mockExistingLog);
        const unexpectedError = new Error('Something unexpected broke during update');
        mockSupabaseClient.single.mockImplementation(() => {
            throw unexpectedError;
        });

        await expect(updateWorkoutLog(logId, updates, userId, jwtToken, mockRetrieveFn)).rejects.toThrow(DatabaseError);
        // Assert the specific wrapped error message
        await expect(updateWorkoutLog(logId, updates, userId, jwtToken, mockRetrieveFn))
          .rejects.toThrow(`Unexpected error during workout log update: ${unexpectedError.message}`);
         // ... other assertions ...
    });

    it('should re-throw DatabaseError if the provided retrieveFn fails with non-NotFoundError', async () => {
        const dbError = new DatabaseError('Retrieve failed unexpectedly');
        mockRetrieveFn.mockRejectedValue(dbError);

        // Expect the *exact* error instance to be re-thrown
        await expect(updateWorkoutLog(logId, updates, userId, jwtToken, mockRetrieveFn))
            .rejects.toThrow(dbError);

        expect(mockRetrieveFn).toHaveBeenCalledWith(logId, userId, jwtToken);
        expect(mockSupabaseClient.update).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error in updateWorkoutLog for log ${logId}, user ${userId}: ${dbError.message}`));
    });
  });

  // --- deleteWorkoutLog Tests ---
  describe('deleteWorkoutLog', () => {
    const logId = 'log-xyz';
    const userId = 'user-123';
    const jwtToken = 'valid.jwt.token';
    const mockExistingLog = { id: logId, user_id: userId, date: '2023-10-26' };
    let mockRetrieveFn;

    beforeEach(() => {
        mockRetrieveFn = jest.fn();
    });

    it('should delete a workout log successfully', async () => {
      mockRetrieveFn.mockResolvedValue(mockExistingLog);
      const mockDeletePromise = Promise.resolve({ error: null });
      // Important: mock the delete() call itself, not single()
      mockSupabaseClient.delete.mockReturnValue(mockDeletePromise);

      // Pass the mock retrieve function
      await deleteWorkoutLog(logId, userId, jwtToken, mockRetrieveFn);

      expect(mockRetrieveFn).toHaveBeenCalledWith(logId, userId, jwtToken);
      expect(getSupabaseClientWithJWT).toHaveBeenCalledWith(jwtToken);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('workout_logs');
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', logId);
      expect(logger.info).toHaveBeenCalledWith(`Workout log ID: ${logId} deleted successfully for user: ${userId}`);
      await mockDeletePromise;
    });

    it('should re-throw NotFoundError if the provided retrieveFn fails with NotFoundError', async () => {
      const notFoundError = new NotFoundError(`Workout log with ID ${logId} not found.`);
      mockRetrieveFn.mockRejectedValue(notFoundError);

      // Expect the *exact* error instance
      await expect(deleteWorkoutLog(logId, userId, jwtToken, mockRetrieveFn))
        .rejects.toThrow(notFoundError);

      expect(mockRetrieveFn).toHaveBeenCalledWith(logId, userId, jwtToken);
      expect(mockSupabaseClient.delete).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error in deleteWorkoutLog for log ${logId}, user ${userId}: ${notFoundError.message}`));
    });

    it('should throw DatabaseError if Supabase delete returns an error', async () => {
      mockRetrieveFn.mockResolvedValue(mockExistingLog);
      const supabaseError = new Error('Delete failed');
      // Mock the delete call promise
      const mockDeletePromise = Promise.resolve({ error: supabaseError });
      mockSupabaseClient.delete.mockReturnValue(mockDeletePromise);

      await expect(deleteWorkoutLog(logId, userId, jwtToken, mockRetrieveFn))
        .rejects.toThrow(DatabaseError);
      // Expect the specific delete error message
      await expect(deleteWorkoutLog(logId, userId, jwtToken, mockRetrieveFn))
        .rejects.toThrow(`Database error deleting workout log: ${supabaseError.message}`);

      expect(mockRetrieveFn).toHaveBeenCalledWith(logId, userId, jwtToken);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Supabase error deleting workout log ${logId} for user ${userId}: ${supabaseError.message}`));
      await mockDeletePromise;
    });

    it('should re-throw DatabaseError if the provided retrieveFn fails with non-NotFoundError', async () => {
        const dbError = new DatabaseError('Retrieve failed unexpectedly during delete');
        mockRetrieveFn.mockRejectedValue(dbError);

        // Expect the *exact* error instance
        await expect(deleteWorkoutLog(logId, userId, jwtToken, mockRetrieveFn))
            .rejects.toThrow(dbError);

        expect(mockRetrieveFn).toHaveBeenCalledWith(logId, userId, jwtToken);
        expect(mockSupabaseClient.delete).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error in deleteWorkoutLog for log ${logId}, user ${userId}: ${dbError.message}`));
    });

    it('should throw DatabaseError for unexpected errors during delete process', async () => {
        mockRetrieveFn.mockResolvedValue(mockExistingLog);
        const unexpectedError = new Error('Something unexpected broke during delete');
        // Make the delete call throw
        mockSupabaseClient.delete.mockImplementation(() => {
            throw unexpectedError;
        });

        await expect(deleteWorkoutLog(logId, userId, jwtToken, mockRetrieveFn))
            .rejects.toThrow(DatabaseError);
        // Expect the wrapped unexpected error message
        await expect(deleteWorkoutLog(logId, userId, jwtToken, mockRetrieveFn))
            .rejects.toThrow(`Unexpected error during workout log deletion: ${unexpectedError.message}`);

        expect(mockRetrieveFn).toHaveBeenCalledWith(logId, userId, jwtToken);
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error in deleteWorkoutLog for log ${logId}, user ${userId}: ${unexpectedError.message}`));
    });
  });

});
