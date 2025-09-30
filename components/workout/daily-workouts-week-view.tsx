'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { WeekStructure, WorkoutSession } from '@/lib/api/types';

interface DailyWorkoutsWeekViewProps {
  week?: WeekStructure;
}

function inferDayTitleFromExercises(exercises: Array<{ exercise?: string; name?: string }>): string {
  const names = exercises.map(e => (e.exercise || e.name || '').toLowerCase());
  const has = (kw: string | RegExp) => names.some(n => (typeof kw === 'string' ? n.includes(kw) : kw.test(n)));
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
}

function isNewDaySchema(obj: any): boolean {
  return !!(obj && typeof obj === 'object' && 'dayType' in obj && Array.isArray((obj as any).exercises));
}

function formatDayTitle(dayKey: string, session: WorkoutSession | 'Rest' | any): string {
  const match = dayKey.match(/day(\d+)/i);
  const dayNum = match ? parseInt(match[1], 10) : undefined;
  const prefix = dayNum ? `Day ${dayNum}` : dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
  if (session === 'Rest') return `${prefix}: Rest`;
  if (isNewDaySchema(session)) {
    if ((session as any).dayType === 'rest') return `${prefix}: Rest`;
    const label = inferDayTitleFromExercises(((session as any).exercises || []) as any);
    return `${prefix}: ${label}`;
  }
  const s = session as WorkoutSession;
  const parts: string[] = [];
  if ((s as any).sessionName) parts.push((s as any).sessionName);
  else {
    if ((s as any).primaryGoalFocus) parts.push((s as any).primaryGoalFocus);
    if ((s as any).sessionType) parts.push((s as any).sessionType);
  }
  if (!parts.length && (s as any).targetMuscles?.length) parts.push((s as any).targetMuscles[0]);
  return `${prefix}: ${parts.join(' - ') || 'Workout'}`;
}

export function DailyWorkoutsWeekView({ week }: DailyWorkoutsWeekViewProps) {
  const entries = useMemo(() => Object.entries(week?.workouts || {}), [week]);

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
      {week ? (
        entries.map(([day, session]) => (
          <Card key={day} className="border-cornflower-blue/30">
            <CardHeader>
              <CardTitle className="text-cornflower-blue text-lg">{formatDayTitle(day, session as any)}</CardTitle>
              <CardDescription>
                {(() => {
                  if (session === 'Rest') return 'Rest';
                  if (isNewDaySchema(session)) {
                    const names = ((session as any).exercises || [])
                      .slice(0, 3)
                      .map((e: any) => e.exercise || e.name)
                      .filter(Boolean);
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
                        const names = ((session as any).exercises || [])
                          .slice(0, 5)
                          .map((e: any) => e.exercise || e.name)
                          .filter(Boolean);
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
  );
}


