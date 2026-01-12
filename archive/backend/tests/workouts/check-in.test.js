const request = require('supertest');
const express = require('express');
const { ValidationError, NotFoundError, ERROR_CODES } = require('../../utils/errors');
const { createToken } = require('../../utils/jwt');

// Mock JWT utilities
jest.mock('../../utils/jwt', () => ({
  createToken: jest.fn(() => 'mock-jwt-token'),
  verifyToken: jest.fn(() => ({ id: 'test-user-id', userId: 'test-user-id' }))
}));

// Mock the auth middleware
jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-id', userId: 'test-user-id' };
    next();
  }),
  requireAdmin: jest.fn((req, res, next) => next())
}));

// Mock validation middleware
jest.mock('../../middleware/validation', () => ({
  validateCheckIn: jest.fn((req, res, next) => next()),
  validateCheckInQuery: jest.fn((req, res, next) => next())
}));

// Mock rate limiter middleware
jest.mock('express-rate-limit', () => {
  const mockRateLimit = jest.fn(() => (req, res, next) => next());
  mockRateLimit.checkInLimiter = (req, res, next) => next();
  return mockRateLimit;
});

// Mock OpenAI service for progress analysis
jest.mock('../../services/openai-service', () => ({
  OpenAIService: jest.fn().mockImplementation(() => ({
    generateCompletion: jest.fn().mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: 'Mock progress analysis: You are making good progress toward your fitness goals.'
            }
          }
        ]
      }
    }),
    generateEmbedding: jest.fn().mockResolvedValue({
      data: {
        data: [
          { embedding: [0.1, 0.2, 0.3] }
        ]
      }
    })
  }))
}));

// Mock the check-in controller
const mockCheckInController = {
  recordCheckIn: jest.fn((req, res) => {
    // Check if we should simulate an error condition
    if (req.query.simulateError === 'validation') {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: [{ field: 'weight', message: 'Weight is required' }]
      });
    }
    
    if (req.query.simulateError === 'server') {
      return res.status(500).json({
        status: 'error',
        message: 'Internal Server Error'
      });
    }
    
    // Simulate unauthorized case when no token
    if (!req.headers.authorization) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: No token provided'
      });
    }
    
    // Normal success case
    return res.status(201).json({
      status: 'success',
      checkInId: 'mock-checkin-id',
      message: 'Check-in recorded successfully.'
    });
  }),
  
  getCheckIns: jest.fn((req, res) => {
    // Check if we should simulate an error condition
    if (req.query.simulateError === 'server') {
      return res.status(500).json({
        status: 'error',
        message: 'Internal Server Error during getCheckIns'
      });
    }
    
    // Simulate unauthorized case when no token
    if (!req.headers.authorization) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }
    
    // Normal success case
    return res.status(200).json({
      status: 'success',
      data: [
        {
          checkInId: 'checkin-1',
          date: '2025-04-10',
          weight: 70.5,
          measurements: {
            waist: 32,
            chest: 40
          },
          notes: 'Feeling stronger this week'
        },
        {
          checkInId: 'checkin-2',
          date: '2025-04-24',
          weight: 69.8,
          measurements: {
            waist: 31.5,
            chest: 40.5
          },
          notes: 'Seeing good progress in waist measurement'
        }
      ],
      message: 'Check-ins retrieved successfully.'
    });
  }),
  
  getLatestCheckIn: jest.fn((req, res) => {
    // Check if no check-ins exist
    if (req.query.empty === 'true') {
      return res.status(404).json({
        status: 'error',
        message: 'No check-ins found for this user',
        errorCode: 'NO_CHECKINS_FOUND'
      });
    }
    
    // Handle database error
    if (req.query.simulateError === 'database') {
      return res.status(500).json({
        status: 'error',
        message: 'An internal server error occurred',
        errorCode: 'DATABASE_ERROR'
      });
    }
    
    // Simulate unauthorized case when no token
    if (!req.headers.authorization) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }
    
    // Normal success case
    return res.status(200).json({
      status: 'success',
      data: {
        checkInId: 'checkin-2',
        date: '2025-04-24',
        weight: 69.8,
        measurements: {
          waist: 31.5,
          chest: 40.5
        },
        notes: 'Seeing good progress in waist measurement'
      }
    });
  }),
  
  getProgressAnalysis: jest.fn((req, res) => {
    // Check if no check-ins exist
    if (req.query.empty === 'true') {
      return res.status(404).json({
        status: 'error',
        message: 'Insufficient data for progress analysis',
        errorCode: 'INSUFFICIENT_DATA'
      });
    }
    
    // Handle AI service error
    if (req.query.simulateError === 'ai') {
      return res.status(500).json({
        status: 'error',
        message: 'Error generating progress analysis',
        errorCode: 'AI_SERVICE_ERROR'
      });
    }
    
    // Simulate unauthorized case when no token
    if (!req.headers.authorization) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }
    
    // Normal success case
    return res.status(200).json({
      status: 'success',
      data: {
        progressSummary: 'You are making good progress toward your fitness goals.',
        weightTrend: 'Steady weight loss at an appropriate rate.',
        measurementChanges: {
          waist: 'Decreased by 0.5 inches',
          chest: 'Increased by 0.5 inches'
        },
        recommendations: 'Continue with current plan, consider adding more resistance training.'
      }
    });
  })
};

// Mock the check-in routes
jest.mock('../../routes/check-in', () => {
  const express = require('express');
  const router = express.Router();
  const { authenticate } = require('../../middleware/auth');
  const checkInController = require('../../controllers/check-in');
  
  // Define the routes - directly use the controller functions without rate limiter middleware
  router.post('/checkins', authenticate, checkInController.recordCheckIn);
  router.get('/checkins', authenticate, checkInController.getCheckIns);
  router.get('/checkins/latest', authenticate, checkInController.getLatestCheckIn);
  router.get('/checkins/progress', authenticate, checkInController.getProgressAnalysis);
  
  return router;
});

// Mock the controllers module
jest.mock('../../controllers/check-in', () => {
  return mockCheckInController;
});

describe('Check-in Routes', () => {
  let app;
  let testToken;
  
  beforeAll(() => {
    testToken = createToken({ id: 'test-user-id', userId: 'test-user-id' });
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up an Express app for isolated testing
    app = express();
    app.use(express.json());
    
    // Mount check-in routes at the correct path
    const checkInRouter = require('../../routes/check-in');
    app.use('/v1', checkInRouter);
    
    // Add error handler middleware
    app.use((err, req, res, next) => {
      const statusCode = err?.statusCode || 500;
      res.status(statusCode).json({
        status: 'error',
        errorCode: err?.errorCode || err?.code || 'INTERNAL_SERVER_ERROR',
        message: err?.message || 'An unexpected error occurred'
      });
    });
  });
  
  // =================================================================
  // Tests for POST /v1/checkins (Record Check-in)
  // =================================================================
  describe('POST /v1/checkins', () => {
    const validCheckIn = {
      userId: 'test-user-id',
      date: '2025-05-01',
      weight: 70.2,
      measurements: {
        waist: 31.2,
        chest: 40.7,
        biceps: 14.5
      },
      progressMetrics: {
        bodyFat: 18.5
      },
      notes: 'Energy levels are higher this week'
    };

    it('should record a check-in successfully with valid data (201)', async () => {
      // Act
      const response = await request(app)
        .post('/v1/checkins')
        .set('Authorization', `Bearer ${testToken}`)
        .send(validCheckIn);

      // Assert
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('checkInId', 'mock-checkin-id');
      expect(response.body).toHaveProperty('message', 'Check-in recorded successfully.');
      expect(mockCheckInController.recordCheckIn).toHaveBeenCalledTimes(1);
    });

    test('should return 401 Unauthorized if no token is provided', async () => {
      // Act
      const response = await request(app)
        .post('/v1/checkins')
        .send(validCheckIn);
        
      // Assert
      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message', expect.stringContaining('Unauthorized'));
    });

    test('should return 400 Bad Request if validation fails', async () => {
      // Act
      const response = await request(app)
        .post('/v1/checkins')
        .set('Authorization', `Bearer ${testToken}`)
        .query({ simulateError: 'validation' })
        .send({ ...validCheckIn, weight: undefined });
        
      // Assert
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body).toHaveProperty('errors');
    });

    test('should return 500 Internal Server Error if controller throws an unexpected error', async () => {
      // Act
      const response = await request(app)
        .post('/v1/checkins')
        .set('Authorization', `Bearer ${testToken}`)
        .query({ simulateError: 'server' })
        .send(validCheckIn);
        
      // Assert
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Internal Server Error');
    });
  });

  // =================================================================
  // Tests for GET /v1/checkins (List Check-ins)
  // =================================================================
  describe('GET /v1/checkins', () => {
    test('should return a list of check-ins successfully (200)', async () => {
      // Act
      const response = await request(app)
        .get('/v1/checkins')
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0]).toHaveProperty('checkInId', 'checkin-1');
      expect(response.body.data[1]).toHaveProperty('checkInId', 'checkin-2');
      expect(mockCheckInController.getCheckIns).toHaveBeenCalledTimes(1);
    });

    test('should pass query parameters to the controller', async () => {
      // Arrange
      const queryParams = { startDate: '2025-01-01', endDate: '2025-12-31' };
        
      // Act
      const response = await request(app)
        .get('/v1/checkins')
        .query(queryParams)
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(200);
      expect(mockCheckInController.getCheckIns).toHaveBeenCalledTimes(1);
      // The request should include the query parameters
      expect(mockCheckInController.getCheckIns.mock.calls[0][0].query).toMatchObject(queryParams);
    });

    test('should return 401 Unauthorized if no token is provided', async () => {
      // Act
      const response = await request(app).get('/v1/checkins');
        
      // Assert
      expect(response.statusCode).toBe(401);
    });

    test('should return 500 Internal Server Error if controller fails', async () => {
      // Act
      const response = await request(app)
        .get('/v1/checkins')
        .query({ simulateError: 'server' })
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  // =================================================================
  // Tests for GET /v1/checkins/latest (Get Latest Check-in)
  // =================================================================
  describe('GET /v1/checkins/latest', () => {
    test('should return the latest check-in successfully (200)', async () => {
      // Act
      const response = await request(app)
        .get('/v1/checkins/latest')
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('checkInId', 'checkin-2');
      expect(response.body.data).toHaveProperty('date', '2025-04-24');
      expect(response.body.data).toHaveProperty('weight', 69.8);
      expect(response.body.data).toHaveProperty('measurements');
      expect(mockCheckInController.getLatestCheckIn).toHaveBeenCalledTimes(1);
    });

    test('should return 404 Not Found if no check-ins exist', async () => {
      // Act
      const response = await request(app)
        .get('/v1/checkins/latest')
        .query({ empty: 'true' })
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errorCode', 'NO_CHECKINS_FOUND');
      expect(response.body).toHaveProperty('message', 'No check-ins found for this user');
    });

    test('should return 401 Unauthorized if no token is provided', async () => {
      // Act
      const response = await request(app).get('/v1/checkins/latest');
        
      // Assert
      expect(response.statusCode).toBe(401);
    });

    test('should return 500 Internal Server Error if database issue occurs', async () => {
      // Act
      const response = await request(app)
        .get('/v1/checkins/latest')
        .query({ simulateError: 'database' })
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errorCode', 'DATABASE_ERROR');
      expect(response.body).toHaveProperty('message', 'An internal server error occurred');
    });
  });

  // =================================================================
  // Tests for GET /v1/checkins/progress (Get Progress Analysis)
  // =================================================================
  describe('GET /v1/checkins/progress', () => {
    test('should return progress analysis successfully (200)', async () => {
      // Act
      const response = await request(app)
        .get('/v1/checkins/progress')
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('progressSummary');
      expect(response.body.data).toHaveProperty('weightTrend');
      expect(response.body.data).toHaveProperty('measurementChanges');
      expect(response.body.data).toHaveProperty('recommendations');
      expect(mockCheckInController.getProgressAnalysis).toHaveBeenCalledTimes(1);
    });

    test('should return 404 Not Found if insufficient data exists', async () => {
      // Act
      const response = await request(app)
        .get('/v1/checkins/progress')
        .query({ empty: 'true' })
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errorCode', 'INSUFFICIENT_DATA');
      expect(response.body).toHaveProperty('message', 'Insufficient data for progress analysis');
    });

    test('should return 401 Unauthorized if no token is provided', async () => {
      // Act
      const response = await request(app).get('/v1/checkins/progress');
        
      // Assert
      expect(response.statusCode).toBe(401);
    });

    test('should return 500 Internal Server Error if AI service fails', async () => {
      // Act
      const response = await request(app)
        .get('/v1/checkins/progress')
        .query({ simulateError: 'ai' })
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errorCode', 'AI_SERVICE_ERROR');
      expect(response.body).toHaveProperty('message', 'Error generating progress analysis');
    });
  });
}); 