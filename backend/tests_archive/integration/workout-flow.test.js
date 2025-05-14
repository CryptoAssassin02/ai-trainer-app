// Explicit mock calls MUST be at the top
jest.mock('../../config');
jest.mock('../../config/supabase');

/**
 * @fileoverview Integration tests for the workout generation and adjustment flow.
 */

const request = require('supertest');
const express = require('express');
const workoutRoutes = require('../../routes/workout');
const workoutService = require('../../services/workout-service');
const { WorkoutGenerationAgent, PlanAdjustmentAgent } = require('../../agents');
const { authenticate } = require('../../middleware/auth'); // Need to mock or provide a stub
const { NotFoundError, DatabaseError, ApplicationError } = require('../../utils/errors');

// --- Mock Dependencies ---

jest.mock('../../services/workout-service');

// Manual mock for agents
jest.mock('../../agents', () => {
  return {
    WorkoutGenerationAgent: {
      process: jest.fn()
    },
    PlanAdjustmentAgent: {
      process: jest.fn()
    }
  };
});

// Simple stub for authentication middleware for testing purposes
// In a real app, you might have a more sophisticated way to inject test users
jest.mock('../../middleware/auth', () => ({
    authenticate: (req, res, next) => {
        // Attach a mock user and token for authenticated routes
        req.user = { id: 'test-user-id' };
        req.headers.authorization = 'Bearer test-jwt-token';
        next();
    }
}));

// Mock error handler middleware
const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  
  if (err.statusCode) {
    statusCode = err.statusCode;
  }
  
  if (err.message) {
    message = err.message;
  }
  
  // Map specific error types to status codes
  if (err instanceof NotFoundError) {
    statusCode = 404;
  } else if (err instanceof DatabaseError) {
    statusCode = 500;
    message = 'Database error occurred';
  } else if (err instanceof ApplicationError) {
    statusCode = 500;
  }
  
  res.status(statusCode).json({
    status: 'error',
    message: message,
    errors: err.details || undefined
  });
};

// Mock logger
jest.mock('../../config/logger');

// --- Setup Express App for Testing ---

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

// Mount the workout routes under a test prefix if needed, or directly
app.use(workoutRoutes); // Mounts routes like /v1/workouts

// Mount the error handler
app.use(errorHandler);

// --- Test Data ---

const mockUserId = 'test-user-id';
const mockJwtToken = 'test-jwt-token';
const mockPlanId = 'plan-integ-uuid-789';
const validGenerationPayload = {
    fitnessLevel: 'intermediate',
    goals: ['hypertrophy'],
    exerciseTypes: ['strength'],
    workoutFrequency: '4x per week'
};
const mockGeneratedPlan = { planDetails: 'Generated Plan Content' };
const mockStoredPlan = { id: mockPlanId, user_id: mockUserId, plan: mockGeneratedPlan, created_at: '...' };
const mockPlanList = [{ id: 'planA' }, { id: 'planB' }];
const validAdjustmentPayload = {
    adjustments: { notesOrPreferences: 'Focus more on back' }
};
const mockAdjustedPlan = { planDetails: 'Adjusted Plan Content' };
const mockUpdatedPlan = { id: mockPlanId, user_id: mockUserId, plan: mockAdjustedPlan, updated_at: '...' };

// --- Integration Tests ---

describe('Workout Routes Integration Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // --- POST /v1/workouts --- (Generate Plan)
    describe('POST /v1/workouts', () => {
        it('should generate and store a plan, returning 201', async () => {
            WorkoutGenerationAgent.process.mockResolvedValue(mockGeneratedPlan);
            workoutService.storeWorkoutPlan.mockResolvedValue(mockStoredPlan);

            const response = await request(app)
                .post('/v1/workouts')
                .send(validGenerationPayload)
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body).toEqual({ status: 'success', data: mockStoredPlan });
            expect(WorkoutGenerationAgent.process).toHaveBeenCalledWith(expect.objectContaining(validGenerationPayload));
            expect(workoutService.storeWorkoutPlan).toHaveBeenCalledWith(mockUserId, mockGeneratedPlan, mockJwtToken);
        });

        it('should return 400 if validation fails', async () => {
            const invalidPayload = { ...validGenerationPayload, goals: [] }; // Invalid: empty goals
            const response = await request(app)
                .post('/v1/workouts')
                .send(invalidPayload)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Validation failed');
            expect(response.body.errors[0].field).toBe('goals');
        });

        it('should return 500 if agent processing fails', async () => {
            WorkoutGenerationAgent.process.mockRejectedValue(new ApplicationError('Agent error'));
            const response = await request(app)
                .post('/v1/workouts')
                .send(validGenerationPayload)
                .expect('Content-Type', /json/)
                .expect(500);

            expect(response.body).toEqual({ status: 'error', message: 'Agent error' }); // Assuming ApplicationError maps to 500
        });

        it('should return 500 if database storing fails', async () => {
            WorkoutGenerationAgent.process.mockResolvedValue(mockGeneratedPlan);
            workoutService.storeWorkoutPlan.mockRejectedValue(new DatabaseError('DB error'));
            const response = await request(app)
                .post('/v1/workouts')
                .send(validGenerationPayload)
                .expect('Content-Type', /json/)
                .expect(500);
            // The exact message depends on the controller's error handling for DB errors
             expect(response.body).toEqual({ status: 'error', message: 'Failed to generate workout plan due to an internal error.' });
        });

        // Add test for rate limiting if possible (might require more complex setup)
    });

    // --- GET /v1/workouts --- (List Plans)
    describe('GET /v1/workouts', () => {
        it('should retrieve a list of plans, returning 200', async () => {
            workoutService.retrieveWorkoutPlans.mockResolvedValue(mockPlanList);
            const response = await request(app)
                .get('/v1/workouts?limit=5&offset=0') // Example query params
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toEqual({ status: 'success', data: mockPlanList });
            expect(workoutService.retrieveWorkoutPlans).toHaveBeenCalledWith(mockUserId, { limit: 5, offset: 0 }, mockJwtToken);
        });

        it('should return 400 if query validation fails', async () => {
            const response = await request(app)
                .get('/v1/workouts?limit=abc') // Invalid limit
                .expect('Content-Type', /json/)
                .expect(400);
            expect(response.body.status).toBe('error');
            expect(response.body.errors[0].field).toBe('limit');
        });

        it('should return 500 if database retrieval fails', async () => {
             workoutService.retrieveWorkoutPlans.mockRejectedValue(new DatabaseError('DB list error'));
             const response = await request(app)
                 .get('/v1/workouts')
                 .expect('Content-Type', /json/)
                 .expect(500);
             expect(response.body).toEqual({ status: 'error', message: 'Failed to retrieve workout plans due to a database issue.' });
        });
    });

    // --- GET /v1/workouts/:planId --- (Get Specific Plan)
    describe('GET /v1/workouts/:planId', () => {
        it('should retrieve a specific plan, returning 200', async () => {
            workoutService.retrieveWorkoutPlan.mockResolvedValue(mockStoredPlan);
            const response = await request(app)
                .get(`/v1/workouts/${mockPlanId}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toEqual({ status: 'success', data: mockStoredPlan });
            expect(workoutService.retrieveWorkoutPlan).toHaveBeenCalledWith(mockPlanId, mockUserId, mockJwtToken);
        });

        it('should return 404 if plan is not found', async () => {
            workoutService.retrieveWorkoutPlan.mockRejectedValue(new NotFoundError(`Plan ${mockPlanId} not found.`));
            const response = await request(app)
                .get(`/v1/workouts/${mockPlanId}`)
                .expect('Content-Type', /json/)
                .expect(404);
            expect(response.body).toEqual({ status: 'error', message: `Plan ${mockPlanId} not found.` });
        });

         it('should return 500 if database retrieval fails', async () => {
             workoutService.retrieveWorkoutPlan.mockRejectedValue(new DatabaseError('DB get error'));
             const response = await request(app)
                 .get(`/v1/workouts/${mockPlanId}`)
                 .expect('Content-Type', /json/)
                 .expect(500);
              expect(response.body).toEqual({ status: 'error', message: 'Failed to retrieve workout plan due to a database issue.' });
        });
    });

    // --- POST /v1/workouts/:planId --- (Adjust Plan)
    describe('POST /v1/workouts/:planId', () => {
        it('should adjust and update a plan, returning 200', async () => {
            workoutService.retrieveWorkoutPlan.mockResolvedValue(mockStoredPlan); // Need current plan
            PlanAdjustmentAgent.process.mockResolvedValue(mockAdjustedPlan);
            workoutService.updateWorkoutPlan.mockResolvedValue(mockUpdatedPlan);

            const response = await request(app)
                .post(`/v1/workouts/${mockPlanId}`)
                .send(validAdjustmentPayload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toEqual({ status: 'success', data: mockUpdatedPlan });
            expect(workoutService.retrieveWorkoutPlan).toHaveBeenCalledWith(mockPlanId, mockUserId, mockJwtToken);
            expect(PlanAdjustmentAgent.process).toHaveBeenCalledWith({ plan: mockStoredPlan, userFeedback: validAdjustmentPayload.adjustments });
            expect(workoutService.updateWorkoutPlan).toHaveBeenCalledWith(mockPlanId, { plan: mockAdjustedPlan }, mockUserId, mockJwtToken);
        });

        it('should return 400 if validation fails', async () => {
            const invalidPayload = { adjustments: {} }; // Missing notesOrPreferences
            const response = await request(app)
                .post(`/v1/workouts/${mockPlanId}`)
                .send(invalidPayload)
                .expect('Content-Type', /json/)
                .expect(400);
            expect(response.body.status).toBe('error');
            expect(response.body.errors[0].field).toBe('adjustments.notesOrPreferences');
        });

         it('should return 404 if the plan to adjust is not found', async () => {
            workoutService.retrieveWorkoutPlan.mockRejectedValue(new NotFoundError('Not found'));
            const response = await request(app)
                .post(`/v1/workouts/${mockPlanId}`)
                .send(validAdjustmentPayload)
                .expect('Content-Type', /json/)
                .expect(404);
            expect(response.body).toEqual({ status: 'error', message: 'Not found' });
        });

        it('should return 500 if adjustment agent fails', async () => {
            workoutService.retrieveWorkoutPlan.mockResolvedValue(mockStoredPlan);
            PlanAdjustmentAgent.process.mockRejectedValue(new ApplicationError('Adjust agent failed'));
            const response = await request(app)
                 .post(`/v1/workouts/${mockPlanId}`)
                 .send(validAdjustmentPayload)
                 .expect('Content-Type', /json/)
                 .expect(500);
            expect(response.body).toEqual({ status: 'error', message: 'Adjust agent failed' });
        });

        it('should return 500 if database update fails', async () => {
            workoutService.retrieveWorkoutPlan.mockResolvedValue(mockStoredPlan);
            PlanAdjustmentAgent.process.mockResolvedValue(mockAdjustedPlan);
            workoutService.updateWorkoutPlan.mockRejectedValue(new DatabaseError('DB update failed'));
             const response = await request(app)
                 .post(`/v1/workouts/${mockPlanId}`)
                 .send(validAdjustmentPayload)
                 .expect('Content-Type', /json/)
                 .expect(500);
            expect(response.body).toEqual({ status: 'error', message: 'Failed to adjust workout plan due to a database issue.' });
        });
    });

    // --- DELETE /v1/workouts/:planId --- (Delete Plan)
    describe('DELETE /v1/workouts/:planId', () => {
        it('should delete a plan successfully, returning 204', async () => {
            workoutService.removeWorkoutPlan.mockResolvedValue(); // No return value on success
            await request(app)
                .delete(`/v1/workouts/${mockPlanId}`)
                .expect(204);
            // Check if the body is empty
            // expect(response.body).toEqual({}); // Supertest might handle this differently
            expect(workoutService.removeWorkoutPlan).toHaveBeenCalledWith(mockPlanId, mockUserId, mockJwtToken);
        });

        it('should return 404 if plan to delete is not found', async () => {
            workoutService.removeWorkoutPlan.mockRejectedValue(new NotFoundError('Not found to delete'));
            const response = await request(app)
                .delete(`/v1/workouts/${mockPlanId}`)
                .expect('Content-Type', /json/)
                .expect(404);
            expect(response.body).toEqual({ status: 'error', message: 'Not found to delete' });
        });

        it('should return 500 if database deletion fails', async () => {
            workoutService.removeWorkoutPlan.mockRejectedValue(new DatabaseError('DB delete error'));
            const response = await request(app)
                .delete(`/v1/workouts/${mockPlanId}`)
                .expect('Content-Type', /json/)
                .expect(500);
             expect(response.body).toEqual({ status: 'error', message: 'Failed to delete workout plan due to a database issue.' });
        });
    });
}); 