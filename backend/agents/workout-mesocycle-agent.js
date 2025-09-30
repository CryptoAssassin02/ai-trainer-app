const BaseAgent = require('./base-agent');
const OpenAIService = require('../services/openai-service');
const { mesocycleDetailSchema } = require('../utils/workout-mesocycle-schema');
const { generateMesocyclePrompt } = require('../utils/workout-mesocycle-prompts');

class WorkoutMesocycleAgent extends BaseAgent {
  constructor({ openaiService, supabaseClient = null, memorySystem, logger, completionVerifier = null } = {}) {
    super({ memorySystem, logger, config: { name: 'WorkoutMesocycleAgent' } });
    this.openaiService = openaiService || new OpenAIService();
    this.supabase = supabaseClient;
    this.completionVerifier = completionVerifier;
  }

  async process(context, options = {}) {
    const {
      plan,
      mesocycleNumber,
      userProfile,
      goals = [],
      primaryGoal = null,
      injuryPrompt = ''
    } = context || {};

    if (!plan?.plan_data?.structure) {
      throw new Error('Missing program structure in plan');
    }

    if (mesocycleNumber > 1 && this.completionVerifier) {
      const ok = await this.completionVerifier.isMesocycleComplete(
        plan.id, mesocycleNumber - 1, plan.user_id
      );
      if (!ok) {
        const progress = await this.completionVerifier.getMesocycleProgress(
          plan.id, mesocycleNumber - 1, plan.user_id
        );
        const err = new Error('Previous mesocycle must be completed first');
        err.statusCode = 403;
        err.details = progress;
        throw err;
      }
    }

    const structure = plan.plan_data.structure;
    const mCtx = structure.mesocycles[mesocycleNumber - 1];
    const workoutFrequency = structure.trainingFrequency.daysPerWeek;

    const prompt = generateMesocyclePrompt({
      userProfile,
      programStructure: structure,
      mesocycleNumber,
      totalMesocycles: plan.total_mesocycles,
      mesocycleTheme: mCtx.theme,
      mesocycleDuration: mCtx.duration,
      mesocycleFocus: mCtx.focus,
      workoutFrequency,
      goals,
      injuryPrompt,
      primaryGoal
    });

    const useStructured = options.useStructuredOutputs !== false;
    const apiOptions = {
      max_tokens: 75000,
      temperature: 0.7,
      response_format: useStructured
        ? { type: 'json_schema', json_schema: { name: 'mesocycle_details', schema: mesocycleDetailSchema, strict: true } }
        : { type: 'json_object' }
    };

    const aiResponse = await this.openaiService.generateChatCompletion(
      [{ role: 'system', content: prompt }],
      apiOptions
    );

    if (aiResponse?.choices?.[0]?.message?.refusal) {
      throw new Error(`AI refusal: ${aiResponse.choices[0].message.refusal}`);
    }

    let mesoData;
    if (useStructured && aiResponse?.choices?.[0]?.message?.parsed) {
      mesoData = aiResponse.choices[0].message.parsed;
    } else {
      const Ajv = require('ajv');
      const ajv = new Ajv();
      const raw = typeof aiResponse === 'string' ? aiResponse : aiResponse?.content;
      const match = raw?.match(/```json\s*([\s\S]*?)\s*```/) || raw?.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = match?.[1]?.trim() ?? raw?.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      mesoData = JSON.parse(jsonStr);
      const validate = ajv.compile(mesocycleDetailSchema);
      if (!validate(mesoData)) throw new Error(`Mesocycle validation failed: ${JSON.stringify(validate.errors)}`);
    }

    await this.storeMemory(
      { type: 'mesocycle_generation', mesocycleNumber, result: mesoData },
      { userId: plan.user_id, planId: plan.id, memoryType: 'agent_output', tags: ['workout', 'mesocycle'] }
    );

    return mesoData;
  }
}

module.exports = WorkoutMesocycleAgent;


