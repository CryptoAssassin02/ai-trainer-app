const { UnitConverter, CONVERSION_CONSTANTS } = require('../../utils/unit-converter');

// Create a mock logger object
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(), // Include other methods if potentially used, though not explicitly in the tested code
};


describe('UnitConverter Class', () => {
  let converter;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Instantiate the converter with the mock logger
    converter = new UnitConverter({ logger: mockLogger });
  });

  // Constructor Tests
  describe('Constructor', () => {
    it('should instantiate with the provided logger', () => {
      expect(converter.logger).toBe(mockLogger);
    });

    it('should instantiate with a default logger if none is provided', () => {
      // We can't easily test the *instance* of the default logger without module mocking,
      // but we can test that an instance without options gets *a* logger.
      const defaultConverter = new UnitConverter();
      expect(defaultConverter.logger).toBeDefined();
      expect(defaultConverter.logger.info).toBeInstanceOf(Function);
      expect(defaultConverter.logger.error).toBeInstanceOf(Function);
    });
  });

  // Validation Method Tests
  describe('validateNumericValue', () => {
    it('should pass for valid positive numbers', () => {
      expect(() => converter.validateNumericValue(10, 'TestValue')).not.toThrow();
      expect(() => converter.validateNumericValue(0.5, 'TestValue')).not.toThrow();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should pass for zero when allowZero is true (default)', () => {
      expect(() => converter.validateNumericValue(0, 'TestValue')).not.toThrow();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should throw error and log if value is not a number', () => {
      const expectedError = 'TestValue must be a valid number';
      expect(() => converter.validateNumericValue('10', 'TestValue')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
      jest.clearAllMocks(); // Clear mocks for next assertion

      expect(() => converter.validateNumericValue(null, 'TestValue')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
      jest.clearAllMocks();

      expect(() => converter.validateNumericValue(undefined, 'TestValue')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
      jest.clearAllMocks();

      expect(() => converter.validateNumericValue(NaN, 'TestValue')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
    });

    it('should throw error and log if value is zero and allowZero is false', () => {
      const expectedError = 'TestValue cannot be zero';
      expect(() => converter.validateNumericValue(0, 'TestValue', false)).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
    });

    it('should throw error and log if value is negative and allowNegative is false (default)', () => {
      const expectedError = 'TestValue cannot be negative';
      expect(() => converter.validateNumericValue(-10, 'TestValue')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
    });

    it('should pass for negative numbers when allowNegative is true', () => {
      expect(() => converter.validateNumericValue(-5, 'TestValue', true, true)).not.toThrow();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('validateUnitType', () => {
    it('should pass for valid unit types (case-insensitive)', () => {
      expect(() => converter.validateUnitType('metric')).not.toThrow();
      expect(() => converter.validateUnitType('imperial')).not.toThrow();
      expect(() => converter.validateUnitType('Metric')).not.toThrow();
      expect(() => converter.validateUnitType('IMPERIAL')).not.toThrow();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should throw error and log for invalid unit types', () => {
      const expectedError = 'TestUnit must be one of: metric, imperial';
      
      expect(() => converter.validateUnitType('metri', 'TestUnit')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}, received: metri`);
      jest.clearAllMocks();

      expect(() => converter.validateUnitType(123, 'TestUnit')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}, received: 123`);
      jest.clearAllMocks();
      
      expect(() => converter.validateUnitType(null, 'TestUnit')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}, received: null`);
      jest.clearAllMocks();
      
      expect(() => converter.validateUnitType(undefined, 'TestUnit')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}, received: undefined`);
    });

    it('should use default parameter name if not provided', () => {
        const expectedError = 'Unit type must be one of: metric, imperial';
        expect(() => converter.validateUnitType('invalid')).toThrow(expectedError);
        expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}, received: invalid`);
    });

  });

  // Conversion Method Tests
  describe('convertHeightToMetric', () => {
    // Validation Tests (Leveraging internal validateNumericValue)
    it('should throw error and log if feet is invalid', () => {
      const expectedError = 'Feet must be a valid number';
      expect(() => converter.convertHeightToMetric('5', 10)).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
    });

    it('should throw error and log if inches is invalid', () => {
      const expectedError = 'Inches must be a valid number';
      expect(() => converter.convertHeightToMetric(5, '10')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
    });
    
    it('should throw error and log if height measurement is negative', () => {
      const expectedError = 'Height measurements cannot be negative';
      expect(() => converter.convertHeightToMetric(-5, 10)).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
      jest.clearAllMocks();
      expect(() => converter.convertHeightToMetric(5, -10)).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
    });

    // Success Tests (Similar to unit-conversion.test.js)
    it('should correctly convert feet and inches to centimeters', () => {
      expect(converter.convertHeightToMetric(5, 10)).toBeCloseTo(177.8);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should correctly convert with inches defaulting to 0', () => {
      expect(converter.convertHeightToMetric(6)).toBeCloseTo(182.9);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('convertHeightToImperial', () => {
    // Validation Tests
    it('should throw error and log if centimeters is invalid', () => {
      const expectedError = 'Centimeters must be a valid number';
      expect(() => converter.convertHeightToImperial('180')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
    });

    it('should throw error and log if centimeters is negative', () => {
      const expectedError = 'Centimeters cannot be negative'; // Based on validateNumericValue default
      expect(() => converter.convertHeightToImperial(-10)).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
    });

    // Success Tests
    it('should correctly convert centimeters to feet and inches', () => {
      expect(converter.convertHeightToImperial(177.8)).toEqual({ feet: 5, inches: 10 });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle inches rounding up to 12 correctly', () => {
      expect(converter.convertHeightToImperial(181.61)).toEqual({ feet: 6, inches: 0 }); // 71.5 inches -> 6'0"
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('convertWeightToMetric', () => {
    // Validation Tests
    it('should throw error and log if pounds is invalid', () => {
      const expectedError = 'Pounds must be a valid number';
      expect(() => converter.convertWeightToMetric('150')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
    });
    
     it('should throw error and log if pounds is negative', () => {
      const expectedError = 'Pounds cannot be negative';
      expect(() => converter.convertWeightToMetric(-10)).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
    });

    // Success Tests
    it('should correctly convert pounds to kilograms', () => {
      expect(converter.convertWeightToMetric(150)).toBeCloseTo(68.0);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('convertWeightToImperial', () => {
    // Validation Tests
    it('should throw error and log if kilograms is invalid', () => {
      const expectedError = 'Kilograms must be a valid number';
      expect(() => converter.convertWeightToImperial('70')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
    });

    it('should throw error and log if kilograms is negative', () => {
      const expectedError = 'Kilograms cannot be negative';
      expect(() => converter.convertWeightToImperial(-10)).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
    });
    
    // Success Tests
    it('should correctly convert kilograms to pounds', () => {
      expect(converter.convertWeightToImperial(68)).toBeCloseTo(149.9);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  // Wrapper Conversion Methods
  describe('convertHeight', () => {
    it('should return original value if fromUnit === toUnit', () => {
      expect(converter.convertHeight(180, 'metric', 'metric')).toBe(180);
      expect(converter.convertHeight({ feet: 5, inches: 10 }, 'imperial', 'imperial')).toEqual({ feet: 5, inches: 10 });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should convert metric to imperial correctly', () => {
      expect(converter.convertHeight(177.8, 'metric', 'imperial')).toEqual({ feet: 5, inches: 10 });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should convert imperial (object) to metric correctly', () => {
      expect(converter.convertHeight({ feet: 5, inches: 10 }, 'imperial', 'metric')).toBeCloseTo(177.8);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should convert imperial (number/inches) to metric correctly', () => {
      // 70 inches = 5'10"
      expect(converter.convertHeight(70, 'imperial', 'metric')).toBeCloseTo(177.8);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should throw error and log for invalid unit types', () => {
      const expectedErrorMsg1 = 'Invalid unit conversion from metri to imperial';
      const expectedErrorMsg2 = 'Invalid unit conversion from metric to imperia';
      expect(() => converter.convertHeight(180, 'metri', 'imperial')).toThrow(expectedErrorMsg1);
      // It calls validateUnitType first, which logs and throws its own error
      expect(mockLogger.error).toHaveBeenCalledWith('Validation Error: From unit must be one of: metric, imperial, received: metri');
      jest.clearAllMocks();

      expect(() => converter.convertHeight(180, 'metric', 'imperia')).toThrow(expectedErrorMsg2);
      expect(mockLogger.error).toHaveBeenCalledWith('Validation Error: To unit must be one of: metric, imperial, received: imperia');
    });

    it('should throw error and log for invalid imperial height input type', () => {
      const expectedError = 'Imperial height must be a number (total inches) or an object with feet and inches properties';
      expect(() => converter.convertHeight(null, 'imperial', 'metric')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
      jest.clearAllMocks();
      expect(() => converter.convertHeight([5, 10], 'imperial', 'metric')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
    });
    
    it('should wrap internal validation errors correctly', () => {
        // Example: Passing invalid number to metric->imperial conversion
        const expectedError = 'Invalid unit conversion from metric to imperial: Height must be a valid number';
        expect(() => converter.convertHeight(NaN, 'metric', 'imperial')).toThrow(expectedError);
        // Logger already called by internal validation
        expect(mockLogger.error).toHaveBeenCalledWith('Validation Error: Height must be a valid number');
    });

  });

  describe('convertWeight', () => {
     it('should return original value if fromUnit === toUnit', () => {
      expect(converter.convertWeight(70, 'metric', 'metric')).toBe(70);
      expect(converter.convertWeight(150, 'imperial', 'imperial')).toBe(150);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should convert metric to imperial correctly', () => {
      expect(converter.convertWeight(68, 'metric', 'imperial')).toBeCloseTo(149.9);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should convert imperial to metric correctly', () => {
      expect(converter.convertWeight(150, 'imperial', 'metric')).toBeCloseTo(68.0);
       expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should throw error and log for invalid unit types', () => {
      const expectedErrorMsg1 = 'Invalid unit conversion from metric to apple';
      expect(() => converter.convertWeight(70, 'metric', 'apple')).toThrow(expectedErrorMsg1);
      expect(mockLogger.error).toHaveBeenCalledWith('Validation Error: To unit must be one of: metric, imperial, received: apple');
    });
    
    it('should wrap internal validation errors correctly', () => {
        const expectedError = 'Invalid unit conversion from metric to imperial: Weight cannot be negative';
        expect(() => converter.convertWeight(-10, 'metric', 'imperial')).toThrow(expectedError);
        expect(mockLogger.error).toHaveBeenCalledWith('Validation Error: Weight cannot be negative');
    });

  });

  // Formatting Methods
  describe('formatHeight', () => {
    it('should throw error and log for invalid value', () => {
      const expectedError = 'Height value must be a valid number';
      expect(() => converter.formatHeight(NaN, 'metric')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
    });

    it('should throw error and log for invalid unitSystem', () => {
      const expectedError = 'Unit system must be one of: metric, imperial';
      expect(() => converter.formatHeight(180, 'metri')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}, received: metri`);
    });

    it('should format metric height correctly', () => {
      expect(converter.formatHeight(180, 'metric')).toBe('180 cm');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should format imperial height correctly', () => {
      // Input value is cm, as formatHeight converts if unitSystem is imperial
      expect(converter.formatHeight(177.8, 'imperial')).toBe('5\'10"');
      expect(converter.formatHeight(182.88, 'imperial')).toBe('6\'0"');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
    
    // Testing the theoretically unreachable code branch
    it('should still throw if validateUnitType somehow passed an invalid value', () => {
       // Temporarily mock validateUnitType to bypass its check
       const originalValidate = converter.validateUnitType;
       converter.validateUnitType = jest.fn(); // Mock to do nothing
       
       const expectedError = 'Invalid unit system: banana';
       expect(() => converter.formatHeight(180, 'banana')).toThrow(expectedError);
       expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
       
       // Restore original method
       converter.validateUnitType = originalValidate;
    });
  });

  describe('formatWeight', () => {
    it('should throw error and log for invalid value', () => {
      const expectedError = 'Weight value must be a valid number';
      expect(() => converter.formatWeight(NaN, 'metric')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);
    });

    it('should throw error and log for invalid unitSystem', () => {
      const expectedError = 'Unit system must be one of: metric, imperial';
      expect(() => converter.formatWeight(70, 'metri')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}, received: metri`);
    });

    it('should format metric weight correctly', () => {
      expect(converter.formatWeight(70, 'metric')).toBe('70 kg');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should format imperial weight correctly', () => {
      expect(converter.formatWeight(150, 'imperial')).toBe('150 lbs');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
    
    // Testing the theoretically unreachable code branch
    it('should still throw if validateUnitType somehow passed an invalid value', () => {
       const originalValidate = converter.validateUnitType;
       converter.validateUnitType = jest.fn();
       
       const expectedError = 'Invalid unit system: grape';
       expect(() => converter.formatWeight(70, 'grape')).toThrow(expectedError);
       expect(mockLogger.error).toHaveBeenCalledWith(`Validation Error: ${expectedError}`);

       converter.validateUnitType = originalValidate;
    });
  });

  // Profile Conversion Method
  describe('convertUserProfile', () => {
    const metricProfile = {
      height: 180, // cm
      weight: 75,  // kg
      preferences: { units: 'metric', other: 'value' },
      name: 'Test User'
    };
    const imperialProfile = {
        height: { feet: 5, inches: 11 }, // -> 180.34 -> 180.3 cm (approx)
        weight: 165.3, // lbs -> 74.97 -> 75.0 kg (approx)
        preferences: { units: 'imperial', other: 'value' },
        name: 'Test User'
    };
    // Approximate expected results after conversion
    const expectedImperialFromMetric = {
        height: { feet: 5, inches: 11 }, // 180cm -> 70.86in -> 5'11"
        weight: 165.3, // 75kg -> 165.34lbs -> 165.3
        preferences: { units: 'imperial', other: 'value' },
        name: 'Test User'
    };
    const expectedMetricFromImperial = {
        height: 180.3, // 5'11" = 71in -> 180.34cm -> 180.3
        weight: 75.0,  // 165.3lbs -> 74.979kg -> 75.0
        preferences: { units: 'metric', other: 'value' },
        name: 'Test User'
    };

    it('should throw error and log for invalid fromUnit', () => {
      // Expect the direct error from validateUnitType, not the wrapped one
      expect(() => converter.convertUserProfile(metricProfile, 'metri', 'imperial')).toThrow('From unit must be one of: metric, imperial');
      expect(mockLogger.error).toHaveBeenCalledWith('Validation Error: From unit must be one of: metric, imperial, received: metri');
    });

    it('should throw error and log for invalid toUnit', () => {
      // Expect the direct error from validateUnitType, not the wrapped one
      expect(() => converter.convertUserProfile(metricProfile, 'metric', 'imperia')).toThrow('To unit must be one of: metric, imperial');
      expect(mockLogger.error).toHaveBeenCalledWith('Validation Error: To unit must be one of: metric, imperial, received: imperia');
    });

    it('should return a copy of the profile if units are the same', () => {
      const result = converter.convertUserProfile(metricProfile, 'metric', 'metric');
      expect(result).toEqual(metricProfile);
      expect(result).not.toBe(metricProfile); // Ensure it's a copy
      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled(); // No conversion happened
    });

    it('should convert profile from metric to imperial correctly', () => {
      const result = converter.convertUserProfile(metricProfile, 'metric', 'imperial');
      expect(result.height).toEqual(expectedImperialFromMetric.height);
      expect(result.weight).toBeCloseTo(expectedImperialFromMetric.weight);
      expect(result.preferences.units).toBe('imperial');
      expect(result.name).toBe(metricProfile.name);
      expect(result.preferences.other).toBe('value');
      expect(mockLogger.info).toHaveBeenCalledWith('Converted user profile from metric to imperial');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should convert profile from imperial to metric correctly', () => {
      const result = converter.convertUserProfile(imperialProfile, 'imperial', 'metric');
      expect(result.height).toBeCloseTo(expectedMetricFromImperial.height);
      expect(result.weight).toBeCloseTo(expectedMetricFromImperial.weight);
      expect(result.preferences.units).toBe('metric');
      expect(result.name).toBe(imperialProfile.name);
      expect(mockLogger.info).toHaveBeenCalledWith('Converted user profile from imperial to metric');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle profile missing height/weight gracefully', () => {
      const partialProfile = { name: 'Partial User', preferences: { units: 'metric' } };
      const result = converter.convertUserProfile(partialProfile, 'metric', 'imperial');
      expect(result.height).toBeUndefined();
      expect(result.weight).toBeUndefined();
      expect(result.preferences.units).toBe('imperial');
      expect(result.name).toBe('Partial User');
      expect(mockLogger.info).toHaveBeenCalledWith('Converted user profile from metric to imperial');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
    
    it('should handle profile missing preferences gracefully', () => {
        const profileNoPrefs = { name: 'No Prefs', height: 170, weight: 60 };
        const result = converter.convertUserProfile(profileNoPrefs, 'metric', 'imperial');
        expect(result.height).toEqual({ feet: 5, inches: 7 }); // 170cm -> 66.9in -> 5'7"
        expect(result.weight).toBeCloseTo(132.3); // 60kg -> 132.27lbs
        expect(result.preferences).toBeUndefined();
        expect(mockLogger.info).toHaveBeenCalledWith('Converted user profile from metric to imperial');
    });

    it('should propagate and wrap errors from internal conversion functions', () => {
      const invalidHeightProfile = { ...metricProfile, height: 'invalid' };
      const expectedError = 'Profile conversion failed: Height must be a valid number';
      
      expect(() => converter.convertUserProfile(invalidHeightProfile, 'metric', 'imperial')).toThrow(expectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(`Failed to convert user profile: Height must be a valid number`);
    });
  });

  // Constants Export Test
  describe('CONVERSION_CONSTANTS Export', () => {
    it('should export the CONVERSION_CONSTANTS object with correct keys', () => {
      expect(CONVERSION_CONSTANTS).toBeDefined();
      expect(CONVERSION_CONSTANTS).toHaveProperty('KG_TO_LBS');
      expect(CONVERSION_CONSTANTS).toHaveProperty('LBS_TO_KG');
      expect(CONVERSION_CONSTANTS).toHaveProperty('CM_TO_IN');
      expect(CONVERSION_CONSTANTS).toHaveProperty('IN_TO_CM');
      expect(CONVERSION_CONSTANTS).toHaveProperty('ROUNDING_PRECISION');
    });

    it('should have correct numeric values for constants', () => {
       expect(typeof CONVERSION_CONSTANTS.KG_TO_LBS).toBe('number');
       expect(typeof CONVERSION_CONSTANTS.LBS_TO_KG).toBe('number');
       expect(typeof CONVERSION_CONSTANTS.CM_TO_IN).toBe('number');
       expect(typeof CONVERSION_CONSTANTS.IN_TO_CM).toBe('number');
       expect(typeof CONVERSION_CONSTANTS.ROUNDING_PRECISION).toBe('number');
       // Optionally check specific values if they are critical
       expect(CONVERSION_CONSTANTS.IN_TO_CM).toBe(2.54);
    });
  });

}); 