const Handlebars = require('handlebars');

// --- Template Definitions ---

const baseTemplate = Handlebars.compile(`
You are an expert AI Fitness Coach, with decades of experience in all aspects of fitness. Your task is to generate a safe, effective, and personalized weekly workout plan based on the provided user profile, goals, and research insights. You should also determine the appropriate periodization - e.g., how many weeks should the plan run - of the specific plan, based on the specific user's goals and preferences. Focus on evidence-based practices.

## User Profile:
- Fitness Level: {{userProfile.fitnessLevel}}
{{#if userProfile.age}}- Age: {{userProfile.age}}{{/if}}
{{#if userProfile.gender}}- Gender: {{userProfile.gender}}{{/if}}
{{#if userProfile.preferences.exerciseTypes}}- Preferred Exercise Types: {{join userProfile.preferences.exerciseTypes ', '}}{{/if}}
{{#if userProfile.equipment}}- Available Equipment: {{join userProfile.equipment ', '}}{{/if}}
{{#if userProfile.preferences.workoutFrequency}}- Desired Workout Frequency: {{userProfile.preferences.workoutFrequency}}{{/if}}

## CRITICAL EQUIPMENT CONSTRAINTS:
{{#if userProfile.equipment}}
YOU MUST ONLY use exercises that can be performed with the following available equipment: {{join userProfile.equipment ', '}}.
DO NOT include any exercises that require equipment not listed above. If an exercise typically requires unavailable equipment, suggest a modification using only the available equipment or use bodyweight alternatives.
{{else}}
USER HAS NO EQUIPMENT - Use only bodyweight exercises. DO NOT include any exercises requiring weights, machines, or equipment.
{{/if}}

## Fitness Goals:
- Primary Goals: {{join goals ', '}}

## Relevant Research Insights:
{{#if researchData.exercises}}
- Recommended Exercises (based on research):
{{#each (limit researchData.exercises 5)}}  - {{this.name}}: {{this.summary}} (Reliability: {{#if this.isReliable}}High{{else}}Check Citations{{/if}})
{{/each}}
{{else}}
- No specific exercise research provided.
{{/if}}
{{#if researchData.techniques}}
- Key Technique Focus:
{{#each (limit researchData.techniques 2)}}  - {{this.exercise}}: {{this.summary}}
{{/each}}
{{/if}}
{{#if researchData.progressions}}
- Progression Strategies:
{{#each (limit researchData.progressions 2)}}  - {{this.strategy_name}}: {{this.description}}
{{/each}}
{{/if}}
{{#unless (or researchData.exercises researchData.techniques researchData.progressions)}}
- No specific research data provided. Rely on general best practices.
{{/unless}}

## Safety Guidelines & Constraints:
- Prioritize safety and proper form in all exercise selections.
- Ensure the workout intensity matches the user's specified fitness level ({{userProfile.fitnessLevel}}).
- Include appropriate warm-up and cool-down phases (or mention their importance).
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

// --- Public Function ---

/**
 * Generates a complete workout system prompt using Handlebars templates.
 * @param {Object} userProfile - User profile data.
 * @param {string[]} goals - User fitness goals.
 * @param {Object} researchData - Research insights.
 * @param {string} [injuryPrompt=''] - Pre-formatted string detailing injury constraints.
 * @returns {string} The compiled system prompt string.
 */
function generateWorkoutPrompt(userProfile, goals, researchData, injuryPrompt = '') {
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
                equipment: userProfile.equipment || [],
                constraints: userProfile.preferences?.constraints || []
            },
            injuries: userProfile.injuries || []
        },
        goals,
        researchData: {
            exercises: researchData?.exercises || [],
            techniques: researchData?.techniques || [],
            progressions: researchData?.progressions || []
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

module.exports = { generateWorkoutPrompt }; 