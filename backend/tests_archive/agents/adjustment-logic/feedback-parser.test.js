const FeedbackParser = require('../../../agents/adjustment-logic/feedback-parser');
const logger = require('../../../config/logger');

// Mock the OpenAIService directly inline
jest.mock('../../../services/openai-service', () => {
    // Return a constructor function that creates an object with the methods we need
    return jest.fn().mockImplementation(() => ({
        createChatCompletion: jest.fn(),
        generateChatCompletion: jest.fn()
    }));
});

jest.mock('../../../config/logger');

// Import OpenAIService after mocking it
const OpenAIService = require('../../../services/openai-service');

// Get the mocked logger instance
const mockLogger = require('../../../config/logger');

describe('FeedbackParser (Step 8.3B)', () => {
    let parser;
    let mockOpenAIServiceInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Create a mock OpenAI service instance
        mockOpenAIServiceInstance = new OpenAIService();
        
        // Mock logger methods
        mockLogger.info = jest.fn();
        mockLogger.warn = jest.fn();
        mockLogger.error = jest.fn();
        mockLogger.debug = jest.fn();

        parser = new FeedbackParser(mockOpenAIServiceInstance, {}, mockLogger);
    });

    // --- Initialization Tests ---
    it('should throw error if OpenAIService instance is missing', () => {
        expect(() => new FeedbackParser(null)).toThrow('OpenAIService instance is required');
    });

    it('should initialize correctly with valid dependencies', () => {
        expect(parser.openaiService).toBe(mockOpenAIServiceInstance);
        expect(parser.logger).toBe(mockLogger);
        expect(mockLogger.info).toHaveBeenCalledWith('[FeedbackParser] Initialized.');
    });

    // --- LLM Parsing Tests (_parseFeedbackWithLLM) ---
    describe('_parseFeedbackWithLLM', () => {
        const feedbackText = "Replace squats with leg press and increase bench press sets.";
        const mockLLMResponse = {
            substitutions: [{ from: "squats", to: "leg press", reason: "User request" }],
            volumeAdjustments: [{ exercise: "bench press", property: "sets", change: "increase", reason: "User request" }],
            intensityAdjustments: [], scheduleChanges: [], restPeriodChanges: [], equipmentLimitations: [], painConcerns: [], generalFeedback: ""
        };

        it('should call OpenAI service with correct parameters', async () => {
            mockOpenAIServiceInstance.createChatCompletion.mockResolvedValue({
                choices: [{ message: { content: JSON.stringify(mockLLMResponse) } }]
            });

            await parser._parseFeedbackWithLLM(feedbackText);

            expect(mockOpenAIServiceInstance.createChatCompletion).toHaveBeenCalledTimes(1);
            expect(mockOpenAIServiceInstance.createChatCompletion).toHaveBeenCalledWith(expect.objectContaining({
                model: expect.any(String),
                messages: expect.arrayContaining([
                    expect.objectContaining({ role: "system" }),
                    expect.objectContaining({ role: "user", content: feedbackText })
                ]),
                temperature: 0.2,
                response_format: { type: "json_object" }
            }));
        });

        it('should return parsed JSON object on success', async () => {
            mockOpenAIServiceInstance.createChatCompletion.mockResolvedValue({
                choices: [{ message: { content: JSON.stringify(mockLLMResponse) } }]
            });

            const result = await parser._parseFeedbackWithLLM(feedbackText);
            expect(result).toEqual(mockLLMResponse);
            expect(mockLogger.info).toHaveBeenCalledWith('[FeedbackParser] Successfully parsed LLM JSON response.');
        });

        it('should throw error if OpenAI response is invalid', async () => {
            mockOpenAIServiceInstance.createChatCompletion.mockResolvedValue({ choices: [] }); // Invalid response

            await expect(parser._parseFeedbackWithLLM(feedbackText))
                .rejects.toThrow('Invalid or empty response from OpenAI service');
        });

        it('should throw error if OpenAI response content is not valid JSON', async () => {
            mockOpenAIServiceInstance.createChatCompletion.mockResolvedValue({
                choices: [{ message: { content: 'This is not JSON' } }],
            });
            const feedbackText = "Some feedback";
            
            try {
                 await parser._parseFeedbackWithLLM(feedbackText);
                 // If it doesn't throw, the test fails
                 throw new Error('Expected _parseFeedbackWithLLM to throw an error but it did not.');
            } catch (error) {
                 expect(error).toBeInstanceOf(Error);
                 expect(error.message).toContain('Failed to parse LLM response as JSON');
                 expect(mockLogger.error).toHaveBeenCalledWith(
                     expect.stringContaining('Failed to parse LLM JSON response'),
                     expect.objectContaining({ rawContent: 'This is not JSON' })
                 );
            }
        });

        it('should rethrow API errors', async () => {
            const apiError = new Error('API Timeout');
            mockOpenAIServiceInstance.createChatCompletion.mockRejectedValue(apiError);

            await expect(parser._parseFeedbackWithLLM(feedbackText)).rejects.toThrow('API Timeout');
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('OpenAI API call failed'), expect.any(Object));
        });
    });

    // --- Fallback Parsing Tests (_fallbackParseFeedback) ---
    describe('_fallbackParseFeedback', () => {
        it('should return a default structure', () => {
            const result = parser._fallbackParseFeedback("Some general feedback.");
            expect(result).toHaveProperty('substitutions', []);
            expect(result).toHaveProperty('volumeAdjustments', []);
            expect(result).toHaveProperty('painConcerns', []);
            expect(result).toHaveProperty('generalFeedback', "Some general feedback.");
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Using fallback parsing'));
        });

        it('should perform simple substitution parsing', () => {
            const result = parser._fallbackParseFeedback("Please replace bench press with dumbbell press.");
            expect(result.substitutions).toEqual([{ from: "bench press", to: "dumbbell press", reason: "Fallback parsing" }]);
        });
        
         it('should perform simple volume parsing', () => {
            const result = parser._fallbackParseFeedback("I want more sets and less reps.");
            expect(result.volumeAdjustments).toContainEqual({ exercise: 'all', property: 'sets', change: 'increase', reason: 'Fallback parsing' });
             expect(result.volumeAdjustments).toContainEqual({ exercise: 'all', property: 'reps', change: 'decrease', reason: 'Fallback parsing' });
        });

        it('should perform simple pain parsing', () => {
            const result = parser._fallbackParseFeedback("My knee pain is bad during squats.");
            expect(result.painConcerns).toEqual([{ area: 'knee', exercise: 'general', severity: 'mentioned', reason: 'Fallback parsing' }]);
        });
    });

    // --- Categorization Tests (_categorizeAdjustments) ---
    describe('_categorizeAdjustments', () => {
        it('should categorize pain concerns as high priority safety', () => {
            const parsed = { painConcerns: [{ area: 'knee', exercise: 'squats' }] };
            const categorized = parser._categorizeAdjustments(parsed);
            expect(categorized.highPriority).toEqual([expect.objectContaining({ type: 'painConcern' })]);
            expect(categorized.byType.safety).toEqual([expect.objectContaining({ type: 'painConcern' })]);
        });

        it('should categorize equipment limitations as high priority convenience', () => {
            const parsed = { equipmentLimitations: [{ equipment: 'barbell' }] };
            const categorized = parser._categorizeAdjustments(parsed);
            expect(categorized.highPriority).toEqual([expect.objectContaining({ type: 'equipmentLimitation' })]);
            expect(categorized.byType.convenience).toEqual([expect.objectContaining({ type: 'equipmentLimitation' })]);
        });

        it('should categorize pain-related substitutions as high priority safety', () => {
            const parsed = { substitutions: [{ from: 'squats', to: 'leg press', reason: 'knee pain' }] };
            const categorized = parser._categorizeAdjustments(parsed);
            expect(categorized.highPriority).toEqual([expect.objectContaining({ type: 'substitution', reason: 'Safety/Pain related' })]);
            expect(categorized.byType.safety).toEqual([expect.objectContaining({ type: 'substitution' })]);
        });

        it('should categorize equipment-related substitutions as high priority convenience', () => {
            const parsed = { substitutions: [{ from: 'barbell curl', to: 'dumbbell curl', reason: 'no barbell available' }] };
            const categorized = parser._categorizeAdjustments(parsed);
            expect(categorized.highPriority).toEqual([expect.objectContaining({ type: 'substitution', reason: 'Equipment related' })]);
            expect(categorized.byType.convenience).toEqual([expect.objectContaining({ type: 'substitution' })]);
        });

        it('should categorize general substitutions as medium priority preference', () => {
            const parsed = { substitutions: [{ from: 'lat pulldown', to: 'pull ups', reason: 'preference' }] };
            const categorized = parser._categorizeAdjustments(parsed);
            expect(categorized.mediumPriority).toEqual([expect.objectContaining({ type: 'substitution', reason: 'User preference' })]);
            expect(categorized.byType.preference).toEqual([expect.objectContaining({ type: 'substitution' })]);
        });

        it('should categorize volume/intensity adjustments as medium priority preference', () => {
            const parsed = { volumeAdjustments: [{ change: 'increase' }], intensityAdjustments: [{ change: 'decrease' }] };
            const categorized = parser._categorizeAdjustments(parsed);
            expect(categorized.mediumPriority).toContainEqual(expect.objectContaining({ type: 'volumeAdjustment' }));
            expect(categorized.mediumPriority).toContainEqual(expect.objectContaining({ type: 'intensityAdjustment' }));
            expect(categorized.byType.preference).toContainEqual(expect.objectContaining({ type: 'volumeAdjustment' }));
            expect(categorized.byType.preference).toContainEqual(expect.objectContaining({ type: 'intensityAdjustment' }));
        });

         it('should categorize schedule/rest changes as low priority', () => {
            const parsed = { scheduleChanges: [{ type: 'move' }], restPeriodChanges: [{ type: 'between_sets' }] };
            const categorized = parser._categorizeAdjustments(parsed);
            expect(categorized.lowPriority).toContainEqual(expect.objectContaining({ type: 'scheduleChange' }));
            expect(categorized.lowPriority).toContainEqual(expect.objectContaining({ type: 'restPeriodChange' }));
            expect(categorized.byType.convenience).toContainEqual(expect.objectContaining({ type: 'scheduleChange' }));
            expect(categorized.byType.preference).toContainEqual(expect.objectContaining({ type: 'restPeriodChange' }));
        });
    });

    // --- Specifics Extraction Tests (_extractSpecifics) ---
    describe('_extractSpecifics', () => {
        it('should extract mentioned exercises', () => {
            const parsed = { substitutions: [{ from: 'squats', to: 'leg press' }], volumeAdjustments: [{ exercise: 'bench press' }] };
            const specifics = parser._extractSpecifics(parsed);
            expect(specifics.exercisesMentioned).toEqual(expect.arrayContaining(['squats', 'leg press', 'bench press']));
        });
        
         it('should not extract "all" or "general" as specific exercises', () => {
            const parsed = { volumeAdjustments: [{ exercise: 'all' }], painConcerns: [{ exercise: 'general' }] };
            const specifics = parser._extractSpecifics(parsed);
            expect(specifics.exercisesMentioned).toEqual([]);
        });

        it('should extract changed parameters', () => {
            const parsed = { volumeAdjustments: [{ property: 'sets' }], intensityAdjustments: [{ parameter: 'weight' }], restPeriodChanges: [{ type: 'between_sets' }] };
            const specifics = parser._extractSpecifics(parsed);
            expect(specifics.parametersChanged).toEqual(expect.arrayContaining(['sets', 'weight', 'rest_between_sets']));
        });

        it('should extract pain areas', () => {
            const parsed = { painConcerns: [{ area: 'knee' }, { area: 'shoulder' }] };
            const specifics = parser._extractSpecifics(parsed);
            expect(specifics.painAreas).toEqual(expect.arrayContaining(['knee', 'shoulder']));
        });
        
        it('should extract limited equipment', () => {
            const parsed = { equipmentLimitations: [{ equipment: 'barbell' }] };
            const specifics = parser._extractSpecifics(parsed);
            expect(specifics.equipmentLimited).toEqual(['barbell']);
        });
        
         it('should extract affected schedule days', () => {
            const parsed = { scheduleChanges: [{ details: 'move monday to wednesday' }] };
            const specifics = parser._extractSpecifics(parsed);
            expect(specifics.scheduleDaysAffected).toEqual(expect.arrayContaining(['monday', 'wednesday']));
        });
    });

    // --- Main Parse Method Tests ---
    describe('parse (main method)', () => {
        const feedbackText = "Replace squats due to knee pain, and make bench press harder.";
        const mockParsed = {
            substitutions: [{ from: 'squats', reason: 'knee pain' }],
            intensityAdjustments: [{ exercise: 'bench press', change: 'increase' }],
             volumeAdjustments: [], scheduleChanges: [], restPeriodChanges: [], equipmentLimitations: [], painConcerns: [{ area: 'knee', exercise: 'squats' }], generalFeedback: ''
        };

        beforeEach(() => {
            // Mock the internal LLM call
            parser._parseFeedbackWithLLM = jest.fn().mockResolvedValue(mockParsed);
        });

        it('should call LLM parser, categorize, and extract specifics', async () => {
            const categorizeSpy = jest.spyOn(parser, '_categorizeAdjustments');
            const extractSpy = jest.spyOn(parser, '_extractSpecifics');

            const result = await parser.parse(feedbackText);

            expect(parser._parseFeedbackWithLLM).toHaveBeenCalledWith(feedbackText);
            expect(categorizeSpy).toHaveBeenCalledWith(mockParsed);
            expect(extractSpy).toHaveBeenCalledWith(mockParsed);

            expect(result).toHaveProperty('parsed');
            expect(result).toHaveProperty('categorized');
            expect(result).toHaveProperty('specifics');
            expect(result.parsed).toEqual(mockParsed);
            expect(result.categorized.highPriority).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'painConcern' }), expect.objectContaining({ type: 'substitution' })]));
            expect(result.specifics.exercisesMentioned).toContain('squats');
            expect(result.specifics.painAreas).toContain('knee');

            categorizeSpy.mockRestore();
            extractSpy.mockRestore();
        });

        it('should use fallback parser if LLM parsing throws error', async () => {
            const error = new Error('LLM Failed');
            parser._parseFeedbackWithLLM.mockRejectedValue(error);
            const fallbackSpy = jest.spyOn(parser, '_fallbackParseFeedback');

            const result = await parser.parse(feedbackText);

            expect(fallbackSpy).toHaveBeenCalledWith(feedbackText);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error during LLM parsing'), expect.any(Object));
            // Check that categorization and specifics still ran on fallback data
            expect(result).toHaveProperty('categorized');
            expect(result).toHaveProperty('specifics');
            expect(result.parsed.generalFeedback).toBe(feedbackText); // Fallback keeps raw feedback

            fallbackSpy.mockRestore();
        });
        
        it('should use fallback parser if LLM returns invalid structure', async () => {
            parser._parseFeedbackWithLLM.mockResolvedValue("not an object"); // Invalid structure
            const fallbackSpy = jest.spyOn(parser, '_fallbackParseFeedback');

            const result = await parser.parse(feedbackText);

            expect(fallbackSpy).toHaveBeenCalledWith(feedbackText);
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('LLM parsing returned invalid structure'), expect.any(Object));
            expect(result.parsed.generalFeedback).toBe(feedbackText);

            fallbackSpy.mockRestore();
        });
        
        it('should ensure all required keys exist in the final parsed output', async () => {
             // Simulate LLM returning only some keys
             parser._parseFeedbackWithLLM.mockResolvedValue({ substitutions: [{ from: 'a', to: 'b' }]});
             
             const result = await parser.parse("test");
             
             expect(result.parsed).toHaveProperty('substitutions', [{ from: 'a', to: 'b' }]);
             expect(result.parsed).toHaveProperty('volumeAdjustments', []);
             expect(result.parsed).toHaveProperty('intensityAdjustments', []);
             expect(result.parsed).toHaveProperty('scheduleChanges', []);
             expect(result.parsed).toHaveProperty('restPeriodChanges', []);
             expect(result.parsed).toHaveProperty('equipmentLimitations', []);
             expect(result.parsed).toHaveProperty('painConcerns', []);
             expect(result.parsed).toHaveProperty('generalFeedback', '');
        });
    });
}); 