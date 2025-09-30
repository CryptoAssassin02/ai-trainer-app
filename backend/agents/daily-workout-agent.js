const BaseAgent = require('./base-agent');
const OpenAIService = require('../services/openai-service');
const { dailyWorkoutSchema } = require('../utils/daily-workout-schema');
const { generateDailyWorkoutPrompt } = require('../utils/daily-workout-prompts');
const { ValidationError, AgentError, ERROR_CODES } = require('../utils/errors');

class DailyWorkoutAgent extends BaseAgent {
  constructor({ openaiService, supabaseClient = null, memorySystem, logger } = {}) {
    super({ memorySystem, logger, config: { name: 'DailyWorkoutAgent' } });
    this.openaiService = openaiService || new OpenAIService();
    this.supabase = supabaseClient;
  }

  _validateInputs(weeklyStructure, userInputs, mesocycleData) {
    const errors = [];

    if (!Array.isArray(weeklyStructure) || weeklyStructure.length === 0) {
      errors.push({ field: 'weeklyStructure', message: 'weeklyStructure must be a non-empty array' });
    }

    const hasTrainingDays = (Array.isArray(weeklyStructure) ? weeklyStructure : [])
      .some(w => Array.isArray(w.days) && w.days.some(d => d.type === 'training'));
    if (!hasTrainingDays) {
      errors.push({ field: 'weeklyStructure.days', message: 'No training days found in weekly structure' });
    }

    const goals = userInputs?.goals;
    if (!Array.isArray(goals) || goals.length === 0) {
      errors.push({ field: 'goals', message: 'goals array is required and cannot be empty' });
    }

    const duration = Number(mesocycleData?.duration || userInputs?.mesocycleDuration);
    if (!duration || duration < 1 || duration > 8) {
      errors.push({ field: 'mesocycle.duration', message: 'mesocycle duration must be between 1 and 8 weeks' });
    }

    if (errors.length) {
      throw new ValidationError('Daily workout input validation failed', errors);
    }

    return { duration };
  }

  async process(context, options = {}) {
    const { userProfile = {}, userInputs = {}, mesocycleData = {}, weeklyStructure = [] } = context || {};

    this._validateInputs(weeklyStructure, userInputs, mesocycleData);

    const prompt = generateDailyWorkoutPrompt(userProfile, weeklyStructure, userInputs, mesocycleData);

    const useStructured = options.useStructuredOutputs !== false; // default true
    const apiOptions = { max_tokens: 75000, temperature: 0.7 };
    if (useStructured) {
      apiOptions.response_format = {
        type: 'json_schema',
        json_schema: { name: 'daily_workouts', schema: dailyWorkoutSchema, strict: true }
      };
    } else {
      apiOptions.response_format = { type: 'json_object' };
    }

    const aiResponse = await this.openaiService.generateChatCompletion([
      { role: 'system', content: prompt }
    ], apiOptions);

    if (aiResponse?.choices?.[0]?.message?.refusal) {
      throw new AgentError('AI refusal', ERROR_CODES.EXTERNAL_SERVICE_ERROR, { refusal: aiResponse.choices[0].message.refusal });
    }

    let daily;
    if (useStructured && aiResponse?.choices?.[0]?.message?.parsed) {
      // Structured outputs: root is an object { daily_workouts: [...] }
      const parsed = aiResponse.choices[0].message.parsed;
      daily = Array.isArray(parsed?.daily_workouts) ? parsed.daily_workouts : parsed;
    } else {
      const Ajv = require('ajv');
      const ajv = new Ajv();
      const raw = typeof aiResponse === 'string' ? aiResponse : aiResponse?.content;
      if (!raw) throw new AgentError('No content received from OpenAI service', ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      const match = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = match?.[1]?.trim() ?? raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      const parsed = JSON.parse(jsonStr);
      const validate = ajv.compile(dailyWorkoutSchema);
      if (!validate(parsed)) {
        throw new ValidationError('Daily workout validation failed', validate.errors);
      }
      daily = Array.isArray(parsed?.daily_workouts) ? parsed.daily_workouts : parsed;
    }

    // Optional: sanity check that output covers training days in structure
    const trainingDays = (Array.isArray(weeklyStructure) ? weeklyStructure : [])
      .flatMap(w => Array.isArray(w.days) ? w.days : [])
      .filter(d => d.type === 'training')
      .map(d => d.day);
    const outputDays = (Array.isArray(daily) ? daily : []).map(d => d.day);
    const missing = trainingDays.filter(d => !outputDays.includes(d));
    if (missing.length > 0) {
      throw new ValidationError('Daily workouts missing days from weekly structure', { field: 'daily', message: `Missing: ${missing.join(', ')}` });
    }

    await this.storeMemory(
      { type: 'daily_workout_generation', result: daily },
      { userId: userProfile?.userId, planId: null, memoryType: 'agent_output', tags: ['workout', 'daily_workouts'] }
    );

    return daily;
  }
}

module.exports = DailyWorkoutAgent;
