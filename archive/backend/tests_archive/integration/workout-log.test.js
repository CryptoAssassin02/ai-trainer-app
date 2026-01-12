/**
 * @fileoverview Integration Tests for Workout Log API Endpoints (/v1/workouts/log)
 */

// Mock config dependencies BEFORE other imports
const mockIntegrationEnv = require('../__mocks__/config/env.integration'); // Load our mock env
jest.mock('../../config/env', () => mockIntegrationEnv);

// --- Mocking Setup ---
// Mock external dependencies and configurations FIRST
jest.mock('../../config/logger', () => ({
  // Export methods directly, not nested under 'logger'
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  fatal: jest.fn(),
  requestFormat: jest.fn().mockReturnValue({}), // Mock if needed
}));

jest.mock('../../utils/errors', () => {
  class CustomError extends Error {
    constructor(message, name) {
      super(message);
      this.name = name;
    }
  }
  return {
    NotFoundError: class NotFoundError extends CustomError { constructor(msg) { super(msg, 'NotFoundError'); this.statusCode = 404; } },
    DatabaseError: class DatabaseError extends CustomError { constructor(msg) { super(msg, 'DatabaseError'); this.statusCode = 500; } },
    ValidationError: class ValidationError extends CustomError { constructor(msg, details) { super(msg, 'ValidationError'); this.statusCode = 400; this.details = details;} },
    ApiError: class ApiError extends CustomError { constructor(msg, statusCode) { super(msg, 'ApiError'); this.statusCode = statusCode || 500; } },
    formatErrorResponse: jest.fn((err) => ({ status: 'error', message: err.message, code: err.name })),
  };
});

// Mock the JWT utilities to prevent interval setup
jest.mock('../../utils/jwt', () => ({
  cleanupBlacklistedTokens: jest.fn().mockResolvedValue(0), // Mock the cleanup function
  // Mock other JWT functions if they are used by the app/routes during test setup
  verifyToken: jest.fn(),
  generateToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  blacklistToken: jest.fn(),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
}));

// Mock the service layer - this is our primary boundary for integration tests
const mockWorkoutLogService = {
  storeWorkoutLog: jest.fn(),
  retrieveWorkoutLogs: jest.fn(),
  retrieveWorkoutLog: jest.fn(),
  updateWorkoutLog: jest.fn(),
  deleteWorkoutLog: jest.fn(),
};
jest.mock('../../services/workout-log-service', () => mockWorkoutLogService);

// Mock rate limiting middleware
jest.mock('../../middleware/rateLimit', () => ({
  apiLimiters: {
    standard: jest.fn((req, res, next) => next()),
    // Add specific limiters if used by other routes pulled in by app
  },
  authLimiters: {
    signup: jest.fn((req, res, next) => next()),
    login: jest.fn((req, res, next) => next()),
    refresh: jest.fn((req, res, next) => next()),
    passwordReset: jest.fn((req, res, next) => next()),
  }
}));

// Mock authentication middleware
const mockAuthenticateUserId = 'test-user-id-123';
const mockAuthenticate = jest.fn((req, res, next) => {
    // Attach user based on a test token, or simulate unauthorized if needed
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer valid-token')) {
        req.user = { id: mockAuthenticateUserId };
        req.tokenJti = 'valid-jti'; // Add JTI if needed by other parts
        next();
    } else {
        // Simulate unauthorized access if no valid token is provided
        res.status(401).json({ status: 'error', message: 'Unauthorized - Mock Auth' });
    }
});

jest.mock('../../middleware/auth', () => ({
  authenticate: mockAuthenticate,
  refreshToken: jest.fn((req, res, next) => next()),
  logout: jest.fn((req, res, next) => next()),
  requireAdmin: jest.fn((req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ status: 'error', message: 'Forbidden - Mock Admin Check' });
    }
  }),
}));

// Mock the auth controller used by routes/auth.js
jest.mock('../../controllers/auth.controller', () => ({
  signup: jest.fn((req, res, next) => res.status(201).json({ message: 'mock signup' })),
  login: jest.fn((req, res, next) => res.status(200).json({ message: 'mock login' })),
  getCurrentUser: jest.fn((req, res, next) => res.status(200).json({ id: mockAuthenticateUserId })),
  requestPasswordReset: jest.fn((req, res, next) => res.status(200).json({ message: 'mock password reset requested' })),
  resetPassword: jest.fn((req, res, next) => res.status(200).json({ message: 'mock password reset' })),
}));

// Mock the profile controller used by routes/profile.js
jest.mock('../../controllers/profile.js', () => ({
  getProfile: jest.fn((req, res, next) => res.status(200).json({ id: req.user.id, message: 'mock profile' })),
  updateProfile: jest.fn((req, res, next) => res.status(200).json({ id: req.user.id, message: 'mock profile updated' })),
  getPreferences: jest.fn((req, res, next) => res.status(200).json({ units: 'metric' })),
  updatePreferences: jest.fn((req, res, next) => res.status(200).json({ units: 'imperial' }))
}));

// Mock the nutrition controller to prevent OpenAIService instantiation issue
jest.mock('../../controllers/nutrition.js', () => ({
    // Add mock implementations for any functions used by the routes if necessary
    calculateMacros: jest.fn((req, res, next) => res.status(200).json({ message: 'mock calculateMacros' })),
    getNutritionPlan: jest.fn((req, res, next) => res.status(200).json({ message: 'mock getNutritionPlan' })),
    getDietaryPreferences: jest.fn((req, res, next) => res.status(200).json({ message: 'mock getDietaryPreferences' })),
    updateDietaryPreferences: jest.fn((req, res, next) => res.status(200).json({ message: 'mock updateDietaryPreferences' })),
    logMeal: jest.fn((req, res, next) => res.status(200).json({ message: 'mock logMeal' })),
    getMealLogs: jest.fn((req, res, next) => res.status(200).json({ message: 'mock getMealLogs' }))
}));

// --- Test Setup ---
const request = require('supertest');
const http = require('http');
const express = require('express'); // Import express
const cookieParser = require('cookie-parser'); // Import cookie-parser if needed by auth middleware
// const app = require('../../server'); // REMOVE import of the main app
const workoutLogRouter = require('../../routes/workout-log'); // Import only the router under test
const { globalErrorHandler } = require('../../middleware/error-middleware'); // Import error handler
const { authenticate } = require('../../middleware/auth'); // Import the original auth middleware to use its mock

const { NotFoundError, DatabaseError, ValidationError } = require('../../utils/errors');

// --- Tests ---
describe('Workout Log API Integration - Basic Setup Test', () => {
    // Increase timeout for this integration test suite
    jest.setTimeout(30000); // 30 seconds timeout

    let server;
    let agent;
    let testApp; // Define testApp

    beforeAll((done) => {
        // Create a minimal app instance for this test suite
        testApp = express();

        // Apply essential middleware needed by the routes/controllers
        testApp.use(express.json());
        testApp.use(cookieParser()); // Add if auth middleware uses cookies

        // Add a simple /health route BEFORE auth middleware
        testApp.get('/health', (req, res) => res.status(200).json({ status: 'success', message: 'OK' }));

        // Mount the mocked authentication middleware AFTER health check
        testApp.use((req, res, next) => authenticate(req, res, next)); 
        
        // Mount the specific router we are testing
        testApp.use(workoutLogRouter); // Mount router directly at root

        // Mount the global error handler AFTER the routes
        testApp.use(globalErrorHandler);
        
        // Create server using the minimal testApp
        server = http.createServer(testApp);
        server.listen(0, () => { 
            agent = request.agent(server);
            console.log(`DEBUG: Test server listening on port ${server.address().port}`); // Log port
            done();
        }); 
    });
  
    afterAll((done) => {
        console.log("DEBUG: Closing test server...");
        server.close((err) => { // Add error handling for close
            if (err) {
                console.error("DEBUG: Error closing server:", err);
                done(err); // Signal Jest about the error
            } else {
                console.log("DEBUG: Test server closed.");
                done(); // Signal Jest that close is complete
            }
        });
    });
  
    beforeEach(() => {
      jest.clearAllMocks(); 
    });

    // Minimal test case
    test('should respond to a basic health check (simulated)', async () => {
        console.log("DEBUG: Running minimal health check test...");
        // Use the agent created in beforeAll
        const response = await agent.get('/health'); 
        console.log(`DEBUG: Minimal health check response: ${response.status}`);
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success'); 
        console.log("DEBUG: Minimal health check test passed.");
    });

    // Test the POST endpoint
    describe('POST /workouts/log', () => { // Update describe block path
      it('should create a new workout log', async () => {
        // Mock service response
        const mockLogId = 'e1f4b3a1-7b8c-4d5e-9f0a-1b2c3d4e5f6a'; // Example Valid UUID
        const mockPlanId = 'a1b2c3d4-e5f6-4a8b-9c0d-e1f2a3b4c5d6'; // Example Valid UUID
        const mockExerciseId = 'f0e1d2c3-b4a5-4f6e-8g7h-i9j0k1l2m3n4'; // Example Valid UUID

        mockWorkoutLogService.storeWorkoutLog.mockResolvedValue({
          log_id: mockLogId,
          user_id: 'test-user-id',
          plan_id: mockPlanId,
          date: '2023-01-01',
          exercises_completed: [{
            exercise_id: mockExerciseId,
            exercise_name: 'Squat',
            sets_completed: 3,
            reps_completed: [8, 8, 8],
            weights_used: [100, 100, 100],
            notes: 'Good form'
          }],
          notes: 'Test notes',
          created_at: '2023-01-01T00:00:00Z'
        });

        const requestBody = {
            plan_id: mockPlanId, // Use valid UUID
            date: '2023-01-01',
            exercises_completed: [ // Rename and restructure
              {
                exercise_id: mockExerciseId, // Use valid UUID
                exercise_name: 'Squat',
                sets_completed: 3,          // Number of sets
                reps_completed: [8, 8, 8], // Array of reps per set
                weights_used: [100, 100, 100], // Array of weights per set
                // Optional fields like felt_difficulty, notes can be added here if needed
                notes: 'Good form'
              }
            ],
            // Optional top-level fields like overall_difficulty, energy_level, satisfaction, feedback
            notes: 'Test notes'
          };

        // Use request(server) instead of agent for this specific request
        const response = await request(server) 
          .post('/workouts/log') 
          .set('Authorization', 'Bearer valid-token') 
          .send(requestBody);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('log_id', mockLogId);
        
        // Expect the mock service to be called with userId, logData, and token as separate arguments
        expect(mockWorkoutLogService.storeWorkoutLog).toHaveBeenCalledWith(
          'test-user-id-123', // Argument 1: userId (Corrected to match mockAuthenticateUserId)
          expect.objectContaining({ // Argument 2: logData (matches requestBody + defaults - stripped unknown)
            plan_id: mockPlanId,
            date: expect.any(Date), // Joi converts date string to Date object
            completed: true, // Add the default value applied by Joi schema
            exercises_completed: expect.arrayContaining([
              expect.objectContaining({
                exercise_id: mockExerciseId,
                exercise_name: 'Squat',
                sets_completed: 3,
                reps_completed: [8, 8, 8],
                weights_used: [100, 100, 100],
                notes: 'Good form'
              })
            ]),
            // notes: 'Test notes' // REMOVE: This top-level field is stripped by validation (stripUnknown: true)
          }),
          'valid-token' // Argument 3: token (matches Authorization header)
        );
      });

      it('should return 400 for invalid input', async () => {
        // Set up the mock auth to return a valid user
        // No need to mock authenticate again here

        const response = await agent // Use agent
          .post('/workouts/log') // Corrected path
          .set('Authorization', 'Bearer valid-token') // Use the token mockAuthenticate expects
          .send({
            // Missing workout_id and loggedExercises which should be required by validation
            date: 'invalid-date', // Invalid date format
            notes: 'Test notes'
          });

        expect(response.status).toBe(400);
        // Check the actual error response structure based on globalErrorHandler and validation middleware
        expect(response.body).toHaveProperty('status', 'error'); 
        expect(response.body).toHaveProperty('message'); // General message or specific validation errors
        // Optionally, check for specific error details if validation middleware provides them
        // expect(response.body.details).toEqual(expect.arrayContaining([...])); 
      });
    });
  
}); 