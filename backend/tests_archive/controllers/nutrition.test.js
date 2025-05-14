/**
 * @fileoverview Tests for the nutrition controller
 */

// Mock dependencies BEFORE requiring the module that uses them
jest.mock('../../services/openai-service', () => {
  // Return a mock constructor that returns an object with the methods we need
  return jest.fn().mockImplementation(() => ({
    generateChatCompletion: jest.fn().mockResolvedValue('mock response'),
    createChatCompletion: jest.fn().mockResolvedValue({
      choices: [{ message: { content: '{"result": "success"}' } }]
    })
  }));
});

// Create a mock process function we can control from tests
const mockProcessFn = jest.fn();

jest.mock('../../agents/nutrition-agent', () => {
  // Return an actual function that Jest can track as a constructor
  const MockNutritionAgent = jest.fn().mockImplementation(() => {
    return {
      process: mockProcessFn
    };
  });
  
  return MockNutritionAgent;
});

jest.mock('../../services/nutrition-service');
jest.mock('../../services/supabase', () => ({
  getSupabaseClient: jest.fn()
}));
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Now require the controllers and other modules
const nutritionController = require('../../controllers/nutrition');
const nutritionService = require('../../services/nutrition-service');
const NutritionAgent = require('../../agents/nutrition-agent');
const OpenAIService = require('../../services/openai-service');
const { ValidationError, NotFoundError } = require('../../utils/errors');

describe('Nutrition Controller', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock req, res, next
    req = {
      user: { id: 'user-123' },
      body: {},
      params: {},
      query: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
    
    // Reset the mockProcessFn for each test
    mockProcessFn.mockReset();
  });

  afterEach(() => {
    // Clean up mocks
    jest.restoreAllMocks();
  });

  describe('calculateMacros', () => {
    it('should calculate macros and return nutrition plan', async () => {
      // Arrange
      req.body = {
        goals: ['weight_loss'],
        activityLevel: 'moderate'
      };
      
      const mockPlanResult = {
        userId: 'user-123',
        calculations: {
          bmr: 1500,
          tdee: 2000,
          macros: {
            protein_g: 150,
            carbs_g: 200,
            fat_g: 60,
            calories: 1900
          }
        },
        goals: ['weight_loss'],
        activityLevel: 'moderate'
      };
      
      // Mock the process method directly using our mockProcessFn
      mockProcessFn.mockResolvedValueOnce(mockPlanResult);
      
      nutritionService.createOrUpdateNutritionPlan.mockResolvedValue({
        id: 'plan-123',
        ...mockPlanResult
      });

      // Act
      await nutritionController.calculateMacros(req, res, next);

      // Assert
      expect(mockProcessFn).toHaveBeenCalledWith(
        'user-123',
        ['weight_loss'],
        'moderate'
      );
      expect(nutritionService.createOrUpdateNutritionPlan).toHaveBeenCalledWith(mockPlanResult);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Nutrition plan generated successfully'
      }));
    });

    it('should return 400 when request is missing required fields', async () => {
      // Arrange
      req.body = { 
        // Missing goals and activityLevel
      };

      // Act
      await nutritionController.calculateMacros(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error'
      }));
    });

    it('should handle ValidationError from nutrition agent', async () => {
      // Arrange
      req.body = {
        goals: ['weight_loss'],
        activityLevel: 'moderate'
      };
      
      mockProcessFn.mockRejectedValueOnce(new ValidationError('Invalid input'));

      // Act
      await nutritionController.calculateMacros(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Invalid input'
      }));
    });

    it('should handle NotFoundError from nutrition agent', async () => {
      // Arrange
      req.body = {
        goals: ['weight_loss'],
        activityLevel: 'moderate'
      };
      
      mockProcessFn.mockRejectedValueOnce(new NotFoundError('Profile not found'));

      // Act
      await nutritionController.calculateMacros(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Profile not found'
      }));
    });

    it('should pass unexpected errors to next middleware', async () => {
      // Arrange
      req.body = {
        goals: ['weight_loss'],
        activityLevel: 'moderate'
      };
      
      const unexpectedError = new Error('Unexpected error');
      mockProcessFn.mockRejectedValueOnce(unexpectedError);

      // Act
      await nutritionController.calculateMacros(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(unexpectedError);
    });
  });

  describe('getNutritionPlan', () => {
    it('should return nutrition plan for user', async () => {
      // Arrange
      const mockPlan = {
        id: 'plan-123',
        userId: 'user-123',
        calculations: {
          bmr: 1500,
          tdee: 2000,
          macros: {
            protein_g: 150,
            carbs_g: 200,
            fat_g: 60,
            calories: 1900
          }
        }
      };
      
      nutritionService.getNutritionPlanByUserId.mockResolvedValue(mockPlan);

      // Act
      await nutritionController.getNutritionPlan(req, res, next);

      // Assert
      expect(nutritionService.getNutritionPlanByUserId).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: mockPlan
      }));
    });

    it('should return plan for specified userId when provided', async () => {
      // Arrange
      req.params.userId = 'other-user-123';
      
      const mockPlan = {
        id: 'plan-123',
        userId: 'other-user-123'
      };
      
      nutritionService.getNutritionPlanByUserId.mockResolvedValue(mockPlan);

      // Act
      await nutritionController.getNutritionPlan(req, res, next);

      // Assert
      expect(nutritionService.getNutritionPlanByUserId).toHaveBeenCalledWith('other-user-123');
    });

    it('should handle NotFoundError', async () => {
      // Arrange
      nutritionService.getNutritionPlanByUserId.mockRejectedValue(
        new NotFoundError('Nutrition plan not found')
      );

      // Act
      await nutritionController.getNutritionPlan(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Nutrition plan not found'
      }));
    });
  });

  describe('getDietaryPreferences', () => {
    it('should return dietary preferences for user', async () => {
      // Arrange
      const mockPreferences = {
        id: 'pref-123',
        userId: 'user-123',
        mealFrequency: 4,
        restrictions: ['dairy', 'gluten']
      };
      
      nutritionService.getDietaryPreferences.mockResolvedValue(mockPreferences);

      // Act
      await nutritionController.getDietaryPreferences(req, res, next);

      // Assert
      expect(nutritionService.getDietaryPreferences).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: mockPreferences
      }));
    });

    it('should handle NotFoundError', async () => {
      // Arrange
      nutritionService.getDietaryPreferences.mockRejectedValue(
        new NotFoundError('Dietary preferences not found')
      );

      // Act
      await nutritionController.getDietaryPreferences(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Dietary preferences not found'
      }));
    });
  });

  describe('updateDietaryPreferences', () => {
    it('should update dietary preferences', async () => {
      // Arrange
      req.body = {
        mealFrequency: 4,
        restrictions: ['dairy', 'gluten']
      };
      
      const mockUpdatedPreferences = {
        id: 'pref-123',
        userId: 'user-123',
        mealFrequency: 4,
        restrictions: ['dairy', 'gluten']
      };
      
      nutritionService.createOrUpdateDietaryPreferences.mockResolvedValue(mockUpdatedPreferences);

      // Act
      await nutritionController.updateDietaryPreferences(req, res, next);

      // Assert
      expect(nutritionService.createOrUpdateDietaryPreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          mealFrequency: 4,
          restrictions: ['dairy', 'gluten']
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Dietary preferences updated successfully',
        data: mockUpdatedPreferences
      }));
    });

    it('should handle ValidationError', async () => {
      // Arrange
      req.body = {
        mealFrequency: 'not-a-number' // Invalid type
      };
      
      nutritionService.createOrUpdateDietaryPreferences.mockRejectedValue(
        new ValidationError('Invalid meal frequency')
      );

      // Act
      await nutritionController.updateDietaryPreferences(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Invalid meal frequency'
      }));
    });
  });

  describe('logMeal', () => {
    it('should log a meal', async () => {
      // Arrange
      req.body = {
        mealName: 'Breakfast',
        foods: [{ name: 'Eggs', portionSize: 2, units: 'large', protein_g: 12 }],
        loggedAt: '2023-08-15T08:00:00.000Z'
      };
      
      const mockMealLog = {
        id: 'log-123',
        userId: 'user-123',
        mealName: 'Breakfast',
        foods: [{ name: 'Eggs', portionSize: 2, units: 'large', protein_g: 12 }]
      };
      
      nutritionService.logMeal.mockResolvedValue(mockMealLog);

      // Act
      await nutritionController.logMeal(req, res, next);

      // Assert
      expect(nutritionService.logMeal).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          mealName: 'Breakfast',
          foods: expect.arrayContaining([
            expect.objectContaining({ name: 'Eggs' })
          ])
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Meal logged successfully',
        data: mockMealLog
      }));
    });

    it('should handle ValidationError', async () => {
      // Arrange
      req.body = {
        // Missing required fields
      };
      
      nutritionService.logMeal.mockRejectedValue(
        new ValidationError('Missing required fields')
      );

      // Act
      await nutritionController.logMeal(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Missing required fields'
      }));
    });
  });

  describe('getMealLogs', () => {
    it('should get meal logs for user', async () => {
      // Arrange
      const mockMealLogs = [
        {
          id: 'log-123',
          userId: 'user-123',
          mealName: 'Breakfast',
          foods: [{ name: 'Eggs', portionSize: 2, units: 'large', protein_g: 12 }]
        },
        {
          id: 'log-124',
          userId: 'user-123',
          mealName: 'Lunch',
          foods: [{ name: 'Chicken Salad', portionSize: 1, units: 'bowl', protein_g: 30 }]
        }
      ];
      
      nutritionService.getMealLogs.mockResolvedValue(mockMealLogs);

      // Act
      await nutritionController.getMealLogs(req, res, next);

      // Assert
      expect(nutritionService.getMealLogs).toHaveBeenCalledWith('user-123', undefined, undefined);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: mockMealLogs
      }));
    });

    it('should apply date filters when provided', async () => {
      // Arrange
      req.query = {
        startDate: '2023-08-01',
        endDate: '2023-08-31'
      };
      
      nutritionService.getMealLogs.mockResolvedValue([]);

      // Act
      await nutritionController.getMealLogs(req, res, next);

      // Assert
      expect(nutritionService.getMealLogs).toHaveBeenCalledWith(
        'user-123',
        '2023-08-01',
        '2023-08-31'
      );
    });

    it('should handle ValidationError for invalid date format', async () => {
      // Arrange
      req.query = {
        startDate: 'invalid-date'
      };
      
      nutritionService.getMealLogs.mockRejectedValue(
        new ValidationError('Invalid date format')
      );

      // Act
      await nutritionController.getMealLogs(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Invalid date format'
      }));
    });
  });
}); 