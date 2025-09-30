// Detailed mesocycle schema
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

// Reusable exercise schema to DRY repeated structures across days
const exerciseSchema = {
  type: "object",
  required: ["exercise", "sets", "reps", "restTime", "notes"],
  properties: {
    exercise: { type: "string" },
    sets: { type: "integer", minimum: 1, maximum: 6 },
    reps: { type: "string", pattern: "^(\\d+|\\d+-\\d+)$" },
    restTime: { type: "string" },
    notes: { type: "string" }
  },
  additionalProperties: false
};

// Workout day containing an array of exercises
const dayWorkoutSchema = {
  type: "object",
  required: ["exercises"],
  properties: {
    exercises: {
      type: "array",
      items: exerciseSchema
    }
  },
  additionalProperties: false
};

// Rest day descriptor retained for compatibility (not used directly in strict schema)
const restDaySchema = { type: "string", enum: ["Rest", "Active Recovery"] };

// Day schema compatible with OpenAI structured outputs (no oneOf/anyOf)
// Use a discriminator-like field and a uniform shape
const daySchema = {
  type: "object",
  required: ["dayType", "exercises"],
  properties: {
    dayType: { type: "string", enum: ["workout", "rest"] },
    exercises: {
      type: "array",
      items: exerciseSchema,
      minItems: 0,
      maxItems: 10
    }
  },
  additionalProperties: false
};

const mesocycleDetailSchema = {
  type: "object",
  required: ["mesocycleNumber", "weeks"],
  properties: {
    mesocycleNumber: { type: "integer" },
    weeks: {
      type: "array",
      items: {
        type: "object",
        required: ["weekNumber", "workouts"],
        properties: {
          weekNumber: { type: "integer" },
          workouts: {
            type: "object",
            required: ["day1", "day2", "day3", "day4", "day5", "day6", "day7"],
            properties: {
              day1: daySchema,
              day2: daySchema,
              day3: daySchema,
              day4: daySchema,
              day5: daySchema,
              day6: daySchema,
              day7: daySchema
            },
            additionalProperties: false
          }
        },
        additionalProperties: false
      }
    }
  },
  additionalProperties: false
};

module.exports = {
  mesocycleDetailSchema,
  // Export internals to aid testing or future reuse if needed (non-breaking)
  exerciseSchema,
  dayWorkoutSchema,
  restDaySchema,
  daySchema
};


