const Handlebars = require('handlebars');
const { getEquipmentConstraintsForCategory } = require('./gym-category-resolver');

// Register Handlebars helpers
Handlebars.registerHelper('getEquipmentConstraintsForCategory', function(gymCategory) {
  return getEquipmentConstraintsForCategory(gymCategory);
});

// Register comparison helpers
Handlebars.registerHelper('gt', function(a, b) {
  return a > b;
});

// Register array helpers
Handlebars.registerHelper('join', function(array, separator) {
  return Array.isArray(array) ? array.join(separator) : '';
});

Handlebars.registerHelper('slice', function(array, start, end) {
  return Array.isArray(array) ? array.slice(start, end) : [];
});

// --- Template Definitions ---

const baseTemplate = Handlebars.compile(`
You are an expert AI Fitness Coach with extensive experience. Generate safe, effective, personalized weekly workout plans based on user profile, goals, and gym access. Determine appropriate periodization (8-16 weeks) based on user goals. Focus on evidence-based practices.

## User Profile:
- Fitness Level: {{userProfile.fitnessLevel}}
{{#if userProfile.age}}- Age: {{userProfile.age}}{{/if}}
{{#if userProfile.gender}}- Gender: {{userProfile.gender}}{{/if}}
{{#if userProfile.preferences.exerciseTypes}}- Preferred Exercise Types: {{join userProfile.preferences.exerciseTypes ', '}}{{/if}}
{{#if userProfile.gymCategory}}- Gym Type: {{userProfile.gymCategory}}{{/if}}
{{#if userProfile.preferences.workoutFrequency}}- **REQUIRED WORKOUT FREQUENCY**: {{userProfile.preferences.workoutFrequency}} days per week (MUST be respected){{/if}}

## CRITICAL EQUIPMENT CONSTRAINTS:
{{#if userProfile.gymCategory}}
{{{getEquipmentConstraintsForCategory userProfile.gymCategory}}}
{{else}}
USER HAS NO GYM ACCESS - Use only bodyweight exercises. DO NOT include any exercises requiring weights, machines, or equipment.
{{/if}}

## Fitness Goals (Max 3):
- Primary Goals: {{join (limit goals 3) ', '}}{{#if primaryGoal}} (Primary: {{primaryGoal}}){{/if}}

## Safety & Constraints:
• Safety first, proper form required
• Match intensity to {{userProfile.fitnessLevel}} level
• Include warm-up/cool-down (or mention importance)
{{#if injuryPrompt}}
{{{injuryPrompt}}}
{{else if userProfile.injuries}}
- CRITICAL: Avoid exercises known to aggravate the user's injuries:
{{#each userProfile.injuries}}  - Injury: {{this}}. Avoid exercises that may aggravate this condition.
{{/each}}
{{/if}}
{{#if userProfile.preferences.constraints}}
- Adhere to user constraints: {{join userProfile.preferences.constraints ', '}}
{{/if}}

{{#if goalSpecificInstructions}}
## Goal-Specific Focus ({{primaryGoal}}):
{{{goalSpecificInstructions}}}
{{/if}}

## Output Format:
Generate the workout plan strictly as a valid JSON object matching the following schema. Do NOT include any introductory text, markdown formatting, or explanations outside the JSON structure.

\`\`\`json
{{{jsonSchemaString}}}
\`\`\`
`);

// Template compilation is done at module load - restart server to pick up changes

const goalTemplates = {
    strength: "Focus on compound lifts (e.g., squats, deadlifts, bench press) with moderate reps (e.g., 5-8) and sufficient rest. Incorporate progressive overload.",
    hypertrophy: "Include a mix of compound and isolation exercises with moderate to high reps (e.g., 8-15). Focus on time under tension and achieving muscle fatigue.",
    endurance: "Emphasize higher reps (e.g., 15+) or longer duration sets with shorter rest periods. Include cardiovascular exercises if appropriate.",
    flexibility: "Incorporate dynamic stretches in the warm-up and static stretches or yoga poses in the cool-down or dedicated sessions.",
    weight_loss: "Combine strength training with cardiovascular exercise. Focus on calorie expenditure through compound movements and moderate-intensity cardio.",
    general_fitness: "Provide a balanced routine covering major muscle groups, cardiovascular health, and basic flexibility."
};

const levelTemplates = {
    beginner: "Use simple exercises with clear instructions. Focus on mastering form before increasing weight. Keep intensity low to moderate.",
    intermediate: "Increase exercise complexity and intensity. Introduce techniques like supersets or drop sets cautiously. Ensure adequate recovery.",
    advanced: "Incorporate advanced techniques (e.g., periodization, complex lifts, intensity methods). Volume and intensity should be challenging but sustainable."
};

// Dynamic Multi-Goal Template - Uses Handlebars for personalization
const multiGoalTemplate = Handlebars.compile(`
You are an expert fitness coach and exercise physiologist specializing in periodized training programs with multi-goal integration.

## User Profile:
- Fitness Level: {{userProfile.fitnessLevel}}
{{#if userProfile.age}}- Age: {{userProfile.age}}{{/if}}
{{#if userProfile.gender}}- Gender: {{userProfile.gender}}{{/if}}
{{#if userProfile.preferences.exerciseTypes}}- Preferred Exercise Types: {{join userProfile.preferences.exerciseTypes ', '}}{{/if}}
{{#if userProfile.gymCategory}}- Gym Type: {{userProfile.gymCategory}}{{/if}}
{{#if userProfile.preferences.workoutFrequency}}- **REQUIRED WORKOUT FREQUENCY**: {{userProfile.preferences.workoutFrequency}} days per week (MUST be respected){{/if}}

## CRITICAL EQUIPMENT CONSTRAINTS:
{{#if userProfile.gymCategory}}
{{{getEquipmentConstraintsForCategory userProfile.gymCategory}}}
{{else}}
USER HAS NO GYM ACCESS - Use only bodyweight exercises. DO NOT include any exercises requiring weights, machines, or equipment.
{{/if}}

## Fitness Goals:
- Selected Goals: {{join goals ', '}}
{{#if primaryGoal}}- Primary Goal: {{primaryGoal}}{{/if}}

## GOAL-SPECIFIC TRAINING INSTRUCTIONS:
{{#if goalSpecificInstructions}}
{{{goalSpecificInstructions}}}
{{/if}}



{{#if (gt goals.length 1)}}
## Multi-Goal Focus (Max 3):
{{#each (limit goals 3)}}• {{this}}{{#unless @last}}, {{/unless}}{{/each}}
- Primary: {{primaryGoal}} (60% emphasis)
{{#if (gt goals.length 1)}}
- Secondary: {{join (slice goals 1 3) ', '}} (40% emphasis)
{{/if}}
- Balance training variables for goal compatibility
{{else}}
## Single Goal Focus: {{#each goals}}{{#if @first}}{{this}}{{/if}}{{/each}}
{{/if}}

## CORE RESPONSIBILITIES:
1. **Multi-Goal Integration**: Blend multiple fitness goals (up to 3) with proper prioritization and compatibility analysis
2. **Periodization Expertise**: Create 8-16 week programs with 2-5 mesocycles following industry best practices
3. **Goal-Specific Programming**: Apply specialized training methods for each goal type
4. **Progressive Overload**: Implement systematic progression strategies across all mesocycles
5. **Individual Adaptation**: Customize programs based on user profile, experience, and constraints

## PROGRAM STRUCTURE REQUIREMENTS:

### DURATION GUIDELINES:
- Beginner Programs: 12-16 weeks
- Intermediate Programs: 10-14 weeks  
- Advanced Programs: 8-12 weeks
- Minimum: 8 weeks for meaningful adaptation
- Maximum: 16 weeks before program refresh

### MESOCYCLE STRUCTURE:
- 2-5 mesocycles per program
- 2-6 weeks per mesocycle
- Logical progression between phases
- Include deload/recovery phases

### WEEKLY STRUCTURE:
{{#if userProfile.preferences.workoutFrequency}}- **MANDATORY**: EXACTLY {{userProfile.preferences.workoutFrequency}} training days per week (USER REQUIREMENT){{else}}- 3-6 training days per week{{/if}}
- Balance work and recovery
- Vary session types and intensities
- Include active recovery options

### EXERCISE VOLUME REQUIREMENTS:
- **Strength/Hypertrophy**: 4-6 exercises per workout (20-30 total for 5-day program)
- **Weight Loss**: 3-5 exercises per workout (15-25 total for 5-day program)  
- **Endurance**: 3-4 exercises per workout (12-20 total for 4-day program)
- **Multi-Goal**: Scale based on primary goal requirements
- Ensure adequate volume for meaningful adaptation

## Safety & Constraints:
• Safety first, proper form required
• Match intensity to {{userProfile.fitnessLevel}} level
• Include warm-up/cool-down (or mention importance)
{{#if injuryPrompt}}
{{{injuryPrompt}}}
{{else if userProfile.injuries}}
- CRITICAL: Avoid exercises known to aggravate the user's injuries:
{{#each userProfile.injuries}}  - Injury: {{this}}. Avoid exercises that may aggravate this condition.
{{/each}}
{{/if}}
{{#if userProfile.preferences.constraints}}
- Adhere to user constraints: {{join userProfile.preferences.constraints ', '}}
{{/if}}

## OUTPUT:
Generate complete JSON per schema:
• Program overview (name, duration, goals)
• Mesocycle breakdown with parameters  
• Weekly workout structure & day-by-day exercise prescriptions
• **CRITICAL**: Include 4-6 exercises per workout day for strength/hypertrophy goals
• Progression & recovery guidelines
• Goal compatibility analysis

Ensure alignment with user goals, experience level, gym access, and time constraints using evidence-based principles.

## Output Format:
Generate the workout plan strictly as a valid JSON object matching the following schema. Do NOT include any introductory text, markdown formatting, or explanations outside the JSON structure.

\`\`\`json
{{{jsonSchemaString}}}
\`\`\`
`);

// Template compilation is done at module load - restart server to pick up changes

// Legacy Schema - Keep for backward compatibility
const outputSchema = {
    type: "object",
    properties: {
        planName: { type: "string", description: "A concise name for the workout plan (e.g., 'Intermediate Strength Plan - 3 Days')." },
        weeklySchedule: {
            type: "object",
            description: "An object mapping day names (e.g., 'Monday', 'Wednesday') to workout sessions or 'Rest'.",
            patternProperties: {
                "^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$": {
                    oneOf: [
                        { type: "string", enum: ["Rest"] },
                        {
                            type: "object",
                            properties: {
                                sessionName: { type: "string", description: "Name for the session (e.g., 'Upper Body Strength', 'Cardio & Core')." },
                                exercises: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            exercise: { type: "string", description: "Name of the exercise." },
                                            sets: { type: "number", description: "Number of sets." },
                                            repsOrDuration: { type: "string", description: "Rep range (e.g., '8-12'), specific reps (e.g., '10'), or duration (e.g., '30 seconds')." },
                                            rest: { type: "string", description: "Rest period between sets (e.g., '60-90 seconds').", optional: true },
                                            notes: { type: "string", description: "Optional notes (e.g., 'Focus on form', 'Tempo 3-1-1').", optional: true }
                                        },
                                        required: ["exercise", "sets", "repsOrDuration"]
                                    }
                                }
                            },
                            required: ["sessionName", "exercises"]
                        }
                    ]
                }
            },
            additionalProperties: false
        },
        warmupSuggestion: { type: "string", description: "Brief suggestion for a dynamic warm-up routine.", optional: true },
        cooldownSuggestion: { type: "string", description: "Brief suggestion for a cool-down routine (e.g., static stretching).", optional: true }
    },
    required: ["planName", "weeklySchedule"]
};

// Multi-Goal Mesocycle Schema - Aligned with Goal Strategy Implementations
const multiGoalMesocycleSchema = {
    type: "object",
    properties: {
        // Program Overview
        programName: { 
            type: "string", 
            description: "Complete program name reflecting primary and secondary goals (e.g., '12-Week Body Recomposition & Strength Program')" 
        },
        programDuration: { 
            type: "object",
            properties: {
                totalWeeks: { type: "number", minimum: 8, maximum: 16 },
                mesocycles: { type: "number", minimum: 2, maximum: 5 }
            },
            required: ["totalWeeks", "mesocycles"]
        },
        
        // Goal Structure - Aligned with Goal Strategy Classes
        goalStructure: {
            type: "object",
            properties: {
                primaryGoal: { 
                    type: "string",
                    enum: ["strength", "hypertrophy", "weight_loss", "sports_performance", "flexibility", "general_fitness", "endurance", "body_recomposition"]
                },
                secondaryGoals: {
                    type: "array",
                    items: {
                        type: "string",
                        enum: ["strength", "hypertrophy", "weight_loss", "sports_performance", "flexibility", "general_fitness", "endurance", "body_recomposition"]
                    },
                    maxItems: 4
                },
                goalPrioritization: {
                    type: "object",
                    properties: {
                        primaryFocus: { type: "number", minimum: 50, maximum: 80 },
                        secondaryFocus: { type: "number", minimum: 20, maximum: 50 }
                    }
                }
            },
            required: ["primaryGoal"]
        },
        
        // Training Frequency - From Goal Strategy getProgressionStrategy()
        trainingFrequency: {
            type: "object",
            properties: {
                daysPerWeek: { 
                    type: "number", 
                    minimum: 3, 
                    maximum: 6,
                    description: "MUST match user's workout frequency preference exactly"
                },
                sessionsPerDay: { type: "number", enum: [1, 2] },
                restDays: { type: "array", items: { type: "string" } }
            },
            required: ["daysPerWeek"]
        },
        
        // Mesocycle Structure - From Goal Strategy getMesocycleStructure()
        mesocycles: {
            type: "array",
            minItems: 2,
            maxItems: 5,
            items: {
                type: "object",
                properties: {
                    mesocycleNumber: { type: "number" },
                    name: { type: "string" },
                    phase: { type: "string" }, // From goal strategies (e.g., "Anatomical Adaptation", "Hypertrophy", "Strength")
                    durationWeeks: { type: "number", minimum: 1, maximum: 6 },
                    focus: { type: "string" }, // From goal strategies focus field
                    
                    // Training Parameters - From Goal Strategy getTrainingParameters()
                    trainingParameters: {
                        type: "object",
                        properties: {
                            volume: { type: "string" }, // e.g., "moderate", "high"
                            intensity: { type: "string" }, // e.g., "moderate (RPE 6-7)"
                            repRange: { type: "string" }, // e.g., "8-12"
                            sets: { type: "string" }, // e.g., "3-4"
                            rest: { type: "string" }, // e.g., "60-90s"
                            exerciseTypes: {
                                type: "array",
                                items: { type: "string" }
                            },
                            // Sport-specific parameters for sports performance
                            sportSpecific: {
                                type: "object",
                                additionalProperties: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    
                    // Progression Strategy - From Goal Strategy methods
                    progressionStrategy: {
                        type: "object",
                        properties: {
                            volumeProgression: { type: "string", enum: ["linear", "undulating", "block", "conjugate"] },
                            intensityProgression: { type: "string", enum: ["linear", "undulating", "step", "wave"] },
                            deloadWeek: { type: "number" }
                        }
                    },
                    
                    // Weekly Structure
                    weeks: {
                        type: "array",
                        minItems: 2,
                        description: "MUST generate ALL weeks for the mesocycle duration (durationWeeks), not just week 1",
                        items: {
                            type: "object",
                            properties: {
                                weekNumber: { type: "number" },
                                weekType: { 
                                    type: "string", 
                                    enum: ["build", "overload", "intensification", "deload", "test", "peak"] 
                                },
                                volumeMultiplier: { type: "number", minimum: 0.4, maximum: 1.3 },
                                intensityRange: { type: "string" },
                                
                                // Special Components - From Goal Strategy training parameters
                                specialComponents: {
                                    type: "object",
                                    properties: {
                                        cardioIntegration: { type: "string" },
                                        mobilityWork: { type: "boolean" },
                                        plyometrics: { type: "boolean" },
                                        circuitTraining: { type: "boolean" },
                                        metabolicFinishers: { type: "boolean" },
                                        functionalMovements: { type: "boolean" },
                                        sportSpecificDrills: { type: "boolean" }
                                    }
                                },
                                
                                // Daily Workouts
                                workouts: {
                                    type: "object",
                                    patternProperties: {
                                        "^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$": {
                                            oneOf: [
                                                { 
                                                    type: "string", 
                                                    enum: ["Rest", "Active Recovery", "Cardio Only", "Mobility Only"] 
                                                },
                                                {
                                                    type: "object",
                                                    properties: {
                                                        sessionName: { type: "string" },
                                                        sessionType: { 
                                                            type: "string",
                                                            enum: ["strength", "hypertrophy", "metabolic", "power", "endurance", "mobility", "sport_specific", "hybrid"]
                                                        },
                                                        primaryGoalFocus: { type: "string" },
                                                        secondaryComponents: { 
                                                            type: "array", 
                                                            items: { type: "string" } 
                                                        },
                                                        targetMuscles: { 
                                                            type: "array", 
                                                            items: { type: "string" } 
                                                        },
                                                        exercises: {
                                                            type: "array",
                                                            items: {
                                                                type: "object",
                                                                properties: {
                                                                    exercise: { type: "string" },
                                                                    category: { type: "string" }, // compound, isolation, functional
                                                                    primaryMuscles: { type: "array", items: { type: "string" } },
                                                                    sets: { type: "number", minimum: 1, maximum: 8 },
                                                                    repsOrDuration: { type: "string" },
                                                                    intensity: { type: "string" },
                                                                    restSeconds: { type: "number", minimum: 15, maximum: 300 },
                                                                    tempo: { type: "string" },
                                                                    rpe: { type: "number", minimum: 5, maximum: 10 },
                                                                    notes: { type: "string" },
                                                                    goalAlignment: {
                                                                        type: "array",
                                                                        items: { type: "string" }
                                                                    },
                                                                    progressionMethod: { type: "string" },
                                                                    equipment: { type: "array", items: { type: "string" } },
                                                                    difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] }
                                                                },
                                                                required: ["exercise", "sets", "repsOrDuration"]
                                                            }
                                                        }
                                                    },
                                                    required: ["sessionName", "sessionType", "exercises"]
                                                }
                                            ]
                                        }
                                    }
                                },
                                progressionNotes: { type: "string" },
                                recoveryGuidelines: { type: "string" }
                            },
                            required: ["weekNumber", "weekType", "workouts"]
                        }
                    }
                },
                required: ["mesocycleNumber", "name", "phase", "durationWeeks", "trainingParameters", "weeks"]
            }
        },
        
        // Overall Progression Strategy - From Goal Strategy getProgressionStrategy()
        progressionStrategy: {
            type: "object",
            properties: {
                overallMethod: { 
                    type: "string",
                    enum: ["linear", "undulating", "block", "conjugate", "hybrid"]
                },
                volumeProgression: { type: "string" },
                intensityProgression: { type: "string" },
                deloadProtocol: {
                    type: "object",
                    properties: {
                        frequency: { type: "string" },
                        volumeReduction: { type: "string" },
                        intensityReduction: { type: "string" }
                    }
                },
                goalSpecificProgression: {
                    type: "object",
                    additionalProperties: {
                        type: "object",
                        properties: {
                            method: { type: "string" },
                            parameters: { type: "object" }
                        }
                    }
                }
            },
            required: ["overallMethod"]
        },
        
        // Compatibility Analysis - From Goal Strategy validateCompatibility()
        compatibilityNotes: {
            type: "object",
            properties: {
                goalConflicts: { type: "array", items: { type: "string" } },
                compromiseStrategies: { type: "array", items: { type: "string" } },
                prioritizationRationale: { type: "string" },
                synergies: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } }
            }
        },
        
        // Recovery Requirements - From Goal Strategy getRecoveryRequirements()
        recoveryRequirements: {
            type: "object",
            properties: {
                restBetweenSets: { type: "string" },
                restBetweenSessions: { type: "string" },
                sleepRecommendation: { type: "string" },
                activeRecoveryDays: { type: "number" },
                deloadWeekFrequency: { type: "number" }
            }
        }
    },
    required: ["programName", "programDuration", "goalStructure", "trainingFrequency", "mesocycles", "progressionStrategy"],
    additionalProperties: false
};

// --- Handlebars Helpers ---
Handlebars.registerHelper('join', function(arr, separator) {
    return arr ? arr.join(separator) : '';
});

Handlebars.registerHelper('limit', function(arr, limit) {
    return arr ? arr.slice(0, limit) : [];
});

Handlebars.registerHelper('or', function(...args) {
    // Remove the options object added by Handlebars
    const options = args.pop();
    return args.some(Boolean);
});

// --- Public Functions ---

/**
 * Dynamically load goal-specific instructions from strategy files
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
 * Build enhanced multi-goal system prompt with dynamic goal loading
 * @param {Object} userProfile - User profile data
 * @param {string[]} goals - User fitness goals
 * @param {Object} gymData - Gym category and exercise preferences
 * @param {string} [injuryPrompt=''] - Pre-formatted injury constraints
 * @param {string} [primaryGoal=null] - User's primary goal
 * @returns {string} Enhanced system prompt with goal-specific instructions
 */
function buildMultiGoalSystemPrompt(userProfile, goals, gymData, injuryPrompt = '', primaryGoal = null) {
    // Load only relevant goal-specific instructions
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
        goals,
        primaryGoal: primaryGoal ? primaryGoal.replace('_', ' ') : null,
        gymData: {
            gymCategory: gymData?.gymCategory || userProfile.gymCategory || 'minimal_home',
            restrictions: gymData?.restrictions || [],
            exerciseTypes: gymData?.exerciseTypes || []
        },
        goalSpecificInstructions,
        jsonSchemaString: JSON.stringify(multiGoalMesocycleSchema, null, 2),
        injuryPrompt
    };

    try {
        return multiGoalTemplate(context);
    } catch (error) {
        console.error("[WorkoutPrompts] Error compiling multi-goal Handlebars template:", error);
        // Fallback to legacy system
        return generateWorkoutPrompt(userProfile, goals, gymData, injuryPrompt);
    }
}

/**
 * Generates a complete workout system prompt using Handlebars templates.
 * @param {Object} userProfile - User profile data.
 * @param {string[]} goals - User fitness goals.
 * @param {Object} gymData - Gym category and exercise preferences.
 * @param {string} [injuryPrompt=''] - Pre-formatted string detailing injury constraints.
 * @returns {string} The compiled system prompt string.
 */
function generateWorkoutPrompt(userProfile, goals, gymData, injuryPrompt = '') {
    const primaryGoal = goals[0]?.toLowerCase().replace(' ', '_') || 'general_fitness';
    const userLevel = userProfile.fitnessLevel?.toLowerCase() || 'beginner';

    const goalInstruction = goalTemplates[primaryGoal] || goalTemplates.general_fitness;
    const levelInstruction = levelTemplates[userLevel] || levelTemplates.beginner;

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
        goals,
        gymData: {
            gymCategory: gymData?.gymCategory || userProfile.gymCategory || 'minimal_home',
            restrictions: gymData?.restrictions || [],
            exerciseTypes: gymData?.exerciseTypes || []
        },
        primaryGoal: primaryGoal.replace('_', ' '),
        goalSpecificInstructions: `${goalInstruction}\n${levelInstruction}`,
        jsonSchemaString: JSON.stringify(outputSchema, null, 2),
        injuryPrompt
    };

    try {
        return baseTemplate(context);
    } catch (error) {
        console.error("[WorkoutPrompts] Error compiling Handlebars template:", error);
        // Fallback to a very basic prompt
        return `Generate a safe workout plan for a ${userLevel} user with goals: ${goals.join(', ')}. ${injuryPrompt}. Output as JSON.`;
    }
}

module.exports = { 
    // Legacy exports (keep for backward compatibility during transition)
    generateWorkoutPrompt,
    
    // New multi-goal exports - DYNAMIC SYSTEM
    multiGoalMesocycleSchema,
    buildMultiGoalSystemPrompt,
    loadGoalSpecificInstructions,
    
    // Legacy schema export (for backward compatibility)
    workoutPlanSchema: outputSchema
}; 