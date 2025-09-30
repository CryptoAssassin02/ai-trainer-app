// Export all agent modules for easy importing
// NOTE: WorkoutGenerationAgent is deprecated in favor of the chunked agents below.
const WorkoutGenerationAgent = require('./workout-generation-agent'); // DEPRECATED
const PlanAdjustmentAgent = require('./plan-adjustment-agent');
const WorkoutStructureAgent = require('./workout-structure-agent');
const WorkoutMesocycleAgent = require('./workout-mesocycle-agent');
// const NutritionAgent = require('./nutrition-agent');
const BaseAgent = require('./base-agent');

module.exports = {
  // Deprecated: kept temporarily for backward compatibility; remove after migration
  WorkoutGenerationAgent,

  // Active agents
  PlanAdjustmentAgent,
  WorkoutStructureAgent,
  WorkoutMesocycleAgent,
  // NutritionAgent,
  BaseAgent
};