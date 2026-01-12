const {
    calculateBMR,
    calculateTDEE,
    calculateMacros,
    convertWeight,
    convertHeight,
    validateBMRInputs,
    TDEE_MULTIPLIERS
} = require('../../utils/nutrition-formulas');

// Mock logger to prevent console output during tests and check logs
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

describe('Nutrition Formulas Utilities', () => {

    describe('validateBMRInputs', () => {
        const validMetricUser = {
            age: 30,
            weight: 75, // kg
            height: 180, // cm
            gender: 'male',
            units: 'metric'
        };

        it('should return true for valid metric input', () => {
            expect(validateBMRInputs(validMetricUser, mockLogger)).toBe(true);
        });

        it('should return true for valid imperial input', () => {
            const validImperialUser = {
                age: 25,
                weight: 154, // lbs
                height: 70, // inches (or could be { feet: 5, inches: 10 })
                gender: 'female',
                units: 'imperial'
            };
            expect(validateBMRInputs(validImperialUser, mockLogger)).toBe(true);
        });

        test.each([
            ['missing age', { ...validMetricUser, age: undefined }],
            ['missing weight', { ...validMetricUser, weight: null }],
            ['missing height', { ...validMetricUser, height: undefined }],
            ['missing gender', { ...validMetricUser, gender: null }],
            ['missing units', { ...validMetricUser, units: undefined }],
            ['invalid age (zero)', { ...validMetricUser, age: 0 }],
            ['invalid age (negative)', { ...validMetricUser, age: -5 }],
            ['invalid age (too high)', { ...validMetricUser, age: 130 }],
            ['invalid weight', { ...validMetricUser, weight: -70 }],
            ['invalid height', { ...validMetricUser, height: 0 }],
            ['invalid gender', { ...validMetricUser, gender: 'other' }],
            ['invalid units', { ...validMetricUser, units: 'stone' }],
        ])('should throw error for %s', (desc, userData) => {
            expect(() => validateBMRInputs(userData, mockLogger)).toThrow(Error);
            // Check if logger.error was called (optional)
            // expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('convertWeight', () => {
        it('should convert kg to lbs correctly', () => {
            expect(convertWeight(75, 'kg', 'lbs')).toBeCloseTo(165.3465);
        });
        it('should convert lbs to kg correctly', () => {
            expect(convertWeight(165, 'lbs', 'kg')).toBeCloseTo(74.8427);
        });
        it('should return same value if units match', () => {
            expect(convertWeight(80, 'kg', 'kg')).toBe(80);
        });
        it('should throw error for invalid units', () => {
            expect(() => convertWeight(70, 'kg', 'stone')).toThrow('Invalid weight conversion');
        });
    });

    describe('convertHeight', () => {
        it('should convert cm to in correctly', () => {
            expect(convertHeight(180, 'cm', 'in')).toBeCloseTo(70.866);
        });
        it('should convert in to cm correctly', () => {
            expect(convertHeight(70, 'in', 'cm')).toBeCloseTo(177.8);
        });
        it('should convert ft_in object to cm correctly', () => {
            expect(convertHeight({ feet: 5, inches: 10 }, 'ft_in', 'cm')).toBeCloseTo(177.8);
        });
        it('should convert ft_in object to inches correctly', () => {
            expect(convertHeight({ feet: 6, inches: 1 }, 'ft_in', 'in')).toBeCloseTo(73);
        });
         it('should handle total inches number with ft_in unit for cm conversion and log warning', () => {
            expect(convertHeight(70, 'ft_in', 'cm', mockLogger)).toBeCloseTo(177.8);
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('assuming total inches'));
        });
        it('should return same value if units match (cm)', () => {
            expect(convertHeight(175, 'cm', 'cm')).toBe(175);
        });
         it('should return same value if units match (in)', () => {
             // Need to convert cm to inches first for this test case if base is cm
             const inches = convertHeight(177.8, 'cm', 'in');
             expect(convertHeight(inches, 'in', 'in')).toBeCloseTo(inches);
         });
        it('should throw error for invalid source unit', () => {
            expect(() => convertHeight(180, 'meters', 'cm')).toThrow('Invalid source height unit');
        });
         it('should throw error for invalid target unit', () => {
            expect(() => convertHeight(180, 'cm', 'meters')).toThrow('Invalid target height unit');
        });
        it('should throw error for invalid ft_in value type', () => {
            expect(() => convertHeight({ feet: 5 }, 'ft_in', 'cm')).toThrow('Invalid height value for ft_in unit');
            expect(() => convertHeight('5 feet 10 inches', 'ft_in', 'cm')).toThrow('Invalid height value for ft_in unit');
        });
         it('should throw error for invalid cm value type', () => {
             expect(() => convertHeight({ value: 180 }, 'cm', 'in')).toThrow('Invalid height value for cm unit');
         });
    });

    describe('calculateBMR', () => {
        it('should calculate BMR correctly for metric male', () => {
            const user = { age: 30, weight: 75, height: 180, gender: 'male', units: 'metric' };
            // BMR = (10 * 75) + (6.25 * 180) - (5 * 30) + 5 = 750 + 1125 - 150 + 5 = 1730
            expect(calculateBMR(user, mockLogger)).toBe(1730);
        });

        it('should calculate BMR correctly for metric female', () => {
            const user = { age: 25, weight: 60, height: 165, gender: 'female', units: 'metric' };
            // BMR = (10 * 60) + (6.25 * 165) - (5 * 25) - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
            expect(calculateBMR(user, mockLogger)).toBe(1345);
        });

        it('should calculate BMR correctly for imperial male (using ft/in object)', () => {
            const user = { age: 40, weight: 180, height: { feet: 6, inches: 0 }, gender: 'male', units: 'imperial' };
            // Weight: 180 lbs -> 180 * 0.453592 = 81.64656 kg
            // Height: 6'0" -> 72 inches -> 72 * 2.54 = 182.88 cm
            // BMR = (10 * 81.64656) + (6.25 * 182.88) - (5 * 40) + 5 = 816.4656 + 1143 - 200 + 5 = 1764.4656
            expect(calculateBMR(user, mockLogger)).toBe(1764);
        });

         it('should calculate BMR correctly for imperial female (using total inches)', () => {
             const user = { age: 35, weight: 140, height: 66, gender: 'female', units: 'imperial' };
             // Weight: 140 lbs -> 140 * 0.453592 = 63.50288 kg
             // Height: 66 inches -> 66 * 2.54 = 167.64 cm
             // BMR = (10 * 63.50288) + (6.25 * 167.64) - (5 * 35) - 161 = 635.0288 + 1047.75 - 175 - 161 = 1346.7788
             expect(calculateBMR(user, mockLogger)).toBe(1347);
         });

        it('should throw error for invalid inputs', () => {
            const invalidUser = { age: 30, weight: 75, height: 180, gender: 'other', units: 'metric' };
            expect(() => calculateBMR(invalidUser, mockLogger)).toThrow('Invalid gender');
        });
    });

    describe('calculateTDEE', () => {
        const bmr = 1700;
        it('should calculate TDEE correctly for sedentary', () => {
            expect(calculateTDEE(bmr, 'sedentary', mockLogger)).toBe(Math.round(1700 * 1.2)); // 2040
        });
        it('should calculate TDEE correctly for lightly_active', () => {
            expect(calculateTDEE(bmr, 'lightly_active', mockLogger)).toBe(Math.round(1700 * 1.375)); // 2338
        });
         it('should calculate TDEE correctly for moderately_active', () => {
            expect(calculateTDEE(bmr, 'moderately_active', mockLogger)).toBe(Math.round(1700 * 1.55)); // 2635
        });
        it('should calculate TDEE correctly for very_active', () => {
            expect(calculateTDEE(bmr, 'very_active', mockLogger)).toBe(Math.round(1700 * 1.725)); // 2933
        });
        it('should calculate TDEE correctly for extra_active', () => {
            expect(calculateTDEE(bmr, 'extra_active', mockLogger)).toBe(Math.round(1700 * 1.9)); // 3230
        });
         it('should handle alias activity levels (e.g., daily)', () => {
             expect(calculateTDEE(bmr, 'daily', mockLogger)).toBe(Math.round(1700 * TDEE_MULTIPLIERS.daily)); // Should match very_active
         });

        it('should throw error for invalid BMR', () => {
            expect(() => calculateTDEE(0, 'sedentary', mockLogger)).toThrow('Invalid BMR');
            expect(() => calculateTDEE(-100, 'sedentary', mockLogger)).toThrow('Invalid BMR');
        });
        it('should throw error for missing activity level', () => {
             expect(() => calculateTDEE(bmr, null, mockLogger)).toThrow('Activity level must be provided');
         });

        it('should throw error for unrecognized activity level', () => {
            expect(() => calculateTDEE(bmr, 'super_active', mockLogger)).toThrow('Unrecognized activity level');
        });
    });

    describe('calculateMacros', () => {
        const tdee = 2500;

        it('should calculate macros for maintenance goal', () => {
            const goals = ['maintenance'];
            // Defaults: P=20%, C=50%, F=30%
            // P = 2500 * 0.20 / 4 = 125g
            // C = 2500 * 0.50 / 4 = 312.5g -> 313g
            // F = 2500 * 0.30 / 9 = 83.33g -> 83g
            // Calories = (125*4) + (313*4) + (83*9) = 500 + 1252 + 747 = 2499
            expect(calculateMacros(tdee, goals, mockLogger)).toEqual({
                protein_g: 125,
                carbs_g: 313,
                fat_g: 83,
                calories: 2499 // Recalculated from grams
            });
        });

        it('should calculate macros for weight_loss goal', () => {
            const goals = ['weight_loss'];
            // Weight Loss: P=30%, F=25%, C=45%
            // P = 2500 * 0.30 / 4 = 187.5g -> 188g
            // F = 2500 * 0.25 / 9 = 69.44g -> 69g
            // C = 2500 * 0.45 / 4 = 281.25g -> 281g
            // Calories = (188*4) + (281*4) + (69*9) = 752 + 1124 + 621 = 2497
            expect(calculateMacros(tdee, goals, mockLogger)).toEqual({
                protein_g: 188,
                carbs_g: 281,
                fat_g: 69,
                calories: 2497
            });
        });

        it('should calculate macros for muscle_gain goal', () => {
            const goals = ['muscle_gain', 'strength']; // Takes first recognized goal
            // Muscle Gain: P=30%, C=45%, F=25%
            // Same as weight loss percentages in this setup, might need refinement
             expect(calculateMacros(tdee, goals, mockLogger)).toEqual({
                 protein_g: 188,
                 carbs_g: 281,
                 fat_g: 69,
                 calories: 2497
             });
        });

         it('should calculate macros for endurance goal', () => {
            const goals = ['endurance'];
            // Endurance: P=20%, C=55%, F=25%
            // P = 2500 * 0.20 / 4 = 125g
            // C = 2500 * 0.55 / 4 = 343.75g -> 344g
            // F = 2500 * 0.25 / 9 = 69.44g -> 69g
            // Calories = (125*4) + (344*4) + (69*9) = 500 + 1376 + 621 = 2497
            expect(calculateMacros(tdee, goals, mockLogger)).toEqual({
                protein_g: 125,
                carbs_g: 344,
                fat_g: 69,
                calories: 2497
            });
        });

        it('should default to maintenance if goals array is empty or has unrecognized goals', () => {
            expect(calculateMacros(tdee, [], mockLogger)).toEqual(calculateMacros(tdee, ['maintenance']));
            expect(calculateMacros(tdee, ['get_toned'], mockLogger)).toEqual(calculateMacros(tdee, ['maintenance']));
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No goals provided'));
        });

        it('should throw error for invalid TDEE', () => {
            expect(() => calculateMacros(0, ['maintenance'], mockLogger)).toThrow('Invalid TDEE');
            expect(() => calculateMacros(-1000, ['maintenance'], mockLogger)).toThrow('Invalid TDEE');
        });
    });
}); 