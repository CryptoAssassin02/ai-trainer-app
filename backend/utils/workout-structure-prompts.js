const Handlebars = require('handlebars');
const { registerWorkoutHelpers, loadGoalSpecificInstructions } = require('./workout-prompt-helpers');
const { programStructureSchema } = require('./workout-structure-schema');

// Register shared helpers (includes eq)
registerWorkoutHelpers(Handlebars);

// Enhanced Structure Generation Template
const structureTemplate = Handlebars.compile(`
You are an expert fitness coach specializing in periodized program design.

## User Profile:
- Age: {{userProfile.age}} | Gender: {{userProfile.gender}}
- Experience Level: {{userProfile.experienceLevel}}
- Body Stats: {{userProfile.height}}{{#if (eq userProfile.unitPreference 'imperial')}} in{{else}} cm{{/if}}, {{userProfile.weight}}{{#if (eq userProfile.unitPreference 'imperial')}} lbs{{else}} kg{{/if}}
- Fitness Goals: {{join goals ', '}}
{{#if primaryGoal}}- Primary Goal: {{primaryGoal}} (60% priority){{/if}}
- Workout Frequency: {{userProfile.preferences.workoutFrequency}}
- Preferred Exercises: {{join userProfile.preferences.exerciseTypes ', '}}
- Gym Access: {{userProfile.gymCategory}}
{{#if userProfile.medicalConditions}}- Medical Considerations: {{join userProfile.medicalConditions ', '}}{{/if}}
{{#if additionalNotes}}- Additional Notes: {{additionalNotes}}{{/if}}

{{{goalSpecificInstructions}}}

## Task: Generate Program Structure ONLY
Create a high-level program structure with:
1. Program duration (8-16 weeks)
2. Mesocycle breakdown (2-4 phases)
3. Weekly themes for each mesocycle
4. Training frequency distribution
5. Goal prioritization strategy

DO NOT generate specific exercises or daily workouts.
OUTPUT: Structure JSON only per schema.

\`\`\`json
{{{structureSchemaString}}}
\`\`\`
`);

function generateStructurePrompt(userProfile, goals, gymData, injuryPrompt = '', primaryGoal = null) {
  const goalSpecificInstructions = loadGoalSpecificInstructions(goals, primaryGoal);

  const context = {
    userProfile: {
      ...userProfile,
      gymCategory: userProfile.gymCategory || gymData?.gymCategory || 'minimal_home',
      preferences: {
        ...(userProfile.preferences || {}),
        exerciseTypes: userProfile.preferences?.exerciseTypes || [],
        workoutFrequency: userProfile.preferences?.workoutFrequency || userProfile.workoutFrequency,
        gymCategory: userProfile.gymCategory || gymData?.gymCategory || 'minimal_home',
        constraints: userProfile.preferences?.constraints || []
      },
      injuries: userProfile.injuries || []
    },
    goals,
    primaryGoal: primaryGoal ? primaryGoal.replace('_', ' ') : null,
    additionalNotes: (userProfile && userProfile.additionalNotes && String(userProfile.additionalNotes).trim().length > 0)
      ? String(userProfile.additionalNotes).trim()
      : undefined,
    gymData: {
      gymCategory: gymData?.gymCategory || userProfile.gymCategory || 'minimal_home',
      restrictions: gymData?.restrictions || [],
      exerciseTypes: gymData?.exerciseTypes || []
    },
    goalSpecificInstructions,
    structureSchemaString: JSON.stringify(programStructureSchema, null, 2),
    injuryPrompt
  };

  try {
    return structureTemplate(context);
  } catch (error) {
    console.error("[StructurePrompts] Error compiling structure Handlebars template:", error);
    return `Generate a high-level workout program structure for a ${userProfile.experienceLevel || userProfile.fitnessLevel} user with goals: ${goals.join(', ')}. ${injuryPrompt}. Output as JSON.`;
  }
}

module.exports = {
  generateStructurePrompt,
  structureTemplate
};


