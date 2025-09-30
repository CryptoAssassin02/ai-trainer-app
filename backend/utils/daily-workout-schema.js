// JSON Schema for daily workouts output
// IMPORTANT: OpenAI structured outputs require the root schema to be an OBJECT.
// We wrap the daily workouts array under the "daily_workouts" property.
module.exports.dailyWorkoutSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['daily_workouts'],
  properties: {
    daily_workouts: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        // New: require explicit week and normalized day, allow optional displayName for UI
        required: ['week', 'day', 'workout', 'displayName'],
        additionalProperties: false,
        properties: {
          // Week index within mesocycle (1-based)
          week: { type: 'integer', minimum: 1 },
          // Normalized weekday token for programmatic checks
          day: { type: 'string', enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
          // Optional UI label (e.g., "Monday (Week 1)")
          displayName: { type: 'string' },
          workout: {
            type: 'object',
            required: ['name', 'exercises', 'focus', 'estimatedDuration'],
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              focus: { type: 'string' },
              estimatedDuration: { type: 'integer', minimum: 10, maximum: 180 },
              exercises: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'object',
                  required: ['name', 'sets', 'reps', 'category', 'primaryMuscles', 'secondaryMuscles', 'restSeconds', 'equipment', 'notes', 'tempo'],
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string' },
                    category: { type: 'string' },
                    primaryMuscles: { type: 'array', items: { type: 'string' } },
                    secondaryMuscles: { type: 'array', items: { type: 'string' } },
                    sets: { type: 'integer', minimum: 1, maximum: 10 },
                    // OpenAI structured outputs do not permit oneOf here.
                    // Accept either single number or range via a string pattern.
                    reps: { type: 'string', pattern: '^\\\d+(?:-\\\d+)?$' },
                    tempo: { type: 'string' },
                    restSeconds: { type: 'integer', minimum: 0, maximum: 600 },
                    equipment: { type: 'array', items: { type: 'string' } },
                    notes: { type: 'string' }
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
