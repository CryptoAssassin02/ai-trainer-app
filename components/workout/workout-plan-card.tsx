'use client';

import React from 'react';
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
  Brain
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkout } from '@/hooks/use-workout';
import type { WorkoutPlan, EnhancedWorkoutPlan } from '@/lib/api/types';
import { enhancedWorkoutAPI } from '@/lib/api/workout-api';
import Link from 'next/link';

interface WorkoutPlanCardProps {
  plan: WorkoutPlan | EnhancedWorkoutPlan;
}

export function WorkoutPlanCard({ plan }: WorkoutPlanCardProps) {
  const { deletePlan, selectPlan } = useWorkout();

  // Enhanced plan detection and data extraction
  const isEnhancedPlan = (plan as EnhancedWorkoutPlan).schemaVersion !== undefined;
  const enhancedPlan = isEnhancedPlan ? (plan as EnhancedWorkoutPlan) : null;
  const isMultiGoal = enhancedPlan ? enhancedWorkoutAPI.isMultiGoalPlan(enhancedPlan) : false;
  const goalStructure = enhancedPlan ? enhancedWorkoutAPI.getGoalStructure(enhancedPlan) : null;

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this workout plan?')) {
      deletePlan(plan.id);
    }
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
            <CardTitle className="text-lg line-clamp-2">{plan.name}</CardTitle>
            {plan.description && (
              <CardDescription className="mt-1 line-clamp-2">
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
          {enhancedPlan && (
            <Badge 
              variant={enhancedPlan.schemaVersion === 'v2.0' ? "default" : "outline"} 
              className="text-xs bg-cornflower-blue"
            >
              {enhancedPlan.schemaVersion}
            </Badge>
          )}
          
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
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Enhanced Plan Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
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
              <p className="font-medium">{
                (plan.exercises?.length || 
                 (plan as EnhancedWorkoutPlan).planData?.exercises?.length || 
                 (plan as any).planData?.workouts?.length || 
                 0)
              }</p>
            </div>
          </div>
          
          {/* Enhanced: Program Duration for Multi-Goal Plans */}
          {enhancedPlan && enhancedPlan.programDurationWeeks && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cornflower-blue" />
              <div>
                <p className="text-muted-foreground">Program</p>
                <p className="font-medium">{enhancedPlan.programDurationWeeks} weeks</p>
              </div>
            </div>
          )}
          
          {/* Enhanced: Mesocycle Count for Multi-Goal Plans */}
          {enhancedPlan && enhancedPlan.mesocycleCount && (
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-cornflower-blue" />
              <div>
                <p className="text-muted-foreground">Mesocycles</p>
                <p className="font-medium">{enhancedPlan.mesocycleCount}</p>
              </div>
            </div>
          )}
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
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleSelect}
              className="flex-1"
              size="sm"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Workout
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              asChild
            >
              <Link href={`/workouts/${plan.id}`}>
                View Details
              </Link>
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
