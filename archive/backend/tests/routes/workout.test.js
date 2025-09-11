const express = require('express');
const request = require('supertest');

// Important: Mock express-rate-limit BEFORE requiring workoutRouter
let capturedPlanGenerationLimiterOptions;
const mockPlanGenerationLimiterMiddleware = jest.fn((req, res, next) => next());
jest.mock('express-rate-limit', () => jest.fn(options => {
  // Assuming only one limiter is created in workout.js, this will capture its options.
  // If multiple, a more sophisticated capture mechanism might be needed, e.g., based on call order or specific options.
  capturedPlanGenerationLimiterOptions = options;
  return mockPlanGenerationLimiterMiddleware;
}));

const workoutRouter = require('../../routes/workout');
const workoutController = require('../../controllers/workout');
const { authenticate } = require('../../middleware/auth');
const {
  validateWorkoutGeneration,
  validateWorkoutAdjustment,
  validateWorkoutQuery
} = require('../../middleware/validation');
const logger = require('../../config/logger');

// Mock other dependencies
jest.mock('../../controllers/workout', () => ({
  generateWorkoutPlan: jest.fn((req, res) => res.status(201).json({ message: 'generateWorkoutPlan called' })),
  getWorkoutPlans: jest.fn((req, res) => res.status(200).json({ message: 'getWorkoutPlans called' })),
  getWorkoutPlan: jest.fn((req, res) => res.status(200).json({ message: 'getWorkoutPlan called' })),
  adjustWorkoutPlan: jest.fn((req, res) => res.status(200).json({ message: 'adjustWorkoutPlan called' })),
  deleteWorkoutPlan: jest.fn((req, res) => res.status(200).json({ message: 'deleteWorkoutPlan called' })),
}));

jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'mockUserId', role: 'user' };
    next();
  }),
}));

jest.mock('../../middleware/validation', () => ({
  validateWorkoutGeneration: jest.fn((req, res, next) => next()),
  validateWorkoutAdjustment: jest.fn((req, res, next) => next()),
  validateWorkoutQuery: jest.fn((req, res, next) => next()),
}));

jest.mock('../../config/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

const app = express();
app.use(express.json());
// Mount the router with the expected base path for testing
app.use('/v1/workouts', workoutRouter);

describe('Workout Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rate Limiter Custom Handler (planGenerationLimiter)', () => {
    it('should call logger.warn and res.status.send with correct options when rate limit exceeded', () => {
      expect(capturedPlanGenerationLimiterOptions).toBeDefined();
      expect(typeof capturedPlanGenerationLimiterOptions.handler).toBe('function');

      const mockReq = { ip: '123.123.123.123' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      const mockNext = jest.fn();
      // Use the actual message from the workout.js limiter for accuracy
      const expectedLimiterMessage = {
        status: 'error',
        message: 'Too many workout plan generation requests from this IP, please try again after an hour'
      };
      const passedOptions = {
        statusCode: 429, // This is what the handler in workout.js expects
        message: expectedLimiterMessage
      };

      capturedPlanGenerationLimiterOptions.handler(mockReq, mockRes, mockNext, passedOptions);

      expect(logger.warn).toHaveBeenCalledWith(
        'Rate limit exceeded for workout generation', 
        { ip: mockReq.ip }
      );
      expect(mockRes.status).toHaveBeenCalledWith(passedOptions.statusCode);
      expect(mockRes.send).toHaveBeenCalledWith(passedOptions.message);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('POST /v1/workouts/', () => {
    it('should call authenticate, limiter, validation, and controller.generateWorkoutPlan', async () => {
      const workoutData = { fitnessLevel: 'beginner', goals: ['strength'] };
      const response = await request(app)
        .post('/v1/workouts/')
        .send(workoutData);

      expect(response.status).toBe(201);
      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(mockPlanGenerationLimiterMiddleware).toHaveBeenCalledTimes(1);
      expect(validateWorkoutGeneration).toHaveBeenCalledTimes(1);
      expect(workoutController.generateWorkoutPlan).toHaveBeenCalledTimes(1);
      expect(workoutController.generateWorkoutPlan).toHaveBeenCalledWith(
        expect.objectContaining({ body: workoutData }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('GET /v1/workouts/', () => {
    it('should call authenticate, validation, and controller.getWorkoutPlans', async () => {
      const queryParams = { limit: '10', offset: '0' };
      const response = await request(app)
        .get('/v1/workouts/')
        .query(queryParams);

      expect(response.status).toBe(200);
      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(validateWorkoutQuery).toHaveBeenCalledTimes(1);
      expect(workoutController.getWorkoutPlans).toHaveBeenCalledTimes(1);
      expect(workoutController.getWorkoutPlans).toHaveBeenCalledWith(
        expect.objectContaining({ query: queryParams }),
        expect.any(Object),
        expect.any(Function)
      );
      // Ensure the planGenerationLimiter is NOT called for this GET route
      expect(mockPlanGenerationLimiterMiddleware).not.toHaveBeenCalled();
    });
  });

  describe('GET /v1/workouts/:planId', () => {
    it('should call authenticate and controller.getWorkoutPlan', async () => {
      const planId = 'plan123';
      const response = await request(app)
        .get(`/v1/workouts/${planId}`);

      expect(response.status).toBe(200);
      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(workoutController.getWorkoutPlan).toHaveBeenCalledTimes(1);
      expect(workoutController.getWorkoutPlan).toHaveBeenCalledWith(
        expect.objectContaining({ params: { planId } }),
        expect.any(Object),
        expect.any(Function)
      );
      // Ensure limiter and other validation middlewares are not called
      expect(mockPlanGenerationLimiterMiddleware).not.toHaveBeenCalled();
      expect(validateWorkoutQuery).not.toHaveBeenCalled();
      expect(validateWorkoutGeneration).not.toHaveBeenCalled();
      expect(validateWorkoutAdjustment).not.toHaveBeenCalled();
    });
  });

  describe('POST /v1/workouts/:planId', () => {
    it('should call authenticate, validation, and controller.adjustWorkoutPlan', async () => {
      const planId = 'plan456';
      const adjustmentData = { notes: 'More cardio' };
      const response = await request(app)
        .post(`/v1/workouts/${planId}`)
        .send(adjustmentData);

      expect(response.status).toBe(200);
      expect(authenticate).toHaveBeenCalledTimes(1);
      // Plan generation limiter should not be used for adjustments unless specified
      expect(mockPlanGenerationLimiterMiddleware).not.toHaveBeenCalled(); 
      expect(validateWorkoutAdjustment).toHaveBeenCalledTimes(1);
      expect(workoutController.adjustWorkoutPlan).toHaveBeenCalledTimes(1);
      expect(workoutController.adjustWorkoutPlan).toHaveBeenCalledWith(
        expect.objectContaining({ params: { planId }, body: adjustmentData }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('DELETE /v1/workouts/:planId', () => {
    it('should call authenticate and controller.deleteWorkoutPlan', async () => {
      const planId = 'plan789';
      const response = await request(app)
        .delete(`/v1/workouts/${planId}`);

      expect(response.status).toBe(200);
      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(workoutController.deleteWorkoutPlan).toHaveBeenCalledTimes(1);
      expect(workoutController.deleteWorkoutPlan).toHaveBeenCalledWith(
        expect.objectContaining({ params: { planId } }),
        expect.any(Object),
        expect.any(Function)
      );
      // Ensure limiter and other validation middlewares are not called
      expect(mockPlanGenerationLimiterMiddleware).not.toHaveBeenCalled();
      expect(validateWorkoutQuery).not.toHaveBeenCalled();
      expect(validateWorkoutGeneration).not.toHaveBeenCalled();
      expect(validateWorkoutAdjustment).not.toHaveBeenCalled();
    });
  });

  // Tests will be added here based on phase5.md
}); 