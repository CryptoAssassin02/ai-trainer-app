/**
 * @fileoverview Tests for unit conversion utilities
 */

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
    test('should convert feet and inches to centimeters correctly', () => {
      expect(convertHeightToMetric(5, 11)).toBeCloseTo(180.3, 1);
      expect(convertHeightToMetric(6, 0)).toBeCloseTo(182.9, 1);
      expect(convertHeightToMetric(5, 0)).toBeCloseTo(152.4, 1);
    });

    test('should handle feet only (assuming 0 inches)', () => {
      expect(convertHeightToMetric(5)).toBeCloseTo(152.4, 1);
      expect(convertHeightToMetric(6)).toBeCloseTo(182.9, 1);
    });

    test('should handle inches only (0 feet)', () => {
      expect(convertHeightToMetric(0, 72)).toBeCloseTo(182.9, 1);
      expect(convertHeightToMetric(0, 60)).toBeCloseTo(152.4, 1);
    });

    test('should handle zero height', () => {
      expect(convertHeightToMetric(0, 0)).toBe(0);
    });

    test('should throw error for negative values', () => {
      expect(() => convertHeightToMetric(-1, 0)).toThrow('Height measurements cannot be negative');
      expect(() => convertHeightToMetric(0, -1)).toThrow('Height measurements cannot be negative');
      expect(() => convertHeightToMetric(-1, -1)).toThrow('Height measurements cannot be negative');
    });

    test('should throw error for non-numeric inputs', () => {
      expect(() => convertHeightToMetric('5', 0)).toThrow('Feet must be a valid number');
      expect(() => convertHeightToMetric(5, '11')).toThrow('Inches must be a valid number');
      expect(() => convertHeightToMetric(NaN, 0)).toThrow('Feet must be a valid number');
      expect(() => convertHeightToMetric(5, NaN)).toThrow('Inches must be a valid number');
    });
  });

  describe('convertHeightToImperial', () => {
    test('should convert centimeters to feet and inches correctly', () => {
      const result1 = convertHeightToImperial(180);
      expect(result1.feet).toBe(5);
      expect(result1.inches).toBe(11);

      const result2 = convertHeightToImperial(152.4);
      expect(result2.feet).toBe(5);
      expect(result2.inches).toBe(0);

      const result3 = convertHeightToImperial(30.48);
      expect(result3.feet).toBe(1);
      expect(result3.inches).toBe(0);
    });

    test('should handle rounding of inches correctly', () => {
      // 182.9 cm = 6 feet 0.04 inches, should round to 6'0"
      const result = convertHeightToImperial(182.9);
      expect(result.feet).toBe(6);
      expect(result.inches).toBe(0);

      // 177.8 cm = 5 feet 10 inches
      const result2 = convertHeightToImperial(177.8);
      expect(result2.feet).toBe(5);
      expect(result2.inches).toBe(10);
    });

    test('should handle zero height', () => {
      const result = convertHeightToImperial(0);
      expect(result.feet).toBe(0);
      expect(result.inches).toBe(0);
    });

    test('should handle case where inches round up to 12', () => {
      // 182.88 cm is very close to 6 feet (with inches = 11.99)
      // Rounding should give 6'0" not 5'12"
      const result = convertHeightToImperial(182.88);
      expect(result.feet).toBe(6);
      expect(result.inches).toBe(0);
    });

    test('should throw error for negative values', () => {
      expect(() => convertHeightToImperial(-1)).toThrow('Height cannot be negative');
    });

    test('should throw error for non-numeric inputs', () => {
      expect(() => convertHeightToImperial('180')).toThrow('Centimeters must be a valid number');
      expect(() => convertHeightToImperial(NaN)).toThrow('Centimeters must be a valid number');
    });
  });

  describe('convertWeightToMetric', () => {
    test('should convert pounds to kilograms correctly', () => {
      expect(convertWeightToMetric(176)).toBeCloseTo(79.8, 1);
      expect(convertWeightToMetric(220)).toBeCloseTo(99.8, 1);
      expect(convertWeightToMetric(132)).toBeCloseTo(59.9, 1);
    });

    test('should round to 1 decimal place', () => {
      // 165 lbs = 74.84277405 kg, should round to 74.8
      expect(convertWeightToMetric(165)).toBe(74.8);
    });

    test('should handle zero weight', () => {
      expect(convertWeightToMetric(0)).toBe(0);
    });

    test('should handle large weights', () => {
      expect(convertWeightToMetric(1000)).toBeCloseTo(453.6, 1);
    });

    test('should throw error for negative values', () => {
      expect(() => convertWeightToMetric(-1)).toThrow('Weight cannot be negative');
    });

    test('should throw error for non-numeric inputs', () => {
      expect(() => convertWeightToMetric('176')).toThrow('Pounds must be a valid number');
      expect(() => convertWeightToMetric(NaN)).toThrow('Pounds must be a valid number');
    });
  });

  describe('convertWeightToImperial', () => {
    test('should convert kilograms to pounds correctly', () => {
      expect(convertWeightToImperial(80)).toBeCloseTo(176.4, 1);
      expect(convertWeightToImperial(100)).toBeCloseTo(220.5, 1);
      expect(convertWeightToImperial(60)).toBeCloseTo(132.3, 1);
    });

    test('should round to 1 decimal place', () => {
      // 75 kg = 165.3465 lbs, should round to 165.3
      expect(convertWeightToImperial(75)).toBe(165.3);
    });

    test('should handle zero weight', () => {
      expect(convertWeightToImperial(0)).toBe(0);
    });

    test('should handle large weights', () => {
      expect(convertWeightToImperial(500)).toBeCloseTo(1102.3, 1);
    });

    test('should throw error for negative values', () => {
      expect(() => convertWeightToImperial(-1)).toThrow('Weight cannot be negative');
    });

    test('should throw error for non-numeric inputs', () => {
      expect(() => convertWeightToImperial('80')).toThrow('Kilograms must be a valid number');
      expect(() => convertWeightToImperial(NaN)).toThrow('Kilograms must be a valid number');
    });
  });

  describe('convertHeight (integrated function)', () => {
    test('should return original value if fromUnit equals toUnit', () => {
      expect(convertHeight(180, 'metric', 'metric')).toBe(180);
      expect(convertHeight({ feet: 5, inches: 11 }, 'imperial', 'imperial')).toEqual({ feet: 5, inches: 11 });
    });

    test('should convert from metric to imperial', () => {
      const result = convertHeight(180, 'metric', 'imperial');
      expect(result.feet).toBe(5);
      expect(result.inches).toBe(11);
    });

    test('should convert from imperial to metric', () => {
      const result = convertHeight({ feet: 5, inches: 11 }, 'imperial', 'metric');
      expect(result).toBeCloseTo(180.3, 1);
    });

    test('should throw error for invalid unit conversion', () => {
      expect(() => convertHeight(180, 'metric', 'unknown')).toThrow('Invalid unit conversion from metric to unknown');
      expect(() => convertHeight(180, 'unknown', 'metric')).toThrow('Invalid unit conversion from unknown to metric');
    });

    test('should throw error for invalid imperial height format', () => {
      expect(() => convertHeight(180, 'imperial', 'metric')).toThrow('Imperial height must be an object with feet and inches properties');
    });
  });

  describe('convertWeight (integrated function)', () => {
    test('should return original value if fromUnit equals toUnit', () => {
      expect(convertWeight(80, 'metric', 'metric')).toBe(80);
      expect(convertWeight(176, 'imperial', 'imperial')).toBe(176);
    });

    test('should convert from metric to imperial', () => {
      expect(convertWeight(80, 'metric', 'imperial')).toBeCloseTo(176.4, 1);
    });

    test('should convert from imperial to metric', () => {
      expect(convertWeight(176, 'imperial', 'metric')).toBeCloseTo(79.8, 1);
    });

    test('should throw error for invalid unit conversion', () => {
      expect(() => convertWeight(80, 'metric', 'unknown')).toThrow('Invalid unit conversion from metric to unknown');
      expect(() => convertWeight(80, 'unknown', 'metric')).toThrow('Invalid unit conversion from unknown to metric');
    });
  });

  describe('formatHeight', () => {
    test('should format metric height correctly', () => {
      expect(formatHeight(180, 'metric')).toBe('180 cm');
      expect(formatHeight(175.5, 'metric')).toBe('175.5 cm');
    });

    test('should format and convert to imperial height correctly', () => {
      expect(formatHeight(180, 'imperial')).toBe('5\'11"');
      expect(formatHeight(152.4, 'imperial')).toBe('5\'0"');
      expect(formatHeight(30.48, 'imperial')).toBe('1\'0"');
    });

    test('should throw error for invalid values', () => {
      expect(() => formatHeight(-1, 'metric')).toThrow('Height cannot be negative');
      expect(() => formatHeight('180', 'metric')).toThrow('Height value must be a valid number');
      expect(() => formatHeight(NaN, 'metric')).toThrow('Height value must be a valid number');
    });

    test('should throw error for invalid unit system', () => {
      expect(() => formatHeight(180, 'unknown')).toThrow('Invalid unit system: unknown');
    });
  });

  describe('formatWeight', () => {
    test('should format metric weight correctly', () => {
      expect(formatWeight(80, 'metric')).toBe('80 kg');
      expect(formatWeight(75.5, 'metric')).toBe('75.5 kg');
    });

    test('should format imperial weight correctly', () => {
      expect(formatWeight(176, 'imperial')).toBe('176 lbs');
      expect(formatWeight(165.3, 'imperial')).toBe('165.3 lbs');
    });

    test('should throw error for invalid values', () => {
      expect(() => formatWeight(-1, 'metric')).toThrow('Weight cannot be negative');
      expect(() => formatWeight('80', 'metric')).toThrow('Weight value must be a valid number');
      expect(() => formatWeight(NaN, 'metric')).toThrow('Weight value must be a valid number');
    });

    test('should throw error for invalid unit system', () => {
      expect(() => formatWeight(80, 'unknown')).toThrow('Invalid unit system: unknown');
    });
  });
}); 