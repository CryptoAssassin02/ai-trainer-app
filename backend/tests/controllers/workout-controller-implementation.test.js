/** @jest-environment node */

const workoutController = require('../../controllers/workout');
const workoutService = require('../../services/workout-service');
const { WorkoutGenerationAgent, PlanAdjustmentAgent } = require('../../agents');
const logger = require('../../config/logger');
const { NotFoundError, DatabaseError, ApplicationError } = require('../../utils/errors');

// Mock dependencies
jest.mock('../../services/workout-service');
jest.mock('../../agents', () => ({
  WorkoutGenerationAgent: {
    process: jest.fn(),
  },
  PlanAdjustmentAgent: {
    process: jest.fn(),
  },
}));
jest.mock('../../config/logger');

// Mock Express request and response objects
let mockReq;
let mockRes;

beforeEach(() => {
  mockReq = {
    user: { id: 'user-123' },
    headers: { authorization: 'Bearer valid-token' },
    body: {},
    query: {},
    params: {},
  };
  mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
  };
  // Reset mocks before each test
  jest.clearAllMocks();

  // Mock specific error constructors if needed, otherwise errors might not be instances of the mocked class
  // Example: NotFoundError.mockImplementation(message => ({ name: 'NotFoundError', message }));
  // Or just rely on the real error classes if not mocking the errors utility itself
});

describe('Workout Controller Implementation Tests', () => {

  describe('generateWorkoutPlan', () => {
    // Tests for generateWorkoutPlan will go here
    test('should return 401 if user ID is missing', async () => {
      mockReq.user = null;
      await workoutController.generateWorkoutPlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('generateWorkoutPlan called without userId or jwtToken in request context.');
    });

    test('should return 401 if JWT token is missing', async () => {
      mockReq.headers.authorization = undefined;
      await workoutController.generateWorkoutPlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('generateWorkoutPlan called without userId or jwtToken in request context.');
    });

    test('should successfully generate and store a workout plan', async () => {
      const generatedPlanData = { planName: 'Generated Plan', exercises: [] };
      const savedPlanData = { id: 'plan-abc', ...generatedPlanData, userId: 'user-123' };
      mockReq.body = { fitnessLevel: 'beginner' }; // Example input

      WorkoutGenerationAgent.process.mockResolvedValue(generatedPlanData);
      workoutService.storeWorkoutPlan.mockResolvedValue(savedPlanData);

      await workoutController.generateWorkoutPlan(mockReq, mockRes);

      expect(WorkoutGenerationAgent.process).toHaveBeenCalledWith({ ...mockReq.body, userId: 'user-123' });
      expect(workoutService.storeWorkoutPlan).toHaveBeenCalledWith('user-123', generatedPlanData, 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: savedPlanData });
      expect(logger.info).toHaveBeenCalledWith('Generating workout plan for user: user-123');
      expect(logger.info).toHaveBeenCalledWith('Workout plan successfully generated and stored for user user-123, Plan ID: plan-abc');
    });

     test('should return 500 if WorkoutGenerationAgent returns no data', async () => {
      mockReq.body = { fitnessLevel: 'intermediate' };
      WorkoutGenerationAgent.process.mockResolvedValue(null); // Simulate agent failure

      await workoutController.generateWorkoutPlan(mockReq, mockRes);

      expect(WorkoutGenerationAgent.process).toHaveBeenCalledWith({ ...mockReq.body, userId: 'user-123' });
      expect(workoutService.storeWorkoutPlan).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Workout plan generation failed.' });
      expect(logger.error).toHaveBeenCalledWith('WorkoutGenerationAgent returned no data.');
      // Expect ApplicationError to be constructed (assuming not mocking errors.js)
      // expect(ApplicationError).toHaveBeenCalledWith('Workout plan generation failed.');
    });


    test('should return 500 if WorkoutGenerationAgent throws an error', async () => {
      const agentError = new Error('Agent processing failed');
      mockReq.body = { goals: ['strength'] };
      WorkoutGenerationAgent.process.mockRejectedValue(agentError);

      await workoutController.generateWorkoutPlan(mockReq, mockRes);

      expect(WorkoutGenerationAgent.process).toHaveBeenCalledWith({ ...mockReq.body, userId: 'user-123' });
      expect(workoutService.storeWorkoutPlan).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to generate workout plan due to an internal error.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error generating workout plan'), expect.any(Object));
    });

    test('should return 500 if workoutService.storeWorkoutPlan throws an error', async () => {
      const generatedPlanData = { planName: 'Generated Plan', exercises: [] };
      const serviceError = new DatabaseError('DB connection failed'); // Use mocked or real error
      mockReq.body = { equipment: ['barbell'] };

      WorkoutGenerationAgent.process.mockResolvedValue(generatedPlanData);
      workoutService.storeWorkoutPlan.mockRejectedValue(serviceError);

      await workoutController.generateWorkoutPlan(mockReq, mockRes);

      expect(WorkoutGenerationAgent.process).toHaveBeenCalledWith({ ...mockReq.body, userId: 'user-123' });
      expect(workoutService.storeWorkoutPlan).toHaveBeenCalledWith('user-123', generatedPlanData, 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to generate workout plan due to an internal error.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error generating workout plan'), expect.any(Object));
    });
  });

  describe('getWorkoutPlans', () => {
    test('should return 401 if user ID is missing', async () => {
      mockReq.user = null;
      await workoutController.getWorkoutPlans(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('getWorkoutPlans called without userId or jwtToken in request context.');
    });

    test('should return 401 if JWT token is missing', async () => {
      mockReq.headers.authorization = undefined;
      await workoutController.getWorkoutPlans(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('getWorkoutPlans called without userId or jwtToken in request context.');
    });

    test('should successfully retrieve workout plans with filters', async () => {
      const mockPlans = [{ id: 'plan-1', name: 'Plan 1' }, { id: 'plan-2', name: 'Plan 2' }];
      mockReq.query = { limit: '10', offset: '0', searchTerm: 'test' }; // Example filters
      workoutService.retrieveWorkoutPlans.mockResolvedValue(mockPlans);

      await workoutController.getWorkoutPlans(mockReq, mockRes);

      expect(workoutService.retrieveWorkoutPlans).toHaveBeenCalledWith('user-123', mockReq.query, 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: mockPlans });
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Fetching workout plans for user: user-123'));
      expect(logger.info).toHaveBeenCalledWith('Found 2 plans for user user-123');
    });

     test('should return 500 if workoutService.retrieveWorkoutPlans throws a DatabaseError', async () => {
      const dbError = new DatabaseError('Failed to connect');
      workoutService.retrieveWorkoutPlans.mockRejectedValue(dbError);

      await workoutController.getWorkoutPlans(mockReq, mockRes);

      expect(workoutService.retrieveWorkoutPlans).toHaveBeenCalledWith('user-123', mockReq.query, 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to retrieve workout plans due to a database issue.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error retrieving workout plans'), expect.any(Object));
    });

    test('should return 500 if workoutService.retrieveWorkoutPlans throws a generic error', async () => {
      const genericError = new Error('Something went wrong');
      workoutService.retrieveWorkoutPlans.mockRejectedValue(genericError);

      await workoutController.getWorkoutPlans(mockReq, mockRes);

      expect(workoutService.retrieveWorkoutPlans).toHaveBeenCalledWith('user-123', mockReq.query, 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to retrieve workout plans due to an internal error.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error retrieving workout plans'), expect.any(Object));
    });
  });

  describe('getWorkoutPlan', () => {
    test('should return 401 if user ID is missing', async () => {
      mockReq.user = null;
      mockReq.params.planId = 'plan-xyz';
      await workoutController.getWorkoutPlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('getWorkoutPlan called without userId or jwtToken in request context.');
    });

    test('should return 401 if JWT token is missing', async () => {
      mockReq.headers.authorization = undefined;
      mockReq.params.planId = 'plan-xyz';
      await workoutController.getWorkoutPlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('getWorkoutPlan called without userId or jwtToken in request context.');
    });

    test('should return 400 if planId parameter is missing', async () => {
      // No planId in mockReq.params
      await workoutController.getWorkoutPlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Plan ID is required.' });
      expect(workoutService.retrieveWorkoutPlan).not.toHaveBeenCalled();
    });

    test('should successfully retrieve a specific workout plan', async () => {
      const planId = 'plan-xyz';
      const mockPlan = { id: planId, name: 'Specific Plan', userId: 'user-123' };
      mockReq.params.planId = planId;
      workoutService.retrieveWorkoutPlan.mockResolvedValue(mockPlan);

      await workoutController.getWorkoutPlan(mockReq, mockRes);

      expect(workoutService.retrieveWorkoutPlan).toHaveBeenCalledWith(planId, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: mockPlan });
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Fetching workout plan ID: ${planId}`));
      expect(logger.info).toHaveBeenCalledWith(`Plan ${planId} retrieved successfully for user user-123`);
    });

    test('should return 404 if workoutService.retrieveWorkoutPlan throws NotFoundError', async () => {
      const planId = 'plan-not-found';
      const notFoundError = new NotFoundError('Plan not found.'); // Use real error
      mockReq.params.planId = planId;
      workoutService.retrieveWorkoutPlan.mockRejectedValue(notFoundError);

      await workoutController.getWorkoutPlan(mockReq, mockRes);

      expect(workoutService.retrieveWorkoutPlan).toHaveBeenCalledWith(planId, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Plan not found.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error retrieving workout plan ${planId}`), expect.any(Object));
    });

    test('should return 500 if workoutService.retrieveWorkoutPlan throws a DatabaseError', async () => {
      const planId = 'plan-db-error';
      const dbError = new DatabaseError('DB query failed');
      mockReq.params.planId = planId;
      workoutService.retrieveWorkoutPlan.mockRejectedValue(dbError);

      await workoutController.getWorkoutPlan(mockReq, mockRes);

      expect(workoutService.retrieveWorkoutPlan).toHaveBeenCalledWith(planId, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to retrieve workout plan due to a database issue.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error retrieving workout plan ${planId}`), expect.any(Object));
    });

    test('should return 500 if workoutService.retrieveWorkoutPlan throws a generic error', async () => {
      const planId = 'plan-generic-error';
      const genericError = new Error('Unexpected issue');
      mockReq.params.planId = planId;
      workoutService.retrieveWorkoutPlan.mockRejectedValue(genericError);

      await workoutController.getWorkoutPlan(mockReq, mockRes);

      expect(workoutService.retrieveWorkoutPlan).toHaveBeenCalledWith(planId, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to retrieve workout plan due to an internal error.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error retrieving workout plan ${planId}`), expect.any(Object));
    });
  });

  describe('adjustWorkoutPlan', () => {
    test('should return 401 if user ID is missing', async () => {
      mockReq.user = null;
      mockReq.params.planId = 'plan-adjust';
      await workoutController.adjustWorkoutPlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('adjustWorkoutPlan called without userId or jwtToken in request context.');
    });

    test('should return 401 if JWT token is missing', async () => {
      mockReq.headers.authorization = undefined;
      mockReq.params.planId = 'plan-adjust';
      await workoutController.adjustWorkoutPlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('adjustWorkoutPlan called without userId or jwtToken in request context.');
    });

    test('should return 400 if planId parameter is missing', async () => {
      // No planId in mockReq.params
      await workoutController.adjustWorkoutPlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Plan ID is required.' });
      expect(workoutService.retrieveWorkoutPlan).not.toHaveBeenCalled();
    });

    test('should successfully adjust and update a workout plan', async () => {
      const planId = 'plan-adjust';
      const currentPlan = { id: planId, name: 'Original Plan', plan: { exercises: [] }, updated_at: 'some-timestamp' };
      const adjustments = { notesOrPreferences: 'Focus on legs' };
      const adjustedPlanData = { exercises: [{ name: 'Squats' }] };
      const updatedPlan = { ...currentPlan, plan: adjustedPlanData, updated_at: 'new-timestamp' };

      mockReq.params.planId = planId;
      mockReq.body = { adjustments };

      workoutService.retrieveWorkoutPlan.mockResolvedValue(currentPlan);
      PlanAdjustmentAgent.process.mockResolvedValue(adjustedPlanData);
      workoutService.updateWorkoutPlan.mockResolvedValue(updatedPlan);

      await workoutController.adjustWorkoutPlan(mockReq, mockRes);

      expect(workoutService.retrieveWorkoutPlan).toHaveBeenCalledWith(planId, 'user-123', 'valid-token');
      expect(PlanAdjustmentAgent.process).toHaveBeenCalledWith({ plan: currentPlan, userFeedback: adjustments });
      expect(workoutService.updateWorkoutPlan).toHaveBeenCalledWith(planId, { plan: adjustedPlanData }, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: updatedPlan });
      expect(logger.info).toHaveBeenCalledWith(`Adjusting workout plan ID: ${planId} for user: user-123`);
      expect(logger.info).toHaveBeenCalledWith(`Workout plan ${planId} adjusted and updated successfully for user user-123`);
    });

    test('should return 404 if workoutService.retrieveWorkoutPlan throws NotFoundError', async () => {
      const planId = 'plan-not-found';
      const notFoundError = new NotFoundError('Plan to adjust not found.');
      mockReq.params.planId = planId;
      mockReq.body = { adjustments: {} };
      workoutService.retrieveWorkoutPlan.mockRejectedValue(notFoundError);

      await workoutController.adjustWorkoutPlan(mockReq, mockRes);

      expect(workoutService.retrieveWorkoutPlan).toHaveBeenCalledWith(planId, 'user-123', 'valid-token');
      expect(PlanAdjustmentAgent.process).not.toHaveBeenCalled();
      expect(workoutService.updateWorkoutPlan).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Plan to adjust not found.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error adjusting workout plan ${planId}`), expect.any(Object));
    });

    test('should return 500 if PlanAdjustmentAgent returns no data', async () => {
      const planId = 'plan-agent-fail';
      const currentPlan = { id: planId, name: 'Original Plan' };
      mockReq.params.planId = planId;
      mockReq.body = { adjustments: {} };

      workoutService.retrieveWorkoutPlan.mockResolvedValue(currentPlan);
      PlanAdjustmentAgent.process.mockResolvedValue(null); // Simulate agent failure

      await workoutController.adjustWorkoutPlan(mockReq, mockRes);

      expect(workoutService.retrieveWorkoutPlan).toHaveBeenCalledWith(planId, 'user-123', 'valid-token');
      expect(PlanAdjustmentAgent.process).toHaveBeenCalled();
      expect(workoutService.updateWorkoutPlan).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Workout plan adjustment failed.' });
      expect(logger.error).toHaveBeenCalledWith(`PlanAdjustmentAgent returned no data for plan ${planId}.`);
      // expect(ApplicationError).toHaveBeenCalledWith('Workout plan adjustment failed.'); // Check ApplicationError usage
    });

    test('should return 500 if PlanAdjustmentAgent throws an error', async () => {
      const planId = 'plan-agent-error';
      const currentPlan = { id: planId, name: 'Original Plan' };
      const agentError = new Error('Agent adjustment failed');
      mockReq.params.planId = planId;
      mockReq.body = { adjustments: {} };

      workoutService.retrieveWorkoutPlan.mockResolvedValue(currentPlan);
      PlanAdjustmentAgent.process.mockRejectedValue(agentError);

      await workoutController.adjustWorkoutPlan(mockReq, mockRes);

      expect(workoutService.retrieveWorkoutPlan).toHaveBeenCalledWith(planId, 'user-123', 'valid-token');
      expect(PlanAdjustmentAgent.process).toHaveBeenCalled();
      expect(workoutService.updateWorkoutPlan).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to adjust workout plan due to an internal error.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error adjusting workout plan ${planId}`), expect.any(Object));
    });

    test('should return 500 if workoutService.updateWorkoutPlan throws DatabaseError', async () => {
      const planId = 'plan-update-db-error';
      const currentPlan = { id: planId, name: 'Original Plan' };
      const adjustments = {};
      const adjustedPlanData = { exercises: [{ name: 'Updated Exercise' }] };
      const dbError = new DatabaseError('Update failed');

      mockReq.params.planId = planId;
      mockReq.body = { adjustments };

      workoutService.retrieveWorkoutPlan.mockResolvedValue(currentPlan);
      PlanAdjustmentAgent.process.mockResolvedValue(adjustedPlanData);
      workoutService.updateWorkoutPlan.mockRejectedValue(dbError);

      await workoutController.adjustWorkoutPlan(mockReq, mockRes);

      expect(workoutService.retrieveWorkoutPlan).toHaveBeenCalledWith(planId, 'user-123', 'valid-token');
      expect(PlanAdjustmentAgent.process).toHaveBeenCalledWith({ plan: currentPlan, userFeedback: adjustments });
      expect(workoutService.updateWorkoutPlan).toHaveBeenCalledWith(planId, { plan: adjustedPlanData }, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to adjust workout plan due to a database issue.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error adjusting workout plan ${planId}`), expect.any(Object));
    });

    test('should return 500 if workoutService.updateWorkoutPlan throws a generic error', async () => {
      const planId = 'plan-update-generic-error';
      const currentPlan = { id: planId, name: 'Original Plan' };
      const adjustments = {};
      const adjustedPlanData = { exercises: [{ name: 'Another Exercise' }] };
      const genericError = new Error('Unexpected update issue');

      mockReq.params.planId = planId;
      mockReq.body = { adjustments };

      workoutService.retrieveWorkoutPlan.mockResolvedValue(currentPlan);
      PlanAdjustmentAgent.process.mockResolvedValue(adjustedPlanData);
      workoutService.updateWorkoutPlan.mockRejectedValue(genericError);

      await workoutController.adjustWorkoutPlan(mockReq, mockRes);

      expect(workoutService.updateWorkoutPlan).toHaveBeenCalledWith(planId, { plan: adjustedPlanData }, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to adjust workout plan due to an internal error.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error adjusting workout plan ${planId}`), expect.any(Object));
    });
  });

  describe('deleteWorkoutPlan', () => {
    test('should return 401 if user ID is missing', async () => {
      mockReq.user = null;
      mockReq.params.planId = 'plan-delete';
      await workoutController.deleteWorkoutPlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('deleteWorkoutPlan called without userId or jwtToken in request context.');
    });

    test('should return 401 if JWT token is missing', async () => {
      mockReq.headers.authorization = undefined;
      mockReq.params.planId = 'plan-delete';
      await workoutController.deleteWorkoutPlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(logger.warn).toHaveBeenCalledWith('deleteWorkoutPlan called without userId or jwtToken in request context.');
    });

    test('should return 400 if planId parameter is missing', async () => {
      await workoutController.deleteWorkoutPlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Plan ID is required.' });
      expect(workoutService.removeWorkoutPlan).not.toHaveBeenCalled();
    });

    test('should successfully delete a workout plan and return 204', async () => {
      const planId = 'plan-delete';
      mockReq.params.planId = planId;
      workoutService.removeWorkoutPlan.mockResolvedValue(); // Service resolves successfully

      await workoutController.deleteWorkoutPlan(mockReq, mockRes);

      expect(workoutService.removeWorkoutPlan).toHaveBeenCalledWith(planId, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(`Deleting workout plan ID: ${planId} for user: user-123`);
      expect(logger.info).toHaveBeenCalledWith(`Plan ${planId} deleted successfully for user user-123`);
    });

    test('should return 404 if workoutService.removeWorkoutPlan throws NotFoundError', async () => {
      const planId = 'plan-not-found';
      const notFoundError = new NotFoundError('Plan to delete not found.');
      mockReq.params.planId = planId;
      workoutService.removeWorkoutPlan.mockRejectedValue(notFoundError);

      await workoutController.deleteWorkoutPlan(mockReq, mockRes);

      expect(workoutService.removeWorkoutPlan).toHaveBeenCalledWith(planId, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Plan to delete not found.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error deleting workout plan ${planId}`), expect.any(Object));
    });

    test('should return 500 if workoutService.removeWorkoutPlan throws DatabaseError', async () => {
      const planId = 'plan-delete-db-error';
      const dbError = new DatabaseError('Delete failed');
      mockReq.params.planId = planId;
      workoutService.removeWorkoutPlan.mockRejectedValue(dbError);

      await workoutController.deleteWorkoutPlan(mockReq, mockRes);

      expect(workoutService.removeWorkoutPlan).toHaveBeenCalledWith(planId, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to delete workout plan due to a database issue.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error deleting workout plan ${planId}`), expect.any(Object));
    });

    test('should return 500 if workoutService.removeWorkoutPlan throws a generic error', async () => {
      const planId = 'plan-delete-generic-error';
      const genericError = new Error('Unexpected delete issue');
      mockReq.params.planId = planId;
      workoutService.removeWorkoutPlan.mockRejectedValue(genericError);

      await workoutController.deleteWorkoutPlan(mockReq, mockRes);

      expect(workoutService.removeWorkoutPlan).toHaveBeenCalledWith(planId, 'user-123', 'valid-token');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to delete workout plan due to an internal error.' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error deleting workout plan ${planId}`), expect.any(Object));
    });
  });

  // End of describe block
}); 