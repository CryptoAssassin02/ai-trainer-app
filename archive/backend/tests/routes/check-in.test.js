// Test suite for backend/routes/check-in.js
const express = require('express');
const request = require('supertest');
const checkInRoutes = require('../../routes/check-in'); // The router we are testing

// Mock middleware and controllers
jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => next()),
}));
jest.mock('../../middleware/validation', () => ({
  validateCheckIn: jest.fn((req, res, next) => next()),
  validateMetricsCalculation: jest.fn((req, res, next) => next()),
}));
jest.mock('../../controllers/check-in', () => ({
  recordCheckIn: jest.fn((req, res) => res.status(201).json({ message: 'Check-in recorded' })),
  getCheckIns: jest.fn((req, res) => res.status(200).json([])),
  getCheckIn: jest.fn((req, res) => res.status(200).json({})),
  calculateMetrics: jest.fn((req, res) => res.status(200).json({ metrics: {} })),
}));

jest.mock('express-rate-limit', () => {
  const mockRateLimitMiddlewareInstance = jest.fn((req, res, next) => next());
  const mockRateLimitFactory = jest.fn(() => mockRateLimitMiddlewareInstance);
  // Attach the instance to the factory for access in tests
  mockRateLimitFactory.getMiddleware = () => mockRateLimitMiddlewareInstance;
  return mockRateLimitFactory;
});


const app = express();
app.use(express.json()); // To parse JSON request bodies
// Important: Mount the router AFTER mocks are set up, especially for module-scoped instantiation like rate-limit
// const checkInRoutes = require('../../routes/check-in'); // Moved up
app.use('/v1/progress', checkInRoutes);

describe('Check-In Routes - /v1/progress', () => {
  const { authenticate } = require('../../middleware/auth');
  const { validateCheckIn, validateMetricsCalculation } = require('../../middleware/validation');
  const checkInController = require('../../controllers/check-in');
  const rateLimitFactory = require('express-rate-limit'); // This is our mock factory
  const mockRateLimitMiddleware = rateLimitFactory.getMiddleware(); // Get the instance

  beforeEach(() => {
    // Clear all mock call counts before each test
    authenticate.mockClear();
    validateCheckIn.mockClear();
    validateMetricsCalculation.mockClear(); // Added this clear
    checkInController.recordCheckIn.mockClear();
    checkInController.getCheckIns.mockClear();
    checkInController.getCheckIn.mockClear();
    checkInController.calculateMetrics.mockClear();
    
    rateLimitFactory.mockClear(); // Clear calls to the factory itself
    mockRateLimitMiddleware.mockClear(); // Clear calls to the middleware instance it returns
  });

  describe('POST /v1/progress/check-in', () => {
    it('should call authenticate, checkInLimiter, validateCheckIn, and recordCheckIn controller', async () => {
      const mockReqBody = { notes: 'Felt good' };
      await request(app)
        .post('/v1/progress/check-in')
        .send(mockReqBody)
        .expect(201);

      expect(authenticate).toHaveBeenCalledTimes(1);
      // The rateLimitFactory is called once when check-in.js is loaded to create checkInLimiter.
      // Since mockClear() is used in beforeEach, we don't re-check the factory call count here.
      // We primarily care that the *instance* of the limiter (mockRateLimitMiddleware) is called.
      expect(mockRateLimitMiddleware).toHaveBeenCalledTimes(1); // The limiter instance used by the route

      expect(validateCheckIn).toHaveBeenCalledTimes(1);
      expect(checkInController.recordCheckIn).toHaveBeenCalledTimes(1);
      expect(checkInController.recordCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({ body: mockReqBody }), 
        expect.anything(), 
        expect.anything()  
      );
    });
  });

  describe('GET /v1/progress/check-ins', () => {
    it('should call authenticate and getCheckIns controller', async () => {
      await request(app)
        .get('/v1/progress/check-ins')
        .expect(200);

      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(checkInController.getCheckIns).toHaveBeenCalledTimes(1);
      // Rate limiter not on this route, factory count should remain same (or not increment if we reset it carefully)
      // For simplicity, we'll assume rateLimitFactory is only called for routes that use it.
      // If this test runs after the POST test, rateLimitFactory would have been called once already.
      // The beforeEach clears it, so it SHOULD be 0 if this route doesn't use a limiter.
      expect(mockRateLimitMiddleware).not.toHaveBeenCalled();
    });
  });

  describe('GET /v1/progress/check-ins/:checkInId', () => {
    it('should call authenticate and getCheckIn controller', async () => {
      const mockCheckInId = '123e4567-e89b-12d3-a456-426614174000';
      await request(app)
        .get(`/v1/progress/check-ins/${mockCheckInId}`)
        .expect(200);

      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(checkInController.getCheckIn).toHaveBeenCalledTimes(1);
      expect(checkInController.getCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({ params: { checkInId: mockCheckInId } }),
        expect.anything(),
        expect.anything()
      );
      expect(mockRateLimitMiddleware).not.toHaveBeenCalled();
    });
  });

  describe('POST /v1/progress/metrics', () => {
    it('should call authenticate, validateMetricsCalculation, and calculateMetrics controller', async () => {
      const mockReqBody = { startDate: '2023-01-01', endDate: '2023-01-31' };
      await request(app)
        .post('/v1/progress/metrics')
        .send(mockReqBody)
        .expect(200);

      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(validateMetricsCalculation).toHaveBeenCalledTimes(1);
      expect(checkInController.calculateMetrics).toHaveBeenCalledTimes(1);
      expect(checkInController.calculateMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ body: mockReqBody }),
        expect.anything(),
        expect.anything()
      );
      expect(mockRateLimitMiddleware).not.toHaveBeenCalled();
    });
  });
}); 