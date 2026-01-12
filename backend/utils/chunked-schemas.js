// High-level structure schema
const programStructureSchema = {
  type: "object",
  required: ["programName", "totalDuration", "mesocycles", "trainingFrequency"],
  properties: {
    programName: { type: "string" },
    totalDuration: { type: "integer", minimum: 8, maximum: 16 },
    totalMesocycles: { type: "integer", minimum: 2, maximum: 4 },
    trainingFrequency: {
      type: "object", 
      properties: {
        daysPerWeek: { type: "integer", minimum: 3, maximum: 6 },
        restDays: { type: "array", items: { type: "string" } }
      }
    },
    mesocycles: {
      type: "array",
      items: {
        type: "object",
        required: ["mesocycleNumber", "theme", "duration", "focus"],
        properties: {
          mesocycleNumber: { type: "integer" },
          theme: { type: "string" },
          duration: { type: "integer", minimum: 2, maximum: 6 },
          focus: { type: "string" },
          goals: { type: "array", items: { type: "string" } }
        }
      }
    },
    goalPrioritization: {
      type: "object",
      properties: {
        primary: { type: "string" },
        secondary: { type: "array", items: { type: "string" } }
      }
    }
  }
};

// Detailed mesocycle schema  
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
            patternProperties: {
              "^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$": {
                type: "object",
                properties: {
                  exercises: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["exercise", "sets", "reps"],
                      properties: {
                        exercise: { type: "string" },
                        sets: { type: "integer", minimum: 1, maximum: 6 },
                        reps: { 
                          oneOf: [
                            { type: "integer", minimum: 1, maximum: 50 },
                            { type: "string", pattern: "^\\d+-\\d+$" }
                          ]
                        },
                        restTime: { type: "string" },
                        notes: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

module.exports = {
  programStructureSchema,
  mesocycleDetailSchema
};
