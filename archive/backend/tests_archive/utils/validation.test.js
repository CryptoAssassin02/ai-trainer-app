/**
 * @fileoverview Tests for the ValidationUtils class
 */

const ValidationUtils = require('../../utils/validation');

// Mock logger
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

describe('ValidationUtils', () => {
    let validator;

    beforeEach(() => {
        jest.clearAllMocks();
        validator = new ValidationUtils({ logger: mockLogger });
    });

    describe('validateUserProfile', () => {
        it('should validate a complete and valid profile', () => {
            const profile = {
                age: 30,
                weight: 75,
                height: 180,
                gender: 'male',
                preferences: { units: 'metric' }
            };

            const result = validator.validateUserProfile(profile);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should validate a complete and valid imperial profile', () => {
            const profile = {
                age: 30,
                weight: 165,
                height: { feet: 5, inches: 11 },
                gender: 'male',
                preferences: { units: 'imperial' }
            };

            const result = validator.validateUserProfile(profile);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should reject null or undefined profile', () => {
            expect(validator.validateUserProfile(null).isValid).toBe(false);
            expect(validator.validateUserProfile(undefined).isValid).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledTimes(2);
        });

        it('should detect missing required fields', () => {
            const profile = {
                // Missing height and gender
                age: 30,
                weight: 75
            };

            const result = validator.validateUserProfile(profile);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBe(1);
            expect(result.errors[0]).toContain('Missing required profile fields');
            expect(result.errors[0]).toContain('height, gender');
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it('should skip required fields check if option set', () => {
            const profile = {
                // Missing height and gender
                age: 30,
                weight: 75
            };

            const result = validator.validateUserProfile(profile, { requireAllFields: false });
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should validate age constraints', () => {
            // Test invalid types
            expect(validator.validateUserProfile({
                age: 'thirty',
                weight: 75,
                height: 180,
                gender: 'male'
            }).isValid).toBe(false);

            // Test negative age
            expect(validator.validateUserProfile({
                age: -5,
                weight: 75,
                height: 180,
                gender: 'male'
            }).isValid).toBe(false);

            // Test too young
            expect(validator.validateUserProfile({
                age: 10,
                weight: 75,
                height: 180,
                gender: 'male'
            }).isValid).toBe(false);

            // Test unrealistic old age
            expect(validator.validateUserProfile({
                age: 130,
                weight: 75,
                height: 180,
                gender: 'male'
            }).isValid).toBe(false);
        });

        it('should validate weight constraints', () => {
            // Test invalid types
            expect(validator.validateUserProfile({
                age: 30,
                weight: 'heavy',
                height: 180,
                gender: 'male'
            }).isValid).toBe(false);

            // Test negative weight
            expect(validator.validateUserProfile({
                age: 30,
                weight: -5,
                height: 180,
                gender: 'male'
            }).isValid).toBe(false);

            // Test unrealistic low metric weight
            expect(validator.validateUserProfile({
                age: 30,
                weight: 10,
                height: 180,
                gender: 'male',
                preferences: { units: 'metric' }
            }).isValid).toBe(false);

            // Test unrealistic high metric weight
            expect(validator.validateUserProfile({
                age: 30,
                weight: 350,
                height: 180,
                gender: 'male',
                preferences: { units: 'metric' }
            }).isValid).toBe(false);

            // Test unrealistic low imperial weight
            expect(validator.validateUserProfile({
                age: 30,
                weight: 20,
                height: { feet: 5, inches: 11 },
                gender: 'male',
                preferences: { units: 'imperial' }
            }).isValid).toBe(false);

            // Test unrealistic high imperial weight
            expect(validator.validateUserProfile({
                age: 30,
                weight: 700,
                height: { feet: 5, inches: 11 },
                gender: 'male',
                preferences: { units: 'imperial' }
            }).isValid).toBe(false);
        });

        it('should validate metric height constraints', () => {
            // Test invalid types
            expect(validator.validateUserProfile({
                age: 30,
                weight: 75,
                height: 'tall',
                gender: 'male',
                preferences: { units: 'metric' }
            }).isValid).toBe(false);

            // Test negative height
            expect(validator.validateUserProfile({
                age: 30,
                weight: 75,
                height: -5,
                gender: 'male',
                preferences: { units: 'metric' }
            }).isValid).toBe(false);

            // Test unrealistic low metric height
            expect(validator.validateUserProfile({
                age: 30,
                weight: 75,
                height: 100,
                gender: 'male',
                preferences: { units: 'metric' }
            }).isValid).toBe(false);

            // Test unrealistic high metric height
            expect(validator.validateUserProfile({
                age: 30,
                weight: 75,
                height: 260,
                gender: 'male',
                preferences: { units: 'metric' }
            }).isValid).toBe(false);
        });

        it('should validate imperial height constraints', () => {
            // Test invalid types for numeric height
            expect(validator.validateUserProfile({
                age: 30,
                weight: 165,
                height: 'tall',
                gender: 'male',
                preferences: { units: 'imperial' }
            }).isValid).toBe(false);

            // Test invalid types for object height
            expect(validator.validateUserProfile({
                age: 30,
                weight: 165,
                height: { feet: 'five', inches: 11 },
                gender: 'male',
                preferences: { units: 'imperial' }
            }).isValid).toBe(false);

            // Test negative feet
            expect(validator.validateUserProfile({
                age: 30,
                weight: 165,
                height: { feet: -5, inches: 11 },
                gender: 'male',
                preferences: { units: 'imperial' }
            }).isValid).toBe(false);

            // Test invalid inches
            expect(validator.validateUserProfile({
                age: 30,
                weight: 165,
                height: { feet: 5, inches: 15 },
                gender: 'male',
                preferences: { units: 'imperial' }
            }).isValid).toBe(false);

            // Test unrealistic total height (too short)
            expect(validator.validateUserProfile({
                age: 30,
                weight: 165,
                height: { feet: 3, inches: 5 },
                gender: 'male',
                preferences: { units: 'imperial' }
            }).isValid).toBe(false);

            // Test unrealistic total height (too tall)
            expect(validator.validateUserProfile({
                age: 30,
                weight: 165,
                height: { feet: 8, inches: 5 },
                gender: 'male',
                preferences: { units: 'imperial' }
            }).isValid).toBe(false);
        });

        it('should validate gender values', () => {
            // Test invalid type
            expect(validator.validateUserProfile({
                age: 30,
                weight: 75,
                height: 180,
                gender: 123
            }).isValid).toBe(false);

            // Test invalid string
            expect(validator.validateUserProfile({
                age: 30,
                weight: 75,
                height: 180,
                gender: 'not-valid'
            }).isValid).toBe(false);

            // Test valid case-insensitive values
            expect(validator.validateUserProfile({
                age: 30,
                weight: 75,
                height: 180,
                gender: 'Male'
            }).isValid).toBe(true);

            expect(validator.validateUserProfile({
                age: 30,
                weight: 75,
                height: 180,
                gender: 'f'
            }).isValid).toBe(true);
        });

        it('should validate unit preferences', () => {
            // Test invalid type
            expect(validator.validateUserProfile({
                age: 30,
                weight: 75,
                height: 180,
                gender: 'male',
                preferences: { units: 123 }
            }).isValid).toBe(false);

            // Test invalid string
            expect(validator.validateUserProfile({
                age: 30,
                weight: 75,
                height: 180,
                gender: 'male',
                preferences: { units: 'not-valid' }
            }).isValid).toBe(false);

            // Test valid case-insensitive values
            expect(validator.validateUserProfile({
                age: 30,
                weight: 75,
                height: 180,
                gender: 'male',
                preferences: { units: 'Metric' }
            }).isValid).toBe(true);

            expect(validator.validateUserProfile({
                age: 30,
                weight: 75,
                height: 180,
                gender: 'male',
                preferences: { units: 'IMPERIAL' }
            }).isValid).toBe(true);
        });
    });

    describe('validateAndPrioritizeGoals', () => {
        it('should validate and normalize valid goals', () => {
            const goals = ['weight_loss', 'muscle_gain'];
            const result = validator.validateAndPrioritizeGoals(goals);
            
            expect(result.isValid).toBe(true);
            expect(result.normalizedGoals).toEqual(['weight_loss', 'muscle_gain']);
            expect(result.primaryGoal).toBe('weight_loss'); // Higher priority
            expect(result.errors.length).toBe(0);
        });

        it('should handle goal aliases', () => {
            const goals = ['lose_weight', 'build_muscle', 'health'];
            const result = validator.validateAndPrioritizeGoals(goals);
            
            expect(result.isValid).toBe(true);
            expect(result.normalizedGoals).toEqual(['weight_loss', 'muscle_gain', 'general_health']);
            expect(result.primaryGoal).toBe('weight_loss'); // Higher priority
        });

        it('should detect conflicting goals', () => {
            const goals = ['weight_loss', 'weight_gain'];
            const result = validator.validateAndPrioritizeGoals(goals);
            
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBe(1);
            expect(result.errors[0]).toContain('Conflicting goals');
            expect(result.normalizedGoals).toEqual(['weight_loss', 'weight_gain']);
            expect(result.primaryGoal).toBe('weight_loss'); // Still set despite conflict
        });

        it('should handle unknown goals', () => {
            const goals = ['weight_loss', 'unknown_goal'];
            const result = validator.validateAndPrioritizeGoals(goals);
            
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBe(1);
            expect(result.errors[0]).toContain('Unknown goal');
            expect(result.normalizedGoals).toEqual(['weight_loss']);
            expect(result.primaryGoal).toBe('weight_loss');
        });

        it('should reject non-array goals', () => {
            const result1 = validator.validateAndPrioritizeGoals('weight_loss');
            expect(result1.isValid).toBe(false);
            expect(result1.errors[0]).toContain('Goals must be a non-empty array');
            
            const result2 = validator.validateAndPrioritizeGoals(null);
            expect(result2.isValid).toBe(false);
            
            const result3 = validator.validateAndPrioritizeGoals(undefined);
            expect(result3.isValid).toBe(false);
        });

        it('should reject empty goals array', () => {
            const result = validator.validateAndPrioritizeGoals([]);
            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('At least one goal must be specified');
        });

        it('should reject non-string goal values', () => {
            const goals = ['weight_loss', 123, {}];
            const result = validator.validateAndPrioritizeGoals(goals);
            
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBe(2);
            expect(result.normalizedGoals).toEqual(['weight_loss']);
        });
    });

    describe('validateActivityLevel', () => {
        it('should validate known activity levels', () => {
            const result = validator.validateActivityLevel('moderately_active');
            
            expect(result.isValid).toBe(true);
            expect(result.normalizedLevel).toBe('moderately_active');
            expect(result.multiplier).toBe(1.55);
            expect(result.errors.length).toBe(0);
        });

        it('should handle activity level aliases', () => {
            const result = validator.validateActivityLevel('moderate');
            
            expect(result.isValid).toBe(true);
            expect(result.normalizedLevel).toBe('moderately_active');
            expect(result.multiplier).toBe(1.55);
        });

        it('should be case-insensitive', () => {
            const result = validator.validateActivityLevel('VERY_ACTIVE');
            
            expect(result.isValid).toBe(true);
            expect(result.normalizedLevel).toBe('very_active');
            expect(result.multiplier).toBe(1.725);
        });

        it('should reject unknown activity levels', () => {
            const result = validator.validateActivityLevel('super_duper_active');
            
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBe(1);
            expect(result.errors[0]).toContain('Unknown activity level');
            expect(result.normalizedLevel).toBeNull();
            expect(result.multiplier).toBeNull();
        });

        it('should reject non-string values', () => {
            expect(validator.validateActivityLevel(123).isValid).toBe(false);
            expect(validator.validateActivityLevel(null).isValid).toBe(false);
            expect(validator.validateActivityLevel(undefined).isValid).toBe(false);
            expect(validator.validateActivityLevel({}).isValid).toBe(false);
            expect(validator.validateActivityLevel('').isValid).toBe(false);
        });
    });

    describe('validateDietaryPreferences', () => {
        it('should validate valid dietary preferences', () => {
            const preferences = {
                restrictions: ['vegetarian', 'gluten_free'],
                meal_frequency: 5,
                disliked_foods: ['mushrooms', 'olives'],
                allergies: ['peanuts', 'shellfish']
            };

            const result = validator.validateDietaryPreferences(preferences);
            
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
            expect(result.normalized).toEqual(preferences);
        });

        it('should handle null/undefined preferences', () => {
            expect(validator.validateDietaryPreferences(null).isValid).toBe(true);
            expect(validator.validateDietaryPreferences(undefined).isValid).toBe(true);
        });

        it('should validate and normalize restrictions', () => {
            const preferences = {
                restrictions: ['VEGETARIAN', 'Gluten_Free', 'not-valid']
            };

            const result = validator.validateDietaryPreferences(preferences);
            
            expect(result.isValid).toBe(false); // Invalid due to 'not-valid'
            expect(result.errors.length).toBe(1);
            expect(result.errors[0]).toContain('Unknown dietary restrictions');
            expect(result.normalized.restrictions).toEqual(['vegetarian', 'gluten_free', 'not-valid']);
        });

        it('should validate meal frequency', () => {
            // Invalid meal frequency - negative
            const prefs1 = { meal_frequency: -1 };
            const result1 = validator.validateDietaryPreferences(prefs1);
            expect(result1.isValid).toBe(false);
            expect(result1.normalized.meal_frequency).toBe(3); // Default
            
            // Invalid meal frequency - too high
            const prefs2 = { meal_frequency: 15 };
            const result2 = validator.validateDietaryPreferences(prefs2);
            expect(result2.isValid).toBe(false);
            expect(result2.normalized.meal_frequency).toBe(3); // Default
            
            // Invalid meal frequency - not a number
            const prefs3 = { meal_frequency: 'five' };
            const result3 = validator.validateDietaryPreferences(prefs3);
            expect(result3.isValid).toBe(false);
            expect(result3.normalized.meal_frequency).toBe(3); // Default
            
            // Valid meal frequency
            const prefs4 = { meal_frequency: 6 };
            const result4 = validator.validateDietaryPreferences(prefs4);
            expect(result4.isValid).toBe(true);
            expect(result4.normalized.meal_frequency).toBe(6);
        });

        it('should validate and normalize disliked foods', () => {
            // Invalid type - not an array
            const prefs1 = { disliked_foods: 'mushrooms' };
            const result1 = validator.validateDietaryPreferences(prefs1);
            expect(result1.isValid).toBe(false);
            expect(result1.normalized.disliked_foods).toEqual([]);
            
            // Valid with normalization
            const prefs2 = { disliked_foods: ['Mushrooms', 'OLIVES', 123] };
            const result2 = validator.validateDietaryPreferences(prefs2);
            expect(result2.isValid).toBe(true); // Non-string items are just filtered out
            expect(result2.normalized.disliked_foods).toEqual(['mushrooms', 'olives']);
        });

        it('should validate and normalize allergies', () => {
            // Invalid type - not an array
            const prefs1 = { allergies: 'peanuts' };
            const result1 = validator.validateDietaryPreferences(prefs1);
            expect(result1.isValid).toBe(false);
            expect(result1.normalized.allergies).toEqual([]);
            
            // Valid with normalization
            const prefs2 = { allergies: ['Peanuts', 'SHELLFISH', 123] };
            const result2 = validator.validateDietaryPreferences(prefs2);
            expect(result2.isValid).toBe(true); // Non-string items are just filtered out
            expect(result2.normalized.allergies).toEqual(['peanuts', 'shellfish']);
        });
    });
}); 