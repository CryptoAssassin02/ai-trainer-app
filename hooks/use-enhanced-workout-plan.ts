import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enhancedWorkoutAPI } from '@/lib/api/workout-api';
import { EnhancedWorkoutPlan, WorkoutGenerationRequest } from '@/lib/api/types';

export function useEnhancedWorkoutPlan(planId?: string) {
  const queryClient = useQueryClient();

  // Get enhanced workout plan
  const {
    data: plan,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['enhanced-workout-plan', planId],
    queryFn: () => enhancedWorkoutAPI.getWorkoutPlan(planId!),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Generate new workout plan
  const generatePlanMutation = useMutation({
    mutationFn: (request: WorkoutGenerationRequest) => 
      enhancedWorkoutAPI.generateWorkoutPlan(request),
    onSuccess: (newPlan) => {
      queryClient.setQueryData(['enhanced-workout-plan', newPlan.id], newPlan);
      queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
    },
  });

  // Helper functions
  const isMultiGoalPlan = plan ? enhancedWorkoutAPI.isMultiGoalPlan(plan) : false;
  const goalStructure = plan ? enhancedWorkoutAPI.getGoalStructure(plan) : null;

  // Get mesocycle data safely
  const mesocycles = plan?.mesocycleStructure || plan?.planData.aiResponse?.mesocycles || [];
  
  // Get orchestrator data safely
  const orchestratorData = plan?.orchestratorData || plan?.planData.orchestratedProgram;

  return {
    // Data
    plan,
    mesocycles,
    orchestratorData,
    goalStructure,
    
    // Status
    isLoading,
    error,
    isMultiGoalPlan,
    
    // Actions
    generatePlan: generatePlanMutation.mutate,
    isGenerating: generatePlanMutation.isPending,
    generationError: generatePlanMutation.error,
    refetch,
    
    // Computed values
    programProgress: plan ? calculateProgramProgress(plan) : null,
    currentMesocycle: plan ? getCurrentMesocycle(plan) : null,
  };
}

// Helper functions
function calculateProgramProgress(plan: EnhancedWorkoutPlan): {
  currentWeek: number;
  totalWeeks: number;
  progressPercentage: number;
} {
  // This would integrate with actual workout logging data
  // For now, return mock data based on plan structure
  const totalWeeks = plan.programDurationWeeks;
  const currentWeek = 1; // Would come from user's actual progress
  
  return {
    currentWeek,
    totalWeeks,
    progressPercentage: (currentWeek / totalWeeks) * 100
  };
}

function getCurrentMesocycle(plan: EnhancedWorkoutPlan): {
  mesocycle: any;
  weekInMesocycle: number;
} | null {
  const mesocycles = plan.mesocycleStructure || plan.planData.aiResponse?.mesocycles || [];
  if (mesocycles.length === 0) return null;
  
  // For now, return first mesocycle
  // In real implementation, this would calculate based on user progress
  return {
    mesocycle: mesocycles[0],
    weekInMesocycle: 1
  };
}
