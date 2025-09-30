/**
 * Workout Service
 * Specialized service for workout-related API operations
 */

import { apiClient, API_ENDPOINTS, API_TIMEOUTS } from '../client';
import type { 
  WorkoutPlan, 
  EnhancedWorkoutPlan,
  WorkoutGenerationRequest, 
  WorkoutAdjustmentRequest,
  ApiResponse,
  PaginatedResponse,
  RequestOptions,
  // NEW: Chunked generation types
  StructureGenerationRequest,
  StructureResponse,
  MesocycleResponse,
  GenerationStatusResponse
} from '../types';
import { enhancedWorkoutAPI } from '../workout-api';

export class WorkoutService {
  /**
   * Generate a new workout plan using AI
   * @deprecated Use chunked generation (generateStructure + generateMesocycle) instead
   * ✅ PHASE 2 DAY 4: Added AbortController support for cancellation
   */
  async generatePlan(request: WorkoutGenerationRequest, options?: RequestOptions & { signal?: AbortSignal }): Promise<WorkoutPlan> {
    console.warn('DEPRECATED: generatePlan() - Use chunked generation instead');
    try {
      // ✅ REVISED: Enhanced error handling for dual-agent operations with cancellation support
      const result = await apiClient.post<ApiResponse<WorkoutPlan>>(
        '/workouts',  // ✅ Correct endpoint: POST /v1/workouts
        request,
        { 
          timeout: API_TIMEOUTS.workoutGeneration, // ✅ 30s timeout (backend AI agent timeout)
          signal: options?.signal // ✅ AbortController signal for cancellation
        }
      );
      
      // ✅ REVISED: Handle dual-agent response structure
      if (!result.data) {
        throw new Error('Workout generation failed - no plan data returned');
      }
      
      // ✅ PHASE 2 DAY 5: API response is already in correct format, no transformation needed
      return result.data;
    } catch (error) {
      // Handle cancellation specifically
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Workout generation cancelled by user');
        throw new Error('Workout generation was cancelled');
      }
      
      console.error('Workout generation failed:', error);
      throw error;
    }
  }

  /**
   * Get list of user's workout plans with Phase 5 enhanced transformation
   * ✅ PHASE 5: Enhanced API with proper Phase 4 JSONB column handling
   */
  async getPlans(filters?: {
    limit?: number;
    offset?: number; 
    searchTerm?: string;
  }): Promise<(WorkoutPlan | EnhancedWorkoutPlan)[]> {
    try {
      // ✅ NEW: Get plans with pagination and filtering (backend supports)
      const result = await apiClient.get<ApiResponse<any[]>>(
        '/workouts',
        { 
          params: filters,
          timeout: API_TIMEOUTS.standardOperations
        }
      );
      
      // ✅ PHASE 5: Transform database responses to enhanced format
      const rawPlans = (result as any)?.data ?? [];
      return rawPlans.map((rawPlan: any) => {
        // Check if this is a Phase 4 enhanced plan
        if (rawPlan.schema_version || rawPlan.orchestrator_data || rawPlan.mesocycle_structure) {
          // Use enhanced API for Phase 4 plans - create temporary plan ID for transformation
          // Note: This is a workaround since transformDatabaseResponse is private
          // In production, we'd expose a public transformation method
          const enhancedPlan: EnhancedWorkoutPlan = {
            ...rawPlan,
            // Preserve critical backend fields for gating UI flows (structure-generated, mesocycle gating)
            // These snake_case properties are intentionally kept so pages that read backend fields continue to work
            generation_state: rawPlan.generation_state,
            mesocycles_generated: rawPlan.mesocycles_generated,
            total_mesocycles: rawPlan.total_mesocycles,
            plan_data: rawPlan.plan_data,
            // Transform snake_case to camelCase for Phase 4 fields
            schemaVersion: rawPlan.schema_version || 'v1.0',
            generationMethod: rawPlan.generation_method || 'single_goal',
            programDurationWeeks: rawPlan.program_duration_weeks || 8,
            mesocycleCount: rawPlan.mesocycle_count || 2,
            primaryGoal: rawPlan.primary_goal,
            trainingFrequency: rawPlan.training_frequency || { daysPerWeek: 3, sessionsPerDay: 1, restDays: ['Sunday'] },
            orchestratorData: rawPlan.orchestrator_data,
            mesocycleStructure: rawPlan.mesocycle_structure,
            goalStrategyData: rawPlan.goal_strategy_data || { strategies: {}, trainingParameters: {}, exercisePriorities: { compound: 5, isolation: 3 }, progressionStrategy: { primary: 'linear' }, recoveryRequirements: { restBetweenSets: '60-90s', sleepRecommendation: '7-9 hours' } },
            planData: {
              // Legacy format - computed from structured data
              exercises: this.extractExercisesFromMesocycles(this.normalizeMesocycles(rawPlan.plan_data?.mesocycles || rawPlan.mesocycle_structure || [])),
              weeklySchedule: this.buildWeeklyScheduleFromMesocycles(this.normalizeMesocycles(rawPlan.plan_data?.mesocycles || rawPlan.mesocycle_structure || [])),
              formattedPlan: rawPlan.plan_data?.formattedPlan || this.generateFormattedPlan(this.normalizeMesocycles(rawPlan.plan_data?.mesocycles || rawPlan.mesocycle_structure || []), rawPlan.plan_data?.programName || rawPlan.name),

              // Structured output data (primary)
              programName: rawPlan.plan_data?.programName,
              programDuration: rawPlan.plan_data?.programDuration,
              goalStructure: rawPlan.plan_data?.goalStructure,
              mesocycles: this.normalizeMesocycles(rawPlan.plan_data?.mesocycles || rawPlan.mesocycle_structure),
              
              // AI insights
              aiResponse: rawPlan.plan_data?.aiResponse,
              orchestratedProgram: rawPlan.plan_data?.orchestratedProgram,
              explanations: rawPlan.plan_data?.explanations || '',
              reasoning: rawPlan.plan_data?.reasoning || '',
              warnings: rawPlan.plan_data?.warnings || [],
              errors: rawPlan.plan_data?.errors || []
            },
            aiReasoning: {
              reasoning: rawPlan.ai_reasoning?.reasoning || '',
              compatibility: rawPlan.ai_reasoning?.compatibility,
              recommendations: rawPlan.ai_reasoning?.recommendations || [],
              promptInstructions: rawPlan.ai_reasoning?.promptInstructions,
              goalPriority: rawPlan.ai_reasoning?.goalPriority
            }
          };
          return enhancedPlan;
        } else {
          // Return as basic WorkoutPlan for legacy plans
          return rawPlan as WorkoutPlan;
        }
      });
    } catch (error) {
      console.error('Failed to fetch workout plans:', error);
      throw error;
    }
  }

  /**
   * Get a specific workout plan by ID with Phase 5 enhanced transformation
   * ✅ PHASE 5: Enhanced API with proper Phase 4 JSONB column handling
   */
  async getPlan(planId: string): Promise<WorkoutPlan | EnhancedWorkoutPlan> {
    try {
      // ✅ NEW: Get single plan by ID
      const result = await apiClient.get<ApiResponse<any>>(
        `/workouts/${planId}`,
        { timeout: API_TIMEOUTS.standardOperations }
      );
      
      if (!result.data) {
        throw new Error('Failed to fetch workout plan - no data returned');
      }
      
      // ✅ PHASE 5: Transform database response to enhanced format if applicable
      const rawPlan = (result as any)?.data;
      if (rawPlan.schema_version || rawPlan.orchestrator_data || rawPlan.mesocycle_structure) {
        // Transform Phase 4 plan to enhanced format
        const enhancedPlan: EnhancedWorkoutPlan = {
          ...rawPlan,
          // Preserve critical backend fields for gating UI flows (structure-generated, mesocycle gating)
          generation_state: rawPlan.generation_state,
          mesocycles_generated: rawPlan.mesocycles_generated,
          total_mesocycles: rawPlan.total_mesocycles,
          plan_data: rawPlan.plan_data,
          // Transform snake_case to camelCase for Phase 4 fields
          schemaVersion: rawPlan.schema_version || 'v1.0',
          generationMethod: rawPlan.generation_method || 'single_goal',
          programDurationWeeks: rawPlan.program_duration_weeks || 8,
          mesocycleCount: rawPlan.mesocycle_count || 2,
          primaryGoal: rawPlan.primary_goal,
          trainingFrequency: rawPlan.training_frequency || { daysPerWeek: 3, sessionsPerDay: 1, restDays: ['Sunday'] },
          orchestratorData: rawPlan.orchestrator_data,
          mesocycleStructure: rawPlan.mesocycle_structure,
          goalStrategyData: rawPlan.goal_strategy_data || { strategies: {}, trainingParameters: {}, exercisePriorities: { compound: 5, isolation: 3 }, progressionStrategy: { primary: 'linear' }, recoveryRequirements: { restBetweenSets: '60-90s', sleepRecommendation: '7-9 hours' } },
            planData: {
            // Legacy format - computed from structured data
              exercises: this.extractExercisesFromMesocycles(this.normalizeMesocycles(rawPlan.plan_data?.mesocycles || rawPlan.mesocycle_structure || [])),
              weeklySchedule: this.buildWeeklyScheduleFromMesocycles(this.normalizeMesocycles(rawPlan.plan_data?.mesocycles || rawPlan.mesocycle_structure || [])),
              formattedPlan: rawPlan.plan_data?.formattedPlan || this.generateFormattedPlan(this.normalizeMesocycles(rawPlan.plan_data?.mesocycles || rawPlan.mesocycle_structure || []), rawPlan.plan_data?.programName || rawPlan.name),

            // Structured output data (primary)
            programName: rawPlan.plan_data?.programName,
            programDuration: rawPlan.plan_data?.programDuration,
            goalStructure: rawPlan.plan_data?.goalStructure,
            mesocycles: this.normalizeMesocycles(rawPlan.plan_data?.mesocycles || rawPlan.mesocycle_structure),
            
            // AI insights
            aiResponse: rawPlan.plan_data?.aiResponse,
            orchestratedProgram: rawPlan.plan_data?.orchestratedProgram,
            explanations: rawPlan.plan_data?.explanations || '',
            reasoning: rawPlan.plan_data?.reasoning || '',
            warnings: rawPlan.plan_data?.warnings || [],
            errors: rawPlan.plan_data?.errors || []
          },
          aiReasoning: {
            reasoning: rawPlan.ai_reasoning?.reasoning || '',
            compatibility: rawPlan.ai_reasoning?.compatibility,
            recommendations: rawPlan.ai_reasoning?.recommendations || [],
            promptInstructions: rawPlan.ai_reasoning?.promptInstructions,
            goalPriority: rawPlan.ai_reasoning?.goalPriority
          }
        };
        return enhancedPlan;
      } else {
        // Return as basic WorkoutPlan for legacy plans
        return rawPlan as WorkoutPlan;
      }
    } catch (error) {
      console.error(`Failed to fetch workout plan ${planId}:`, error);
      throw error;
    }
  }

  /**
   * Adjust an existing workout plan (NEW endpoint)
   */
  async adjustPlan(
    planId: string,
    agentType: 'structure' | 'weekly_structure' | 'daily_workout',
    editRequest: any,
    mesocycleIndex?: number,
    options?: RequestOptions
  ): Promise<WorkoutPlan> {
    try {
      const result = await apiClient.post<ApiResponse<WorkoutPlan>>(
        `/workouts/${planId}/adjust`,
        { agentType, editRequest, mesocycleIndex },
        { timeout: API_TIMEOUTS.workoutAdjustment, ...(options || {}) }
      );
      
      if (!result.data) {
        throw new Error('Workout adjustment failed - no plan data returned');
      }
      
      // ✅ PHASE 2 DAY 5: API response is already in correct format, no transformation needed
      return result.data;
    } catch (error) {
      console.error(`Failed to adjust workout plan ${planId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a workout plan
   */
  async deletePlan(planId: string): Promise<void> {
    try {
      // ✅ NEW: Delete plan
      await apiClient.delete(`/workouts/${planId}`, {
        timeout: API_TIMEOUTS.standardOperations
      });
    } catch (error) {
      console.error(`Failed to delete workout plan ${planId}:`, error);
      throw error;
    }
  }

  /**
   * Log a completed workout
   */
  async logWorkout(workoutLog: {
    planId: string;
    date: string;
    exercises: Array<{
      exerciseId: string;
      sets: Array<{
        weight?: number;
        reps: number;
        duration?: number;
        notes?: string;
      }>;
    }>;
    overallDifficulty?: number;
    energyLevel?: number;
    satisfaction?: number;
    notes?: string;
  }): Promise<{ id: string }> {
    try {
      const result = await apiClient.post<ApiResponse<{ id: string }>>(
        API_ENDPOINTS.WORKOUTS.LOG,
        workoutLog,
        {
          timeout: API_TIMEOUTS.standardOperations,
        }
      );
      
      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to log workout');
      }
      
      return result.data!;
    } catch (error) {
      console.error('Failed to log workout:', error);
      throw error;
    }
  }

  /**
   * Get workout logs
   */
  async getWorkoutLogs(params?: {
    planId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    try {
      const result = await apiClient.get<PaginatedResponse<any>>(
        API_ENDPOINTS.WORKOUTS.LOGS,
        {
          params,
          timeout: API_TIMEOUTS.standardOperations,
        }
      );
      
      return result;
    } catch (error) {
      console.error('Failed to fetch workout logs:', error);
      throw error;
    }
  }

  /**
   * Get exercise database for recommendations
   */
  async searchExercises(query: string, filters?: {
    category?: string;
    equipment?: string[];
    muscleGroups?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  }): Promise<any[]> {
    try {
      const result = await apiClient.get<ApiResponse<any[]>>(
        '/exercises/search',
        {
          params: { query, ...filters },
          timeout: API_TIMEOUTS.standardOperations,
        }
      );
      
      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to search exercises');
      }
      
      return result.data!;
    } catch (error) {
      console.error('Failed to search exercises:', error);
      throw error;
    }
  }

  /**
   * Get workout statistics
   */
  async getWorkoutStats(timeframe: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<{
    totalWorkouts: number;
    totalDuration: number;
    averageDifficulty: number;
    consistencyStreak: number;
    favoriteExercises: Array<{ name: string; count: number }>;
  }> {
    try {
      const result = await apiClient.get<ApiResponse<any>>(
        '/workouts/stats',
        {
          params: { timeframe },
          timeout: API_TIMEOUTS.analyticsInsights,
        }
      );
      
      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to fetch workout statistics');
      }
      
      return result.data!;
    } catch (error) {
      console.error('Failed to fetch workout statistics:', error);
      throw error;
    }
  }

  /**
   * NEW: Generate workout program structure (chunked generation step 1)
   */
  async generateStructure(
    request: StructureGenerationRequest, 
    options?: RequestOptions & { signal?: AbortSignal }
  ): Promise<StructureResponse> {
    try {
      const result = await apiClient.post<ApiResponse<StructureResponse>>(
        API_ENDPOINTS.WORKOUTS.STRUCTURE,
        request,
        { 
          timeout: API_TIMEOUTS.workoutStructure,
          signal: options?.signal
        }
      );
      
      if (!result.data) {
        throw new Error('Structure generation failed - no data returned');
      }
      
      return result.data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Structure generation was cancelled');
      }
      console.error('Structure generation failed:', error);
      throw error;
    }
  }

  /**
   * NEW: Generate weekly structure for a mesocycle (chunked generation step 2a)
   */
  async generateWeeklyStructure(
    planId: string,
    mesocycleNumber: number,
    body?: Record<string, any>,
    options?: RequestOptions & { signal?: AbortSignal }
  ): Promise<{ planId: string; mesocycleNumber: number; weeklyStructure: any }>{
    try {
      const result = await apiClient.post<ApiResponse<{ planId: string; mesocycleNumber: number; weeklyStructure: any }>>(
        `/workouts/${planId}/mesocycles/${mesocycleNumber}/weekly-structure`,
        body || {},
        { timeout: API_TIMEOUTS.workoutStructure, signal: options?.signal }
      );

      if (!result.data) {
        throw new Error(`Weekly structure generation failed - no data returned`);
      }

      return result.data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Weekly structure generation was cancelled`);
      }
      console.error(`Weekly structure generation failed:`, error);
      throw error;
    }
  }

  /**
   * NEW: Generate specific mesocycle details (chunked generation step 2+)
   */
  async generateMesocycle(
    planId: string,
    mesocycleNumber: number,
    // Backward compatible args: arg3 can be options (old calls) or request body (new calls)
    arg3?: any,
    arg4?: RequestOptions & { signal?: AbortSignal }
  ): Promise<MesocycleResponse> {
    try {
      const isOptionsArg = arg3 && (typeof arg3 === 'object') && (
        'signal' in arg3 || 'timeout' in arg3 || 'skipAuth' in arg3
      );
      const requestBody = isOptionsArg ? {} : (arg3 || {});
      const options = (isOptionsArg ? (arg3 as RequestOptions & { signal?: AbortSignal }) : (arg4 as (RequestOptions & { signal?: AbortSignal } | undefined)));

      const result = await apiClient.post<ApiResponse<MesocycleResponse>>(
        API_ENDPOINTS.WORKOUTS.MESOCYCLE(planId, mesocycleNumber),
        requestBody,
        { 
          timeout: API_TIMEOUTS.workoutMesocycle,
          signal: options?.signal
        }
      );
      
      if (!result.data) {
        throw new Error(`Mesocycle ${mesocycleNumber} generation failed - no data returned`);
      }
      
      return result.data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Mesocycle ${mesocycleNumber} generation was cancelled`);
      }
      console.error(`Mesocycle ${mesocycleNumber} generation failed:`, error);
      throw error;
    }
  }

  /**
   * NEW: Get generation status for progress monitoring
   */
  async getGenerationStatus(planId: string): Promise<GenerationStatusResponse> {
    try {
      const result = await apiClient.get<ApiResponse<GenerationStatusResponse>>(
        API_ENDPOINTS.WORKOUTS.STATUS(planId),
        { timeout: API_TIMEOUTS.workoutStatus }
      );
      
      if (!result.data) {
        throw new Error('Failed to get generation status');
      }
      // Enrich status with weekly/daily readiness for current mesocycle when possible
      try {
        const planRes = await apiClient.get<ApiResponse<any>>(
          `/workouts/${planId}`,
          { timeout: API_TIMEOUTS.standardOperations }
        );
        const plan = (planRes as any)?.data;
        if (plan?.plan_data) {
          const current = (result.data as any).currentMesocycle || plan.current_mesocycle || 1;
          const mesocycles = Array.isArray(plan.plan_data.mesocycles)
            ? plan.plan_data.mesocycles
            : (plan.plan_data.mesocycles ? Object.values(plan.plan_data.mesocycles) : []);
          const node = mesocycles[current - 1] || {};
          (result.data as any).weeklyStructureReady = Array.isArray(node?.weekly_structures) && node.weekly_structures.length > 0;
          (result.data as any).dailyWorkoutsReady = Array.isArray(node?.daily_workouts) && node.daily_workouts.length > 0;
        }
      } catch (_) {
        // Non-fatal enrichment failure
      }

      return result.data;
    } catch (error) {
      console.error('Get generation status failed:', error);
      throw error;
    }
  }

  /**
   * NEW: Progressive generation via SSE
   */
  progressiveGenerate(
    planId: string,
    requestBody: Record<string, any>,
    onEvent: (evt: { type: 'structure_generated' | 'weekly_complete' | 'mesocycle_progress' | 'completed' | 'error'; data: any }) => void
  ): { disconnect: () => void } {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1';
    const token = (typeof window !== 'undefined') ? (sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token')) : null;
    const controller = new AbortController();
    const disconnect = () => controller.abort();

    fetch(`${baseURL}/workouts/${planId}/generate-progressive`, {
      method: 'POST',
      headers: {
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(requestBody || {}),
      signal: controller.signal
    }).then(async (res) => {
      if (!res.ok || !res.body) {
        onEvent({ type: 'error', data: { message: `Failed to open SSE stream (${res.status})` } });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      const flush = (text: string) => {
        buffer += text;
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const lines = rawEvent.split('\n');
          let eventType: string | null = null;
          let dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event:')) eventType = line.slice(6).trim();
            else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
          }
          if (!eventType) continue;
          try {
            const data = dataStr ? JSON.parse(dataStr) : {};
            if (eventType === 'structure_generated' || eventType === 'weekly_complete' || eventType === 'mesocycle_progress' || eventType === 'completed' || eventType === 'error') {
              onEvent({ type: eventType as any, data });
            }
          } catch {}
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        flush(chunk);
      }
    }).catch((e) => {
      if (e?.name === 'AbortError') return;
      onEvent({ type: 'error', data: { message: e?.message || 'SSE connection failed' } });
    });

    return { disconnect };
  }

  /**
   * Extract exercises from mesocycles structure
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

  private buildWeeklyScheduleFromMesocycles(mesocycles: any[]): Record<string, any> {
    const normalized = this.normalizeMesocycles(mesocycles);
    const weeklySchedule: Record<string, any> = {};
    normalized?.[0]?.weeks?.[0]?.workouts && 
    Object.entries(normalized[0].weeks[0].workouts).forEach(([day, workout]) => {
      weeklySchedule[day] = typeof workout === 'object' ? workout : { type: workout };
    });
    return weeklySchedule;
  }

  private generateFormattedPlan(mesocycles: any[], programName: string): string {
    const normalized = this.normalizeMesocycles(mesocycles);
    let formatted = `${programName}\n\n`;
    normalized.forEach((mesocycle: any) => {
      formatted += `${mesocycle.name} (${mesocycle.durationWeeks} weeks)\n`;
      formatted += `Focus: ${mesocycle.focus}\n\n`;
    });
    return formatted;
  }

  private normalizeMesocycles(input: any): any[] {
    if (Array.isArray(input)) return input;
    if (input && typeof input === 'object') return Object.values(input);
    return [];
  }
}

// Create singleton instance
export const workoutService = new WorkoutService();

// ===== Generation Status Helpers (Service Alignment) =====
// These helpers mirror the stage-derivation logic used by the display layer,
// ensuring a single source of truth for stage readiness and derived stage.

export type GenerationStage = 'structure' | 'weekly' | 'daily';

/**
 * Returns true when the current mesocycle has a weekly structure available.
 * Relies on enrichment added in getGenerationStatus (weeklyStructureReady).
 */
export function isWeeklyStructureReady(status: GenerationStatusResponse | null | undefined): boolean {
  if (!status) return false;
  const enriched: any = status as any;
  return !!enriched?.weeklyStructureReady === true;
}

/**
 * Returns true when the current mesocycle has daily workouts available.
 * Relies on enrichment added in getGenerationStatus (dailyWorkoutsReady),
 * or overall state === 'completed'.
 */
export function isDailyWorkoutsReady(status: GenerationStatusResponse | null | undefined): boolean {
  if (!status) return false;
  if (status.state === 'completed') return true;
  const enriched: any = status as any;
  return !!enriched?.dailyWorkoutsReady === true;
}

/**
 * Derive high-level generation stage from status.
 * Order of precedence: daily > weekly > structure.
 */
export function deriveGenerationStage(status: GenerationStatusResponse | null | undefined): GenerationStage {
  if (isDailyWorkoutsReady(status)) return 'daily';
  if (isWeeklyStructureReady(status)) return 'weekly';
  return 'structure';
}