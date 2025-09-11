const ValidationUtils = require('../../utils/validation-utils');

describe('ValidationUtils', () => {
  describe('validateUserProfile', () => {
    test('should validate a complete profile correctly', () => {
      const profile = {
        weight: 70,
        height: 175,
        age: 30,
        gender: 'male'
      };
      
      const result = ValidationUtils.validateUserProfile(profile);
      expect(result.isValid).toBe(true);
      expect(result.messages).toHaveLength(0);
    });
    
    test('should invalidate a profile with missing weight', () => {
      const profile = {
        height: 175,
        age: 30,
        gender: 'male'
      };
      
      const result = ValidationUtils.validateUserProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.messages).toContain('Weight must be a valid number');
    });
    
    test('should invalidate a profile with invalid height', () => {
      const profile = {
        weight: 70,
        height: -10, // Negative height
        age: 30,
        gender: 'male'
      };
      
      const result = ValidationUtils.validateUserProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.messages).toContain('Height must be a valid number');
    });
    
    test('should invalidate a profile with invalid age', () => {
      const profile = {
        weight: 70,
        height: 175,
        age: 'thirty', // Not a number
        gender: 'male'
      };
      
      const result = ValidationUtils.validateUserProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.messages).toContain('Age must be a valid number');
    });
    
    test('should invalidate a profile with invalid gender', () => {
      const profile = {
        weight: 70,
        height: 175,
        age: 30,
        gender: 'invalid'
      };
      
      const result = ValidationUtils.validateUserProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.messages).toContain('Gender must be valid (male, female, or other)');
    });
    
    test('should handle null profile', () => {
      const result = ValidationUtils.validateUserProfile(null);
      expect(result.isValid).toBe(false);
      expect(result.messages).toContain('User profile is required');
    });
  });
  
  describe('validateGoals', () => {
    test('should validate valid goals', () => {
      const goals = ['weight_loss', 'general_health'];
      
      const result = ValidationUtils.validateGoals(goals);
      expect(result.isValid).toBe(true);
      expect(result.messages).toHaveLength(0);
    });
    
    test('should invalidate empty goals array', () => {
      const goals = [];
      
      const result = ValidationUtils.validateGoals(goals);
      expect(result.isValid).toBe(false);
      expect(result.messages).toContain('At least one valid fitness goal is required');
    });
    
    test('should invalidate non-array goals', () => {
      const goals = 'weight_loss';
      
      const result = ValidationUtils.validateGoals(goals);
      expect(result.isValid).toBe(false);
      expect(result.messages).toContain('At least one valid fitness goal is required');
    });
    
    test('should detect invalid goals', () => {
      const goals = ['weight_loss', 'invalid_goal'];
      
      const result = ValidationUtils.validateGoals(goals);
      expect(result.isValid).toBe(false);
      expect(result.messages).toContain('Invalid goals detected: invalid_goal');
    });
    
    test('should provide warning for conflicting goals', () => {
      const goals = ['weight_loss', 'muscle_gain'];
      
      const result = ValidationUtils.validateGoals(goals);
      expect(result.isValid).toBe(true); // Still valid but with warning
      expect(result.messages).toContain('Note: Weight loss and muscle gain goals may require special consideration');
    });
  });
  
  describe('validateDietaryPreferences', () => {
    test('should validate valid preferences', () => {
      const preferences = {
        dietType: 'vegan',
        allergies: ['nuts', 'shellfish'],
        preferredFoods: ['spinach', 'beans'],
        avoidedFoods: ['mushrooms']
      };
      
      const result = ValidationUtils.validateDietaryPreferences(preferences);
      expect(result.isValid).toBe(true);
      expect(result.messages).toHaveLength(0);
    });
    
    test('should detect invalid diet type', () => {
      const preferences = {
        dietType: 'invalid_diet',
        allergies: ['nuts']
      };
      
      const result = ValidationUtils.validateDietaryPreferences(preferences);
      expect(result.isValid).toBe(false);
      expect(result.messages).toContain('Invalid diet type: invalid_diet');
    });
    
    test('should detect invalid allergies type', () => {
      const preferences = {
        dietType: 'vegan',
        allergies: 'nuts' // Should be an array
      };
      
      const result = ValidationUtils.validateDietaryPreferences(preferences);
      expect(result.isValid).toBe(false);
      expect(result.messages).toContain('Allergies must be an array');
    });
    
    test('should handle null preferences', () => {
      const result = ValidationUtils.validateDietaryPreferences(null);
      expect(result.isValid).toBe(true);
      expect(result.messages).toHaveLength(0);
    });
  });
  
  describe('resolveGoalPriority', () => {
    test('should prioritize weight loss above other goals', () => {
      const goals = ['general_health', 'weight_loss', 'performance'];
      
      const result = ValidationUtils.resolveGoalPriority(goals);
      expect(result.primaryGoal).toBe('weight_loss');
      expect(result.secondaryGoals).toContain('general_health');
      expect(result.secondaryGoals).toContain('performance');
    });
    
    test('should prioritize muscle gain if no weight loss is present', () => {
      const goals = ['general_health', 'muscle_gain', 'maintenance'];
      
      const result = ValidationUtils.resolveGoalPriority(goals);
      expect(result.primaryGoal).toBe('muscle_gain');
      expect(result.secondaryGoals).toContain('general_health');
      expect(result.secondaryGoals).toContain('maintenance');
    });
    
    test('should default to general_health for empty goals', () => {
      const result = ValidationUtils.resolveGoalPriority([]);
      expect(result.primaryGoal).toBe('general_health');
      expect(result.secondaryGoals).toHaveLength(0);
    });
    
    test('should handle unknown goals', () => {
      const goals = ['unknown_goal', 'weight_loss'];
      
      const result = ValidationUtils.resolveGoalPriority(goals);
      expect(result.primaryGoal).toBe('weight_loss');
      expect(result.secondaryGoals).toContain('unknown_goal');
    });
  });
  
  describe('utility validation methods', () => {
    describe('isValidNumber', () => {
      test('should validate positive numbers', () => {
        expect(ValidationUtils.isValidNumber(10)).toBe(true);
        expect(ValidationUtils.isValidNumber(0.5)).toBe(true);
      });
      
      test('should invalidate negative numbers', () => {
        expect(ValidationUtils.isValidNumber(-10)).toBe(false);
      });
      
      test('should invalidate non-numbers', () => {
        expect(ValidationUtils.isValidNumber('10')).toBe(false);
        expect(ValidationUtils.isValidNumber(null)).toBe(false);
        expect(ValidationUtils.isValidNumber(undefined)).toBe(false);
        expect(ValidationUtils.isValidNumber(NaN)).toBe(false);
      });
    });
    
    describe('isValidGender', () => {
      test('should validate valid genders', () => {
        expect(ValidationUtils.isValidGender('male')).toBe(true);
        expect(ValidationUtils.isValidGender('female')).toBe(true);
        expect(ValidationUtils.isValidGender('other')).toBe(true);
      });
      
      test('should handle case insensitivity', () => {
        expect(ValidationUtils.isValidGender('MALE')).toBe(true);
        expect(ValidationUtils.isValidGender('Female')).toBe(true);
      });
      
      test('should handle whitespace', () => {
        expect(ValidationUtils.isValidGender(' male ')).toBe(true);
      });
      
      test('should invalidate non-string inputs', () => {
        expect(ValidationUtils.isValidGender(42)).toBe(false);
        expect(ValidationUtils.isValidGender(null)).toBe(false);
      });
      
      test('should invalidate unknown genders', () => {
        expect(ValidationUtils.isValidGender('unknown')).toBe(false);
      });
    });
    
    describe('isValidActivityLevel', () => {
      test('should validate valid activity levels', () => {
        expect(ValidationUtils.isValidActivityLevel('sedentary')).toBe(true);
        expect(ValidationUtils.isValidActivityLevel('light')).toBe(true);
        expect(ValidationUtils.isValidActivityLevel('moderate')).toBe(true);
        expect(ValidationUtils.isValidActivityLevel('active')).toBe(true);
        expect(ValidationUtils.isValidActivityLevel('very_active')).toBe(true);
      });
      
      test('should handle case insensitivity', () => {
        expect(ValidationUtils.isValidActivityLevel('SEDENTARY')).toBe(true);
        expect(ValidationUtils.isValidActivityLevel('Very_Active')).toBe(true);
      });
      
      test('should handle whitespace', () => {
        expect(ValidationUtils.isValidActivityLevel(' active ')).toBe(true);
      });
      
      test('should invalidate non-string inputs', () => {
        expect(ValidationUtils.isValidActivityLevel(42)).toBe(false);
        expect(ValidationUtils.isValidActivityLevel(null)).toBe(false);
      });
      
      test('should invalidate unknown activity levels', () => {
        expect(ValidationUtils.isValidActivityLevel('extreme')).toBe(false);
      });
    });
  });
}); 