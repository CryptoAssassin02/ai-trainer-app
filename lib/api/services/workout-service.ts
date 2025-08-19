/**
 * Workout Service
 * Specialized service for workout-related API operations
 */

import { apiClient, API_ENDPOINTS, API_TIMEOUTS } from '../client';
import type { 
  WorkoutPlan, 
  WorkoutGenerationRequest, 
  WorkoutAdjustmentRequest,
  ApiResponse,
  PaginatedResponse,
  RequestOptions 
} from '../types';

export class WorkoutService {
  /**
   * Generate a new workout plan using AI
   */
  async generatePlan(request: WorkoutGenerationRequest, options?: RequestOptions): Promise<WorkoutPlan> {
    try {
      const result = await apiClient.workoutOperation<ApiResponse<WorkoutPlan>>(
        API_ENDPOINTS.WORKOUTS.GENERATE,
        request,
        'POST'
      );
      
      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to generate workout plan');
      }
      
      return result.data!;
    } catch (error) {
      console.error('Workout generation failed:', error);
      throw error;
    }
  }

  /**
   * Get list of user's workout plans
   */
  async getPlans(params?: {
    page?: number;
    limit?: number;
    status?: 'draft' | 'active' | 'archived';
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    search?: string;
  }): Promise<PaginatedResponse<WorkoutPlan>> {
    try {
      const result = await apiClient.get<PaginatedResponse<WorkoutPlan>>(
        API_ENDPOINTS.WORKOUTS.BASE,
        {
          params,
          timeout: API_TIMEOUTS.standardOperations,
        }
      );
      
      return result;
    } catch (error) {
      console.error('Failed to fetch workout plans:', error);
      throw error;
    }
  }

  /**
   * Get a specific workout plan by ID
   */
  async getPlan(planId: string): Promise<WorkoutPlan> {
    try {
      const result = await apiClient.get<ApiResponse<WorkoutPlan>>(
        API_ENDPOINTS.WORKOUTS.ADJUST(planId),
        {
          timeout: API_TIMEOUTS.standardOperations,
        }
      );
      
      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to fetch workout plan');
      }
      
      return result.data!;
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
      const result = await apiClient.workoutOperation<ApiResponse<WorkoutPlan>>(
        API_ENDPOINTS.WORKOUTS.ADJUST(planId),
        request,
        'PUT'
      );
      
      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to adjust workout plan');
      }
      
      return result.data!;
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
      const result = await apiClient.workoutOperation<ApiResponse<void>>(
        API_ENDPOINTS.WORKOUTS.DELETE(planId),
        undefined,
        'DELETE'
      );
      
      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to delete workout plan');
      }
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
}

// Create singleton instance
export const workoutService = new WorkoutService();