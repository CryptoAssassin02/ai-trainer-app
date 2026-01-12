// Export all agent modules for easy importing
const WorkoutGenerationAgent = require('./workout-generation-agent');
const PlanAdjustmentAgent = require('./plan-adjustment-agent');
// const NutritionAgent = require('./nutrition-agent');
const BaseAgent = require('./base-agent');

module.exports = {
  WorkoutGenerationAgent,
  PlanAdjustmentAgent,
  // NutritionAgent,
  BaseAgent
}; 