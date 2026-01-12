const ExplanationGenerator = require('../../agents/adjustment-logic/explanation-generator');

describe('ExplanationGenerator', () => {
  let generator;
  let mockOpenAI;
  let mockLogger;
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
    
    // Setup mock config
    mockConfig = {
      model: 'gpt-4-turbo'
    };
    
    // Mock successful OpenAI response for explanation generation
    mockOpenAI.createChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'Your workout plan was updated based on your feedback.',
              changes: [
                'Added deadlifts to target posterior chain muscles.',
                'Increased squat sets from 3 to 4 to progress intensity.',
                'Removed bench press to accommodate your request.'
              ],
              rationale: 'The modifications align with your strength goals while ensuring balanced muscle development.',
              benefitsAndOutcomes: [
                'Improved posterior chain strength from deadlifts',
                'Better leg development from increased squat volume',
                'Overall balanced full-body workout'
              ]
            })
          }
        }
      ]
    });
    
    // Create generator instance
    generator = new ExplanationGenerator(
      mockOpenAI,
      mockConfig,
      mockLogger
    );
  });
  
  test('constructor should initialize with required dependencies', () => {
    expect(generator.openaiService).toBe(mockOpenAI);
    expect(generator.config).toBe(mockConfig);
    expect(generator.logger).toBe(mockLogger);
  });
  
  test('constructor should throw error if OpenAI client is not provided', () => {
    const constructorFn = () => {
      new ExplanationGenerator(
        null,
        mockConfig,
        mockLogger
      );
    };
    
    expect(constructorFn).toThrow('OpenAIService instance is required');
  });
  
  test('generate should generate explanations for applied changes', async () => {
    const adjustedPlan = {
      weeklySchedule: {
        Monday: {
          exercises: [
            { exercise: 'Squat', sets: 4, repsOrDuration: '8-10' },
            { exercise: 'Deadlift', sets: 3, repsOrDuration: '5-8' }
          ]
        }
      }
    };
    
    const originalPlan = {
      weeklySchedule: {
        Monday: {
          exercises: [
            { exercise: 'Squat', sets: 3, repsOrDuration: '8-10' },
            { exercise: 'Bench Press', sets: 4, repsOrDuration: '6-8' }
          ]
        }
      }
    };
    
    const parsedFeedback = {
      substitutions: [
        { from: 'Bench Press', to: 'Deadlift', reason: 'user preference' }
      ],
      volumeAdjustments: [
        { exercise: 'Squat', property: 'sets', change: 'increase', value: '4' }
      ]
    };
    
    const appliedChanges = [
      { 
        type: 'substitution', 
        details: { from: 'Bench Press', to: 'Deadlift', reason: 'user preference' },
        outcome: 'Substituted Bench Press with Deadlift' 
      },
      { 
        type: 'volumeAdjustment', 
        details: { exercise: 'Squat', property: 'sets', change: 'increase', value: '4' },
        outcome: 'Increased sets for Squat from 3 to 4' 
      }
    ];
    
    const result = await generator.generate(adjustedPlan, originalPlan, parsedFeedback, appliedChanges);
    
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('details');
    expect(result.details.length).toBeGreaterThan(0);
  });
  
  test('generate should return default summary when appliedChanges is null', async () => {
    const result = await generator.generate({}, {}, {}, null);
    expect(result.summary).toBe("No changes were applied.");
    expect(result.details).toEqual([]);
  });
  
  test('generate should return default summary when appliedChanges is empty', async () => {
    const result = await generator.generate({}, {}, {}, []);
    expect(result.summary).toBe("No changes were applied.");
    expect(result.details).toEqual([]);
  });
  
  test('_generateSimpleExplanation should create explanation for a change', () => {
    const change = {
      type: 'substitution',
      details: {
        from: 'Bench Press',
        to: 'Push-up',
        reason: 'equipment limitation'
      },
      outcome: "Substituted 'Bench Press' with 'Push-up'"
    };
    
    const parsedFeedback = {
      substitutions: [
        { from: 'Bench Press', to: 'Push-up', reason: 'equipment limitation' }
      ]
    };
    
    const result = generator._generateSimpleExplanation(change, parsedFeedback);
    
    expect(result).toHaveProperty('changeType');
    expect(result).toHaveProperty('explanation');
    expect(result).toHaveProperty('details');
    // Check for either the specific text or the general format that the implementation might use
    expect(result.explanation).toMatch(/substitution|Applied adjustment of type/i);
  });

  describe('_generateSimpleExplanation cases', () => {
    const mockParsedFeedback = {}; // Provide if needed by specific cases, though current _generateSimpleExplanation doesn't use it directly

    test('exerciseSubstituted with reason', () => {
      const change = {
        type: 'exerciseSubstituted',
        details: { from: 'Old Exercise', to: 'New Exercise', reason: 'User preference' },
        outcome: 'Substituted Old with New'
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.changeType).toBe('exerciseSubstituted');
      expect(result.explanation).toBe('Substituted \'Old Exercise\' with \'New Exercise\' due to: User preference.');
      expect(result.details).toEqual(change.details);
    });

    test('exerciseSubstituted without reason', () => {
      const change = {
        type: 'exerciseSubstituted',
        details: { from: 'Old Exercise', to: 'New Exercise' }, // No reason
        outcome: 'Substituted Old with New'
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe('Substituted \'Old Exercise\' with \'New Exercise\' due to: User request.');
    });

    test('volumeAdjustment with value and reason', () => {
      const change = {
        type: 'volumeAdjustment',
        details: { exercise: 'Squat', property: 'sets', change: 'increase', value: '4', reason: 'Progressive overload' },
        outcome: 'Increased sets for Squat'
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe("Adjusted sets for 'Squat' (increase) to 4 based on feedback: Progressive overload.");
    });

    test('volumeAdjustment without value', () => {
      const change = {
        type: 'volumeAdjustment',
        details: { exercise: 'Lunge', property: 'reps', change: 'decrease', reason: 'Too challenging' },
        outcome: 'Decreased reps for Lunge'
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe("Adjusted reps for 'Lunge' (decrease) based on feedback: Too challenging.");
    });

    test('volumeAdjustment without reason', () => {
      const change = {
        type: 'volumeAdjustment',
        details: { exercise: 'Deadlift', property: 'sets', change: 'set', value: '3' },
        outcome: 'Set sets for Deadlift to 3'
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe("Adjusted sets for 'Deadlift' (set) to 3 based on feedback: User request.");
    });

    test('intensityAdjustment with value and reason', () => {
      const change = {
        type: 'intensityAdjustment',
        details: { exercise: 'Bench Press', parameter: 'RPE', change: 'increase', value: '9', reason: 'Feeling strong' },
        outcome: 'Increased RPE for Bench Press'
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe("Adjusted RPE for 'Bench Press' (increase) towards 9 based on feedback: Feeling strong.");
    });

    test('intensityAdjustment without value', () => {
      const change = {
        type: 'intensityAdjustment',
        details: { exercise: 'Rows', parameter: 'tempo', change: 'decrease', reason: 'Focus on form' },
        outcome: 'Decreased tempo for Rows'
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe("Adjusted tempo for 'Rows' (decrease) based on feedback: Focus on form.");
    });

    test('intensityAdjustment without reason', () => {
      const change = {
        type: 'intensityAdjustment',
        details: { exercise: 'Overhead Press', parameter: 'weight', change: 'set', value: '50kg' },
        outcome: 'Set weight for Overhead Press'
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe("Adjusted weight for 'Overhead Press' (set) towards 50kg based on feedback: User request.");
    });

    test('scheduleChange with reason', () => {
      const change = {
        type: 'scheduleChange',
        details: { type: 'move', details: 'Monday to Tuesday', reason: 'Work conflict' },
        outcome: 'Moved Monday session to Tuesday'
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe("Modified schedule (move): Monday to Tuesday. Reason: Work conflict.");
    });

    test('scheduleChange without reason', () => {
      const change = {
        type: 'scheduleChange',
        details: { type: 'add_day', details: 'Wednesday' },
        outcome: 'Added Wednesday session'
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe("Modified schedule (add_day): Wednesday. Reason: User request.");
    });

    test('restPeriodChange with value and reason', () => {
      const change = {
        type: 'restPeriodChange',
        details: { type: 'sets', change: 'increase', value: '90s', reason: 'More recovery' },
        outcome: 'Increased rest between sets'
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe("Adjusted rest periods (sets, increase) towards 90s based on feedback: More recovery.");
    });

    test('restPeriodChange without value', () => {
      const change = {
        type: 'restPeriodChange',
        details: { type: 'exercises', change: 'decrease', reason: 'Quicker pace' },
        outcome: 'Decreased rest between exercises'
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe("Adjusted rest periods (exercises, decrease) based on feedback: Quicker pace.");
    });

    test('restPeriodChange without reason', () => {
      const change = {
        type: 'restPeriodChange',
        details: { type: 'workout_days', change: 'set', value: '2 days' },
        outcome: 'Set rest between workout days'
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe("Adjusted rest periods (workout_days, set) towards 2 days based on feedback: User request.");
    });

    test('equipmentLimitation with outcome', () => {
      const change = {
        type: 'equipmentLimitation',
        details: { equipment: 'Barbell' },
        outcome: 'Substituted Barbell Squat with Dumbbell Squat.'
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe("Handled equipment limitation for 'Barbell'. Substituted Barbell Squat with Dumbbell Squat.");
    });

    test('equipmentLimitation without outcome', () => {
      const change = {
        type: 'equipmentLimitation',
        details: { equipment: 'Cable Machine' }
        // No outcome
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe("Handled equipment limitation for 'Cable Machine'.");
    });

    test('painConcern with outcome', () => {
      const change = {
        type: 'painConcern',
        details: { area: 'Knee', exercise: 'Squats' },
        outcome: 'Replaced Squats with Leg Press.'
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe("Acknowledged pain concern regarding Knee. Replaced Squats with Leg Press.");
    });

    test('painConcern without outcome', () => {
      const change = {
        type: 'painConcern',
        details: { area: 'Shoulder' }
        // No outcome
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe("Acknowledged pain concern regarding Shoulder.");
    });

    test('default case with outcome', () => {
      const change = {
        type: 'unknownChangeType',
        details: { info: 'Some details' },
        outcome: 'Performed an unknown action.'
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe("Applied adjustment of type 'unknownChangeType'. Performed an unknown action.");
    });

    test('default case without outcome', () => {
      const change = {
        type: 'anotherUnknownType',
        details: { data: 'More data' }
        // No outcome
      };
      const result = generator._generateSimpleExplanation(change, mockParsedFeedback);
      expect(result.explanation).toBe("Applied adjustment of type 'anotherUnknownType'.");
    });
  });
  
  describe('compare', () => {
    const baseOriginalPlan = {
      planName: 'Original Plan',
      weeklySchedule: {
        Monday: {
          sessionName: 'Chest Day',
          exercises: [
            { exercise: 'Bench Press', sets: 3, repsOrDuration: '8-10' },
            { exercise: 'Incline Dumbbell Press', sets: 3, repsOrDuration: '10-12' }
          ]
        },
        Tuesday: 'Rest',
        Wednesday: {
          sessionName: 'Leg Day',
          exercises: [
            { exercise: 'Squat', sets: 4, repsOrDuration: '6-8' },
            { exercise: 'Leg Press', sets: 3, repsOrDuration: '10-15' }
          ]
        },
        Thursday: 'Rest',
        Friday: {
          sessionName: 'Back Day',
          exercises: [
            { exercise: 'Pull-ups', sets: 3, repsOrDuration: 'AMRAP' },
            { exercise: 'Rows', sets: 4, repsOrDuration: '8-12' }
          ]
        },
        Saturday: 'Rest',
        Sunday: 'Rest'
      }
    };

    test('should identify multiple differences between plans', async () => {
      const originalPlan = JSON.parse(JSON.stringify(baseOriginalPlan)); // Deep copy
      const adjustedPlan = {
        planName: 'Modified Super Plan', // Changed planName
        weeklySchedule: {
          Monday: {
            sessionName: 'Chest & Tris',
            exercises: [
              { exercise: 'Bench Press', sets: 4, repsOrDuration: '6-8' }, // Sets changed
              // Incline Dumbbell Press removed
              { exercise: 'Tricep Pushdown', sets: 3, repsOrDuration: '12-15' } // Added
            ]
          },
          Tuesday: { // Changed from Rest to Workout
            sessionName: 'Cardio Day',
            exercises: [
              { exercise: 'Running', sets: 1, repsOrDuration: '30 mins' }
            ]
          },
          Wednesday: 'Rest', // Changed from Workout to Rest
          Thursday: originalPlan.weeklySchedule.Thursday, // Unchanged
          Friday: {
            sessionName: 'Full Back Attack', // Session name changed
            exercises: [
              { exercise: 'Pull-ups', sets: 3, repsOrDuration: 'AMRAP' },
              { exercise: 'Rows', sets: 4, repsOrDuration: '8-12' }
            ]
          },
          Saturday: 'Rest',
          Sunday: 'Rest'
        }
      };

      const comparison = await generator.compare(adjustedPlan, originalPlan);
      expect(comparison.summary).toBe("Comparison complete.");
      expect(comparison.majorChanges.length).toBeGreaterThan(0);
      expect(comparison.majorChanges).toContain('Plan name changed from "Original Plan" to "Modified Super Plan".');
      expect(comparison.majorChanges).toContain('Tuesday changed from a rest day to a workout day (Cardio Day).');
      expect(comparison.majorChanges).toContain('Wednesday changed from a workout day to a rest day.');
      // Monday: Number of exercises changed from 2 to 2 (still 2, but different exercises, this covers the specific exercise change part)
      // This specific assertion for exercise count change might be tricky if exercises are just swapped but count is same.
      // The implementation currently logs: "Monday: Number of exercises changed from 2 to 2."
      // Let's check for a change in workout days if it's significant
      // Original has 3 workout days. Adjusted has 3 workout days. So workoutDayCountDiff will be 0.
      // The current test 'compare should identify differences between original and adjusted plans' will be removed after this group.
    });

    test('should report no major changes for identical plans', async () => {
      const plan = JSON.parse(JSON.stringify(baseOriginalPlan));
      const comparison = await generator.compare(plan, plan);
      expect(comparison.summary).toBe("No major structural changes identified between plans.");
      expect(comparison.majorChanges).toEqual([]);
    });

    test('should report failure if original plan is missing', async () => {
      const adjustedPlan = JSON.parse(JSON.stringify(baseOriginalPlan));
      const comparison = await generator.compare(adjustedPlan, null);
      expect(comparison.summary).toBe("Comparison failed: One or both plans are missing.");
    });

    test('should report failure if adjusted plan is missing', async () => {
      const originalPlan = JSON.parse(JSON.stringify(baseOriginalPlan));
      const comparison = await generator.compare(null, originalPlan);
      expect(comparison.summary).toBe("Comparison failed: One or both plans are missing.");
    });

    test('should detect change from workout to rest', async () => {
      const originalPlan = JSON.parse(JSON.stringify(baseOriginalPlan));
      const adjustedPlan = JSON.parse(JSON.stringify(baseOriginalPlan));
      adjustedPlan.weeklySchedule.Monday = 'Rest'; // Monday becomes a rest day

      const comparison = await generator.compare(adjustedPlan, originalPlan);
      expect(comparison.majorChanges).toContain('Monday changed from a workout day to a rest day.');
      expect(comparison.majorChanges).toContain('Total workout days changed by -1.');
    });

    test('should detect change from rest to workout', async () => {
      const originalPlan = JSON.parse(JSON.stringify(baseOriginalPlan));
      const adjustedPlan = JSON.parse(JSON.stringify(baseOriginalPlan));
      adjustedPlan.weeklySchedule.Tuesday = { // Tuesday becomes a workout day
        sessionName: 'New Cardio',
        exercises: [{ exercise: 'Cycling', sets: 1, repsOrDuration: '45 mins' }]
      };

      const comparison = await generator.compare(adjustedPlan, originalPlan);
      expect(comparison.majorChanges).toContain('Tuesday changed from a rest day to a workout day (New Cardio).');
      expect(comparison.majorChanges).toContain('Total workout days changed by 1.');
    });

    test('should detect change in number of exercises on a workout day', async () => {
      const originalPlan = JSON.parse(JSON.stringify(baseOriginalPlan));
      const adjustedPlan = JSON.parse(JSON.stringify(baseOriginalPlan));
      adjustedPlan.weeklySchedule.Monday.exercises.pop(); // Remove one exercise from Monday

      const comparison = await generator.compare(adjustedPlan, originalPlan);
      expect(comparison.majorChanges).toContain('Monday: Number of exercises changed from 2 to 1.');
    });

    test('should detect change in total workout days', async () => {
      const originalPlan = JSON.parse(JSON.stringify(baseOriginalPlan));
      const adjustedPlan = JSON.parse(JSON.stringify(baseOriginalPlan));
      adjustedPlan.weeklySchedule.Monday = 'Rest';
      adjustedPlan.weeklySchedule.Wednesday = 'Rest'; // Original had 3 workout days, now 1

      const comparison = await generator.compare(adjustedPlan, originalPlan);
      expect(comparison.majorChanges).toContain('Total workout days changed by -2.');
    });

  });

  describe('_generateLLMSummary', () => {
    test('should return summary from OpenAI on success', async () => {
      const mockSummary = "This is a mock LLM summary.";
      mockOpenAI.createChatCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: mockSummary } }]
      });
      const result = await generator._generateLLMSummary({}, {}, {}, [{ type: 'test'}]);
      expect(mockOpenAI.createChatCompletion).toHaveBeenCalled();
      expect(result).toBe(mockSummary);
      expect(mockLogger.debug).toHaveBeenCalledWith('[ExplanationGenerator] Calling LLM for summary explanation...');
    });

    test('should return fallback message on OpenAI API error', async () => {
      mockOpenAI.createChatCompletion.mockRejectedValueOnce(new Error('API Error'));
      const result = await generator._generateLLMSummary({}, {}, {}, [{ type: 'test'}]);
      expect(mockOpenAI.createChatCompletion).toHaveBeenCalled();
      expect(result).toBe("Could not generate a narrative summary due to an error.");
      expect(mockLogger.error).toHaveBeenCalledWith('[ExplanationGenerator] LLM summary generation failed: API Error');
    });

    test('should handle empty or invalid response from OpenAI', async () => {
      mockOpenAI.createChatCompletion.mockResolvedValueOnce({ choices: [] }); // Empty choices
      let result = await generator._generateLLMSummary({}, {}, {}, [{ type: 'test'}]);
      expect(result).toBe("Summary generation failed.");

      mockOpenAI.createChatCompletion.mockResolvedValueOnce({ choices: [{ message: {} }] }); // No content
      result = await generator._generateLLMSummary({}, {}, {}, [{ type: 'test'}]);
      expect(result).toBe("Summary generation failed.");
    });
  });
}); 