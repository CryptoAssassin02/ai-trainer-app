// Shared Handlebars helpers and goal strategy loader for workout prompt generation

const registerWorkoutHelpers = (Handlebars) => {
  Handlebars.registerHelper('eq', (a, b) => a === b);
  Handlebars.registerHelper('gt', function(a, b) {
    return a > b;
  });
  Handlebars.registerHelper('join', function(array, separator) {
    return Array.isArray(array) ? array.join(separator) : '';
  });
  Handlebars.registerHelper('slice', function(array, start, end) {
    return Array.isArray(array) ? array.slice(start, end) : [];
  });
  Handlebars.registerHelper('limit', function(arr, limit) {
    return arr ? arr.slice(0, limit) : [];
  });
  Handlebars.registerHelper('or', function(...args) {
    const options = args.pop();
    return args.some(Boolean);
  });
};

function loadGoalSpecificInstructions(goals, primaryGoal = null) {
  if (!goals || goals.length === 0) {
    return '';
  }

  const normalize = (g) => (typeof g === 'string' ? g.toLowerCase().trim().replace(/\s+/g, '_') : g);
  const normalizedPrimary = primaryGoal ? normalize(primaryGoal) : null;

  const goalStrategyMap = {
    'strength': () => require('../agents/goal-strategies/strength-strategy'),
    'hypertrophy': () => require('../agents/goal-strategies/hypertrophy-strategy'),
    'muscle_gain': () => require('../agents/goal-strategies/hypertrophy-strategy'), // Alias
    'weight_loss': () => require('../agents/goal-strategies/weight-loss-strategy'),
    'sports_performance': () => require('../agents/goal-strategies/sports-performance-strategy'),
    'flexibility': () => require('../agents/goal-strategies/flexibility-strategy'),
    'general_fitness': () => require('../agents/goal-strategies/general-fitness-strategy'),
    'endurance': () => require('../agents/goal-strategies/endurance-strategy'),
    'body_recomposition': () => require('../agents/goal-strategies/body-recomposition-strategy')
  };

  let combinedInstructions = '';
  const processedGoals = new Set();

  // Process primary goal first if specified
  if (normalizedPrimary && goalStrategyMap[normalizedPrimary] && !processedGoals.has(normalizedPrimary)) {
    try {
      const StrategyClass = goalStrategyMap[normalizedPrimary]();
      const strategy = new StrategyClass();
      combinedInstructions += `\n## PRIMARY GOAL FOCUS (${(primaryGoal || normalizedPrimary).toString().toUpperCase()}):\n`;
      combinedInstructions += strategy.getPromptInstructions({});
      processedGoals.add(normalizedPrimary);
    } catch (error) {
      console.warn(`[WorkoutPrompts] Failed to load primary goal strategy for ${primaryGoal}:`, error.message);
    }
  }

  // Process remaining goals
  const remainingGoals = goals.filter(goal => normalize(goal) !== normalizedPrimary);
  if (remainingGoals.length > 0) {
    combinedInstructions += `\n## SECONDARY GOAL CONSIDERATIONS:\n`;
    remainingGoals.forEach(goal => {
      const normalizedGoal = normalize(goal);
      if (goalStrategyMap[normalizedGoal]) {
        try {
          const StrategyClass = goalStrategyMap[normalizedGoal]();
          const strategy = new StrategyClass();
          combinedInstructions += `\n### ${goal.toUpperCase()} INTEGRATION:\n`;
          combinedInstructions += strategy.getPromptInstructions({});
        } catch (error) {
          console.warn(`[WorkoutPrompts] Failed to load goal strategy for ${goal}:`, error.message);
        }
      }
    });
  }

  return combinedInstructions;
}

// Optional: map raw DB row fields to camelCase prompt-friendly shape (usually not needed if service returns camelCase)
const mapProfileFields = (dbProfile) => ({
  age: dbProfile.age,
  gender: dbProfile.gender,
  height: dbProfile.height,
  weight: dbProfile.weight,
  unitPreference: dbProfile.unit_preference,
  experienceLevel: dbProfile.experience_level,
  fitnessGoals: dbProfile.fitness_goals,
  primaryGoal: dbProfile.primary_goal,
  workoutFrequency: dbProfile.workout_frequency,
  exerciseTypes: dbProfile.exercise_types || [],
  gymCategory: dbProfile.gym_category,
  medicalConditions: dbProfile.medical_conditions || []
});

module.exports = {
  registerWorkoutHelpers,
  loadGoalSpecificInstructions,
  mapProfileFields
};


