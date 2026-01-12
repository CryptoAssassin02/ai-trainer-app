// Define the mock logger first
const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Now mock winston using the defined mockLogger
jest.mock('winston', () => ({
  createLogger: jest.fn().mockReturnValue(mockLogger),
  format: {
    json: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
  },
}));

// Now require the module under test AFTER the mock is set up
const {
  validateBMRInputs,
  convertWeight,
  convertHeight,
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  // Import other exports if needed for testing setup
} = require('../../utils/nutrition-formulas');

describe('Nutrition Formulas', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockLogger.error.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.info.mockClear();
  });

  describe('validateBMRInputs', () => {
    const validMetricData = {
      age: 30,
      weight: 70, // kg
      height: 175, // cm
      gender: 'male',
      units: 'metric',
    };

    const validImperialDataObj = {
      age: 30,
      weight: 154, // lbs
      height: { feet: 5, inches: 9 }, // 69 inches
      gender: 'female',
      units: 'imperial',
    };
    
    const validImperialDataNum = {
        age: 25,
        weight: 130, // lbs
        height: 65, // inches
        gender: 'male',
        units: 'imperial',
    };


    test('should throw error for missing required fields', () => {
      const requiredFields = ['age', 'weight', 'height', 'gender', 'units'];
      for (const field of requiredFields) {
        const incompleteData = { ...validMetricData };
        delete incompleteData[field];
        expect(() => validateBMRInputs(incompleteData, mockLogger))
          .toThrow(`Missing required field '${field}' for BMR calculation.`);
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Missing required field '${field}'`));
        mockLogger.error.mockClear(); // Clear for next iteration
      }
    });

    test('should throw error for invalid age values', () => {
      const invalidAges = [-1, 0, 121, 'thirty', NaN];
      for (const age of invalidAges) {
        const data = { ...validMetricData, age: age };
         expect(() => validateBMRInputs(data, mockLogger))
           .toThrow('Invalid age provided. Age must be between 1 and 120.');
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid age'));
         mockLogger.error.mockClear();
      }
    });

    test('should throw error for invalid weight values', () => {
      const invalidWeights = [0, -10, 'heavy', NaN];
      for (const weight of invalidWeights) {
        const data = { ...validMetricData, weight: weight };
        expect(() => validateBMRInputs(data, mockLogger))
          .toThrow('Invalid weight provided. Weight must be positive.');
         expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid weight'));
         mockLogger.error.mockClear();
      }
    });

     test('should throw error for invalid units value', () => {
        const data = { ...validMetricData, units: 'invalid' };
        expect(() => validateBMRInputs(data, mockLogger))
          .toThrow("Invalid units provided. Units must be 'metric' or 'imperial'.");
         expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Invalid units 'invalid'"));
     });

    test('should throw error for invalid metric height values', () => {
      const invalidHeights = [0, -100, 'tall', null, NaN];
      for (const height of invalidHeights) {
          const data = { ...validMetricData, height: height };
          // Check specifically for the null case giving the missing field error
          if (height === null) {
             expect(() => validateBMRInputs(data, mockLogger)).toThrow('Missing required field \'height\' for BMR calculation.');
          } else {
             expect(() => validateBMRInputs(data, mockLogger))
               .toThrow('Invalid metric height provided. Height must be positive.');
             expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid metric height'));
             mockLogger.error.mockClear();
          }
      }
    });

    test('should throw error for invalid imperial height (numeric - total inches)', () => {
        const invalidHeights = [0, -50, 'short', null, NaN]; 
        for (const height of invalidHeights) {
            const data = { ...validImperialDataNum, height: height };
             if (height === null) {
                expect(() => validateBMRInputs(data, mockLogger)).toThrow('Missing required field \'height\' for BMR calculation.');
             } else if (typeof height !== 'number') {
                 expect(() => validateBMRInputs(data, mockLogger))
                   .toThrow('Invalid imperial height format provided.');
                 expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid imperial height format'));
             } else {
                 expect(() => validateBMRInputs(data, mockLogger))
                   .toThrow('Invalid imperial height (total inches) provided. Height must be positive.');
                 expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid imperial height (total inches)'));
             }
             mockLogger.error.mockClear();
        }
    });

    test('should throw error for invalid imperial height (object)', () => {
        const invalidHeightObjects = [
            // Invalid values
            { feet: -1, inches: 5 },
            { feet: 5, inches: -1 },
            { feet: 5, inches: 12 },
            { feet: 5, inches: 13 },
            { feet: 0, inches: 0 },
            // Invalid types within object
            { feet: 'five', inches: 9 },
            { feet: 5, inches: 'nine' },
            { feet: 5, inches: NaN },
            { feet: NaN, inches: 5 },
            // Missing keys -> Treat as format error based on implementation
            { feet: 5 }, 
            { inches: 9 }, 
            // Null -> Missing field error
            null, 
            // Wrong top-level type -> Format error
            'invalid', 
            [], 
            true, 
        ];
        for (const height of invalidHeightObjects) {
            const data = { ...validImperialDataObj, height: height };
             if (height === null) {
                expect(() => validateBMRInputs(data, mockLogger)).toThrow('Missing required field \'height\' for BMR calculation.');
             } else if (typeof height !== 'object' || Array.isArray(height)) { 
                 // Catches string, array, boolean
                 expect(() => validateBMRInputs(data, mockLogger))
                     .toThrow('Invalid imperial height format provided.');
                 expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid imperial height format'));
             } else if (height.feet === undefined || height.inches === undefined) {
                 // Catches objects missing keys - implementation throws format error
                 expect(() => validateBMRInputs(data, mockLogger))
                   .toThrow('Invalid imperial height format provided.'); // <<< Align test with impl
                 expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid imperial height format'));
             } else if (typeof height.feet !== 'number' || typeof height.inches !== 'number' ||
                        isNaN(height.feet) || isNaN(height.inches) ||
                        height.feet < 0 || height.inches < 0 || height.inches >= 12 ||
                        (height.feet === 0 && height.inches === 0)) {
                 // Catches objects with invalid values/types for keys
                 expect(() => validateBMRInputs(data, mockLogger))
                   .toThrow('Invalid imperial height object provided. Check feet/inches values.');
                 expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid imperial height object'));
             } else {
                 console.warn('Unexpected valid object in invalid test list:', height);
                 expect(validateBMRInputs(data, mockLogger)).toBe(true); 
             }
             mockLogger.error.mockClear();
        }
    });

    test('should throw error for invalid gender values', () => {
        const invalidGenders = ['non-binary', 'other', 123, null, NaN];
        for (const gender of invalidGenders) {
             const data = { ...validMetricData, gender: gender };
             if (gender === null) {
                 expect(() => validateBMRInputs(data, mockLogger)).toThrow('Missing required field \'gender\' for BMR calculation.');
             } else {
                 expect(() => validateBMRInputs(data, mockLogger))
                   .toThrow("Invalid gender provided. Gender must be 'male' or 'female'.");
                 expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid gender'));
             }
             mockLogger.error.mockClear();
        }
    });

    test('should return true for valid metric data', () => {
        expect(validateBMRInputs(validMetricData, mockLogger)).toBe(true);
        expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('should return true for valid imperial data (object)', () => {
        expect(validateBMRInputs(validImperialDataObj, mockLogger)).toBe(true);
        expect(mockLogger.error).not.toHaveBeenCalled();
    });
    
    test('should return true for valid imperial data (number - total inches)', () => {
        expect(validateBMRInputs(validImperialDataNum, mockLogger)).toBe(true);
        expect(mockLogger.error).not.toHaveBeenCalled();
    });

  });

  describe('convertWeight', () => {
    test('should convert kg to lbs correctly', () => {
      expect(convertWeight(70, 'kg', 'lbs')).toBeCloseTo(154.32, 2);
    });

    test('should convert lbs to kg correctly', () => {
      expect(convertWeight(154.32, 'lbs', 'kg')).toBeCloseTo(70, 2);
    });

    test('should return original value if units are the same', () => {
      expect(convertWeight(70, 'kg', 'kg')).toBe(70);
      expect(convertWeight(154, 'lbs', 'lbs')).toBe(154);
    });

    test('should throw error for invalid units', () => {
      expect(() => convertWeight(70, 'kg', 'stone')).toThrow('Invalid weight conversion: kg to stone');
      expect(() => convertWeight(70, 'grams', 'lbs')).toThrow('Invalid weight conversion: grams to lbs');
      expect(() => convertWeight(70, 'lbs', 'kgm')).toThrow('Invalid weight conversion: lbs to kgm');
    });
  });

  describe('convertHeight', () => {
    test('should convert cm to inches correctly', () => {
      expect(convertHeight(175, 'cm', 'in', mockLogger)).toBeCloseTo(68.90, 2);
    });

    test('should convert inches to cm correctly', () => {
      expect(convertHeight(68.90, 'in', 'cm', mockLogger)).toBeCloseTo(175, 0); // Rounding might make it not exact
    });

    test('should convert ft_in object to cm correctly', () => {
      const heightObj = { feet: 5, inches: 9 }; // 69 inches
      expect(convertHeight(heightObj, 'ft_in', 'cm', mockLogger)).toBeCloseTo(175.26, 2);
    });
    
    test('should convert ft_in object to inches correctly', () => {
      const heightObj = { feet: 5, inches: 9 }; // 69 inches
      expect(convertHeight(heightObj, 'ft_in', 'in', mockLogger)).toBeCloseTo(69, 2);
    });

    test('should convert numeric ft_in (total inches) to cm correctly and log warning', () => {
        const totalInches = 69;
        expect(convertHeight(totalInches, 'ft_in', 'cm', mockLogger)).toBeCloseTo(175.26, 2);
        expect(mockLogger.warn).toHaveBeenCalledWith('Height provided as number with ft_in unit, assuming total inches.');
    });
    
     test('should convert numeric ft_in (total inches) to inches correctly and log warning', () => {
        const totalInches = 69;
        expect(convertHeight(totalInches, 'ft_in', 'in', mockLogger)).toBeCloseTo(69, 2);
        expect(mockLogger.warn).toHaveBeenCalledWith('Height provided as number with ft_in unit, assuming total inches.');
    });

    test('should throw error for invalid fromUnit/toUnit', () => {
      expect(() => convertHeight(175, 'cm', 'ft', mockLogger)).toThrow('Invalid target height unit: ft');
      expect(() => convertHeight(69, 'yards', 'cm', mockLogger)).toThrow('Invalid source height unit: yards');
    });

    test('should throw error for invalid value type for units', () => {
      expect(() => convertHeight('tall', 'cm', 'in', mockLogger)).toThrow('Invalid height value for cm unit.');
      expect(() => convertHeight({ feet: 5 }, 'ft_in', 'cm', mockLogger)).toThrow('Invalid height value for ft_in unit. Expected { feet, inches } or total inches.'); // Because inches is missing
      expect(() => convertHeight(true, 'in', 'cm', mockLogger)).toThrow('Invalid height value for inches unit.');
    });
  });

  describe('calculateBMR', () => {
      // Re-use valid data from validateBMRInputs describe block
      const validMetricData = {
        age: 30,
        weight: 70, // kg
        height: 175, // cm
        gender: 'male',
        units: 'metric',
      };
      const validImperialDataObj = {
        age: 30,
        weight: 154, // lbs
        height: { feet: 5, inches: 9 }, // 69 inches
        gender: 'female',
        units: 'imperial',
      };
      const validImperialDataNum = {
        age: 25,
        weight: 130, // lbs
        height: 65, // inches = 165.1 cm
        gender: 'male',
        units: 'imperial',
      };

      beforeEach(() => {
        // Clear logger mocks
        mockLogger.error.mockClear();
        mockLogger.warn.mockClear();
        mockLogger.info.mockClear();
      });

      afterEach(() => {
      });

      test('should throw error if underlying validation fails', () => {
          // Pass data that WILL fail the real validateBMRInputs
          const invalidData = { ...validMetricData, age: -5 }; 
          expect(() => calculateBMR(invalidData, mockLogger))
            .toThrow('Invalid age provided. Age must be between 1 and 120.');
          // We can check the logger was called by the real validation function
          expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Invalid age '-5'"));
      });

      test('should calculate BMR correctly for metric units (male)', () => {
          expect(calculateBMR(validMetricData, mockLogger)).toBe(1649);
          expect(mockLogger.info).toHaveBeenCalled();
          expect(mockLogger.error).not.toHaveBeenCalled();
      });

      test('should calculate BMR correctly for imperial units (object, female)', () => {
          // Expect 1483 due to float precision in conversion
          expect(calculateBMR(validImperialDataObj, mockLogger)).toBe(1483);
           expect(mockLogger.info).toHaveBeenCalled();
           expect(mockLogger.warn).not.toHaveBeenCalled(); 
      });
      
      test('should calculate BMR correctly for imperial units (number, male)', () => {
          // Weight = 130 lbs -> 58.967 kg
          // Height = 65 inches -> 165.1 cm
          // BMR = (10 * 58.967) + (6.25 * 165.1) - (5 * 25) + 5 = 589.67 + 1031.875 - 125 + 5 = 1501.545 -> 1502
          expect(calculateBMR(validImperialDataNum, mockLogger)).toBe(1502);
           expect(mockLogger.info).toHaveBeenCalled();
      });
      
       test('should return a rounded BMR value', () => {
           // Expect 1483 due to float precision
           expect(calculateBMR(validImperialDataObj, mockLogger)).toBe(1483);
       });
  });

  describe('calculateTDEE', () => {
      const bmr = 1700;

      test('should throw error for invalid BMR value', () => {
          const invalidBMRs = [0, -100, null, undefined, NaN, 'invalid'];
          for (const invalidBmr of invalidBMRs) {
              expect(() => calculateTDEE(invalidBmr, 'moderate', mockLogger))
                  .toThrow('Invalid BMR value provided for TDEE calculation.');
              if (invalidBmr !== null && invalidBmr !== undefined) { // Null/undefined won't log the value
                 expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Invalid BMR value '${invalidBmr}'`));
              }
              mockLogger.error.mockClear();
          }
      });
      
      test('should throw error for missing or non-string activity level', () => {
           expect(() => calculateTDEE(bmr, null, mockLogger))
               .toThrow('Activity level must be provided as a string.');
           expect(mockLogger.error).toHaveBeenCalledWith('Validation Error: Activity level must be provided as a string.');
           mockLogger.error.mockClear();
           
           expect(() => calculateTDEE(bmr, undefined, mockLogger))
               .toThrow('Activity level must be provided as a string.');
            expect(mockLogger.error).toHaveBeenCalledWith('Validation Error: Activity level must be provided as a string.');
            mockLogger.error.mockClear();

           expect(() => calculateTDEE(bmr, 123, mockLogger))
               .toThrow('Activity level must be provided as a string.');
            expect(mockLogger.error).toHaveBeenCalledWith('Validation Error: Activity level must be provided as a string.');
      });

      test('should throw error for unrecognized activity level string', () => {
          const invalidLevel = 'super_lazy';
          expect(() => calculateTDEE(bmr, invalidLevel, mockLogger))
              .toThrow(`Unrecognized activity level: ${invalidLevel}.`);
          expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Unrecognized activity level '${invalidLevel}'`));
      });

      test('should calculate TDEE correctly for all valid activity levels/aliases', () => {
          const levels = {
              sedentary: 1.2,
              light: 1.375,
              lightly_active: 1.375,
              '1-3': 1.375,
              moderate: 1.55,
              moderately_active: 1.55,
              '3-5': 1.55,
              active: 1.725,
              very_active: 1.725,
              '6-7': 1.725,
              daily: 1.725,
              extra_active: 1.9,
              extreme: 1.9,
          };
          for (const [level, multiplier] of Object.entries(levels)) {
              const expectedTDEE = Math.round(bmr * multiplier);
              expect(calculateTDEE(bmr, level, mockLogger)).toBe(expectedTDEE);
              expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({ calculatedTDEE: expectedTDEE }), 'TDEE calculated');
              mockLogger.info.mockClear();
          }
      });
      
       test('should return a rounded TDEE value', () => {
           // light: 1700 * 1.375 = 2337.5 -> 2338
           expect(calculateTDEE(bmr, 'light', mockLogger)).toBe(2338);
       });
  });

  describe('calculateMacros', () => {
    const tdee = 2400;

    test('should throw error for invalid TDEE value', () => {
        const invalidTDEEs = [0, -500, null, undefined, NaN, 'invalid'];
        for (const invalidTdee of invalidTDEEs) {
            expect(() => calculateMacros(invalidTdee, ['maintenance'], mockLogger))
                .toThrow('Invalid TDEE value provided for macro calculation.');
            if (invalidTdee !== null && invalidTdee !== undefined) {
                 expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Invalid TDEE value '${invalidTdee}'`));
            }
             mockLogger.error.mockClear();
        }
    });

    test('should default to maintenance goal if goals array is invalid or empty', () => {
        const invalidGoals = [null, undefined, [], ['unknown_goal']];
        const tdee = 2400; // Define TDEE locally for clarity
        const expectedResult = {
            protein_g: Math.round(tdee * 0.20 / 4), // 120
            carbs_g: Math.round(tdee * 0.50 / 4),   // 300
            fat_g: Math.round(tdee * 0.30 / 9),     // 80
            calories: Math.round(120*4 + 300*4 + 80*9) // 480 + 1200 + 720 = 2400
        };

        for (const goals of invalidGoals) {
            const result = calculateMacros(tdee, goals, mockLogger);
            expect(result).toEqual(expectedResult);
            // Only expect warning for null, undefined, or empty array
            if (goals === null || goals === undefined || (Array.isArray(goals) && goals.length === 0)) { 
                expect(mockLogger.warn).toHaveBeenCalledWith("No goals provided for macro calculation. Using maintenance defaults.");
                mockLogger.warn.mockClear();
            } else {
                // For ['unknown_goal'], no warning is expected, but info log is.
                expect(mockLogger.warn).not.toHaveBeenCalled();
            }
            expect(mockLogger.info).toHaveBeenCalled();
            mockLogger.info.mockClear();
        }
    });

    test('should calculate macros correctly for weight_loss goal', () => {
        // Assumes TDEE already includes deficit if any
        const protein = Math.round(tdee * 0.30 / 4); // 180
        const fat = Math.round(tdee * 0.25 / 9);     // 67
        const carbs = Math.round(tdee * 0.45 / 4);   // 270 - Recalculated based on 1 - p - f
        const calories = Math.round(protein * 4 + carbs * 4 + fat * 9); // 720 + 1080 + 603 = 2403
        expect(calculateMacros(tdee, ['weight_loss'], mockLogger)).toEqual({ protein_g: protein, carbs_g: carbs, fat_g: fat, calories: calories });
        expect(mockLogger.info).toHaveBeenCalled();
    });

    test('should calculate macros correctly for muscle_gain goal', () => {
        // Assumes TDEE includes surplus if any
        const protein = Math.round(tdee * 0.30 / 4); // 180
        const carbs = Math.round(tdee * 0.45 / 4);   // 270
        const fat = Math.round(tdee * 0.25 / 9);     // 67
        const calories = Math.round(protein * 4 + carbs * 4 + fat * 9); // 720 + 1080 + 603 = 2403
        expect(calculateMacros(tdee, ['muscle_gain', 'other'], mockLogger)).toEqual({ protein_g: protein, carbs_g: carbs, fat_g: fat, calories: calories });
        expect(mockLogger.info).toHaveBeenCalled();
    });
    
    test('should calculate macros correctly for endurance goal', () => {
        const protein = Math.round(tdee * 0.20 / 4); // 120
        const carbs = Math.round(tdee * 0.55 / 4);   // 330
        const fat = Math.round(tdee * 0.25 / 9);     // 67
        const calories = Math.round(protein * 4 + carbs * 4 + fat * 9); // 480 + 1320 + 603 = 2403
        expect(calculateMacros(tdee, ['endurance'], mockLogger)).toEqual({ protein_g: protein, carbs_g: carbs, fat_g: fat, calories: calories });
        expect(mockLogger.info).toHaveBeenCalled();
    });
    
    test('should calculate macros correctly for maintenance/default goal', () => {
        const protein = Math.round(tdee * 0.20 / 4); // 120
        const carbs = Math.round(tdee * 0.50 / 4);   // 300
        const fat = Math.round(tdee * 0.30 / 9);     // 80
        const calories = Math.round(protein * 4 + carbs * 4 + fat * 9); // 480 + 1200 + 720 = 2400
        expect(calculateMacros(tdee, ['maintenance'], mockLogger)).toEqual({ protein_g: protein, carbs_g: carbs, fat_g: fat, calories: calories });
        expect(calculateMacros(tdee, ['general_health'], mockLogger)).toEqual({ protein_g: protein, carbs_g: carbs, fat_g: fat, calories: calories }); // Assuming same as maintenance
        expect(mockLogger.info).toHaveBeenCalledTimes(2);
    });
    
    // Note: Percentage sum check/fallback is hard to test precisely without direct manipulation
    // We assume the primary goal logic always results in percentages summing to 1.
  });
}); 