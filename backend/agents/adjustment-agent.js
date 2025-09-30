const BaseAgent = require('./base-agent');
const OpenAIService = require('../services/openai-service');
const { weeklyStructureSchema } = require('../utils/weekly-structure-schema');
const { dailyWorkoutSchema } = require('../utils/daily-workout-schema');
const { generateAdjustmentPrompt } = require('../utils/adjustment-prompts');
const { ValidationError, AgentError, ERROR_CODES } = require('../utils/errors');
const DailyWorkoutAgent = require('./daily-workout-agent');

class AdjustmentAgent extends BaseAgent {
  constructor({ openaiService, supabaseClient = null, memorySystem, logger } = {}) {
    super({ memorySystem, logger, config: { name: 'AdjustmentAgent' } });
    this.openaiService = openaiService || new OpenAIService();
    this.supabase = supabaseClient;
  }

  _validateInputs(agentType, editRequest, currentPlanData) {
    const validTypes = ['structure', 'weekly_structure', 'daily_workout'];
    if (!validTypes.includes(agentType)) {
      throw new ValidationError('Invalid agentType', { field: 'agentType', message: `Must be one of ${validTypes.join(', ')}` });
    }
    if (!editRequest || (typeof editRequest !== 'string' && typeof editRequest !== 'object')) {
      throw new ValidationError('Invalid editRequest', { field: 'editRequest', message: 'Must be string or object' });
    }
    if (!currentPlanData || typeof currentPlanData !== 'object') {
      throw new ValidationError('Invalid currentPlanData', { field: 'currentPlanData', message: 'Must be non-null object' });
    }
  }

  async _runOpenAIAdjustment(agentType, editRequest, currentPlanData, context, useStructured = true) {
    const prompt = generateAdjustmentPrompt(agentType, editRequest, currentPlanData, context);
    const apiOptions = { max_tokens: 8192, temperature: 0.4 };

    if (useStructured) {
      if (agentType === 'weekly_structure') {
        apiOptions.response_format = { type: 'json_schema', json_schema: { name: 'weekly_structure', schema: weeklyStructureSchema, strict: true } };
      } else if (agentType === 'daily_workout') {
        apiOptions.response_format = { type: 'json_schema', json_schema: { name: 'daily_workouts', schema: dailyWorkoutSchema, strict: true } };
      } else {
        // Structure: permit generic JSON object without strict schema for flexibility
        apiOptions.response_format = { type: 'json_object' };
      }
    } else {
      apiOptions.response_format = { type: 'json_object' };
    }

    const aiResponse = await this.openaiService.generateChatCompletion([
      { role: 'system', content: prompt }
    ], apiOptions);

    if (aiResponse?.choices?.[0]?.message?.refusal) {
      throw new AgentError('AI refusal', ERROR_CODES.EXTERNAL_SERVICE_ERROR, { refusal: aiResponse.choices[0].message.refusal });
    }

    let adjusted;
    if (useStructured && aiResponse?.choices?.[0]?.message?.parsed) {
      adjusted = aiResponse.choices[0].message.parsed;
    } else {
      const raw = typeof aiResponse === 'string' ? aiResponse : aiResponse?.content;
      if (!raw) throw new AgentError('No content received from OpenAI service', ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      const match = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = match?.[1]?.trim() ?? raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      adjusted = JSON.parse(jsonStr);
    }

    return adjusted;
  }

  _appendAdjustmentHistory(planData, entry) {
    const history = Array.isArray(planData.adjustment_history) ? planData.adjustment_history : [];
    const safeEntry = {
      agent: entry.agent,
      edit: entry.edit,
      timestamp: new Date().toISOString()
    };
    return { ...planData, adjustment_history: [...history, safeEntry] };
  }

  async process(context, options = {}) {
    const { planId, agentType, editRequest, currentPlanData, userProfile = {}, triggerFollowUps = true } = context || {};

    this._validateInputs(agentType, editRequest, currentPlanData);

    const useStructured = options.useStructuredOutputs !== false; // default true

    // Run OpenAI adjustment
    const adjusted = await this._runOpenAIAdjustment(agentType, editRequest, currentPlanData, { userProfile }, useStructured);

    // Merge into plan_data accordingly
    let updatedPlanData = { ...currentPlanData };
    if (agentType === 'structure') {
      updatedPlanData.structure = adjusted;
    } else if (agentType === 'weekly_structure') {
      const mesoIndex = options.mesocycleIndex != null ? options.mesocycleIndex : (updatedPlanData?.mesocycles?.length ? updatedPlanData.mesocycles.length - 1 : 0);
      if (!Array.isArray(updatedPlanData.mesocycles)) {
        updatedPlanData.mesocycles = [];
      }
      while (updatedPlanData.mesocycles.length <= mesoIndex) {
        updatedPlanData.mesocycles.push({});
      }
      updatedPlanData.mesocycles[mesoIndex] = {
        ...(updatedPlanData.mesocycles[mesoIndex] || {}),
        weekly_structures: adjusted
      };

      // If weekly structure changed and follow-ups enabled, re-run daily workouts
      if (triggerFollowUps) {
        const dailyAgent = new DailyWorkoutAgent({ openaiService: this.openaiService, supabaseClient: this.supabase });
        const userInputs = {
          goals: Array.isArray(updatedPlanData?.goals) ? updatedPlanData.goals : [],
          trainingFrequency: updatedPlanData?.structure?.trainingFrequency || {},
          equipment: updatedPlanData?.userProfile?.equipment || []
        };
        const mCtx = Array.isArray(updatedPlanData?.structure?.mesocycles) ? updatedPlanData.structure.mesocycles[mesoIndex] : null;
        const mesocycleData = { focus: mCtx?.focus || mCtx?.theme || 'general', duration: mCtx?.duration || updatedPlanData?.structure?.totalDuration || 4 };

        const followUp = await dailyAgent.safeProcess({
          userProfile,
          userInputs,
          mesocycleData,
          weeklyStructure: adjusted
        }, { useStructuredOutputs: useStructured });

        if (!followUp.success) {
          throw followUp.error;
        }

        updatedPlanData.mesocycles[mesoIndex] = {
          ...(updatedPlanData.mesocycles[mesoIndex] || {}),
          daily_workouts: followUp.data
        };
      }

    } else if (agentType === 'daily_workout') {
      const mesoIndex = options.mesocycleIndex != null ? options.mesocycleIndex : (updatedPlanData?.mesocycles?.length ? updatedPlanData.mesocycles.length - 1 : 0);
      if (!Array.isArray(updatedPlanData.mesocycles)) {
        updatedPlanData.mesocycles = [];
      }
      while (updatedPlanData.mesocycles.length <= mesoIndex) {
        updatedPlanData.mesocycles.push({});
      }
      updatedPlanData.mesocycles[mesoIndex] = {
        ...(updatedPlanData.mesocycles[mesoIndex] || {}),
        daily_workouts: adjusted
      };
    }

    // Log adjustment history
    updatedPlanData = this._appendAdjustmentHistory(updatedPlanData, { agent: agentType, edit: editRequest });

    await this.storeMemory(
      { type: 'plan_adjustment', agentType, editRequest, result: updatedPlanData },
      { userId: userProfile?.userId, planId: planId || null, memoryType: 'agent_output', tags: ['workout', 'adjustment'] }
    );

    return updatedPlanData;
  }
}

module.exports = AdjustmentAgent;
