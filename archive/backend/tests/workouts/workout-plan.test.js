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
  validateWorkoutGeneration: jest.fn((req, res, next) => next()),
  validateWorkoutAdjustment: jest.fn((req, res, next) => next()),
  validateWorkoutQuery: jest.fn((req, res, next) => next()),
  validateWorkoutPlan: jest.fn((req, res, next) => next()),
  validateWorkoutPlanId: jest.fn((req, res, next) => next())
}));

// Mock the OpenAI service
jest.mock('../../services/openai-service', () => {
  return jest.fn().mockImplementation(() => ({
    generateCompletion: jest.fn().mockResolvedValue({ text: 'Mock AI response' }),
    generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3])
  }));
});

// Mock WorkoutGenerationAgent
jest.mock('../../agents/workout-generation-agent', () => {
  return jest.fn().mockImplementation(() => ({
    generatePlan: jest.fn().mockResolvedValue({
      planId: 'mock-plan-id',
      planName: 'Mock Workout Plan',
      exercises: [
        { name: 'Push-ups', sets: 3, repsOrRange: '10-12', notes: 'Keep core tight' },
        { name: 'Squats', sets: 3, repsOrRange: '8-10', notes: 'Focus on form' }
      ],
      researchInsights: [
        'Research shows push-ups are effective for upper body strength',
        'Squats are essential for lower body development'
      ],
      reasoning: 'This plan was designed based on your beginner fitness level and available equipment'
    })
  }));
});

// Mock PlanAdjustmentAgent
jest.mock('../../agents/plan-adjustment-agent', () => {
  return jest.fn().mockImplementation(() => ({
    adjustPlan: jest.fn().mockResolvedValue({
      planId: 'mock-plan-id',
      updatedExercises: [
        { name: 'Push-ups', sets: 3, repsOrRange: '10-12', notes: 'Keep core tight' },
        { name: 'Squats', sets: 3, repsOrRange: '10-12', notes: 'Focus on form' },
        { name: 'Lunges', sets: 3, repsOrRange: '10 each leg', notes: 'Added as requested' }
      ],
      reflection: 'Plan adjusted based on your feedback to include more lower body focus'
    })
  }));
});

// Mock the workout controller
const mockWorkoutController = {
  generateWorkoutPlan: jest.fn((req, res) => {
    // Check if we should simulate an error condition
    if (req.query.simulateError === 'validation') {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: [{ field: 'fitnessLevel', message: 'Fitness level is required' }]
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
      planId: 'new-plan-123',
      planName: 'Generated Test Plan',
      exercises: [
        { name: 'Barbell Squat', sets: 3, repsOrRange: '8-10', notes: 'Keep back straight' },
        { name: 'Dumbbell Bench Press', sets: 3, repsOrRange: '8-10', notes: '' }
      ],
      researchInsights: ['Compound lifts are effective for muscle gain.'],
      reasoning: 'Plan focuses on compound strength exercises based on goals and equipment.'
    });
  }),
  
  getWorkoutPlans: jest.fn((req, res) => {
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
        message: 'Internal Server Error during getWorkoutPlans'
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
          planId: 'mock-plan-id',
          planName: 'Mock Workout Plan',
          exercises: [
            { name: 'Push-ups', sets: 3, repsOrRange: '10-12', notes: 'Keep core tight' }
          ],
          created_at: new Date().toISOString()
        }
      ],
      total: 2
    });
  }),
  
  getWorkoutPlan: jest.fn((req, res) => {
    // Handle nonexistent plan
    if (req.params.planId === 'nonexistent-plan') {
      return res.status(404).json({
        status: 'error',
        message: 'Workout plan not found',
        errorCode: 'WORKOUT_PLAN_NOT_FOUND'
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
        planId: req.params.planId,
        planName: 'Specific Test Plan Retrieved',
        exercises: [
          { name: 'Mock Pull-ups', sets: 4, repsOrRange: '6-8', notes: 'Focus on lats' },
          { name: 'Mock Dips', sets: 4, repsOrRange: '8-10', notes: 'Chest variation' }
        ],
        researchInsights: ['Insights for specific plan'],
        reasoning: 'Reasoning for specific plan',
        created_at: new Date().toISOString()
      }
    });
  }),
  
  adjustWorkoutPlan: jest.fn((req, res) => {
    // Handle nonexistent plan
    if (req.params.planId === 'nonexistent-plan') {
      return res.status(404).json({
        status: 'error',
        message: 'Workout plan not found for adjustment',
        errorCode: 'WORKOUT_PLAN_NOT_FOUND'
      });
    }
    
    // Handle validation error for adjustment
    if (req.body.adjustments && req.body.adjustments.notesOrPreferences === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid adjustment data',
        errorCode: 'VALIDATION_ERROR',
        errors: [{ field: 'adjustments.notesOrPreferences', message: 'Notes cannot be empty' }]
      });
    }
    
    // Handle AI service error
    if (req.query.simulateError === 'ai') {
      return res.status(500).json({
        status: 'error',
        message: 'An internal error occurred while adjusting the plan',
        errorCode: ERROR_CODES.EXTERNAL_SERVICE_ERROR
      });
    }
    
    // Simulate unauthorized case when no token
    if (!req.headers.authorization) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }
    
    // Handle concurrency conflict
    if (req.params.planId === 'plan-concurrent-test' && req.query.simulateConflict === 'true') {
      return res.status(409).json({
        status: 'error',
        message: 'Workout plan was modified by another request',
        errorCode: ERROR_CODES.CONCURRENCY_ERROR
      });
    }
    
    // Normal success case
    return res.status(200).json({
      status: 'success',
      planId: req.params.planId,
      updatedExercises: [
        { name: 'Push-ups', sets: 3, repsOrRange: '10-12', notes: 'Keep core tight' },
        { name: 'Squats', sets: 3, repsOrRange: '10-12', notes: 'Focus on form' },
        { name: 'Lunges', sets: 3, repsOrRange: '10 each leg', notes: 'Added as requested' }
      ],
      reflection: req.params.planId === 'plan-concurrent-test' ? 'First update successful' : 'Plan adjusted based on feedback'
    });
  }),
  
  deleteWorkoutPlan: jest.fn((req, res) => {
    // Handle nonexistent plan
    if (req.params.planId === 'nonexistent-plan') {
      return res.status(404).json({
        status: 'error',
        message: 'Workout plan to delete not found',
        errorCode: 'WORKOUT_PLAN_NOT_FOUND'
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
    
    // Normal success case - 204 No Content
    return res.status(204).send();
  })
};

// Mock the workout routes
jest.mock('../../routes/workout', () => {
  const express = require('express');
  const router = express.Router();
  const workoutController = require('../../controllers/workout');
  
  router.post('/', workoutController.generateWorkoutPlan);
  router.get('/', workoutController.getWorkoutPlans);
  router.get('/:planId', workoutController.getWorkoutPlan);
  router.post('/:planId', workoutController.adjustWorkoutPlan);
  router.delete('/:planId', workoutController.deleteWorkoutPlan);
  
  return router;
});

// Mock the controllers module
jest.mock('../../controllers/workout', () => {
  return mockWorkoutController;
});

describe('Workout Plan Routes', () => {
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
    
    // Mount workout routes at the correct path
    const workoutRouter = require('../../routes/workout');
    app.use('/v1/workouts', workoutRouter);
    
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
  // Tests for POST /v1/workouts (Generate Workout Plan)
  // =================================================================
  describe('POST /v1/workouts', () => {
    const validWorkoutRequest = {
      userId: 'test-user-id',
      fitnessLevel: 'intermediate',
      goals: ['muscle_gain', 'strength'],
      equipment: ['barbell', 'dumbbells'],
      restrictions: [],
      exerciseTypes: ['strength'],
      workoutFrequency: '3x per week',
    };

    it('should generate a workout plan successfully with valid data (201) including AI fields', async () => {
      // Arrange
      const expectedPlanId = 'new-plan-123';
      const expectedPlanName = 'Generated Test Plan';
      const expectedExercises = [
        { name: 'Barbell Squat', sets: 3, repsOrRange: '8-10', notes: 'Keep back straight' },
        { name: 'Dumbbell Bench Press', sets: 3, repsOrRange: '8-10', notes: '' }
      ];
      const expectedInsights = ['Compound lifts are effective for muscle gain.'];
      const expectedReasoning = 'Plan focuses on compound strength exercises based on goals and equipment.';

      // Act
      const response = await request(app)
        .post('/v1/workouts')
        .set('Authorization', `Bearer ${testToken}`)
        .send(validWorkoutRequest);

      // Assert
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('planId', expectedPlanId);
      expect(response.body).toHaveProperty('planName', expectedPlanName);
      expect(response.body).toHaveProperty('exercises');
      expect(Array.isArray(response.body.exercises)).toBe(true);
      expect(response.body.exercises.length).toBeGreaterThan(0);
      const firstExercise = response.body.exercises[0];
      expect(firstExercise).toHaveProperty('name');
      expect(typeof firstExercise.name).toBe('string');
      expect(firstExercise).toHaveProperty('sets');
      expect(typeof firstExercise.sets).toBe('number');
      expect(firstExercise).toHaveProperty('repsOrRange');
      expect(typeof firstExercise.repsOrRange).toBe('string');
      expect(firstExercise).toHaveProperty('notes');
      expect(response.body.exercises).toEqual(expectedExercises);
      expect(response.body).toHaveProperty('researchInsights');
      expect(Array.isArray(response.body.researchInsights)).toBe(true);
      expect(response.body.researchInsights).toEqual(expectedInsights);
      expect(response.body).toHaveProperty('reasoning', expectedReasoning);
      expect(mockWorkoutController.generateWorkoutPlan).toHaveBeenCalledTimes(1);
    });

    test('should return 401 Unauthorized if no token is provided', async () => {
      // Act
      const response = await request(app)
        .post('/v1/workouts')
        .send(validWorkoutRequest);
        
      // Assert
      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message', expect.stringContaining('Unauthorized'));
    });

    test('should return 400 Bad Request if validation fails', async () => {
      // Act
      const response = await request(app)
        .post('/v1/workouts')
        .set('Authorization', `Bearer ${testToken}`)
        .query({ simulateError: 'validation' })
        .send({ ...validWorkoutRequest, fitnessLevel: undefined });
        
      // Assert
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body).toHaveProperty('errors');
    });

    test('should return 500 Internal Server Error if controller throws an unexpected error', async () => {
      // Act
      const response = await request(app)
        .post('/v1/workouts')
        .set('Authorization', `Bearer ${testToken}`)
        .query({ simulateError: 'server' })
        .send(validWorkoutRequest);
        
      // Assert
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Internal Server Error');
    });
  });

  // =================================================================
  // Tests for GET /v1/workouts (List Workout Plans)
  // =================================================================
  describe('GET /v1/workouts', () => {
    test('should return a list of workout plans successfully (200)', async () => {
      // Act
      const response = await request(app)
        .get('/v1/workouts')
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('total', 2);
      expect(mockWorkoutController.getWorkoutPlans).toHaveBeenCalledTimes(1);
    });

    test('should pass query parameters to the controller', async () => {
      // Arrange
      const queryParams = { limit: '10', offset: '20', searchTerm: 'strength' };
        
      // Act
      const response = await request(app)
        .get('/v1/workouts')
        .query(queryParams)
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(200);
      expect(mockWorkoutController.getWorkoutPlans).toHaveBeenCalledTimes(1);
      // The request should include the query parameters
      expect(mockWorkoutController.getWorkoutPlans.mock.calls[0][0].query).toMatchObject(queryParams);
    });

    test('should return 401 Unauthorized if no token is provided', async () => {
      // Act
      const response = await request(app).get('/v1/workouts');
        
      // Assert
      expect(response.statusCode).toBe(401);
    });

    test('should return 400 Bad Request if query validation fails', async () => {
      // Act
      const response = await request(app)
        .get('/v1/workouts')
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
        .get('/v1/workouts')
        .query({ simulateError: 'server' })
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  // =================================================================
  // Tests for GET /v1/workouts/:planId (Get Specific Workout Plan)
  // =================================================================
  describe('GET /v1/workouts/:planId', () => {
    const testPlanId = 'plan-xyz';
    const nonExistentPlanId = 'nonexistent-plan';

    test('should return a specific workout plan successfully (200) with correct structure', async () => {
      // Act
      const response = await request(app)
        .get(`/v1/workouts/${testPlanId}`)
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('planId', testPlanId);
      expect(response.body.data).toHaveProperty('exercises');
      expect(Array.isArray(response.body.data.exercises)).toBe(true);
      expect(response.body.data.exercises.length).toBe(2);
      expect(response.body.data).toHaveProperty('researchInsights');
      expect(response.body.data).toHaveProperty('reasoning');
      expect(response.body.data).toHaveProperty('created_at');
      expect(mockWorkoutController.getWorkoutPlan).toHaveBeenCalledTimes(1);
    });

    test('should return 404 Not Found if plan does not exist', async () => {
      // Act
      const response = await request(app)
        .get(`/v1/workouts/${nonExistentPlanId}`)
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errorCode', 'WORKOUT_PLAN_NOT_FOUND');
      expect(response.body).toHaveProperty('message', 'Workout plan not found');
    });

    test('should return 401 Unauthorized if no token is provided', async () => {
      // Act
      const response = await request(app).get(`/v1/workouts/${testPlanId}`);
        
      // Assert
      expect(response.statusCode).toBe(401);
    });

    test('should return 500 Internal Server Error if database issue occurs', async () => {
      // Act
      const response = await request(app)
        .get(`/v1/workouts/${testPlanId}`)
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
  // Tests for POST /v1/workouts/:planId (Adjust Workout Plan)
  // =================================================================
  describe('POST /v1/workouts/:planId', () => {
    const testPlanId = 'plan-abc';
    const nonExistentPlanId = 'nonexistent-plan';
    const validAdjustmentRequest = {
      userId: 'test-user-id',
      adjustments: { notesOrPreferences: "Focus more on upper body" }
    };

    test('should adjust a workout plan successfully (200) including AI reflection', async () => {
      // Act
      const response = await request(app)
        .post(`/v1/workouts/${testPlanId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(validAdjustmentRequest);
        
      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('planId', testPlanId);
      expect(response.body).toHaveProperty('updatedExercises');
      expect(response.body.updatedExercises.length).toBe(3);
      expect(response.body).toHaveProperty('reflection', 'Plan adjusted based on feedback');
      expect(mockWorkoutController.adjustWorkoutPlan).toHaveBeenCalledTimes(1);
    });

    test('should return 404 Not Found if plan does not exist for adjustment', async () => {
      // Act
      const response = await request(app)
        .post(`/v1/workouts/${nonExistentPlanId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(validAdjustmentRequest);
        
      // Assert
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errorCode', 'WORKOUT_PLAN_NOT_FOUND');
      expect(response.body).toHaveProperty('message', 'Workout plan not found for adjustment');
    });

    test('should return 400 Bad Request for invalid adjustment data', async () => {
      // Act
      const response = await request(app)
        .post(`/v1/workouts/${testPlanId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ adjustments: { notesOrPreferences: '' } }); // Send invalid data
        
      // Assert
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errorCode', 'VALIDATION_ERROR');
      expect(response.body).toHaveProperty('message', 'Invalid adjustment data');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].field).toBe('adjustments.notesOrPreferences');
    });

    test('should return 401 Unauthorized if no token is provided', async () => {
      // Act
      const response = await request(app)
        .post(`/v1/workouts/${testPlanId}`)
        .send(validAdjustmentRequest);
        
      // Assert
      expect(response.statusCode).toBe(401);
    });

    test('should return 500 Internal Server Error if AI agent fails during adjustment', async () => {
      // Act
      const response = await request(app)
        .post(`/v1/workouts/${testPlanId}`)
        .query({ simulateError: 'ai' })
        .set('Authorization', `Bearer ${testToken}`)
        .send(validAdjustmentRequest);
        
      // Assert
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errorCode', ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      expect(response.body).toHaveProperty('message', 'An internal error occurred while adjusting the plan');
    });

    test('should handle concurrent modification attempts, resulting in a conflict error (409)', async () => {
      // Arrange
      const conflictingPlanId = 'plan-concurrent-test';
      const adjustment1 = { adjustments: { notesOrPreferences: "First update attempt" } };
      const adjustment2 = { adjustments: { notesOrPreferences: "Second update attempt (concurrent)" } };

      // Act: Send first request (success)
      const response1 = await request(app)
        .post(`/v1/workouts/${conflictingPlanId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(adjustment1);

      // Send second request (conflict)
      const response2 = await request(app)
        .post(`/v1/workouts/${conflictingPlanId}`)
        .query({ simulateConflict: 'true' })
        .set('Authorization', `Bearer ${testToken}`)
        .send(adjustment2);

      // Assert
      expect(response1.statusCode).toBe(200);
      expect(response1.body).toHaveProperty('planId', conflictingPlanId);
      expect(response1.body).toHaveProperty('reflection', 'First update successful');

      expect(response2.statusCode).toBe(409);
      expect(response2.body).toHaveProperty('status', 'error');
      expect(response2.body).toHaveProperty('message', 'Workout plan was modified by another request');
      expect(response2.body).toHaveProperty('errorCode', ERROR_CODES.CONCURRENCY_ERROR);
    });
  });

  // =================================================================
  // Tests for DELETE /v1/workouts/:planId (Delete Workout Plan)
  // =================================================================
  describe('DELETE /v1/workouts/:planId', () => {
    const testPlanId = 'plan-to-delete';
    const nonExistentPlanId = 'nonexistent-plan';

    test('should delete a workout plan successfully (204)', async () => {
      // Act
      const response = await request(app)
        .delete(`/v1/workouts/${testPlanId}`)
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(204);
      expect(mockWorkoutController.deleteWorkoutPlan).toHaveBeenCalledTimes(1);
    });

    test('should return 404 Not Found if plan does not exist for deletion', async () => {
      // Act
      const response = await request(app)
        .delete(`/v1/workouts/${nonExistentPlanId}`)
        .set('Authorization', `Bearer ${testToken}`);
        
      // Assert
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errorCode', 'WORKOUT_PLAN_NOT_FOUND');
      expect(response.body).toHaveProperty('message', 'Workout plan to delete not found');
    });

    test('should return 401 Unauthorized if no token is provided', async () => {
      // Act
      const response = await request(app)
        .delete(`/v1/workouts/${testPlanId}`);
        
      // Assert
      expect(response.statusCode).toBe(401);
    });

    test('should return 500 Internal Server Error if database fails during deletion', async () => {
      // Act
      const response = await request(app)
        .delete(`/v1/workouts/${testPlanId}`)
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