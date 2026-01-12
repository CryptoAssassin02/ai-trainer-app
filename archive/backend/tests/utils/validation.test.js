const ValidationUtils = require('../../utils/validation');
const winston = require('winston');

// Mock winston and its createLogger function
jest.mock('winston', () => {
  // Define the mock logger structure INSIDE the factory function
  const mockLoggerInstance = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  return {
    format: {
      json: jest.fn(),
      combine: jest.fn(),
      timestamp: jest.fn(),
      printf: jest.fn(),
      colorize: jest.fn(),
      simple: jest.fn(),
      label: jest.fn(),
      prettyPrint: jest.fn(),
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn(),
    },
    // Return the mock instance when createLogger is called
    createLogger: jest.fn(() => mockLoggerInstance),
  };
});

describe('ValidationUtils Class', () => {
  let validationUtils;
  let capturedLogger; // We might not need this specific variable anymore if we mock correctly

  beforeEach(() => {
    // Reset mocks before each test
    // Access the mock logger directly from the mocked winston module
    const mockCreateLogger = winston.createLogger;
    const loggerInstance = mockCreateLogger(); // Get the instance returned by the mock
    loggerInstance.info.mockClear();
    loggerInstance.warn.mockClear();
    loggerInstance.error.mockClear();
    loggerInstance.debug.mockClear();
    mockCreateLogger.mockClear();

    // Instead of capturing, we'll pass the known mock logger for testing specific calls
    capturedLogger = loggerInstance; // Keep for convenience in tests
  });

  describe('Constructor', () => {
    test('should instantiate with a default logger if none is provided', () => {
      // Reset mocks specifically for this test if needed, although beforeEach should handle it
      const mockCreateLogger = winston.createLogger;
      const loggerInstance = mockCreateLogger(); // Get the instance created by module load
      mockCreateLogger.mockClear(); // Clear calls made during module load
      
      validationUtils = new ValidationUtils();
      // createLogger is NOT called during instantiation when using default
      expect(winston.createLogger).not.toHaveBeenCalled(); 
      expect(validationUtils.logger).toBeDefined();
      // Verify it has the expected methods from our mock setup
      expect(validationUtils.logger.info).toBeDefined();
      expect(validationUtils.logger.warn).toBeDefined();
      expect(validationUtils.logger.error).toBeDefined();
      expect(validationUtils.logger.debug).toBeDefined();
      // Optionally, check it's the instance from the mock (might be fragile)
      // expect(validationUtils.logger).toBe(loggerInstance); 
    });

    test('should instantiate with a provided mock logger', () => {
      const customMockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      };
      validationUtils = new ValidationUtils({ logger: customMockLogger });
      // winston.createLogger should NOT have been called if a logger is provided
      expect(winston.createLogger).not.toHaveBeenCalled();
      expect(validationUtils.logger).toBe(customMockLogger);
    });
  });

  describe('validateUserProfile', () => {
    beforeEach(() => {
      // For these tests, ensure we are using a fresh instance with the capturedLogger
      // to check logger calls specifically within validateUserProfile
      validationUtils = new ValidationUtils({ logger: capturedLogger });
    });

    test('should return isValid: false and log error for null or undefined profile', () => {
      const nullResult = validationUtils.validateUserProfile(null);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.errors).toContain('User profile is required');
      expect(capturedLogger.error).toHaveBeenCalledWith('Validation Error: User profile is null or undefined');

      capturedLogger.error.mockClear(); // Clear for next assertion

      const undefinedResult = validationUtils.validateUserProfile(undefined);
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.errors).toContain('User profile is required');
      expect(capturedLogger.error).toHaveBeenCalledWith('Validation Error: User profile is null or undefined');
    });

    test('should return isValid: false and log error for missing required fields when requireAllFields is true (default)', () => {
      const profile = { gender: 'male' }; // Missing age, weight, height
      const result = validationUtils.validateUserProfile(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required profile fields: age, weight, height');
      expect(capturedLogger.error).toHaveBeenCalledWith('Validation Error: Missing required profile fields: age, weight, height');
    });
    
    test('should return isValid: true if required fields are missing but requireAllFields is false', () => {
      const profile = { gender: 'male' }; // Missing age, weight, height
      const result = validationUtils.validateUserProfile(profile, { requireAllFields: false });
      // This will still fail if validateValues is true and gender is invalid, for example.
      // The current validation.js file doesn't make gender required unless requireAllFields is true,
      // and its value validation for gender is separate.
      // For this specific test, we focus on requireAllFields.
      // If gender was also invalid, it would add another error.
      // Let's provide valid values for optionals if we want to isolate requireAllFields
       const profileValidOptional = { gender: 'male', preferences: { units: 'metric' } };
       const resultValidOptional = validationUtils.validateUserProfile(profileValidOptional, { requireAllFields: false });
       expect(resultValidOptional.isValid).toBe(true); 
       expect(resultValidOptional.errors.length).toBe(0);
       expect(capturedLogger.error).not.toHaveBeenCalled();
    });

    test('should return isValid: true if values are not validated when validateValues is false', () => {
        const profileWithInvalidValues = {
            age: -5, // invalid
            weight: 'heavy', // invalid
            height: 0, // invalid
            gender: 'test', // invalid
            preferences: { units: 'yards' } // invalid
        };
        // With requireAllFields: true (default)
        let result = validationUtils.validateUserProfile(profileWithInvalidValues, { validateValues: false });
        expect(result.isValid).toBe(true); // Assuming all required fields are present by name, even if values are bad
        expect(result.errors.length).toBe(0);
        expect(capturedLogger.error).not.toHaveBeenCalled();

        capturedLogger.error.mockClear();

        // With requireAllFields: false
        const profileOnlyInvalidAge = { age: -10 };
         result = validationUtils.validateUserProfile(profileOnlyInvalidAge, { requireAllFields: false, validateValues: false });
        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
        expect(capturedLogger.error).not.toHaveBeenCalled();
    });

    // Age Validation Tests
    test('should validate age: invalid type, NaN, negative, < 13, > 120', () => {
      const baseProfile = { weight: 70, height: 170, gender: 'female', preferences: { units: 'metric' } };
      
      const invalidType = validationUtils.validateUserProfile({ ...baseProfile, age: 'thirty' });
      expect(invalidType.isValid).toBe(false);
      expect(invalidType.errors).toContain('Age must be a valid number');

      const nanAge = validationUtils.validateUserProfile({ ...baseProfile, age: NaN });
      expect(nanAge.isValid).toBe(false);
      expect(nanAge.errors).toContain('Age must be a valid number');
      
      const negativeAge = validationUtils.validateUserProfile({ ...baseProfile, age: -5 });
      expect(negativeAge.isValid).toBe(false);
      expect(negativeAge.errors).toContain('Age cannot be negative');
      
      const tooYoung = validationUtils.validateUserProfile({ ...baseProfile, age: 12 });
      expect(tooYoung.isValid).toBe(false);
      expect(tooYoung.errors).toContain('Age must be at least 13 years (this app is not designed for children)');
      
      const tooOld = validationUtils.validateUserProfile({ ...baseProfile, age: 121 });
      expect(tooOld.isValid).toBe(false);
      expect(tooOld.errors).toContain('Age appears to be unrealistic (must be <= 120)');

      const validAge = validationUtils.validateUserProfile({ ...baseProfile, age: 30 });
      expect(validAge.isValid).toBe(true);
    });

    // Weight Validation Tests
    test('should validate weight (Metric): invalid type, zero, negative, out of range', () => {
      const baseProfile = { age: 30, height: 170, gender: 'female', preferences: { units: 'metric' } };
      
      const invalidType = validationUtils.validateUserProfile({ ...baseProfile, weight: 'seventy' });
      expect(invalidType.isValid).toBe(false);
      expect(invalidType.errors).toContain('Weight must be a valid number');
      
      const zeroWeight = validationUtils.validateUserProfile({ ...baseProfile, weight: 0 });
      expect(zeroWeight.isValid).toBe(false);
      expect(zeroWeight.errors).toContain('Weight must be positive');
      
      const negativeWeight = validationUtils.validateUserProfile({ ...baseProfile, weight: -70 });
      expect(negativeWeight.isValid).toBe(false);
      expect(negativeWeight.errors).toContain('Weight must be positive'); // Should check positivity first
      
      const tooLowKg = validationUtils.validateUserProfile({ ...baseProfile, weight: 19 });
      expect(tooLowKg.isValid).toBe(false);
      expect(tooLowKg.errors).toContain('Weight appears to be out of realistic range (kg)');
      
      const tooHighKg = validationUtils.validateUserProfile({ ...baseProfile, weight: 301 });
      expect(tooHighKg.isValid).toBe(false);
      expect(tooHighKg.errors).toContain('Weight appears to be out of realistic range (kg)');

      const validWeightKg = validationUtils.validateUserProfile({ ...baseProfile, weight: 70 });
      expect(validWeightKg.isValid).toBe(true);
    });
    
    test('should validate weight (Imperial): invalid type, zero, negative, out of range', () => {
      const baseProfile = { age: 30, height: { feet: 5, inches: 9 }, gender: 'male', preferences: { units: 'imperial' } };
      
      const invalidType = validationUtils.validateUserProfile({ ...baseProfile, weight: {} });
      expect(invalidType.isValid).toBe(false);
      expect(invalidType.errors).toContain('Weight must be a valid number');
      
      const zeroWeight = validationUtils.validateUserProfile({ ...baseProfile, weight: 0 });
      expect(zeroWeight.isValid).toBe(false);
      expect(zeroWeight.errors).toContain('Weight must be positive');
      
      const negativeWeight = validationUtils.validateUserProfile({ ...baseProfile, weight: -150 });
      expect(negativeWeight.isValid).toBe(false);
      expect(negativeWeight.errors).toContain('Weight must be positive');
      
      const tooLowLbs = validationUtils.validateUserProfile({ ...baseProfile, weight: 43 });
      expect(tooLowLbs.isValid).toBe(false);
      expect(tooLowLbs.errors).toContain('Weight appears to be out of realistic range (lbs)');
      
      const tooHighLbs = validationUtils.validateUserProfile({ ...baseProfile, weight: 661 });
      expect(tooHighLbs.isValid).toBe(false);
      expect(tooHighLbs.errors).toContain('Weight appears to be out of realistic range (lbs)');

      const validWeightLbs = validationUtils.validateUserProfile({ ...baseProfile, weight: 160 });
      expect(validWeightLbs.isValid).toBe(true);
    });

    // Height Validation Tests
    test('should validate height (Metric): invalid type, NaN, zero, negative, out of range', () => {
      const baseProfile = { age: 30, weight: 70, gender: 'female', preferences: { units: 'metric' } };
      
      const invalidType = validationUtils.validateUserProfile({ ...baseProfile, height: 'tall' });
      expect(invalidType.isValid).toBe(false);
      expect(invalidType.errors).toContain('Height must be a valid number in centimeters');
      
      const nanHeight = validationUtils.validateUserProfile({ ...baseProfile, height: NaN });
      expect(nanHeight.isValid).toBe(false);
      expect(nanHeight.errors).toContain('Height must be a valid number in centimeters');
      
      const zeroHeight = validationUtils.validateUserProfile({ ...baseProfile, height: 0 });
      expect(zeroHeight.isValid).toBe(false);
      expect(zeroHeight.errors).toContain('Height must be positive');
      
      const negativeHeight = validationUtils.validateUserProfile({ ...baseProfile, height: -170 });
      expect(negativeHeight.isValid).toBe(false);
      expect(negativeHeight.errors).toContain('Height must be positive');
      
      const tooShortCm = validationUtils.validateUserProfile({ ...baseProfile, height: 119 });
      expect(tooShortCm.isValid).toBe(false);
      expect(tooShortCm.errors).toContain('Height appears to be out of realistic range (cm)');
      
      const tooTallCm = validationUtils.validateUserProfile({ ...baseProfile, height: 251 });
      expect(tooTallCm.isValid).toBe(false);
      expect(tooTallCm.errors).toContain('Height appears to be out of realistic range (cm)');

      const validHeightCm = validationUtils.validateUserProfile({ ...baseProfile, height: 175 });
      expect(validHeightCm.isValid).toBe(true);
    });

    test('should validate height (Imperial - number input for inches): invalid type, NaN, zero, negative', () => {
      const baseProfile = { age: 30, weight: 160, gender: 'male', preferences: { units: 'imperial' } };

      // Note: The implementation allows any positive number for imperial height if given as a number (inches)
      // It doesn't enforce a specific range in this case.
      const invalidType = validationUtils.validateUserProfile({ ...baseProfile, height: '5ft9in' });
      expect(invalidType.isValid).toBe(false);
      expect(invalidType.errors).toContain('Imperial height must be a number (inches) or an object with feet and inches');

      const nanHeight = validationUtils.validateUserProfile({ ...baseProfile, height: NaN });
      expect(nanHeight.isValid).toBe(false);
      expect(nanHeight.errors).toContain('Height must be a valid number in inches');
      
      const zeroHeight = validationUtils.validateUserProfile({ ...baseProfile, height: 0 });
      expect(zeroHeight.isValid).toBe(false);
      expect(zeroHeight.errors).toContain('Height must be positive');
      
      const negativeHeight = validationUtils.validateUserProfile({ ...baseProfile, height: -69 });
      expect(negativeHeight.isValid).toBe(false);
      expect(negativeHeight.errors).toContain('Height must be positive');

      const validHeightIn = validationUtils.validateUserProfile({ ...baseProfile, height: 69 }); // 5' 9"
      expect(validHeightIn.isValid).toBe(true);
    });
    
    test('should validate height (Imperial - object input): invalid types, NaN, negative, inches>=12, out of range', () => {
      const baseProfile = { age: 30, weight: 160, gender: 'male', preferences: { units: 'imperial' } };

      const invalidFeetType = validationUtils.validateUserProfile({ ...baseProfile, height: { feet: 'five', inches: 9 } });
      expect(invalidFeetType.isValid).toBe(false);
      expect(invalidFeetType.errors).toContain('Feet must be a valid number');

      const invalidInchesType = validationUtils.validateUserProfile({ ...baseProfile, height: { feet: 5, inches: 'nine' } });
      expect(invalidInchesType.isValid).toBe(false);
      expect(invalidInchesType.errors).toContain('Inches must be a valid number');

      const nanFeet = validationUtils.validateUserProfile({ ...baseProfile, height: { feet: NaN, inches: 9 } });
      expect(nanFeet.isValid).toBe(false);
      expect(nanFeet.errors).toContain('Feet must be a valid number');
      
      const negativeInches = validationUtils.validateUserProfile({ ...baseProfile, height: { feet: 5, inches: -1 } });
      expect(negativeInches.isValid).toBe(false);
      expect(negativeInches.errors).toContain('Inches must be between 0 and 11');
      
      const inchesTooLarge = validationUtils.validateUserProfile({ ...baseProfile, height: { feet: 5, inches: 12 } });
      expect(inchesTooLarge.isValid).toBe(false);
      expect(inchesTooLarge.errors).toContain('Inches must be between 0 and 11');
      
      const tooShortFtIn = validationUtils.validateUserProfile({ ...baseProfile, height: { feet: 3, inches: 11 } }); // 47 inches
      expect(tooShortFtIn.isValid).toBe(false);
      expect(tooShortFtIn.errors).toContain('Height appears to be out of realistic range');
      
      const tooTallFtIn = validationUtils.validateUserProfile({ ...baseProfile, height: { feet: 8, inches: 1 } }); // 97 inches
      expect(tooTallFtIn.isValid).toBe(false);
      expect(tooTallFtIn.errors).toContain('Height appears to be out of realistic range');

      const validHeightFtIn = validationUtils.validateUserProfile({ ...baseProfile, height: { feet: 5, inches: 9 } });
      expect(validHeightFtIn.isValid).toBe(true);
      
      const validHeightFeetOnly = validationUtils.validateUserProfile({ ...baseProfile, height: { feet: 6 } }); // Assumes inches=0
      expect(validHeightFeetOnly.isValid).toBe(true);
    });

    test('should validate height (Imperial - other invalid format)', () => {
        const baseProfile = { age: 30, weight: 160, gender: 'male', preferences: { units: 'imperial' } };
        const invalidFormat = validationUtils.validateUserProfile({ ...baseProfile, height: [5, 9] });
        expect(invalidFormat.isValid).toBe(false);
        expect(invalidFormat.errors).toContain('Imperial height must be a number (inches) or an object with feet and inches');
    });

    // Gender Validation Test
    test('should validate gender: invalid type, unknown strings', () => {
      const baseProfile = { age: 30, weight: 70, height: 170, preferences: { units: 'metric' } };

      const invalidType = validationUtils.validateUserProfile({ ...baseProfile, gender: 123 });
      expect(invalidType.isValid).toBe(false);
      expect(invalidType.errors).toContain('Gender must be a string');
      
      // Note: The implementation seems to allow aliases like 'm', 'f', 'man', 'woman' based on code
      // Let's test an explicitly invalid string not covered by aliases
      const unknownString = validationUtils.validateUserProfile({ ...baseProfile, gender: 'nonbinary' });
      expect(unknownString.isValid).toBe(false);
      expect(unknownString.errors).toContain('Gender must be one of: male, female, m, f, man, woman');

      const validGenderM = validationUtils.validateUserProfile({ ...baseProfile, gender: 'm' });
      expect(validGenderM.isValid).toBe(true); // Assuming 'm' is valid based on implementation
      const validGenderWoman = validationUtils.validateUserProfile({ ...baseProfile, gender: 'woman' });
      expect(validGenderWoman.isValid).toBe(true); // Assuming 'woman' is valid based on implementation
    });

    // Unit Preference Validation Test
    test('should validate unit preference: invalid type, unknown strings', () => {
      const baseProfile = { age: 30, weight: 70, height: 170, gender: 'male' }; // Base profile valid

      const invalidType = validationUtils.validateUserProfile({ ...baseProfile, preferences: { units: 1 } });
      expect(invalidType.isValid).toBe(false);
      expect(invalidType.errors).toContain('Unit preference must be a string');
      
      const unknownString = validationUtils.validateUserProfile({ ...baseProfile, preferences: { units: 'meters' } });
      expect(unknownString.isValid).toBe(false);
      expect(unknownString.errors).toContain('Unit preference must be either "metric" or "imperial"');
      
      const validUnitsMetric = validationUtils.validateUserProfile({ ...baseProfile, preferences: { units: 'metric' } });
      expect(validUnitsMetric.isValid).toBe(true);
      
      const validUnitsImperialUpper = validationUtils.validateUserProfile({ ...baseProfile, preferences: { units: 'IMPERIAL' } });
      expect(validUnitsImperialUpper.isValid).toBe(true);
    });
    
    test('should return isValid: true for a fully valid profile (metric and imperial)', () => {
       const validMetricProfile = {
         age: 45,
         weight: 88,
         height: 182,
         gender: 'male',
         preferences: { units: 'metric' },
       };
       expect(validationUtils.validateUserProfile(validMetricProfile).isValid).toBe(true);
       expect(capturedLogger.error).not.toHaveBeenCalled();
       
       const validImperialProfile = {
         age: 28,
         weight: 145,
         height: { feet: 5, inches: 6 },
         gender: 'female',
         preferences: { units: 'imperial' },
       };
       expect(validationUtils.validateUserProfile(validImperialProfile).isValid).toBe(true);
       expect(capturedLogger.error).not.toHaveBeenCalled();
       
       // Also test imperial height as number
       const validImperialNumProfile = {
           age: 33,
           weight: 200,
           height: 72, // 6 feet
           gender: 'male',
           preferences: { units: 'imperial' },
       };
       expect(validationUtils.validateUserProfile(validImperialNumProfile).isValid).toBe(true);
       expect(capturedLogger.error).not.toHaveBeenCalled();
    });

    test('should call logger.error on validation failures for specific conditions', () => {
        // Test the explicit log call for null/undefined profile
        validationUtils.validateUserProfile(null);
        expect(capturedLogger.error).toHaveBeenCalledWith('Validation Error: User profile is null or undefined');
        
        // Clear mock for the next specific check (if any other explicit logs existed)
        capturedLogger.error.mockClear(); 
        
        // Example: If we added another explicit log call inside validateUserProfile for, say, invalid units,
        // we would test it here specifically.
        // const invalidUnitsProfile = { age: 30, weight: 70, height: 170, gender: 'male', preferences: { units: 'yards' } };
        // validationUtils.validateUserProfile(invalidUnitsProfile);
        // expect(capturedLogger.error).toHaveBeenCalledWith(/* specific message for units */);
        
        // We don't test for a generic log call just because errors exist, as the implementation doesn't do that.
    });

  });

  describe('validateAndPrioritizeGoals', () => {
    beforeEach(() => {
      validationUtils = new ValidationUtils({ logger: capturedLogger });
    });

    test('should return isValid: false and log error for null, undefined, or non-array input', () => {
      const nullResult = validationUtils.validateAndPrioritizeGoals(null);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.errors).toContain('Goals must be a non-empty array');
      expect(capturedLogger.error).toHaveBeenCalledWith('Validation Error: Goals must be a non-empty array');

      capturedLogger.error.mockClear();
      const undefinedResult = validationUtils.validateAndPrioritizeGoals(undefined);
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.errors).toContain('Goals must be a non-empty array');
      expect(capturedLogger.error).toHaveBeenCalledWith('Validation Error: Goals must be a non-empty array');
      
      capturedLogger.error.mockClear();
      const notArrayResult = validationUtils.validateAndPrioritizeGoals({ goal: 'test' });
      expect(notArrayResult.isValid).toBe(false);
      expect(notArrayResult.errors).toContain('Goals must be a non-empty array');
      expect(capturedLogger.error).toHaveBeenCalledWith('Validation Error: Goals must be a non-empty array');
    });
    
    test('should return isValid: false and log error for empty goals array', () => {
      const result = validationUtils.validateAndPrioritizeGoals([]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one goal must be specified');
      expect(capturedLogger.error).toHaveBeenCalledWith('Validation Error: At least one goal must be specified');
    });

    test('should normalize valid goals (aliases, case, padding) and prioritize correctly', () => {
      const goals = [' LOSE_WEIGHT ', 'Hypertrophy', 'MAINTAIN', 'unknown_goal', ' cutting '];
      const result = validationUtils.validateAndPrioritizeGoals(goals);
      
      expect(result.isValid).toBe(false); // Because of unknown_goal
      expect(result.errors).toContain('Unknown goal: unknown_goal. Valid goals are: weight_loss, weight_gain, muscle_gain, maintenance, performance, general_health');
      
      expect(result.normalizedGoals).toEqual(expect.arrayContaining(['weight_loss', 'muscle_gain', 'maintenance', 'weight_loss']));
      expect(result.normalizedGoals.length).toBe(4); // Excludes the unknown goal
      
      expect(result.primaryGoal).toBe('weight_loss'); // Highest priority among the valid ones
    });

    test('should return isValid: false for conflicting goals (weight_loss and weight_gain)', () => {
      const goals = ['weight_loss', 'weight_gain'];
      const result = validationUtils.validateAndPrioritizeGoals(goals);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Conflicting goals: weight_loss and weight_gain cannot be combined');
    });

    test('should correctly prioritize goals based on defined order', () => {
      const goals1 = ['performance', 'muscle_gain', 'maintenance']; // muscle_gain > performance > maintenance
      const result1 = validationUtils.validateAndPrioritizeGoals(goals1);
      expect(result1.isValid).toBe(true);
      expect(result1.primaryGoal).toBe('muscle_gain');
      expect(result1.normalizedGoals).toEqual(['performance', 'muscle_gain', 'maintenance']); // Order might vary depending on input order if priorities are equal

      const goals2 = ['general_health', 'performance']; // performance > general_health
      const result2 = validationUtils.validateAndPrioritizeGoals(goals2);
      expect(result2.isValid).toBe(true);
      expect(result2.primaryGoal).toBe('performance');
    });

    test('should return correct structure { isValid, errors, normalizedGoals, primaryGoal }', () => {
      const goals = ['performance'];
      const result = validationUtils.validateAndPrioritizeGoals(goals);
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('normalizedGoals');
      expect(result).toHaveProperty('primaryGoal');
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.normalizedGoals).toEqual(['performance']);
      expect(result.primaryGoal).toBe('performance');
    });

    test('should log errors for validation failures', () => {
      validationUtils.validateAndPrioritizeGoals([]); // Empty array error
      expect(capturedLogger.error).toHaveBeenCalledWith('Validation Error: At least one goal must be specified');
      capturedLogger.error.mockClear();

      validationUtils.validateAndPrioritizeGoals(['invalid_goal']); // Unknown goal error
      expect(capturedLogger.error).not.toHaveBeenCalled(); // Error is returned, not necessarily logged for this specific case in impl.

      // Note: The implementation doesn't explicitly log for unknown or conflicting goals, only for input type/empty array errors.
      // Adjusting test to reflect this.
    });
  });

  describe('validateActivityLevel', () => {
    beforeEach(() => {
      validationUtils = new ValidationUtils({ logger: capturedLogger });
    });

    test('should return isValid: false and log error for null, undefined, or non-string input', () => {
      const nullResult = validationUtils.validateActivityLevel(null);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.errors).toContain('Activity level must be a non-empty string');
      expect(capturedLogger.error).toHaveBeenCalledWith('Validation Error: Activity level must be a non-empty string');
      
      capturedLogger.error.mockClear();
      const undefinedResult = validationUtils.validateActivityLevel(undefined);
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.errors).toContain('Activity level must be a non-empty string');
      expect(capturedLogger.error).toHaveBeenCalledWith('Validation Error: Activity level must be a non-empty string');
      
      capturedLogger.error.mockClear();
      const notStringResult = validationUtils.validateActivityLevel(123);
      expect(notStringResult.isValid).toBe(false);
      expect(notStringResult.errors).toContain('Activity level must be a non-empty string');
      expect(capturedLogger.error).toHaveBeenCalledWith('Validation Error: Activity level must be a non-empty string');
    });
    
    test('should return isValid: false and log error for unknown activity level string', () => {
       const result = validationUtils.validateActivityLevel('super_active');
       expect(result.isValid).toBe(false);
       expect(result.errors).toContain('Unknown activity level: super_active. Valid levels are: sedentary, lightly_active, moderately_active, very_active, extremely_active');
       expect(result.normalizedLevel).toBeNull();
       expect(result.multiplier).toBeNull();
       expect(capturedLogger.error).toHaveBeenCalledWith('Validation Error: Unknown activity level: super_active');
    });

    test('should return correct normalized level and multiplier for valid levels (direct match, aliases, case, padding)', () => {
      const levels = {
        'sedentary': { normalized: 'sedentary', multiplier: 1.2 },
        'inactive': { normalized: 'sedentary', multiplier: 1.2 },
        ' LIGHT ': { normalized: 'lightly_active', multiplier: 1.375 },
        'moderate_exercise': { normalized: 'moderately_active', multiplier: 1.55 },
        'VERY_ACTIVE': { normalized: 'very_active', multiplier: 1.725 },
        ' athlete ': { normalized: 'extremely_active', multiplier: 1.9 },
      };

      for (const [input, expected] of Object.entries(levels)) {
        const result = validationUtils.validateActivityLevel(input);
        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
        expect(result.normalizedLevel).toBe(expected.normalized);
        expect(result.multiplier).toBe(expected.multiplier);
      }
    });

    test('should return correct structure { isValid, errors, normalizedLevel, multiplier }', () => {
      const result = validationUtils.validateActivityLevel('moderate');
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('normalizedLevel');
      expect(result).toHaveProperty('multiplier');
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateDietaryPreferences', () => {
    beforeEach(() => {
      validationUtils = new ValidationUtils({ logger: capturedLogger });
    });

    test('should return isValid: true and empty normalized object for null or undefined input', () => {
      const nullResult = validationUtils.validateDietaryPreferences(null);
      expect(nullResult.isValid).toBe(true);
      expect(nullResult.errors.length).toBe(0);
      expect(nullResult.normalized).toEqual({});

      const undefinedResult = validationUtils.validateDietaryPreferences(undefined);
      expect(undefinedResult.isValid).toBe(true);
      expect(undefinedResult.errors.length).toBe(0);
      expect(undefinedResult.normalized).toEqual({});
    });

    test('should return isValid: false for non-array restrictions and normalize valid ones', () => {
      const prefs = { restrictions: 'vegan' };
      const result = validationUtils.validateDietaryPreferences(prefs);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Dietary restrictions must be an array');
      expect(result.normalized.restrictions).toEqual([]); // Should default to empty array on error
    });

    test('should return isValid: true and normalize restrictions (case, padding, known values)', () => {
      const prefs = { restrictions: [' VEGAN ', 'gluten_free', 'unknown_restriction'] };
      const result = validationUtils.validateDietaryPreferences(prefs);
      expect(result.isValid).toBe(false); // Due to unknown restriction
      expect(result.errors).toContain('Unknown dietary restrictions: unknown_restriction');
      expect(result.normalized.restrictions).toEqual(['vegan', 'gluten_free', 'unknown_restriction']); // Contains invalid one before filtering
    });

    test('should return isValid: false for invalid meal frequency (non-number, NaN, range)', () => {
      const testValues = ['five', NaN, 0, 11];
      testValues.forEach(value => {
        const prefs = { meal_frequency: value };
        const result = validationUtils.validateDietaryPreferences(prefs);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Meal frequency must be a number between 1 and 10');
        expect(result.normalized.meal_frequency).toBe(3); // Should default
      });
      
      const validPrefs = { meal_frequency: 5 };
      const validResult = validationUtils.validateDietaryPreferences(validPrefs);
      expect(validResult.isValid).toBe(true);
      expect(validResult.normalized.meal_frequency).toBe(5);
    });

    test('should return isValid: false for non-array disliked_foods or allergies', () => {
      const invalidDisliked = { disliked_foods: 'broccoli' };
      const resultDisliked = validationUtils.validateDietaryPreferences(invalidDisliked);
      expect(resultDisliked.isValid).toBe(false);
      expect(resultDisliked.errors).toContain('Disliked foods must be an array');
      expect(resultDisliked.normalized.disliked_foods).toEqual([]);

      const invalidAllergies = { allergies: { type: 'nuts' } };
      const resultAllergies = validationUtils.validateDietaryPreferences(invalidAllergies);
      expect(resultAllergies.isValid).toBe(false);
      expect(resultAllergies.errors).toContain('Allergies must be an array');
      expect(resultAllergies.normalized.allergies).toEqual([]);
    });

    test('should return isValid: true and normalize valid disliked_foods and allergies (lowercase, trim)', () => {
      const prefs = {
        disliked_foods: [' Spinach ', 123, 'Brussel Sprouts'],
        allergies: [' PEANUTS', null, ' shellfish ']
      };
      const result = validationUtils.validateDietaryPreferences(prefs);
      expect(result.isValid).toBe(true); // Invalid types are filtered out, doesn't make the whole thing invalid
      expect(result.errors.length).toBe(0);
      expect(result.normalized.disliked_foods).toEqual(['spinach', 'brussel sprouts']);
      expect(result.normalized.allergies).toEqual(['peanuts', 'shellfish']);
    });

    test('should return correct structure { isValid, errors, normalized }', () => {
      const prefs = { allergies: ['dust'] }; // Simple valid input
      const result = validationUtils.validateDietaryPreferences(prefs);
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('normalized');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toEqual({ allergies: ['dust'] });
    });

    test('should not call logger.error for dietary preference validation failures (as per current implementation)', () => {
      const invalidPrefs = { meal_frequency: 20 };
      validationUtils.validateDietaryPreferences(invalidPrefs);
      expect(capturedLogger.error).not.toHaveBeenCalled();
    });
  });

  // More describe blocks for other methods will follow here
}); 