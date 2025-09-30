function generateAdjustmentPrompt(agentType, editRequest, currentPlanData, context = {}) {
  const normalizedAgent = agentType === 'weekly' ? 'weekly_structure' : agentType;
  const instructions = `
You will adjust a user's workout plan at the specified stage.
- Stage: ${normalizedAgent}
- Edit Request: ${typeof editRequest === 'string' ? editRequest : JSON.stringify(editRequest)}
- Constraints:
  1) Keep output minimal and only change what is requested.
  2) Ensure safety and recovery are respected (no overtraining, 1-2 rest days/week minimum).
  3) For daily workouts, maintain logical progression and valid sets/reps ranges.

Return JSON only with the updated portion:
- For structure: return the updated structure JSON.
- For weekly_structure: return an array of weeks [{ week, days:[{ day, type, focus? }]}].
- For daily_workout: return an array of daily objects [{ day, workout: { name, focus?, estimatedDuration?, exercises:[...] } }].
`.trim();

  const summary = {
    currentStructureSummary: currentPlanData?.structure ? {
      totalMesocycles: currentPlanData.structure.totalMesocycles,
      trainingFrequency: currentPlanData.structure.trainingFrequency
    } : null,
    weeksCount: Array.isArray(currentPlanData?.mesocycles) ? currentPlanData.mesocycles.length : null,
    lastWeeklyStructure: (() => {
      if (!Array.isArray(currentPlanData?.mesocycles)) return null;
      const last = currentPlanData.mesocycles[currentPlanData.mesocycles.length - 1];
      return last?.weekly_structures || null;
    })()
  };

  return [
    `You are an expert coach adjusting a plan.`,
    `Context: ${JSON.stringify(context || {})}`,
    `Current Plan Summary: ${JSON.stringify(summary)}`,
    `Instructions:`,
    instructions,
    `---`,
    `Current Plan Data (relevant excerpt): ${JSON.stringify(currentPlanData || {})}`
  ].join('\n');
}

module.exports = { generateAdjustmentPrompt };
