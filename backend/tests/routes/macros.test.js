const request = require('supertest');
const express = require('express');

// Mock dependencies
const mockAuthenticate = jest.fn((req, res, next) => {
  req.user = { id: 'test-user-id' }; // Simulate authenticated user
  next();
});
const mockValidateMacroCalculation = jest.fn((req, res, next) => next());

const mockMacroController = {
  calculateMacros: jest.fn((req, res) => res.status(200).json({ message: 'calculateMacros called' })),
  storeMacros: jest.fn((req, res) => res.status(201).json({ message: 'storeMacros called' })),
  getMacros: jest.fn((req, res) => res.status(200).json({ message: 'getMacros called' })),
  getLatestMacros: jest.fn((req, res) => res.status(200).json({ message: 'getLatestMacros called' })),
  updateMacros: jest.fn((req, res) => res.status(200).json({ message: 'updateMacros called' })),
};

// Mock express-rate-limit
// This will hold the mock middleware instances
const mockLimiters = {
  calculationLimiter: jest.fn((req, res, next) => next()),
  standardLimiter: jest.fn((req, res, next) => next()),
};

jest.mock('../../middleware/auth', () => ({
  authenticate: mockAuthenticate,
}));
jest.mock('../../middleware/validation', () => ({
  validateMacroCalculation: mockValidateMacroCalculation,
  // Add other validation mocks if macros.js uses them later
}));
jest.mock('../../controllers/macros', () => mockMacroController);
jest.mock('express-rate-limit', () => {
  const actualRateLimit = jest.requireActual('express-rate-limit');
  const factory = jest.fn((options) => {
    // Determine which limiter is being created based on options or call order if needed
    // For now, let's assume the first call is calculation, second is standard.
    // A more robust way would be to inspect options if they are distinct enough.
    if (factory.mock.calls.length === 1) { // First call in macros.js is calculationLimiter
      return mockLimiters.calculationLimiter;
    }
    return mockLimiters.standardLimiter; // Subsequent calls are standardLimiter
  });
  // Preserve any other exports from express-rate-limit if needed
  return Object.assign(factory, actualRateLimit);
});


// Import the router after mocks are set up
const macrosRouter = require('../../routes/macros');

// Setup Express app for testing
const app = express();
app.use(express.json()); // To parse JSON request bodies
app.use('/v1/macros', macrosRouter); // Mount the router

describe('Macros Routes - /v1/macros', () => {
  beforeEach(() => {
    // Clear all mock call counts before each test
    mockAuthenticate.mockClear();
    mockValidateMacroCalculation.mockClear();
    mockMacroController.calculateMacros.mockClear();
    mockMacroController.storeMacros.mockClear();
    mockMacroController.getMacros.mockClear();
    mockMacroController.getLatestMacros.mockClear();
    mockMacroController.updateMacros.mockClear();
    mockLimiters.calculationLimiter.mockClear();
    mockLimiters.standardLimiter.mockClear();

    // Reset the call count for the rateLimit factory mock if needed
    // This is tricky because rateLimit is called at module load time.
    // We are mocking the *returned middleware* so clearing those is key.
    // jest.requireMock('express-rate-limit').mockClear(); // This might not work as expected for module-level calls
  });

  describe('POST /v1/macros/calculate', () => {
    it('should call the correct middleware and controller method', async () => {
      const requestBody = { goal: 'muscle_gain' };
      await request(app)
        .post('/v1/macros/calculate')
        .send(requestBody)
        .expect(200);

      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
      // expect(mockLimiters.calculationLimiter).toHaveBeenCalledTimes(1); // This is tricky - see note below
      expect(mockValidateMacroCalculation).toHaveBeenCalledTimes(1);
      expect(mockMacroController.calculateMacros).toHaveBeenCalledTimes(1);
      expect(mockMacroController.calculateMacros).toHaveBeenCalledWith(
        expect.objectContaining({ body: requestBody, user: { id: 'test-user-id' } }),
        expect.any(Object), // Response object
        expect.any(Function) // Next function
      );

      // Verify other controller methods were NOT called
      expect(mockMacroController.storeMacros).not.toHaveBeenCalled();
      expect(mockMacroController.getMacros).not.toHaveBeenCalled();
      expect(mockMacroController.getLatestMacros).not.toHaveBeenCalled();
      expect(mockMacroController.updateMacros).not.toHaveBeenCalled();
    });

    it('should apply calculationLimiter', async () => {
      // This test primarily ensures the limiter mock (which calls next()) is in the stack.
      // The actual rate limiting logic is part of express-rate-limit itself and is mocked away.
      await request(app).post('/v1/macros/calculate').send({}).expect(200);
      // The mock for express-rate-limit returns mockLimiters.calculationLimiter for the first instantiation.
      // We need to ensure this mock function itself was called by Express when processing the route.
      expect(mockLimiters.calculationLimiter).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /v1/macros/', () => {
    it('should call the correct middleware and controller method for storing macros', async () => {
      const requestBody = { planName: 'My Custom Plan' };
      await request(app)
        .post('/v1/macros/')
        .send(requestBody)
        .expect(201);

      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
      // expect(mockLimiters.standardLimiter).toHaveBeenCalledTimes(1); // See note in previous test block
      expect(mockMacroController.storeMacros).toHaveBeenCalledTimes(1);
      expect(mockMacroController.storeMacros).toHaveBeenCalledWith(
        expect.objectContaining({ body: requestBody, user: { id: 'test-user-id' } }),
        expect.any(Object),
        expect.any(Function)
      );

      // Verify other controller methods were NOT called
      expect(mockMacroController.calculateMacros).not.toHaveBeenCalled();
      expect(mockMacroController.getMacros).not.toHaveBeenCalled();
      expect(mockMacroController.getLatestMacros).not.toHaveBeenCalled();
      expect(mockMacroController.updateMacros).not.toHaveBeenCalled();
      expect(mockValidateMacroCalculation).not.toHaveBeenCalled(); // Not for this route
    });

    it('should apply standardLimiter', async () => {
      await request(app).post('/v1/macros/').send({}).expect(201);
      // The mock for express-rate-limit returns mockLimiters.standardLimiter for the second instantiation.
      expect(mockLimiters.standardLimiter).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /v1/macros/', () => {
    it('should call the correct middleware and controller method for getting macros', async () => {
      await request(app)
        .get('/v1/macros/')
        .expect(200);

      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
      expect(mockMacroController.getMacros).toHaveBeenCalledTimes(1);
      expect(mockMacroController.getMacros).toHaveBeenCalledWith(
        expect.objectContaining({ user: { id: 'test-user-id' } }),
        expect.any(Object),
        expect.any(Function)
      );

      // Verify other controller methods were NOT called
      expect(mockMacroController.calculateMacros).not.toHaveBeenCalled();
      expect(mockMacroController.storeMacros).not.toHaveBeenCalled();
      expect(mockMacroController.getLatestMacros).not.toHaveBeenCalled();
      expect(mockMacroController.updateMacros).not.toHaveBeenCalled();
      expect(mockValidateMacroCalculation).not.toHaveBeenCalled();
    });

    it('should apply standardLimiter', async () => {
      await request(app).get('/v1/macros/').expect(200);
      expect(mockLimiters.standardLimiter).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /v1/macros/latest', () => {
    it('should call the correct middleware and controller method for getting the latest macros', async () => {
      await request(app)
        .get('/v1/macros/latest')
        .expect(200);

      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
      expect(mockMacroController.getLatestMacros).toHaveBeenCalledTimes(1);
      expect(mockMacroController.getLatestMacros).toHaveBeenCalledWith(
        expect.objectContaining({ user: { id: 'test-user-id' } }),
        expect.any(Object),
        expect.any(Function)
      );

      // Verify other controller methods were NOT called
      expect(mockMacroController.calculateMacros).not.toHaveBeenCalled();
      expect(mockMacroController.storeMacros).not.toHaveBeenCalled();
      expect(mockMacroController.getMacros).not.toHaveBeenCalled();
      expect(mockMacroController.updateMacros).not.toHaveBeenCalled();
      expect(mockValidateMacroCalculation).not.toHaveBeenCalled();
    });

    it('should apply standardLimiter', async () => {
      await request(app).get('/v1/macros/latest').expect(200);
      expect(mockLimiters.standardLimiter).toHaveBeenCalledTimes(1);
    });
  });

  describe('PUT /v1/macros/:planId', () => {
    it('should call the correct middleware and controller method for updating a macro plan', async () => {
      const planId = 'test-plan-123';
      const requestBody = { planName: 'Updated Plan Name' };
      await request(app)
        .put(`/v1/macros/${planId}`)
        .send(requestBody)
        .expect(200);

      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
      expect(mockMacroController.updateMacros).toHaveBeenCalledTimes(1);
      expect(mockMacroController.updateMacros).toHaveBeenCalledWith(
        expect.objectContaining({ 
          body: requestBody, 
          params: { planId }, 
          user: { id: 'test-user-id' } 
        }),
        expect.any(Object),
        expect.any(Function)
      );

      // Verify other controller methods were NOT called
      expect(mockMacroController.calculateMacros).not.toHaveBeenCalled();
      expect(mockMacroController.storeMacros).not.toHaveBeenCalled();
      expect(mockMacroController.getMacros).not.toHaveBeenCalled();
      expect(mockMacroController.getLatestMacros).not.toHaveBeenCalled();
      expect(mockValidateMacroCalculation).not.toHaveBeenCalled();
    });

    it('should apply standardLimiter', async () => {
      const planId = 'test-plan-456';
      await request(app).put(`/v1/macros/${planId}`).send({}).expect(200);
      expect(mockLimiters.standardLimiter).toHaveBeenCalledTimes(1);
    });
  });

  // Test cases will go here
}); 