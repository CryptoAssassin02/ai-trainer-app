// JSON Schema for weekly structure output (object root with weekly_structure array)
// OpenAI Structured Outputs require an object root; we wrap the array under "weekly_structure"
module.exports.weeklyStructureSchema = {
  type: 'object',
  required: ['weekly_structure'],
  properties: {
    weekly_structure: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['week', 'days'],
        properties: {
          week: { type: 'integer', minimum: 1 },
          days: {
            type: 'array',
            minItems: 3,
            maxItems: 7,
            items: {
              type: 'object',
              required: ['day', 'type', 'focus', 'notes'],
              properties: {
                day: { type: 'string' },
                type: { type: 'string', enum: ['training', 'rest'] },
                focus: { type: 'string', nullable: true },
                notes: { type: 'string', nullable: true }
              },
              additionalProperties: false
            }
          }
        },
        additionalProperties: false
      }
    }
  },
  additionalProperties: false
};
