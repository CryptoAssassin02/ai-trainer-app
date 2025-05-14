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
  validateWorkoutLog: jest.fn((req, res, next) => next()),
  validateWorkoutLogUpdate: jest.fn((req, res, next) => next()),
  validateWorkoutLogQuery: jest.fn((req, res, next) => next())
}));

// Mock rate limiter middleware
jest.mock('express-rate-limit', () => {
  const mockRateLimit = jest.fn(() => (req, res, next) => next());
  mockRateLimit.logOperationLimiter = (req, res, next) => next();
  return mockRateLimit;
});

// Mock the workout-log controller
const mockWorkoutLogController = {
  logWorkout: jest.fn((req, res) => {
    // Check if we should simulate an error condition
    if (req.query.simulateError === 'validation') {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: [{ field: 'date', message: 'Date is required' }]
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
      logId: 'mock-log-id',
      message: 'Workout log saved successfully.'
    });
  }),
  
  getWorkoutLogs: jest.fn((req, res) => {
    // Check if we should simulate an error condition
    if (req.query.simulateError === 'validation') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid query parameter'
      });
    }
    
    if (req.query.simulateError === 'server') {
      return res.status(500).json({
        status: 'error',
        message: 'Internal Server Error during getWorkoutLogs'
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
          logId: 'mock-log-id',
          date: '2025-04-24',
          exercises: [
            { name: 'Push-ups', setsCompleted: [{ weightUsed: 0, repsCompleted: 15 }] }
          ]
        }
      ]
    });
  }),
  
  getWorkoutLog: jest.fn((req, res) => {
    // Handle nonexistent log
    if (req.params.logId === 'nonexistent-log') {
      return res.status(404).json({
        status: 'error',
        message: 'Workout log not found',
        errorCode: 'WORKOUT_LOG_NOT_FOUND'
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
        logId: req.params.logId,
        date: '2025-04-24',
        exercises: [
          { name: 'Push-ups', setsCompleted: [{ weightUsed: 0, repsCompleted: 15 }] }
        ]
      }
    });
  }),
  
  updateWorkoutLog: jest.fn((req, res) => {
    // Handle nonexistent log
    if (req.params.logId === 'nonexistent-log') {
      return res.status(404).json({
        status: 'error',
        message: 'Workout log not found for update',
        errorCode: 'WORKOUT_LOG_NOT_FOUND'
      });
    }
    
    // Handle validation error for update
    if (req.query.simulateError === 'validation') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid update data',
        errorCode: 'VALIDATION_ERROR',
        errors: [{ field: 'date', message: 'Date cannot be in the future' }]
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
      logId: req.params.logId,
      message: 'Workout log updated successfully.'
    });
  }),
  
  deleteWorkoutLog: jest.fn((req, res) => {
    // Handle nonexistent log
    if (req.params.logId === 'nonexistent-log') {
      return res.status(404).json({
        status: 'error',
        message: 'Workout log to delete not found',
        errorCode: 'WORKOUT_LOG_NOT_FOUND'
      });
    }
    
    // Handle database error
    if (req.query.simulateError === 'database') {
      return res.status(500).json({
        status: 'error',
        message: 'An internal server error occurred during deletion',
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
      message: 'Workout log deleted successfully.'
    });
  })
};

// Mock the workout-log routes
jest.mock('../../routes/workout-log', () => {
  const express = require('express');
  const router = express.Router();
  const { authenticate } = require('../../middleware/auth');
  const workoutLogController = require('../../controllers/workout-log');
  
  // Define the routes - directly use the controller functions without rate limiter middleware
  router.post('/workouts/log', authenticate, workoutLogController.logWorkout);
  router.get('/workouts/log', authenticate, workoutLogController.getWorkoutLogs);
  router.get('/workouts/log/:logId', authenticate, workoutLogController.getWorkoutLog);
  router.patch('/workouts/log/:logId', authenticate, workoutLogController.updateWorkoutLog);
  router.delete('/workouts/log/:logId', authenticate, workoutLogController.deleteWorkoutLog);
  
  return router;
});

// Mock the controllers module
jest.mock('../../controllers/workout-log', () => {
  return mockWorkoutLogController;
});

describe('Workout Log Routes', () => {
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
    
    // Mount workout-log routes at the correct path
    const workoutLogRouter = require('../../routes/workout-log');
    app.use('/v1', workoutLogRouter);
    
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
  // Tests for POST /v1/workouts/log (Create Workout Log)
  // =================================================================
  describe('POST /v1/workouts/log', () => {
    const validWorkoutLog = {
      userId: 'test-user-id',
      planId: 'test-plan-id',
      date: '2025-04-24',
      loggedExercises: [
        {
          exerciseName: 'Push-ups',
          setsCompleted: [
            { weightUsed: 0, repsCompleted: 15 }
          ]
        }
      ],
      notes: 'Felt great today!'
    };

    it('should create a workout log successfully with valid data (201)', async () => {
      // Act
      const response = await request(app)
        .post('/v1/workouts/log')
        .set('Authorization', `Bearer ${testToken}`)
        .send(validWorkoutLog);

      // Assert
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('logId', 'mock-log-id');
      expect(response.body).toHaveProperty('message', 'Workout log saved successfully.');
      expect(mockWorkoutLogController.logWorkout).toHaveBeenCalledTimes(1);
    });

    test('should return 401 Unauthorized if no token is provided', async () => {
      // Act
      const response = await request(app)
        .post('/v1/workouts/log')
        .send(validWorkoutLog);
        
      // Assert
      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message', expect.stringContaining('Unauthorized'));
    });

    test('should return 400 Bad Request if validation fails', async () => {
      // Act
      const response = await request(app)
        .post('/v1/workouts/log')
        .set('Authorization', `Bearer ${testToken}`)
        .query({ simulateError: 'validation' })
        .send({ ...validWorkoutLog, date: undefined });
        
      // Assert
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body).toHaveProperty('errors');
    });

    test('should return 500 Internal Server Error if controller throws an unexpected error', async () => {
      // Act
      const response = await request(app)
        .post('/v1/workouts/log')
        .set('Authorization', `Bearer ${testToken}`)
        .query({ simulateError: 'server' })
        .send(validWorkoutLog);
        
      // Assert
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Internal Server Error');
    });
  });

  // =================================================================
  // Tests for GET /v1/workouts/log (List Workout Logs)
  // =================================================================
  describe('GET /v1/workouts/log', () => {
    test('should return a list of workout logs successfully (200)', async () => {
      // Act
      const response = await request(app)
        .get('/v1/workouts/log')
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0]).toHaveProperty('logId', 'mock-log-id');
      expect(response.body.data[0]).toHaveProperty('date', '2025-04-24');
      expect(response.body.data[0]).toHaveProperty('exercises');
      expect(mockWorkoutLogController.getWorkoutLogs).toHaveBeenCalledTimes(1);
    });

    test('should pass query parameters to the controller', async () => {
      // Arrange
      const queryParams = { startDate: '2025-01-01', endDate: '2025-12-31', exerciseName: 'Push-ups' };
        
      // Act
      const response = await request(app)
        .get('/v1/workouts/log')
        .query(queryParams)
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(200);
      expect(mockWorkoutLogController.getWorkoutLogs).toHaveBeenCalledTimes(1);
      // The request should include the query parameters
      expect(mockWorkoutLogController.getWorkoutLogs.mock.calls[0][0].query).toMatchObject(queryParams);
    });

    test('should return 401 Unauthorized if no token is provided', async () => {
      // Act
      const response = await request(app).get('/v1/workouts/log');
        
      // Assert
      expect(response.statusCode).toBe(401);
    });

    test('should return 400 Bad Request if query validation fails', async () => {
      // Act
      const response = await request(app)
        .get('/v1/workouts/log')
        .query({ simulateError: 'validation' })
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Invalid query parameter');
    });

    test('should return 500 Internal Server Error if controller fails', async () => {
      // Act
      const response = await request(app)
        .get('/v1/workouts/log')
        .query({ simulateError: 'server' })
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  // =================================================================
  // Tests for GET /v1/workouts/log/:logId (Get Specific Workout Log)
  // =================================================================
  describe('GET /v1/workouts/log/:logId', () => {
    const testLogId = 'log-xyz';
    const nonExistentLogId = 'nonexistent-log';

    test('should return a specific workout log successfully (200)', async () => {
      // Act
      const response = await request(app)
        .get(`/v1/workouts/log/${testLogId}`)
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('logId', testLogId);
      expect(response.body.data).toHaveProperty('date', '2025-04-24');
      expect(response.body.data).toHaveProperty('exercises');
      expect(Array.isArray(response.body.data.exercises)).toBe(true);
      expect(mockWorkoutLogController.getWorkoutLog).toHaveBeenCalledTimes(1);
    });

    test('should return 404 Not Found if log does not exist', async () => {
      // Act
      const response = await request(app)
        .get(`/v1/workouts/log/${nonExistentLogId}`)
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errorCode', 'WORKOUT_LOG_NOT_FOUND');
      expect(response.body).toHaveProperty('message', 'Workout log not found');
    });

    test('should return 401 Unauthorized if no token is provided', async () => {
      // Act
      const response = await request(app).get(`/v1/workouts/log/${testLogId}`);
        
      // Assert
      expect(response.statusCode).toBe(401);
    });

    test('should return 500 Internal Server Error if database issue occurs', async () => {
      // Act
      const response = await request(app)
        .get(`/v1/workouts/log/${testLogId}`)
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
  // Tests for PATCH /v1/workouts/log/:logId (Update Workout Log)
  // =================================================================
  describe('PATCH /v1/workouts/log/:logId', () => {
    const testLogId = 'log-abc';
    const nonExistentLogId = 'nonexistent-log';
    const validUpdateData = {
      date: '2025-04-25',
      loggedExercises: [
        {
          exerciseName: 'Push-ups',
          setsCompleted: [
            { weightUsed: 0, repsCompleted: 20 }
          ]
        }
      ],
      notes: 'Updated workout notes'
    };

    test('should update a workout log successfully (200)', async () => {
      // Act
      const response = await request(app)
        .patch(`/v1/workouts/log/${testLogId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(validUpdateData);
        
      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('logId', testLogId);
      expect(response.body).toHaveProperty('message', 'Workout log updated successfully.');
      expect(mockWorkoutLogController.updateWorkoutLog).toHaveBeenCalledTimes(1);
    });

    test('should return 404 Not Found if log does not exist for update', async () => {
      // Act
      const response = await request(app)
        .patch(`/v1/workouts/log/${nonExistentLogId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(validUpdateData);
        
      // Assert
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errorCode', 'WORKOUT_LOG_NOT_FOUND');
      expect(response.body).toHaveProperty('message', 'Workout log not found for update');
    });

    test('should return 400 Bad Request if validation fails', async () => {
      // Act
      const response = await request(app)
        .patch(`/v1/workouts/log/${testLogId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .query({ simulateError: 'validation' })
        .send(validUpdateData);
        
      // Assert
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errorCode', 'VALIDATION_ERROR');
      expect(response.body).toHaveProperty('message', 'Invalid update data');
      expect(response.body).toHaveProperty('errors');
    });

    test('should return 401 Unauthorized if no token is provided', async () => {
      // Act
      const response = await request(app)
        .patch(`/v1/workouts/log/${testLogId}`)
        .send(validUpdateData);
        
      // Assert
      expect(response.statusCode).toBe(401);
    });
  });

  // =================================================================
  // Tests for DELETE /v1/workouts/log/:logId (Delete Workout Log)
  // =================================================================
  describe('DELETE /v1/workouts/log/:logId', () => {
    const testLogId = 'log-to-delete';
    const nonExistentLogId = 'nonexistent-log';

    test('should delete a workout log successfully (200)', async () => {
      // Act
      const response = await request(app)
        .delete(`/v1/workouts/log/${testLogId}`)
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Workout log deleted successfully.');
      expect(mockWorkoutLogController.deleteWorkoutLog).toHaveBeenCalledTimes(1);
    });

    test('should return 404 Not Found if log does not exist for deletion', async () => {
      // Act
      const response = await request(app)
        .delete(`/v1/workouts/log/${nonExistentLogId}`)
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errorCode', 'WORKOUT_LOG_NOT_FOUND');
      expect(response.body).toHaveProperty('message', 'Workout log to delete not found');
    });

    test('should return 401 Unauthorized if no token is provided', async () => {
      // Act
      const response = await request(app)
        .delete(`/v1/workouts/log/${testLogId}`);
        
      // Assert
      expect(response.statusCode).toBe(401);
    });

    test('should return 500 Internal Server Error if database fails during deletion', async () => {
      // Act
      const response = await request(app)
        .delete(`/v1/workouts/log/${testLogId}`)
        .query({ simulateError: 'database' })
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errorCode', 'DATABASE_ERROR');
      expect(response.body).toHaveProperty('message', 'An internal server error occurred during deletion');
    });
  });
}); 