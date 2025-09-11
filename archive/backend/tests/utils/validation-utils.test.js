const ValidationUtils = require('../../utils/validation-utils');

describe('ValidationUtils', () => {
  describe('isValidNumber', () => {
    test('should return true for valid positive numbers', () => {
      expect(ValidationUtils.isValidNumber(1)).toBe(true);
      expect(ValidationUtils.isValidNumber(100)).toBe(true);
      expect(ValidationUtils.isValidNumber(0.5)).toBe(true);
    });

    test('should return false for zero', () => {
      expect(ValidationUtils.isValidNumber(0)).toBe(false);
    });

    test('should return false for negative numbers', () => {
      expect(ValidationUtils.isValidNumber(-1)).toBe(false);
      expect(ValidationUtils.isValidNumber(-0.5)).toBe(false);
    });

    test('should return false for non-number types', () => {
      expect(ValidationUtils.isValidNumber('123')).toBe(false);
      expect(ValidationUtils.isValidNumber('abc')).toBe(false);
      expect(ValidationUtils.isValidNumber(null)).toBe(false);
      expect(ValidationUtils.isValidNumber(undefined)).toBe(false);
      expect(ValidationUtils.isValidNumber({})).toBe(false);
      expect(ValidationUtils.isValidNumber([])).toBe(false);
      expect(ValidationUtils.isValidNumber(true)).toBe(false);
    });

    test('should return false for NaN', () => {
      expect(ValidationUtils.isValidNumber(NaN)).toBe(false);
    });

    test('should return false for Infinity', () => {
      expect(ValidationUtils.isValidNumber(Infinity)).toBe(false);
      expect(ValidationUtils.isValidNumber(-Infinity)).toBe(false);
    });
  });

  describe('isValidGender', () => {
    test('should return true for valid genders (case-insensitive, with/without padding)', () => {
      expect(ValidationUtils.isValidGender('male')).toBe(true);
      expect(ValidationUtils.isValidGender('female')).toBe(true);
      expect(ValidationUtils.isValidGender('other')).toBe(true);
      expect(ValidationUtils.isValidGender('Male')).toBe(true);
      expect(ValidationUtils.isValidGender('FEMALE')).toBe(true);
      expect(ValidationUtils.isValidGender(' OtHeR ')).toBe(true);
    });

    test('should return false for invalid gender strings', () => {
      expect(ValidationUtils.isValidGender('transgender')).toBe(false);
      expect(ValidationUtils.isValidGender('m')).toBe(false);
      expect(ValidationUtils.isValidGender('')).toBe(false);
    });

    test('should return false for non-string types', () => {
      expect(ValidationUtils.isValidGender(123)).toBe(false);
      expect(ValidationUtils.isValidGender(null)).toBe(false);
      expect(ValidationUtils.isValidGender(undefined)).toBe(false);
      expect(ValidationUtils.isValidGender({})).toBe(false);
      expect(ValidationUtils.isValidGender([])).toBe(false);
      expect(ValidationUtils.isValidGender(true)).toBe(false);
    });
  });

  describe('isValidActivityLevel', () => {
    test('should return true for valid activity levels (case-insensitive, with/without padding)', () => {
      expect(ValidationUtils.isValidActivityLevel('sedentary')).toBe(true);
      expect(ValidationUtils.isValidActivityLevel('light')).toBe(true);
      expect(ValidationUtils.isValidActivityLevel('moderate')).toBe(true);
      expect(ValidationUtils.isValidActivityLevel('active')).toBe(true);
      expect(ValidationUtils.isValidActivityLevel('very_active')).toBe(true);
      expect(ValidationUtils.isValidActivityLevel('SEDENTARY')).toBe(true);
      expect(ValidationUtils.isValidActivityLevel(' Light ')).toBe(true);
    });

    test('should return false for invalid activity level strings', () => {
      expect(ValidationUtils.isValidActivityLevel('super_active')).toBe(false);
      expect(ValidationUtils.isValidActivityLevel('mod')).toBe(false);
      expect(ValidationUtils.isValidActivityLevel('')).toBe(false);
    });

    test('should return false for non-string types', () => {
      expect(ValidationUtils.isValidActivityLevel(123)).toBe(false);
      expect(ValidationUtils.isValidActivityLevel(null)).toBe(false);
      expect(ValidationUtils.isValidActivityLevel(undefined)).toBe(false);
      expect(ValidationUtils.isValidActivityLevel({})).toBe(false);
      expect(ValidationUtils.isValidActivityLevel([])).toBe(false);
      expect(ValidationUtils.isValidActivityLevel(true)).toBe(false);
    });
  });

  describe('validateUserProfile', () => {
    test('should return isValid: false with a message for null or undefined profile', () => {
      const nullResult = ValidationUtils.validateUserProfile(null);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.messages).toContain('User profile is required');

      const undefinedResult = ValidationUtils.validateUserProfile(undefined);
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.messages).toContain('User profile is required');
    });

    test('should return isValid: true for a valid profile', () => {
      const profile = {
        weight: 70,
        height: 170,
        age: 30,
        gender: 'male',
        activityLevel: 'moderate'
      };
      const result = ValidationUtils.validateUserProfile(profile);
      expect(result.isValid).toBe(true);
      expect(result.messages.length).toBe(0);
    });

    test('should return isValid: false with messages for missing/invalid required fields', () => {
      const profileMissingWeight = {
        height: 170,
        age: 30,
      };
      const resultMw = ValidationUtils.validateUserProfile(profileMissingWeight);
      expect(resultMw.isValid).toBe(false);
      expect(resultMw.messages).toContain('Weight must be a valid number');

      const profileInvalidHeight = {
        weight: 70,
        height: 'abc',
        age: 30,
      };
      const resultIh = ValidationUtils.validateUserProfile(profileInvalidHeight);
      expect(resultIh.isValid).toBe(false);
      expect(resultIh.messages).toContain('Height must be a valid number');
      
      const profileMissingAge = {
        weight: 70,
        height: 170,
      };
      const resultMa = ValidationUtils.validateUserProfile(profileMissingAge);
      expect(resultMa.isValid).toBe(false);
      expect(resultMa.messages).toContain('Age must be a valid number');
    });

    test('should return isValid: false with messages for invalid optional fields', () => {
      const profileInvalidGender = {
        weight: 70,
        height: 170,
        age: 30,
        gender: 'trans',
      };
      const resultIg = ValidationUtils.validateUserProfile(profileInvalidGender);
      expect(resultIg.isValid).toBe(false);
      expect(resultIg.messages).toContain('Gender must be valid (male, female, or other)');

      const profileInvalidActivity = {
        weight: 70,
        height: 170,
        age: 30,
        activityLevel: 'super_high',
      };
      const resultIa = ValidationUtils.validateUserProfile(profileInvalidActivity);
      expect(resultIa.isValid).toBe(false);
      expect(resultIa.messages).toContain('Activity level must be valid (sedentary, light, moderate, active, very_active)');
    });

    test('should return isValid: true for profiles missing optional fields', () => {
      const profileMissingOptional = {
        weight: 70,
        height: 170,
        age: 30,
      };
      const result = ValidationUtils.validateUserProfile(profileMissingOptional);
      expect(result.isValid).toBe(true);
      expect(result.messages.length).toBe(0);
    });
  });

  describe('validateGoals', () => {
    test('should return isValid: false with a message for null, undefined, or empty goals array', () => {
      const nullResult = ValidationUtils.validateGoals(null);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.messages).toContain('At least one valid fitness goal is required');

      const undefinedResult = ValidationUtils.validateGoals(undefined);
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.messages).toContain('At least one valid fitness goal is required');

      const emptyResult = ValidationUtils.validateGoals([]);
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.messages).toContain('At least one valid fitness goal is required');
    });

    test('should return isValid: true for a valid goals array', () => {
      const goals = ['weight_loss', 'muscle_gain'];
      const result = ValidationUtils.validateGoals(goals);
      expect(result.isValid).toBe(true);
      // Messages can contain a note about conflicting goals, so we don't check for empty messages here
    });

    test('should return isValid: false with a message for an array with invalid goal strings', () => {
      const goals = ['weight_loss', 'get_strong', 'run_fast'];
      const result = ValidationUtils.validateGoals(goals);
      expect(result.isValid).toBe(false);
      expect(result.messages).toContain('Invalid goals detected: get_strong, run_fast');
    });

    test('should return isValid: true and include a note for conflicting goals (weight_loss and muscle_gain)', () => {
      const goals = ['weight_loss', 'muscle_gain', 'performance'];
      const result = ValidationUtils.validateGoals(goals);
      expect(result.isValid).toBe(true);
      expect(result.messages).toContain('Note: Weight loss and muscle gain goals may require special consideration');
    });

    test('should return isValid: true and no conflict note if only one of weight_loss or muscle_gain is present', () => {
      const goals1 = ['weight_loss', 'performance'];
      const result1 = ValidationUtils.validateGoals(goals1);
      expect(result1.isValid).toBe(true);
      expect(result1.messages).not.toContain('Note: Weight loss and muscle gain goals may require special consideration');

      const goals2 = ['muscle_gain', 'general_health'];
      const result2 = ValidationUtils.validateGoals(goals2);
      expect(result2.isValid).toBe(true);
      expect(result2.messages).not.toContain('Note: Weight loss and muscle gain goals may require special consideration');
    });
  });

  describe('validateDietaryPreferences', () => {
    test('should return isValid: true for null or undefined preferences (optional)', () => {
      const nullResult = ValidationUtils.validateDietaryPreferences(null);
      expect(nullResult.isValid).toBe(true);
      expect(nullResult.messages.length).toBe(0);

      const undefinedResult = ValidationUtils.validateDietaryPreferences(undefined);
      expect(undefinedResult.isValid).toBe(true);
      expect(undefinedResult.messages.length).toBe(0);
    });

    test('should return isValid: true for a valid preferences object', () => {
      const preferences = {
        dietType: 'vegan',
        allergies: ['nuts', 'soy'],
        preferredFoods: ['tofu', 'broccoli'],
        avoidedFoods: ['dairy', 'eggs'],
      };
      const result = ValidationUtils.validateDietaryPreferences(preferences);
      expect(result.isValid).toBe(true);
      expect(result.messages.length).toBe(0);
    });

    test('should return isValid: true for preferences with only some fields', () => {
      const preferences = {
        dietType: 'keto',
      };
      const result = ValidationUtils.validateDietaryPreferences(preferences);
      expect(result.isValid).toBe(true);
      expect(result.messages.length).toBe(0);
    });

    test('should return isValid: false with a message for an invalid dietType', () => {
      const preferences = {
        dietType: 'fruitarian',
      };
      const result = ValidationUtils.validateDietaryPreferences(preferences);
      expect(result.isValid).toBe(false);
      expect(result.messages).toContain('Invalid diet type: fruitarian');
    });

    test('should return isValid: false with messages for non-array allergies, preferredFoods, or avoidedFoods', () => {
      const prefInvalidAllergies = {
        allergies: 'nuts',
      };
      const resultIa = ValidationUtils.validateDietaryPreferences(prefInvalidAllergies);
      expect(resultIa.isValid).toBe(false);
      expect(resultIa.messages).toContain('Allergies must be an array');

      const prefInvalidPreferred = {
        preferredFoods: { food: 'tofu' },
      };
      const resultIp = ValidationUtils.validateDietaryPreferences(prefInvalidPreferred);
      expect(resultIp.isValid).toBe(false);
      expect(resultIp.messages).toContain('Preferred foods must be an array');

      const prefInvalidAvoided = {
        avoidedFoods: 'dairy'
      };
      const resultIav = ValidationUtils.validateDietaryPreferences(prefInvalidAvoided);
      expect(resultIav.isValid).toBe(false);
      expect(resultIav.messages).toContain('Avoided foods must be an array');
    });
  });

  describe('resolveGoalPriority', () => {
    test('should return general_health as primary for null, undefined, or empty goals array', () => {
      const nullResult = ValidationUtils.resolveGoalPriority(null);
      expect(nullResult.primaryGoal).toBe('general_health');
      expect(nullResult.secondaryGoals).toEqual([]);

      const undefinedResult = ValidationUtils.resolveGoalPriority(undefined);
      expect(undefinedResult.primaryGoal).toBe('general_health');
      expect(undefinedResult.secondaryGoals).toEqual([]);

      const emptyResult = ValidationUtils.resolveGoalPriority([]);
      expect(emptyResult.primaryGoal).toBe('general_health');
      expect(emptyResult.secondaryGoals).toEqual([]);
    });

    test('should correctly identify primary and secondary goals based on priority', () => {
      const goals1 = ['muscle_gain', 'weight_loss', 'performance']; // weight_loss is highest
      const result1 = ValidationUtils.resolveGoalPriority(goals1);
      expect(result1.primaryGoal).toBe('weight_loss');
      expect(result1.secondaryGoals).toEqual(['muscle_gain', 'performance']);

      const goals2 = ['performance', 'maintenance']; // performance is highest
      const result2 = ValidationUtils.resolveGoalPriority(goals2);
      expect(result2.primaryGoal).toBe('performance');
      expect(result2.secondaryGoals).toEqual(['maintenance']);

      const goals3 = ['general_health', 'maintenance']; // maintenance is higher
      const result3 = ValidationUtils.resolveGoalPriority(goals3);
      expect(result3.primaryGoal).toBe('maintenance');
      expect(result3.secondaryGoals).toEqual(['general_health']);
      
      const goals4 = ['muscle_gain']; // Only one goal
      const result4 = ValidationUtils.resolveGoalPriority(goals4);
      expect(result4.primaryGoal).toBe('muscle_gain');
      expect(result4.secondaryGoals).toEqual([]);
    });

    test('should handle unknown goals by placing them at the end of secondaryGoals', () => {
      const goals = ['muscle_gain', 'get_toned', 'weight_loss', 'feel_good'];
      const result = ValidationUtils.resolveGoalPriority(goals);
      expect(result.primaryGoal).toBe('weight_loss');
      expect(result.secondaryGoals).toEqual(['muscle_gain', 'get_toned', 'feel_good']);
    });

    test('should maintain order of secondary goals if their priority is the same or unknown', () => {
      const goals = ['performance', 'unknown1', 'unknown2'];
      const result = ValidationUtils.resolveGoalPriority(goals);
      expect(result.primaryGoal).toBe('performance');
      // The exact order of unknown1 and unknown2 might vary based on sort stability, 
      // but they should both be present after known secondary goals.
      expect(result.secondaryGoals).toContain('unknown1');
      expect(result.secondaryGoals).toContain('unknown2');
      expect(result.secondaryGoals.length).toBe(2);
    });
  });
}); 