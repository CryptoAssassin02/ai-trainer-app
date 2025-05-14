/**
 * @fileoverview Tests for the nutrition service
 */

const nutritionService = require('../../services/nutrition-service');
const { ValidationError, NotFoundError } = require('../../utils/errors');

// Mock the Supabase client
jest.mock('../../services/supabase', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  };
  
  return {
    getSupabaseClient: jest.fn().mockReturnValue(mockSupabase)
  };
});

// Helper to get the mocked Supabase client
const getMockedSupabase = () => require('../../services/supabase').getSupabaseClient();

describe('Nutrition Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNutritionPlanByUserId', () => {
    it('should get a nutrition plan by user ID', async () => {
      // Arrange
      const mockPlan = { 
        id: 'plan-123', 
        user_id: 'user-123',
        bmr: 1500,
        tdee: 2000,
        macros: { protein_g: 150, carbs_g: 200, fat_g: 60, calories: 1900 },
        meal_plan: { meals: [] },
        updated_at: '2023-08-15T00:00:00.000Z',
        created_at: '2023-08-15T00:00:00.000Z'
      };
      
      getMockedSupabase().select.mockImplementation(() => {
        return {
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockPlan, error: null })
        };
      });

      // Act
      const result = await nutritionService.getNutritionPlanByUserId('user-123');

      // Assert
      expect(getMockedSupabase().from).toHaveBeenCalledWith('nutrition_plans');
      expect(result).toEqual(expect.objectContaining({
        id: 'plan-123',
        userId: 'user-123',
        calculations: {
          bmr: 1500,
          tdee: 2000,
          macros: { protein_g: 150, carbs_g: 200, fat_g: 60, calories: 1900 }
        }
      }));
    });

    it('should throw NotFoundError when plan does not exist', async () => {
      // Arrange
      getMockedSupabase().select.mockImplementation(() => {
        return {
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
        };
      });

      // Act & Assert
      await expect(nutritionService.getNutritionPlanByUserId('non-existent-user'))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw InternalError on database error', async () => {
      // Arrange
      getMockedSupabase().select.mockImplementation(() => {
        return {
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
        };
      });

      // Act & Assert
      await expect(nutritionService.getNutritionPlanByUserId('user-123'))
        .rejects.toThrow('Failed to fetch nutrition plan');
    });
  });

  describe('createOrUpdateNutritionPlan', () => {
    it('should create a new nutrition plan', async () => {
      // Arrange
      const mockPlan = { 
        id: 'plan-123', 
        user_id: 'user-123',
        bmr: 1500,
        tdee: 2000,
        macros: { protein_g: 150, carbs_g: 200, fat_g: 60, calories: 1900 }
      };
      
      const planData = {
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
      
      getMockedSupabase().upsert.mockImplementation(() => {
        return {
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockPlan, error: null })
        };
      });

      // Act
      const result = await nutritionService.createOrUpdateNutritionPlan(planData);

      // Assert
      expect(getMockedSupabase().from).toHaveBeenCalledWith('nutrition_plans');
      expect(getMockedSupabase().upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          bmr: 1500,
          tdee: 2000,
          macros: expect.objectContaining({
            protein_g: 150,
            carbs_g: 200,
            fat_g: 60,
            calories: 1900
          })
        }),
        expect.any(Object)
      );
      expect(result).toEqual(expect.objectContaining({
        id: 'plan-123',
        userId: 'user-123'
      }));
    });

    it('should throw ValidationError when plan data is invalid', async () => {
      // Arrange
      const invalidPlanData = {
        userId: 'user-123',
        // Missing required fields like calculations
      };

      // Act & Assert
      await expect(nutritionService.createOrUpdateNutritionPlan(invalidPlanData))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('getDietaryPreferences', () => {
    it('should get dietary preferences for a user', async () => {
      // Arrange
      const mockPreferences = { 
        id: 'pref-123', 
        user_id: 'user-123',
        meal_frequency: 4,
        restrictions: ['dairy', 'gluten'],
        disliked_foods: ['broccoli'],
        updated_at: '2023-08-15T00:00:00.000Z',
        created_at: '2023-08-15T00:00:00.000Z'
      };
      
      getMockedSupabase().select.mockImplementation(() => {
        return {
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockPreferences, error: null })
        };
      });

      // Act
      const result = await nutritionService.getDietaryPreferences('user-123');

      // Assert
      expect(getMockedSupabase().from).toHaveBeenCalledWith('dietary_preferences');
      expect(result).toEqual(expect.objectContaining({
        id: 'pref-123',
        userId: 'user-123',
        mealFrequency: 4,
        restrictions: ['dairy', 'gluten']
      }));
    });

    it('should throw NotFoundError when preferences do not exist', async () => {
      // Arrange
      getMockedSupabase().select.mockImplementation(() => {
        return {
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
        };
      });

      // Act & Assert
      await expect(nutritionService.getDietaryPreferences('non-existent-user'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('createOrUpdateDietaryPreferences', () => {
    it('should create or update dietary preferences', async () => {
      // Arrange
      const mockPreferences = { 
        id: 'pref-123', 
        user_id: 'user-123',
        meal_frequency: 4,
        restrictions: ['dairy', 'gluten']
      };
      
      const preferencesData = {
        userId: 'user-123',
        mealFrequency: 4,
        restrictions: ['dairy', 'gluten']
      };
      
      getMockedSupabase().upsert.mockImplementation(() => {
        return {
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockPreferences, error: null })
        };
      });

      // Act
      const result = await nutritionService.createOrUpdateDietaryPreferences(preferencesData);

      // Assert
      expect(getMockedSupabase().from).toHaveBeenCalledWith('dietary_preferences');
      expect(getMockedSupabase().upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          meal_frequency: 4,
          restrictions: ['dairy', 'gluten']
        }),
        expect.any(Object)
      );
      expect(result).toEqual(expect.objectContaining({
        id: 'pref-123',
        userId: 'user-123'
      }));
    });

    it('should throw ValidationError when preferences data is invalid', async () => {
      // Arrange
      const invalidPreferencesData = {
        // Missing userId
        mealFrequency: 'not-a-number' // Invalid type
      };

      // Act & Assert
      await expect(nutritionService.createOrUpdateDietaryPreferences(invalidPreferencesData))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('logMeal', () => {
    it('should log a meal', async () => {
      // Arrange
      const mockMealLog = { 
        id: 'log-123', 
        user_id: 'user-123',
        meal_name: 'Breakfast',
        foods: [{ name: 'Eggs', portion_size: 2, units: 'large', protein_g: 12 }],
        created_at: '2023-08-15T00:00:00.000Z'
      };
      
      const mealLogData = {
        userId: 'user-123',
        mealName: 'Breakfast',
        foods: [{ name: 'Eggs', portionSize: 2, units: 'large', protein_g: 12 }],
        loggedAt: '2023-08-15T00:00:00.000Z'
      };
      
      getMockedSupabase().insert.mockImplementation(() => {
        return {
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockMealLog, error: null })
        };
      });

      // Act
      const result = await nutritionService.logMeal(mealLogData);

      // Assert
      expect(getMockedSupabase().from).toHaveBeenCalledWith('meal_logs');
      expect(getMockedSupabase().insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user-123',
        meal_name: 'Breakfast'
      }));
      expect(result).toEqual(expect.objectContaining({
        id: 'log-123',
        userId: 'user-123',
        mealName: 'Breakfast'
      }));
    });

    it('should throw ValidationError when meal log data is invalid', async () => {
      // Arrange
      const invalidMealLogData = {
        userId: 'user-123',
        // Missing required mealName
        foods: [] // Empty foods array
      };

      // Act & Assert
      await expect(nutritionService.logMeal(invalidMealLogData))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('getMealLogs', () => {
    it('should get meal logs for a user', async () => {
      // Arrange
      const mockMealLogs = [
        { 
          id: 'log-123', 
          user_id: 'user-123',
          meal_name: 'Breakfast',
          foods: [{ name: 'Eggs', portion_size: 2, units: 'large', protein_g: 12 }],
          logged_at: '2023-08-15T08:00:00.000Z',
          created_at: '2023-08-15T08:00:00.000Z'
        },
        { 
          id: 'log-124', 
          user_id: 'user-123',
          meal_name: 'Lunch',
          foods: [{ name: 'Chicken Salad', portion_size: 1, units: 'bowl', protein_g: 30 }],
          logged_at: '2023-08-15T12:00:00.000Z',
          created_at: '2023-08-15T12:00:00.000Z'
        }
      ];
      
      getMockedSupabase().select.mockImplementation(() => {
        return {
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockMealLogs, error: null })
        };
      });

      // Act
      const result = await nutritionService.getMealLogs('user-123');

      // Assert
      expect(getMockedSupabase().from).toHaveBeenCalledWith('meal_logs');
      expect(result.length).toBe(2);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'log-123',
        userId: 'user-123',
        mealName: 'Breakfast'
      }));
    });

    it('should filter logs by date range when provided', async () => {
      // Arrange
      const mockMealLogs = [{ 
        id: 'log-123', 
        user_id: 'user-123',
        meal_name: 'Breakfast',
        foods: [{ name: 'Eggs', portion_size: 2, units: 'large', protein_g: 12 }],
        logged_at: '2023-08-15T08:00:00.000Z',
        created_at: '2023-08-15T08:00:00.000Z'
      }];
      
      const mockSupabase = getMockedSupabase();
      
      // Create a simplified mock that returns the data directly
      mockSupabase.from.mockImplementation(() => {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                lte: () => ({
                  order: () => Promise.resolve({ data: mockMealLogs, error: null })
                })
              })
            })
          })
        };
      });

      // Act
      const result = await nutritionService.getMealLogs('user-123', '2023-08-01', '2023-08-31');

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('meal_logs');
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'log-123',
        userId: 'user-123',
        mealName: 'Breakfast'
      }));
    });

    it('should throw ValidationError for invalid date format', async () => {
      // Act & Assert
      await expect(nutritionService.getMealLogs('user-123', 'invalid-date'))
        .rejects.toThrow(ValidationError);
    });
  });
}); 