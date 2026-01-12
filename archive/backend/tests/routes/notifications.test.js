const request = require('supertest');
const express = require('express');

// Mock dependencies
const mockAuthenticate = jest.fn((req, res, next) => {
  req.user = { id: 'test-user-id' }; // Simulate authenticated user
  next();
});
const mockValidateNotificationPreferences = jest.fn((req, res, next) => next());

const mockNotificationController = {
  updatePreferences: jest.fn((req, res) => res.status(200).json({ message: 'updatePreferences called' })),
  getPreferences: jest.fn((req, res) => res.status(200).json({ message: 'getPreferences called' })),
  testNotification: jest.fn((req, res) => res.status(200).json({ message: 'testNotification called' })),
};

// Mock express-rate-limit
const mockPreferencesLimiter = jest.fn((req, res, next) => next());
let capturedRateLimitOptions;

jest.mock('../../middleware/auth', () => ({
  authenticate: mockAuthenticate,
}));
jest.mock('../../middleware/validation', () => ({
  validateNotificationPreferences: mockValidateNotificationPreferences,
}));
jest.mock('../../controllers/notifications', () => mockNotificationController);
jest.mock('express-rate-limit', () => {
  const factory = jest.fn((options) => {
    capturedRateLimitOptions = options; // Capture options for testing keyGenerator
    return mockPreferencesLimiter; // notifications.js only creates one limiter instance
  });
  return factory;
});

// Import the router after mocks are set up
const notificationsRouter = require('../../routes/notifications');

// Setup Express app for testing
const app = express();
app.use(express.json()); // To parse JSON request bodies
// Mounting the router at the root because its internal routes are already prefixed with /v1/notifications
app.use('/', notificationsRouter);

describe('Notifications Routes', () => {
  beforeEach(() => {
    // Clear all mock call counts before each test
    mockAuthenticate.mockClear();
    mockValidateNotificationPreferences.mockClear();
    mockNotificationController.updatePreferences.mockClear();
    mockNotificationController.getPreferences.mockClear();
    mockNotificationController.testNotification.mockClear();
    mockPreferencesLimiter.mockClear();
    
    // Clear the captured options for rateLimit factory
    const rateLimitFactory = jest.requireMock('express-rate-limit');
    rateLimitFactory.mockClear(); // Clear calls to the factory itself
  });

  describe('Rate Limiter Configuration', () => {
    it('should configure preferencesLimiter with correct options including keyGenerator', () => {
      // The router is imported at the top, which initializes the rate limiter.
      // We check the options captured by the mock factory when notificationsRouter was required.
      // The rateLimit factory mock itself is called only once at module load time.
      expect(capturedRateLimitOptions).toBeDefined(); // This confirms the factory was called.
      expect(capturedRateLimitOptions.windowMs).toBe(60 * 60 * 1000);
      expect(capturedRateLimitOptions.max).toBe(10);
      expect(typeof capturedRateLimitOptions.keyGenerator).toBe('function');
      expect(capturedRateLimitOptions.message).toEqual({
        status: 'error',
        message: 'Too many preference updates. Please try again later.'
      });
      expect(capturedRateLimitOptions.standardHeaders).toBe(true);
      expect(capturedRateLimitOptions.legacyHeaders).toBe(false);
    });

    it('keyGenerator should return req.user.id', () => {
      // capturedRateLimitOptions is set during the initial module load.
      expect(capturedRateLimitOptions).toBeDefined(); 
      expect(typeof capturedRateLimitOptions.keyGenerator).toBe('function'); // Ensure keyGenerator exists
      const mockReq = { user: { id: 'sample-user-id-for-key' } };
      const key = capturedRateLimitOptions.keyGenerator(mockReq);
      expect(key).toBe('sample-user-id-for-key');
    });
  });

  describe('POST /v1/notifications/preferences', () => {
    it('should call the correct middleware and controller for updating preferences', async () => {
      const requestBody = { emailNotifications: true };
      await request(app)
        .post('/v1/notifications/preferences')
        .send(requestBody)
        .expect(200);

      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
      expect(mockPreferencesLimiter).toHaveBeenCalledTimes(1);
      expect(mockValidateNotificationPreferences).toHaveBeenCalledTimes(1);
      expect(mockNotificationController.updatePreferences).toHaveBeenCalledTimes(1);
      expect(mockNotificationController.updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ body: requestBody, user: { id: 'test-user-id' } }),
        expect.any(Object), // res
        expect.any(Function) // next
      );

      // Ensure other controller methods were not called
      expect(mockNotificationController.getPreferences).not.toHaveBeenCalled();
      expect(mockNotificationController.testNotification).not.toHaveBeenCalled();
    });
  });

  describe('GET /v1/notifications/preferences', () => {
    it('should call the correct middleware and controller for getting preferences', async () => {
      await request(app)
        .get('/v1/notifications/preferences')
        .expect(200);

      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
      expect(mockNotificationController.getPreferences).toHaveBeenCalledTimes(1);
      expect(mockNotificationController.getPreferences).toHaveBeenCalledWith(
        expect.objectContaining({ user: { id: 'test-user-id' } }),
        expect.any(Object), // res
        expect.any(Function) // next
      );

      // Ensure other middlewares/controllers were not called for this specific route
      expect(mockPreferencesLimiter).not.toHaveBeenCalled();
      expect(mockValidateNotificationPreferences).not.toHaveBeenCalled();
      expect(mockNotificationController.updatePreferences).not.toHaveBeenCalled();
      expect(mockNotificationController.testNotification).not.toHaveBeenCalled();
    });
  });

  describe('POST /v1/notifications/test', () => {
    it('should call the correct middleware and controller for sending a test notification', async () => {
      const requestBody = { message: 'Test notification' }; // Example body, may not be used by mock
      await request(app)
        .post('/v1/notifications/test')
        .send(requestBody)
        .expect(200);

      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
      expect(mockPreferencesLimiter).toHaveBeenCalledTimes(1);
      expect(mockNotificationController.testNotification).toHaveBeenCalledTimes(1);
      expect(mockNotificationController.testNotification).toHaveBeenCalledWith(
        expect.objectContaining({ body: requestBody, user: { id: 'test-user-id' } }),
        expect.any(Object), // res
        expect.any(Function) // next
      );

      // Ensure other middlewares/controllers were not called for this specific route
      expect(mockValidateNotificationPreferences).not.toHaveBeenCalled();
      expect(mockNotificationController.updatePreferences).not.toHaveBeenCalled();
      expect(mockNotificationController.getPreferences).not.toHaveBeenCalled();
    });
  });
}); 