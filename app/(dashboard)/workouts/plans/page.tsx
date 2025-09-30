'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfileQueryContext } from '@/components/profile/profile-query-provider';
import { enhancedWorkoutAPI } from '@/lib/api/workout-api';
import type { EnhancedWorkoutPlan, WeekStructure, WorkoutSession } from '@/lib/api/types';

type PlansViewContext = { planId: string; mesocycleNumber: number };

export default function WorkoutPlansPage() {
  const router = useRouter();
  const { profile } = useProfileQueryContext();

  const [isLoading, setIsLoading] = useState(true);
  const [plan, setPlan] = useState<EnhancedWorkoutPlan | null>(null);
  const [mesocycleNumber, setMesocycleNumber] = useState<number>(1);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  // Read context saved when user clicked "View Program"
  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('plansViewContext') : null;
    if (!raw) {
      setIsLoading(false);
      return;
    }
    try {
      const ctx: PlansViewContext = JSON.parse(raw);
      setMesocycleNumber(ctx.mesocycleNumber || 1);
      (async () => {
        try {
          const fetched = await enhancedWorkoutAPI.getWorkoutPlan(ctx.planId);
          setPlan(fetched);
        } finally {
          setIsLoading(false);
        }
      })();
    } catch {
      setIsLoading(false);
    }
  }, []);

  // Resolve selected mesocycle from any available structure
  const selectedMesocycle = useMemo(() => {
    if (!plan) return null;
    const fromV5 = plan.mesocycleStructure?.find(m => m.mesocycleNumber === mesocycleNumber);
    if (fromV5) return fromV5;
    const fromLegacy = plan.planData?.mesocycles?.find(m => m.mesocycleNumber === mesocycleNumber);
    return fromLegacy ?? null;
  }, [plan, mesocycleNumber]);

  const weeks: WeekStructure[] = useMemo(() => {
    if (!selectedMesocycle) return [] as unknown as WeekStructure[];
    // Support both structures
    return (selectedMesocycle.weeks || []) as WeekStructure[];
  }, [selectedMesocycle]);

  const currentWeek = weeks[currentWeekIndex];

  // Compute display duration and training frequency from most reliable sources
  const displayDurationWeeks = useMemo(() => {
    // Prefer per-mesocycle duration if available
    if ((selectedMesocycle as any)?.durationWeeks) return (selectedMesocycle as any).durationWeeks;
    // Support structure.mesocycles[].duration from ProgramStructure
    if ((selectedMesocycle as any)?.duration) return (selectedMesocycle as any).duration;
    // Derive from week count when explicit duration missing
    if (weeks && weeks.length > 0) return weeks.length;
    // Fallbacks to program-level
    const pd = (plan as any)?.planData?.programDuration?.totalWeeks;
    if (pd) return pd;
    return plan?.programDurationWeeks || 0;
  }, [selectedMesocycle, plan, weeks]);

  const displayDaysPerWeek = useMemo(() => {
    // Derive from current week; support legacy and new day schema
    if (currentWeek?.workouts) {
      const nonRest = Object.values(currentWeek.workouts).filter((v: any) => {
        if (typeof v === 'string') return String(v).toLowerCase() !== 'rest';
        if (v && typeof v === 'object') {
          // New schema has dayType
          if ('dayType' in v) return (v as any).dayType === 'workout';
          // Legacy object implies a workout session
          return true;
        }
        return false;
      }).length;
      if (nonRest > 0) return nonRest;
    }
    const tf = plan?.trainingFrequency?.daysPerWeek || (plan as any)?.planData?.trainingFrequency?.daysPerWeek;
    return tf || 0;
  }, [currentWeek, plan]);

  const inferDayTitleFromExercises = (exercises: Array<{ exercise?: string; name?: string }>): string => {
    const names = exercises.map(e => (e.exercise || e.name || '').toLowerCase());
    const has = (kw: string | RegExp) => names.some(n => typeof kw === 'string' ? n.includes(kw) : kw.test(n));
    const legsQuad = has('squat') || has('lunge') || has('leg press') || has('split squat') || has('quad');
    const posterior = has('deadlift') || has(/rdl|romanian/) || has('hinge') || has('hamstring') || has('glute');
    const push = has('bench') || has('press') || has('push-up') || has('dip') || has('overhead');
    const pull = has('row') || has('pull') || has('pulldown') || has('chin-up') || has('face pull');
    const core = has('core') || has('ab') || has('plank') || has('crunch') || has('carry');
    const conditioning = has('run') || has('bike') || has('sprint') || has('interval') || has('hiit') || has('conditioning');

    if (legsQuad && !posterior) return 'Legs - Quad-Focused';
    if (posterior && !legsQuad) return 'Legs - Posterior Chain';
    if (push && !pull) return 'Upper - Push';
    if (pull && !push) return 'Upper - Pull';
    if (conditioning && !(push || pull || legsQuad || posterior)) return 'Conditioning';
    if (core && !(push || pull || legsQuad || posterior)) return 'Core';
    if ((push || pull) && (legsQuad || posterior)) return 'Full Body';
    return 'Workout';
  };

  const isNewDaySchema = (obj: any): boolean => !!(obj && typeof obj === 'object' && 'dayType' in obj && Array.isArray((obj as any).exercises));

  const formatDayTitle = (dayKey: string, session: WorkoutSession | 'Rest' | any): string => {
    const match = dayKey.match(/day(\d+)/i);
    const dayNum = match ? parseInt(match[1], 10) : undefined;
    const prefix = dayNum ? `Day ${dayNum}` : dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
    // Legacy string rest
    if (session === 'Rest') return `${prefix}: Rest`;
    // New day schema
    if (isNewDaySchema(session)) {
      if (session.dayType === 'rest') return `${prefix}: Rest`;
      const label = inferDayTitleFromExercises(session.exercises || []);
      return `${prefix}: ${label}`;
    }
    // Legacy structured WorkoutSession
    const s = session as WorkoutSession;
    const parts: string[] = [];
    if (s.sessionName) parts.push(s.sessionName);
    else {
      if ((s as any).primaryGoalFocus) parts.push((s as any).primaryGoalFocus);
      if (s.sessionType) parts.push(s.sessionType);
    }
    if (!parts.length && s.targetMuscles?.length) parts.push(s.targetMuscles[0]);
    return `${prefix}: ${parts.join(' - ') || 'Workout'}`;
  };

  const firstName = (profile as any)?.name?.split(' ')[0] || 'Your';
  const mesoName = selectedMesocycle?.name || `Mesocycle ${mesocycleNumber}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/workouts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Program Overview
            </Button>
          </Link>
          <div />
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cornflower-blue to-blue-600 bg-clip-text text-transparent">
              {firstName}'s {mesoName} Plan
            </h1>
            <p className="text-muted-foreground">
              {plan?.name ? `${plan.name}` : 'AI-generated training plan'}
            </p>
          </div>

          {/* Program info */}
          {plan && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Badge variant="secondary">Duration: {displayDurationWeeks} weeks</Badge>
              <Badge variant="secondary">Training: {displayDaysPerWeek} days/week</Badge>
            </div>
          )}

          {/* Week navigator */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekIndex(i => Math.max(0, i - 1))}
              disabled={currentWeekIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-lg font-medium">
              Current Week: Week {currentWeek?.weekNumber || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekIndex(i => Math.min(weeks.length - 1, i + 1))}
              disabled={weeks.length === 0 || currentWeekIndex === weeks.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Daily workout cards for current week */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {currentWeek ? (
              Object.entries(currentWeek.workouts || {}).map(([day, session]) => (
                <Card key={day} className="border-cornflower-blue/30">
                  <CardHeader>
                    <CardTitle className="text-cornflower-blue text-lg">{formatDayTitle(day, session as any)}</CardTitle>
                    <CardDescription>
                      {(() => {
                        if (session === 'Rest') return 'Rest';
                        if (isNewDaySchema(session)) {
                          const names = (session.exercises || []).slice(0, 3).map((e: any) => e.exercise || e.name).filter(Boolean);
                          return names.length ? names.join(', ') : 'Workout Session';
                        }
                        return (session as WorkoutSession).sessionName || 'Workout Session';
                      })()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {session !== 'Rest' ? (
                      <>
                        <div className="text-sm text-muted-foreground">
                          {(() => {
                            if (isNewDaySchema(session)) {
                              const names = (session.exercises || []).slice(0, 5).map((e: any) => e.exercise || e.name).filter(Boolean);
                              return names.length ? names.join(', ') : '—';
                            }
                            return (session as WorkoutSession).targetMuscles?.join(', ') || '—';
                          })()}
                        </div>
                        <Button size="sm" className="bg-cornflower-blue">View/Log Workout</Button>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">Recovery and mobility focus</div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground">No week data available yet.</div>
            )}
          </div>

          {/* Logged Workouts section (basic scaffold) */}
          <div className="max-w-6xl mx-auto space-y-3 pt-4">
            <div className="text-xl font-semibold">Logged Workouts</div>
            {weeks.length === 0 ? (
              <div className="text-sm text-muted-foreground">No workouts completed or logged</div>
            ) : (
              weeks.map(w => (
                <Card key={w.weekNumber} className="border-dashed">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Week {w.weekNumber} Logged Workouts</CardTitle>
                  </CardHeader>
                  <CardContent className="py-3 text-sm text-muted-foreground">
                    No workouts completed or logged
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Bottom right back button */}
          <div className="flex justify-end">
            <Link href="/workouts">
              <Button variant="secondary">
                Back to Program Overview
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
