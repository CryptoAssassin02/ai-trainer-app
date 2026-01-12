const express = require('express');
const request = require('supertest');
const nutritionRouter = require('../../routes/nutrition');
const nutritionController = require('../../controllers/nutrition');
const { authenticate } = require('../../middleware/auth');

// Mock dependencies
jest.mock('../../controllers/nutrition', () => ({
  calculateMacros: jest.fn((req, res) => res.status(200).json({ message: 'calculateMacros called' })),
  getNutritionPlan: jest.fn((req, res) => res.status(200).json({ message: 'getNutritionPlan called' })),
  getDietaryPreferences: jest.fn((req, res) => res.status(200).json({ message: 'getDietaryPreferences called' })),
  updateDietaryPreferences: jest.fn((req, res) => res.status(200).json({ message: 'updateDietaryPreferences called' })),
  logMeal: jest.fn((req, res) => res.status(200).json({ message: 'logMeal called' })),
  getMealLogs: jest.fn((req, res) => res.status(200).json({ message: 'getMealLogs called' })),
}));

jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'mockUserId', role: 'user' }; // Mock user object
    next();
  }),
}));

const app = express();
app.use(express.json());
// Mount the router with a base path that matches how it's used in the main app (e.g., /v1/nutrition)
// This is important for supertest to hit the correct routes.
// Assuming index.js mounts nutritionRoutes under /v1/nutrition
app.use('/v1/nutrition', nutritionRouter);

describe('Nutrition Routes', () => {
  beforeEach(() => {
    // Clear all mock calls before each test
    jest.clearAllMocks();
  });

  // Test Global Middleware: router.use(authenticate)
  // This will be implicitly tested by checking if `authenticate` is called for each route.
  // We can also add a specific test to ensure it's at the beginning of the stack if more complex setups arise.

  describe('POST /v1/nutrition/calculate', () => {
    it('should call authenticate and nutritionController.calculateMacros', async () => {
      const response = await request(app)
        .post('/v1/nutrition/calculate')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(nutritionController.calculateMacros).toHaveBeenCalledTimes(1);
      expect(nutritionController.calculateMacros).toHaveBeenCalledWith(
        expect.objectContaining({ body: { data: 'test' } }), // Check if req.body is passed
        expect.any(Object), // res object
        expect.any(Function)  // next function
      );
    });
  });

  describe('GET /v1/nutrition/', () => {
    it('should call authenticate and nutritionController.getNutritionPlan', async () => {
      const response = await request(app)
        .get('/v1/nutrition/')
        .send();

      expect(response.status).toBe(200);
      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(nutritionController.getNutritionPlan).toHaveBeenCalledTimes(1);
      expect(nutritionController.getNutritionPlan).toHaveBeenCalledWith(
        expect.any(Object), // req object
        expect.any(Object), // res object
        expect.any(Function)  // next function
      );
    });
  });

  describe('GET /v1/nutrition/preferences', () => {
    it('should call authenticate and nutritionController.getDietaryPreferences', async () => {
      const response = await request(app)
        .get('/v1/nutrition/preferences')
        .send();

      expect(response.status).toBe(200);
      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(nutritionController.getDietaryPreferences).toHaveBeenCalledTimes(1);
      expect(nutritionController.getDietaryPreferences).toHaveBeenCalledWith(
        expect.any(Object), // req object
        expect.any(Object), // res object
        expect.any(Function)  // next function
      );
    });
  });

  describe('POST /v1/nutrition/preferences', () => {
    it('should call authenticate and nutritionController.updateDietaryPreferences', async () => {
      const response = await request(app)
        .post('/v1/nutrition/preferences')
        .send({ pref: 'vegan' });

      expect(response.status).toBe(200);
      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(nutritionController.updateDietaryPreferences).toHaveBeenCalledTimes(1);
      expect(nutritionController.updateDietaryPreferences).toHaveBeenCalledWith(
        expect.objectContaining({ body: { pref: 'vegan' } }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('POST /v1/nutrition/meal-log', () => {
    it('should call authenticate and nutritionController.logMeal', async () => {
      const response = await request(app)
        .post('/v1/nutrition/meal-log')
        .send({ meal: 'lunch', calories: 500 });

      expect(response.status).toBe(200);
      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(nutritionController.logMeal).toHaveBeenCalledTimes(1);
      expect(nutritionController.logMeal).toHaveBeenCalledWith(
        expect.objectContaining({ body: { meal: 'lunch', calories: 500 } }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('GET /v1/nutrition/meal-log', () => {
    it('should call authenticate and nutritionController.getMealLogs', async () => {
      const response = await request(app)
        .get('/v1/nutrition/meal-log')
        .send();

      expect(response.status).toBe(200);
      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(nutritionController.getMealLogs).toHaveBeenCalledTimes(1);
      expect(nutritionController.getMealLogs).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('GET /v1/nutrition/:userId', () => {
    it('should call authenticate and nutritionController.getNutritionPlan with userId param', async () => {
      const testUserId = 'testUser123';
      const response = await request(app)
        .get(`/v1/nutrition/${testUserId}`)
        .send();

      expect(response.status).toBe(200);
      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(nutritionController.getNutritionPlan).toHaveBeenCalledTimes(1);
      expect(nutritionController.getNutritionPlan).toHaveBeenCalledWith(
        expect.objectContaining({ params: { userId: testUserId } }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  // More tests will be added here
}); 