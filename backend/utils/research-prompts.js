/**
 * @description System prompt to set the context for the Research Agent.
 * Provides a consistent base context for Perplexity AI system messages.
 */
const systemPrompt = "You are a fitness research assistant providing evidence-based information tailored to user profiles.";

// --- Query Templates ---

/**
 * @description Template for generating exercise research queries.
 * Placeholders: {muscleGroup}, {fitnessLevel}, {equipment}, {constraints}, {additionalInstructions}
 */
const exerciseTemplate = "Find exercises targeting {muscleGroup} suitable for {fitnessLevel} users with {equipment}. Provide details including name, description, targeted muscle groups, required equipment, and safety tips. Consider any limitations: {constraints}{additionalInstructions}";

/**
 * @description Template for generating technique research queries.
 * Placeholders: {technique}, {fitnessLevel}, {additionalInstructions}
 */
const techniqueTemplate = "Research proper form and technique for {technique} suitable for {fitnessLevel} users. Provide steps, common mistakes, and benefits{additionalInstructions}";

/**
 * @description Template for generating exercise progression research queries.
 * Placeholders: {exercise}, {fitnessLevel}, {additionalInstructions}
 */
const progressionTemplate = "Find progressions for {exercise} suitable for {fitnessLevel} users. Provide a sequence of variations, difficulty levels, and prerequisites{additionalInstructions}";

/**
 * @description Template for generating nutrition strategy research queries.
 * Placeholders: {goal}, {dietaryRestrictions}, {additionalInstructions}
 */
const nutritionTemplate = "Research nutrition strategies for {goal} considering {dietaryRestrictions}. Provide options, macronutrient breakdowns, and evidence-based benefits{additionalInstructions}";

// --- Output Schemas (JSON Schema for Perplexity AI response_format) ---

/**
 * @description JSON schema for expected structure of exercise query responses.
 */
const exerciseQuerySchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      name: { type: "string", description: "Name of the exercise." },
      description: { type: "string", description: "Brief description of how to perform the exercise." },
      difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"], description: "Difficulty level." },
      equipment: { type: "array", items: { type: "string" }, description: "Equipment needed." },
      muscleGroups: { type: "array", items: { type: "string" }, description: "Primary muscle groups targeted." },
      tags: { type: "array", items: { type: "string" }, description: "Keywords like \"high-impact\", \"plyometric\", etc." },
      citations: { type: "array", items: { type: "string" }, description: "Source citations, e.g., [1] https://example.com" }
    },
    required: ["name", "description", "difficulty", "equipment", "muscleGroups"],
    example: {
        name: "Push-up",
        description: "Standard push-up.",
        difficulty: "intermediate",
        equipment: ["bodyweight"],
        muscleGroups: ["chest", "triceps", "shoulders"],
        tags: ["compound", "bodyweight"],
        citations: ["https://trusted.gov/pushup-guide"]
    }
  },
  example: [{
    name: "Push-up",
    description: "Standard push-up.",
    difficulty: "intermediate",
    equipment: ["bodyweight"],
    muscleGroups: ["chest", "triceps", "shoulders"],
    tags: ["compound", "bodyweight"],
    citations: ["https://trusted.gov/pushup-guide"]
  }]
};

/**
 * @description JSON schema for expected structure of technique query responses.
 */
const techniqueQuerySchema = {
  type: "object",
  properties: {
    exercise: { type: "string", description: "Name of the exercise the technique applies to." },
    formPoints: { type: "array", items: { type: "string" }, description: "Key points for proper form execution." },
    safetyConsiderations: { type: "array", items: { type: "string" }, description: "Specific safety tips or common mistakes to avoid." },
    progressionSteps: { type: "array", items: { type: "string" }, description: "Optional steps to progress towards mastering the exercise." },
    citations: { type: "array", items: { type: "string" }, description: "Source citations." }
  },
  required: ["exercise", "formPoints", "safetyConsiderations"],
  example: {
    exercise: "Squat",
    formPoints: ["Keep back straight", "Chest up"],
    safetyConsiderations: ["Avoid knee valgus"],
    progressionSteps: ["Use lighter weight"],
    citations: ["https://reliable.edu/squat-form"]
  }
};

/**
 * @description JSON schema for expected structure of progression query responses.
 */
const progressionQuerySchema = {
  type: "object",
  properties: {
    goal: { type: "string", description: "The fitness goal the progression strategy addresses." },
    strategies: { type: "array", items: { type: "string" }, description: "List of actionable progression strategies." },
    periodization: { type: "string", description: "Optional suggested periodization model (e.g., linear, undulating)." },
    citations: { type: "array", items: { type: "string" }, description: "Source citations." }
  },
  required: ["goal", "strategies"],
  example: {
    goal: "Strength Gain",
    strategies: ["Increase weight weekly", "Incorporate drop sets"],
    periodization: "Linear",
    citations: ["https://bodybuilding.com/strength-progression"]
  }
};

/**
 * @description JSON schema for expected structure of nutrition query responses.
 */
const nutritionSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      option: { type: "string", description: "Name of the nutrition strategy or food option." },
      macronutrients: {
        type: "object",
        properties: {
          protein: { type: "number", description: "Grams of protein." },
          carbs: { type: "number", description: "Grams of carbohydrates." },
          fats: { type: "number", description: "Grams of fat." }
        },
        // Macronutrients might not always be applicable/required
        required: [] 
      },
      benefits: { type: "array", items: { type: "string" }, description: "Evidence-based benefits." }
    },
    required: ["option", "macronutrients", "benefits"]
  }
};

// --- Helper Function for Dynamic Instructions ---

/**
 * Generates additional instructions based on user profile and constraints.
 * @param {object} [userProfile={}] - User profile object containing fitnessLevel, etc.
 * @param {object} [constraints={}] - Constraints object, potentially with injury info.
 * @returns {string} Dynamically generated instructions string.
 * @example
 * getAdditionalInstructions({ fitnessLevel: 'beginner' }, { injury: 'knee' });
 */
function getAdditionalInstructions(userProfile = {}, constraints = {}) {
  let instructions = [];
  if (userProfile.fitnessLevel === "beginner") {
    instructions.push("Explain in simple terms suitable for beginners.");
  }
  if (constraints?.injury && Array.isArray(constraints.injury) && constraints.injury.length > 0) {
    instructions.push(`Avoid exercises that stress the ${constraints.injury.join(' and ')}.`);
  } else if (constraints?.injury && typeof constraints.injury === 'string') {
      // Handle case where injury might be a single string
      instructions.push(`Avoid exercises that stress the ${constraints.injury}.`);
  }
  // Add more conditions based on other profile/constraint fields as needed
  return instructions.join(" ");
}

// --- Query Formatters ---

/**
 * Builds a query for exercise research using the exerciseTemplate.
 * @description Constructs a detailed exercise query for Perplexity AI.
 * @param {string} muscleGroup - Target muscle group (e.g., "quads").
 * @param {string} fitnessLevel - User's fitness level (e.g., "beginner").
 * @param {string|string[]} [equipment='any'] - Available equipment.
 * @param {string|string[]} [constraints='none'] - User constraints (e.g., injuries).
 * @param {string} [additionalInstructions=''] - Extra instructions.
 * @returns {string} Formatted query string.
 * @example
 * buildExerciseQuery("quads", "beginner", ["dumbbells"], ["knee injury"], "Explain simply.");
 */
function buildExerciseQuery(muscleGroup, fitnessLevel, equipment = 'any', constraints = 'none', additionalInstructions = '') {
  const equipmentStr = Array.isArray(equipment) ? equipment.join(', ') : equipment;
  const constraintsStr = Array.isArray(constraints) ? constraints.join(', ') : constraints;
  return exerciseTemplate
    .replace("{muscleGroup}", muscleGroup || 'any')
    .replace("{fitnessLevel}", fitnessLevel || 'any')
    .replace("{equipment}", equipmentStr || "any")
    .replace("{constraints}", constraintsStr || "none")
    .replace("{additionalInstructions}", additionalInstructions || "");
}

/**
 * Builds a query for technique research using the techniqueTemplate.
 * @param {string} technique - The technique/exercise name.
 * @param {string} fitnessLevel - User's fitness level.
 * @param {string} [additionalInstructions=''] - Extra instructions.
 * @returns {string} Formatted query string.
 */
function buildTechniqueQuery(technique, fitnessLevel, additionalInstructions = '') {
  return techniqueTemplate
    .replace("{technique}", technique || 'general technique')
    .replace("{fitnessLevel}", fitnessLevel || 'any')
    .replace("{additionalInstructions}", additionalInstructions || "");
}

/**
 * Builds a query for progression research using the progressionTemplate.
 * @param {string} exercise - The base exercise for progression.
 * @param {string} fitnessLevel - User's fitness level.
 * @param {string} [additionalInstructions=''] - Extra instructions.
 * @returns {string} Formatted query string.
 */
function buildProgressionQuery(exercise, fitnessLevel, additionalInstructions = '') {
  return progressionTemplate
    .replace("{exercise}", exercise || 'basic exercise')
    .replace("{fitnessLevel}", fitnessLevel || 'any')
    .replace("{additionalInstructions}", additionalInstructions || "");
}

/**
 * Builds a query for nutrition research using the nutritionTemplate.
 * @param {string} goal - The nutrition goal (e.g., "muscle gain").
 * @param {string|string[]} [dietaryRestrictions='none'] - User dietary restrictions.
 * @param {string} [additionalInstructions=''] - Extra instructions.
 * @returns {string} Formatted query string.
 */
function buildNutritionQuery(goal, dietaryRestrictions = 'none', additionalInstructions = '') {
    const restrictionsStr = Array.isArray(dietaryRestrictions) ? dietaryRestrictions.join(', ') : dietaryRestrictions;
  return nutritionTemplate
    .replace("{goal}", goal || 'general health')
    .replace("{dietaryRestrictions}", restrictionsStr || "none")
    .replace("{additionalInstructions}", additionalInstructions || "");
}

// Conceptual mapping for reference, not directly used by agent typically
const queryTypeToSchema = {
    exercise: exerciseQuerySchema,
    technique: techniqueQuerySchema,
    progression: progressionQuerySchema,
};

module.exports = {
    systemPrompt,
    // Schemas
    exerciseQuerySchema,
    techniqueQuerySchema,
    progressionQuerySchema,
    queryTypeToSchema,
    nutritionSchema,
    // Formatters
    buildExerciseQuery,
    buildTechniqueQuery,
    buildProgressionQuery,
    buildNutritionQuery,
    // Helper
    getAdditionalInstructions
}; 