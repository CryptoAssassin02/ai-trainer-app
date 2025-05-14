const {
  convertHeightToMetric,
  convertHeightToImperial,
  convertWeightToMetric,
  convertWeightToImperial,
  convertHeight,
  convertWeight,
  formatHeight,
  formatWeight
} = require('../../utils/unit-conversion');

describe('Unit Conversion Utilities', () => {
  describe('convertHeightToMetric', () => {
    // Validation Tests
    it('should throw an error if feet is not a number', () => {
      expect(() => convertHeightToMetric('5', 10)).toThrow('Feet must be a valid number');
      expect(() => convertHeightToMetric(null, 10)).toThrow('Feet must be a valid number');
      expect(() => convertHeightToMetric(undefined, 10)).toThrow('Feet must be a valid number');
      expect(() => convertHeightToMetric(NaN, 10)).toThrow('Feet must be a valid number');
    });

    it('should throw an error if inches is not a number (excluding undefined)', () => {
      expect(() => convertHeightToMetric(5, '10')).toThrow('Inches must be a valid number');
      expect(() => convertHeightToMetric(5, null)).toThrow('Inches must be a valid number');
      expect(() => convertHeightToMetric(5, NaN)).toThrow('Inches must be a valid number');
    });
    
    it('should use default 0 for inches if inches is undefined, and not throw', () => {
      expect(convertHeightToMetric(5, undefined)).toBeCloseTo(152.4); // 5 feet = 152.4 cm
    });

    it('should throw an error if feet is negative', () => {
      expect(() => convertHeightToMetric(-5, 10)).toThrow('Height measurements cannot be negative');
    });

    it('should throw an error if inches is negative', () => {
      expect(() => convertHeightToMetric(5, -10)).toThrow('Height measurements cannot be negative');
    });

    // Success Tests
    it('should correctly convert feet and inches to centimeters', () => {
      expect(convertHeightToMetric(5, 10)).toBeCloseTo(177.8); // 5'10" = 177.8 cm
    });

    it('should correctly convert feet only to centimeters (inches default to 0)', () => {
      expect(convertHeightToMetric(6, 0)).toBeCloseTo(182.9); // 6'0" = 182.88 cm, rounds to 182.9
      expect(convertHeightToMetric(6)).toBeCloseTo(182.9); // Inches default to 0
    });

    it('should correctly convert inches only to centimeters (feet default to 0 implicitly if not passed, but function expects feet)', () => {
      // The function expects 'feet' as the first argument.
      // If we want to test inches only, we pass 0 for feet.
      expect(convertHeightToMetric(0, 6)).toBeCloseTo(15.2); // 6" = 15.24 cm, rounds to 15.2
    });
    
    it('should handle zero feet and zero inches', () => {
      expect(convertHeightToMetric(0, 0)).toBeCloseTo(0);
    });

    it('should handle rounding correctly', () => {
      // 1 foot = 30.48 cm. The implementation rounds to 1 decimal place.
      expect(convertHeightToMetric(1, 0)).toBeCloseTo(30.5); 
      // 5 feet 7.5 inches = (67.5 inches) * 2.54 = 171.45 cm. Rounds to 171.5
      expect(convertHeightToMetric(5, 7.5)).toBeCloseTo(171.5);
      // 5 feet 7.2 inches = (67.2 inches) * 2.54 = 170.688 cm. Rounds to 170.7
      expect(convertHeightToMetric(5, 7.2)).toBeCloseTo(170.7);
    });
  });

  describe('convertHeightToImperial', () => {
    // Validation Tests
    it('should throw an error if centimeters is not a number', () => {
      expect(() => convertHeightToImperial('180')).toThrow('Centimeters must be a valid number');
      expect(() => convertHeightToImperial(null)).toThrow('Centimeters must be a valid number');
      expect(() => convertHeightToImperial(undefined)).toThrow('Centimeters must be a valid number');
      expect(() => convertHeightToImperial(NaN)).toThrow('Centimeters must be a valid number');
    });

    it('should throw an error if centimeters is negative', () => {
      expect(() => convertHeightToImperial(-10)).toThrow('Height cannot be negative');
    });

    // Success Tests
    it('should correctly convert centimeters to feet and inches', () => {
      expect(convertHeightToImperial(177.8)).toEqual({ feet: 5, inches: 10 }); // 177.8 cm = 5'10"
      expect(convertHeightToImperial(182.9)).toEqual({ feet: 6, inches: 0 });  // 182.9 cm = 6'0" (approx)
      expect(convertHeightToImperial(152.4)).toEqual({ feet: 5, inches: 0 });  // 152.4 cm = 5'0"
      expect(convertHeightToImperial(30.5)).toEqual({ feet: 1, inches: 0 });   // 30.48 cm = 1'0", rounds to 30.5, then 1'0"
    });

    it('should handle zero centimeters', () => {
      expect(convertHeightToImperial(0)).toEqual({ feet: 0, inches: 0 });
    });

    // Edge Case Test for rounding
    it('should correctly handle inches rounding up to 12 (increments feet, resets inches to 0)', () => {
      // 182.88 cm is exactly 6 feet. (6 * 12 * 2.54)
      // The implementation divides cm by 2.54, then calculates feet and rounds inches.
      // 182.88 / 2.54 = 72 inches. Math.floor(72/12) = 6 feet. Math.round(72%12) = 0 inches.
      expect(convertHeightToImperial(182.88)).toEqual({ feet: 6, inches: 0 });

      // Test a value that would cause inches to be ~11.6, which rounds to 12
      // e.g., 181.864 cm = 71.6 inches. feet = 5, inches = Math.round(11.6) = 12. Should become 6'0"
      expect(convertHeightToImperial(181.864)).toEqual({ feet: 6, inches: 0 }); 
      // Test a value that would cause inches to be ~11.5, which rounds to 12
      expect(convertHeightToImperial(181.61)).toEqual({ feet: 6, inches: 0 }); // 71.5 inches -> 5' 11.5" -> 6'0"
      // Test a value that would cause inches to be ~11.4, which rounds to 11
      expect(convertHeightToImperial(181.356)).toEqual({ feet: 5, inches: 11 }); // 71.4 inches -> 5' 11.4" -> 5'11"
    });

    it('should handle various rounding scenarios for inches', () => {
      expect(convertHeightToImperial(170.18)).toEqual({ feet: 5, inches: 7 }); // 67 inches -> 5'7"
      expect(convertHeightToImperial(171.45)).toEqual({ feet: 5, inches: 8 }); // 67.5 inches -> 5'7.5" -> 5'8"
      expect(convertHeightToImperial(172.72)).toEqual({ feet: 5, inches: 8 }); // 68 inches -> 5'8"
    });
  });

  describe('convertWeightToMetric', () => {
    // Validation Tests
    it('should throw an error if pounds is not a number', () => {
      expect(() => convertWeightToMetric('150')).toThrow('Pounds must be a valid number');
      expect(() => convertWeightToMetric(null)).toThrow('Pounds must be a valid number');
      expect(() => convertWeightToMetric(undefined)).toThrow('Pounds must be a valid number');
      expect(() => convertWeightToMetric(NaN)).toThrow('Pounds must be a valid number');
    });

    it('should throw an error if pounds is negative', () => {
      expect(() => convertWeightToMetric(-10)).toThrow('Weight cannot be negative');
    });

    // Success Tests
    it('should correctly convert pounds to kilograms and round to 1 decimal place', () => {
      expect(convertWeightToMetric(150)).toBeCloseTo(68.0); // 150 lbs = 68.0389 kg -> 68.0 kg
      expect(convertWeightToMetric(200.5)).toBeCloseTo(90.9); // 200.5 lbs = 90.9457 kg -> 90.9 kg
      expect(convertWeightToMetric(0)).toBeCloseTo(0);
    });

    it('should handle rounding for weight to metric correctly', () => {
      expect(convertWeightToMetric(100)).toBeCloseTo(45.4); // 100 * 0.45359237 = 45.359237 -> 45.4
      expect(convertWeightToMetric(100.1)).toBeCloseTo(45.4); // 100.1 * 0.45359237 = 45.404596237 -> 45.4
      expect(convertWeightToMetric(100.2)).toBeCloseTo(45.4); // Corrected expectation from 45.5 to 45.4
                                                              // 100.2 * 0.45359237 = 45.449955474 -> 45.4
    });
  });

  describe('convertWeightToImperial', () => {
    // Validation Tests
    it('should throw an error if kilograms is not a number', () => {
      expect(() => convertWeightToImperial('70')).toThrow('Kilograms must be a valid number');
      expect(() => convertWeightToImperial(null)).toThrow('Kilograms must be a valid number');
      expect(() => convertWeightToImperial(undefined)).toThrow('Kilograms must be a valid number');
      expect(() => convertWeightToImperial(NaN)).toThrow('Kilograms must be a valid number');
    });

    it('should throw an error if kilograms is negative', () => {
      expect(() => convertWeightToImperial(-10)).toThrow('Weight cannot be negative');
    });

    // Success Tests
    it('should correctly convert kilograms to pounds and round to 1 decimal place', () => {
      expect(convertWeightToImperial(68)).toBeCloseTo(149.9); // 68 kg = 149.91416 lbs -> 149.9 lbs
      expect(convertWeightToImperial(90.9)).toBeCloseTo(200.4); // 90.9 kg = 200.400558 lbs -> 200.4 lbs
      expect(convertWeightToImperial(0)).toBeCloseTo(0);
    });

    it('should handle rounding for weight to imperial correctly', () => {
      expect(convertWeightToImperial(45.359237)).toBeCloseTo(100.0); // Should be exactly 100.0
      expect(convertWeightToImperial(45.4)).toBeCloseTo(100.1);    // 45.4 * 2.20462 = 100.089268 -> 100.1
      expect(convertWeightToImperial(45.5)).toBeCloseTo(100.3);    // 45.5 * 2.20462 = 100.31021  -> 100.3
    });
  });

  describe('convertHeight', () => {
    it('should return original value if fromUnit === toUnit', () => {
      expect(convertHeight(180, 'metric', 'metric')).toBe(180);
      expect(convertHeight({ feet: 5, inches: 10 }, 'imperial', 'imperial')).toEqual({ feet: 5, inches: 10 });
    });

    it('should convert metric to imperial correctly by calling convertHeightToImperial', () => {
      const cm = 177.8;
      const expected = { feet: 5, inches: 10 };
      // Spy on convertHeightToImperial to ensure it's called
      // We can't directly spy on it if it's not imported as an object with methods,
      // but we can test the output which implies it was called correctly.
      expect(convertHeight(cm, 'metric', 'imperial')).toEqual(expected);
    });

    it('should convert imperial to metric correctly by calling convertHeightToMetric', () => {
      const imperialHeight = { feet: 5, inches: 10 };
      const expectedCm = 177.8;
      expect(convertHeight(imperialHeight, 'imperial', 'metric')).toBeCloseTo(expectedCm);
    });

    it('should handle default inches to 0 if not provided in imperial object for imperial to metric', () => {
      expect(convertHeight({ feet: 6 }, 'imperial', 'metric')).toBeCloseTo(182.9);
    });

    it('should throw an error if imperial height is not an object when converting to metric', () => {
      expect(() => convertHeight(60, 'imperial', 'metric')).toThrow('Imperial height must be an object with feet and inches properties');
      expect(() => convertHeight(null, 'imperial', 'metric')).toThrow('Imperial height must be an object with feet and inches properties');
    });

    it('should throw an error for invalid fromUnit or toUnit', () => {
      expect(() => convertHeight(180, 'metri', 'imperial')).toThrow('Invalid unit conversion from metri to imperial');
      expect(() => convertHeight(180, 'metric', 'imperia')).toThrow('Invalid unit conversion from metric to imperia');
      expect(() => convertHeight(180, 'banana', 'apple')).toThrow('Invalid unit conversion from banana to apple');
    });
  });

  describe('convertWeight', () => {
    it('should return original value if fromUnit === toUnit', () => {
      expect(convertWeight(70, 'metric', 'metric')).toBe(70);
      expect(convertWeight(150, 'imperial', 'imperial')).toBe(150);
    });

    it('should convert metric to imperial correctly by calling convertWeightToImperial', () => {
      expect(convertWeight(68, 'metric', 'imperial')).toBeCloseTo(149.9);
    });

    it('should convert imperial to metric correctly by calling convertWeightToMetric', () => {
      expect(convertWeight(150, 'imperial', 'metric')).toBeCloseTo(68.0);
    });

    it('should throw an error for invalid fromUnit or toUnit', () => {
      expect(() => convertWeight(70, 'metri', 'imperial')).toThrow('Invalid unit conversion from metri to imperial');
      expect(() => convertWeight(70, 'metric', 'imperia')).toThrow('Invalid unit conversion from metric to imperia');
    });
  });

  describe('formatHeight', () => {
    // Validation Tests
    it('should throw an error if value is not a number', () => {
      expect(() => formatHeight('180', 'metric')).toThrow('Height value must be a valid number');
      expect(() => formatHeight(NaN, 'metric')).toThrow('Height value must be a valid number');
    });

    it('should throw an error if value is negative', () => {
      expect(() => formatHeight(-10, 'metric')).toThrow('Height cannot be negative');
    });

    it('should throw an error for invalid unitSystem', () => {
      expect(() => formatHeight(180, 'metri')).toThrow('Invalid unit system: metri');
      expect(() => formatHeight(180, 'banana')).toThrow('Invalid unit system: banana');
    });

    // Success Tests
    it('should format metric height correctly', () => {
      expect(formatHeight(180, 'metric')).toBe('180 cm');
      expect(formatHeight(175.5, 'metric')).toBe('175.5 cm');
    });

    it('should format imperial height correctly (calls convertHeightToImperial)', () => {
      // Value is expected in cm for imperial formatting as it converts first
      expect(formatHeight(177.8, 'imperial')).toBe('5\'10"'); // 177.8cm -> 5'10"
      expect(formatHeight(182.88, 'imperial')).toBe('6\'0"'); // 182.88cm -> 6'0"
      expect(formatHeight(152.4, 'imperial')).toBe('5\'0"');  // 152.4cm -> 5'0"
    });
  });

  describe('formatWeight', () => {
    // Validation Tests
    it('should throw an error if value is not a number', () => {
      expect(() => formatWeight('70', 'metric')).toThrow('Weight value must be a valid number');
      expect(() => formatWeight(NaN, 'metric')).toThrow('Weight value must be a valid number');
    });

    it('should throw an error if value is negative', () => {
      expect(() => formatWeight(-10, 'metric')).toThrow('Weight cannot be negative');
    });

    it('should throw an error for invalid unitSystem', () => {
      expect(() => formatWeight(70, 'metri')).toThrow('Invalid unit system: metri');
    });

    // Success Tests
    it('should format metric weight correctly', () => {
      expect(formatWeight(70, 'metric')).toBe('70 kg');
      expect(formatWeight(68.5, 'metric')).toBe('68.5 kg');
    });

    it('should format imperial weight correctly', () => {
      expect(formatWeight(150, 'imperial')).toBe('150 lbs');
      expect(formatWeight(165.5, 'imperial')).toBe('165.5 lbs');
    });
  });
}); 