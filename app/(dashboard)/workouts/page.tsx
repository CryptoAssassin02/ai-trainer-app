'use client';

import { useWorkout } from '@/hooks/use-workout';
import { 
  WorkoutPlanCard,
  WorkoutSkeleton,
  EmptyWorkoutState,
  AIOperationProgress,
  EnhancedPlanOverview,
  MesocycleTimeline
} from '@/components/workout';
import { ApiErrorDisplay } from '@/components/error/api-error-display';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfileQueryContext } from '@/components/profile/profile-query-provider';
import { enhancedWorkoutAPI } from '@/lib/api/workout-api';
import type { EnhancedWorkoutPlan } from '@/lib/api/types';
import { useState } from 'react';

export default function WorkoutsPage() {
  const { 
    plans, 
    isLoading, 
    error, 
    operationStatus, 
    isGenerating,
    canGenerate 
  } = useWorkout();
  
  const { profile } = useProfileQueryContext();
  const [selectedPlan, setSelectedPlan] = useState<EnhancedWorkoutPlan | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'multi-goal' | 'single-goal'>('all');
  
  // Extract first name from profile data, similar to dashboard
  const firstName = (profile as any)?.name?.split(' ')[0] || 'Your';
  
  // Enhanced plan filtering
  const filteredPlans = plans?.filter(plan => {
    const isEnhanced = (plan as EnhancedWorkoutPlan).schemaVersion !== undefined;
    const isMultiGoal = isEnhanced ? enhancedWorkoutAPI.isMultiGoalPlan(plan as EnhancedWorkoutPlan) : false;
    
    switch (filterType) {
      case 'multi-goal':
        return isMultiGoal;
      case 'single-goal':
        return !isMultiGoal;
      default:
        return true;
    }
  }) || [];
  
  if (isLoading) return <WorkoutSkeleton />;
  if (error) return <ApiErrorDisplay error={error} />;
  
  return (
    <div className="min-h-screen bg-background">
      {/* AI Operation Status Display */}
      {operationStatus.status !== 'idle' && (
        <div className="container py-4">
          <Card>
            <CardContent className="pt-6">
              <AIOperationProgress status={operationStatus} />
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Absolutely Centered Layout - Full Width Approach */}
      <div className="w-full py-8 space-y-8">
        {/* Perfectly Centered Header Section */}
        <div className="w-full text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cornflower-blue to-blue-600 bg-clip-text text-transparent">
            {firstName}'s Workout Plans
          </h1>
          <p className="text-muted-foreground text-lg">
            AI-powered personalized fitness plans
          </p>
          
          {/* Enhanced Plan Filtering */}
          {plans && plans.length > 0 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
                className={filterType === 'all' ? 'bg-cornflower-blue' : ''}
              >
                All Plans ({plans.length})
              </Button>
              <Button
                variant={filterType === 'multi-goal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('multi-goal')}
                className={filterType === 'multi-goal' ? 'bg-cornflower-blue' : ''}
              >
                Multi-Goal ({plans.filter(p => (p as EnhancedWorkoutPlan).schemaVersion && enhancedWorkoutAPI.isMultiGoalPlan(p as EnhancedWorkoutPlan)).length})
              </Button>
              <Button
                variant={filterType === 'single-goal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('single-goal')}
                className={filterType === 'single-goal' ? 'bg-cornflower-blue' : ''}
              >
                Single-Goal ({plans.filter(p => !(p as EnhancedWorkoutPlan).schemaVersion || !enhancedWorkoutAPI.isMultiGoalPlan(p as EnhancedWorkoutPlan)).length})
              </Button>
            </div>
          )}
        </div>
        
        {/* Absolutely Centered Content Area */}
        <div className="w-full flex justify-center">
          {/* Plans Display */}
          {plans?.length === 0 ? (
            <div className="w-full max-w-3xl mx-4">
              <EmptyWorkoutState canGenerate={canGenerate} />
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="w-full max-w-3xl mx-4 text-center">
              <Card>
                <CardContent className="py-12">
                  <p className="text-muted-foreground">No plans match the selected filter.</p>
                  <Button
                    variant="outline"
                    onClick={() => setFilterType('all')}
                    className="mt-4"
                  >
                    Show All Plans
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="w-full max-w-6xl mx-4 space-y-6">
              {/* Enhanced Plan Overview for Selected Plan */}
              {selectedPlan && (
                <Card className="border-cornflower-blue">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold">Plan Details</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPlan(null)}
                      >
                        Close
                      </Button>
                    </div>
                    <EnhancedPlanOverview plan={selectedPlan} />
                    {selectedPlan.mesocycleStructure && selectedPlan.mesocycleStructure.length > 0 && (
                      <div className="mt-6">
                        <MesocycleTimeline mesocycles={selectedPlan.mesocycleStructure} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Plans Grid */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPlans.map(plan => (
                  <div key={plan.id} className="relative">
                    <WorkoutPlanCard plan={plan} />
                    {/* Enhanced Plan Details Button */}
                    {(plan as EnhancedWorkoutPlan).schemaVersion && (
                      <div className="absolute top-2 right-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedPlan(plan as EnhancedWorkoutPlan)}
                          className="text-xs bg-cornflower-blue/10 hover:bg-cornflower-blue/20"
                        >
                          Details
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}