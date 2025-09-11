import { apiClient } from './client';
import { 
  EnhancedWorkoutPlan, 
  WorkoutGenerationRequest, 
  ApiSuccessResponse,
  OrchestratorData,
  MesocycleStructure,
  GoalStrategyData,
  TrainingFrequency 
} from './types';

export class EnhancedWorkoutAPI {
  /**
   * Generate workout plan with Phase 4 multi-goal support
   */
  async generateWorkoutPlan(request: WorkoutGenerationRequest): Promise<EnhancedWorkoutPlan> {
    const response = await apiClient.post<ApiSuccessResponse<any>>('/workouts', request);
    
    // Transform database response to frontend-friendly format
    return this.transformDatabaseResponse(response.data.data);
  }

  /**
   * Get enhanced workout plan by ID with Phase 4 data
   */
  async getWorkoutPlan(planId: string): Promise<EnhancedWorkoutPlan> {
    const response = await apiClient.get<ApiSuccessResponse<any>>(`/workouts/${planId}`);
    
    return this.transformDatabaseResponse(response.data.data);
  }

  /**
   * Transform raw database response to EnhancedWorkoutPlan
   * CRITICAL: Handles Phase 4 JSONB columns and nested data structures
   */
  private transformDatabaseResponse(rawData: any): EnhancedWorkoutPlan {
    return {
      // Basic WorkoutPlan fields
      id: rawData.id,
      name: rawData.name,
      description: rawData.description,
      exercises: rawData.plan_data?.exercises || [],
      difficulty: this.inferDifficulty(rawData),
      estimatedDuration: rawData.estimated_duration || 60,
      equipmentRequired: rawData.equipment_required || [],
      tags: rawData.tags || [],
      createdAt: rawData.created_at,
      updatedAt: rawData.updated_at,
      reasoning: rawData.plan_data?.reasoning || '',
      aiGenerated: rawData.ai_generated,
      status: rawData.status,
      userId: rawData.user_id,

      // Phase 4 Database Fields
      schemaVersion: rawData.schema_version || 'v1.0',
      generationMethod: rawData.generation_method || 'single_goal',
      programDurationWeeks: rawData.program_duration_weeks || 8,
      mesocycleCount: rawData.mesocycle_count || 2,
      primaryGoal: rawData.primary_goal,

      // Phase 4 JSONB Data (with null safety)
      trainingFrequency: rawData.training_frequency || { 
        daysPerWeek: 3, 
        sessionsPerDay: 1, 
        restDays: ['Sunday'] 
      },
      orchestratorData: rawData.orchestrator_data as OrchestratorData | undefined,
      mesocycleStructure: rawData.mesocycle_structure as MesocycleStructure[] | undefined,
      goalStrategyData: rawData.goal_strategy_data as GoalStrategyData || {
        strategies: {},
        trainingParameters: {},
        exercisePriorities: { compound: 5, isolation: 3 },
        progressionStrategy: { primary: 'linear' },
        recoveryRequirements: { restBetweenSets: '60-90s', sleepRecommendation: '7-9 hours' }
      },

      // Enhanced plan_data structure
      planData: {
        // Legacy format (backward compatibility) - check multiple possible locations
        exercises: rawData.plan_data?.exercises || 
                  rawData.plan_data?.workouts || 
                  rawData.plan_data?.weeklySchedule?.workouts || 
                  rawData.exercises || 
                  [],
        weeklySchedule: rawData.plan_data?.weeklySchedule || rawData.weeklySchedule || {},
        formattedPlan: rawData.plan_data?.formattedPlan || rawData.formattedPlan || '',

        // Complete AI response structure (Phase 4)
        aiResponse: rawData.plan_data?.aiResponse,

        // Multi-goal orchestrator data
        orchestratedProgram: rawData.plan_data?.orchestratedProgram as OrchestratorData | undefined,

        // AI insights and reasoning
        explanations: rawData.plan_data?.explanations || '',
        reasoning: rawData.plan_data?.reasoning || '',
        warnings: rawData.plan_data?.warnings || [],
        errors: rawData.plan_data?.errors || []
      },

      // Enhanced ai_reasoning structure
      aiReasoning: {
        reasoning: rawData.ai_reasoning?.reasoning || '',
        compatibility: rawData.ai_reasoning?.compatibility,
        recommendations: rawData.ai_reasoning?.recommendations || [],
        promptInstructions: rawData.ai_reasoning?.promptInstructions,
        goalPriority: rawData.ai_reasoning?.goalPriority
      }
    };
  }

  /**
   * Infer difficulty from user profile or plan characteristics
   */
  private inferDifficulty(rawData: any): 'beginner' | 'intermediate' | 'advanced' {
    // Try to get from orchestrator data first
    if (rawData.orchestrator_data?.trainingParameters) {
      const params = Object.values(rawData.orchestrator_data.trainingParameters)[0] as any;
      if (params?.intensity?.includes('85%+')) return 'advanced';
      if (params?.intensity?.includes('70-85%')) return 'intermediate';
      return 'beginner';
    }

    // Fallback to program duration
    if (rawData.program_duration_weeks >= 12) return 'advanced';
    if (rawData.program_duration_weeks >= 10) return 'intermediate';
    return 'beginner';
  }

  /**
   * Check if plan is multi-goal
   */
  isMultiGoalPlan(plan: EnhancedWorkoutPlan): boolean {
    return plan.generationMethod === 'multi_goal_orchestrated' && 
           plan.orchestratorData !== null && 
           plan.orchestratorData !== undefined;
  }

  /**
   * Get primary and secondary goals from plan
   */
  getGoalStructure(plan: EnhancedWorkoutPlan): { primary: string; secondary: string[] } {
    if (this.isMultiGoalPlan(plan) && plan.orchestratorData?.goalPriority) {
      return {
        primary: plan.orchestratorData.goalPriority.primary,
        secondary: plan.orchestratorData.goalPriority.secondary
      };
    }

    // Fallback to primary_goal column and plan_data
    return {
      primary: plan.primaryGoal || 'general_fitness',
      secondary: []
    };
  }
}

export const enhancedWorkoutAPI = new EnhancedWorkoutAPI();
