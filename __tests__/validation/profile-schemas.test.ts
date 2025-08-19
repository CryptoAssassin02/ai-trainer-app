/**
 * Unit Tests for Profile Validation Schemas
 * Phase 2.1.5 - Comprehensive validation testing with edge cases and security validation
 */

import {
  profileCreationSchema,
  profileUpdateSchema,
  preferenceUpdateSchema,
  medicalConditionsSchema,
  nameSchema,
  ageSchema,
  weightSchema,
  heightMetricSchema,
  heightImperialSchema,
  createHeightSchema,
  validateMedicalCondition,
  validateHeightFormat,
  createDynamicProfileSchema,
  VALIDATION_CONSTANTS,
} from '@/lib/validation/profile-schemas';
// z import removed as it's not used directly in tests

describe('Profile Validation Schemas', () => {
  
  describe('nameSchema', () => {
    it('should validate valid names', () => {
      const validNames = [
        'John Doe',
        'Mary Smith-Johnson',
        'José María',
        'Anne-Marie',
        "O'Connor",
        'Dr. Watson',
        'Jean-Claude Van Damme',
      ];

      validNames.forEach(name => {
        expect(() => nameSchema.parse(name)).not.toThrow();
      });
    });

    it('should reject invalid names', () => {
      const invalidNames = [
        '', // Empty
        'A', // Too short
        'John123', // Numbers
        'John@Doe', // Invalid characters
        'John<script>Doe', // XSS attempt
        'A'.repeat(101), // Too long
        '   ', // Only whitespace
      ];

      invalidNames.forEach(name => {
        expect(() => nameSchema.parse(name)).toThrow();
      });
    });

    it('should trim whitespace', () => {
      const result = nameSchema.parse('  John Doe  ');
      expect(result).toBe('John Doe');
    });

    it('should handle edge case lengths', () => {
      // Minimum valid length
      expect(() => nameSchema.parse('AB')).not.toThrow();
      
      // Maximum valid length
      const maxName = 'A'.repeat(VALIDATION_CONSTANTS.NAME_MAX_LENGTH);
      expect(() => nameSchema.parse(maxName)).not.toThrow();
      
      // One character over limit
      const tooLongName = 'A'.repeat(VALIDATION_CONSTANTS.NAME_MAX_LENGTH + 1);
      expect(() => nameSchema.parse(tooLongName)).toThrow();
    });
  });

  describe('ageSchema', () => {
    it('should validate valid ages', () => {
      const validAges = [13, 25, 50, 75, 120];
      
      validAges.forEach(age => {
        expect(() => ageSchema.parse(age)).not.toThrow();
      });
    });

    it('should reject invalid ages', () => {
      const invalidAges = [12, 121, -5, 0, 12.5, NaN, Infinity];
      
      invalidAges.forEach(age => {
        expect(() => ageSchema.parse(age)).toThrow();
      });
    });

    it('should handle boundary values', () => {
      // Minimum valid age
      expect(() => ageSchema.parse(VALIDATION_CONSTANTS.AGE_MIN)).not.toThrow();
      
      // Maximum valid age
      expect(() => ageSchema.parse(VALIDATION_CONSTANTS.AGE_MAX)).not.toThrow();
      
      // Just under minimum
      expect(() => ageSchema.parse(VALIDATION_CONSTANTS.AGE_MIN - 1)).toThrow();
      
      // Just over maximum
      expect(() => ageSchema.parse(VALIDATION_CONSTANTS.AGE_MAX + 1)).toThrow();
    });
  });

  describe('weightSchema', () => {
    it('should validate valid weights', () => {
      const validWeights = [20, 50.5, 100, 200.25, 1000];
      
      validWeights.forEach(weight => {
        expect(() => weightSchema.parse(weight)).not.toThrow();
      });
    });

    it('should reject invalid weights', () => {
      const invalidWeights = [0, -10, 1001, NaN, Infinity];
      
      invalidWeights.forEach(weight => {
        expect(() => weightSchema.parse(weight)).toThrow();
      });
    });

    it('should handle decimal precision', () => {
      expect(() => weightSchema.parse(70.123456)).not.toThrow();
      expect(() => weightSchema.parse(70.0)).not.toThrow();
    });
  });

  describe('heightMetricSchema', () => {
    it('should validate valid metric heights', () => {
      const validHeights = [50, 150, 175.5, 200, 300];
      
      validHeights.forEach(height => {
        expect(() => heightMetricSchema.parse(height)).not.toThrow();
      });
    });

    it('should reject invalid metric heights', () => {
      const invalidHeights = [0, -10, 301, 49, NaN, Infinity];
      
      invalidHeights.forEach(height => {
        expect(() => heightMetricSchema.parse(height)).toThrow();
      });
    });
  });

  describe('heightImperialSchema', () => {
    it('should validate valid imperial heights', () => {
      const validHeights = [
        { feet: 4, inches: 0 },
        { feet: 5, inches: 6 },
        { feet: 6, inches: 11 },
        { feet: 7, inches: 0 },
      ];
      
      validHeights.forEach(height => {
        expect(() => heightImperialSchema.parse(height)).not.toThrow();
      });
    });

    it('should reject invalid imperial heights', () => {
      const invalidHeights = [
        { feet: -1, inches: 0 },
        { feet: 11, inches: 0 },
        { feet: 5, inches: 12 },
        { feet: 5, inches: -1 },
        { feet: 5.5, inches: 6 },
        { feet: 5, inches: 6.5 },
      ];
      
      invalidHeights.forEach(height => {
        expect(() => heightImperialSchema.parse(height)).toThrow();
      });
    });
  });

  describe('createHeightSchema', () => {
    it('should return metric schema for metric preference', () => {
      const schema = createHeightSchema('metric');
      expect(() => schema.parse(175)).not.toThrow();
      expect(() => schema.parse({ feet: 5, inches: 6 })).toThrow();
    });

    it('should return imperial schema for imperial preference', () => {
      const schema = createHeightSchema('imperial');
      expect(() => schema.parse({ feet: 5, inches: 6 })).not.toThrow();
      expect(() => schema.parse(175)).toThrow();
    });

    it('should default to metric when no preference provided', () => {
      const schema = createHeightSchema();
      expect(() => schema.parse(175)).not.toThrow();
      expect(() => schema.parse({ feet: 5, inches: 6 })).toThrow();
    });
  });

  describe('medicalConditionsSchema', () => {
    it('should validate valid medical conditions', () => {
      const validConditions = [
        'lower back pain',
        'type 2 diabetes',
        'high blood pressure',
        'knee surgery recovery',
        'asthma, mild',
        'previous ACL injury (2019)',
        '',
        undefined,
      ];
      
      validConditions.forEach(condition => {
        expect(() => medicalConditionsSchema.parse(condition)).not.toThrow();
      });
    });

    it('should reject overly long medical conditions', () => {
      const tooLongCondition = 'A'.repeat(1001);
      expect(() => medicalConditionsSchema.parse(tooLongCondition)).toThrow();
    });

    it('should handle maximum allowed length', () => {
      const maxLengthCondition = 'A'.repeat(1000);
      expect(() => medicalConditionsSchema.parse(maxLengthCondition)).not.toThrow();
    });
  });

  describe('profileCreationSchema', () => {
    const validBaseProfile = {
      unitPreference: 'metric' as const,
      name: 'John Doe',
      age: 30,
      height: 175,
      weight: 75,
      experienceLevel: 'intermediate' as const,
      goals: ['weight_loss'],
      equipment: ['dumbbells'],
      medicalConditions: 'none',
      workoutFrequency: '3x per week',
    };

    it('should validate complete valid profile', () => {
      expect(() => profileCreationSchema.parse(validBaseProfile)).not.toThrow();
    });

    it('should require unitPreference', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { unitPreference, ...profileWithoutUnit } = validBaseProfile;
      expect(() => profileCreationSchema.parse(profileWithoutUnit)).toThrow();
    });

    it('should validate imperial height format', () => {
      const imperialProfile = {
        ...validBaseProfile,
        unitPreference: 'imperial' as const,
        height: { feet: 5, inches: 9 },
        weight: 165,
      };
      
      expect(() => profileCreationSchema.parse(imperialProfile)).not.toThrow();
    });

    it('should reject wrong height format for unit preference', () => {
      // Metric preference with imperial height
      const invalidProfile1 = {
        ...validBaseProfile,
        unitPreference: 'metric' as const,
        height: { feet: 5, inches: 9 },
      };
      
      expect(() => profileCreationSchema.parse(invalidProfile1)).toThrow();
      
      // Imperial preference with metric height
      const invalidProfile2 = {
        ...validBaseProfile,
        unitPreference: 'imperial' as const,
        height: 175,
      };
      
      expect(() => profileCreationSchema.parse(invalidProfile2)).toThrow();
    });

    it('should validate weight ranges based on unit system', () => {
      // Valid metric weight
      const metricProfile = {
        ...validBaseProfile,
        weight: 75, // kg
      };
      expect(() => profileCreationSchema.parse(metricProfile)).not.toThrow();
      
      // Valid imperial weight
      const imperialProfile = {
        ...validBaseProfile,
        unitPreference: 'imperial' as const,
        height: { feet: 5, inches: 9 },
        weight: 165, // lbs
      };
      expect(() => profileCreationSchema.parse(imperialProfile)).not.toThrow();
      
      // Invalid metric weight (too high)
      const invalidMetricProfile = {
        ...validBaseProfile,
        weight: 1001,
      };
      expect(() => profileCreationSchema.parse(invalidMetricProfile)).toThrow();
      
      // Invalid imperial weight (too low)
      const invalidImperialProfile = {
        ...validBaseProfile,
        unitPreference: 'imperial' as const,
        height: { feet: 5, inches: 9 },
        weight: 40, // Too low for imperial
      };
      expect(() => profileCreationSchema.parse(invalidImperialProfile)).toThrow();
    });

    it('should allow optional fields to be undefined', () => {
      const minimalProfile = {
        unitPreference: 'metric' as const,
      };
      
      expect(() => profileCreationSchema.parse(minimalProfile)).not.toThrow();
    });

    it('should validate gender options', () => {
      const validGenders = ['male', 'female', 'other', 'prefer_not_to_say', 'non-binary'];
      
      validGenders.forEach(gender => {
        const profile = { ...validBaseProfile, gender };
        expect(() => profileCreationSchema.parse(profile)).not.toThrow();
      });
    });

    it('should reject invalid gender options', () => {
      const invalidProfile = {
        ...validBaseProfile,
        gender: 'invalid_gender',
      };
      
      expect(() => profileCreationSchema.parse(invalidProfile)).toThrow();
    });

    it('should validate experience levels', () => {
      const validLevels = ['beginner', 'intermediate', 'advanced'];
      
      validLevels.forEach(level => {
        const profile = { ...validBaseProfile, experienceLevel: level };
        expect(() => profileCreationSchema.parse(profile)).not.toThrow();
      });
    });

    it('should validate goals array', () => {
      const validGoals = [
        [],
        ['weight_loss'],
        ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'flexibility'],
      ];
      
      validGoals.forEach(goals => {
        const profile = { ...validBaseProfile, goals };
        expect(() => profileCreationSchema.parse(profile)).not.toThrow();
      });
      
      // Too many goals
      const tooManyGoals = Array(6).fill('goal');
      const invalidProfile = { ...validBaseProfile, goals: tooManyGoals };
      expect(() => profileCreationSchema.parse(invalidProfile)).toThrow();
    });
  });

  describe('profileUpdateSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdates = [
        { name: 'Jane Doe' },
        { age: 25 },
        { weight: 65 },
        { experienceLevel: 'advanced' as const },
        { goals: ['muscle_gain'] },
        {},
      ];
      
      partialUpdates.forEach(update => {
        expect(() => profileUpdateSchema.parse(update)).not.toThrow();
      });
    });

    it('should maintain same validation rules as creation schema', () => {
      const invalidUpdates = [
        { name: 'A' }, // Too short
        { age: 12 }, // Too young
        { weight: -5 }, // Negative
        { experienceLevel: 'expert' as const }, // Invalid level
      ];
      
      invalidUpdates.forEach(update => {
        expect(() => profileUpdateSchema.parse(update)).toThrow();
      });
    });
  });

  describe('preferenceUpdateSchema', () => {
    it('should validate preference-only updates', () => {
      const validPreferences = [
        { unitPreference: 'metric' as const },
        { goals: ['weight_loss'] },
        { equipment: ['dumbbells'] },
        { experienceLevel: 'beginner' as const },
        { workoutFrequency: '5x per week' },
        {
          unitPreference: 'imperial' as const,
          goals: ['muscle_gain'],
          experienceLevel: 'advanced' as const,
        },
      ];
      
      validPreferences.forEach(prefs => {
        expect(() => preferenceUpdateSchema.parse(prefs)).not.toThrow();
      });
    });

    it('should require at least one field', () => {
      expect(() => preferenceUpdateSchema.parse({})).toThrow();
    });

    it('should reject invalid preference values', () => {
      const invalidPreferences = [
        { unitPreference: 'invalid' as const },
        { experienceLevel: 'expert' as const },
        { goals: Array(6).fill('goal') }, // Too many goals
      ];
      
      invalidPreferences.forEach(prefs => {
        expect(() => preferenceUpdateSchema.parse(prefs)).toThrow();
      });
    });
  });

  describe('createDynamicProfileSchema', () => {
    it('should create schema for different modes and unit preferences', () => {
      // Create mode with metric
      const createMetricSchema = createDynamicProfileSchema('create', 'metric');
      expect(() => createMetricSchema.parse({
        unitPreference: 'metric',
        height: 175,
      })).not.toThrow();
      
      // Update mode with imperial
      const updateImperialSchema = createDynamicProfileSchema('update', 'imperial');
      expect(() => updateImperialSchema.parse({
        height: { feet: 5, inches: 9 },
      })).not.toThrow();
    });

    it('should enforce height format based on unit preference', () => {
      const metricSchema = createDynamicProfileSchema('create', 'metric');
      
      // Valid metric height
      expect(() => metricSchema.parse({
        unitPreference: 'metric',
        height: 175,
      })).not.toThrow();
      
      // Invalid: imperial height with metric preference
      expect(() => metricSchema.parse({
        unitPreference: 'metric',
        height: { feet: 5, inches: 9 },
      })).toThrow();
    });
  });

  describe('Security Validation', () => {
    describe('XSS Prevention in Medical Conditions', () => {
      it('should allow safe medical condition text', () => {
        const safeConditions = [
          'diabetes type 2',
          'lower back pain (chronic)',
          'knee surgery - 2019',
          'high blood pressure, controlled',
        ];
        
        safeConditions.forEach(condition => {
          expect(validateMedicalCondition(condition)).toBe(true);
        });
      });

      it('should reject potentially malicious content', () => {
        const maliciousConditions = [
          '<script>alert("xss")</script>',
          'javascript:alert("xss")',
          'data:text/html,<script>alert("xss")</script>',
          'condition<iframe src="evil.com">',
          'pain & <img src="x" onerror="alert(1)">',
        ];
        
        maliciousConditions.forEach(condition => {
          expect(validateMedicalCondition(condition)).toBe(false);
        });
      });
    });

    describe('Input Sanitization', () => {
      it('should handle special characters safely', () => {
        const testInputs = [
          { input: '  John Doe  ', expected: 'John Doe' },
          { input: 'José María', expected: 'José María' },
          { input: "O'Connor-Smith", expected: "O'Connor-Smith" },
        ];
        
        testInputs.forEach(({ input, expected }) => {
          const result = nameSchema.parse(input);
          expect(result).toBe(expected);
        });
      });

      it('should reject SQL injection attempts', () => {
        const sqlInjectionAttempts = [
          "'; DROP TABLE users; --",
          "' OR '1'='1",
          'UNION SELECT * FROM users',
          "admin'/*",
        ];
        
        sqlInjectionAttempts.forEach(attempt => {
          expect(() => nameSchema.parse(attempt)).toThrow();
        });
      });
    });
  });

  describe('Edge Cases and Boundary Testing', () => {
    it('should handle Unicode characters correctly', () => {
      const unicodeNames = [
        'José María',
        'François Müller',
        '张伟',
        'محمد',
        'Иван Петров',
      ];
      
      unicodeNames.forEach(name => {
        expect(() => nameSchema.parse(name)).not.toThrow();
      });
    });

    it('should handle floating point precision edge cases', () => {
      const precisionTests = [
        { value: 70.123456789, schema: weightSchema },
        { value: 175.99999999, schema: heightMetricSchema },
        { value: 70.000000001, schema: weightSchema },
      ];
      
      precisionTests.forEach(({ value, schema }) => {
        expect(() => schema.parse(value)).not.toThrow();
      });
    });

    it('should handle type coercion correctly', () => {
      // Should reject string numbers for numeric fields
      expect(() => ageSchema.parse('30')).toThrow();
      expect(() => weightSchema.parse('70.5')).toThrow();
      expect(() => heightMetricSchema.parse('175')).toThrow();
    });
  });

  describe('Helper Functions', () => {
    describe('validateMedicalCondition', () => {
      it('should return true for valid conditions', () => {
        expect(validateMedicalCondition('diabetes')).toBe(true);
        expect(validateMedicalCondition('lower back pain')).toBe(true);
        expect(validateMedicalCondition('')).toBe(true);
      });

      it('should return false for invalid conditions', () => {
        expect(validateMedicalCondition('<script>')).toBe(false);
        expect(validateMedicalCondition('A'.repeat(1001))).toBe(false);
      });
    });

    describe('validateHeightFormat', () => {
      it('should validate metric heights correctly', () => {
        expect(validateHeightFormat(175, 'metric')).toBe(true);
        expect(validateHeightFormat({ feet: 5, inches: 9 }, 'metric')).toBe(false);
      });

      it('should validate imperial heights correctly', () => {
        expect(validateHeightFormat({ feet: 5, inches: 9 }, 'imperial')).toBe(true);
        expect(validateHeightFormat(175, 'imperial')).toBe(false);
      });
    });
  });

  describe('Validation Constants', () => {
    it('should have correct constant values', () => {
      expect(VALIDATION_CONSTANTS.NAME_MIN_LENGTH).toBe(2);
      expect(VALIDATION_CONSTANTS.NAME_MAX_LENGTH).toBe(100);
      expect(VALIDATION_CONSTANTS.AGE_MIN).toBe(13);
      expect(VALIDATION_CONSTANTS.AGE_MAX).toBe(120);
      expect(VALIDATION_CONSTANTS.WEIGHT_MIN_METRIC).toBe(20);
      expect(VALIDATION_CONSTANTS.WEIGHT_MAX_METRIC).toBe(1000);
      expect(VALIDATION_CONSTANTS.WEIGHT_MIN_IMPERIAL).toBe(44);
      expect(VALIDATION_CONSTANTS.WEIGHT_MAX_IMPERIAL).toBe(2200);
    });
  });
});
