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
    // apiClient returns response.data directly. Backend wraps in { status, data }
    const raw = (response as any)?.data ?? response;
    return this.transformDatabaseResponse(raw);
  }

  /**
   * Get enhanced workout plan by ID with Phase 4 data
   */
  async getWorkoutPlan(planId: string): Promise<EnhancedWorkoutPlan> {
    const response = await apiClient.get<ApiSuccessResponse<any>>(`/workouts/${planId}`);
    // apiClient returns response.data directly. Backend wraps in { status, data }
    const raw = (response as any)?.data ?? response;
    return this.transformDatabaseResponse(raw);
  }

  /**
   * Transform raw database response to EnhancedWorkoutPlan
   * CRITICAL: Handles Phase 4 JSONB columns and nested data structures
   */
  private transformDatabaseResponse(rawData: any): EnhancedWorkoutPlan {
    // Support both DB snake_case and controller-formatted camelCase fields
    const planData = rawData.plan_data ?? rawData.planData ?? {};
    const mesocyclesRaw = planData.mesocycles ?? rawData.mesocycle_structure ?? [];
    const mesocyclesArr = this.normalizeMesocycles(mesocyclesRaw);

    return {
      // Basic WorkoutPlan fields
      id: rawData.id,
      name: rawData.name,
      description: rawData.description,
      exercises: this.extractExercisesFromMesocycles(mesocyclesArr),
      difficulty: this.inferDifficulty(rawData),
      estimatedDuration: rawData.estimated_duration || 60,
      equipmentRequired: rawData.equipment_required || [],
      tags: rawData.tags || [],
      createdAt: rawData.created_at,
      updatedAt: rawData.updated_at,
      reasoning: planData?.reasoning || '',
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
      trainingFrequency: rawData.training_frequency || planData?.trainingFrequency || { 
        daysPerWeek: 3, 
        sessionsPerDay: 1, 
        restDays: ['Sunday'] 
      },
      orchestratorData: rawData.orchestrator_data as OrchestratorData | undefined,
      mesocycleStructure: (rawData.mesocycle_structure as MesocycleStructure[] | undefined) ?? (mesocyclesArr as unknown as MesocycleStructure[]),
      goalStrategyData: rawData.goal_strategy_data as GoalStrategyData || {
        strategies: {},
        trainingParameters: {},
        exercisePriorities: { compound: 5, isolation: 3 },
        progressionStrategy: { primary: 'linear' },
        recoveryRequirements: { restBetweenSets: '60-90s', sleepRecommendation: '7-9 hours' }
      },

      // Enhanced plan_data structure
      planData: {
        // Legacy format - computed from mesocycles if available
        exercises: this.extractExercisesFromMesocycles(mesocyclesArr),
        weeklySchedule: this.buildWeeklyScheduleFromMesocycles(mesocyclesArr),
        formattedPlan: planData?.formattedPlan || 
                       this.generateFormattedPlan(mesocyclesArr, planData?.programName || rawData.name),

        // Structured output data (NEW - primary source)
        programName: planData?.programName,
        programDuration: planData?.programDuration,
        goalStructure: planData?.goalStructure,
        mesocycles: mesocyclesArr,
        trainingFrequency: planData?.trainingFrequency,
        progressionStrategy: planData?.progressionStrategy,
        recoveryRequirements: planData?.recoveryRequirements,

        // AI insights and reasoning
        explanations: planData?.explanations || '',
        reasoning: planData?.reasoning || '',
        warnings: planData?.warnings || [],
        errors: planData?.errors || []
      },

      // Enhanced ai_reasoning structure
      aiReasoning: {
        reasoning: rawData.ai_reasoning?.reasoning || '',
        compatibility: rawData.ai_reasoning?.compatibility,
        recommendations: rawData.ai_reasoning?.recommendations || [],
        promptInstructions: rawData.ai_reasoning?.promptInstructions,
        goalPriority: rawData.ai_reasoning?.goalPriority
      },

      // Computed properties for legacy compatibility
      totalExercises: (() => this.extractExercisesFromMesocycles(mesocyclesArr).length)(),
      trainingDays: (() => {
        const weeklySchedule = this.buildWeeklyScheduleFromMesocycles(mesocyclesArr);
        return Object.keys(weeklySchedule);
      })(),
      programSummary: planData?.programName || rawData.name || 'Workout Program'
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

  /**
   * Extract flat exercises array from structured mesocycles data
   */
  private extractExercisesFromMesocycles(mesocycles: any[]): any[] {
    const normalized = this.normalizeMesocycles(mesocycles);
    const exercises: any[] = [];
    normalized.forEach((mesocycle: any) => {
      mesocycle.weeks?.forEach((week: any) => {
        Object.values(week.workouts || {}).forEach((workout: any) => {
          if (typeof workout === 'object' && workout.exercises) {
            exercises.push(...workout.exercises);
          }
        });
      });
    });
    return exercises;
  }

  /**
   * Build legacy weekly schedule from mesocycles structure
   */
  private buildWeeklyScheduleFromMesocycles(mesocycles: any[]): Record<string, any> {
    const normalized = this.normalizeMesocycles(mesocycles);
    const weeklySchedule: Record<string, any> = {};
    normalized?.[0]?.weeks?.[0]?.workouts && 
    Object.entries(normalized[0].weeks[0].workouts).forEach(([day, workout]) => {
      weeklySchedule[day] = typeof workout === 'object' ? workout : { type: workout };
    });
    
    return weeklySchedule;
  }

  /**
   * Generate formatted plan text from mesocycles data
   */
  private generateFormattedPlan(mesocycles: any[], programName: string): string {
    const normalized = this.normalizeMesocycles(mesocycles);
    let formatted = `${programName}\n\n`;
    normalized.forEach((mesocycle: any) => {
      formatted += `${mesocycle.name} (${mesocycle.durationWeeks} weeks)\n`;
      formatted += `Focus: ${mesocycle.focus}\n\n`;
    });
    return formatted;
  }

  // Normalize mesocycles structure into an array for downstream processing
  private normalizeMesocycles(input: any): any[] {
    if (Array.isArray(input)) return input;
    if (input && typeof input === 'object') return Object.values(input);
    return [];
  }
}

export const enhancedWorkoutAPI = new EnhancedWorkoutAPI();
