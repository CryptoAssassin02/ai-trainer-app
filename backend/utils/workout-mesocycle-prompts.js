const Handlebars = require('handlebars');
const { registerWorkoutHelpers, loadGoalSpecificInstructions } = require('./workout-prompt-helpers');

// Register shared helpers (includes eq)
registerWorkoutHelpers(Handlebars);

// Compact Mesocycle Detail Template (Alternative 1)
const mesocycleTemplate = Handlebars.compile(`
You are generating detailed workouts for a single mesocycle. Return ONLY JSON. The API will validate shape.

Context:
{
  "user": {
    "age": {{userProfile.age}},
    "gender": "{{userProfile.gender}}",
    "experienceLevel": "{{userProfile.experienceLevel}}",
    "unitPreference": "{{userProfile.unitPreference}}",
    "weight": {{userProfile.weight}},
    "medicalConditions": [{{#each userProfile.medicalConditions}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}],
    "exerciseTypes": [{{#each userProfile.preferences.exerciseTypes}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}],
    "gymCategory": "{{userProfile.gymCategory}}"
  },
  "goals": {
    "all": [{{#each goals}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}],
    "primary": "{{primaryGoal}}"
  },
  "structure": {
    "mesocycleNumber": {{mesocycleNumber}},
    "totalMesocycles": {{totalMesocycles}},
    "theme": "{{mesocycleTheme}}",
    "durationWeeks": {{mesocycleDuration}},
    "focus": "{{mesocycleFocus}}",
    "daysPerWeek": {{daysPerWeek}}
  }
}

{{{goalSpecificInstructions}}}

Requirements:
- Personalize exercise selection to user.exerciseTypes, experienceLevel, and gymCategory.
- Respect medicalConditions (avoid contraindications).
- If provided, honor Additional Notes (preferences/constraints): {{#if additionalNotes}}"{{additionalNotes}}"{{else}}null{{/if}}.
- Plan for exactly durationWeeks weeks.
- Each week includes exactly daysPerWeek entries: either { "exercises": [...] } or "Rest".
- For each exercise: exercise, sets (1-6), reps (number or "x-y"), restTime (string), notes (short).
- Progression: increase either volume or intensity week-to-week; include brief progression notes per week.
- Keep names precise and standardized; avoid verbose descriptions.

Output:
- JSON matching the mesocycle schema (weeks[].workouts.day1..day7).
- Do not include explanations or headings—JSON only.
`);

function generateMesocyclePrompt({
  userProfile,
  programStructure,
  mesocycleNumber,
  totalMesocycles,
  mesocycleTheme,
  mesocycleDuration,
  mesocycleFocus,
  workoutFrequency,
  goals = [],
  injuryPrompt = '',
  primaryGoal = null
}) {
  // Derive minimal fields for concise context
  const daysPerWeek = programStructure?.trainingFrequency?.daysPerWeek || workoutFrequency || 4;
  const normalizedPrimary = primaryGoal ? primaryGoal.replace('_', ' ') : null;
  const secondaryGoals = Array.isArray(goals)
    ? goals.filter(g => g !== primaryGoal).slice(0, 2).map(g => g.replace('_', ' '))
    : [];
  const goalSpecificInstructions = loadGoalSpecificInstructions(goals, primaryGoal);

  const context = {
    userProfile: {
      ...userProfile,
      preferences: {
        ...(userProfile.preferences || {}),
        exerciseTypes: userProfile.preferences?.exerciseTypes || [],
        gymCategory: userProfile.gymCategory || 'minimal_home',
        constraints: userProfile.preferences?.constraints || []
      },
      injuries: userProfile.injuries || []
    },
    // Include only if present
    additionalNotes: (userProfile && userProfile.additionalNotes && String(userProfile.additionalNotes).trim().length > 0)
      ? String(userProfile.additionalNotes).trim()
      : undefined,
    mesocycleNumber,
    totalMesocycles,
    mesocycleTheme,
    mesocycleDuration,
    mesocycleFocus,
    // concise fields
    daysPerWeek,
    goals,
    primaryGoal: normalizedPrimary,
    secondaryGoals,
    injuryPrompt,
    goalSpecificInstructions
  };

  try {
    return mesocycleTemplate(context);
  } catch (error) {
    console.error("[MesocyclePrompts] Error compiling mesocycle Handlebars template:", error);
    return `Generate detailed exercises for mesocycle ${mesocycleNumber} for a ${userProfile.experienceLevel || userProfile.fitnessLevel} user. ${injuryPrompt}. Output as JSON.`;
  }
}

module.exports = {
  generateMesocyclePrompt,
  mesocycleTemplate
};


