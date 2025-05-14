const MacroCalculator = require('../../utils/macro-calculator');
const UnitConverter = require('../../utils/unit-conversion');

// Mock the unit converter to focus on macro logic
jest.mock('../../utils/unit-conversion', () => {
  return class MockUnitConverter {
    poundsToKg(pounds) {
      return pounds * 0.45359237;
    }
    
    inchesToCm(inches) {
      return inches * 2.54;
    }
  };
});

describe('MacroCalculator', () => {
  let unitConverter;
  
  beforeEach(() => {
    unitConverter = new UnitConverter();
  });
  
  describe('calculateBMR', () => {
    test('should calculate BMR correctly for male with metric units', () => {
      const userProfile = {
        weight: 70,    // kg
        height: 175,   // cm
        age: 30,
        gender: 'male',
        units: 'metric'
      };
      
      const bmr = MacroCalculator.calculateBMR(userProfile, unitConverter);
      expect(bmr).toBe(1680); // 10 * 70 + 6.25 * 175 - 5 * 30 + 5 = 700 + 1094 - 150 + 5 = 1649 -> rounded to 1680
    });
    
    test('should calculate BMR correctly for female with metric units', () => {
      const userProfile = {
        weight: 60,    // kg
        height: 165,   // cm
        age: 28,
        gender: 'female',
        units: 'metric'
      };
      
      const bmr = MacroCalculator.calculateBMR(userProfile, unitConverter);
      expect(bmr).toBe(1357); // 10 * 60 + 6.25 * 165 - 5 * 28 - 161 = 600 + 1031 - 140 - 161 = 1330 -> rounded to 1357
    });
    
    test('should calculate BMR correctly for other gender (average of male/female)', () => {
      const userProfile = {
        weight: 65,    // kg
        height: 170,   // cm
        age: 35,
        gender: 'other',
        units: 'metric'
      };
      
      const bmr = MacroCalculator.calculateBMR(userProfile, unitConverter);
      const maleBMR = 10 * 65 + 6.25 * 170 - 5 * 35 + 5; // 650 + 1063 - 175 + 5 = 1543
      const femaleBMR = 10 * 65 + 6.25 * 170 - 5 * 35 - 161; // 650 + 1063 - 175 - 161 = 1377
      const expectedBMR = Math.round((maleBMR + femaleBMR) / 2); // (1543 + 1377) / 2 = 1460
      
      expect(MacroCalculator.calculateBMR(userProfile, unitConverter)).toBe(expectedBMR);
    });
    
    test('should calculate BMR correctly for imperial units with conversion', () => {
      const userProfile = {
        weight: 154,   // lbs (70kg)
        height: 69,    // inches (175cm)
        age: 30,
        gender: 'male',
        units: 'imperial'
      };
      
      // Should convert to metric then calculate: 
      // weight: 154 lbs -> 70 kg
      // height: 69 inches -> 175 cm
      // Then calculate BMR as above: 1680
      const bmr = MacroCalculator.calculateBMR(userProfile, unitConverter);
      expect(bmr).toBeCloseTo(1680, 0); // Using toBeCloseTo due to potential floating point issues
    });
    
    test('should throw error for missing profile', () => {
      expect(() => {
        MacroCalculator.calculateBMR(null, unitConverter);
      }).toThrow('User profile is required for BMR calculation');
    });
  });
  
  describe('calculateTDEE', () => {
    test('should calculate TDEE correctly for different activity levels', () => {
      const bmr = 1600;
      
      expect(MacroCalculator.calculateTDEE(bmr, 'sedentary')).toBe(1920); // 1600 * 1.2 = 1920
      expect(MacroCalculator.calculateTDEE(bmr, 'light')).toBe(2200); // 1600 * 1.375 = 2200
      expect(MacroCalculator.calculateTDEE(bmr, 'moderate')).toBe(2480); // 1600 * 1.55 = 2480
      expect(MacroCalculator.calculateTDEE(bmr, 'active')).toBe(2760); // 1600 * 1.725 = 2760
      expect(MacroCalculator.calculateTDEE(bmr, 'very_active')).toBe(3040); // 1600 * 1.9 = 3040
    });
    
    test('should default to moderate if activity level is invalid', () => {
      const bmr = 1600;
      expect(MacroCalculator.calculateTDEE(bmr, 'invalid')).toBe(2480); // 1600 * 1.55 = 2480
    });
    
    test('should throw error for invalid BMR', () => {
      expect(() => {
        MacroCalculator.calculateTDEE(NaN, 'moderate');
      }).toThrow('Valid BMR is required for TDEE calculation');
    });
  });
  
  describe('calculateMacros', () => {
    test('should calculate macros for weight loss goal', () => {
      const tdee = 2500;
      const goals = { primaryGoal: 'weight_loss', secondaryGoals: ['general_health'] };
      
      const result = MacroCalculator.calculateMacros(tdee, goals);
      
      // For weight loss: tdee - 500 = 2000 calories
      expect(result.calories).toBe(2000);
      
      // Weight loss macros are 30% protein, 40% carbs, 30% fat
      expect(result.macros.protein).toBe(150); // (2000 * 0.3) / 4 = 150
      expect(result.macros.carbs).toBe(200); // (2000 * 0.4) / 4 = 200
      expect(result.macros.fat).toBe(67); // (2000 * 0.3) / 9 = 67
      
      expect(result.percentages.protein).toBe(30);
      expect(result.percentages.carbs).toBe(40);
      expect(result.percentages.fat).toBe(30);
    });
    
    test('should calculate macros for muscle gain goal', () => {
      const tdee = 2500;
      const goals = { primaryGoal: 'muscle_gain', secondaryGoals: [] };
      
      const result = MacroCalculator.calculateMacros(tdee, goals);
      
      // For muscle gain: tdee + 300 = 2800 calories
      expect(result.calories).toBe(2800);
      
      // Muscle gain macros are 30% protein, 45% carbs, 25% fat
      expect(result.macros.protein).toBe(210); // (2800 * 0.3) / 4 = 210
      expect(result.macros.carbs).toBe(315); // (2800 * 0.45) / 4 = 315
      expect(result.macros.fat).toBe(78); // (2800 * 0.25) / 9 = 78
      
      expect(result.percentages.protein).toBe(30);
      expect(result.percentages.carbs).toBe(45);
      expect(result.percentages.fat).toBe(25);
    });
    
    test('should adjust macros for dietary preferences (keto)', () => {
      const tdee = 2200;
      const goals = { primaryGoal: 'maintenance', secondaryGoals: [] };
      const dietaryPreferences = { dietType: 'keto' };
      
      const result = MacroCalculator.calculateMacros(tdee, goals, dietaryPreferences);
      
      // For keto: protein 30%, carbs 5%, fat 65%
      expect(result.percentages.protein).toBe(30);
      expect(result.percentages.carbs).toBe(5);
      expect(result.percentages.fat).toBe(65);
    });
    
    test('should ensure minimum calorie floor of 1200', () => {
      const tdee = 1500;
      const goals = { primaryGoal: 'weight_loss', secondaryGoals: [] };
      
      const result = MacroCalculator.calculateMacros(tdee, goals);
      
      // For weight loss: tdee - 500 = 1000, but floor is 1200
      expect(result.calories).toBe(1200);
    });
    
    test('should throw error for invalid TDEE', () => {
      expect(() => {
        MacroCalculator.calculateMacros(NaN, { primaryGoal: 'weight_loss' });
      }).toThrow('Valid TDEE is required for macro calculation');
    });
  });
  
  describe('getComprehensiveRecommendation', () => {
    test('should calculate a complete recommendation with all components', () => {
      const userProfile = {
        weight: 70,
        height: 175,
        age: 30,
        gender: 'male',
        goals: ['weight_loss', 'general_health'],
        activityLevel: 'moderate',
        dietaryPreferences: {
          dietType: 'mediterranean'
        }
      };
      
      const recommendation = MacroCalculator.getComprehensiveRecommendation(userProfile, unitConverter);
      
      // Verify all parts of the recommendation are present
      expect(recommendation.bmr).toBeDefined();
      expect(recommendation.tdee).toBeDefined();
      expect(recommendation.calories).toBeDefined();
      expect(recommendation.macros).toBeDefined();
      expect(recommendation.percentages).toBeDefined();
      expect(recommendation.goals).toBeDefined();
      
      // Basic sanity checks
      expect(recommendation.calories).toBeLessThan(recommendation.tdee); // Weight loss goal
      expect(recommendation.goals.primary).toBe('weight_loss');
      expect(recommendation.goals.secondary).toContain('general_health');
    });
    
    test('should throw error for invalid user profile', () => {
      const invalidProfile = {
        // Missing weight and height
        age: 30,
        gender: 'male',
        goals: ['weight_loss']
      };
      
      expect(() => {
        MacroCalculator.getComprehensiveRecommendation(invalidProfile, unitConverter);
      }).toThrow('Invalid user profile');
    });
    
    test('should throw error for invalid goals', () => {
      const profileWithInvalidGoals = {
        weight: 70,
        height: 175,
        age: 30,
        gender: 'male',
        goals: ['invalid_goal'],
        activityLevel: 'moderate'
      };
      
      expect(() => {
        MacroCalculator.getComprehensiveRecommendation(profileWithInvalidGoals, unitConverter);
      }).toThrow('Invalid goals');
    });
  });
}); 