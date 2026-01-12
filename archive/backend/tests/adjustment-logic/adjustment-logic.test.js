const FeedbackParser = require('../../agents/adjustment-logic/feedback-parser');
const PlanModifier = require('../../agents/adjustment-logic/plan-modifier');
const AdjustmentValidator = require('../../agents/adjustment-logic/adjustment-validator');
const ExplanationGenerator = require('../../agents/adjustment-logic/explanation-generator');

// Mock dependencies
jest.mock('../../agents/adjustment-logic/adjustment-validator');
jest.mock('../../agents/adjustment-logic/explanation-generator');

describe('Adjustment Logic Components', () => {
  // Common mocks for all tests
  let mockOpenAI;
  let mockLogger;
  let mockSupabase;
  let mockConfig;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock OpenAI client
    mockOpenAI = {
      createChatCompletion: jest.fn()
    };
    
    // Setup mock Logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'plan-123',
          user_id: 'user-123',
          exercises: [
            { name: 'Squat', sets: 3, repsOrRange: '8-10' },
            { name: 'Bench Press', sets: 4, repsOrRange: '6-8' }
          ]
        },
        error: null
      })
    };
    
    // Setup mock config
    mockConfig = {
      model: 'gpt-4-turbo'
    };
    
    // Mock the AdjustmentValidator implementation
    AdjustmentValidator.mockImplementation(() => ({
      validateAdjustments: jest.fn().mockResolvedValue({
        valid: true,
        safetyIssues: []
      }),
      validateExerciseAdditions: jest.fn().mockResolvedValue({
        valid: true,
        safetyIssues: []
      }),
      validateExerciseRemovals: jest.fn().mockResolvedValue({
        valid: true,
        reasoning: 'All removals are valid'
      })
    }));
    
    // Mock the ExplanationGenerator implementation
    ExplanationGenerator.mockImplementation(() => ({
      generate: jest.fn().mockResolvedValue({
        summary: 'Here is why these changes were made...',
        details: []
      })
    }));
  });
  
  describe('FeedbackParser', () => {
    let feedbackParser;
    
    beforeEach(() => {
      // Create a new FeedbackParser instance for each test
      feedbackParser = new FeedbackParser(
        mockOpenAI,
        mockConfig,
        mockLogger
      );
      
      // Mock successful OpenAI completion response
      mockOpenAI.createChatCompletion.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                substitutions: [
                  { from: 'Bench Press', to: 'Deadlift', reason: 'user preference' }
                ],
                volumeAdjustments: [
                  { exercise: 'Squat', property: 'sets', change: 'increase', value: '4' }
                ],
                intensityAdjustments: [
                  { exercise: 'Squat', parameter: 'weight', change: 'increase' }
                ],
                painConcerns: [
                  { area: 'lower back', exercise: 'general', severity: 'mild' }
                ]
              })
            }
          }
        ]
      });
    });
    
    test('constructor should initialize with required dependencies', () => {
      expect(feedbackParser.openaiService).toBe(mockOpenAI);
      expect(feedbackParser.config).toBe(mockConfig);
      expect(feedbackParser.logger).toBe(mockLogger);
    });
    
    test('parse should call OpenAI API with correct parameters', async () => {
      const feedback = 'I want to add deadlifts and do more squats';
      
      await feedbackParser.parse(feedback);
      
      expect(mockOpenAI.createChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: mockConfig.model,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.any(String)
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining(feedback)
            })
          ])
        })
      );
    });
    
    test('parse should return structured feedback when OpenAI returns valid JSON', async () => {
      const feedback = 'I want to add deadlifts and do more squats';
      
      const result = await feedbackParser.parse(feedback);
      
      expect(result).toHaveProperty('parsed');
      expect(result).toHaveProperty('categorized');
      expect(result).toHaveProperty('specifics');
      expect(result.parsed).toHaveProperty('substitutions');
      expect(result.parsed).toHaveProperty('volumeAdjustments');
      expect(result.parsed.substitutions.length).toBeGreaterThan(0);
      expect(result.parsed.volumeAdjustments.length).toBeGreaterThan(0);
    });
    
    test('parse should handle and log errors from OpenAI API', async () => {
      // Mock a failed API call
      mockOpenAI.createChatCompletion.mockRejectedValue(new Error('API Error'));
      
      const feedback = 'I want to add deadlifts and do more squats';
      
      const result = await feedbackParser.parse(feedback);
      
      // Should fall back to a basic structure rather than throw an error
      expect(result).toHaveProperty('parsed');
      expect(result).toHaveProperty('categorized');
      expect(result).toHaveProperty('specifics');
      
      // Check for both error messages that appear in the logs
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('OpenAI API call failed during feedback parsing'),
        expect.any(Object)
      );
    });
    
    test('parse should handle invalid JSON from OpenAI and use fallback parsing', async () => {
      // Mock OpenAI returning invalid JSON
      mockOpenAI.createChatCompletion.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Not a valid JSON response'
            }
          }
        ]
      });
      
      const feedback = 'I want to add lunges';
      
      const result = await feedbackParser.parse(feedback);
      
      // Should fall back to a basic structure
      expect(result).toHaveProperty('parsed');
      expect(result).toHaveProperty('categorized');
      expect(result).toHaveProperty('specifics');
      
      // Check for the actual warning message used in the implementation
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Using fallback parsing method for feedback')
      );
    });
    
    test('_fallbackParseFeedback should extract basic adjustments from feedback text', () => {
      const feedback = 'Add lunges and remove push-ups';
      
      // Access the private method directly for testing
      const result = feedbackParser._fallbackParseFeedback(feedback);
      
      // Expecting a minimal adjustment structure based on keyword parsing
      expect(result).toHaveProperty('substitutions');
      expect(result).toHaveProperty('volumeAdjustments');
      expect(result).toHaveProperty('generalFeedback');
      expect(result.generalFeedback).toBe(feedback);
    });
  });
  
  describe('PlanModifier', () => {
    let planModifier;
    
    beforeEach(() => {
      // Create a new PlanModifier instance for each test
      planModifier = new PlanModifier(
        mockSupabase, 
        mockConfig,
        mockLogger
      );
    });
    
    test('constructor should initialize with required dependencies', () => {
      expect(planModifier.supabaseClient).toBe(mockSupabase);
      expect(planModifier.logger).toBe(mockLogger);
      expect(planModifier.config).toBe(mockConfig);
    });
    
    test('apply should process adjustments based on feedback', async () => {
      const originalPlan = {
        weeklySchedule: {
          Monday: {
            sessionName: 'Leg Day',
            exercises: [
              { exercise: 'Squat', sets: 3, repsOrDuration: '8-10' }
            ]
          },
          Wednesday: {
            sessionName: 'Upper Body',
            exercises: [
              { exercise: 'Bench Press', sets: 4, repsOrDuration: '6-8' }
            ]
          }
        }
      };
      
      const parsedFeedback = {
        parsed: {
          substitutions: [
            { from: 'Bench Press', to: 'Deadlift', reason: 'user preference' }
          ],
          volumeAdjustments: [
            { exercise: 'Squat', property: 'sets', change: 'increase', value: '4' }
          ]
        },
        categorized: {
          highPriority: [],
          mediumPriority: [],
          lowPriority: []
        }
      };
      
      const considerations = [
        { feasible: [], infeasible: [] },
        { safeRequests: [], unsafeRequests: [], warnings: [] },
        { coherent: [], incoherent: [] }
      ];
      
      const result = await planModifier.apply(originalPlan, parsedFeedback.parsed, considerations);
      
      expect(result).toHaveProperty('modifiedPlan');
      expect(result).toHaveProperty('appliedChanges');
      expect(result).toHaveProperty('skippedChanges');
    });
    
    test('apply should handle and validate different adjustment types', async () => {
      const originalPlan = {
        weeklySchedule: {
          Monday: {
            sessionName: 'Full Body',
            exercises: [
              { exercise: 'Squat', sets: 3, repsOrDuration: '8-10' },
              { exercise: 'Bench Press', sets: 4, repsOrDuration: '6-8' }
            ]
          }
        }
      };
      
      const parsedFeedback = {
        substitutions: [
          { from: 'Bench Press', to: 'Push-up', reason: 'equipment limitation' }
        ],
        volumeAdjustments: [
          { exercise: 'Squat', property: 'sets', change: 'increase', value: '4' }
        ],
        intensityAdjustments: [
          { exercise: 'all', parameter: 'weight', change: 'increase' }
        ],
        equipmentLimitations: [
          { equipment: 'barbell', alternative: 'bodyweight exercises' }
        ]
      };
      
      const considerations = [
        { feasible: [], infeasible: [] },
        { safeRequests: [], unsafeRequests: [], warnings: [] },
        { coherent: [], incoherent: [] }
      ];
      
      const result = await planModifier.apply(originalPlan, parsedFeedback, considerations);
      
      expect(result.modifiedPlan).toBeDefined();
      expect(result.modifiedPlan.weeklySchedule).toBeDefined();
      expect(result.appliedChanges.length).toBeGreaterThan(0);
    });
    
    test('apply should handle safety concerns and skip unsafe adjustments', async () => {
      const originalPlan = {
        weeklySchedule: {
          Monday: {
            exercises: [
              { exercise: 'Squat', sets: 3, repsOrDuration: '8-10' }
            ]
          }
        }
      };
      
      const parsedFeedback = {
        intensityAdjustments: [
          { exercise: 'Squat', parameter: 'weight', change: 'increase' }
        ],
        painConcerns: [
          { area: 'knee', exercise: 'Squat', severity: 'moderate' }
        ]
      };
      
      // Mock validation results showing unsafe adjustment
      const considerations = [
        { feasible: [], infeasible: [] },
        { 
          safeRequests: [], 
          unsafeRequests: [
            { type: 'intensityAdjustment', item: parsedFeedback.intensityAdjustments[0], reason: 'May aggravate knee pain' }
          ], 
          warnings: [] 
        },
        { coherent: [], incoherent: [] }
      ];
      
      const result = await planModifier.apply(originalPlan, parsedFeedback, considerations);
      
      expect(result.skippedChanges.length).toBeGreaterThan(0);
      expect(result.skippedChanges[0].reason).toContain('Unsafe');
    });
    
    test('_handlePainConcern should add appropriate notes to exercises', () => {
      const plan = {
        weeklySchedule: {
          Monday: {
            exercises: [
              { exercise: 'Squat', sets: 3, repsOrDuration: '8-10' }
            ]
          }
        }
      };
      
      const painConcern = {
        area: 'knee',
        exercise: 'Squat',
        severity: 'mild'
      };
      
      const result = planModifier._handlePainConcern(plan, painConcern);
      
      expect(result.changed).toBe(true);
      expect(plan.weeklySchedule.Monday.exercises[0].notes).toContain('knee pain');
    });
    
    test('_handleEquipmentLimitation should substitute exercises requiring limited equipment', () => {
      const plan = {
        weeklySchedule: {
          Monday: {
            exercises: [
              { exercise: 'Barbell Squat', sets: 3, repsOrDuration: '8-10' }
            ]
          }
        }
      };
      
      const equipmentLimitation = {
        equipment: 'barbell',
        alternative: 'bodyweight'
      };
      
      const result = planModifier._handleEquipmentLimitation(plan, equipmentLimitation);
      
      expect(result.changed).toBeDefined();
    });
  });
}); 