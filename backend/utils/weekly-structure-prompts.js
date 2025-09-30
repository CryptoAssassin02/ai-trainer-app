function generateWeeklyStructurePrompt(userProfile, userInputs, mesocycleData, guidelines = {}) {
  const goals = Array.isArray(userInputs?.goals) ? userInputs.goals : [];
  const daysPerWeek = Number(userInputs?.trainingFrequency?.daysPerWeek || userInputs?.daysPerWeek || 4);
  const equipment = Array.isArray(userInputs?.equipment) ? userInputs.equipment : [];
  const focus = mesocycleData?.focus || 'general';
  const duration = Number(mesocycleData?.duration || userInputs?.mesocycleDuration || 4);

  const guidelineText = `Follow evidence-based programming with balanced push/pull/legs or upper/lower splits as appropriate. Ensure at least 1-2 rest days weekly. Avoid consecutive maximal intensity sessions for the same muscle group. Favor progressive overload and recovery alignment.`;

  return [
    `You are an elite strength and conditioning coach creating a weekly training structure.`,
    `User Profile: ${JSON.stringify(userProfile || {})}`,
    `Goals: ${JSON.stringify(goals)}`,
    `Equipment: ${JSON.stringify(equipment)}`,
    `Current Mesocycle: duration=${duration} weeks, focus=${focus}`,
    `Training Frequency: ${daysPerWeek} days/week`,
    `Guidelines: ${guidelineText}`,
    `Output: JSON array matching weeklyStructureSchema: [{week, days:[{day, type, focus?}]}]. Do not include markdown fences.`,
  ].join('\n');
}

module.exports = { generateWeeklyStructurePrompt };
