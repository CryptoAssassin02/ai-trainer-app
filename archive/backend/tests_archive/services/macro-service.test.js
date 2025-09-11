/**
 * Macro Service Tests
 * 
 * Tests for the macro calculation and storage service.
 */

const macroService = require('../../services/macro-service');
const { BadRequestError, DatabaseError, NotFoundError } = require('../../utils/errors');

// Mock the errors module to ensure the error classes are properly defined
jest.mock('../../utils/errors', () => ({
  BadRequestError: class BadRequestError extends Error {
    constructor(message) {
      super(message);
      this.name = 'BadRequestError';
    }
  },
  DatabaseError: class DatabaseError extends Error {
    constructor(message) {
      super(message);
      this.name = 'DatabaseError';
    }
  },
  NotFoundError: class NotFoundError extends Error {
    constructor(message) {
      super(message);
      this.name = 'NotFoundError';
    }
  }
}));

// Mock modules
jest.mock('@supabase/supabase-js', () => {
  const mockData = {
    single: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis()
  };
  
  return {
    createClient: jest.fn(() => ({
      from: jest.fn((tableName) => {
        return mockData;
      })
    }))
  };
});

jest.mock('../../config/supabase', () => ({
  supabaseUrl: 'https://mock-url.supabase.co',
  supabaseKey: 'mock-key'
}));

jest.mock('../../agents', () => ({
  getNutritionAgent: jest.fn(() => ({
    calculateMacroTargets: jest.fn(async (userInfo) => ({
      calories: 2000,
      macros: {
        protein: 150,
        carbs: 200,
        fat: 70
      },
      bmr: 1500,
      tdee: 2100,
      goalType: userInfo.goal,
      calorieAdjustment: -100
    }))
  }))
}));

jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../utils/retry-utils', () => 
  jest.fn((fn) => fn())
);

describe('Macro Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('calculateMacros', () => {
    it('should calculate macros correctly using formula', async () => {
      // Arrange
      const userInfo = {
        userId: 'user123',
        weight: 75, // kg
        height: 180, // cm
        age: 30,
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'maintenance',
        useExternalApi: false
      };
      
      // Act
      const result = await macroService.calculateMacros(userInfo, false);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.calories).toBeDefined();
      expect(result.macros).toBeDefined();
      expect(result.macros.protein).toBeDefined();
      expect(result.macros.carbs).toBeDefined();
      expect(result.macros.fat).toBeDefined();
      
      // Validate calculation logic
      expect(result.bmr).toBeCloseTo(1730, 0); // Using Mifflin-St Jeor
      expect(result.tdee).toBeCloseTo(2682, 0); // BMR * 1.55 (moderate activity)
    });
    
    it('should calculate macros correctly for weight loss goal', async () => {
      // Arrange
      const userInfo = {
        userId: 'user123',
        weight: 75, // kg
        height: 180, // cm
        age: 30,
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'weight_loss',
        useExternalApi: false
      };
      
      // Act
      const result = await macroService.calculateMacros(userInfo, false);
      
      // Assert
      expect(result.calorieAdjustment).toBe(-500); // 500 cal deficit
      expect(result.calories).toBeLessThan(result.tdee);
    });
    
    it('should calculate macros correctly for muscle gain goal', async () => {
      // Arrange
      const userInfo = {
        userId: 'user123',
        weight: 75, // kg
        height: 180, // cm
        age: 30,
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'muscle_gain',
        useExternalApi: false
      };
      
      // Act
      const result = await macroService.calculateMacros(userInfo, false);
      
      // Assert
      expect(result.calorieAdjustment).toBe(300); // 300 cal surplus
      expect(result.calories).toBeGreaterThan(result.tdee);
    });
    
    it('should use the Nutrition Agent when enabled', async () => {
      // Arrange
      const userInfo = {
        userId: 'user123',
        weight: 75, // kg
        height: 180, // cm
        age: 30,
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'maintenance'
      };
      
      const { getNutritionAgent } = require('../../agents');
      
      // Act
      const result = await macroService.calculateMacros(userInfo, true);
      
      // Assert
      expect(getNutritionAgent).toHaveBeenCalled();
      expect(result.calories).toBe(2000); // Value from mocked agent
      expect(result.macros.protein).toBe(150);
      expect(result.macros.carbs).toBe(200);
      expect(result.macros.fat).toBe(70);
    });
    
    it('should handle errors gracefully', async () => {
      // Example: Simulate database error
      const mockError = new Error('Database connection failed');
    });
  });
  
  describe('storeMacros', () => {
    it('should store macros in the database', async () => {
      // Arrange
      const userId = 'user123';
      const jwtToken = 'mock-jwt-token';
      const macroData = {
        calories: 2000,
        macros: {
          protein: 150,
          carbs: 200,
          fat: 70
        },
        bmr: 1500,
        tdee: 2100,
        goalType: 'maintenance',
        calorieAdjustment: 0
      };
      
      const mockSupabase = require('@supabase/supabase-js').createClient();
      mockSupabase.from().insert().select().single.mockImplementation(() => ({
        data: { id: 'plan123' },
        error: null
      }));
      
      // Act
      const result = await macroService.storeMacros(userId, macroData, jwtToken);
      
      // Assert
      expect(result).toBe('plan123');
      expect(mockSupabase.from).toHaveBeenCalled();
    });
    
    it('should handle database errors', async () => {
      // Arrange
      const userId = 'user123';
      const jwtToken = 'mock-jwt-token';
      const macroData = {
        calories: 2000,
        macros: {
          protein: 150,
          carbs: 200,
          fat: 70
        }
      };
      
      const mockSupabase = require('@supabase/supabase-js').createClient();
      mockSupabase.from().insert().select().single.mockImplementation(() => ({
        data: null,
        error: { message: 'Database error' }
      }));
      
      // Act & Assert
      await expect(macroService.storeMacros(userId, macroData, jwtToken)).rejects.toThrow(DatabaseError);
    });
  });
  
  describe('retrieveMacros', () => {
    it('should retrieve macro plans with pagination', async () => {
      // Arrange
      const userId = 'user123';
      const jwtToken = 'mock-jwt-token';
      const filters = {
        page: 1,
        pageSize: 10
      };
      
      const mockSupabase = require('@supabase/supabase-js').createClient();
      mockSupabase.from().select().eq().order().range.mockImplementation(() => ({
        data: [
          { id: 'plan1', created_at: '2023-01-01', calories: 2000 },
          { id: 'plan2', created_at: '2023-01-02', calories: 2100 }
        ],
        error: null,
        count: 2
      }));
      
      // Act
      const result = await macroService.retrieveMacros(userId, filters, jwtToken);
      
      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(2);
      expect(mockSupabase.from).toHaveBeenCalled();
    });
    
    it('should handle database errors', async () => {
      // Arrange
      const userId = 'user123';
      const jwtToken = 'mock-jwt-token';
      
      const mockSupabase = require('@supabase/supabase-js').createClient();
      mockSupabase.from().select().eq().order().range.mockImplementation(() => ({
        data: null,
        error: { message: 'Database error' }
      }));
      
      // Act & Assert
      await expect(macroService.retrieveMacros(userId, {}, jwtToken)).rejects.toThrow(DatabaseError);
    });
  });
  
  describe('retrieveLatestMacros', () => {
    it('should retrieve the latest macro plan', async () => {
      // Arrange
      const userId = 'user123';
      const jwtToken = 'mock-jwt-token';
      
      const mockSupabase = require('@supabase/supabase-js').createClient();
      mockSupabase.from().select().eq().eq().order().limit().single.mockImplementation(() => ({
        data: { id: 'plan123', created_at: '2023-01-01', calories: 2000 },
        error: null
      }));
      
      // Act
      const result = await macroService.retrieveLatestMacros(userId, jwtToken);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('plan123');
      expect(mockSupabase.from).toHaveBeenCalled();
    });
    
    it('should throw NotFoundError when no plans exist', async () => {
      // Arrange
      const userId = 'user123';
      const jwtToken = 'mock-jwt-token';
      
      const mockSupabase = require('@supabase/supabase-js').createClient();
      mockSupabase.from().select().eq().eq().order().limit().single.mockImplementation(() => ({
        data: null,
        error: { message: 'No rows found', code: 'PGRST116' }
      }));
      
      // Act & Assert
      await expect(macroService.retrieveLatestMacros(userId, jwtToken)).rejects.toThrow(NotFoundError);
    });
  });
}); 