/**
 * @fileoverview Implementation tests for the Nutrition Controller.
 * Tests the functionality of controllers/nutrition.js.
 */

// Mock dependencies before importing the controller
const mockProcess = jest.fn();
jest.mock('../../agents/nutrition-agent', () => {
  return jest.fn().mockImplementation(() => {
    return { process: mockProcess };
  });
});
jest.mock('../../services/nutrition-service', () => ({
  createOrUpdateNutritionPlan: jest.fn(),
  getNutritionPlanByUserId: jest.fn(),
  getDietaryPreferences: jest.fn(),
  createOrUpdateDietaryPreferences: jest.fn(),
  logMeal: jest.fn(),
  getMealLogs: jest.fn(),
}));
jest.mock('../../config', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));
// Mock OpenAI and Supabase client as they are needed for agent instantiation
jest.mock('../../services/openai-service');
jest.mock('../../services/supabase', () => ({
  getSupabaseClient: jest.fn(),
}));

const nutritionController = require('../../controllers/nutrition');
const nutritionService = require('../../services/nutrition-service');
const NutritionAgent = require('../../agents/nutrition-agent');
const { ValidationError, NotFoundError } = require('../../utils/errors');
const { logger } = require('../../config');

describe('Nutrition Controller Implementation Tests', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123' },
      body: {},
      params: {},
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    mockNext = jest.fn();

    // Reset mocks before each test
    jest.clearAllMocks();
    // Reset agent mock implementation specifically if needed
    // NutritionAgent.mockClear(); // Not needed since we mock the instance method 'process'
    mockProcess.mockClear();
    Object.values(nutritionService).forEach(mockFn => mockFn.mockClear());
    Object.values(logger).forEach(mockFn => mockFn.mockClear());

  });

  // --- calculateMacros ---
  describe('calculateMacros', () => {
    beforeEach(() => {
      mockReq.body = {
        goals: ['weight_loss'],
        activityLevel: 'moderate',
      };
    });

    test('Success: Agent processes, service saves, returns 200 with saved plan', async () => {
      const agentResult = { macros: { protein: 150, carbs: 200, fat: 50 }, calories: 2000 };
      const savedPlan = { id: 'plan-1', ...agentResult, userId: 'user-123' };
      mockProcess.mockResolvedValue(agentResult);
      nutritionService.createOrUpdateNutritionPlan.mockResolvedValue(savedPlan);

      await nutritionController.calculateMacros(mockReq, mockRes, mockNext);

      expect(mockProcess).toHaveBeenCalledWith('user-123', mockReq.body.goals, mockReq.body.activityLevel);
      expect(nutritionService.createOrUpdateNutritionPlan).toHaveBeenCalledWith(agentResult);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Nutrition plan generated successfully',
        data: savedPlan,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Auth Error: Missing req.user.id, returns 400', async () => {
      mockReq.user = undefined; // Simulate missing user

      await nutritionController.calculateMacros(mockReq, mockRes, mockNext);

      expect(mockProcess).not.toHaveBeenCalled();
      expect(nutritionService.createOrUpdateNutritionPlan).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'User ID is required',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Macro calculation request missing user ID');
    });

     test('Validation Error: Missing req.body.goals, returns 400', async () => {
      delete mockReq.body.goals;

      await nutritionController.calculateMacros(mockReq, mockRes, mockNext);

      expect(mockProcess).not.toHaveBeenCalled();
      expect(nutritionService.createOrUpdateNutritionPlan).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'At least one fitness goal is required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Validation Error: Empty req.body.goals array, returns 400', async () => {
      mockReq.body.goals = [];

      await nutritionController.calculateMacros(mockReq, mockRes, mockNext);

      expect(mockProcess).not.toHaveBeenCalled();
       expect(nutritionService.createOrUpdateNutritionPlan).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
       expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'At least one fitness goal is required',
      });
      expect(mockNext).not.toHaveBeenCalled();
     });

    test('Validation Error: Missing req.body.activityLevel, returns 400', async () => {
      delete mockReq.body.activityLevel;

      await nutritionController.calculateMacros(mockReq, mockRes, mockNext);

       expect(mockProcess).not.toHaveBeenCalled();
      expect(nutritionService.createOrUpdateNutritionPlan).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Activity level is required',
       });
       expect(mockNext).not.toHaveBeenCalled();
     });

    test('Agent Error: nutritionAgent.process throws ValidationError, returns 400', async () => {
      const validationError = new ValidationError('Agent validation failed', { field: 'input' });
      mockProcess.mockRejectedValue(validationError);

      await nutritionController.calculateMacros(mockReq, mockRes, mockNext);

      expect(mockProcess).toHaveBeenCalledWith('user-123', mockReq.body.goals, mockReq.body.activityLevel);
      expect(nutritionService.createOrUpdateNutritionPlan).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Agent validation failed',
        details: { field: 'input' },
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    test('Agent Error: nutritionAgent.process throws NotFoundError, returns 404', async () => {
      const notFoundError = new NotFoundError('Agent resource not found');
      mockProcess.mockRejectedValue(notFoundError);

      await nutritionController.calculateMacros(mockReq, mockRes, mockNext);

      expect(mockProcess).toHaveBeenCalledWith('user-123', mockReq.body.goals, mockReq.body.activityLevel);
      expect(nutritionService.createOrUpdateNutritionPlan).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Agent resource not found',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    test('Agent Error: nutritionAgent.process throws generic error, calls next', async () => {
      const genericError = new Error('Generic agent error');
      mockProcess.mockRejectedValue(genericError);

      await nutritionController.calculateMacros(mockReq, mockRes, mockNext);

      expect(mockProcess).toHaveBeenCalledWith('user-123', mockReq.body.goals, mockReq.body.activityLevel);
      expect(nutritionService.createOrUpdateNutritionPlan).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(genericError);
      expect(logger.error).toHaveBeenCalled();
    });

    test('Service Error: createOrUpdateNutritionPlan throws ValidationError, returns 400', async () => {
      const agentResult = { macros: {}, calories: 2000 };
      const validationError = new ValidationError('Service validation failed', { detail: 'bad data'});
      mockProcess.mockResolvedValue(agentResult);
      nutritionService.createOrUpdateNutritionPlan.mockRejectedValue(validationError);

      await nutritionController.calculateMacros(mockReq, mockRes, mockNext);

      expect(mockProcess).toHaveBeenCalledWith('user-123', mockReq.body.goals, mockReq.body.activityLevel);
      expect(nutritionService.createOrUpdateNutritionPlan).toHaveBeenCalledWith(agentResult);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Service validation failed',
        details: { detail: 'bad data' },
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    test('Service Error: createOrUpdateNutritionPlan throws generic error, calls next', async () => {
      const agentResult = { macros: {}, calories: 2000 };
      const genericError = new Error('Generic service error');
      mockProcess.mockResolvedValue(agentResult);
      nutritionService.createOrUpdateNutritionPlan.mockRejectedValue(genericError);

      await nutritionController.calculateMacros(mockReq, mockRes, mockNext);

      expect(mockProcess).toHaveBeenCalledWith('user-123', mockReq.body.goals, mockReq.body.activityLevel);
      expect(nutritionService.createOrUpdateNutritionPlan).toHaveBeenCalledWith(agentResult);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(genericError);
      expect(logger.error).toHaveBeenCalled();
    });

  });

  // --- getNutritionPlan ---
  describe('getNutritionPlan', () => {
    test('Success: Service returns plan, returns 200 with data', async () => {
      const planData = { id: 'plan-1', userId: 'user-123', calories: 2000 };
      nutritionService.getNutritionPlanByUserId.mockResolvedValue(planData);

      await nutritionController.getNutritionPlan(mockReq, mockRes, mockNext);

      expect(nutritionService.getNutritionPlanByUserId).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: planData });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Success (from params): req.params.userId used when req.user is missing', async () => {
      const planData = { id: 'plan-2', userId: 'user-456', calories: 2200 };
      mockReq.user = undefined;
      mockReq.params.userId = 'user-456';
      nutritionService.getNutritionPlanByUserId.mockResolvedValue(planData);

      await nutritionController.getNutritionPlan(mockReq, mockRes, mockNext);

      expect(nutritionService.getNutritionPlanByUserId).toHaveBeenCalledWith('user-456');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: planData });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Auth/Param Error: Missing both req.user.id and req.params.userId, returns 400', async () => {
      mockReq.user = undefined;
      mockReq.params.userId = undefined;

      await nutritionController.getNutritionPlan(mockReq, mockRes, mockNext);

      expect(nutritionService.getNutritionPlanByUserId).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'User ID is required' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Nutrition plan request missing user ID');
    });

    test('Service Error (NotFound): getNutritionPlanByUserId throws NotFoundError, returns 404', async () => {
      const notFoundError = new NotFoundError('Plan not found');
      nutritionService.getNutritionPlanByUserId.mockRejectedValue(notFoundError);

      await nutritionController.getNutritionPlan(mockReq, mockRes, mockNext);

      expect(nutritionService.getNutritionPlanByUserId).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Plan not found' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    test('Service Error (Generic): getNutritionPlanByUserId throws generic error, calls next', async () => {
      const genericError = new Error('Database connection failed');
      nutritionService.getNutritionPlanByUserId.mockRejectedValue(genericError);

      await nutritionController.getNutritionPlan(mockReq, mockRes, mockNext);

      expect(nutritionService.getNutritionPlanByUserId).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(genericError);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // --- getDietaryPreferences ---
  describe('getDietaryPreferences', () => {
    test('Success: Service returns preferences, returns 200 with data', async () => {
      const preferencesData = { userId: 'user-123', restrictions: ['gluten'], preferences: {} };
      nutritionService.getDietaryPreferences.mockResolvedValue(preferencesData);

      await nutritionController.getDietaryPreferences(mockReq, mockRes, mockNext);

      expect(nutritionService.getDietaryPreferences).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: preferencesData });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Auth Error: Missing req.user.id, returns 400', async () => {
      mockReq.user = undefined;

      await nutritionController.getDietaryPreferences(mockReq, mockRes, mockNext);

      expect(nutritionService.getDietaryPreferences).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'User ID is required' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Dietary preferences request missing user ID');
    });

    test('Service Error (NotFound): getDietaryPreferences throws NotFoundError, returns 404', async () => {
      const notFoundError = new NotFoundError('Preferences not found');
      nutritionService.getDietaryPreferences.mockRejectedValue(notFoundError);

      await nutritionController.getDietaryPreferences(mockReq, mockRes, mockNext);

      expect(nutritionService.getDietaryPreferences).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Preferences not found' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    test('Service Error (Generic): getDietaryPreferences throws generic error, calls next', async () => {
      const genericError = new Error('Service unavailable');
      nutritionService.getDietaryPreferences.mockRejectedValue(genericError);

      await nutritionController.getDietaryPreferences(mockReq, mockRes, mockNext);

      expect(nutritionService.getDietaryPreferences).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(genericError);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // --- updateDietaryPreferences ---
  describe('updateDietaryPreferences', () => {
    beforeEach(() => {
      mockReq.body = { restrictions: ['dairy'], preferences: { preferred_cuisine: 'italian' } };
    });

    test('Success: Service updates preferences, returns 200 with updated data', async () => {
      const updatedData = { userId: 'user-123', ...mockReq.body };
      nutritionService.createOrUpdateDietaryPreferences.mockResolvedValue(updatedData);

      await nutritionController.updateDietaryPreferences(mockReq, mockRes, mockNext);

      const expectedPayload = { userId: 'user-123', ...mockReq.body };
      expect(nutritionService.createOrUpdateDietaryPreferences).toHaveBeenCalledWith(expectedPayload);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Dietary preferences updated successfully',
        data: updatedData,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Auth Error: Missing req.user.id, returns 400', async () => {
      mockReq.user = undefined;

      await nutritionController.updateDietaryPreferences(mockReq, mockRes, mockNext);

      expect(nutritionService.createOrUpdateDietaryPreferences).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'User ID is required' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Dietary preferences update request missing user ID');
    });

    test('Service Error (Validation): createOrUpdateDietaryPreferences throws ValidationError, returns 400', async () => {
      const validationError = new ValidationError('Invalid preference format', { details: 'bad data' });
      nutritionService.createOrUpdateDietaryPreferences.mockRejectedValue(validationError);

      await nutritionController.updateDietaryPreferences(mockReq, mockRes, mockNext);

      const expectedPayload = { userId: 'user-123', ...mockReq.body };
      expect(nutritionService.createOrUpdateDietaryPreferences).toHaveBeenCalledWith(expectedPayload);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid preference format',
        details: { details: 'bad data' }, // Note: nested details
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    test('Service Error (Generic): createOrUpdateDietaryPreferences throws generic error, calls next', async () => {
      const genericError = new Error('Database update failed');
      nutritionService.createOrUpdateDietaryPreferences.mockRejectedValue(genericError);

      await nutritionController.updateDietaryPreferences(mockReq, mockRes, mockNext);

      const expectedPayload = { userId: 'user-123', ...mockReq.body };
      expect(nutritionService.createOrUpdateDietaryPreferences).toHaveBeenCalledWith(expectedPayload);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(genericError);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // --- logMeal ---
  describe('logMeal', () => {
    beforeEach(() => {
      mockReq.body = { mealName: 'Lunch', calories: 500, date: '2023-10-27' };
    });

    test('Success: Service logs meal, returns 201 with created log data', async () => {
      const createdLog = { id: 'log-1', userId: 'user-123', ...mockReq.body };
      nutritionService.logMeal.mockResolvedValue(createdLog);

      await nutritionController.logMeal(mockReq, mockRes, mockNext);

      const expectedPayload = { userId: 'user-123', ...mockReq.body };
      expect(nutritionService.logMeal).toHaveBeenCalledWith(expectedPayload);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Meal logged successfully',
        data: createdLog,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Auth Error: Missing req.user.id, returns 400', async () => {
      mockReq.user = undefined;

      await nutritionController.logMeal(mockReq, mockRes, mockNext);

      expect(nutritionService.logMeal).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'User ID is required' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Meal log request missing user ID');
    });

    test('Service Error (Validation): logMeal throws ValidationError, returns 400', async () => {
      const validationError = new ValidationError('Missing meal name', { field: 'mealName' });
      nutritionService.logMeal.mockRejectedValue(validationError);

      await nutritionController.logMeal(mockReq, mockRes, mockNext);

      const expectedPayload = { userId: 'user-123', ...mockReq.body };
      expect(nutritionService.logMeal).toHaveBeenCalledWith(expectedPayload);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Missing meal name',
        details: { field: 'mealName' },
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    test('Service Error (Generic): logMeal throws generic error, calls next', async () => {
      const genericError = new Error('Database insert failed');
      nutritionService.logMeal.mockRejectedValue(genericError);

      await nutritionController.logMeal(mockReq, mockRes, mockNext);

      const expectedPayload = { userId: 'user-123', ...mockReq.body };
      expect(nutritionService.logMeal).toHaveBeenCalledWith(expectedPayload);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(genericError);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // --- getMealLogs ---
  describe('getMealLogs', () => {
    test('Success: Service returns logs, returns 200 with data', async () => {
      const logsData = [{ id: 'log-1', mealName: 'Lunch' }, { id: 'log-2', mealName: 'Dinner' }];
      nutritionService.getMealLogs.mockResolvedValue(logsData);

      await nutritionController.getMealLogs(mockReq, mockRes, mockNext);

      expect(nutritionService.getMealLogs).toHaveBeenCalledWith('user-123', undefined, undefined);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: logsData });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Success (Filters): Test with startDate and endDate in req.query', async () => {
      const logsData = [{ id: 'log-3', mealName: 'Breakfast' }];
      mockReq.query = { startDate: '2023-10-20', endDate: '2023-10-25' };
      nutritionService.getMealLogs.mockResolvedValue(logsData);

      await nutritionController.getMealLogs(mockReq, mockRes, mockNext);

      expect(nutritionService.getMealLogs).toHaveBeenCalledWith('user-123', '2023-10-20', '2023-10-25');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: logsData });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Auth Error: Missing req.user.id, returns 400', async () => {
      mockReq.user = undefined;

      await nutritionController.getMealLogs(mockReq, mockRes, mockNext);

      expect(nutritionService.getMealLogs).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'User ID is required' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Meal logs request missing user ID');
    });

    test('Service Error (Validation): getMealLogs throws ValidationError, returns 400', async () => {
      const validationError = new ValidationError('Invalid date format', { field: 'startDate' });
      nutritionService.getMealLogs.mockRejectedValue(validationError);

      await nutritionController.getMealLogs(mockReq, mockRes, mockNext);

      expect(nutritionService.getMealLogs).toHaveBeenCalledWith('user-123', undefined, undefined);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid date format',
        details: { field: 'startDate' },
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    test('Service Error (Generic): getMealLogs throws generic error, calls next', async () => {
      const genericError = new Error('Query failed');
      nutritionService.getMealLogs.mockRejectedValue(genericError);

      await nutritionController.getMealLogs(mockReq, mockRes, mockNext);

      expect(nutritionService.getMealLogs).toHaveBeenCalledWith('user-123', undefined, undefined);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(genericError);
      expect(logger.error).toHaveBeenCalled();
    });
  });

}); 