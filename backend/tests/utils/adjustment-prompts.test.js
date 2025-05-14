const adjustmentPrompts = require('../../utils/adjustment-prompts');

// Destructure functions needed for tests
const {
  getFeedbackParsingPrompt,
  getExplanationSummaryPrompt,
  generateAdjustmentPrompt,
  generateSpecializedPrompt,
  formatAdjustedOutput,
  systemPromptTemplate // Import the default template function
} = adjustmentPrompts;

const Handlebars = require('handlebars');

// Mock data for tests
const mockUserProfile = {
  fitnessLevel: 'intermediate',
  age: 30,
  gender: 'male',
  preferences: {
    exerciseTypes: ['strength', 'cardio'],
    equipment: ['dumbbells', 'barbell'],
    workoutFrequency: '3x per week'
  }
};

const mockOriginalPlanShort = {
  planName: 'Short Plan',
  weeklySchedule: {
    Monday: { sessionName: 'Upper Body', exercises: [{ exercise: 'Bench Press', sets: 3, repsOrDuration: '8-10' }] },
    Wednesday: 'Rest',
    Friday: { sessionName: 'Lower Body', exercises: [{ exercise: 'Squats', sets: 3, repsOrDuration: '8-10' }] }
  }
};

const mockOriginalPlanLong = {
  planName: 'Long Detailed Plan',
  weeklySchedule: {
    Monday: { sessionName: 'Push Day', exercises: Array(15).fill({ exercise: 'Exercise', sets: 3, repsOrDuration: '10' }) },
    Tuesday: { sessionName: 'Pull Day', exercises: Array(15).fill({ exercise: 'Exercise', sets: 3, repsOrDuration: '10' }) },
    Wednesday: 'Rest',
    Thursday: { sessionName: 'Leg Day', exercises: Array(15).fill({ exercise: 'Exercise', sets: 3, repsOrDuration: '10' }) },
    Friday: 'Rest',
    Saturday: { sessionName: 'Accessory', exercises: Array(15).fill({ exercise: 'Exercise', sets: 3, repsOrDuration: '10' }) },
    Sunday: 'Rest',
  }
};

const mockUserFeedback = "I felt some pain in my knee during squats, and I don't have a barbell.";

const mockParsedFeedbackBase = {
  substitutions: [],
  volumeAdjustments: [],
  intensityAdjustments: [],
  scheduleChanges: [],
  restPeriodChanges: [],
  equipmentLimitations: [],
  painConcerns: [],
  generalFeedback: 'Felt good overall.'
};

describe('Utility: adjustment-prompts', () => {
  describe('getFeedbackParsingPrompt()', () => {
    it('should return a non-empty string', () => {
      const prompt = getFeedbackParsingPrompt();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should contain specific keywords related to parsing feedback', () => {
      const prompt = getFeedbackParsingPrompt();
      expect(prompt).toContain('parse user feedback');
      expect(prompt).toContain('extract structured information');
      expect(prompt).toContain('JSON object');
      expect(prompt).toContain('substitutions');
      expect(prompt).toContain('volumeAdjustments');
      expect(prompt).toContain('intensityAdjustments');
      // Add more keyword checks if necessary
    });
  });

  describe('getExplanationSummaryPrompt()', () => {
    it('should return a non-empty string when given an empty array', () => {
      const prompt = getExplanationSummaryPrompt([]);
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
      expect(prompt).toContain(`Adjustments Made:\n\n`);
    });

    it('should return a formatted string including details of provided changes', () => {
      const changes = [
        { type: 'substitution', details: { from: 'squats', to: 'leg press' }, reason: 'knee pain' },
        { type: 'volume', details: { exercise: 'bench press', property: 'sets', change: 'increase', value: 4 } },
      ];
      const prompt = getExplanationSummaryPrompt(changes);
      expect(typeof prompt).toBe('string');
      expect(prompt).toContain('Adjustments Made:');
      // Check if details are stringified (basic check)
      expect(prompt).toContain('- substitution: {"from":"squats","to":"leg press"}');
      expect(prompt).toContain('- volume: {"exercise":"bench press","property":"sets","change":"increase","value":4}');
      expect(prompt).toContain('Provide a brief, positive summary narrative');
    });

     it('should handle changes with missing details gracefully', () => {
        const changes = [
            { type: 'schedule', details: 'Moved leg day' } // Missing reason potentially
        ];
        const prompt = getExplanationSummaryPrompt(changes);
        expect(typeof prompt).toBe('string');
        expect(prompt).toContain('- schedule: "Moved leg day"');
        expect(prompt).toContain('Provide a brief, positive summary narrative');
    });
  });

  describe('generateAdjustmentPrompt()', () => {
    it('should generate a prompt containing original plan, profile, feedback, and schema using default template', () => {
      const prompt = generateAdjustmentPrompt(mockOriginalPlanShort, mockUserProfile, mockUserFeedback, mockParsedFeedbackBase, systemPromptTemplate);
      expect(typeof prompt).toBe('string');
      expect(prompt).toContain('Original Workout Plan:');
      expect(prompt).toContain(JSON.stringify(mockOriginalPlanShort, null, 2)); // Check for full short plan
      expect(prompt).toContain('User Profile:');
      expect(prompt).toContain(`Fitness Level: ${mockUserProfile.fitnessLevel}`);
      expect(prompt).toContain(`Age: ${mockUserProfile.age}`);
      expect(prompt).toContain(`Gender: ${mockUserProfile.gender}`);
      expect(prompt).toContain(`Preferred Exercise Types: ${mockUserProfile.preferences.exerciseTypes.join(', ')}`);
      expect(prompt).toContain(`Available Equipment: ${mockUserProfile.preferences.equipment.join(', ')}`);
      expect(prompt).toContain(`Desired Workout Frequency: ${mockUserProfile.preferences.workoutFrequency}`);
      expect(prompt).toContain('User Feedback:');
      expect(prompt).toContain(mockUserFeedback);
      expect(prompt).toContain('Requested Adjustments:');
      expect(prompt).toContain('Output Format:');
      expect(prompt).toContain('`json');
      expect(prompt).toContain('"adjustedPlan":'); // Check for schema presence
    });

    it('should summarize the original plan if it is too long using default template', () => {
      const prompt = generateAdjustmentPrompt(mockOriginalPlanLong, mockUserProfile, mockUserFeedback, mockParsedFeedbackBase, systemPromptTemplate);
      expect(prompt).toContain('Original Workout Plan:');
      expect(prompt).not.toContain(JSON.stringify(mockOriginalPlanLong, null, 2)); // Should NOT contain full long plan
      expect(prompt).toContain('Long Detailed Plan with 7 days and 60 exercises.'); // Check for summary text
      expect(prompt).toContain('Full plan details available but summarized for brevity.');
    });

    it('should handle user profiles with missing optional fields using default template', () => {
      const partialProfile = {
        fitnessLevel: 'beginner',
        // age and gender missing
        preferences: {
          // exerciseTypes and equipment missing
          workoutFrequency: '2x per week'
        }
      };
      const prompt = generateAdjustmentPrompt(mockOriginalPlanShort, partialProfile, mockUserFeedback, mockParsedFeedbackBase, systemPromptTemplate);
      expect(prompt).toContain('User Profile:');
      expect(prompt).toContain(`Fitness Level: ${partialProfile.fitnessLevel}`);
      expect(prompt).not.toContain('Age:');
      expect(prompt).not.toContain('Gender:');
      expect(prompt).not.toContain('Preferred Exercise Types:');
      expect(prompt).not.toContain('Available Equipment:');
      expect(prompt).toContain(`Desired Workout Frequency: ${partialProfile.preferences.workoutFrequency}`);
    });

    it('should correctly include different types of parsed feedback using default template', () => {
      const detailedFeedback = {
        substitutions: [{ from: 'Squats', to: 'Leg Press', reason: 'knee pain' }],
        volumeAdjustments: [{ exercise: 'Bench Press', property: 'reps', change: 'increase', value: '10-12', reason: 'too easy' }],
        intensityAdjustments: [{ exercise: 'Deadlift', change: 'decrease', parameter: 'weight', reason: 'focus on form' }],
        scheduleChanges: [{ type: 'move', details: 'Leg Day to Thursday', reason: 'conflicts' }],
        restPeriodChanges: [{ type: 'between_sets', change: 'decrease', value: '60s' }],
        equipmentLimitations: [{ equipment: 'Barbell', reason: 'unavailable' }],
        painConcerns: [{ area: 'Knee', exercise: 'Squats', severity: 'moderate' }],
        generalFeedback: 'Overall good session.'
      };
      const prompt = generateAdjustmentPrompt(mockOriginalPlanShort, mockUserProfile, mockUserFeedback, detailedFeedback, systemPromptTemplate);

      expect(prompt).toContain('### Exercise Substitutions:');
      expect(prompt).toContain("- Replace \"Squats\" with \"Leg Press\" - Reason: knee pain");
      expect(prompt).toContain('### Volume Adjustments:');
      expect(prompt).toContain("- Increase reps for \"Bench Press\" to 10-12 - Reason: too easy");
      expect(prompt).toContain('### Intensity Adjustments:');
      expect(prompt).toContain("- Decrease weight for \"Deadlift\" - Reason: focus on form");
      expect(prompt).toContain('### Schedule Changes:');
      expect(prompt).toContain("- Move schedule: Leg Day to Thursday - Reason: conflicts");
      expect(prompt).toContain('### Rest Period Changes:');
      expect(prompt).toContain("- Decrease rest between_sets to 60s"); // Reason optional in template
      expect(prompt).toContain('### Equipment Limitations:');
      expect(prompt).toContain("- Equipment unavailable: \"Barbell\" - Reason: unavailable");
      expect(prompt).toContain('### Pain/Discomfort Concerns:');
      expect(prompt).toContain("- Pain in Knee during \"Squats\" - Severity: moderate");
      // General feedback is part of userFeedback section, not Requested Adjustments
    });

    it('should handle cases where parsed feedback categories are empty using default template', () => {
        const emptyFeedback = { ...mockParsedFeedbackBase };
        const prompt = generateAdjustmentPrompt(mockOriginalPlanShort, mockUserProfile, mockUserFeedback, emptyFeedback, systemPromptTemplate);

        expect(prompt).not.toContain('### Exercise Substitutions:');
        expect(prompt).not.toContain('### Volume Adjustments:');
        expect(prompt).not.toContain('### Intensity Adjustments:');
        expect(prompt).not.toContain('### Schedule Changes:');
        expect(prompt).not.toContain('### Rest Period Changes:');
        expect(prompt).not.toContain('### Equipment Limitations:');
        expect(prompt).not.toContain('### Pain/Discomfort Concerns:');
        // Should still contain other sections like Original Plan, User Profile etc.
        expect(prompt).toContain('Original Workout Plan:');
        expect(prompt).toContain('User Profile:');
        expect(prompt).toContain('User Feedback:');
        expect(prompt).toContain('Requested Adjustments:'); // The section title exists, just no content under it
        expect(prompt).toContain('Output Format:');
    });

    it('should return a fallback prompt if the provided template function throws an error', () => {
      // Create a mock template function that throws
      const mockTemplateThatThrows = jest.fn().mockImplementation(() => {
        throw new Error('Simulated Handlebars execution error');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Pass the mock template function as the last argument
      const prompt = generateAdjustmentPrompt(mockOriginalPlanShort, mockUserProfile, mockUserFeedback, mockParsedFeedbackBase, mockTemplateThatThrows);

      // Assert fallback prompt is returned
      expect(prompt).toBe(`Adjust the workout plan "${mockOriginalPlanShort.planName || 'Workout Plan'}" based on this feedback: ${mockUserFeedback}. Output as JSON.`);
      // Assert the error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error executing Handlebars template:'), expect.any(Error));
      // Assert the mock template was called
      expect(mockTemplateThatThrows).toHaveBeenCalledTimes(1);

      // Restore console spy
      consoleErrorSpy.mockRestore();
    });
  });

  describe('generateSpecializedPrompt()', () => {
    const testProfile = { fitnessLevel: 'intermediate' };

    it('should generate correct prompt for painConcern', () => {
      const data = { area: 'Knee' };
      const prompt = generateSpecializedPrompt('painConcern', data, testProfile);
      expect(prompt).toContain('adjustments related to pain in the Knee');
      expect(prompt).toContain('extra caution is required');
    });

    it('should generate correct prompt for equipmentLimitation', () => {
      const data = { equipment: 'Barbell' };
      const prompt = generateSpecializedPrompt('equipmentLimitation', data, testProfile);
      expect(prompt).toContain('adjustments related to equipment limitations (missing Barbell)');
      expect(prompt).toContain('Select alternative exercises');
    });

    it('should generate correct prompt for progression', () => {
      const data = {}; // Data might be empty for this type
      const prompt = generateSpecializedPrompt('progression', data, testProfile);
      expect(prompt).toContain('adjustments related to progression');
      expect(prompt).toContain('follow proper progression principles');
    });

    it('should generate correct prompt for substitution', () => {
      const data = { from: 'Squat', to: 'Leg Press' };
      const prompt = generateSpecializedPrompt('substitution', data, testProfile);
      expect(prompt).toContain("When substituting 'Squat' with 'Leg Press'");
      expect(prompt).toContain('Target the same primary muscle groups');
      expect(prompt).toContain(testProfile.fitnessLevel);
    });

    it('should generate correct prompt for volume adjustment', () => {
      const data = { exercise: 'Bench Press', change: 'increase', property: 'sets' };
      const prompt = generateSpecializedPrompt('volume', data, testProfile);
      expect(prompt).toContain("When adjusting volume for 'Bench Press' (increase sets)");
      expect(prompt).toContain('Maintain appropriate total volume');
      expect(prompt).toContain(testProfile.fitnessLevel);
    });

     it('should generate correct prompt for intensity adjustment', () => {
      const data = { exercise: 'Deadlift', change: 'decrease', parameter: 'weight' };
      const prompt = generateSpecializedPrompt('intensity', data, testProfile);
      expect(prompt).toContain("When adjusting intensity for 'Deadlift' (decrease weight)");
      expect(prompt).toContain('Safety is paramount');
       expect(prompt).toContain(testProfile.fitnessLevel);
    });

     it('should generate correct prompt for schedule adjustment', () => {
      const data = { type: 'move' };
      const prompt = generateSpecializedPrompt('schedule', data, testProfile);
      expect(prompt).toContain('When adjusting the schedule (move)');
      expect(prompt).toContain('Maintain adequate recovery');
    });

     it('should generate correct prompt for rest adjustment', () => {
      const data = { change: 'decrease', type: 'between_sets' };
      const prompt = generateSpecializedPrompt('rest', data, testProfile);
      expect(prompt).toContain('When adjusting rest periods (decrease between_sets)');
      expect(prompt).toContain('Match rest periods to training goals');
    });

    it('should return an empty string for unknown adjustmentType', () => {
      const prompt = generateSpecializedPrompt('unknownType', {}, testProfile);
      expect(prompt).toBe('');
    });

    it('should handle missing data gracefully within templates', () => {
        // Test a type that uses data extensively, like 'substitution'
        const data = {}; // Missing 'from' and 'to'
        const prompt = generateSpecializedPrompt('substitution', data, testProfile);
        // Handlebars will render empty strings for missing properties
        expect(prompt).toContain("When substituting '' with ''");
        expect(prompt).toContain(testProfile.fitnessLevel);
    });
  });

  describe('formatAdjustedOutput()', () => {
    const mockAdjustedPlan = {
      planName: 'Adjusted Strength Plan',
      weeklySchedule: {
        Monday: { sessionName: 'Push', exercises: [{ exercise: 'Incline Press', sets: 4, repsOrDuration: '6-8' }] },
        Wednesday: 'Rest',
        Friday: { sessionName: 'Pull', exercises: [{ exercise: 'Pull Ups', sets: 3, repsOrDuration: 'AMRAP' }] }
      },
      warmupSuggestion: '5 min cardio, dynamic stretching'
    };
    const mockChanges = [
      { type: 'substitution', details: 'Replaced Flat Bench with Incline Press', reason: 'Upper chest focus' },
      { type: 'volume', details: 'Increased sets for Incline Press to 4', reason: 'Progression' }
    ];
    const mockExplanations = {
      substitution_reason: 'Incline Press targets the upper chest more effectively.',
      volume_change: 'Increased volume to stimulate further muscle growth.'
    };

    it('should format the adjusted plan, changes, and explanations into a valid JSON string', () => {
      const jsonString = formatAdjustedOutput(mockAdjustedPlan, mockChanges, mockExplanations);
      expect(typeof jsonString).toBe('string');

      // Try parsing the string to validate JSON
      let parsedOutput;
      expect(() => {
        parsedOutput = JSON.parse(jsonString);
      }).not.toThrow();

      // Check structure and content
      expect(parsedOutput).toHaveProperty('adjustedPlan');
      expect(parsedOutput.adjustedPlan).toEqual(mockAdjustedPlan);
      expect(parsedOutput).toHaveProperty('changes');
      expect(parsedOutput.changes).toEqual(mockChanges);
      expect(parsedOutput).toHaveProperty('explanations');
      expect(parsedOutput.explanations).toEqual(mockExplanations);
    });

    it('should handle empty changes and explanations', () => {
      const jsonString = formatAdjustedOutput(mockAdjustedPlan, [], {});
       let parsedOutput;
      expect(() => {
        parsedOutput = JSON.parse(jsonString);
      }).not.toThrow();

      expect(parsedOutput.adjustedPlan).toEqual(mockAdjustedPlan);
      expect(parsedOutput.changes).toEqual([]);
      expect(parsedOutput.explanations).toEqual({});
    });

    it('should return a fallback error JSON if JSON.stringify fails', () => {
      // Create circular structure to cause stringify error
      const circularPlan = { ...mockAdjustedPlan };
      circularPlan.self = circularPlan;

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const jsonString = formatAdjustedOutput(circularPlan, mockChanges, mockExplanations);
      let parsedOutput;
      expect(() => {
        parsedOutput = JSON.parse(jsonString);
      }).not.toThrow();

      // Check if it returned the fixed error structure
      expect(parsedOutput).toHaveProperty('error');
      expect(parsedOutput.error).toContain('Failed to format');
      expect(parsedOutput).toHaveProperty('reason');
      expect(parsedOutput.reason).toContain('circular structure'); // Check for specific error message
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error formatting output:'), expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  // Add describe blocks for other functions later
}); 