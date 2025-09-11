const express = require('express');
const request = require('supertest');
// Important: Mock express-rate-limit BEFORE requiring workoutLogRouter
let capturedRateLimitOptions;
const mockLogOperationLimiterMiddleware = jest.fn((req, res, next) => next());
jest.mock('express-rate-limit', () => jest.fn(options => {
  capturedRateLimitOptions = options;
  return mockLogOperationLimiterMiddleware;
}));

const workoutLogRouter = require('../../routes/workout-log');
const workoutLogController = require('../../controllers/workout-log');
const { authenticate } = require('../../middleware/auth');
const { validateWorkoutLog, validateWorkoutLogUpdate, validateWorkoutLogQuery } = require('../../middleware/validation');
const logger = require('../../config/logger');

// Mock other dependencies
jest.mock('../../controllers/workout-log', () => ({
  logWorkout: jest.fn((req, res) => res.status(201).json({ message: 'logWorkout called' })),
  getWorkoutLogs: jest.fn((req, res) => res.status(200).json({ message: 'getWorkoutLogs called' })),
  getWorkoutLog: jest.fn((req, res) => res.status(200).json({ message: 'getWorkoutLog called' })),
  updateWorkoutLog: jest.fn((req, res) => res.status(200).json({ message: 'updateWorkoutLog called' })),
  deleteWorkoutLog: jest.fn((req, res) => res.status(200).json({ message: 'deleteWorkoutLog called' })),
}));

jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'mockUserId', role: 'user' };
    next();
  }),
}));

jest.mock('../../middleware/validation', () => ({
  validateWorkoutLog: jest.fn((req, res, next) => next()),
  validateWorkoutLogUpdate: jest.fn((req, res, next) => next()),
  validateWorkoutLogQuery: jest.fn((req, res, next) => next()),
}));

jest.mock('../../config/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use(workoutLogRouter);

describe('Workout Log Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset captured options for a clean state if needed, though it's set at module load once.
    // capturedRateLimitOptions = undefined; // Usually not needed if mock structure is sound.
  });

  describe('Rate Limiter Custom Handler', () => {
    it('should call logger.warn and res.status.send with correct options when rate limit exceeded', () => {
      // Ensure the router has been loaded so capturedRateLimitOptions is set
      expect(capturedRateLimitOptions).toBeDefined();
      expect(typeof capturedRateLimitOptions.handler).toBe('function');

      const mockReq = { ip: '123.123.123.123' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      const mockNext = jest.fn();
      const expectedOptions = {
        statusCode: 429, // Default, but good to check if it's what the handler uses
        message: {
          status: 'error',
          message: 'Too many workout log operations from this IP, please try again after an hour'
        }
      };

      capturedRateLimitOptions.handler(mockReq, mockRes, mockNext, expectedOptions);

      expect(logger.warn).toHaveBeenCalledWith(
        'Rate limit exceeded for workout log operations', 
        { ip: mockReq.ip }
      );
      expect(mockRes.status).toHaveBeenCalledWith(expectedOptions.statusCode);
      expect(mockRes.send).toHaveBeenCalledWith(expectedOptions.message);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('POST /workouts/log', () => {
    it('should call authenticate, limiter, validation, and controller.logWorkout', async () => {
      const logData = { exerciseName: 'Push Ups', sets: 3, reps: 10 };
      const response = await request(app)
        .post('/workouts/log')
        .send(logData);

      expect(response.status).toBe(201);
      expect(authenticate).toHaveBeenCalledTimes(1);
      // Verify our mock middleware (returned by the rate-limit mock factory) was called
      expect(mockLogOperationLimiterMiddleware).toHaveBeenCalledTimes(1);
      expect(validateWorkoutLog).toHaveBeenCalledTimes(1);
      expect(workoutLogController.logWorkout).toHaveBeenCalledTimes(1);
      expect(workoutLogController.logWorkout).toHaveBeenCalledWith(
        expect.objectContaining({ body: logData }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

 describe('GET /workouts/log', () => {
    it('should call authenticate, validation, and controller.getWorkoutLogs', async () => {
      const queryParams = { date: '2023-01-01' };
      const response = await request(app)
        .get('/workouts/log')
        .query(queryParams);

      expect(response.status).toBe(200);
      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(validateWorkoutLogQuery).toHaveBeenCalledTimes(1);
      expect(workoutLogController.getWorkoutLogs).toHaveBeenCalledTimes(1);
      expect(workoutLogController.getWorkoutLogs).toHaveBeenCalledWith(
        expect.objectContaining({ query: queryParams }),
        expect.any(Object),
        expect.any(Function)
      );
      // Ensure the rate limiter mock was NOT called for this GET route
      expect(mockLogOperationLimiterMiddleware).not.toHaveBeenCalled();
    });
  });

  describe('GET /workouts/log/:logId', () => {
    it('should call authenticate and controller.getWorkoutLog', async () => {
      const logId = 'testLogId123';
      const response = await request(app)
        .get(`/workouts/log/${logId}`);

      expect(response.status).toBe(200);
      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(workoutLogController.getWorkoutLog).toHaveBeenCalledTimes(1);
      expect(workoutLogController.getWorkoutLog).toHaveBeenCalledWith(
        expect.objectContaining({ params: { logId } }),
        expect.any(Object),
        expect.any(Function)
      );
      expect(mockLogOperationLimiterMiddleware).not.toHaveBeenCalled();
      expect(validateWorkoutLogQuery).not.toHaveBeenCalled(); // Not applied to this specific GET by ID
    });
  });

  describe('PATCH /workouts/log/:logId', () => {
    it('should call authenticate, limiter, validation, and controller.updateWorkoutLog', async () => {
      const logId = 'testLogId456';
      const updateData = { notes: 'Updated notes' };
      const response = await request(app)
        .patch(`/workouts/log/${logId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(mockLogOperationLimiterMiddleware).toHaveBeenCalledTimes(1);
      expect(validateWorkoutLogUpdate).toHaveBeenCalledTimes(1);
      expect(workoutLogController.updateWorkoutLog).toHaveBeenCalledTimes(1);
      expect(workoutLogController.updateWorkoutLog).toHaveBeenCalledWith(
        expect.objectContaining({ params: { logId }, body: updateData }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('DELETE /workouts/log/:logId', () => {
    it('should call authenticate and controller.deleteWorkoutLog', async () => {
      const logId = 'testLogId789';
      const response = await request(app)
        .delete(`/workouts/log/${logId}`);

      expect(response.status).toBe(200);
      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(workoutLogController.deleteWorkoutLog).toHaveBeenCalledTimes(1);
      expect(workoutLogController.deleteWorkoutLog).toHaveBeenCalledWith(
        expect.objectContaining({ params: { logId } }),
        expect.any(Object),
        expect.any(Function)
      );
      // Limiter and specific update/query validation should not be called for DELETE
      expect(mockLogOperationLimiterMiddleware).not.toHaveBeenCalled(); 
      expect(validateWorkoutLogUpdate).not.toHaveBeenCalled();
    });
  });

  // More tests to come
}); 