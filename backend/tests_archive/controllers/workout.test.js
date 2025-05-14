// Explicit mock calls MUST be at the top
jest.mock('../../config');
jest.mock('../../config/supabase');

/**
 * @fileoverview Tests for Workout Controller
 */

const workoutController = require('../../controllers/workout');
const workoutService = require('../../services/workout-service');
const { WorkoutGenerationAgent, PlanAdjustmentAgent } = require('../../agents');
const { NotFoundError, DatabaseError, ApplicationError } = require('../../utils/errors');
const logger = require('../../config/logger');

// Mock dependencies
jest.mock('../../services/workout-service');
jest.mock('../../config/logger');

// Manual mock setup for agents
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

// Mock request and response objects helper
const mockRequest = (user = {}, body = {}, params = {}, query = {}, headers = {}) => ({
  user,
  body,
  params,
  query,
  headers,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res); // For 204 responses
  return res;
};

const mockUserId = 'user-uuid-ctrl-123';
const mockJwtToken = 'mock.jwt.token.ctrl';
const mockPlanId = 'plan-uuid-ctrl-456';
const mockGeneratedPlanData = { planDetails: 'Generated' };
const mockStoredPlan = { id: mockPlanId, user_id: mockUserId, plan: mockGeneratedPlanData };
const mockPlanList = [{ id: 'plan1' }, { id: 'plan2' }];
const mockAdjustmentBody = { adjustments: { notesOrPreferences: 'More cardio' } };
const mockAdjustedPlanData = { planDetails: 'Adjusted' };
const mockUpdatedPlan = { id: mockPlanId, user_id: mockUserId, plan: mockAdjustedPlanData };

describe('Workout Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest();
    res = mockResponse();
    req.user = { id: mockUserId };
    req.headers = { authorization: `Bearer ${mockJwtToken}` };
  });

  // --- generateWorkoutPlan Tests ---
  describe('generateWorkoutPlan', () => {
    beforeEach(() => {
      req.body = { fitnessLevel: 'beginner', goals: ['loss'] }; // Example valid body
      WorkoutGenerationAgent.process.mockResolvedValue(mockGeneratedPlanData);
      workoutService.storeWorkoutPlan.mockResolvedValue(mockStoredPlan);
    });

    it('should generate and store a plan successfully, returning 201', async () => {
      await workoutController.generateWorkoutPlan(req, res);

      expect(WorkoutGenerationAgent.process).toHaveBeenCalledWith({ ...req.body, userId: mockUserId });
      expect(workoutService.storeWorkoutPlan).toHaveBeenCalledWith(mockUserId, mockGeneratedPlanData, mockJwtToken);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: mockStoredPlan });
    });

    it('should return 401 if user is not authenticated', async () => {
      req.user = null;
      req.headers = {};
      await workoutController.generateWorkoutPlan(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Authentication required.' });
      expect(WorkoutGenerationAgent.process).not.toHaveBeenCalled();
      expect(workoutService.storeWorkoutPlan).not.toHaveBeenCalled();
    });

    it('should return 500 if WorkoutGenerationAgent fails', async () => {
      const agentError = new ApplicationError('Agent failed');
      WorkoutGenerationAgent.process.mockRejectedValue(agentError);

      await workoutController.generateWorkoutPlan(req, res);

      expect(workoutService.storeWorkoutPlan).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: agentError.message });
    });

    it('should return 500 if WorkoutGenerationAgent returns no data', async () => {
      WorkoutGenerationAgent.process.mockResolvedValue(null); // Simulate agent returning nothing

      await workoutController.generateWorkoutPlan(req, res);

      expect(workoutService.storeWorkoutPlan).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Workout plan generation failed.' });
    });

    it('should return 500 if storeWorkoutPlan fails', async () => {
      const dbError = new DatabaseError('DB save failed');
      workoutService.storeWorkoutPlan.mockRejectedValue(dbError);

      await workoutController.generateWorkoutPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to generate workout plan due to an internal error.' });
    });
  });

  // --- getWorkoutPlans Tests ---
  describe('getWorkoutPlans', () => {
    beforeEach(() => {
      req.query = { limit: 15, offset: 5 }; // Example validated query
      workoutService.retrieveWorkoutPlans.mockResolvedValue(mockPlanList);
    });

    it('should retrieve plans successfully, returning 200', async () => {
      await workoutController.getWorkoutPlans(req, res);

      expect(workoutService.retrieveWorkoutPlans).toHaveBeenCalledWith(mockUserId, req.query, mockJwtToken);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: mockPlanList });
    });

    it('should return 401 if user is not authenticated', async () => {
       req.user = null;
       req.headers = {};
       await workoutController.getWorkoutPlans(req, res);
       expect(res.status).toHaveBeenCalledWith(401);
       expect(workoutService.retrieveWorkoutPlans).not.toHaveBeenCalled();
    });

    it('should return 500 if retrieveWorkoutPlans fails with DatabaseError', async () => {
      const dbError = new DatabaseError('DB query failed');
      workoutService.retrieveWorkoutPlans.mockRejectedValue(dbError);

      await workoutController.getWorkoutPlans(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to retrieve workout plans due to a database issue.' });
    });

    it('should return 500 for generic errors during retrieval', async () => {
        workoutService.retrieveWorkoutPlans.mockRejectedValue(new Error('Unexpected'));
        await workoutController.getWorkoutPlans(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to retrieve workout plans due to an internal error.' });
    });
  });

  // --- getWorkoutPlan Tests ---
  describe('getWorkoutPlan', () => {
    beforeEach(() => {
      req.params = { planId: mockPlanId };
      workoutService.retrieveWorkoutPlan.mockResolvedValue(mockStoredPlan);
    });

    it('should retrieve a specific plan successfully, returning 200', async () => {
      await workoutController.getWorkoutPlan(req, res);

      expect(workoutService.retrieveWorkoutPlan).toHaveBeenCalledWith(mockPlanId, mockUserId, mockJwtToken);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: mockStoredPlan });
    });

    it('should return 401 if user is not authenticated', async () => {
        req.user = null;
        req.headers = {};
        await workoutController.getWorkoutPlan(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(workoutService.retrieveWorkoutPlan).not.toHaveBeenCalled();
    });

    it('should return 400 if planId is missing', async () => {
        req.params = {};
        await workoutController.getWorkoutPlan(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Plan ID is required.' });
        expect(workoutService.retrieveWorkoutPlan).not.toHaveBeenCalled();
    });

    it('should return 404 if retrieveWorkoutPlan throws NotFoundError', async () => {
      const notFoundError = new NotFoundError('Plan not found');
      workoutService.retrieveWorkoutPlan.mockRejectedValue(notFoundError);

      await workoutController.getWorkoutPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: notFoundError.message });
    });

    it('should return 500 if retrieveWorkoutPlan fails with DatabaseError', async () => {
      const dbError = new DatabaseError('DB query failed');
      workoutService.retrieveWorkoutPlan.mockRejectedValue(dbError);

      await workoutController.getWorkoutPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
       expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to retrieve workout plan due to a database issue.' });
    });
  });

  // --- adjustWorkoutPlan Tests ---
  describe('adjustWorkoutPlan', () => {
    beforeEach(() => {
      req.params = { planId: mockPlanId };
      req.body = mockAdjustmentBody;
      workoutService.retrieveWorkoutPlan.mockResolvedValue(mockStoredPlan); // Need current plan first
      PlanAdjustmentAgent.process.mockResolvedValue(mockAdjustedPlanData);
      workoutService.updateWorkoutPlan.mockResolvedValue(mockUpdatedPlan);
    });

    it('should adjust and update a plan successfully, returning 200', async () => {
      await workoutController.adjustWorkoutPlan(req, res);

      expect(workoutService.retrieveWorkoutPlan).toHaveBeenCalledWith(mockPlanId, mockUserId, mockJwtToken);
      expect(PlanAdjustmentAgent.process).toHaveBeenCalledWith({ plan: mockStoredPlan, userFeedback: req.body.adjustments });
      expect(workoutService.updateWorkoutPlan).toHaveBeenCalledWith(mockPlanId, { plan: mockAdjustedPlanData }, mockUserId, mockJwtToken);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: mockUpdatedPlan });
    });

    it('should return 401 if user is not authenticated', async () => {
        req.user = null;
        req.headers = {};
        await workoutController.adjustWorkoutPlan(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(workoutService.retrieveWorkoutPlan).not.toHaveBeenCalled();
        expect(PlanAdjustmentAgent.process).not.toHaveBeenCalled();
        expect(workoutService.updateWorkoutPlan).not.toHaveBeenCalled();
    });

    it('should return 400 if planId is missing', async () => {
        req.params = {};
        await workoutController.adjustWorkoutPlan(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
         expect(workoutService.retrieveWorkoutPlan).not.toHaveBeenCalled();
    });

    it('should return 404 if the initial retrieveWorkoutPlan fails (NotFound)', async () => {
      const notFoundError = new NotFoundError('Plan not found to adjust');
      workoutService.retrieveWorkoutPlan.mockRejectedValue(notFoundError);

      await workoutController.adjustWorkoutPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: notFoundError.message });
      expect(PlanAdjustmentAgent.process).not.toHaveBeenCalled();
      expect(workoutService.updateWorkoutPlan).not.toHaveBeenCalled();
    });

    it('should return 500 if PlanAdjustmentAgent fails', async () => {
      const agentError = new ApplicationError('Adjustment agent failed');
      PlanAdjustmentAgent.process.mockRejectedValue(agentError);

      await workoutController.adjustWorkoutPlan(req, res);

      expect(workoutService.updateWorkoutPlan).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: agentError.message });
    });

     it('should return 500 if PlanAdjustmentAgent returns no data', async () => {
      PlanAdjustmentAgent.process.mockResolvedValue(null);

      await workoutController.adjustWorkoutPlan(req, res);

      expect(workoutService.updateWorkoutPlan).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Workout plan adjustment failed.' });
    });

    it('should return 500 if updateWorkoutPlan fails (DatabaseError)', async () => {
      const dbError = new DatabaseError('Update failed');
      workoutService.updateWorkoutPlan.mockRejectedValue(dbError);

      await workoutController.adjustWorkoutPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to adjust workout plan due to a database issue.' });
    });
  });

  // --- deleteWorkoutPlan Tests ---
  describe('deleteWorkoutPlan', () => {
    beforeEach(() => {
      req.params = { planId: mockPlanId };
      workoutService.removeWorkoutPlan.mockResolvedValue(); // Resolves with no value on success
    });

    it('should delete a plan successfully, returning 204', async () => {
      await workoutController.deleteWorkoutPlan(req, res);

      expect(workoutService.removeWorkoutPlan).toHaveBeenCalledWith(mockPlanId, mockUserId, mockJwtToken);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled(); // Ensure send is called for 204
    });

    it('should return 401 if user is not authenticated', async () => {
        req.user = null;
        req.headers = {};
        await workoutController.deleteWorkoutPlan(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(workoutService.removeWorkoutPlan).not.toHaveBeenCalled();
    });

     it('should return 400 if planId is missing', async () => {
        req.params = {};
        await workoutController.deleteWorkoutPlan(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
         expect(workoutService.removeWorkoutPlan).not.toHaveBeenCalled();
    });

    it('should return 404 if removeWorkoutPlan throws NotFoundError', async () => {
      const notFoundError = new NotFoundError('Plan not found to delete');
      workoutService.removeWorkoutPlan.mockRejectedValue(notFoundError);

      await workoutController.deleteWorkoutPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: notFoundError.message });
    });

    it('should return 500 if removeWorkoutPlan fails with DatabaseError', async () => {
      const dbError = new DatabaseError('DB delete failed');
      workoutService.removeWorkoutPlan.mockRejectedValue(dbError);

      await workoutController.deleteWorkoutPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to delete workout plan due to a database issue.' });
    });
  });
}); 