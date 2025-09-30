'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Target, Play, Loader2 } from 'lucide-react';
import { ProgramStructure, type GenerationStatusResponse } from '@/lib/api/types';
import dynamic from 'next/dynamic';
import { useQueryClient } from '@tanstack/react-query';

interface ChunkedGenerationDisplayProps {
  structure: ProgramStructure;
  currentMesocycle: number;
  totalMesocycles: number;
  mesocyclesCompleted: number;
  isGenerating: boolean;
  onGenerateMesocycle?: (mesocycleNumber: number) => void;
  generatingMesocycle?: number | null;
  weeklyStructure?: any[];
  onGenerateWeeklyStructure?: (mesocycleNumber: number) => void;
  onOpenAdjust?: () => void;
  planId?: string; // NEW: For polling
  pollIntervalMs?: number; // NEW
  autoMode?: boolean; // NEW: automatic stage progression
}

// Stage indicator for display flow. Will drive rendering in subsequent tasks.
type ActiveStage = 'structure' | 'weekly' | 'daily';

function storageKeyForPlan(planId?: string) {
  return `chunkedGen.activeStage.${planId ?? 'unknown'}`;
}

function deriveStageFromStatus(status: GenerationStatusResponse | null | undefined): ActiveStage {
  if (!status) return 'structure';
  // Prefer explicit completion
  if (status.state === 'completed') return 'daily';
  // Use enriched hints when available (non-breaking cast)
  const enriched: any = status as any;
  if (enriched.dailyWorkoutsReady) return 'daily';
  if (enriched.weeklyStructureReady) return 'weekly';
  return 'structure';
}

export function ChunkedGenerationDisplay({
  structure,
  currentMesocycle,
  totalMesocycles,
  mesocyclesCompleted,
  isGenerating,
  onGenerateMesocycle,
  generatingMesocycle,
  weeklyStructure,
  onGenerateWeeklyStructure,
  onOpenAdjust,
  planId,
  pollIntervalMs = 3000,
  autoMode = true
}: ChunkedGenerationDisplayProps) {
  // Task 1: Stage state and persistence (local-first, reconcile with server status)
  const [activeStage, setActiveStage] = useState<ActiveStage>('structure');
  const mountedRef = useRef(false);
  const autoWeeklyStartedRef = useRef(false);
  const autoDailyStartedRef = useRef(false);
  const [statusProgress, setStatusProgress] = useState<{ completed: number; total: number } | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [weeklyStructureLocal, setWeeklyStructureLocal] = useState<any[] | undefined>(weeklyStructure);
  const [dailyWorkoutsLocal, setDailyWorkoutsLocal] = useState<any | undefined>(undefined);
  const queryClient = useQueryClient();
  const stageHeadingRef = useRef<HTMLDivElement | null>(null);
  const [weeklyInFlight, setWeeklyInFlight] = useState(false);
  const [weeklyStageError, setWeeklyStageError] = useState<string | null>(null);

  // Keep local weekly structure in sync when prop first arrives (do not overwrite once locally set)
  useEffect(() => {
    if (!weeklyStructureLocal && Array.isArray(weeklyStructure) && weeklyStructure.length > 0) {
      setWeeklyStructureLocal(weeklyStructure);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyStructure]);

  // Local weekly structure generation handler with optimistic UI and cache updates
  const handleWeeklyStructureGenerationLocal = async (mesocycleNumber: number) => {
    if (!planId) return;
    // Only switch to weekly immediately in auto mode; otherwise stay on structure until success
    if (autoMode) {
      setActiveStage('weekly');
    }
    setWeeklyStageError(null);
    setWeeklyInFlight(true);
    try {
      const { workoutService } = await import('@/lib/api/services/workout-service');
      // Cancel any in-flight queries for these keys to prevent overwrite
      await queryClient.cancelQueries({ queryKey: ['workoutPlans'] });
      if (planId) await queryClient.cancelQueries({ queryKey: ['enhanced-workout-plan', planId] });
      const result = await workoutService.generateWeeklyStructure(planId, mesocycleNumber);
      const weekly = result?.weeklyStructure || [];
      setWeeklyStructureLocal(weekly);

      // Update relevant cache (best-effort) for immediate downstream consumers
      queryClient.setQueryData(['workoutPlans'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((p: any) => {
          if (p?.id !== planId) return p;
          const oldMesocycles = Array.isArray(p?.plan_data?.mesocycles) ? [...p.plan_data.mesocycles] : [];
          const idx = Math.max(0, (mesocycleNumber || 1) - 1);
          const updatedNode = { ...(oldMesocycles[idx] || {}), weekly_structures: weekly };
          const newMesocycles = [...oldMesocycles];
          newMesocycles[idx] = updatedNode;
          return {
            ...p,
            plan_data: {
              ...(p?.plan_data || {}),
              mesocycles: newMesocycles
            }
          };
        });
      });
      // Also set specific enhanced plan cache if present
      if (planId) {
        queryClient.setQueryData(['enhanced-workout-plan', planId], (old: any) => {
          if (!old) return old;
          const oldMesocycles = Array.isArray(old?.planData?.mesocycles) ? [...old.planData.mesocycles] : [];
          const idx = Math.max(0, (mesocycleNumber || 1) - 1);
          const updatedNode = { ...(oldMesocycles[idx] || {}), weekly_structures: weekly };
          const newMesocycles = [...oldMesocycles];
          newMesocycles[idx] = updatedNode;
          return {
            ...old,
            planData: {
              ...(old?.planData || {}),
              mesocycles: newMesocycles
            }
          };
        });
      }

      // Reconcile with server in background
      await queryClient.invalidateQueries({ queryKey: ['workoutPlans'], exact: false });
      if (planId) await queryClient.invalidateQueries({ queryKey: ['enhanced-workout-plan', planId], exact: false });

      // In step-by-step mode, switch to weekly after success
      if (!autoMode) {
        setActiveStage('weekly');
      }

      // Auto mode: start daily workouts generation and switch stage when request begins
      if (autoMode && !autoDailyStartedRef.current) {
        autoDailyStartedRef.current = true;
        setActiveStage('daily');
        try {
          const meso = await workoutService.generateMesocycle(planId, mesocycleNumber);
          const daily = meso?.mesocycleDetails || meso; // support both result shapes
          setDailyWorkoutsLocal(daily);

          // Update caches with daily workouts if available
          queryClient.setQueryData(['workoutPlans'], (old: any) => {
            if (!Array.isArray(old)) return old;
            return old.map((p: any) => {
              if (p?.id !== planId) return p;
              const oldMesocycles = Array.isArray(p?.plan_data?.mesocycles) ? [...p.plan_data.mesocycles] : [];
              const idx = Math.max(0, (mesocycleNumber || 1) - 1);
              const updatedNode = { ...(oldMesocycles[idx] || {}), daily_workouts: daily };
              const newMesocycles = [...oldMesocycles];
              newMesocycles[idx] = updatedNode;
              return {
                ...p,
                plan_data: {
                  ...(p?.plan_data || {}),
                  mesocycles: newMesocycles
                }
              };
            });
          });
          if (planId) {
            queryClient.setQueryData(['enhanced-workout-plan', planId], (old: any) => {
              if (!old) return old;
              const oldMesocycles = Array.isArray(old?.planData?.mesocycles) ? [...old.planData.mesocycles] : [];
              const idx = Math.max(0, (mesocycleNumber || 1) - 1);
              const updatedNode = { ...(oldMesocycles[idx] || {}), daily_workouts: daily };
              const newMesocycles = [...oldMesocycles];
              newMesocycles[idx] = updatedNode;
              return {
                ...old,
                planData: {
                  ...(old?.planData || {}),
                  mesocycles: newMesocycles
                }
              };
            });
          }

          await queryClient.invalidateQueries({ queryKey: ['workoutPlans'], exact: false });
          if (planId) await queryClient.invalidateQueries({ queryKey: ['enhanced-workout-plan', planId], exact: false });
        } catch (err) {
          // Non-fatal for display flow
        }
      }
    } catch (err: any) {
      const status = err?.response?.status;
      let message = 'Failed to generate weekly structure';
      if (status === 400) message = 'Invalid request. Please review inputs and try again.';
      else if (status === 404) message = 'Workout plan not found. It may have been removed.';
      else if (status === 409) message = 'Mesocycle already generated. Proceed to the next step.';
      else if (status === 503) message = 'Service temporarily unavailable. Please try again shortly.';
      setWeeklyStageError(message);
    } finally {
      setWeeklyInFlight(false);
    }
  };

  // Initialize activeStage after first paint: restore from storage, then reconcile via server status
  useEffect(() => {
    if (mountedRef.current) return; // ensure first paint only
    mountedRef.current = true;

    let cancelled = false;
    const init = async () => {
      try {
        if (typeof window !== 'undefined') {
          const key = storageKeyForPlan(planId);
          const stored = window.localStorage.getItem(key) as ActiveStage | null;
          if (stored === 'structure' || stored === 'weekly' || stored === 'daily') {
            setActiveStage(stored);
          }
        }
        // Reconcile with server status (derive stage) with minimal dependency on planId
        if (planId) {
          const { workoutService } = await import('@/lib/api/services/workout-service');
          const status = await workoutService.getGenerationStatus(planId);
          if (!cancelled) {
            setActiveStage(prev => {
              const derived = deriveStageFromStatus(status);
              // Only update if server-derived stage advances the flow forward
              const order: Record<ActiveStage, number> = { structure: 0, weekly: 1, daily: 2 };
              return order[derived] > order[prev] ? derived : prev;
            });
          }
        }
      } catch (_) {
        // Non-fatal: keep local stage
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // first paint only

  // Persist activeStage changes (guarded to avoid hydration mismatch)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = storageKeyForPlan(planId);
    try {
      window.localStorage.setItem(key, activeStage);
    } catch (_) {
      // ignore storage errors (quota, private mode)
    }
  }, [activeStage, planId]);

  // Manage focus on stage switch
  useEffect(() => {
    // Delay focus slightly to ensure content is mounted
    const t = setTimeout(() => {
      if (stageHeadingRef.current) {
        stageHeadingRef.current.focus();
      }
    }, 0);
    return () => clearTimeout(t);
  }, [activeStage]);

  // Task 3.1: On structure success, immediately show structure stage
  useEffect(() => {
    // Use a stable identifier from structure to avoid full object deps
    const hasStructure = !!structure?.programName;
    if (hasStructure) {
      setActiveStage('structure');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure?.programName]);

  // Task 3.2 (+ Task 4 auto kick): In automatic mode, kick off weekly generation using local handler
  useEffect(() => {
    if (!autoMode) return;
    // prefer local handler to capture response and update cache
    if (autoWeeklyStartedRef.current) return;
    // Only start automatically if we are on structure stage and no weekly structure exists yet
    const hasStructure = !!structure?.programName;
    const hasWeekly = Array.isArray(weeklyStructureLocal) && weeklyStructureLocal.length > 0;
    if (hasStructure && !hasWeekly) {
      autoWeeklyStartedRef.current = true;
      // Switch stage as soon as the request starts
      setActiveStage('weekly');
      try {
        handleWeeklyStructureGenerationLocal(1);
      } catch (_) {
        // Non-fatal - the handler may be async elsewhere
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode, structure?.programName, weeklyStructureLocal]);

  // Poll backend for generation status to keep progress in sync
  useEffect(() => {
    let timer: any = null;
    if (!planId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const { workoutService } = await import('@/lib/api/services/workout-service');
        const data = await workoutService.getGenerationStatus(planId);
        if (cancelled) return;
        if (data?.progress?.completed != null && data?.progress?.total != null) {
          setStatusProgress({ completed: data.progress.completed, total: data.progress.total });
        }
        setStatusError(null);
      } catch (err: any) {
        if (cancelled) return;
        const status = err?.response?.status;
        let message = 'Failed to fetch status';
        if (status === 400) message = 'Invalid request. Please review inputs and try again.';
        else if (status === 404) message = 'Workout plan not found. It may have been removed.';
        else if (status === 409) message = 'Mesocycle already generated. Proceed to the next step.';
        else if (status === 503) message = 'Service temporarily unavailable. Please try again shortly.';
        setStatusError(message);
      } finally {
        timer = setTimeout(poll, pollIntervalMs);
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [planId, pollIntervalMs]);

  const progressPercentage = (() => {
    const c = statusProgress?.completed ?? mesocyclesCompleted;
    const t = statusProgress?.total ?? totalMesocycles;
    return t > 0 ? Math.round((c / t) * 100) : 0;
  })();

  const stageLabel: string = useMemo(() => {
    if (activeStage === 'structure') return 'Structure Stage';
    if (activeStage === 'weekly') return 'Weekly Structure Stage';
    return 'Daily Workouts Stage';
  }, [activeStage]);

  const goToPreviousStage = () => {
    const order: ActiveStage[] = ['structure', 'weekly', 'daily'];
    const idx = order.indexOf(activeStage);
    if (idx > 0) setActiveStage(order[idx - 1]);
  };
  // Stage components (code-split) with lightweight skeletons
  const StructureStageCard = useMemo(() => dynamic(() => import('./stages/structure-stage-card'), {
    loading: () => (
      <div className="rounded-md border p-4">
        <div className="h-5 w-1/3 bg-muted animate-pulse rounded" />
        <div className="mt-4 h-2 w-full bg-muted animate-pulse rounded" />
      </div>
    )
  }), []);

  const WeeklyStageCard = useMemo(() => dynamic(() => import('./stages/weekly-stage-card'), {
    loading: () => (
      <div className="rounded-md border p-4">
        <div className="h-5 w-1/4 bg-muted animate-pulse rounded" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
        </div>
      </div>
    )
  }), []);

  const DailyStageCard = useMemo(() => dynamic(() => import('./stages/daily-stage-card'), {
    loading: () => (
      <div className="rounded-md border p-4">
        <div className="h-5 w-1/5 bg-muted animate-pulse rounded" />
        <div className="mt-4 h-10 w-full bg-muted animate-pulse rounded" />
      </div>
    )
  }), []);

  // Render exactly one stage card, remount on stage switch to reset any internal panels
  const StickyHeader = (
    <div className="sticky top-0 z-10 -mx-2 px-2 py-2 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center justify-between">
        <div
          ref={stageHeadingRef}
          id="chunked-stage-heading"
          role="heading"
          aria-level={2}
          tabIndex={-1}
          className="text-sm font-medium text-cornflower-blue"
          aria-label={stageLabel}
        >
          {stageLabel}
        </div>
        <div className="flex items-center gap-3">
          <div aria-live="polite" className="text-xs text-muted-foreground">
            {progressPercentage}%
          </div>
          <div className="w-24">
            <Progress value={progressPercentage} className="h-1" />
          </div>
        </div>
      </div>
      <div className="mt-2">
        <button
          type="button"
          onClick={goToPreviousStage}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
          disabled={activeStage === 'structure'}
          aria-label="Back to previous stage"
        >
          Back to previous stage
        </button>
      </div>
    </div>
  );

  const containerProps = {
    role: 'region' as const,
    'aria-labelledby': 'chunked-stage-heading'
  };

  if (activeStage === 'structure') {
    return (
      <div {...containerProps}>
        {StickyHeader}
        <StructureStageCard
          key={`stage-structure`}
          structure={structure}
          currentMesocycle={currentMesocycle}
          totalMesocycles={totalMesocycles}
          mesocyclesCompleted={mesocyclesCompleted}
          isGenerating={isGenerating}
          onGenerateMesocycle={onGenerateMesocycle}
          generatingMesocycle={generatingMesocycle ?? null}
          onGenerateWeeklyStructure={handleWeeklyStructureGenerationLocal}
          onOpenAdjust={onOpenAdjust}
          progressPercentage={progressPercentage}
          statusError={statusError}
          disableActions={weeklyInFlight}
          stageError={weeklyStageError}
          onRetryWeekly={() => handleWeeklyStructureGenerationLocal(1)}
        />
      </div>
    );
  }
  if (activeStage === 'weekly') {
    return (
      <div {...containerProps}>
        {StickyHeader}
        <WeeklyStageCard
          key={`stage-weekly`}
          weeklyStructure={weeklyStructureLocal || weeklyStructure}
        />
      </div>
    );
  }
  return (
    <div {...containerProps}>
      {StickyHeader}
      <DailyStageCard key={`stage-daily`} dailyWorkouts={dailyWorkoutsLocal} />
    </div>
  );
}

// Helper guards
function mesocylesCompletedGuard(mesocyclesCompleted: number): boolean {
  return mesocyclesCompleted >= 1;
}
