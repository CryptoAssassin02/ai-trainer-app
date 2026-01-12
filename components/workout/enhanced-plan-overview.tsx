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
