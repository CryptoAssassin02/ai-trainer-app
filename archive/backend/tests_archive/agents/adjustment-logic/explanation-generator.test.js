const ExplanationGenerator = require('../../../agents/adjustment-logic/explanation-generator');
const logger = require('../../../config/logger');

// Mock the OpenAIService directly inline
jest.mock('../../../services/openai-service', () => {
    // Return a constructor function that creates an object with the methods we need
    return jest.fn().mockImplementation(() => ({
        createChatCompletion: jest.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify({ summary: "Test summary" }) } }]
        }),
        generateChatCompletion: jest.fn().mockResolvedValue(JSON.stringify({ summary: "Test summary" }))
    }));
});

jest.mock('../../../config/logger');

// Import OpenAIService after mocking it
const OpenAIService = require('../../../services/openai-service');

// Get the mocked logger instance
const mockLogger = require('../../../config/logger');

// Mock data
const getTestPlans = () => ({
    originalPlan: {
        planId: 'orig1',
        planName: 'Original Plan',
        weeklySchedule: {
            Monday: { sessionName: 'A', exercises: [{ exercise: 'Ex1', sets: 3 }] },
            Tuesday: 'Rest',
            Wednesday: { sessionName: 'B', exercises: [{ exercise: 'Ex2', sets: 4 }] }
        }
    },
    adjustedPlan: {
        planId: 'adj1',
        planName: 'Adjusted Plan',
        weeklySchedule: {
            Monday: { sessionName: 'A+', exercises: [{ exercise: 'Ex1-Sub', sets: 3, notes: 'Substituted from Ex1' }] }, // Name change, sub
            Tuesday: { sessionName: 'New Session', exercises: [{ exercise: 'Ex3', sets: 3 }] }, // Added day
            Wednesday: 'Rest' // Removed day
        }
    }
});

const testParsedFeedback = { /* ... feedback that led to changes ... */ };
const testAppliedChanges = [
    { type: 'exerciseSubstituted', details: { from: 'Ex1', to: 'Ex1-Sub' }, day: 'Monday' },
    { type: 'sessionNameChanged', details: { from: 'A', to: 'A+' }, day: 'Monday' },
    { type: 'dayAdded', details: { day: 'Tuesday' } }, // Simplified representation
    { type: 'dayRemoved', details: { day: 'Wednesday' } } // Simplified representation
];

describe('ExplanationGenerator (Step 8.3D)', () => {
    let generator;
    let mockOpenAIServiceInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Create a mock OpenAI service instance
        mockOpenAIServiceInstance = new OpenAIService();
        
        // Mock logger
        mockLogger.info = jest.fn();
        mockLogger.warn = jest.fn();
        mockLogger.error = jest.fn();
        mockLogger.debug = jest.fn();

        generator = new ExplanationGenerator(mockOpenAIServiceInstance, {}, mockLogger);
    });

    // --- Initialization ---
    it('should throw error if OpenAIService instance is missing', () => {
        expect(() => new ExplanationGenerator(null)).toThrow('OpenAIService instance is required');
    });

    it('should initialize correctly', () => {
        expect(generator.openaiService).toBe(mockOpenAIServiceInstance);
        expect(generator.logger).toBe(mockLogger);
        expect(mockLogger.info).toHaveBeenCalledWith('[ExplanationGenerator] Initialized.');
    });

    // --- Simple Explanation Generation (_generateSimpleExplanation) ---
    describe('_generateSimpleExplanation', () => {
        it('should generate explanation for exercise substitution', () => {
            const change = { type: 'exerciseSubstituted', details: { from: 'Squats', to: 'Leg Press', reason: 'Knee pain' } };
            const result = generator._generateSimpleExplanation(change, {});
            expect(result.changeType).toBe('exerciseSubstituted');
            expect(result.explanation).toBe("Substituted 'Squats' with 'Leg Press' due to: Knee pain.");
        });

        it('should generate explanation for volume adjustment', () => {
            const change = { type: 'volumeAdjustment', details: { exercise: 'Bench Press', property: 'sets', change: 'increase', value: 4, reason: 'User request' } };
            const result = generator._generateSimpleExplanation(change, {});
            expect(result.explanation).toBe("Adjusted sets for 'Bench Press' (increase) to 4 based on feedback: User request.");
        });

        it('should generate explanation for intensity adjustment', () => {
             const change = { type: 'intensityAdjustment', details: { exercise: 'Rows', parameter: 'weight', change: 'decrease', reason: 'Too heavy' } };
             const result = generator._generateSimpleExplanation(change, {});
             expect(result.explanation).toBe("Adjusted weight for 'Rows' (decrease) based on feedback: Too heavy.");
        });
        
         it('should generate explanation for schedule change', () => {
             const change = { type: 'scheduleChange', details: { type: 'move', details: 'Moved Mon to Tue', reason: 'Time conflict' } };
             const result = generator._generateSimpleExplanation(change, {});
             expect(result.explanation).toBe("Modified schedule (move): Moved Mon to Tue. Reason: Time conflict.");
        });
        
         it('should generate explanation for equipment limitation handling', () => {
             const change = { type: 'equipmentLimitation', details: { equipment: 'barbell' }, outcome: 'Substituted X with Y' };
             const result = generator._generateSimpleExplanation(change, {});
             expect(result.explanation).toBe("Handled equipment limitation for 'barbell'. Substituted X with Y");
         });
         
          it('should generate explanation for pain concern acknowledgement', () => {
             const change = { type: 'painConcern', details: { area: 'knee' }, outcome: 'Added notes' };
             const result = generator._generateSimpleExplanation(change, {});
             expect(result.explanation).toBe("Acknowledged pain concern regarding knee. Added notes");
         });

        it('should handle missing reason gracefully', () => {
            const change = { type: 'exerciseSubstituted', details: { from: 'Squats', to: 'Leg Press' /* no reason */ } };
            const result = generator._generateSimpleExplanation(change, {});
            expect(result.explanation).toBe("Substituted 'Squats' with 'Leg Press' due to: User request.");
        });
    });

    // --- Main Explanation Generation (generate) ---
    describe('generate', () => {
        it('should return empty state if no changes applied', async () => {
            const result = await generator.generate(null, null, null, []);
            expect(result.summary).toBe('No changes were applied.');
            expect(result.details).toEqual([]);
        });

        it('should call _generateSimpleExplanation for each applied change', async () => {
            const simpleSpy = jest.spyOn(generator, '_generateSimpleExplanation');
            const result = await generator.generate(null, null, testParsedFeedback, testAppliedChanges);
            expect(simpleSpy).toHaveBeenCalledTimes(testAppliedChanges.length);
            expect(result.details.length).toBe(testAppliedChanges.length);
            expect(result.details[0].explanation).toContain('Substituted'); // Check one example
            expect(result.summary).toContain(`Applied ${testAppliedChanges.length} adjustment(s)`);
            simpleSpy.mockRestore();
        });
        
        // Optional: Test LLM summary generation if implemented
        // it('should call _generateLLMSummary if enabled', async () => { ... });
    });

    // --- Plan Comparison (compare) ---
    describe('compare', () => {
        it('should return error summary if plans are missing', async () => {
            const result1 = await generator.compare(null, getTestPlans().originalPlan);
            expect(result1.summary).toContain('Comparison failed');
            const result2 = await generator.compare(getTestPlans().adjustedPlan, null);
            expect(result2.summary).toContain('Comparison failed');
        });

        it('should identify major changes like plan name', async () => {
            const { originalPlan, adjustedPlan } = getTestPlans();
            const result = await generator.compare(adjustedPlan, originalPlan);
            expect(result.majorChanges).toContain('Plan name changed from "Original Plan" to "Adjusted Plan".');
        });

        it('should identify changes in workout vs rest days', async () => {
            const { originalPlan, adjustedPlan } = getTestPlans();
            const result = await generator.compare(adjustedPlan, originalPlan);
            expect(result.majorChanges).toContain('Tuesday changed from a rest day to a workout day (New Session).');
            expect(result.majorChanges).toContain('Wednesday changed from a workout day to a rest day.');
        });
        
         it('should identify changes in total workout day count', async () => {
            const { originalPlan, adjustedPlan } = getTestPlans(); // Original 2 days, Adjusted 2 days
            const result = await generator.compare(adjustedPlan, originalPlan);
            // workoutDayCountDiff should be 0 in this case (1 added, 1 removed)
             expect(result.majorChanges).not.toContain(expect.stringContaining('Total workout days changed'));
             
             // Test with actual change
             const planWithMoreDays = JSON.parse(JSON.stringify(adjustedPlan));
             planWithMoreDays.weeklySchedule.Thursday = { sessionName:'C', exercises:[]};
             const resultMore = await generator.compare(planWithMoreDays, originalPlan);
              expect(resultMore.majorChanges).toContain('Total workout days changed by 1.'); // 3 vs 2
        });

        it('should identify changes in number of exercises per session', async () => {
            const { originalPlan, adjustedPlan } = getTestPlans();
            const planWithMoreEx = JSON.parse(JSON.stringify(adjustedPlan));
            planWithMoreEx.weeklySchedule.Monday.exercises.push({ exercise: 'Extra', sets: 1}); // Now 2 exercises
            
            const result = await generator.compare(planWithMoreEx, originalPlan); // Compare Original(1) vs New(2) on Monday
            expect(result.majorChanges).toContain('Monday: Number of exercises changed from 1 to 2.');
        });

        it('should return summary indicating no major changes if plans are similar', async () => {
            const { originalPlan } = getTestPlans();
            const similarPlan = JSON.parse(JSON.stringify(originalPlan)); // Identical structure
            const result = await generator.compare(similarPlan, originalPlan);
            expect(result.majorChanges).toEqual([]);
            expect(result.summary).toContain('No major structural changes identified');
        });
    });
}); 