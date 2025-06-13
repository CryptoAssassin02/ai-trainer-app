const Handlebars = require('handlebars');

// --- Template Definitions ---
const systemPromptTemplate = Handlebars.compile(`
You are an expert AI Fitness Coach, with decades of experience in all aspects of fitness. Your task is to adjust an existing workout plan based on user feedback while maintaining safety, effectiveness, and coherence with the user's goals.

## Original Workout Plan:
{{{originalPlanDetails}}}

## User Profile:
- Fitness Level: {{userProfile.fitnessLevel}}
{{#if userProfile.age}}- Age: {{userProfile.age}}{{/if}}
{{#if userProfile.gender}}- Gender: {{userProfile.gender}}{{/if}}
{{#if userProfile.preferences.exerciseTypes}}- Preferred Exercise Types: {{join userProfile.preferences.exerciseTypes ', '}}{{/if}}
{{#if userProfile.preferences.equipment}}- Available Equipment: {{join userProfile.preferences.equipment ', '}}{{/if}}
{{#if userProfile.preferences.workoutFrequency}}- Desired Workout Frequency: {{userProfile.preferences.workoutFrequency}}{{/if}}

## User Feedback:
{{{userFeedback}}}

## Requested Adjustments:
{{#if parsedFeedback.substitutions}}
### Exercise Substitutions:
{{#each parsedFeedback.substitutions}}
- Replace "{{this.from}}" with "{{this.to}}"{{#if this.reason}} - Reason: {{this.reason}}{{/if}}
{{/each}}
{{/if}}

{{#if parsedFeedback.volumeAdjustments}}
### Volume Adjustments:
{{#each parsedFeedback.volumeAdjustments}}
- {{capitalize this.change}} {{this.property}} for "{{this.exercise}}"{{#if this.value}} to {{this.value}}{{/if}}{{#if this.reason}} - Reason: {{this.reason}}{{/if}}
{{/each}}
{{/if}}

{{#if parsedFeedback.intensityAdjustments}}
### Intensity Adjustments:
{{#each parsedFeedback.intensityAdjustments}}
- {{capitalize this.change}} {{this.parameter}} for "{{this.exercise}}"{{#if this.value}} to {{this.value}}{{/if}}{{#if this.reason}} - Reason: {{this.reason}}{{/if}}
{{/each}}
{{/if}}

{{#if parsedFeedback.scheduleChanges}}
### Schedule Changes:
{{#each parsedFeedback.scheduleChanges}}
- {{capitalize this.type}} schedule: {{this.details}}{{#if this.reason}} - Reason: {{this.reason}}{{/if}}
{{/each}}
{{/if}}

{{#if parsedFeedback.restPeriodChanges}}
### Rest Period Changes:
{{#each parsedFeedback.restPeriodChanges}}
- {{capitalize this.change}} rest {{this.type}}{{#if this.value}} to {{this.value}}{{/if}}{{#if this.reason}} - Reason: {{this.reason}}{{/if}}
{{/each}}
{{/if}}

{{#if parsedFeedback.equipmentLimitations}}
### Equipment Limitations:
{{#each parsedFeedback.equipmentLimitations}}
- Equipment unavailable: "{{this.equipment}}"{{#if this.alternative}} - Suggested alternative: "{{this.alternative}}"{{/if}}{{#if this.reason}} - Reason: {{this.reason}}{{/if}}
{{/each}}
{{/if}}

{{#if parsedFeedback.painConcerns}}
### Pain/Discomfort Concerns:
{{#each parsedFeedback.painConcerns}}
- Pain in {{this.area}}{{#if this.exercise}} during "{{this.exercise}}"{{/if}}{{#if this.severity}} - Severity: {{this.severity}}{{/if}}{{#if this.recommendation}} - User suggestion: {{this.recommendation}}{{/if}}
{{/each}}
{{/if}}

## Safety Guidelines:
- Prioritize safety above all else, especially concerning reported pain/discomfort.
- Ensure substitute exercises don't aggravate any mentioned pain points.
- Maintain proper progression and don't increase intensity/volume too dramatically.
- Respect the user's equipment limitations and constraints.
- Preserve the overall balance of the workout plan (e.g., push/pull balance, major muscle groups).

## Instructions for Plan Adjustment:
1. Make the requested changes while maintaining overall workout coherence and safety.
2. Provide clear explanations for each adjustment, especially if you must modify the request for safety reasons.
3. If a requested change is unsafe or contraindicated, explain why and provide an alternative.
4. Ensure any substitute exercises target similar muscle groups to maintain workout balance.
5. For volume/intensity adjustments, ensure they align with the user's fitness level and goals.
6. For schedule changes, ensure adequate recovery between muscle groups.

## Output Format:
Generate the adjusted workout plan strictly as a valid JSON object matching the following schema. Do NOT include any introductory text, markdown formatting, or explanations outside the JSON structure.

\`\`\`json
{{{jsonSchemaString}}}
\`\`\`
`);

// Templates for different categories of adjustments
const adjustmentCategoryTemplates = {
  substitution: `When substituting '{{exercise.from}}' with '{{exercise.to}}', consider:
- Target the same primary muscle groups
- Match the difficulty level appropriately for {{userProfile.fitnessLevel}}
- Ensure the substitute exercise is safe given any reported pain/limitations
- Use only equipment available to the user`,

  volume: `When adjusting volume for '{{exercise.exercise}}' ({{exercise.change}} {{exercise.property}}), consider:
- Maintain appropriate total volume for {{userProfile.fitnessLevel}} level
- Ensure recovery is still possible with the new volume
- Balance the adjustment with other exercises in the workout
- Progressive overload principles should be followed`,

  intensity: `When adjusting intensity for '{{exercise.exercise}}' ({{exercise.change}} {{exercise.parameter}}), consider:
- Safety is paramount, especially for {{userProfile.fitnessLevel}} users
- Ensure proper form can be maintained at the new intensity
- Consider appropriate rest periods for the intensity level
- Account for the user's adaptation capacity`,

  schedule: `When adjusting the schedule ({{change.type}}), consider:
- Maintain adequate recovery between sessions working the same muscle groups
- Balance the weekly training volume appropriately
- Consider the user's availability and preferences
- Ensure progression can still be tracked effectively`,

  rest: `When adjusting rest periods ({{change.change}} {{change.type}}), consider:
- Match rest periods to training goals (strength, hypertrophy, endurance)
- Account for exercise intensity and complexity
- Consider the user's fitness level and recovery capacity
- Balance shorter/longer rest with volume/intensity adjustments`
};

// Specialized templates for specific situations
const specializedTemplates = {
  painRelated: `For adjustments related to pain in the {{area}}, extra caution is required:
- Avoid movements that reproduce the pain or discomfort
- Consider range of motion limitations as needed
- Focus on proper form and controlled movement
- Start with lower intensity/volume and progress gradually
- Consider if the user should consult a healthcare provider`,

  equipmentLimited: `For adjustments related to equipment limitations (missing {{equipment}}):
- Select alternative exercises that can be performed with available equipment
- Maintain similar movement patterns where possible
- Consider bodyweight alternatives when appropriate
- Ensure the alternative exercises still target the intended muscle groups effectively`,

  progressionRelated: `For adjustments related to progression:
- Ensure changes follow proper progression principles
- Consider the user's training history and adaptations
- Make incremental rather than dramatic changes
- Balance increases in one variable with stability or decreases in others
- Track the changes to evaluate effectiveness`
};

// Output templates
const outputTemplates = {
  adjustedPlan: Handlebars.compile(`{
  "adjustedPlan": {
    "planName": "{{planName}}",
    "weeklySchedule": {
      {{#each weeklySchedule}}
      "{{@key}}": {{#if this.sessionName}}{
        "sessionName": "{{this.sessionName}}",
        "exercises": [
          {{#each this.exercises}}
          {
            "exercise": "{{this.exercise}}",
            "sets": {{this.sets}},
            "repsOrDuration": "{{this.repsOrDuration}}",
            {{#if this.rest}}"rest": "{{this.rest}}",{{/if}}
            {{#if this.notes}}"notes": "{{this.notes}}"{{/if}}
          }{{#unless @last}},{{/unless}}
          {{/each}}
        ]
      }{{else}}"{{this}}"{{/if}}{{#unless @last}},{{/unless}}
      {{/each}}
    },
    {{#if warmupSuggestion}}"warmupSuggestion": "{{warmupSuggestion}}",{{/if}}
    {{#if cooldownSuggestion}}"cooldownSuggestion": "{{cooldownSuggestion}}"{{/if}}
  }`),

  changeLog: Handlebars.compile(`
  "changes": [
    {{#each changes}}
    {
      "type": "{{this.type}}",
      "details": "{{this.details}}",
      "reason": "{{this.reason}}"
    }{{#unless @last}},{{/unless}}
    {{/each}}
  ]`),

  explanations: Handlebars.compile(`
  "explanations": {
    {{#each explanations}}
    "{{@key}}": "{{this}}"{{#unless @last}},{{/unless}}
    {{/each}}
  }`)
};

// Schema for the output format
const outputSchema = {
  type: "object",
  properties: {
    adjustedPlan: {
      type: "object",
      properties: {
        planName: { type: "string", description: "Name for the adjusted workout plan." },
        weeklySchedule: {
          type: "object",
          description: "An object mapping day names to workout sessions or 'Rest'.",
          patternProperties: {
            "^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$": {
              oneOf: [
                { type: "string", enum: ["Rest"] },
                {
                  type: "object",
                  properties: {
                    sessionName: { type: "string", description: "Name for the session." },
                    exercises: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          exercise: { type: "string", description: "Name of the exercise." },
                          sets: { type: "number", description: "Number of sets." },
                          repsOrDuration: { type: "string", description: "Rep range, specific reps, or duration." },
                          rest: { type: "string", description: "Rest period between sets.", optional: true },
                          notes: { type: "string", description: "Optional notes.", optional: true }
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
        warmupSuggestion: { type: "string", description: "Brief suggestion for a warm-up routine.", optional: true },
        cooldownSuggestion: { type: "string", description: "Brief suggestion for a cool-down routine.", optional: true }
      },
      required: ["planName", "weeklySchedule"]
    },
    changes: {
      type: "array",
      description: "List of changes made to the original plan.",
      items: {
        type: "object",
        properties: {
          type: { type: "string", description: "Type of change (e.g., 'substitution', 'volume', 'schedule')." },
          details: { type: "string", description: "Detailed description of the change." },
          reason: { type: "string", description: "Reason for making this change." }
        },
        required: ["type", "details"]
      }
    },
    explanations: {
      type: "object",
      description: "Explanations for the changes and adjustments made.",
      additionalProperties: { type: "string" }
    }
  },
  required: ["adjustedPlan", "changes", "explanations"]
};

// --- Handlebars Helpers ---
Handlebars.registerHelper('join', function(arr, separator) {
  return arr ? arr.join(separator) : '';
});

Handlebars.registerHelper('limit', function(arr, limit) {
  return arr ? arr.slice(0, limit) : [];
});

Handlebars.registerHelper('capitalize', function(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
});

// --- Public Functions ---

/**
 * Generates a system prompt for plan adjustment using Handlebars templates.
 * @param {Object} originalPlan - The original workout plan to adjust.
 * @param {Object} userProfile - User profile data.
 * @param {string} userFeedback - Raw user feedback.
 * @param {Object} parsedFeedback - Structured feedback with adjustments.
 * @param {Function} [compiledTemplate=systemPromptTemplate] - The compiled Handlebars template function to use.
 * @returns {string} The compiled system prompt string.
 */
function generateAdjustmentPrompt(originalPlan, userProfile, userFeedback, parsedFeedback, compiledTemplate = systemPromptTemplate) {
  try {
    // Format the original plan details for display in the prompt
    let originalPlanDetails = JSON.stringify(originalPlan, null, 2);
    if (originalPlanDetails.length > 1000) {
      // If original plan is too long, provide a summarized version
      const dayCount = Object.keys(originalPlan.weeklySchedule || {}).length;
      const exerciseCount = Object.values(originalPlan.weeklySchedule || {})
        .filter(day => day !== 'Rest' && day.exercises)
        .reduce((total, day) => total + day.exercises.length, 0);
      
      originalPlanDetails = `${originalPlan.planName || 'Workout Plan'} with ${dayCount} days and ${exerciseCount} exercises.\nFull plan details available but summarized for brevity.`;
    }

    const context = {
      originalPlanDetails,
      userProfile: {
        ...userProfile,
        preferences: {
          ...(userProfile.preferences || {}),
          exerciseTypes: userProfile.preferences?.exerciseTypes || [],
          equipment: userProfile.preferences?.equipment || [],
          constraints: userProfile.preferences?.constraints || []
        }
      },
      userFeedback,
      parsedFeedback,
      jsonSchemaString: JSON.stringify(outputSchema, null, 2)
    };

    // Use the provided (or default) compiled template function
    return compiledTemplate(context);
  } catch (error) {
    console.error("[AdjustmentPrompts] Error executing Handlebars template:", error);
    // Fallback prompt construction
    const planName = originalPlan?.planName || 'Workout Plan';
    return `Adjust the workout plan "${planName}" based on this feedback: ${userFeedback}. Output as JSON.`;
  }
}

/**
 * Generates a specialized prompt for a specific adjustment type.
 * @param {string} adjustmentType - Type of adjustment (substitution, volume, etc.).
 * @param {Object} data - Data specific to the adjustment.
 * @param {Object} userProfile - User profile data.
 * @returns {string} The specialized prompt string.
 */
function generateSpecializedPrompt(adjustmentType, data, userProfile) {
  let template;
  
  // Select the appropriate template based on the adjustment type
  if (adjustmentType === 'painConcern') {
    template = specializedTemplates.painRelated;
  } else if (adjustmentType === 'equipmentLimitation') {
    template = specializedTemplates.equipmentLimited;
  } else if (adjustmentType === 'progression') {
    template = specializedTemplates.progressionRelated;
  } else if (['substitution', 'volume', 'intensity', 'schedule', 'rest'].includes(adjustmentType)) {
    template = adjustmentCategoryTemplates[adjustmentType];
  } else {
    return ''; // No template for this adjustment type
  }
  
  // Compile the template with Handlebars
  const compiledTemplate = Handlebars.compile(template);
  
  return compiledTemplate({
    exercise: data,
    change: data,
    area: data.area,
    equipment: data.equipment,
    userProfile
  });
}

/**
 * Formats the adjusted plan and explanations into structured JSON.
 * @param {Object} adjustedPlan - The adjusted workout plan.
 * @param {Array} changes - List of changes made.
 * @param {Object} explanations - Explanations for the changes.
 * @returns {string} The formatted JSON string.
 */
function formatAdjustedOutput(adjustedPlan, changes, explanations) {
  try {
    const output = {
      adjustedPlan: adjustedPlan,
      changes: changes,
      explanations: explanations
    };
    return JSON.stringify(output, null, 2);
  } catch (error) {
    console.error("[AdjustmentPrompts] Error formatting output:", error);
    // Return a fixed error JSON structure instead of re-stringifying input
    return JSON.stringify({
      error: "Failed to format adjusted plan output.",
      reason: error.message || "Unknown stringify error"
    });
  }
}

/**
 * Generates the system prompt for parsing user feedback about workout plans.
 * Instructs the LLM to extract structured adjustment information.
 * @returns {string} The system prompt string.
 */
const getFeedbackParsingPrompt = () => {
    return `You are an expert fitness trainer and workout plan analyzer. 
Your task is to parse user feedback about their workout plan and extract structured information about requested adjustments.

IMPORTANT: You are NOT generating a workout plan. You are ONLY parsing and analyzing user feedback to extract structured information.

PARSING GUIDELINES:

1. **POWERLIFTING/STRENGTH FOCUS**: When users mention "powerlifting", "heavy compound", "strength focus", or "low reps":
   - Extract as intensityAdjustments: decrease reps to 3-5 for main lifts, 1-3 for deadlifts
   - Extract as substitutions: favor compound movements (squats, bench, deadlifts, overhead press)

2. **SAFETY CONCERNS**: When users mention pain, injury, or discomfort BUT also request exercises that might aggravate it:
   - PRIORITIZE SAFETY: Extract pain concerns first
   - IGNORE contradictory requests that could cause injury
   - Example: "shoulder injury" + "want overhead movements" = extract painConcerns for shoulder, NOT substitutions for more overhead work

3. **PROGRESSION REQUESTS**: When users say "too easy", "need more challenge", "better progress":
   - Extract as volumeAdjustments: increase sets for all exercises
   - Extract as intensityAdjustments: increase intensity/reps for progression

4. **EQUIPMENT LIMITATIONS**: When users mention specific equipment they have/don't have:
   - Extract as equipmentLimitations: what they can't use
   - ALSO extract as substitutions: suggest alternatives using their available equipment

5. **SPECIFIC EXERCISE REQUESTS**: When users want more of certain movements:
   - Extract as substitutions: replace similar exercises with requested type
   - Example: "more shoulder work" = substitute some exercises with shoulder-focused alternatives

Extract the following information from the user feedback:
1. Exercise substitutions (e.g., "replace squats with leg press")
2. Volume adjustments (e.g., "increase reps for bench press", "decrease sets for deadlifts")
3. Intensity adjustments (e.g., "make the workout more/less intense", "increase weights for bicep curls")
4. Schedule changes (e.g., "move leg day to Friday", "combine upper body workouts")
5. Rest period changes (e.g., "shorter rest between sets", "longer rest days")
6. Equipment limitations (e.g., "don't have access to a barbell")
7. Pain/discomfort concerns (e.g., "knee pain during lunges")

For each identified adjustment, include as much specific information as possible including:
- The specific exercise(s) mentioned
- The specific change requested (increase/decrease/replace/etc.)
- Any numerical values mentioned (sets, reps, weights, durations)
- Any reasons provided for the adjustment (e.g., pain, time constraints, preferences)

DO NOT generate a workout plan. ONLY parse the feedback and return the structured JSON.

Format your response as a valid JSON object with the following structure:
{
  "substitutions": [
    { "from": "exercise_name", "to": "replacement_exercise", "reason": "reason_if_given" }
  ],
  "volumeAdjustments": [
    { "exercise": "exercise_name_or_all", "property": "sets|reps", "change": "increase|decrease", "value": "specific_value_if_given", "reason": "reason_if_given" }
  ],
  "intensityAdjustments": [
    { "exercise": "exercise_name_or_all", "change": "increase|decrease", "parameter": "weight|resistance|speed|pace|reps", "value": "specific_value_if_given", "reason": "reason_if_given" }
  ],
  "scheduleChanges": [
    { "type": "move|combine|split|add_day|remove_day", "details": "specific_details", "reason": "reason_if_given" }
  ],
  "restPeriodChanges": [
    { "type": "between_sets|between_workouts", "change": "increase|decrease", "value": "specific_value_if_given", "reason": "reason_if_given" }
  ],
  "equipmentLimitations": [
    { "equipment": "equipment_name", "alternative": "alternative_if_mentioned", "reason": "reason_if_given" }
  ],
  "painConcerns": [
    { "area": "body_part", "exercise": "exercise_name_or_general", "severity": "description_if_given", "recommendation": "if_user_suggests_solution" }
  ],
  "generalFeedback": "Any general feedback that doesn't fit into the categories above"
}

If the feedback doesn't contain any information for a particular category, include an empty array for that category. 

REMEMBER: You are parsing feedback, NOT generating a workout plan. Respond ONLY with the JSON object that analyzes the user's feedback.`;
};

/**
 * Generates the system prompt for summarizing plan adjustments narratively.
 * @param {Array} appliedChanges - List of changes applied.
 * @returns {string} The system prompt string.
 */
const getExplanationSummaryPrompt = (appliedChanges) => {
    // Basic summary for now, can be expanded
    const changesSummaryText = appliedChanges
        .map(change => `- ${change.type}: ${JSON.stringify(change.details)}`) // Simple string representation
        .join('\n'); // Corrected newline character

    return `You are a helpful and encouraging fitness coach. 
Summarize the following workout plan adjustments clearly and concisely for the user. Explain *why* the changes were made based on their likely feedback (e.g., substitution due to pain, volume increase for progression).

Adjustments Made:
${changesSummaryText}

Provide a brief, positive summary narrative (2-3 sentences) explaining the key changes.`;
};

// --- Placeholder Templates (Can be expanded with more detail/structure) ---

const exerciseSubstitutionTemplate = (change) => `Substituted '${change.details.from}' with '${change.details.to}' based on feedback${change.details.reason ? ` related to ${change.details.reason}` : ''}.`;
const volumeAdjustmentTemplate = (change) => `Adjusted ${change.details.property} for '${change.details.exercise}' (${change.details.change}${change.details.value ? ` to ${change.details.value}` : ''}) as requested.`;
const scheduleChangeTemplate = (change) => `Updated the schedule (${change.details.type}): ${change.details.details}.`;
// ... Add templates for intensity, rest, equipment, pain etc.

// --- Output Format Templates (Example) ---
const adjustedPlanFormat = `{ /* Schema for the adjusted plan JSON */ }`; // Keep as string for example
const changeLogFormat = `{ /* Schema for the change log entry */ }`; // Keep as string for example


module.exports = {
    systemPromptTemplate,
    generateAdjustmentPrompt,
    generateSpecializedPrompt,
    formatAdjustedOutput,
    getFeedbackParsingPrompt,
    getExplanationSummaryPrompt,
    // Export other templates as they are developed
    exerciseSubstitutionTemplate,
    volumeAdjustmentTemplate,
    scheduleChangeTemplate,
    adjustedPlanFormat,
    changeLogFormat
}; 