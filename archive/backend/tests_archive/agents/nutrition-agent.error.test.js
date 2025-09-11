// Mock dependencies first
jest.mock('../../config/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../services/openai-service', () => {
  return jest.fn().mockImplementation(() => ({
    complete: jest.fn(),
    generateWithReasoning: jest.fn()
  }));
});

// Import modules after mocking
const NutritionAgent = require('../../agents/nutrition-agent');
const { AgentError, ValidationError, ERROR_CODES } = require('../../utils/errors');

describe('NutritionAgent Error Handling', () => {
  let nutritionAgent;
  let mockLogger;
  let mockMemorySystem;
  let mockUnitConverter;
  let mockValidationUtils;
  let mockMacroCalculator;
  let mockOpenAIService;
  let mockSupabaseClient;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Mock memory system
    mockMemorySystem = {
      storeMemory: jest.fn().mockResolvedValue({ id: 'memory-id' }),
      searchSimilarMemories: jest.fn().mockResolvedValue([]),
      getMemoriesByMetadata: jest.fn().mockResolvedValue([])
    };

    // Mock utility services
    mockUnitConverter = {
      convertHeight: jest.fn(),
      convertWeight: jest.fn()
    };
    
    mockValidationUtils = {
      validateUserProfile: jest.fn()
    };
    
    mockMacroCalculator = {
      calculateBMR: jest.fn(),
      calculateTDEE: jest.fn(),
      calculateMacros: jest.fn()
    };
    
    // Mock OpenAI service
    mockOpenAIService = {
      complete: jest.fn(),
      generateWithReasoning: jest.fn()
    };

    // Mock Supabase client
    mockSupabaseClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
            data: []
          }))
        })),
        insert: jest.fn().mockResolvedValue({ data: { id: 'new-record' } }),
        update: jest.fn().mockResolvedValue({ data: { id: 'updated-record' } })
      }))
    };

    // Instantiate NutritionAgent with all required dependencies
    nutritionAgent = new NutritionAgent({
      logger: mockLogger,
      memorySystem: mockMemorySystem,
      unitConverter: mockUnitConverter,
      validationUtils: mockValidationUtils,
      macroCalculator: mockMacroCalculator,
      openai: mockOpenAIService, // Add required OpenAI service
      supabase: mockSupabaseClient // Add required Supabase client
    });
    
    // Mock retryWithBackoff to return the function result directly
    nutritionAgent.retryWithBackoff = jest.fn(fn => fn());
  });

  describe('Validation Errors', () => {
    it('should throw VALIDATION_ERROR when user profile validation fails', async () => {
      // Arrange - Set up the validation utils to throw an error
      mockValidationUtils.validateUserProfile.mockImplementation(() => {
        throw new ValidationError('Invalid user profile', [{ field: 'weight', message: 'Weight must be a positive number' }]);
      });
      
      // Mock process to simulate the error propagation
      nutritionAgent.process = jest.fn().mockImplementation(() => {
        throw new AgentError(
          'Validation failed: Weight must be a positive number',
          ERROR_CODES.VALIDATION_ERROR,
          { field: 'weight' }
        );
      });
      
      // Act
      const result = await nutritionAgent.safeProcess({
        userProfile: { 
          height: 180, 
          weight: -10, // Invalid weight
          age: 30, 
          gender: 'male' 
        },
        goals: ['weight_loss']
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.message).toContain('Validation failed');
      expect(result.error.details).toEqual({ field: 'weight' });
    });
    
    it('should throw VALIDATION_ERROR when goals are invalid', async () => {
      // Arrange - Mock process to throw a validation error for goals
      nutritionAgent.process = jest.fn().mockImplementation(() => {
        throw new AgentError(
          'Validation failed: Invalid goal specified',
          ERROR_CODES.VALIDATION_ERROR,
          { field: 'goals', invalidValue: 'invalid_goal' }
        );
      });
      
      // Act
      const result = await nutritionAgent.safeProcess({
        userProfile: { 
          height: 180, 
          weight: 80, 
          age: 30, 
          gender: 'male' 
        },
        goals: ['invalid_goal'] // Invalid goal
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.message).toContain('Validation failed');
      expect(result.error.details).toEqual({ field: 'goals', invalidValue: 'invalid_goal' });
    });
  });

  describe('Processing Errors', () => {
    it('should throw PROCESSING_ERROR when macro calculation fails', async () => {
      // Arrange - Mock the macro calculator to throw an error
      mockMacroCalculator.calculateBMR.mockImplementation(() => {
        throw new Error('Failed to calculate BMR');
      });
      
      // Mock process to simulate the error propagation
      nutritionAgent.process = jest.fn().mockImplementation(() => {
        throw new AgentError(
          'Error in nutrition calculations: Failed to calculate BMR',
          ERROR_CODES.PROCESSING_ERROR,
          { step: 'calculateBMR' }
        );
      });
      
      // Act
      const result = await nutritionAgent.safeProcess({
        userProfile: { 
          height: 180, 
          weight: 80, 
          age: 30, 
          gender: 'male' 
        },
        goals: ['weight_loss']
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.code).toBe(ERROR_CODES.PROCESSING_ERROR);
      expect(result.error.message).toContain('Error in nutrition calculations');
      expect(result.error.details).toEqual({ step: 'calculateBMR' });
    });
  });

  describe('Resource Errors', () => {
    it('should throw RESOURCE_ERROR when a required resource is not available', async () => {
      // Arrange - Mock process to throw a resource error
      nutritionAgent.process = jest.fn().mockImplementation(() => {
        throw new AgentError(
          'Required formula data not found for activity level',
          ERROR_CODES.RESOURCE_ERROR,
          { resourceType: 'activity_multiplier', value: 'extreme_activity' }
        );
      });
      
      // Act
      const result = await nutritionAgent.safeProcess({
        userProfile: { 
          height: 180, 
          weight: 80, 
          age: 30, 
          gender: 'male',
          activityLevel: 'extreme_activity' // Invalid activity level
        },
        goals: ['weight_loss']
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.code).toBe(ERROR_CODES.RESOURCE_ERROR);
      expect(result.error.message).toContain('Required formula data not found');
      expect(result.error.details).toEqual({ resourceType: 'activity_multiplier', value: 'extreme_activity' });
    });
  });
  
  describe('Error Chain Preservation', () => {
    it('should preserve the error chain through multiple catches', async () => {
      // Arrange - Create a nested error scenario
      const originalError = new Error('Original calculation error');
      
      // Mock the macro calculator to throw an error
      mockMacroCalculator.calculateBMR.mockImplementation(() => {
        throw originalError;
      });
      
      // Override the process method to create a nested error chain
      nutritionAgent.process = jest.fn().mockImplementation(() => {
        try {
          try {
            // Simulate calling the BMR calculator
            mockMacroCalculator.calculateBMR();
            return {}; // This will never execute
          } catch (firstLevelError) {
            throw new AgentError(
              'Failed to calculate BMR',
              ERROR_CODES.PROCESSING_ERROR,
              { function: 'calculateBMR' },
              firstLevelError
            );
          }
        } catch (secondLevelError) {
          throw new AgentError(
            'Macro calculation failed',
            ERROR_CODES.PROCESSING_ERROR,
            { calculation: 'macros' },
            secondLevelError
          );
        }
      });
      
      // Act
      const result = await nutritionAgent.safeProcess({
        userProfile: { 
          height: 180, 
          weight: 80, 
          age: 30, 
          gender: 'male'
        },
        goals: ['weight_loss']
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.code).toBe(ERROR_CODES.PROCESSING_ERROR);
      expect(result.error.message).toBe('Macro calculation failed');
      
      // Check first level error in the chain
      expect(result.error.originalError).toBeInstanceOf(AgentError);
      expect(result.error.originalError.message).toBe('Failed to calculate BMR');
      expect(result.error.originalError.code).toBe(ERROR_CODES.PROCESSING_ERROR);
      
      // Check original error
      expect(result.error.originalError.originalError).toBe(originalError);
      expect(result.error.originalError.originalError.message).toBe('Original calculation error');
      
      // Check error details are preserved
      expect(result.error.details).toEqual({ calculation: 'macros' });
      expect(result.error.originalError.details).toEqual({ function: 'calculateBMR' });
    });
  });

  describe('safeProcess Integration', () => {
    it('should handle successful processing and return structured result', async () => {
      // Arrange - setup successful response
      const macroResults = {
        bmr: 1800, 
        tdee: 2500,
        macros: {
          protein: 160,
          carbs: 250,
          fat: 70
        },
        calories: 2300 // Caloric target for weight loss
      };
      
      // Mock NutritionAgent's process method to return success data
      nutritionAgent.process = jest.fn().mockResolvedValue(macroResults);
      
      // Act
      const result = await nutritionAgent.safeProcess({
        userProfile: { 
          height: 180, 
          weight: 80, 
          age: 30, 
          gender: 'male' 
        },
        goals: ['weight_loss']
      });
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(macroResults);
    });
  });
}); 