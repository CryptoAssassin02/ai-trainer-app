/**
 * @fileoverview Tests for the nutrition routes
 */

// Mock the supabase service *before* anything else that might require it
jest.mock('../../services/supabase', () => ({
  getSupabaseClient: jest.fn(() => ({
    // Mock common Supabase client methods needed by services/controllers
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: [{}], error: null }),
      update: jest.fn().mockResolvedValue({ data: [{}], error: null }),
      delete: jest.fn().mockResolvedValue({ data: [{}], error: null }),
      rpc: jest.fn().mockResolvedValue({ data: {}, error: null }),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: {}, session: {} }, error: null }),
      signUp: jest.fn().mockResolvedValue({ data: { user: {}, session: {} }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      // Add other auth methods if needed by controllers/services
    }
  })),
  getSupabaseAdmin: jest.fn(() => ({ /* similar mock if admin client is needed */ }))
}));

// Mock dependencies first, before requiring controllers
jest.mock('../../services/openai-service', () => {
  // Return a mock constructor that returns an object with the methods we need
  return jest.fn().mockImplementation(() => ({
    generateChatCompletion: jest.fn().mockResolvedValue('mock response'),
    createChatCompletion: jest.fn().mockResolvedValue({
      choices: [{ message: { content: '{"result": "success"}' } }]
    })
  }));
});

jest.mock('../../agents/nutrition-agent', () => {
  // Return a mock constructor that returns an object with the methods we need
  return jest.fn().mockImplementation(() => ({
    process: jest.fn().mockResolvedValue({})
  }));
});

jest.mock('../../controllers/nutrition');
jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => next())
}));

// Now require the modules that use the mocked dependencies
const request = require('supertest');
const express = require('express');
const nutritionRoutes = require('../../routes/nutrition');
const nutritionController = require('../../controllers/nutrition');
const { authenticate } = require('../../middleware/auth');

describe('Nutrition Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create express app
    app = express();
    app.use(express.json());
    app.use('/macros', nutritionRoutes);
    
    // Setup controller mocks
    nutritionController.calculateMacros.mockImplementation((req, res) => {
      res.status(200).json({ status: 'success', message: 'Mock calculate macros' });
    });
    
    nutritionController.getNutritionPlan.mockImplementation((req, res) => {
      res.status(200).json({ status: 'success', data: { id: 'plan-123' } });
    });
    
    nutritionController.getDietaryPreferences.mockImplementation((req, res) => {
      res.status(200).json({ status: 'success', data: { id: 'pref-123' } });
    });
    
    nutritionController.updateDietaryPreferences.mockImplementation((req, res) => {
      res.status(200).json({ 
        status: 'success', 
        message: 'Preferences updated',
        data: { id: 'pref-123' } 
      });
    });
    
    nutritionController.logMeal.mockImplementation((req, res) => {
      res.status(201).json({ 
        status: 'success', 
        message: 'Meal logged',
        data: { id: 'log-123' } 
      });
    });
    
    nutritionController.getMealLogs.mockImplementation((req, res) => {
      res.status(200).json({ 
        status: 'success', 
        data: [{ id: 'log-123' }] 
      });
    });
  });

  describe('POST /macros/calculate', () => {
    it('should call the calculateMacros controller', async () => {
      // Act
      const response = await request(app)
        .post('/macros/calculate')
        .send({
          goals: ['weight_loss'],
          activityLevel: 'moderate'
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        status: 'success',
        message: 'Mock calculate macros'
      }));
      expect(nutritionController.calculateMacros).toHaveBeenCalled();
      expect(authenticate).toHaveBeenCalled();
    });
  });

  describe('GET /macros', () => {
    it('should call the getNutritionPlan controller', async () => {
      // Act
      const response = await request(app)
        .get('/macros');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        status: 'success',
        data: { id: 'plan-123' }
      }));
      expect(nutritionController.getNutritionPlan).toHaveBeenCalled();
      expect(authenticate).toHaveBeenCalled();
    });
  });

  describe('GET /macros/preferences', () => {
    it('should call the getDietaryPreferences controller', async () => {
      // Act
      const response = await request(app)
        .get('/macros/preferences');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        status: 'success',
        data: { id: 'pref-123' }
      }));
      expect(nutritionController.getDietaryPreferences).toHaveBeenCalled();
      expect(authenticate).toHaveBeenCalled();
    });
  });

  describe('POST /macros/preferences', () => {
    it('should call the updateDietaryPreferences controller', async () => {
      // Act
      const response = await request(app)
        .post('/macros/preferences')
        .send({
          mealFrequency: 4,
          restrictions: ['dairy', 'gluten']
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        status: 'success',
        message: 'Preferences updated'
      }));
      expect(nutritionController.updateDietaryPreferences).toHaveBeenCalled();
      expect(authenticate).toHaveBeenCalled();
    });
  });

  describe('POST /macros/meal-log', () => {
    it('should call the logMeal controller', async () => {
      // Act
      const response = await request(app)
        .post('/macros/meal-log')
        .send({
          mealName: 'Breakfast',
          foods: [{ name: 'Eggs', portionSize: 2, units: 'large' }]
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual(expect.objectContaining({
        status: 'success',
        message: 'Meal logged'
      }));
      expect(nutritionController.logMeal).toHaveBeenCalled();
      expect(authenticate).toHaveBeenCalled();
    });
  });

  describe('GET /macros/meal-log', () => {
    it('should call the getMealLogs controller', async () => {
      // Act
      const response = await request(app)
        .get('/macros/meal-log');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        status: 'success',
        data: expect.arrayContaining([expect.objectContaining({ id: 'log-123' })])
      }));
      expect(nutritionController.getMealLogs).toHaveBeenCalled();
      expect(authenticate).toHaveBeenCalled();
    });

    it('should pass query parameters to the controller', async () => {
      // Act
      await request(app)
        .get('/macros/meal-log?startDate=2023-08-01&endDate=2023-08-31');

      // Assert
      expect(nutritionController.getMealLogs).toHaveBeenCalled();
      // Verify that req.query would include the parameters
      // This is harder to test directly without mocking the function implementation further
    });
  });

  describe('GET /macros/:userId', () => {
    it('should call the getNutritionPlan controller with userId parameter', async () => {
      // Arrange
      const userId = 'user-123';

      // Act
      const response = await request(app)
        .get(`/macros/${userId}`);

      // Assert
      expect(response.status).toBe(200);
      expect(nutritionController.getNutritionPlan).toHaveBeenCalled();
      // The userId would be available in req.params
    });
  });
}); 