'use client';

import { useWorkout } from '@/hooks/use-workout';
import {
  WorkoutSkeleton,
  EmptyWorkoutState,
  AIOperationProgress,
  WeeklyStructureCalendar,
  DailyWorkoutsWeekView
} from '@/components/workout';
import { ApiErrorDisplay } from '@/components/error/api-error-display';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useProfileQueryContext } from '@/components/profile/profile-query-provider';
import { enhancedWorkoutAPI } from '@/lib/api/workout-api';
import type { EnhancedWorkoutPlan, WeekStructure } from '@/lib/api/types';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Target, Trash2 } from 'lucide-react';
import type { ProgramStructure } from '@/lib/api/types';

export default function WorkoutsPage() {
  const {
    plans,
    isLoading,
    error,
    operationStatus,
    canGenerate,
    deletePlan
  } = useWorkout();
  
  const { profile } = useProfileQueryContext();
  const [viewType, setViewType] = useState<'program' | 'weekly' | 'daily'>('program');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [selectedMesocycle, setSelectedMesocycle] = useState<number>(1);
  
  // NEW: Program overview state for recently generated structure
  const [programOverview, setProgramOverview] = useState<{
    structure: ProgramStructure;
    planId: string;
    mesocyclesCompleted: number;
  } | null>(null);
  
  // Resolve a program structure for viewing (no generation actions)
  useEffect(() => {
    // First, check localStorage for recent context
    const storedProgram = localStorage.getItem('recentProgramStructure');
    if (storedProgram) {
      try {
        const parsed = JSON.parse(storedProgram);
        setProgramOverview(parsed);
        // Clear after retrieving to prevent stale data
        localStorage.removeItem('recentProgramStructure');
        return; // Use localStorage data and exit
      } catch (error) {
        localStorage.removeItem('recentProgramStructure');
      }
    }
    
    // Fallback: detect embedded structure in any available plan
    if (plans && plans.length > 0) {
      const planWithEmbeddedStructure = plans.find(p => (p as any)?.plan_data?.structure) as any;
      if (planWithEmbeddedStructure?.plan_data?.structure) {
        const structure = planWithEmbeddedStructure.plan_data.structure as ProgramStructure;
        setProgramOverview({
          structure,
          planId: planWithEmbeddedStructure.id,
          mesocyclesCompleted: (planWithEmbeddedStructure as any).mesocycles_generated || 0
        });
      } else {
        setProgramOverview(null);
      }
    } else {
      setProgramOverview(null);
    }
  }, [plans]); // Re-run when plans change

  // Load full plan details for Weekly/Daily views
  const [detailedPlan, setDetailedPlan] = useState<EnhancedWorkoutPlan | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  useEffect(() => {
    const planId = programOverview?.planId;
    if (!planId) { setDetailedPlan(null); return; }
    setIsPlanLoading(true);
    (async () => {
      try {
        const fetched = await enhancedWorkoutAPI.getWorkoutPlan(planId);
        setDetailedPlan(fetched);
      } finally {
        setIsPlanLoading(false);
      }
    })();
  }, [programOverview?.planId]);

  // Delete handler for program overview
  const handleDeleteProgram = () => {
    if (programOverview) {
      deletePlan(programOverview.planId);
      setProgramOverview(null);
      setShowDeleteDialog(false);
    }
  };
  
  
  // Extract first name from profile data, similar to dashboard
  const firstName = (profile as any)?.name?.split(' ')[0] || 'Your';
  
  // Data derivations for Weekly and Daily views
  const selectedMesoIndex = useMemo(() => Math.max(0, (selectedMesocycle || 1) - 1), [selectedMesocycle]);
  const weeklyStructure = useMemo(() => {
    const m = (detailedPlan as any)?.planData?.mesocycles?.[selectedMesoIndex];
    return m?.weekly_structures || [];
  }, [detailedPlan, selectedMesoIndex]);
  const weeks: WeekStructure[] = useMemo(() => {
    if (!detailedPlan) return [] as unknown as WeekStructure[];
    const fromStructured = detailedPlan.mesocycleStructure?.[selectedMesoIndex]?.weeks as WeekStructure[] | undefined;
    if (fromStructured && fromStructured.length) return fromStructured;
    const fromPlanData = (detailedPlan as any)?.planData?.mesocycles?.[selectedMesoIndex]?.weeks as WeekStructure[] | undefined;
    return fromPlanData || ([] as unknown as WeekStructure[]);
  }, [detailedPlan, selectedMesoIndex]);
  const currentWeek = weeks[currentWeekIndex];
  
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#3E9EFF] to-[#3E9EFF]/65 bg-clip-text text-transparent">
            {firstName}'s Workout Program
          </h1>
          <p className="text-muted-foreground text-lg">
            AI-powered personalized fitness plans
          </p>
          
          {/* View Filters */}
          <div className="flex justify-center gap-2 mt-4">
            <Button
              variant={viewType === 'program' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('program')}
              className={`min-w-[160px] ${viewType === 'program' ? 'bg-[#3E9EFF]' : ''}`}
            >
              Program Structure
            </Button>
            <Button
              variant={viewType === 'weekly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('weekly')}
              className={`min-w-[160px] ${viewType === 'weekly' ? 'bg-[#3E9EFF]' : ''}`}
            >
              Weekly Structure
            </Button>
            <Button
              variant={viewType === 'daily' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('daily')}
              className={`min-w-[160px] ${viewType === 'daily' ? 'bg-[#3E9EFF]' : ''}`}
            >
              Daily Workouts
            </Button>
          </div>
        </div>
        
        {/* Absolutely Centered Content Area */}
        <div className="w-full flex justify-center">
          {/* MAIN VIEWS */}
          {!programOverview ? (
            <div className="w-full max-w-3xl mx-4">
              <EmptyWorkoutState canGenerate={canGenerate} />
            </div>
          ) : viewType === 'program' ? (
            <div className="w-full max-w-4xl mx-4">
              <Card className="border-cornflower-blue bg-gradient-to-br from-cornflower-blue/5 to-blue-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold text-[#3E9EFF] text-center">
                    <Target className="h-5 w-5" />
                    {programOverview.structure.programName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <div className="text-md font-medium text-[#3E9EFF]">Duration:</div>
                      <div className="text-sm text-muted-foreground">{programOverview.structure.totalDuration} weeks</div>
                    </div>
                    <div>
                      <div className="text-md font-medium text-[#3E9EFF]">Training Frequency:</div>
                      <div className="text-sm text-muted-foreground">{programOverview.structure.trainingFrequency.daysPerWeek} days/week</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                      {programOverview.structure.mesocycles.map((meso) => {
                        const total = programOverview.structure.mesocycles.length;
                        const current = Math.min((programOverview.mesocyclesCompleted || 0) + 1, total);
                        const isFuture = meso.mesocycleNumber > current;
                        return (
                          <Card key={meso.mesocycleNumber} className="border border-cornflower-blue/30">
                            <CardHeader className="py-4">
                              <CardTitle className="text-base text-lg font-semibold text-[#3E9EFF]">
                                Phase {meso.mesocycleNumber}: {meso.theme}
                                <div className="text-sm font-medium text-white">{meso.focus}</div>
                              </CardTitle>
                              <CardDescription>{meso.duration} weeks</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                              {isFuture ? (
                                <div className="text-center text-sm text-muted-foreground py-2">
                                  Unlocks after you complete the earlier stages — log all daily workouts to continue.
                                </div>
                              ) : (
                                <div className="flex gap-3 justify-center">
                                  <Button
                                    variant="outline"
                                    className="flex-2 max-w-xs bg-[#3E9EFF] text-black"
                                    onClick={() => { setSelectedMesocycle(meso.mesocycleNumber); setViewType('weekly'); setCurrentWeekIndex(0); }}
                                  >
                                    View Weekly Structure
                                  </Button>
                                  <Button
                                    className="flex-2 max-w-xs bg-[#3E9EFF]"
                                    onClick={() => { setSelectedMesocycle(meso.mesocycleNumber); setViewType('daily'); setCurrentWeekIndex(0); }}
                                  >
                                    View Daily Workouts
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex gap-3 justify-center">
                      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="flex-1 max-w-sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Program
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Workout Program</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{programOverview.structure.programName}"? This action cannot be undone and the program will be permanently removed from your account.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteProgram}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Yes, Delete Program
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : viewType === 'weekly' ? (
            <div className="w-full max-w-5xl mx-4 space-y-4">
              <div className="text-center text-sm text-muted-foreground">Mesocycle {selectedMesocycle}</div>
              <WeeklyStructureCalendar weeklyStructure={weeklyStructure} />
              {!isPlanLoading && weeklyStructure?.length === 0 && (
                <div className="text-center text-muted-foreground">No weekly structure available yet for this mesocycle.</div>
              )}
            </div>
          ) : (
            <div className="w-full max-w-6xl mx-4 space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeekIndex(i => Math.max(0, i - 1))}
                  disabled={currentWeekIndex === 0}
                >
                  Prev Week
                </Button>
                <div className="text-lg font-medium">Week {currentWeek?.weekNumber || 1}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeekIndex(i => Math.min((weeks?.length || 1) - 1, i + 1))}
                  disabled={!weeks || weeks.length === 0 || currentWeekIndex === weeks.length - 1}
                >
                  Next Week
                </Button>
              </div>
              <DailyWorkoutsWeekView week={currentWeek} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}