const BaseAgent = require('./base-agent');
const OpenAIService = require('../services/openai-service');
const { weeklyStructureSchema } = require('../utils/weekly-structure-schema');
const { generateWeeklyStructurePrompt } = require('../utils/weekly-structure-prompts');
const { ValidationError, AgentError, ERROR_CODES } = require('../utils/errors');

class WeeklyStructureAgent extends BaseAgent {
  constructor({ openaiService, supabaseClient = null, memorySystem, logger } = {}) {
    super({ memorySystem, logger, config: { name: 'WeeklyStructureAgent' } });
    this.openaiService = openaiService || new OpenAIService();
    this.supabase = supabaseClient;
  }

  _validateInputs(userInputs, mesocycleData) {
    const errors = [];

    const daysPerWeek = Number(userInputs?.trainingFrequency?.daysPerWeek || userInputs?.daysPerWeek);
    if (!daysPerWeek || daysPerWeek < 1 || daysPerWeek > 7) {
      errors.push({ field: 'trainingFrequency.daysPerWeek', message: 'daysPerWeek must be between 1 and 7' });
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
      throw new ValidationError('Weekly structure input validation failed', errors);
    }

    // Recovery balance: ensure at least 1-2 rest days depending on daysPerWeek
    const minRest = daysPerWeek >= 5 ? 2 : 1;
    return { daysPerWeek, minRest, duration };
  }

  async process(context, options = {}) {
    const { userProfile = {}, userInputs = {}, mesocycleData = {} } = context || {};

    const { daysPerWeek, minRest, duration } = this._validateInputs(userInputs, mesocycleData);

    const prompt = generateWeeklyStructurePrompt(userProfile, { ...userInputs, daysPerWeek }, { ...mesocycleData, duration });

    const useStructured = options.useStructuredOutputs !== false; // default true
    const apiOptions = { max_tokens: 25000, temperature: 0.7 };
    if (useStructured) {
      apiOptions.response_format = {
        type: 'json_schema',
        json_schema: { name: 'weekly_structure', schema: weeklyStructureSchema, strict: true }
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

    let structure;
    if (useStructured && aiResponse?.choices?.[0]?.message?.parsed) {
      const parsed = aiResponse.choices[0].message.parsed;
      // Support both object-root (preferred) and legacy array-root
      structure = Array.isArray(parsed) ? parsed : parsed?.weekly_structure;
    } else {
      const Ajv = require('ajv');
      const ajv = new Ajv();
      const raw = typeof aiResponse === 'string' ? aiResponse : aiResponse?.content;
      if (!raw) throw new AgentError('No content received from OpenAI service', ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      const match = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = match?.[1]?.trim() ?? raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      const parsed = JSON.parse(jsonStr);
      const validate = ajv.compile(weeklyStructureSchema);
      if (!validate(parsed)) {
        throw new ValidationError('Weekly structure validation failed', validate.errors);
      }
      structure = Array.isArray(parsed) ? parsed : parsed?.weekly_structure;
    }

    // Post-validate recovery balance (structure is an array of weeks)
    const weeks = Array.isArray(structure) ? structure : [];
    if (!weeks.length) {
      throw new ValidationError('Weekly structure must contain at least one week');
    }

    weeks.forEach((w, idx) => {
      const restCount = (Array.isArray(w.days) ? w.days : []).filter(d => d.type === 'rest').length;
      if (restCount < minRest) {
        throw new ValidationError('Insufficient rest days for training frequency', {
          field: `weeks[${idx}].days`,
          message: `Expected at least ${minRest} rest days for ${daysPerWeek} days/week`
        });
      }
    });

    await this.storeMemory(
      { type: 'weekly_structure_generation', result: structure },
      { userId: userProfile?.userId, planId: null, memoryType: 'agent_output', tags: ['workout', 'weekly_structure'] }
    );

    return structure;
  }
}

module.exports = WeeklyStructureAgent;
