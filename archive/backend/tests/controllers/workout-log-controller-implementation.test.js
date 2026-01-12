/** @jest-environment node */

const workoutLogController = require('../../controllers/workout-log');
const workoutLogService = require('../../services/workout-log-service');
const logger = require('../../config/logger');
const { NotFoundError, DatabaseError } = require('../../utils/errors');

// Mock dependencies
jest.mock('../../services/workout-log-service');
jest.mock('../../config/logger');

// Mock Express request and response objects
let mockReq;
let mockRes;

beforeEach(() => {
  mockReq = {
    user: { id: 'user-123' },
    headers: { authorization: 'Bearer valid-token' },
    body: {},
    query: {},
    params: {},
  };
  mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  // Reset mocks before each test
  jest.clearAllMocks();
});

describe('Workout Log Controller Implementation Tests', () => {

  describe('createWorkoutLog', () => {
    test('should return 401 if user ID is missing', async () => {
      mockReq.user = null;
      await workoutLogController.createWorkoutLog(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('createWorkoutLog called without userId or jwtToken in request context.');
    });

    test('should return 401 if JWT token is missing', async () => {
      mockReq.headers.authorization = undefined;
      await workoutLogController.createWorkoutLog(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('createWorkoutLog called without userId or jwtToken in request context.');
    });

    test('should successfully create a workout log', async () => {
      const logInput = { planId: 'plan-1', date: '2023-01-15', loggedExercises: [] };
      const savedLog = { id: 'log-xyz', ...logInput, userId: 'user-123' };
      mockReq.body = logInput;
      workoutLogService.storeWorkoutLog.mockResolvedValue(savedLog);

      await workoutLogController.createWorkoutLog(mockReq, mockRes);

      expect(workoutLogService.storeWorkoutLog).toHaveBeenCalledWith('user-123', logInput, 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: savedLog,
        message: 'Workout log saved successfully.'
      });
      expect(logger.info).toHaveBeenCalledWith('Creating workout log for user: user-123');
      expect(logger.info).toHaveBeenCalledWith('Workout log created successfully, ID: log-xyz');
    });

    test('should return 500 if workoutLogService.storeWorkoutLog throws DatabaseError', async () => {
      const logInput = { planId: 'plan-1', date: '2023-01-15' };
      const dbError = new DatabaseError('Insert failed');
      mockReq.body = logInput;
      workoutLogService.storeWorkoutLog.mockRejectedValue(dbError);

      await workoutLogController.createWorkoutLog(mockReq, mockRes);

      expect(workoutLogService.storeWorkoutLog).toHaveBeenCalledWith('user-123', logInput, 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to save workout log due to a database issue.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error creating workout log'), expect.any(Object));
    });

    test('should return 500 if workoutLogService.storeWorkoutLog throws generic error', async () => {
      const logInput = { planId: 'plan-1', date: '2023-01-15' };
      const genericError = new Error('Unexpected failure');
      mockReq.body = logInput;
      workoutLogService.storeWorkoutLog.mockRejectedValue(genericError);

      await workoutLogController.createWorkoutLog(mockReq, mockRes);

      expect(workoutLogService.storeWorkoutLog).toHaveBeenCalledWith('user-123', logInput, 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to save workout log due to an internal error.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error creating workout log'), expect.any(Object));
    });
  });

  describe('getWorkoutLogs', () => {
    test('should return 401 if user ID is missing', async () => {
      mockReq.user = null;
      await workoutLogController.getWorkoutLogs(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('getWorkoutLogs called without userId or jwtToken in request context.');
    });

    test('should return 401 if JWT token is missing', async () => {
      mockReq.headers.authorization = undefined;
      await workoutLogController.getWorkoutLogs(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('getWorkoutLogs called without userId or jwtToken in request context.');
    });

    test('should successfully retrieve workout logs with filters', async () => {
      const mockLogs = [{ id: 'log-1' }, { id: 'log-2' }];
      mockReq.query = { limit: '20', offset: '0', startDate: '2023-01-01' }; // Example filters
      workoutLogService.retrieveWorkoutLogs.mockResolvedValue(mockLogs);

      await workoutLogController.getWorkoutLogs(mockReq, mockRes);

      expect(workoutLogService.retrieveWorkoutLogs).toHaveBeenCalledWith('user-123', mockReq.query, 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockLogs,
        message: 'Workout logs retrieved successfully.'
      });
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Fetching workout logs for user: user-123'));
      expect(logger.info).toHaveBeenCalledWith('Found 2 workout logs for user user-123');
    });

    test('should return 500 if workoutLogService.retrieveWorkoutLogs throws DatabaseError', async () => {
      const dbError = new DatabaseError('Query failed');
      mockReq.query = { planId: 'plan-abc' };
      workoutLogService.retrieveWorkoutLogs.mockRejectedValue(dbError);

      await workoutLogController.getWorkoutLogs(mockReq, mockRes);

      expect(workoutLogService.retrieveWorkoutLogs).toHaveBeenCalledWith('user-123', mockReq.query, 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to retrieve workout logs due to a database issue.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error retrieving workout logs'), expect.any(Object));
    });

    test('should return 500 if workoutLogService.retrieveWorkoutLogs throws generic error', async () => {
      const genericError = new Error('Unexpected retrieval issue');
      workoutLogService.retrieveWorkoutLogs.mockRejectedValue(genericError);

      await workoutLogController.getWorkoutLogs(mockReq, mockRes);

      expect(workoutLogService.retrieveWorkoutLogs).toHaveBeenCalledWith('user-123', mockReq.query, 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to retrieve workout logs due to an internal error.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error retrieving workout logs'), expect.any(Object));
    });
  });

  describe('getWorkoutLog', () => {
    test('should return 401 if user ID is missing', async () => {
      mockReq.user = null;
      mockReq.params.logId = 'log-abc';
      await workoutLogController.getWorkoutLog(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('getWorkoutLog called without userId or jwtToken in request context.');
    });

    test('should return 401 if JWT token is missing', async () => {
      mockReq.headers.authorization = undefined;
      mockReq.params.logId = 'log-abc';
      await workoutLogController.getWorkoutLog(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('getWorkoutLog called without userId or jwtToken in request context.');
    });

    test('should return 400 if logId parameter is missing', async () => {
      await workoutLogController.getWorkoutLog(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Log ID is required.' });
      expect(workoutLogService.retrieveWorkoutLog).not.toHaveBeenCalled();
    });

    test('should successfully retrieve a specific workout log', async () => {
      const logId = 'log-abc';
      const mockLog = { id: logId, notes: 'Good session' };
      mockReq.params.logId = logId;
      workoutLogService.retrieveWorkoutLog.mockResolvedValue(mockLog);

      await workoutLogController.getWorkoutLog(mockReq, mockRes);

      expect(workoutLogService.retrieveWorkoutLog).toHaveBeenCalledWith(logId, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockLog,
        message: 'Workout log retrieved successfully.'
      });
      expect(logger.info).toHaveBeenCalledWith(`Fetching workout log ID: ${logId} for user: user-123`);
      expect(logger.info).toHaveBeenCalledWith(`Log ${logId} retrieved successfully for user user-123`);
    });

    test('should return 404 if workoutLogService.retrieveWorkoutLog throws NotFoundError', async () => {
      const logId = 'log-not-found';
      const notFoundError = new NotFoundError('Log not found.');
      mockReq.params.logId = logId;
      workoutLogService.retrieveWorkoutLog.mockRejectedValue(notFoundError);

      await workoutLogController.getWorkoutLog(mockReq, mockRes);

      expect(workoutLogService.retrieveWorkoutLog).toHaveBeenCalledWith(logId, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Log not found.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error retrieving workout log ${logId}`), expect.any(Object));
    });

    test('should return 500 if workoutLogService.retrieveWorkoutLog throws DatabaseError', async () => {
      const logId = 'log-db-error';
      const dbError = new DatabaseError('Connection failed');
      mockReq.params.logId = logId;
      workoutLogService.retrieveWorkoutLog.mockRejectedValue(dbError);

      await workoutLogController.getWorkoutLog(mockReq, mockRes);

      expect(workoutLogService.retrieveWorkoutLog).toHaveBeenCalledWith(logId, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to retrieve workout log due to a database issue.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error retrieving workout log ${logId}`), expect.any(Object));
    });

    test('should return 500 if workoutLogService.retrieveWorkoutLog throws generic error', async () => {
      const logId = 'log-generic-error';
      const genericError = new Error('Something broke');
      mockReq.params.logId = logId;
      workoutLogService.retrieveWorkoutLog.mockRejectedValue(genericError);

      await workoutLogController.getWorkoutLog(mockReq, mockRes);

      expect(workoutLogService.retrieveWorkoutLog).toHaveBeenCalledWith(logId, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to retrieve workout log due to an internal error.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error retrieving workout log ${logId}`), expect.any(Object));
    });
  });

  describe('updateWorkoutLog', () => {
    test('should return 401 if user ID is missing', async () => {
      mockReq.user = null;
      mockReq.params.logId = 'log-update';
      await workoutLogController.updateWorkoutLog(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('updateWorkoutLog called without userId or jwtToken in request context.');
    });

    test('should return 401 if JWT token is missing', async () => {
      mockReq.headers.authorization = undefined;
      mockReq.params.logId = 'log-update';
      await workoutLogController.updateWorkoutLog(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('updateWorkoutLog called without userId or jwtToken in request context.');
    });

    test('should return 400 if logId parameter is missing', async () => {
      await workoutLogController.updateWorkoutLog(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Log ID is required.' });
      expect(workoutLogService.updateWorkoutLog).not.toHaveBeenCalled();
    });

    test('should successfully update a workout log', async () => {
      const logId = 'log-update';
      const updates = { notes: 'Updated notes' };
      const updatedLog = { id: logId, notes: 'Updated notes', userId: 'user-123' };
      mockReq.params.logId = logId;
      mockReq.body = updates;
      workoutLogService.updateWorkoutLog.mockResolvedValue(updatedLog);

      await workoutLogController.updateWorkoutLog(mockReq, mockRes);

      expect(workoutLogService.updateWorkoutLog).toHaveBeenCalledWith(logId, updates, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: updatedLog,
        message: 'Workout log updated successfully.'
      });
      expect(logger.info).toHaveBeenCalledWith(`Updating workout log ID: ${logId} for user: user-123`);
      expect(logger.info).toHaveBeenCalledWith(`Workout log ${logId} updated successfully for user user-123`);
    });

    test('should return 404 if workoutLogService.updateWorkoutLog throws NotFoundError', async () => {
      const logId = 'log-not-found';
      const updates = { notes: 'Update attempt' };
      const notFoundError = new NotFoundError('Log to update not found.');
      mockReq.params.logId = logId;
      mockReq.body = updates;
      workoutLogService.updateWorkoutLog.mockRejectedValue(notFoundError);

      await workoutLogController.updateWorkoutLog(mockReq, mockRes);

      expect(workoutLogService.updateWorkoutLog).toHaveBeenCalledWith(logId, updates, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Log to update not found.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error updating workout log ${logId}`), expect.any(Object));
    });

    test('should return 500 if workoutLogService.updateWorkoutLog throws DatabaseError', async () => {
      const logId = 'log-update-db-error';
      const updates = { notes: 'Update attempt' };
      const dbError = new DatabaseError('Update query failed');
      mockReq.params.logId = logId;
      mockReq.body = updates;
      workoutLogService.updateWorkoutLog.mockRejectedValue(dbError);

      await workoutLogController.updateWorkoutLog(mockReq, mockRes);

      expect(workoutLogService.updateWorkoutLog).toHaveBeenCalledWith(logId, updates, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to update workout log due to a database issue.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error updating workout log ${logId}`), expect.any(Object));
    });

    test('should return 500 if workoutLogService.updateWorkoutLog throws generic error', async () => {
      const logId = 'log-update-generic-error';
      const updates = { notes: 'Update attempt' };
      const genericError = new Error('Weird update issue');
      mockReq.params.logId = logId;
      mockReq.body = updates;
      workoutLogService.updateWorkoutLog.mockRejectedValue(genericError);

      await workoutLogController.updateWorkoutLog(mockReq, mockRes);

      expect(workoutLogService.updateWorkoutLog).toHaveBeenCalledWith(logId, updates, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to update workout log due to an internal error.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error updating workout log ${logId}`), expect.any(Object));
    });
  });

  describe('deleteWorkoutLog', () => {
    test('should return 401 if user ID is missing', async () => {
      mockReq.user = null;
      mockReq.params.logId = 'log-delete';
      await workoutLogController.deleteWorkoutLog(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('deleteWorkoutLog called without userId or jwtToken in request context.');
    });

    test('should return 401 if JWT token is missing', async () => {
      mockReq.headers.authorization = undefined;
      mockReq.params.logId = 'log-delete';
      await workoutLogController.deleteWorkoutLog(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('deleteWorkoutLog called without userId or jwtToken in request context.');
    });

    test('should return 400 if logId parameter is missing', async () => {
      await workoutLogController.deleteWorkoutLog(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Log ID is required.' });
      expect(workoutLogService.deleteWorkoutLog).not.toHaveBeenCalled();
    });

    test('should successfully delete a workout log and return 200', async () => {
      const logId = 'log-delete';
      mockReq.params.logId = logId;
      workoutLogService.deleteWorkoutLog.mockResolvedValue(); // Service resolves successfully

      await workoutLogController.deleteWorkoutLog(mockReq, mockRes);

      expect(workoutLogService.deleteWorkoutLog).toHaveBeenCalledWith(logId, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(200); // Controller returns 200 for delete
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', message: 'Workout log deleted successfully.' });
      expect(logger.info).toHaveBeenCalledWith(`Deleting workout log ID: ${logId} for user: user-123`);
      expect(logger.info).toHaveBeenCalledWith(`Workout log ${logId} deleted successfully for user user-123`);
    });

    test('should return 404 if workoutLogService.deleteWorkoutLog throws NotFoundError', async () => {
      const logId = 'log-not-found';
      const notFoundError = new NotFoundError('Log to delete not found.');
      mockReq.params.logId = logId;
      workoutLogService.deleteWorkoutLog.mockRejectedValue(notFoundError);

      await workoutLogController.deleteWorkoutLog(mockReq, mockRes);

      expect(workoutLogService.deleteWorkoutLog).toHaveBeenCalledWith(logId, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Log to delete not found.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error deleting workout log ${logId}`), expect.any(Object));
    });

    test('should return 500 if workoutLogService.deleteWorkoutLog throws DatabaseError', async () => {
      const logId = 'log-delete-db-error';
      const dbError = new DatabaseError('Delete query failed');
      mockReq.params.logId = logId;
      workoutLogService.deleteWorkoutLog.mockRejectedValue(dbError);

      await workoutLogController.deleteWorkoutLog(mockReq, mockRes);

      expect(workoutLogService.deleteWorkoutLog).toHaveBeenCalledWith(logId, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to delete workout log due to a database issue.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error deleting workout log ${logId}`), expect.any(Object));
    });

    test('should return 500 if workoutLogService.deleteWorkoutLog throws generic error', async () => {
      const logId = 'log-delete-generic-error';
      const genericError = new Error('Weird delete issue');
      mockReq.params.logId = logId;
      workoutLogService.deleteWorkoutLog.mockRejectedValue(genericError);

      await workoutLogController.deleteWorkoutLog(mockReq, mockRes);

      expect(workoutLogService.deleteWorkoutLog).toHaveBeenCalledWith(logId, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to delete workout log due to an internal error.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error deleting workout log ${logId}`), expect.any(Object));
    });
  });

  // Other describe blocks will follow
}); 