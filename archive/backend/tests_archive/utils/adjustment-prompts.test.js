const adjustmentPrompts = require('../../utils/adjustment-prompts');

const {
    getFeedbackParsingPrompt,
    getExplanationSummaryPrompt,
    exerciseSubstitutionTemplate,
    volumeAdjustmentTemplate,
    scheduleChangeTemplate
} = require('../../utils/adjustment-prompts');

describe('Adjustment Prompts Utility', () => {
  // Test data
  const mockOriginalPlan = {
    planId: "original_1234567890",
    planName: "Test Strength Plan",
    weeklySchedule: {
      "Monday": {
        sessionName: "Upper Body",
        exercises: [
          {
            exercise: "Bench Press",
            sets: 3,
            repsOrDuration: "8-10",
            rest: "90 seconds"
          },
          {
            exercise: "Seated Rows",
            sets: 3,
            repsOrDuration: "10-12",
            rest: "60 seconds"
          }
        ]
      },
      "Wednesday": {
        sessionName: "Lower Body",
        exercises: [
          {
            exercise: "Squats",
            sets: 4,
            repsOrDuration: "6-8",
            rest: "120 seconds"
          }
        ]
      },
      "Friday": "Rest"
    }
  };

  const mockUserProfile = {
    user_id: "test-user-456",
    fitnessLevel: "intermediate",
    age: 35,
    preferences: {
      equipment: ["dumbbells", "barbell", "bench", "bodyweight"]
    }
  };

  const mockParsedFeedback = {
    substitutions: [
      { from: "Squats", to: "Leg Press", reason: "Knee pain" }
    ],
    volumeAdjustments: [
      { exercise: "Bench Press", property: "sets", change: "increase", value: "4", reason: "For better gains" }
    ],
    intensityAdjustments: [],
    scheduleChanges: [],
    restPeriodChanges: [],
    equipmentLimitations: [],
    painConcerns: [
      { area: "knee", exercise: "Squats", severity: "moderate", recommendation: null }
    ],
    generalFeedback: "Overall I like the plan but need these changes"
  };

  // Mock adjusted plan for output formatting tests
  const mockAdjustedPlan = {
    planName: "Adjusted Test Strength Plan",
    weeklySchedule: {
      "Monday": {
        sessionName: "Upper Body",
        exercises: [
          {
            exercise: "Bench Press",
            sets: 4, // Increased from 3
            repsOrDuration: "8-10",
            rest: "90 seconds"
          },
          {
            exercise: "Seated Rows",
            sets: 3,
            repsOrDuration: "10-12",
            rest: "60 seconds"
          }
        ]
      },
      "Wednesday": {
        sessionName: "Lower Body",
        exercises: [
          {
            exercise: "Leg Press", // Changed from Squats
            sets: 4,
            repsOrDuration: "6-8",
            rest: "120 seconds",
            notes: "Replace squats due to knee pain"
          }
        ]
      },
      "Friday": "Rest"
    }
  };

  const mockChanges = [
    {
      type: "substitution",
      details: "Replaced Squats with Leg Press on Wednesday",
      reason: "Knee pain mentioned by user"
    },
    {
      type: "volume",
      details: "Increased Bench Press sets from 3 to 4",
      reason: "User requested more volume for better progress"
    }
  ];

  const mockExplanations = {
    "Squats to Leg Press": "Leg Press is a good alternative as it allows you to train your quadriceps, hamstrings, and glutes with less stress on the knee joint.",
    "Increased Bench Press sets": "Added one additional set to increase total volume as requested, which is appropriate for your intermediate fitness level."
  };

  // Tests for EXPORTED functions/templates
  
  // NOTE: Removing describe blocks for non-exported functions:
  // - generateAdjustmentPrompt
  // - generateSpecializedPrompt
  // - formatAdjustedOutput
  // - outputSchema
});

describe('Adjustment Prompts (Step 8.3F)', () => {

    describe('getFeedbackParsingPrompt', () => {
        it('should return a non-empty string', () => {
            const prompt = getFeedbackParsingPrompt();
            expect(prompt).toBeDefined();
            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(100); // Check it has substantial content
        });

        it('should contain instructions for JSON output', () => {
            const prompt = getFeedbackParsingPrompt();
            expect(prompt).toContain('Format your response as a valid JSON object');
            expect(prompt).toContain('Respond ONLY with the JSON object');
        });

        it('should list the expected JSON keys', () => {
            const prompt = getFeedbackParsingPrompt();
            expect(prompt).toContain('"substitutions":');
            expect(prompt).toContain('"volumeAdjustments":');
            expect(prompt).toContain('"intensityAdjustments":');
            expect(prompt).toContain('"scheduleChanges":');
            expect(prompt).toContain('"restPeriodChanges":');
            expect(prompt).toContain('"equipmentLimitations":');
            expect(prompt).toContain('"painConcerns":');
            expect(prompt).toContain('"generalFeedback":');
        });
    });

    describe('getExplanationSummaryPrompt', () => {
        const appliedChanges = [
            { type: 'exerciseSubstituted', details: { from: 'A', to: 'B' } },
            { type: 'volumeAdjustment', details: { exercise: 'C', property: 'sets', change: 'increase' } }
        ];

        it('should return a non-empty string', () => {
            const prompt = getExplanationSummaryPrompt(appliedChanges);
            expect(prompt).toBeDefined();
            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(50);
        });

        it('should include the summary of applied changes', () => {
            const prompt = getExplanationSummaryPrompt(appliedChanges);
            expect(prompt).toContain('Adjustments Made:');
            expect(prompt).toContain('- exerciseSubstituted:');
            expect(prompt).toContain('- volumeAdjustment:');
            // Check if JSON stringification is present (might be fragile)
            expect(prompt).toContain('"from":"A"'); 
            expect(prompt).toContain('"property":"sets"');
        });

        it('should ask for a narrative summary', () => {
            const prompt = getExplanationSummaryPrompt(appliedChanges);
            expect(prompt).toContain('Provide a brief, positive summary narrative');
        });
    });

    describe('Individual Explanation Templates', () => {
        it('exerciseSubstitutionTemplate should format correctly with reason', () => {
            const change = { type: 'exerciseSubstituted', details: { from: 'Squats', to: 'Leg Press', reason: 'Knee pain' } };
            expect(exerciseSubstitutionTemplate(change)).toBe("Substituted 'Squats' with 'Leg Press' based on feedback related to Knee pain.");
        });

        it('exerciseSubstitutionTemplate should format correctly without reason', () => {
             const change = { type: 'exerciseSubstituted', details: { from: 'Squats', to: 'Leg Press' } };
            expect(exerciseSubstitutionTemplate(change)).toBe("Substituted 'Squats' with 'Leg Press' based on feedback.");
        });
        
         it('volumeAdjustmentTemplate should format correctly with value', () => {
            const change = { type: 'volumeAdjustment', details: { exercise: 'Bench Press', property: 'sets', change: 'increase', value: 4 } };
            expect(volumeAdjustmentTemplate(change)).toBe("Adjusted sets for 'Bench Press' (increase to 4) as requested.");
        });
        
         it('volumeAdjustmentTemplate should format correctly without value', () => {
            const change = { type: 'volumeAdjustment', details: { exercise: 'Bench Press', property: 'reps', change: 'decrease' } };
            expect(volumeAdjustmentTemplate(change)).toBe("Adjusted reps for 'Bench Press' (decrease) as requested.");
        });
        
         it('scheduleChangeTemplate should format correctly', () => {
            const change = { type: 'scheduleChange', details: { type: 'move', details: 'Moved Monday to Tuesday' } };
            expect(scheduleChangeTemplate(change)).toBe("Updated the schedule (move): Moved Monday to Tuesday.");
        });
        
        // Add tests for other individual templates when created
    });
    
    // Tests for output format templates (accessing via adjustmentPrompts)
    describe('Output Format Templates', () => {
         it('adjustedPlanFormat should exist and be a string', () => {
             // Access via the imported object
             expect(adjustmentPrompts.adjustedPlanFormat).toBeDefined(); 
             expect(typeof adjustmentPrompts.adjustedPlanFormat).toBe('string');
         });
          it('changeLogFormat should exist and be a string', () => {
             // Access via the imported object
             expect(adjustmentPrompts.changeLogFormat).toBeDefined();
             expect(typeof adjustmentPrompts.changeLogFormat).toBe('string');
         });
    });
}); 