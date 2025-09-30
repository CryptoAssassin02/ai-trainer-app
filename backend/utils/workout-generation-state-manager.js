const logger = require('../config/logger');

class WorkoutGenerationStateManager {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async transitionState(planId, fromState, toState) {
    try {
      const query = this.supabase
        .from('workout_plans')
        .update({ generation_state: toState })
        .eq('id', planId);

      if (fromState) {
        query.eq('generation_state', fromState);
      }

      const { error } = await query;
      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('[WorkoutGenerationStateManager.transitionState] Failed', { planId, fromState, toState, error: err.message });
      throw err;
    }
  }

  async recordProgress(planId, mesocycleNumber, status) {
    try {
      const isComplete = status === 'complete';
      const update = {
        current_mesocycle: mesocycleNumber,
      };
      if (isComplete) {
        update.mesocycles_generated = mesocycleNumber;
        update.generation_state = mesocycleNumber === undefined ? 'completed' : `mesocycle_${mesocycleNumber}_complete`;
      } else {
        update.generation_state = `mesocycle_${mesocycleNumber}_generating`;
      }

      const { error } = await this.supabase
        .from('workout_plans')
        .update(update)
        .eq('id', planId);
      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('[WorkoutGenerationStateManager.recordProgress] Failed', { planId, mesocycleNumber, status, error: err.message });
      throw err;
    }
  }

  async handleError(planId, error, context = {}) {
    try {
      const { data: currentPlan } = await this.supabase
        .from('workout_plans')
        .select('generation_errors')
        .eq('id', planId)
        .single();

      const currentErrors = currentPlan?.generation_errors || [];
      const newError = {
        ...('mesocycle' in context ? { mesocycle: context.mesocycle } : {}),
        error: (error?.message || String(error)).replace(/"/g, '\\"'),
        timestamp: new Date().toISOString()
      };

      const updatedErrors = [...currentErrors, newError];

      const { error: updateError } = await this.supabase
        .from('workout_plans')
        .update({ generation_state: 'failed', generation_errors: updatedErrors })
        .eq('id', planId);
      if (updateError) throw updateError;
      return true;
    } catch (err) {
      logger.error('[WorkoutGenerationStateManager.handleError] Failed', { planId, error: err.message });
      throw err;
    }
  }
}

module.exports = WorkoutGenerationStateManager;


