/**
 * @fileoverview Integration tests for NutritionAgent meal plan and food suggestion generation
 */

const NutritionAgent = require('../../agents/nutrition-agent');
const { ValidationError, NotFoundError } = require('../../utils/errors');

// Mock dependencies
jest.mock('../../services/supabase', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
  };
  
  return {
    getSupabaseClient: jest.fn().mockReturnValue(mockSupabase)
  };
});

// Mock the OpenAI client
const mockOpenAIResponse = {
  choices: [{ 
    message: { 
      content: JSON.stringify({
        mealPlan: {
          meals: [
            {
              name: "Breakfast",
              target_macros: { protein_g: 30, carbs_g: 40, fat_g: 15 },
              example: "Oatmeal with protein powder and berries"
            },
            {
              name: "Lunch",
              target_macros: { protein_g: 40, carbs_g: 45, fat_g: 15 },
              example: "Grilled chicken salad with mixed greens"
            }
          ],
          snacks: [
            {
              name: "Afternoon Snack",
              target_macros: { protein_g: 20, carbs_g: 15, fat_g: 10 },
              example: "Greek yogurt with almonds"
            }
          ]
        }
      }) 
    } 
  }]
};

const mockFoodSuggestionsResponse = {
  choices: [{ 
    message: { 
      content: JSON.stringify({
        foodSuggestions: {
          protein: ["Chicken Breast", "Greek Yogurt", "Tofu"],
          carbs: ["Brown Rice", "Sweet Potatoes", "Quinoa"],
          fat: ["Avocado", "Olive Oil", "Almonds"]
        }
      }) 
    } 
  }]
};

const mockExplanationResponse = {
  choices: [{ 
    message: { 
      content: JSON.stringify({
        explanations: {
          rationale: "Your target of 2000 calories is based on your calculated Basal Metabolic Rate (BMR) of 1800 kcal and your moderate activity level.",
          principles: "Protein is crucial for muscle repair and growth.",
          guidelines: "Try to hit your calorie and macro targets daily.",
          references: ["Mifflin-St Jeor BMR estimation used."]
        }
      }) 
    } 
  }]
};

jest.mock('../../services/openai-service', () => ({
  getClient: jest.fn().mockReturnValue({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  })
}));

const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('NutritionAgent Integration Tests', () => {
  let nutritionAgent;
  let openaiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mock OpenAI client
    openaiClient = require('../../services/openai-service').getClient();
    
    // Create nutrition agent instance
    nutritionAgent = new NutritionAgent({
      openai: openaiClient,
      supabase: require('../../services/supabase').getSupabaseClient(),
      logger: mockLogger
    });
    
    // Set up the state for testing
    nutritionAgent._state = {
      userId: 'user-123',
      userProfile: {
        height: 180,
        weight: 80,
        age: 30,
        gender: 'male',
        preferences: { units: 'metric' },
        goals: ['weight_loss']
      },
      dietaryPreferences: {
        restrictions: ['dairy'],
        meal_frequency: 3
      },
      calculations: {
        bmr: 1800,
        tdee: 2500,
        macros: {
          protein_g: 150,
          carbs_g: 200,
          fat_g: 70,
          calories: 2000
        }
      },
      goals: ['weight_loss'], // Required for explanations
      activityLevel: 'moderate', // Required for explanations
      errors: [],
      validationResults: {}
    };
  });

  describe('_generateMealPlan', () => {
    it('should generate a structured meal plan based on macros and preferences', async () => {
      // Arrange
      openaiClient.chat.completions.create.mockResolvedValue(mockOpenAIResponse);
      
      // Act
      const result = await nutritionAgent._generateMealPlan(nutritionAgent._state);
      
      // Assert
      expect(openaiClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('nutrition planning AI')
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('macronutrient targets')
            })
          ])
        })
      );
      
      // Updated assertion to reflect the structure of the nutritionAgent._state after the method runs
      expect(nutritionAgent._state.mealPlan).toEqual(expect.objectContaining({
        meals: expect.arrayContaining([
          expect.objectContaining({
            name: 'Breakfast',
            target_macros: expect.objectContaining({
              protein_g: 30,
              carbs_g: 40,
              fat_g: 15
            })
          })
        ]),
        snacks: expect.arrayContaining([
          expect.objectContaining({
            name: 'Afternoon Snack'
          })
        ])
      }));
    });

    it('should throw an error when OpenAI call fails', async () => {
      // Arrange
      openaiClient.chat.completions.create.mockRejectedValue(new Error('API error'));
      
      // Act & Assert
      await expect(nutritionAgent._generateMealPlan(nutritionAgent._state))
        .rejects.toThrow('Failed to generate meal plan');
    });

    it('should throw an error when response cannot be parsed', async () => {
      // Arrange
      const invalidResponse = {
        choices: [{ message: { content: 'This is not valid JSON' } }]
      };
      
      openaiClient.chat.completions.create.mockResolvedValue(invalidResponse);
      
      // Act & Assert
      await expect(nutritionAgent._generateMealPlan(nutritionAgent._state))
        .rejects.toThrow('Failed to parse meal plan');
    });

    it('should include dietary restrictions in the prompt', async () => {
      // Arrange
      openaiClient.chat.completions.create.mockResolvedValue(mockOpenAIResponse);
      
      // Update state with dietary restrictions
      nutritionAgent._state.dietaryPreferences.restrictions = ['gluten', 'dairy'];
      
      // Act - we're not checking the result, just what parameters were passed to the OpenAI call
      await nutritionAgent._generateMealPlan(nutritionAgent._state);
      
      // Assert - only checking that the prompt includes the restrictions, not the result structure
      expect(openaiClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('gluten')
            })
          ])
        })
      );
    });
  });

  describe('_provideFoodSuggestions', () => {
    it('should generate food suggestions based on macros and preferences', async () => {
      // Arrange
      openaiClient.chat.completions.create.mockResolvedValue(mockFoodSuggestionsResponse);
      
      // Act
      const result = await nutritionAgent._provideFoodSuggestions(nutritionAgent._state);
      
      // Assert
      expect(openaiClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('nutrition planning AI')
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('macronutrient')
            })
          ])
        })
      );
      
      expect(result).toEqual(expect.objectContaining({
        foodSuggestions: expect.objectContaining({
          protein: expect.arrayContaining(['Chicken Breast', 'Greek Yogurt', 'Tofu']),
          carbs: expect.arrayContaining(['Brown Rice', 'Sweet Potatoes', 'Quinoa']),
          fat: expect.arrayContaining(['Avocado', 'Olive Oil', 'Almonds'])
        })
      }));
    });

    it('should throw an error when OpenAI call fails', async () => {
      // Arrange
      openaiClient.chat.completions.create.mockRejectedValue(new Error('API error'));
      
      // Act & Assert
      await expect(nutritionAgent._provideFoodSuggestions(nutritionAgent._state))
        .rejects.toThrow('Failed to generate food suggestions');
    });

    it('should throw an error when response cannot be parsed', async () => {
      // Arrange
      const invalidResponse = {
        choices: [{ message: { content: 'Not valid JSON' } }]
      };
      
      openaiClient.chat.completions.create.mockResolvedValue(invalidResponse);
      
      // Act & Assert
      await expect(nutritionAgent._provideFoodSuggestions(nutritionAgent._state))
        .rejects.toThrow('Failed to parse food suggestions');
    });
    
    it('should include allergies in the prompt when available', async () => {
      // Arrange
      openaiClient.chat.completions.create.mockResolvedValue(mockFoodSuggestionsResponse);
      
      // Update state with allergies
      nutritionAgent._state.dietaryPreferences.allergies = ['nuts', 'shellfish'];
      
      // Act
      await nutritionAgent._provideFoodSuggestions(nutritionAgent._state);
      
      // Assert
      expect(openaiClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('nuts')
            })
          ])
        })
      );
    });
  });

  describe('_explainRecommendations', () => {
    it('should generate explanations for nutritional recommendations', async () => {
      // Arrange
      openaiClient.chat.completions.create.mockResolvedValue(mockExplanationResponse);
      
      // Act
      const result = await nutritionAgent._explainRecommendations(nutritionAgent._state);
      
      // Assert
      expect(openaiClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('expert nutritionist')
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('client')
            })
          ])
        })
      );
      
      expect(result).toEqual(expect.objectContaining({
        explanations: expect.objectContaining({
          rationale: expect.stringContaining("Your target of 2000 calories"),
          principles: expect.stringContaining("Protein is crucial"),
          guidelines: expect.stringContaining("Try to hit your calorie and macro targets"),
          references: expect.arrayContaining(["Mifflin-St Jeor BMR estimation used."])
        })
      }));
    });
  });

  describe('process (integration)', () => {
    it('should orchestrate the complete nutrition planning process', async () => {
      // This would be a more comprehensive test that we might implement in a separate file
      // For now, we will just verify that the process method calls the expected sub-methods
      
      // Arrange
      nutritionAgent._fetchUserData = jest.fn().mockResolvedValue(nutritionAgent._state);
      nutritionAgent._validateGoals = jest.fn().mockResolvedValue(nutritionAgent._state);
      nutritionAgent._validateActivityLevel = jest.fn().mockResolvedValue(nutritionAgent._state);
      nutritionAgent._calculateBMR = jest.fn().mockResolvedValue(nutritionAgent._state);
      nutritionAgent._calculateTDEE = jest.fn().mockResolvedValue(nutritionAgent._state);
      nutritionAgent._calculateMacros = jest.fn().mockResolvedValue(nutritionAgent._state);
      nutritionAgent._generateMealPlan = jest.fn().mockResolvedValue(nutritionAgent._state);
      nutritionAgent._provideFoodSuggestions = jest.fn().mockResolvedValue(nutritionAgent._state);
      nutritionAgent._explainRecommendations = jest.fn().mockResolvedValue(nutritionAgent._state);
      nutritionAgent._storeNutritionPlan = jest.fn().mockResolvedValue({id: 'plan-id'});
      nutritionAgent.storeMemory = jest.fn().mockResolvedValue({id: 'memory-id'});
      
      // Create context matching the new format
      const context = {
        userId: 'user-123',
        goals: ['weight_loss'],
        activityLevel: 'moderate'
      };
      
      // Act
      await nutritionAgent.process(context);
      
      // Assert
      expect(nutritionAgent._fetchUserData).toHaveBeenCalledWith('user-123', expect.any(Object));
      expect(nutritionAgent._validateGoals).toHaveBeenCalledWith(['weight_loss'], expect.any(Object));
      expect(nutritionAgent._validateActivityLevel).toHaveBeenCalledWith('moderate', expect.any(Object));
      expect(nutritionAgent._calculateBMR).toHaveBeenCalled();
      expect(nutritionAgent._calculateTDEE).toHaveBeenCalled();
      expect(nutritionAgent._calculateMacros).toHaveBeenCalled();
      expect(nutritionAgent._generateMealPlan).toHaveBeenCalled();
      expect(nutritionAgent._provideFoodSuggestions).toHaveBeenCalled();
      expect(nutritionAgent._explainRecommendations).toHaveBeenCalled();
      expect(nutritionAgent.storeMemory).toHaveBeenCalledTimes(2); // Expect 2 calls to storeMemory
    });
  });
}); 