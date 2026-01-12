'use strict';

const {
    getAdditionalInstructions,
    buildExerciseQuery,
    buildTechniqueQuery,
    buildProgressionQuery,
    buildNutritionQuery,
    systemPrompt,
    exerciseQuerySchema,
    techniqueQuerySchema,
    progressionQuerySchema,
    queryTypeToSchema,
    nutritionSchema,
} = require('../../utils/research-prompts');

describe('Research Prompts Utilities', () => {

    describe('getAdditionalInstructions', () => {
        it('should return an empty string for default inputs', () => {
            expect(getAdditionalInstructions()).toBe('');
            expect(getAdditionalInstructions({}, {})).toBe('');
        });

        it('should include beginner instruction when fitnessLevel is beginner', () => {
            const profile = { fitnessLevel: 'beginner' };
            expect(getAdditionalInstructions(profile, {})).toBe('Explain in simple terms suitable for beginners.');
        });

        it('should not include beginner instruction for non-beginner levels', () => {
            const profile = { fitnessLevel: 'intermediate' };
            expect(getAdditionalInstructions(profile, {})).toBe('');
        });

        it('should include injury instruction for string constraint', () => {
            const constraints = { injury: 'knee' };
            expect(getAdditionalInstructions({}, constraints)).toBe('Avoid exercises that stress the knee.');
        });

        it('should include joined injury instruction for array constraint', () => {
            const constraints = { injury: ['knee', 'shoulder'] };
            expect(getAdditionalInstructions({}, constraints)).toBe('Avoid exercises that stress the knee and shoulder.');
        });

        it('should handle empty injury array', () => {
            const constraints = { injury: [] };
            expect(getAdditionalInstructions({}, constraints)).toBe('');
        });

        it('should combine beginner and injury instructions', () => {
            const profile = { fitnessLevel: 'beginner' };
            const constraints = { injury: 'back' };
            expect(getAdditionalInstructions(profile, constraints))
                .toBe('Explain in simple terms suitable for beginners. Avoid exercises that stress the back.');
        });
    });

    describe('buildExerciseQuery', () => {
        const baseMuscle = 'chest';
        const baseLevel = 'intermediate';

        it('should build a query with all arguments provided (string constraints/equipment)', () => {
            const query = buildExerciseQuery(baseMuscle, baseLevel, 'dumbbells', 'shoulder injury', 'Focus on form.');
            expect(query).toContain('targeting chest');
            expect(query).toContain('suitable for intermediate users');
            expect(query).toContain('with dumbbells');
            expect(query).toContain('limitations: shoulder injury');
            expect(query).toContain('Focus on form.');
        });

        it('should build a query with all arguments provided (array constraints/equipment)', () => {
            const query = buildExerciseQuery(baseMuscle, baseLevel, ['barbell', 'bench'], ['knee pain', 'lower back stiffness'], 'Prioritize safety.');
            expect(query).toContain('targeting chest');
            expect(query).toContain('suitable for intermediate users');
            expect(query).toContain('with barbell, bench');
            expect(query).toContain('limitations: knee pain, lower back stiffness');
            expect(query).toContain('Prioritize safety.');
        });

        it('should use defaults for omitted optional arguments', () => {
            const query = buildExerciseQuery(baseMuscle, baseLevel);
            expect(query).toContain('targeting chest');
            expect(query).toContain('suitable for intermediate users');
            expect(query).toContain('with any'); // Default equipment
            expect(query).toContain('limitations: none'); // Default constraints
            expect(query.trim().endsWith('.')).toBe(false);
        });

        it('should use defaults for omitted required arguments (muscleGroup, fitnessLevel)', () => {
            const query = buildExerciseQuery(null, null, 'bodyweight');
            expect(query).toContain('targeting any'); // Default muscle group
            expect(query).toContain('suitable for any users'); // Default fitness level
            expect(query).toContain('with bodyweight');
            expect(query).toContain('limitations: none');
        });

        it('should handle empty strings/arrays for optional args', () => {
            const query = buildExerciseQuery(baseMuscle, baseLevel, [], '', '');
             expect(query).toContain('targeting chest');
            expect(query).toContain('suitable for intermediate users');
            expect(query).toContain('with any'); // Should default if empty array provided
            expect(query).toContain('limitations: none'); // Should default if empty string provided
            expect(query.trim().endsWith('.')).toBe(false);
        });
    });

    describe('buildTechniqueQuery', () => {
        it('should build a query with all arguments', () => {
            const query = buildTechniqueQuery('Deadlift', 'advanced', 'Focus on hip hinge.');
            expect(query).toContain('technique for Deadlift');
            expect(query).toContain('suitable for advanced users');
            expect(query).toContain('Focus on hip hinge.');
        });

        it('should use defaults for omitted arguments', () => {
            const query = buildTechniqueQuery();
            expect(query).toContain('technique for general technique'); // Default technique
            expect(query).toContain('suitable for any users'); // Default level
            expect(query.trim().endsWith('.')).toBe(false); // No trailing dot
        });
    });

    describe('buildProgressionQuery', () => {
        it('should build a query with all arguments', () => {
            const query = buildProgressionQuery('Pull-up', 'intermediate', 'Include assistance bands.');
            expect(query).toContain('progressions for Pull-up');
            expect(query).toContain('suitable for intermediate users');
            expect(query).toContain('Include assistance bands.');
        });

        it('should use defaults for omitted arguments', () => {
            const query = buildProgressionQuery();
            expect(query).toContain('progressions for basic exercise'); // Default exercise
            expect(query).toContain('suitable for any users'); // Default level
            expect(query.trim().endsWith('.')).toBe(false); // No trailing dot
        });
    });

    describe('buildNutritionQuery', () => {
        it('should build a query with all arguments (string restrictions)', () => {
            const query = buildNutritionQuery('fat loss', 'gluten-free', 'Keep it simple.');
            expect(query).toContain('strategies for fat loss');
            expect(query).toContain('considering gluten-free');
            expect(query).toContain('Keep it simple.');
        });

        it('should build a query with all arguments (array restrictions)', () => {
            const query = buildNutritionQuery('muscle gain', ['dairy-free', 'nut-free'], 'Focus on whole foods.');
            expect(query).toContain('strategies for muscle gain');
            expect(query).toContain('considering dairy-free, nut-free');
            expect(query).toContain('Focus on whole foods.');
        });

        it('should use defaults for omitted arguments', () => {
            const query = buildNutritionQuery();
            expect(query).toContain('strategies for general health'); // Default goal
            expect(query).toContain('considering none'); // Default restrictions
            expect(query.trim().endsWith('.')).toBe(false); // No trailing dot
        });

        it('should handle empty string/array for restrictions', () => {
            const query = buildNutritionQuery('endurance', [], '');
            expect(query).toContain('strategies for endurance');
            expect(query).toContain('considering none'); // Default restrictions
            expect(query.trim().endsWith('.')).toBe(false); // No trailing dot
        });
    });

    describe('Exported Constants and Schemas', () => {
        it('should export systemPrompt as a non-empty string', () => {
            expect(typeof systemPrompt).toBe('string');
            expect(systemPrompt.length).toBeGreaterThan(0);
        });

        it('should export exerciseQuerySchema as a valid schema object', () => {
            expect(typeof exerciseQuerySchema).toBe('object');
            expect(exerciseQuerySchema).toHaveProperty('type', 'array');
            expect(exerciseQuerySchema).toHaveProperty('items.type', 'object');
            expect(exerciseQuerySchema).toHaveProperty('items.required');
            expect(Array.isArray(exerciseQuerySchema.items.required)).toBe(true);
        });

        it('should export techniqueQuerySchema as a valid schema object', () => {
            expect(typeof techniqueQuerySchema).toBe('object');
            expect(techniqueQuerySchema).toHaveProperty('type', 'object');
            expect(techniqueQuerySchema).toHaveProperty('required');
            expect(Array.isArray(techniqueQuerySchema.required)).toBe(true);
        });

        it('should export progressionQuerySchema as a valid schema object', () => {
            expect(typeof progressionQuerySchema).toBe('object');
            expect(progressionQuerySchema).toHaveProperty('type', 'object');
            expect(progressionQuerySchema).toHaveProperty('required');
            expect(Array.isArray(progressionQuerySchema.required)).toBe(true);
        });

        it('should export nutritionSchema as a valid schema object', () => {
            expect(typeof nutritionSchema).toBe('object');
            expect(nutritionSchema).toHaveProperty('type', 'array');
            expect(nutritionSchema).toHaveProperty('items.type', 'object');
            expect(nutritionSchema).toHaveProperty('items.required');
            expect(Array.isArray(nutritionSchema.items.required)).toBe(true);
        });

        it('should export queryTypeToSchema mapping correctly', () => {
            expect(typeof queryTypeToSchema).toBe('object');
            expect(queryTypeToSchema.exercise).toBe(exerciseQuerySchema);
            expect(queryTypeToSchema.technique).toBe(techniqueQuerySchema);
            expect(queryTypeToSchema.progression).toBe(progressionQuerySchema);
        });

        it('should export all expected functions', () => {
            expect(typeof getAdditionalInstructions).toBe('function');
            expect(typeof buildExerciseQuery).toBe('function');
            expect(typeof buildTechniqueQuery).toBe('function');
            expect(typeof buildProgressionQuery).toBe('function');
            expect(typeof buildNutritionQuery).toBe('function');
        });
    });

    // --- Other function tests will be added below ---

}); 