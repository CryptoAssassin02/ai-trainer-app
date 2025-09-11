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
   * ✅ PHASE 2 DAY 4: Added AbortController support for cancellation
   */
  async generatePlan(request: WorkoutGenerationRequest, options?: RequestOptions & { signal?: AbortSignal }): Promise<WorkoutPlan> {
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
      const rawPlans = result.data || [];
      return rawPlans.map(rawPlan => {
        // Check if this is a Phase 4 enhanced plan
        if (rawPlan.schema_version || rawPlan.orchestrator_data || rawPlan.mesocycle_structure) {
          // Use enhanced API for Phase 4 plans - create temporary plan ID for transformation
          // Note: This is a workaround since transformDatabaseResponse is private
          // In production, we'd expose a public transformation method
          const enhancedPlan: EnhancedWorkoutPlan = {
            ...rawPlan,
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
              exercises: rawPlan.plan_data?.exercises || [],
              weeklySchedule: rawPlan.plan_data?.weeklySchedule || {},
              formattedPlan: rawPlan.plan_data?.formattedPlan || '',
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
      const rawPlan = result.data;
      if (rawPlan.schema_version || rawPlan.orchestrator_data || rawPlan.mesocycle_structure) {
        // Transform Phase 4 plan to enhanced format
        const enhancedPlan: EnhancedWorkoutPlan = {
          ...rawPlan,
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
            exercises: rawPlan.plan_data?.exercises || [],
            weeklySchedule: rawPlan.plan_data?.weeklySchedule || {},
            formattedPlan: rawPlan.plan_data?.formattedPlan || '',
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
   * Adjust an existing workout plan
   */
  async adjustPlan(planId: string, request: WorkoutAdjustmentRequest): Promise<WorkoutPlan> {
    try {
      // ✅ REVISED: Handle plan adjustment agent with proper error classification
      const result = await apiClient.post<ApiResponse<WorkoutPlan>>(  // ✅ POST not PUT
        `/workouts/${planId}`,
        { 
          adjustments: { 
            notesOrPreferences: request.feedback // ✅ Backend expects nested structure
          } 
        },
        { 
          timeout: API_TIMEOUTS.workoutAdjustment // ✅ 60s timeout (backend agent timeout)
        }
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
   * NEW: Generate specific mesocycle details (chunked generation step 2+)
   */
  async generateMesocycle(
    planId: string, 
    mesocycleNumber: number,
    options?: RequestOptions & { signal?: AbortSignal }
  ): Promise<MesocycleResponse> {
    try {
      const result = await apiClient.post<ApiResponse<MesocycleResponse>>(
        API_ENDPOINTS.WORKOUTS.MESOCYCLE(planId, mesocycleNumber),
        {}, // No body required - context comes from stored structure
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
      
      return result.data;
    } catch (error) {
      console.error('Get generation status failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const workoutService = new WorkoutService();