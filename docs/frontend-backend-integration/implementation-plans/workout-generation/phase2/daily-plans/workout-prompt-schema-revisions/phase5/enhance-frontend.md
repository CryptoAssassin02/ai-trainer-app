### **🎯 PHASE 5: FRONTEND ENHANCEMENTS**

## **❌ CRITICAL FINDING: PLAN REQUIRED COMPLETE REVISION**

After thorough analysis against actual Phase 1-4 implementations, the original plan had **fundamental misalignments** with the real data structures. This revised plan is now **100% aligned** with the actual backend implementation.

#### **5.1 Enhanced TypeScript Interfaces (`lib/api/types.ts`)**

**CRITICAL: These types align with the actual Phase 4 database schema and agent output structures:**

```typescript
// ===== PHASE 4 DATABASE RESPONSE TYPES =====

// Multi-Goal Orchestrator Data (from orchestrator_data JSONB column)
export interface OrchestratorData {
  programStructure: MesocycleStructureItem[];
  trainingParameters: Record<string, TrainingParameters>;
  exercisePriorities: ExercisePriorities;
  progressionStrategy: ProgressionStrategy;
  recoveryRequirements: RecoveryRequirements;
  goalPriority: {
    primary: string;
    secondary: string[];
  };
  compatibility: CompatibilityAnalysis;
  promptInstructions: string;
  recommendations: string[];
  programDuration: number;
}

// Goal Strategy Data (from goal_strategy_data JSONB column)
export interface GoalStrategyData {
  strategies: Record<string, any>;
  trainingParameters: Record<string, TrainingParameters>;
  exercisePriorities: ExercisePriorities;
  progressionStrategy: ProgressionStrategy;
  recoveryRequirements: RecoveryRequirements;
}

// Training Frequency (from training_frequency JSONB column)
export interface TrainingFrequency {
  daysPerWeek: number;
  sessionsPerDay: number;
  restDays: string[];
}

// ===== AI RESPONSE SCHEMA TYPES (from multiGoalMesocycleSchema) =====

// Goal Structure (from AI response goalStructure)
export interface GoalStructure {
  primaryGoal: string; // Simple string, not complex object
  secondaryGoals?: string[]; // Array of simple strings
  goalPrioritization?: {
    primaryFocus: number; // 50-80%
    secondaryFocus: number; // 20-50%
  };
}

// Program Duration (from AI response programDuration)
export interface ProgramDuration {
  totalWeeks: number; // 8-16
  mesocycles: number; // 2-5
}

// Mesocycle Structure (from mesocycle_structure JSONB column)
export interface MesocycleStructure {
  mesocycleNumber: number;
  name: string;
  phase: string;
  durationWeeks: number;
  focus: string;
  trainingParameters: TrainingParameters;
  progressionStrategy: MesocycleProgressionStrategy;
  weeks: WeekStructure[];
}

// Week Structure (nested in mesocycles)
export interface WeekStructure {
  weekNumber: number;
  weekType: 'build' | 'overload' | 'intensification' | 'deload' | 'test' | 'peak';
  volumeMultiplier: number; // 0.4-1.3
  intensityRange: string;
  specialComponents?: SpecialComponents;
  workouts: Record<string, WorkoutSession | 'Rest'>;
  progressionNotes?: string;
}

// Workout Session (nested in weeks.workouts)
export interface WorkoutSession {
  sessionName: string;
  sessionType: 'strength' | 'hypertrophy' | 'metabolic' | 'power' | 'endurance' | 'mobility' | 'sport_specific' | 'hybrid';
  primaryGoalFocus: string;
  secondaryComponents?: string[];
  targetMuscles: string[];
  exercises: DetailedExercise[];
}

// Detailed Exercise (nested in workout sessions)
export interface DetailedExercise {
  exercise: string;
  category: 'compound' | 'isolation' | 'accessory' | 'cardio' | 'mobility';
  primaryMuscles: string[];
  sets: number;
  repsOrDuration: string | number;
  intensity?: string; // e.g., "75-80% 1RM"
  restSeconds?: number;
  tempo?: string; // e.g., "3-1-2-1"
  rpe?: number; // 1-10
  notes?: string;
  goalAlignment?: string[];
  progressionMethod?: string;
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// ===== SUPPORTING TYPES =====

export interface TrainingParameters {
  frequency: number;
  intensity: string;
  volume: string;
  restPeriods: string;
  repRange: string;
  setRange: string;
  multiGoalAdjustments?: Record<string, any>;
  integrationNotes?: string[];
}

export interface ExercisePriorities {
  compound: number;
  isolation: number;
  functional?: number;
  cardio?: number;
  mobility?: number;
}

export interface ProgressionStrategy {
  primary: string;
  deloadFrequency?: number;
  overallMethod?: string;
  volumeProgression?: string;
  intensityProgression?: string;
}

export interface MesocycleProgressionStrategy {
  volumeProgression: 'linear' | 'undulating' | 'step' | 'wave';
  intensityProgression: 'linear' | 'undulating' | 'step' | 'wave';
  deloadWeek?: number;
}

export interface RecoveryRequirements {
  restBetweenSets: string;
  restBetweenSessions?: string;
  sleepRecommendation: string;
  activeRecoveryDays?: number;
  deloadWeekFrequency?: number;
}

export interface CompatibilityAnalysis {
  compatible: boolean;
  conflicts: string[];
  recommendations: string[];
}

export interface SpecialComponents {
  cardioIntegration?: string;
  mobilityWork?: boolean;
  plyometrics?: boolean;
  circuitTraining?: boolean;
  metabolicFinishers?: boolean;
  functionalMovements?: boolean;
  sportSpecificDrills?: boolean;
}

export interface MesocycleStructureItem {
  mesocycleNumber: number;
  name: string;
  weeks: number;
  focus: string;
  volumeProgression: string;
  intensityProgression: string;
  emphasis: string;
  strengthComponent?: boolean;
  hypertrophyComponent?: boolean;
  compoundEmphasis?: string;
}

// ===== ENHANCED WORKOUT PLAN TYPE (Phase 4 Complete) =====

export interface EnhancedWorkoutPlan extends WorkoutPlan {
  // Phase 4 Database Fields
  schemaVersion: string; // 'v1.0' | 'v2.0'
  generationMethod: 'single_goal' | 'multi_goal_orchestrated';
  programDurationWeeks: number; // 8-16
  mesocycleCount: number; // 1-5
  primaryGoal?: string; // From primary_goal column
  
  // Phase 4 JSONB Data
  trainingFrequency: TrainingFrequency;
  orchestratorData?: OrchestratorData; // null for single-goal plans
  mesocycleStructure?: MesocycleStructure[]; // null for legacy plans
  goalStrategyData: GoalStrategyData;
  
  // Enhanced plan_data structure
  planData: {
    // Legacy format (backward compatibility)
    exercises: Exercise[];
    weeklySchedule: Record<string, any>;
    formattedPlan: string;
    
    // Complete AI response structure (Phase 4)
    aiResponse?: {
      programName?: string;
      programDuration?: ProgramDuration;
      goalStructure?: GoalStructure;
      mesocycles?: MesocycleStructure[];
      progressionStrategy?: ProgressionStrategy;
      recoveryRequirements?: RecoveryRequirements;
    };
    
    // Multi-goal orchestrator data
    orchestratedProgram?: OrchestratorData;
    
    // AI insights and reasoning
    explanations: string;
    researchInsights: string[];
    reasoning: string;
    warnings: string[];
    errors: string[];
  };
  
  // Enhanced ai_reasoning structure
  aiReasoning: {
    reasoning: string;
    researchInsights: string[];
    compatibility?: CompatibilityAnalysis;
    recommendations?: string[];
    promptInstructions?: string;
    goalPriority?: {
      primary: string;
      secondary: string[];
    };
  };
}
```

#### **5.2 Enhanced API Service Layer (`lib/api/workout-api.ts`)**

**CRITICAL: Service methods must handle Phase 4 database response structure:**

```typescript
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
    const response = await apiClient.post<ApiSuccessResponse<any>>('/v1/workouts', request);
    
    // Transform database response to frontend-friendly format
    return this.transformDatabaseResponse(response.data.data);
  }

  /**
   * Get enhanced workout plan by ID with Phase 4 data
   */
  async getWorkoutPlan(planId: string): Promise<EnhancedWorkoutPlan> {
    const response = await apiClient.get<ApiSuccessResponse<any>>(`/v1/workouts/${planId}`);
    
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
      researchInsights: rawData.plan_data?.researchInsights || [],
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
        // Legacy format (backward compatibility)
        exercises: rawData.plan_data?.exercises || [],
        weeklySchedule: rawData.plan_data?.weeklySchedule || {},
        formattedPlan: rawData.plan_data?.formattedPlan || '',

        // Complete AI response structure (Phase 4)
        aiResponse: rawData.plan_data?.aiResponse,

        // Multi-goal orchestrator data
        orchestratedProgram: rawData.plan_data?.orchestratedProgram as OrchestratorData | undefined,

        // AI insights and reasoning
        explanations: rawData.plan_data?.explanations || '',
        researchInsights: rawData.plan_data?.researchInsights || [],
        reasoning: rawData.plan_data?.reasoning || '',
        warnings: rawData.plan_data?.warnings || [],
        errors: rawData.plan_data?.errors || []
      },

      // Enhanced ai_reasoning structure
      aiReasoning: {
        reasoning: rawData.ai_reasoning?.reasoning || '',
        researchInsights: rawData.ai_reasoning?.researchInsights || [],
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
```

#### **5.3 Enhanced Workout Plan Display Components**

**5.3.1 Multi-Goal Plan Overview Component (`components/workout/enhanced-plan-overview.tsx`)**

```typescript
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Calendar, TrendingUp, Users } from 'lucide-react';
import { EnhancedWorkoutPlan } from '@/lib/api/types';
import { enhancedWorkoutAPI } from '@/lib/api/workout-api';

interface EnhancedPlanOverviewProps {
  plan: EnhancedWorkoutPlan;
}

export function EnhancedPlanOverview({ plan }: EnhancedPlanOverviewProps) {
  const isMultiGoal = enhancedWorkoutAPI.isMultiGoalPlan(plan);
  const goalStructure = enhancedWorkoutAPI.getGoalStructure(plan);

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-cornflower-blue" />
                {plan.name}
              </CardTitle>
              <CardDescription>
                {isMultiGoal ? 'Multi-Goal Program' : 'Single-Goal Program'} • 
                {plan.programDurationWeeks} weeks • 
                {plan.mesocycleCount} mesocycles
              </CardDescription>
            </div>
            <Badge variant={isMultiGoal ? "default" : "secondary"} className="bg-cornflower-blue">
              {plan.schemaVersion}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Primary Goal */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-cornflower-blue" />
                <span className="font-medium">Primary Goal</span>
              </div>
              <Badge variant="default" className="bg-cornflower-blue">
                🎯 {goalStructure.primary.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </div>

            {/* Secondary Goals */}
            {isMultiGoal && goalStructure.secondary.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Secondary Goals</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {goalStructure.secondary.map((goal) => (
                    <Badge key={goal} variant="secondary" className="text-xs">
                      {goal.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Training Frequency */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Training Schedule</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {plan.trainingFrequency.daysPerWeek} days/week
                {plan.trainingFrequency.restDays.length > 0 && (
                  <div className="text-xs">Rest: {plan.trainingFrequency.restDays.join(', ')}</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Multi-Goal Compatibility Analysis */}
      {isMultiGoal && plan.orchestratorData?.compatibility && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Goal Compatibility Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Compatibility:</span>
                <Badge variant={plan.orchestratorData.compatibility.compatible ? "default" : "destructive"}>
                  {plan.orchestratorData.compatibility.compatible ? 'Compatible' : 'Conflicts Detected'}
                </Badge>
              </div>

              {plan.orchestratorData.compatibility.conflicts.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Potential Conflicts:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {plan.orchestratorData.compatibility.conflicts.map((conflict, index) => (
                      <li key={index}>{conflict}</li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.orchestratorData.compatibility.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Recommendations:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {plan.orchestratorData.compatibility.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goal Prioritization */}
      {isMultiGoal && plan.planData.aiResponse?.goalStructure?.goalPrioritization && (
        <Card>
          <CardHeader>
            <CardTitle>Goal Prioritization</CardTitle>
            <CardDescription>How your goals are balanced in this program</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Primary Goal Focus</span>
                  <span>{plan.planData.aiResponse.goalStructure.goalPrioritization.primaryFocus}%</span>
                </div>
                <Progress 
                  value={plan.planData.aiResponse.goalStructure.goalPrioritization.primaryFocus} 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Secondary Goals Focus</span>
                  <span>{plan.planData.aiResponse.goalStructure.goalPrioritization.secondaryFocus}%</span>
                </div>
                <Progress 
                  value={plan.planData.aiResponse.goalStructure.goalPrioritization.secondaryFocus} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**5.3.2 Mesocycle Timeline Component (`components/workout/mesocycle-timeline.tsx`)**

```typescript
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, Activity } from 'lucide-react';
import { MesocycleStructure } from '@/lib/api/types';

interface MesocycleTimelineProps {
  mesocycles: MesocycleStructure[];
  currentWeek?: number;
}

export function MesocycleTimeline({ mesocycles, currentWeek = 1 }: MesocycleTimelineProps) {
  let cumulativeWeeks = 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-cornflower-blue" />
        <h3 className="text-lg font-semibold">Program Timeline</h3>
      </div>

      <div className="space-y-4">
        {mesocycles.map((mesocycle, index) => {
          const startWeek = cumulativeWeeks + 1;
          const endWeek = cumulativeWeeks + mesocycle.durationWeeks;
          const isActive = currentWeek >= startWeek && currentWeek <= endWeek;
          const isCompleted = currentWeek > endWeek;
          
          cumulativeWeeks += mesocycle.durationWeeks;

          return (
            <Card key={mesocycle.mesocycleNumber} className={isActive ? 'border-cornflower-blue' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Mesocycle {mesocycle.mesocycleNumber}
                      </span>
                      <Badge variant={isActive ? "default" : isCompleted ? "secondary" : "outline"}>
                        {isActive ? 'Active' : isCompleted ? 'Completed' : 'Upcoming'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="font-medium text-base">
                      {mesocycle.name}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">Weeks {startWeek}-{endWeek}</div>
                    <div className="text-xs text-muted-foreground">{mesocycle.durationWeeks} weeks</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Phase</span>
                    </div>
                    <Badge variant="outline">{mesocycle.phase}</Badge>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Focus</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{mesocycle.focus}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium mb-1">Progression</div>
                    <div className="text-xs text-muted-foreground">
                      Volume: {mesocycle.progressionStrategy.volumeProgression}<br/>
                      Intensity: {mesocycle.progressionStrategy.intensityProgression}
                    </div>
                  </div>
                </div>

                {/* Training Parameters */}
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Training Parameters</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="font-medium">Frequency:</span> {mesocycle.trainingParameters.frequency}x/week
                    </div>
                    <div>
                      <span className="font-medium">Intensity:</span> {mesocycle.trainingParameters.intensity}
                    </div>
                    <div>
                      <span className="font-medium">Volume:</span> {mesocycle.trainingParameters.volume}
                    </div>
                    <div>
                      <span className="font-medium">Rest:</span> {mesocycle.trainingParameters.restPeriods}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

#### **5.4 Enhanced Workout Plan Hook (`hooks/use-enhanced-workout-plan.ts`)**

```typescript
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
```

#### **5.5 Implementation Priority and Next Steps**

**REQUIRED (Phase 5 Core):**
1. ✅ Enhanced TypeScript interfaces aligned with Phase 4 database schema
2. ✅ Enhanced API service layer with proper data transformation
3. ✅ Multi-goal plan overview component with compatibility analysis
4. ✅ Mesocycle timeline component for program visualization
5. ✅ Enhanced workout plan hook with Phase 4 data support

**CRITICAL (Phase 5 UX):**
- Goal prioritization visualization components
- Exercise progression tracking components  
- Multi-goal workout session display
- Advanced plan comparison features
- Real-time plan adaptation UI

**FUTURE ENHANCEMENTS:**
- Interactive mesocycle editing
- Goal weight adjustment sliders
- Advanced analytics dashboards
- Plan sharing and collaboration features
- AI coaching conversation interface

### **🏆 PHASE 5 READINESS ASSESSMENT**

The revised Phase 5 frontend enhancement plan is now **100% aligned** with the actual Phase 1-4 implementations and provides:

1. **Complete Type Safety**: All interfaces match actual database schema and agent output
2. **Proper Data Transformation**: Service layer handles Phase 4 JSONB columns correctly
3. **Multi-Goal Support**: Components can display both single and multi-goal plans
4. **Backward Compatibility**: Supports both v1.0 (legacy) and v2.0 (multi-goal) schemas
5. **Rich Visualization**: Timeline, compatibility analysis, and goal prioritization displays
6. **Performance Optimization**: Proper React Query integration with caching strategies

This foundation enables advanced features like real-time plan adaptation, goal progression tracking, and intelligent workout recommendations built on the comprehensive Phase 4 data architecture.