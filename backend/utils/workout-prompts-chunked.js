const Handlebars = require('handlebars');
const { getEquipmentConstraintsForCategory } = require('./gym-category-resolver');
const { programStructureSchema, mesocycleDetailSchema } = require('./chunked-schemas');

// Register Handlebars helpers (same as existing system)
Handlebars.registerHelper('getEquipmentConstraintsForCategory', function(gymCategory) {
  return getEquipmentConstraintsForCategory(gymCategory);
});

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

// Structure Generation Template (High-level overview)
const structureTemplate = Handlebars.compile(`
You are an expert fitness coach specializing in periodized program design.

## User Profile:
- Fitness Level: {{userProfile.fitnessLevel}}
- Goals: {{join goals ', '}}
- Workout Frequency: {{userProfile.preferences.workoutFrequency}} days per week
- Equipment: {{userProfile.gymCategory}}

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

// Mesocycle Detail Template (Specific exercises)
const mesocycleTemplate = Handlebars.compile(`
You are an expert fitness coach generating detailed workout prescriptions.

## Program Context:
{{{programStructure}}}

## Current Mesocycle: {{mesocycleNumber}} of {{totalMesocycles}}
- Theme: {{mesocycleTheme}}
- Duration: {{mesocycleDuration}} weeks
- Focus: {{mesocycleFocus}}

## User Profile:
- Fitness Level: {{userProfile.fitnessLevel}}
- Equipment: {{userProfile.gymCategory}}
- Constraints: {{join userProfile.preferences.constraints ', '}}

## Task: Generate Detailed Exercises
For this mesocycle, create:
1. Daily workout structure for {{workoutFrequency}} days/week
2. Specific exercises with sets/reps/progression
3. Rest periods and intensity guidelines
4. Week-by-week progression within mesocycle

OUTPUT: Detailed mesocycle JSON per schema.

\`\`\`json
{{{mesocycleSchemaString}}}
\`\`\`
`);

// Schemas are now imported from chunked-schemas.js

/**
 * Load goal-specific instructions from strategy files (same as existing system)
 * @param {string[]} goals - User's selected fitness goals
 * @param {string} primaryGoal - User's primary goal (optional)
 * @returns {string} Combined goal-specific instructions
 */
function loadGoalSpecificInstructions(goals, primaryGoal = null) {
    if (!goals || goals.length === 0) {
        return '';
    }

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
    if (primaryGoal && goalStrategyMap[primaryGoal] && !processedGoals.has(primaryGoal)) {
        try {
            const StrategyClass = goalStrategyMap[primaryGoal]();
            const strategy = new StrategyClass();
            combinedInstructions += `\n## PRIMARY GOAL FOCUS (${primaryGoal.toUpperCase()}):\n`;
            combinedInstructions += strategy.getPromptInstructions({});
            processedGoals.add(primaryGoal);
        } catch (error) {
            console.warn(`[WorkoutPrompts] Failed to load primary goal strategy for ${primaryGoal}:`, error.message);
        }
    }

    // Process remaining goals
    const remainingGoals = goals.filter(goal => !processedGoals.has(goal));
    if (remainingGoals.length > 0) {
        combinedInstructions += `\n## SECONDARY GOAL CONSIDERATIONS:\n`;
        
        remainingGoals.forEach(goal => {
            const normalizedGoal = goal.toLowerCase().replace(' ', '_');
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

/**
 * Generate structure prompt with full context from existing system
 * @param {Object} userProfile - User profile data
 * @param {string[]} goals - User fitness goals
 * @param {Object} gymData - Gym category and exercise preferences
 * @param {string} [injuryPrompt=''] - Pre-formatted injury constraints
 * @param {string} [primaryGoal=null] - User's primary goal
 * @returns {string} Enhanced structure prompt
 */
function generateStructurePrompt(userProfile, goals, gymData, injuryPrompt = '', primaryGoal = null) {
    // Load goal-specific instructions (same as existing system)
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
        const result = structureTemplate(context);
        console.log('[DEBUG] structureTemplate result type:', typeof result);
        console.log('[DEBUG] structureTemplate result length:', result?.length || 0);
        return result;
    } catch (error) {
        console.error("[WorkoutPrompts] Error compiling structure Handlebars template:", error);
        console.error("[WorkoutPrompts] Context was:", JSON.stringify(context, null, 2));
        return `Generate a high-level workout program structure for a ${userProfile.fitnessLevel} user with goals: ${goals.join(', ')}. ${injuryPrompt}. Output as JSON.`;
    }
}

/**
 * Generate mesocycle prompt with program context
 * @param {Object} userProfile - User profile data
 * @param {Object} programStructure - High-level program structure
 * @param {number} mesocycleNumber - Current mesocycle number
 * @param {number} totalMesocycles - Total number of mesocycles
 * @param {string} mesocycleTheme - Theme for this mesocycle
 * @param {number} mesocycleDuration - Duration in weeks
 * @param {string} mesocycleFocus - Focus area for this mesocycle
 * @param {number} workoutFrequency - Days per week
 * @param {string[]} goals - User fitness goals
 * @param {string} [injuryPrompt=''] - Pre-formatted injury constraints
 * @param {string} [primaryGoal=null] - User's primary goal
 * @returns {string} Enhanced mesocycle prompt
 */
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
    // Load goal-specific instructions (same as existing system)
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
        programStructure: JSON.stringify(programStructure, null, 2),
        mesocycleNumber,
        totalMesocycles,
        mesocycleTheme,
        mesocycleDuration,
        mesocycleFocus,
        workoutFrequency,
        goals,
        primaryGoal: primaryGoal ? primaryGoal.replace('_', ' ') : null,
        goalSpecificInstructions,
        mesocycleSchemaString: JSON.stringify(mesocycleDetailSchema, null, 2),
        injuryPrompt
    };

    try {
        return mesocycleTemplate(context);
    } catch (error) {
        console.error("[WorkoutPrompts] Error compiling mesocycle Handlebars template:", error);
        return `Generate detailed exercises for mesocycle ${mesocycleNumber} for a ${userProfile.fitnessLevel} user. ${injuryPrompt}. Output as JSON.`;
    }
}

module.exports = {
  generateStructurePrompt,
  generateMesocyclePrompt,
  structureTemplate,
  mesocycleTemplate,
  loadGoalSpecificInstructions
};
