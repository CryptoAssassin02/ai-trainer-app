'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  Target, 
  Dumbbell, 
  MoreVertical,
  Play,
  Edit,
  Trash2,
  Brain,
  Plus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useWorkout } from '@/hooks/use-workout';
import type { WorkoutPlan, EnhancedWorkoutPlan } from '@/lib/api/types';
import { enhancedWorkoutAPI } from '@/lib/api/workout-api';
import Link from 'next/link';

/**
 * Calculate total exercises from structured mesocycles data
 * Supports both chunked generation and WorkoutGenerationAgent formats
 */
function calculateTotalExercisesFromMesocycles(planData: any): number {
  let totalExercises = 0;
  
  // Check for mesocycles in planData (structured output format)
  const mesocycles = planData?.mesocycles || planData?.mesocycleStructure || [];
  
  if (Array.isArray(mesocycles) && mesocycles.length > 0) {
    mesocycles.forEach((mesocycle: any) => {
      // Handle chunked mesocycle format (weeks[].workouts{})
      if (mesocycle.weeks && Array.isArray(mesocycle.weeks)) {
        mesocycle.weeks.forEach((week: any) => {
          if (week.workouts && typeof week.workouts === 'object') {
            // Count exercises from daily workouts (day1, day2, etc.)
            Object.values(week.workouts).forEach((workout: any) => {
              if (typeof workout === 'object' && workout.exercises && Array.isArray(workout.exercises)) {
                totalExercises += workout.exercises.length;
              }
            });
          }
        });
      }
    });
  }
  
  return totalExercises;
}

/**
 * Get total unique exercises across all mesocycles (avoiding duplicates)
 */
function calculateUniqueExercisesFromMesocycles(planData: any): number {
  const exerciseNames = new Set<string>();
  
  const mesocycles = planData?.mesocycles || planData?.mesocycleStructure || [];
  
  if (Array.isArray(mesocycles) && mesocycles.length > 0) {
    mesocycles.forEach((mesocycle: any) => {
      if (mesocycle.weeks && Array.isArray(mesocycle.weeks)) {
        mesocycle.weeks.forEach((week: any) => {
          if (week.workouts && typeof week.workouts === 'object') {
            Object.values(week.workouts).forEach((workout: any) => {
              if (typeof workout === 'object' && workout.exercises && Array.isArray(workout.exercises)) {
                workout.exercises.forEach((exercise: any) => {
                  exerciseNames.add(exercise.exercise || exercise.name);
                });
              }
            });
          }
        });
      }
    });
  }
  
  return exerciseNames.size;
}

/**
 * Detect if plan uses structured output format
 */
function hasStructuredOutputData(plan: WorkoutPlan | EnhancedWorkoutPlan): boolean {
  const enhancedPlan = plan as EnhancedWorkoutPlan;
  return !!(
    enhancedPlan.planData?.mesocycles ||
    enhancedPlan.mesocycleStructure ||
    enhancedPlan.planData?.programName ||
    enhancedPlan.planData?.programDuration ||
    enhancedPlan.generationMethod === 'multi_goal_orchestrated'
  );
}

/**
 * Calculate enhanced plan metrics from structured data
 */
function calculateEnhancedMetrics(plan: WorkoutPlan | EnhancedWorkoutPlan) {
  const enhancedPlan = plan as EnhancedWorkoutPlan;
  const hasStructuredData = hasStructuredOutputData(plan);
  
  // Exercise count calculation
  let exerciseCount = 0;
  let uniqueExerciseCount = 0;
  
  if (hasStructuredData && enhancedPlan.planData) {
    exerciseCount = calculateTotalExercisesFromMesocycles(enhancedPlan.planData);
    uniqueExerciseCount = calculateUniqueExercisesFromMesocycles(enhancedPlan.planData);
  } else {
    // Fallback to legacy counting
    exerciseCount = plan.exercises?.length || 
                   enhancedPlan.planData?.exercises?.length || 
                   0;
    uniqueExerciseCount = exerciseCount;
  }
  
  // Training frequency calculation
  let trainingDaysPerWeek = 0;
  if (hasStructuredData) {
    trainingDaysPerWeek = enhancedPlan.planData?.trainingFrequency?.daysPerWeek || 
                          enhancedPlan.trainingFrequency?.daysPerWeek || 
                          0;
  }
  
  // Program duration calculation
  let programWeeks = 0;
  if (hasStructuredData) {
    programWeeks = enhancedPlan.planData?.programDuration?.totalWeeks ||
                   enhancedPlan.programDurationWeeks ||
                   0;
  }
  
  return {
    exerciseCount,
    uniqueExerciseCount,
    trainingDaysPerWeek,
    programWeeks,
    hasStructuredData
  };
}

interface WorkoutPlanCardProps {
  plan: WorkoutPlan | EnhancedWorkoutPlan;
}

export function WorkoutPlanCard({ plan }: WorkoutPlanCardProps) {
  const { deletePlan, selectPlan } = useWorkout();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Enhanced plan detection and data extraction
  const isEnhancedPlan = (plan as EnhancedWorkoutPlan).schemaVersion !== undefined;
  const enhancedPlan = isEnhancedPlan ? (plan as EnhancedWorkoutPlan) : null;
  const isMultiGoal = enhancedPlan ? enhancedWorkoutAPI.isMultiGoalPlan(enhancedPlan) : false;
  const goalStructure = enhancedPlan ? enhancedWorkoutAPI.getGoalStructure(enhancedPlan) : null;

  // Structured output data validation and metrics
  const metrics = calculateEnhancedMetrics(plan);
  const hasValidStructuredData = metrics.hasStructuredData && (
    metrics.exerciseCount > 0 || 
    metrics.programWeeks > 0 || 
    metrics.trainingDaysPerWeek > 0
  );

  const handleDelete = () => {
    deletePlan(plan.id);
    setShowDeleteDialog(false);
  };

  const handleSelect = () => {
    selectPlan(plan.id);
  };

  // Calculate difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-500';
      case 'intermediate':
        return 'bg-yellow-500';
      case 'advanced':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Format creation date with null check
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Invalid Date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2 text-center">{plan.name}</CardTitle>
            {plan.description && (
              <CardDescription className="mt-1 line-clamp-2 text-center">
                {plan.description}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleSelect}>
                <Play className="mr-2 h-4 w-4" />
                Start Workout
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/workouts/${plan.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Plan
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Enhanced Badges */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {plan.aiGenerated && (
            <Badge variant="secondary" className="text-xs">
              <Brain className="mr-1 h-3 w-3" />
              AI Generated
            </Badge>
          )}
          
          {/* Schema Version Badge */}
          {(() => {
            const metrics = calculateEnhancedMetrics(plan);
            if (enhancedPlan) {
              const version = enhancedPlan.schemaVersion || (metrics.hasStructuredData ? 'v2.0' : 'v1.0');
              const isLatest = version === 'v2.0' || metrics.hasStructuredData;
              
              return (
                <Badge 
                  variant={isLatest ? "default" : "outline"} 
                  className={`text-xs ${isLatest ? 'bg-cornflower-blue' : ''}`}
                >
                  {version}
                </Badge>
              );
            }
            return null;
          })()}
          
          {/* Multi-Goal Badge */}
          {isMultiGoal && (
            <Badge variant="default" className="text-xs bg-gradient-to-r from-cornflower-blue to-blue-600">
              Multi-Goal
            </Badge>
          )}
          
          {/* Primary Goal Badge */}
          {goalStructure && (
            <Badge variant="outline" className="text-xs">
              🎯 {goalStructure.primary.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
          )}
          
          {/* Generation Method Badge */}
          {(() => {
            const metrics = calculateEnhancedMetrics(plan);
            if (metrics.hasStructuredData) {
              return (
                <Badge variant="outline" className="text-xs border-cornflower-blue text-cornflower-blue">
                  ⚡ Structured Output
                </Badge>
              );
            } else if (enhancedPlan?.generationMethod === 'multi_goal_orchestrated') {
              return (
                <Badge variant="outline" className="text-xs">
                  🎯 Multi-Goal
                </Badge>
              );
            }
            return null;
          })()}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Enhanced Plan Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-medium">{plan.estimatedDuration || 'N/A'} min</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Exercises</p>
              <p className="font-medium">{(() => {
                const metrics = calculateEnhancedMetrics(plan);
                
                // Show unique exercise count for structured data, total for legacy
                const count = metrics.hasStructuredData ? metrics.uniqueExerciseCount : metrics.exerciseCount;
                const label = metrics.hasStructuredData && metrics.exerciseCount !== metrics.uniqueExerciseCount 
                  ? `${count} unique (${metrics.exerciseCount} total)`
                  : count.toString();
                  
                return count > 0 ? label : 'N/A';
              })()}</p>
            </div>
          </div>
          
          {/* Enhanced: Program Duration for Structured Plans */}
          {(() => {
            const metrics = calculateEnhancedMetrics(plan);
            const programWeeks = metrics.programWeeks || enhancedPlan?.programDurationWeeks;
            
            return programWeeks && programWeeks > 0 && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-cornflower-blue" />
                <div>
                  <p className="text-muted-foreground">Program</p>
                  <p className="font-medium">{programWeeks} weeks</p>
                </div>
              </div>
            );
          })()}
          
          {/* Enhanced: Mesocycle Count for Structured Plans */}
          {(() => {
            const metrics = calculateEnhancedMetrics(plan);
            const mesocycleCount = metrics.hasStructuredData 
              ? (enhancedPlan?.planData?.mesocycles?.length || 
                 enhancedPlan?.mesocycleStructure?.length || 
                 enhancedPlan?.mesocycleCount)
              : enhancedPlan?.mesocycleCount;
            
            return mesocycleCount && mesocycleCount > 0 && (
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-cornflower-blue" />
                <div>
                  <p className="text-muted-foreground">Mesocycles</p>
                  <p className="font-medium">{mesocycleCount}</p>
                </div>
              </div>
            );
          })()}
          
          {/* Enhanced: Training Frequency for Structured Plans */}
          {(() => {
            const metrics = calculateEnhancedMetrics(plan);
            return metrics.hasStructuredData && metrics.trainingDaysPerWeek > 0 && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-cornflower-blue" />
                <div>
                  <p className="text-muted-foreground">Training</p>
                  <p className="font-medium">{metrics.trainingDaysPerWeek} days/week</p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Difficulty Level */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getDifficultyColor(plan.difficulty)}`} />
            <span className="text-sm font-medium capitalize">{plan.difficulty}</span>
          </div>
        </div>

        {/* Equipment Required */}
        {plan.equipmentRequired && plan.equipmentRequired.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Equipment</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {plan.equipmentRequired.slice(0, 3).map((equipment) => (
                <Badge key={equipment} variant="outline" className="text-xs">
                  {equipment}
                </Badge>
              ))}
              {plan.equipmentRequired.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{plan.equipmentRequired.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {plan.tags && plan.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {plan.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {plan.tags.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{plan.tags.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* DEBUG: Structured Output Information (Remove in production) */}
        {process.env.NODE_ENV === 'development' && metrics.hasStructuredData && (
          <div className="mt-4 p-2 bg-gray-50 rounded text-xs">
            <div className="font-medium text-gray-700">Debug Info:</div>
            <div>Total Exercises: {metrics.exerciseCount}</div>
            <div>Unique Exercises: {metrics.uniqueExerciseCount}</div>
            <div>Training Days: {metrics.trainingDaysPerWeek}/week</div>
            <div>Program Weeks: {metrics.programWeeks}</div>
            <div>Mesocycles: {enhancedPlan?.planData?.mesocycles?.length || 0}</div>
          </div>
        )}

      </CardContent>

      <CardFooter className="pt-0">
        <div className="w-full space-y-3">
          {/* Creation Date */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created {formatDate(plan.createdAt) === 'Invalid Date' ? 'Just now' : formatDate(plan.createdAt)}
            </div>
            <div className="flex items-center gap-1">
              <Badge 
                variant={plan.status === 'active' ? 'default' : 'secondary'} 
                className="text-xs"
              >
                {plan.status}
              </Badge>
            </div>
          </div>
          
          {/* Action Buttons (hidden for structured-output plans to avoid legacy UI) */}
          {(!metrics.hasStructuredData) && (
            <div className="flex gap-2 justify-center">
              <Button 
                variant="outline" 
                size="sm"
                asChild
                className="flex-1"
              >
                <Link href="/workouts/generate">
                  <Plus className="mr-2 h-4 w-4" />
                  Generate New Program
                </Link>
              </Button>
              
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    className="flex-1"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Program
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Workout Program</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{plan.name}"? This action cannot be undone and the program will be permanently removed from your account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, Delete Program
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
