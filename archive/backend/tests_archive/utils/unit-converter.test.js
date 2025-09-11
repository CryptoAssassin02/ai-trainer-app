/**
 * @fileoverview Tests for the UnitConverter class
 */

const { UnitConverter, CONVERSION_CONSTANTS } = require('../../utils/unit-converter');

// Mock logger for testing
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

describe('UnitConverter', () => {
    let converter;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        converter = new UnitConverter({ logger: mockLogger });
    });

    describe('constructor', () => {
        it('should initialize with provided logger', () => {
            const customLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
            const customConverter = new UnitConverter({ logger: customLogger });
            expect(customConverter.logger).toBe(customLogger);
        });

        it('should use default logger if none provided', () => {
            const defaultConverter = new UnitConverter();
            expect(defaultConverter.logger).toBeDefined();
            expect(defaultConverter.logger).not.toBe(mockLogger);
        });
    });

    describe('validateNumericValue', () => {
        it('should not throw for valid numbers', () => {
            expect(() => converter.validateNumericValue(10, 'Test')).not.toThrow();
            expect(() => converter.validateNumericValue(0, 'Test')).not.toThrow();
            expect(() => converter.validateNumericValue(0.5, 'Test')).not.toThrow();
        });

        it('should throw for non-numbers', () => {
            expect(() => converter.validateNumericValue('10', 'Test')).toThrow('Test must be a valid number');
            expect(() => converter.validateNumericValue(null, 'Test')).toThrow('Test must be a valid number');
            expect(() => converter.validateNumericValue(undefined, 'Test')).toThrow('Test must be a valid number');
            expect(() => converter.validateNumericValue(NaN, 'Test')).toThrow('Test must be a valid number');
            expect(mockLogger.error).toHaveBeenCalledTimes(4);
        });

        it('should throw for negative numbers when not allowed', () => {
            expect(() => converter.validateNumericValue(-5, 'Test', true, false)).toThrow('Test cannot be negative');
            expect(mockLogger.error).toHaveBeenCalledTimes(1);
        });

        it('should not throw for negative numbers when allowed', () => {
            expect(() => converter.validateNumericValue(-5, 'Test', true, true)).not.toThrow();
        });

        it('should throw for zero when not allowed', () => {
            expect(() => converter.validateNumericValue(0, 'Test', false)).toThrow('Test cannot be zero');
            expect(mockLogger.error).toHaveBeenCalledTimes(1);
        });
    });

    describe('validateUnitType', () => {
        it('should not throw for valid unit types', () => {
            expect(() => converter.validateUnitType('metric')).not.toThrow();
            expect(() => converter.validateUnitType('imperial')).not.toThrow();
            expect(() => converter.validateUnitType('METRIC')).not.toThrow();
            expect(() => converter.validateUnitType('Imperial')).not.toThrow();
        });

        it('should throw for invalid unit types', () => {
            expect(() => converter.validateUnitType('meters')).toThrow('Unit type must be one of: metric, imperial');
            expect(() => converter.validateUnitType('')).toThrow('Unit type must be one of: metric, imperial');
            expect(() => converter.validateUnitType(null)).toThrow('Unit type must be one of: metric, imperial');
            expect(() => converter.validateUnitType(undefined)).toThrow('Unit type must be one of: metric, imperial');
            expect(mockLogger.error).toHaveBeenCalledTimes(4);
        });

        it('should use custom parameter name in error message', () => {
            expect(() => converter.validateUnitType('invalid', 'Source unit')).toThrow('Source unit must be one of: metric, imperial');
            expect(mockLogger.error).toHaveBeenCalledTimes(1);
        });
    });

    describe('convertHeightToMetric', () => {
        it('should convert feet and inches to centimeters correctly', () => {
            expect(converter.convertHeightToMetric(5, 11)).toBeCloseTo(180.3, 1);
            expect(converter.convertHeightToMetric(6, 0)).toBeCloseTo(182.9, 1);
            expect(converter.convertHeightToMetric(5, 0)).toBeCloseTo(152.4, 1);
        });

        it('should handle feet only (assuming 0 inches)', () => {
            expect(converter.convertHeightToMetric(5)).toBeCloseTo(152.4, 1);
        });

        it('should handle zero height', () => {
            expect(converter.convertHeightToMetric(0, 0)).toBe(0);
        });

        it('should throw error for negative values', () => {
            expect(() => converter.convertHeightToMetric(-1, 0)).toThrow('Height measurements cannot be negative');
            expect(() => converter.convertHeightToMetric(0, -1)).toThrow('Height measurements cannot be negative');
            expect(mockLogger.error).toHaveBeenCalledTimes(2);
        });

        it('should throw error for non-numeric inputs', () => {
            expect(() => converter.convertHeightToMetric('5', 0)).toThrow('Feet must be a valid number');
            expect(() => converter.convertHeightToMetric(5, '11')).toThrow('Inches must be a valid number');
            expect(mockLogger.error).toHaveBeenCalledTimes(2);
        });
    });

    describe('convertHeightToImperial', () => {
        it('should convert centimeters to feet and inches correctly', () => {
            const result1 = converter.convertHeightToImperial(180);
            expect(result1.feet).toBe(5);
            expect(result1.inches).toBe(11);

            const result2 = converter.convertHeightToImperial(152.4);
            expect(result2.feet).toBe(5);
            expect(result2.inches).toBe(0);
        });

        it('should handle rounding of inches correctly', () => {
            // 182.9 cm = 6 feet 0.04 inches, should round to 6'0"
            const result = converter.convertHeightToImperial(182.9);
            expect(result.feet).toBe(6);
            expect(result.inches).toBe(0);
        });

        it('should handle case where inches round up to 12', () => {
            // 182.88 cm is very close to 6 feet (with inches = 11.99)
            // Rounding should give 6'0" not 5'12"
            const result = converter.convertHeightToImperial(182.88);
            expect(result.feet).toBe(6);
            expect(result.inches).toBe(0);
        });

        it('should throw error for negative values', () => {
            expect(() => converter.convertHeightToImperial(-1)).toThrow('Centimeters cannot be negative');
            expect(mockLogger.error).toHaveBeenCalledTimes(1);
        });

        it('should throw error for non-numeric inputs', () => {
            expect(() => converter.convertHeightToImperial('180')).toThrow('Centimeters must be a valid number');
            expect(() => converter.convertHeightToImperial(NaN)).toThrow('Centimeters must be a valid number');
            expect(mockLogger.error).toHaveBeenCalledTimes(2);
        });
    });

    describe('convertWeightToMetric', () => {
        it('should convert pounds to kilograms correctly', () => {
            expect(converter.convertWeightToMetric(176)).toBeCloseTo(79.8, 1);
            expect(converter.convertWeightToMetric(220)).toBeCloseTo(99.8, 1);
            expect(converter.convertWeightToMetric(132)).toBeCloseTo(59.9, 1);
        });

        it('should round to 1 decimal place', () => {
            // 165 lbs = 74.84277405 kg, should round to 74.8
            expect(converter.convertWeightToMetric(165)).toBe(74.8);
        });

        it('should handle zero weight', () => {
            expect(converter.convertWeightToMetric(0)).toBe(0);
        });

        it('should throw error for negative values', () => {
            expect(() => converter.convertWeightToMetric(-1)).toThrow('Pounds cannot be negative');
            expect(mockLogger.error).toHaveBeenCalledTimes(1);
        });

        it('should throw error for non-numeric inputs', () => {
            expect(() => converter.convertWeightToMetric('176')).toThrow('Pounds must be a valid number');
            expect(() => converter.convertWeightToMetric(NaN)).toThrow('Pounds must be a valid number');
            expect(mockLogger.error).toHaveBeenCalledTimes(2);
        });
    });

    describe('convertWeightToImperial', () => {
        it('should convert kilograms to pounds correctly', () => {
            expect(converter.convertWeightToImperial(80)).toBeCloseTo(176.4, 1);
            expect(converter.convertWeightToImperial(100)).toBeCloseTo(220.5, 1);
            expect(converter.convertWeightToImperial(60)).toBeCloseTo(132.3, 1);
        });

        it('should round to 1 decimal place', () => {
            // 75 kg = 165.3465 lbs, should round to 165.3
            expect(converter.convertWeightToImperial(75)).toBe(165.3);
        });

        it('should handle zero weight', () => {
            expect(converter.convertWeightToImperial(0)).toBe(0);
        });

        it('should throw error for negative values', () => {
            expect(() => converter.convertWeightToImperial(-1)).toThrow('Kilograms cannot be negative');
            expect(mockLogger.error).toHaveBeenCalledTimes(1);
        });

        it('should throw error for non-numeric inputs', () => {
            expect(() => converter.convertWeightToImperial('80')).toThrow('Kilograms must be a valid number');
            expect(() => converter.convertWeightToImperial(NaN)).toThrow('Kilograms must be a valid number');
            expect(mockLogger.error).toHaveBeenCalledTimes(2);
        });
    });

    describe('convertHeight (integrated function)', () => {
        it('should return original value if fromUnit equals toUnit', () => {
            expect(converter.convertHeight(180, 'metric', 'metric')).toBe(180);
            expect(converter.convertHeight({ feet: 5, inches: 11 }, 'imperial', 'imperial'))
                .toEqual({ feet: 5, inches: 11 });
        });

        it('should convert from metric to imperial', () => {
            const result = converter.convertHeight(180, 'metric', 'imperial');
            expect(result.feet).toBe(5);
            expect(result.inches).toBe(11);
        });

        it('should convert from imperial to metric when height is an object', () => {
            const result = converter.convertHeight({ feet: 5, inches: 11 }, 'imperial', 'metric');
            expect(result).toBeCloseTo(180.3, 1);
        });

        it('should convert from imperial to metric when height is a number (total inches)', () => {
            // 5'11" = 71 inches
            const result = converter.convertHeight(71, 'imperial', 'metric');
            expect(result).toBeCloseTo(180.3, 1);
        });

        it('should throw error for invalid unit conversion', () => {
            expect(() => converter.convertHeight(180, 'metric', 'unknown')).toThrow('Invalid unit conversion from metric to unknown');
            expect(() => converter.convertHeight(180, 'unknown', 'metric')).toThrow('Invalid unit conversion from unknown to metric');
            expect(mockLogger.error).toHaveBeenCalledTimes(2);
        });

        it('should throw error for invalid imperial height format', () => {
            expect(() => converter.convertHeight("5'11\"", 'imperial', 'metric'))
                .toThrow('Imperial height must be a number (total inches) or an object with feet and inches properties');
            expect(mockLogger.error).toHaveBeenCalledTimes(1);
        });

        it('should handle case-insensitive unit names', () => {
            expect(converter.convertHeight(180, 'METRIC', 'imperial').feet).toBe(5);
            expect(converter.convertHeight(180, 'Metric', 'Imperial').feet).toBe(5);
        });
    });

    describe('convertWeight (integrated function)', () => {
        it('should return original value if fromUnit equals toUnit', () => {
            expect(converter.convertWeight(80, 'metric', 'metric')).toBe(80);
            expect(converter.convertWeight(176, 'imperial', 'imperial')).toBe(176);
        });

        it('should convert from metric to imperial', () => {
            expect(converter.convertWeight(80, 'metric', 'imperial')).toBeCloseTo(176.4, 1);
        });

        it('should convert from imperial to metric', () => {
            expect(converter.convertWeight(176, 'imperial', 'metric')).toBeCloseTo(79.8, 1);
        });

        it('should throw error for invalid unit conversion', () => {
            expect(() => converter.convertWeight(80, 'metric', 'unknown')).toThrow('Invalid unit conversion from metric to unknown');
            expect(() => converter.convertWeight(80, 'unknown', 'metric')).toThrow('Invalid unit conversion from unknown to metric');
            expect(mockLogger.error).toHaveBeenCalledTimes(2);
        });

        it('should handle case-insensitive unit names', () => {
            expect(converter.convertWeight(80, 'METRIC', 'imperial')).toBeCloseTo(176.4, 1);
            expect(converter.convertWeight(80, 'Metric', 'Imperial')).toBeCloseTo(176.4, 1);
        });
    });

    describe('formatHeight', () => {
        it('should format metric height correctly', () => {
            expect(converter.formatHeight(180, 'metric')).toBe('180 cm');
            expect(converter.formatHeight(175.5, 'metric')).toBe('175.5 cm');
        });

        it('should format and convert to imperial height correctly', () => {
            expect(converter.formatHeight(180, 'imperial')).toBe('5\'11"');
            expect(converter.formatHeight(152.4, 'imperial')).toBe('5\'0"');
            expect(converter.formatHeight(30.48, 'imperial')).toBe('1\'0"');
        });

        it('should throw error for invalid values', () => {
            expect(() => converter.formatHeight(-1, 'metric')).toThrow('Height value cannot be negative');
            expect(() => converter.formatHeight('180', 'metric')).toThrow('Height value must be a valid number');
            expect(mockLogger.error).toHaveBeenCalledTimes(2);
        });

        it('should throw error for invalid unit system', () => {
            expect(() => converter.formatHeight(180, 'unknown')).toThrow('Unit system must be one of: metric, imperial');
            expect(mockLogger.error).toHaveBeenCalledTimes(1);
        });
    });

    describe('formatWeight', () => {
        it('should format metric weight correctly', () => {
            expect(converter.formatWeight(80, 'metric')).toBe('80 kg');
            expect(converter.formatWeight(75.5, 'metric')).toBe('75.5 kg');
        });

        it('should format imperial weight correctly', () => {
            expect(converter.formatWeight(176, 'imperial')).toBe('176 lbs');
            expect(converter.formatWeight(165.3, 'imperial')).toBe('165.3 lbs');
        });

        it('should throw error for invalid values', () => {
            expect(() => converter.formatWeight(-1, 'metric')).toThrow('Weight value cannot be negative');
            expect(() => converter.formatWeight('80', 'metric')).toThrow('Weight value must be a valid number');
            expect(mockLogger.error).toHaveBeenCalledTimes(2);
        });

        it('should throw error for invalid unit system', () => {
            expect(() => converter.formatWeight(80, 'unknown')).toThrow('Unit system must be one of: metric, imperial');
            expect(mockLogger.error).toHaveBeenCalledTimes(1);
        });
    });

    describe('convertUserProfile', () => {
        const metricProfile = {
            id: '123',
            name: 'Test User',
            height: 180,
            weight: 80,
            preferences: { units: 'metric', theme: 'dark' }
        };

        const imperialProfile = {
            id: '123',
            name: 'Test User',
            height: { feet: 5, inches: 11 },
            weight: 176.4,
            preferences: { units: 'imperial', theme: 'dark' }
        };

        it('should convert profile from metric to imperial', () => {
            const converted = converter.convertUserProfile(metricProfile, 'metric', 'imperial');
            
            // Check that original profile is not modified
            expect(metricProfile.height).toBe(180);
            expect(metricProfile.weight).toBe(80);
            expect(metricProfile.preferences.units).toBe('metric');
            
            // Check converted values
            expect(converted.id).toBe('123');
            expect(converted.name).toBe('Test User');
            expect(converted.height.feet).toBe(5);
            expect(converted.height.inches).toBe(11);
            expect(converted.weight).toBeCloseTo(176.4, 1);
            expect(converted.preferences.units).toBe('imperial');
            expect(converted.preferences.theme).toBe('dark');
            
            expect(mockLogger.info).toHaveBeenCalledWith('Converted user profile from metric to imperial');
        });

        it('should convert profile from imperial to metric', () => {
            const converted = converter.convertUserProfile(imperialProfile, 'imperial', 'metric');
            
            // Check converted values
            expect(converted.id).toBe('123');
            expect(converted.name).toBe('Test User');
            expect(converted.height).toBeCloseTo(180.3, 1);
            expect(converted.weight).toBeCloseTo(80, 1);
            expect(converted.preferences.units).toBe('metric');
            expect(converted.preferences.theme).toBe('dark');
            
            expect(mockLogger.info).toHaveBeenCalledWith('Converted user profile from imperial to metric');
        });

        it('should return a copy with same values if fromUnit equals toUnit', () => {
            const result = converter.convertUserProfile(metricProfile, 'metric', 'metric');
            expect(result).not.toBe(metricProfile); // Should be a new object
            expect(result).toEqual(metricProfile); // With same values
        });

        it('should handle missing height or weight gracefully', () => {
            const incomplete = {
                id: '123',
                name: 'Test User',
                // Missing height and weight
                preferences: { units: 'metric', theme: 'dark' }
            };
            
            const converted = converter.convertUserProfile(incomplete, 'metric', 'imperial');
            expect(converted.id).toBe('123');
            expect(converted.height).toBeUndefined();
            expect(converted.weight).toBeUndefined();
            expect(converted.preferences.units).toBe('imperial');
        });

        it('should handle missing preferences gracefully', () => {
            const profileWithoutPrefs = {
                id: '123',
                name: 'Test User',
                height: 180,
                weight: 80
                // No preferences object
            };
            
            const converted = converter.convertUserProfile(profileWithoutPrefs, 'metric', 'imperial');
            expect(converted.id).toBe('123');
            expect(converted.height.feet).toBe(5);
            expect(converted.height.inches).toBe(11);
            expect(converted.weight).toBeCloseTo(176.4, 1);
            expect(converted.preferences).toBeUndefined();
        });

        it('should throw error for invalid unit types', () => {
            expect(() => converter.convertUserProfile(metricProfile, 'meters', 'imperial'))
                .toThrow('From unit must be one of: metric, imperial');
            expect(() => converter.convertUserProfile(metricProfile, 'metric', 'pounds'))
                .toThrow('To unit must be one of: metric, imperial');
            expect(mockLogger.error).toHaveBeenCalledTimes(2);
        });

        it('should propagate conversion errors with clear messages', () => {
            const invalidProfile = {
                id: '123',
                name: 'Test User',
                height: 'not a number', // Invalid height
                weight: 80,
                preferences: { units: 'metric' }
            };
            
            expect(() => converter.convertUserProfile(invalidProfile, 'metric', 'imperial'))
                .toThrow('Profile conversion failed: Height must be a valid number');
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
}); 