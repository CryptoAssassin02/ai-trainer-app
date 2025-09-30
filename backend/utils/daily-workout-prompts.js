function generateDailyWorkoutPrompt(userProfile, weeklyStructure, userInputs, mesocycleData) {
  const daysPerWeek = Number(userInputs?.trainingFrequency?.daysPerWeek || userInputs?.daysPerWeek || 4);
  const equipment = Array.isArray(userInputs?.equipment) ? userInputs.equipment : [];
  const goals = Array.isArray(userInputs?.goals) ? userInputs.goals : [];
  const focus = mesocycleData?.focus || 'general';
  const duration = Number(mesocycleData?.duration || userInputs?.mesocycleDuration || 4);

  const trainingDays = (Array.isArray(weeklyStructure) ? weeklyStructure : [])
    .flatMap(w => Array.isArray(w.days) ? w.days : [])
    .filter(d => d.type === 'training')
    .map(d => ({ day: d.day, focus: d.focus || null }));

  const constraints = `
- Respect recovery: avoid training same primary muscle group on consecutive days.
- Include warm-up guidance implicitly in notes where needed.
- Ensure rep/sets align with goals and difficulty; use ranges when appropriate.
- Prefer compound first, accessories later; include restSeconds.
- Keep within ${daysPerWeek} sessions per week for ${duration} weeks.
  `.trim();

  return [
    `You are an expert coach generating detailed daily workouts from a weekly structure.`,
    `User Profile: ${JSON.stringify(userProfile || {})}`,
    `Goals: ${JSON.stringify(goals)}`,
    `Equipment: ${JSON.stringify(equipment)}`,
    `Mesocycle: duration=${duration} weeks, focus=${focus}`,
    `Weekly Structure Training Days: ${JSON.stringify(trainingDays)}`,
    `Constraints: ${constraints}`,
    // New strict structured output contract
    `Output: OBJECT matching dailyWorkoutSchema with property daily_workouts:`,
    `daily_workouts: [`,
    `  {`,
    `    week: <number 1..${duration}>,`,
    `    day: <one of Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday>,`,
    `    displayName: <string like "Monday (Week 1)">,`,
    `    workout: {`,
    `      name: <string>,`,
    `      focus: <string>,`,
    `      estimatedDuration: <integer minutes>,`,
    `      exercises: [`,
    `        { name: <string>, category: <string>, primaryMuscles: [<string>], secondaryMuscles: [<string>], sets: <int>, reps: <"8-12" or "10">, tempo: <string>, restSeconds: <int>, equipment: [<string>], notes: <string> }`,
    `      ]`,
    `    }`,
    `  }
    ]`,
    `Rules:`,
    `- The "day" field MUST be a plain weekday (e.g., "Monday").`,
    `- Put any week annotation ONLY in "displayName" (e.g., "Monday (Week 1)").`,
    `- The root must be an object with key "daily_workouts" (no markdown fences).`
  ].join('\n');
}

module.exports = { generateDailyWorkoutPrompt };
