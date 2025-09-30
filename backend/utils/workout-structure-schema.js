// High-level structure schema
// 
// CRITICAL: OpenAI Structured Output Requirements with strict=true:
// 1. ALL objects MUST have "additionalProperties: false"
// 2. ALL objects with properties MUST have a "required" array
// 3. The "required" array MUST include ALL properties (no optional properties in strict mode)
// 4. Failure to follow these rules results in 400 "Invalid schema" errors
//
// These requirements ensure OpenAI can validate the response structure strictly.
// Note: With OpenAI SDK v5.x+, use chat.completions.parse() for structured outputs.
// Response data will be in message.parsed as a pre-parsed JavaScript object.

/**
 * Program Structure schema for OpenAI strict structured outputs and Ajv validation
 *
 * @typedef {Object} ProgramStructure
 * @property {string} programName - Auto-generated descriptive program name
 * @property {number} totalDuration - Program length in weeks (min 8, max 16)
 * @property {number} totalMesocycles - Number of training phases (min 2, max 4)
 * @property {{daysPerWeek:number, restDays:string[]}} trainingFrequency - Weekly frequency and rest days
 * @property {{mesocycleNumber:number, theme:string, duration:number, focus:string, goals:string[]}[]} mesocycles - Mesocycle breakdown
 * @property {{primary:string, secondary:string[]}} goalPrioritization - Goal prioritization strategy
 */
const programStructureSchema = {
  type: "object",
  required: ["programName", "totalDuration", "totalMesocycles", "mesocycles", "trainingFrequency", "goalPrioritization"],
  properties: {
    programName: { type: "string" },
    totalDuration: { type: "integer", minimum: 8, maximum: 16 },
    totalMesocycles: { type: "integer", minimum: 2, maximum: 4 },
    trainingFrequency: {
      type: "object",
      required: ["daysPerWeek", "restDays"],
      properties: {
        daysPerWeek: { type: "integer", minimum: 3, maximum: 6 },
        restDays: { type: "array", items: { type: "string" } }
      },
      additionalProperties: false
    },
    mesocycles: {
      type: "array",
      items: {
        type: "object",
        required: ["mesocycleNumber", "theme", "duration", "focus", "goals"],
        properties: {
          mesocycleNumber: { type: "integer" },
          theme: { type: "string" },
          duration: { type: "integer", minimum: 2, maximum: 6 },
          focus: { type: "string" },
          goals: { type: "array", items: { type: "string" } }
        },
        additionalProperties: false
      }
    },
    goalPrioritization: {
      type: "object",
      required: ["primary", "secondary"],
      properties: {
        primary: { type: "string" },
        secondary: { type: "array", items: { type: "string" } }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};

module.exports = {
  programStructureSchema
};


