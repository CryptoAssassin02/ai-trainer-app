const BaseAgent = require('./base-agent');
const OpenAIService = require('../services/openai-service');
const { programStructureSchema } = require('../utils/workout-structure-schema');
const { generateStructurePrompt } = require('../utils/workout-structure-prompts');
const { ValidationError } = require('../utils/errors');
const { mergeProfileWithRequest, validateWorkoutGoals } = require('../utils/workout-agent-utils');

class WorkoutStructureAgent extends BaseAgent {
  constructor({ openaiService, supabaseClient = null, memorySystem, logger } = {}) {
    super({ memorySystem, logger, config: { name: 'WorkoutStructureAgent' } });
    this.openaiService = openaiService || new OpenAIService();
    this.supabase = supabaseClient;
  }

  async process(context, options = {}) {
    const { userProfile, requestData = {}, gymData = {}, primaryGoal = null, injuryPrompt = '' } = context || {};

    // 1) Validate inputs
    try {
      validateWorkoutGoals(requestData.goals);
    } catch (e) {
      throw new ValidationError('Goals array is required and cannot be empty');
    }

    // 2) Merge profile with request (for prompt context only)
    const mergedProfile = mergeProfileWithRequest(userProfile, requestData);

    // Normalize gym data
    const resolvedGymData = {
      gymCategory: mergedProfile.preferences?.gymCategory || gymData?.gymCategory || 'minimal_home',
      restrictions: gymData?.restrictions || requestData.restrictions || [],
      exerciseTypes: gymData?.exerciseTypes || requestData.exerciseTypes || []
    };

    // 3) Build prompt
    const prompt = generateStructurePrompt(
      mergedProfile,
      requestData.goals,
      resolvedGymData,
      injuryPrompt,
      primaryGoal
    );

    // 4) OpenAI call with structured outputs and fallback
    const useStructured = options.useStructuredOutputs !== false; // default true
    const apiOptions = { max_tokens: 8192, temperature: 0.7 };
    if (useStructured) {
      apiOptions.response_format = {
        type: 'json_schema',
        json_schema: { name: 'program_structure', schema: programStructureSchema, strict: true }
      };
    } else {
      apiOptions.response_format = { type: 'json_object' };
    }

    const aiResponse = await this.openaiService.generateChatCompletion([
      { role: 'system', content: prompt }
    ], apiOptions);

    if (aiResponse?.choices?.[0]?.message?.refusal) {
      throw new Error(`AI refusal: ${aiResponse.choices[0].message.refusal}`);
    }

    let structureData;
    if (useStructured && aiResponse?.choices?.[0]?.message?.parsed) {
      structureData = aiResponse.choices[0].message.parsed;
    } else {
      // Fallback parse + AJV validation
      const Ajv = require('ajv');
      const ajv = new Ajv();
      const raw = typeof aiResponse === 'string' ? aiResponse : aiResponse?.content;
      if (!raw) throw new Error('No content received from OpenAI service');
      const match = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = match?.[1]?.trim() ?? raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      structureData = JSON.parse(jsonStr);
      const validate = ajv.compile(programStructureSchema);
      if (!validate(structureData)) {
        throw new Error(`Structure validation failed: ${JSON.stringify(validate.errors)}`);
      }
    }

    // 5) Store memory (optional)
    await this.storeMemory(
      { type: 'structure_generation', result: structureData },
      { userId: userProfile?.userId, planId: null, memoryType: 'agent_output', tags: ['workout', 'structure'] }
    );

    return structureData;
  }
}

module.exports = WorkoutStructureAgent;


