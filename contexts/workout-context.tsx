'use client';

import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutService } from '@/lib/api/services/workout-service';
import { useAuth } from '@/components/auth/supabase-auth-provider';
import { useProfileQueryContext } from '@/components/profile/profile-query-provider';
import { 
  WorkoutGenerationError, 
  ProfileValidationError,
  isWorkoutGenerationError,
  isRateLimitError,
  isAuthenticationError 
} from '@/lib/api/errors';
import type { 
  WorkoutPlan, 
  WorkoutGenerationRequest, 
  WorkoutAdjustmentRequest 
} from '@/lib/api/types';

// ✅ REVISED: AI operation status tracking
type AIOperationStatus = 
  | { status: 'idle' }
  | { status: 'validating'; message: 'Checking profile completeness...' }
  | { status: 'generating'; progress: number; message: 'Workout Generation Agent creating plan...' }
  | { status: 'adjusting'; progress: number; message: 'Plan Adjustment Agent modifying plan...' }
  | { status: 'complete'; result: WorkoutPlan }
  | { status: 'error'; error: Error; canRetry: boolean };

// ✅ REVISED: Enhanced context interface with AI operation support
interface WorkoutContextValue {
  // Data
  plans: WorkoutPlan[] | undefined;
  currentPlan: WorkoutPlan | undefined;
  
  // AI Operation State
  operationStatus: AIOperationStatus;
  isGenerating: boolean;
  isAdjusting: boolean;
  canGenerate: boolean; // Based on profile completeness and rate limits
  
  // Loading states  
  isLoading: boolean;
  
  // Error states with AI-specific handling
  error: Error | null;
  generationError: WorkoutGenerationError | null;
  rateLimitError: { message: string; retryAfter: number } | null;
  
  // Actions
  generatePlan: (request: WorkoutGenerationRequest) => void;
  generatePlanAsync: (request: WorkoutGenerationRequest) => Promise<WorkoutPlan>;
  adjustPlan: (planId: string, request: WorkoutAdjustmentRequest) => void;
  adjustPlanAsync: (planId: string, request: WorkoutAdjustmentRequest) => Promise<WorkoutPlan>;
  selectPlan: (planId: string) => void;
  deletePlan: (planId: string) => void;
  
  // Error recovery
  clearErrors: () => void;
  retryLastOperation: () => void;
  
  // Utilities
  refetch: () => Promise<any>;
  clearCache: () => void;
  validateProfileForGeneration: () => Promise<{ isValid: boolean; missingFields: string[] }>;
}

const WorkoutContext = createContext<WorkoutContextValue | undefined>(undefined);

// ✅ REVISED: Enhanced provider with AI operation support
export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const { profile, completion } = useProfileQueryContext();
  const isProfileComplete = completion?.data?.isComplete || false;

  // ✅ AI operation status state
  const [operationStatus, setOperationStatus] = React.useState<AIOperationStatus>({ status: 'idle' });
  const [lastOperation, setLastOperation] = React.useState<{ type: 'generate' | 'adjust'; params: any } | null>(null);

  // Plans query with authentication dependency
  const plansQuery = useQuery({
    queryKey: ['workoutPlans', user?.id],
    queryFn: () => workoutService.getPlans(),
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry authentication or rate limit errors
      if (isAuthenticationError(error) || isRateLimitError(error)) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // ✅ REVISED: Enhanced generation mutation with AI operation tracking
  const generateMutation = useMutation({
    mutationFn: async (request: WorkoutGenerationRequest) => {
      // Validate profile completeness first
      const validation = await validateProfileForGeneration();
      if (!validation.isValid) {
        throw new ProfileValidationError(
          'Profile must be complete before generating workout plans',
          validation.missingFields
        );
      }

      // Track operation for retry capability
      setLastOperation({ type: 'generate', params: request });
      
      // Start AI operation tracking
      setOperationStatus({ status: 'validating', message: 'Checking profile completeness...' });
      
      // Simulate progress tracking (in real implementation, this would come from backend events)
      setTimeout(() => {
        setOperationStatus({ status: 'generating', progress: 50, message: 'Workout Generation Agent creating plan...' });
      }, 1000);
      
      try {
        const result = await workoutService.generatePlan(request);
        setOperationStatus({ status: 'complete', result });
        return result;
      } catch (error) {
        const canRetry = !isRateLimitError(error) && !isAuthenticationError(error);
        setOperationStatus({ status: 'error', error: error as Error, canRetry });
        throw error;
      }
    },
    onSuccess: (newPlan) => {
      // Add to cache optimistically
      queryClient.setQueryData(['workoutPlans', user?.id], (old: WorkoutPlan[] = []) => 
        [newPlan, ...old]
      );
      setOperationStatus({ status: 'idle' });
    },
    onError: (error) => {
      console.error('Workout generation failed:', error);
      // Error status already set in mutationFn
    },
  });

  // ✅ REVISED: Enhanced adjustment mutation with AI operation tracking
  const adjustMutation = useMutation({
    mutationFn: async ({ planId, request }: { planId: string; request: WorkoutAdjustmentRequest }) => {
      setLastOperation({ type: 'adjust', params: { planId, request } });
      setOperationStatus({ status: 'adjusting', progress: 50, message: 'Plan Adjustment Agent modifying plan...' });
      
      try {
        const result = await workoutService.adjustPlan(planId, request);
        setOperationStatus({ status: 'complete', result });
        return result;
      } catch (error) {
        const canRetry = !isRateLimitError(error) && !isAuthenticationError(error);
        setOperationStatus({ status: 'error', error: error as Error, canRetry });
        throw error;
      }
    },
    onSuccess: (updatedPlan) => {
      // Update specific plan in cache
      queryClient.setQueryData(['workoutPlans', user?.id], (old: WorkoutPlan[] = []) => 
        old.map(plan => plan.id === updatedPlan.id ? updatedPlan : plan)
      );
      setOperationStatus({ status: 'idle' });
    },
  });

  // ✅ NEW: Profile validation for workout generation
  const validateProfileForGeneration = useCallback(async (): Promise<{ isValid: boolean; missingFields: string[] }> => {
    if (!profile) {
      return { isValid: false, missingFields: ['complete profile'] };
    }

    const requiredFields = ['age', 'height', 'weight', 'experienceLevel'];
    const missingFields = requiredFields.filter(field => {
      const value = (profile as any)[field];
      return value === undefined || value === null || value === '';
    });

    return {
      isValid: missingFields.length === 0 && isProfileComplete,
      missingFields,
    };
  }, [profile, isProfileComplete]);

  // ✅ NEW: Error classification and handling
  const errorState = useMemo(() => {
    const genError = generateMutation.error;
    const adjError = adjustMutation.error;
    const queryError = plansQuery.error;

    // Prioritize generation/adjustment errors over query errors
    const primaryError = genError || adjError || queryError;

    return {
      error: primaryError,
      generationError: isWorkoutGenerationError(genError) ? genError : null,
      rateLimitError: isRateLimitError(primaryError) ? {
        message: primaryError.message,
        retryAfter: (primaryError as any).retryAfter || 3600
      } : null,
    };
  }, [generateMutation.error, adjustMutation.error, plansQuery.error]);

  // ✅ NEW: Error recovery actions
  const clearErrors = useCallback(() => {
    generateMutation.reset();
    adjustMutation.reset();
    setOperationStatus({ status: 'idle' });
  }, [generateMutation, adjustMutation]);

  const retryLastOperation = useCallback(() => {
    if (!lastOperation) return;
    
    if (lastOperation.type === 'generate') {
      generateMutation.mutate(lastOperation.params);
    } else if (lastOperation.type === 'adjust') {
      adjustMutation.mutate(lastOperation.params);
    }
  }, [lastOperation, generateMutation, adjustMutation]);

  // ✅ REVISED: Enhanced context value with AI operation support
  const value: WorkoutContextValue = {
    // Data
    plans: plansQuery.data,
    currentPlan: undefined, // TODO: Implement selection logic

    // AI Operation State
    operationStatus,
    isGenerating: generateMutation.isPending,
    isAdjusting: adjustMutation.isPending,
    canGenerate: isAuthenticated && isProfileComplete && !generateMutation.isPending,

    // Loading states
    isLoading: plansQuery.isLoading,

    // Error states
    ...errorState,

    // Actions
    generatePlan: generateMutation.mutate,
    generatePlanAsync: generateMutation.mutateAsync,
    adjustPlan: (planId: string, request: WorkoutAdjustmentRequest) => 
      adjustMutation.mutate({ planId, request }),
    adjustPlanAsync: async (planId: string, request: WorkoutAdjustmentRequest) => 
      adjustMutation.mutateAsync({ planId, request }),
    selectPlan: (planId: string) => {
      // TODO: Implement plan selection logic
      console.log('Selecting plan:', planId);
    },
    deletePlan: async (planId: string) => {
      try {
        // ✅ PHASE 2 DAY 5: Implement actual delete functionality
        await workoutService.deletePlan(planId);
        
        // Remove from cache optimistically
        queryClient.setQueryData(['workoutPlans', user?.id], (old: WorkoutPlan[] = []) => 
          old.filter(plan => plan.id !== planId)
        );
        
        console.log('Plan deleted successfully:', planId);
      } catch (error) {
        console.error('Failed to delete plan:', error);
        // Refetch to ensure consistency
        plansQuery.refetch();
      }
    },

    // Error recovery
    clearErrors,
    retryLastOperation,

    // Utilities
    refetch: plansQuery.refetch,
    clearCache: () => queryClient.invalidateQueries({ queryKey: ['workoutPlans'] }),
    validateProfileForGeneration,
  };

  return (
    <WorkoutContext.Provider value={value}>
      {children}
    </WorkoutContext.Provider>
  );
}

// ✅ Hook for using workout context
export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}

// ✅ NEW: Specialized hooks for specific features
export function useWorkoutGeneration() {
  const { 
    generatePlan, 
    generatePlanAsync, 
    isGenerating, 
    operationStatus, 
    generationError,
    canGenerate,
    validateProfileForGeneration 
  } = useWorkout();
  
  return { 
    generatePlan, 
    generatePlanAsync, 
    isGenerating, 
    operationStatus, 
    generationError,
    canGenerate,
    validateProfileForGeneration 
  };
}

export function useWorkoutAdjustment() {
  const { 
    adjustPlan, 
    adjustPlanAsync, 
    isAdjusting, 
    operationStatus 
  } = useWorkout();
  
  return { 
    adjustPlan, 
    adjustPlanAsync, 
    isAdjusting, 
    operationStatus 
  };
}
