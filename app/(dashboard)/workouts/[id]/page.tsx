'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Target, 
  Dumbbell,
  Brain,
  TrendingUp
} from 'lucide-react';
import { 
  EnhancedPlanOverview, 
  MesocycleTimeline,
  WorkoutSkeleton 
} from '@/components/workout';
import { ApiErrorDisplay } from '@/components/error/api-error-display';
import { useEnhancedWorkoutPlan } from '@/hooks/use-enhanced-workout-plan';
import { enhancedWorkoutAPI } from '@/lib/api/workout-api';
import type { EnhancedWorkoutPlan } from '@/lib/api/types';

export default function EnhancedWorkoutPlanPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;
  
  const {
    plan,
    mesocycles,
    orchestratorData,
    goalStructure,
    isLoading,
    error,
    isMultiGoalPlan
  } = useEnhancedWorkoutPlan(planId);

  if (isLoading) return <WorkoutSkeleton />;
  if (error) return <ApiErrorDisplay error={error} />;
  if (!plan) return <div>Plan not found</div>;

  const enhancedPlan = plan as EnhancedWorkoutPlan;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Plans
          </Button>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{plan?.name || 'Loading...'}</h1>
            <p className="text-muted-foreground mt-1">{plan?.description || ''}</p>
          </div>
          
          {/* Plan Type Badge */}
          <Badge 
            variant={isMultiGoalPlan ? "default" : "secondary"} 
            className={isMultiGoalPlan ? "bg-cornflower-blue" : ""}
          >
            {isMultiGoalPlan ? 'Multi-Goal Program' : 'Single-Goal Program'}
          </Badge>
        </div>

        {/* Enhanced Plan Overview */}
        <EnhancedPlanOverview plan={enhancedPlan} />

        {/* Mesocycle Timeline */}
        {mesocycles && mesocycles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-cornflower-blue" />
                Program Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MesocycleTimeline mesocycles={mesocycles} />
            </CardContent>
          </Card>
        )}

        {/* Training Parameters */}
        {orchestratorData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-cornflower-blue" />
                Training Parameters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(orchestratorData.trainingParameters).map(([goalName, params]) => (
                  <Card key={goalName} className="border-muted">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base capitalize">
                        {goalName.replace('_', ' ')} Parameters
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Frequency:</span>
                          <p className="font-medium">{params.frequency}x/week</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Intensity:</span>
                          <p className="font-medium">{params.intensity}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Volume:</span>
                          <p className="font-medium">{params.volume}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Rest:</span>
                          <p className="font-medium">{params.restPeriods}</p>
                        </div>
                      </div>
                      {params.repRange && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Rep Range:</span>
                          <p className="font-medium">{params.repRange}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Exercise Priorities */}
        {orchestratorData?.exercisePriorities && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-cornflower-blue" />
                Exercise Priorities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(orchestratorData.exercisePriorities).map(([type, priority]) => (
                  <div key={type} className="text-center">
                    <div className="text-2xl font-bold text-cornflower-blue">{priority}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {type.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progression Strategy */}
        {orchestratorData?.progressionStrategy && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-cornflower-blue" />
                Progression Strategy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-muted-foreground">Primary Method:</span>
                  <p className="font-medium capitalize">
                    {orchestratorData.progressionStrategy.primary.replace('_', ' ')}
                  </p>
                </div>
                {orchestratorData.progressionStrategy.deloadFrequency && (
                  <div>
                    <span className="text-sm text-muted-foreground">Deload Frequency:</span>
                    <p className="font-medium">
                      Every {orchestratorData.progressionStrategy.deloadFrequency} weeks
                    </p>
                  </div>
                )}
                {orchestratorData.progressionStrategy.overallMethod && (
                  <div>
                    <span className="text-sm text-muted-foreground">Overall Method:</span>
                    <p className="font-medium">
                      {orchestratorData.progressionStrategy.overallMethod}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Reasoning */}
        {enhancedPlan.aiReasoning && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-cornflower-blue" />
                AI Reasoning & Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {enhancedPlan.aiReasoning.reasoning && (
                <div>
                  <h4 className="font-medium mb-2">Reasoning:</h4>
                  <p className="text-sm text-muted-foreground">
                    {enhancedPlan.aiReasoning.reasoning}
                  </p>
                </div>
              )}
              
              {enhancedPlan.aiReasoning.recommendations && enhancedPlan.aiReasoning.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recommendations:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {enhancedPlan.aiReasoning.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button className="bg-cornflower-blue hover:bg-cornflower-blue/90">
            Start Workout
          </Button>
          <Button variant="outline">
            Edit Plan
          </Button>
          <Button variant="outline">
            Export Plan
          </Button>
        </div>
      </div>
    </div>
  );
}