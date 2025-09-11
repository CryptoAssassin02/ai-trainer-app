/**
 * @fileoverview Tests for Workout Log Controller
 */

const {
  logWorkout,
  getWorkoutLogs,
  getWorkoutLog,
  updateWorkoutLog,
  deleteWorkoutLog
} = require('../../controllers/workout-log');
const workoutLogService = require('../../services/workout-log-service');
const { NotFoundError, DatabaseError } = require('../../utils/errors');
const logger = require('../../config/logger');

// Mock dependencies
jest.mock('../../services/workout-log-service');
jest.mock('../../config/logger');

describe('Workout Log Controller', () => {
  // Common test data
  const mockUserId = 'user-123';
  const mockLogId = 'log-123';
  const mockJwtToken = 'Bearer mock-token';
  const mockDate = '2023-01-01';
  const mockExercisesCompleted = [
    {
      exercise_id: 'ex-123',
      exercise_name: 'Bench Press',
      sets_completed: 3,
      reps_completed: [8, 10, 12],
      weights_used: [135, 145, 155],
      felt_difficulty: 7
    }
  ];

  // Mock request and response objects
  let req;
  let res;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup request object
    req = {
      user: { id: mockUserId },
      headers: { authorization: mockJwtToken },
      params: {},
      body: {},
      query: {}
    };

    // Setup response object with jest mock functions
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  /**
   * logWorkout Tests
   */
  describe('logWorkout', () => {
    const mockLogData = {
      plan_id: 'plan-123',
      date: mockDate,
      completed: true,
      exercises_completed: mockExercisesCompleted,
      overall_difficulty: 7,
      energy_level: 8,
      satisfaction: 9,
      feedback: 'Good workout!'
    };

    test('returns 201 status with saved log on successful create', async () => {
      // Setup mock request body
      req.body = mockLogData;

      // Setup mock service response
      const mockSavedLog = { id: mockLogId, ...mockLogData, user_id: mockUserId };
      workoutLogService.storeWorkoutLog.mockResolvedValue(mockSavedLog);

      // Call the controller function
      await logWorkout(req, res);

      // Verify service was called correctly
      expect(workoutLogService.storeWorkoutLog).toHaveBeenCalledWith(
        mockUserId,
        mockLogData,
        'mock-token'
      );

      // Verify response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockSavedLog,
        message: 'Workout log saved successfully.'
      });
    });

    test('returns 401 status when userId is missing', async () => {
      // Setup request with missing user
      req.user = null;

      // Call the controller function
      await logWorkout(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required.'
      });

      // Verify service was not called
      expect(workoutLogService.storeWorkoutLog).not.toHaveBeenCalled();
    });

    test('returns 401 status when JWT token is missing', async () => {
      // Setup request with missing auth header
      req.headers = {};

      // Call the controller function
      await logWorkout(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required.'
      });

      // Verify service was not called
      expect(workoutLogService.storeWorkoutLog).not.toHaveBeenCalled();
    });

    test('returns 500 status on database error', async () => {
      // Setup mock request body
      req.body = mockLogData;

      // Setup mock service to throw database error
      workoutLogService.storeWorkoutLog.mockRejectedValue(
        new DatabaseError('Database error during insert')
      );

      // Call the controller function
      await logWorkout(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to save workout log due to a database issue.'
      });
    });

    test('returns 500 status on generic error', async () => {
      // Setup mock request body
      req.body = mockLogData;

      // Setup mock service to throw generic error
      workoutLogService.storeWorkoutLog.mockRejectedValue(
        new Error('Generic error')
      );

      // Call the controller function
      await logWorkout(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to save workout log due to an internal error.'
      });
    });
  });

  /**
   * getWorkoutLogs Tests
   */
  describe('getWorkoutLogs', () => {
    const mockLogs = [
      {
        id: 'log-1',
        user_id: mockUserId,
        plan_id: 'plan-123',
        date: '2023-01-01',
        exercises_completed: mockExercisesCompleted
      },
      {
        id: 'log-2',
        user_id: mockUserId,
        plan_id: 'plan-123',
        date: '2023-01-02',
        exercises_completed: mockExercisesCompleted
      }
    ];

    test('returns 200 status with logs on successful retrieval', async () => {
      // Setup mock query parameters
      req.query = { 
        limit: 10, 
        offset: 0,
        startDate: '2023-01-01',
        endDate: '2023-01-31' 
      };

      // Setup mock service response
      workoutLogService.retrieveWorkoutLogs.mockResolvedValue(mockLogs);

      // Call the controller function
      await getWorkoutLogs(req, res);

      // Verify service was called correctly
      expect(workoutLogService.retrieveWorkoutLogs).toHaveBeenCalledWith(
        mockUserId,
        req.query,
        'mock-token'
      );

      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockLogs,
        message: 'Workout logs retrieved successfully.'
      });
    });

    test('returns 401 status when userId is missing', async () => {
      // Setup request with missing user
      req.user = null;

      // Call the controller function
      await getWorkoutLogs(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required.'
      });

      // Verify service was not called
      expect(workoutLogService.retrieveWorkoutLogs).not.toHaveBeenCalled();
    });

    test('returns 500 status on database error', async () => {
      // Setup mock service to throw database error
      workoutLogService.retrieveWorkoutLogs.mockRejectedValue(
        new DatabaseError('Database error during retrieval')
      );

      // Call the controller function
      await getWorkoutLogs(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to retrieve workout logs due to a database issue.'
      });
    });

    test('returns 500 status on generic error', async () => {
      // Setup mock service to throw generic error
      workoutLogService.retrieveWorkoutLogs.mockRejectedValue(
        new Error('Generic error')
      );

      // Call the controller function
      await getWorkoutLogs(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to retrieve workout logs due to an internal error.'
      });
    });
  });

  /**
   * getWorkoutLog Tests
   */
  describe('getWorkoutLog', () => {
    const mockLog = {
      id: mockLogId,
      user_id: mockUserId,
      plan_id: 'plan-123',
      date: mockDate,
      exercises_completed: mockExercisesCompleted
    };

    test('returns 200 status with log on successful retrieval', async () => {
      // Setup mock request parameters
      req.params = { logId: mockLogId };

      // Setup mock service response
      workoutLogService.retrieveWorkoutLog.mockResolvedValue(mockLog);

      // Call the controller function
      await getWorkoutLog(req, res);

      // Verify service was called correctly
      expect(workoutLogService.retrieveWorkoutLog).toHaveBeenCalledWith(
        mockLogId,
        mockUserId,
        'mock-token'
      );

      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockLog,
        message: 'Workout log retrieved successfully.'
      });
    });

    test('returns 400 status when logId is missing', async () => {
      // Setup request with empty params
      req.params = {};

      // Call the controller function
      await getWorkoutLog(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Log ID is required.'
      });

      // Verify service was not called
      expect(workoutLogService.retrieveWorkoutLog).not.toHaveBeenCalled();
    });

    test('returns 404 status when log not found', async () => {
      // Setup mock request parameters
      req.params = { logId: 'non-existent-log' };

      // Setup mock service to throw not found error
      workoutLogService.retrieveWorkoutLog.mockRejectedValue(
        new NotFoundError('Workout log with ID non-existent-log not found.')
      );

      // Call the controller function
      await getWorkoutLog(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Workout log with ID non-existent-log not found.'
      });
    });

    test('returns 500 status on database error', async () => {
      // Setup mock request parameters
      req.params = { logId: mockLogId };

      // Setup mock service to throw database error
      workoutLogService.retrieveWorkoutLog.mockRejectedValue(
        new DatabaseError('Database error during retrieval')
      );

      // Call the controller function
      await getWorkoutLog(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to retrieve workout log due to a database issue.'
      });
    });
  });

  /**
   * updateWorkoutLog Tests
   */
  describe('updateWorkoutLog', () => {
    const mockUpdates = {
      completed: false,
      overall_difficulty: 9,
      feedback: 'Updated feedback'
    };

    const mockUpdatedLog = {
      id: mockLogId,
      user_id: mockUserId,
      plan_id: 'plan-123',
      date: mockDate,
      completed: false,
      exercises_completed: mockExercisesCompleted,
      overall_difficulty: 9,
      feedback: 'Updated feedback'
    };

    test('returns 200 status with updated log on successful update', async () => {
      // Setup mock request parameters and body
      req.params = { logId: mockLogId };
      req.body = mockUpdates;

      // Setup mock service response
      workoutLogService.updateWorkoutLog.mockResolvedValue(mockUpdatedLog);

      // Call the controller function
      await updateWorkoutLog(req, res);

      // Verify service was called correctly
      expect(workoutLogService.updateWorkoutLog).toHaveBeenCalledWith(
        mockLogId,
        mockUpdates,
        mockUserId,
        'mock-token'
      );

      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockUpdatedLog,
        message: 'Workout log updated successfully.'
      });
    });

    test('returns 400 status when logId is missing', async () => {
      // Setup request with empty params
      req.params = {};
      req.body = mockUpdates;

      // Call the controller function
      await updateWorkoutLog(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Log ID is required.'
      });

      // Verify service was not called
      expect(workoutLogService.updateWorkoutLog).not.toHaveBeenCalled();
    });

    test('returns 404 status when log not found', async () => {
      // Setup mock request parameters and body
      req.params = { logId: 'non-existent-log' };
      req.body = mockUpdates;

      // Setup mock service to throw not found error
      workoutLogService.updateWorkoutLog.mockRejectedValue(
        new NotFoundError('Workout log with ID non-existent-log not found.')
      );

      // Call the controller function
      await updateWorkoutLog(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Workout log with ID non-existent-log not found.'
      });
    });

    test('returns 500 status on database error', async () => {
      // Setup mock request parameters and body
      req.params = { logId: mockLogId };
      req.body = mockUpdates;

      // Setup mock service to throw database error
      workoutLogService.updateWorkoutLog.mockRejectedValue(
        new DatabaseError('Database error during update')
      );

      // Call the controller function
      await updateWorkoutLog(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to update workout log due to a database issue.'
      });
    });
  });

  /**
   * deleteWorkoutLog Tests
   */
  describe('deleteWorkoutLog', () => {
    test('returns 200 status on successful deletion', async () => {
      // Setup mock request parameters
      req.params = { logId: mockLogId };

      // Setup mock service response (void)
      workoutLogService.deleteWorkoutLog.mockResolvedValue();

      // Call the controller function
      await deleteWorkoutLog(req, res);

      // Verify service was called correctly
      expect(workoutLogService.deleteWorkoutLog).toHaveBeenCalledWith(
        mockLogId,
        mockUserId,
        'mock-token'
      );

      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Workout log deleted successfully.'
      });
    });

    test('returns 400 status when logId is missing', async () => {
      // Setup request with empty params
      req.params = {};

      // Call the controller function
      await deleteWorkoutLog(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Log ID is required.'
      });

      // Verify service was not called
      expect(workoutLogService.deleteWorkoutLog).not.toHaveBeenCalled();
    });

    test('returns 404 status when log not found', async () => {
      // Setup mock request parameters
      req.params = { logId: 'non-existent-log' };

      // Setup mock service to throw not found error
      workoutLogService.deleteWorkoutLog.mockRejectedValue(
        new NotFoundError('Workout log with ID non-existent-log not found.')
      );

      // Call the controller function
      await deleteWorkoutLog(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Workout log with ID non-existent-log not found.'
      });
    });

    test('returns 500 status on database error', async () => {
      // Setup mock request parameters
      req.params = { logId: mockLogId };

      // Setup mock service to throw database error
      workoutLogService.deleteWorkoutLog.mockRejectedValue(
        new DatabaseError('Database error during deletion')
      );

      // Call the controller function
      await deleteWorkoutLog(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to delete workout log due to a database issue.'
      });
    });
  });
}); 