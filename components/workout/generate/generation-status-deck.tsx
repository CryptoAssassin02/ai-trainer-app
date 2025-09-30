'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type StatusKind = 'waiting' | 'in_progress' | 'complete' | 'failed';

type AIOpStatus =
  | { status: 'idle' }
  | { status: 'validating'; message: 'Checking profile completeness...' }
  | { status: 'generating'; progress: number; message: 'Workout Generation Agent creating plan...' }
  | { status: 'complete'; result: any }
  | { status: 'error'; error: Error; canRetry: boolean; retryData?: any }
  | { status: 'generating_structure'; progress: number; message: 'Generating program structure...' }
  | { status: 'structure_complete'; structure: any; message: 'Program structure generated successfully' }
  | { status: 'generating_weekly'; progress: number; message: 'Generating weekly structure...' }
  | { status: 'weekly_complete'; message: 'Weekly structure generated successfully' }
  | { status: 'generating_daily'; mesocycleNumber: number; totalMesocycles: number; progress: number; message: string }
  | { status: 'daily_complete'; mesocycleNumber: number; totalMesocycles: number; remainingMesocycles?: number; progress?: number; message: string }
  | { status: 'phase_complete'; result: any; message: 'Complete workout program generated!' };

interface GenerationStatusDeckProps {
  status: AIOpStatus;
}

export function GenerationStatusDeck({ status }: GenerationStatusDeckProps) {
  const { program, weekly, daily } = useMemo(() => {
    let program: StatusKind = 'waiting';
    let weekly: StatusKind = 'waiting';
    let daily: StatusKind = 'waiting';

    switch (status.status) {
      case 'generating_structure':
        program = 'in_progress';
        weekly = 'waiting';
        daily = 'waiting';
        break;
      case 'structure_complete':
      case 'generating_weekly':
        program = 'complete';
        weekly = status.status === 'generating_weekly' ? 'in_progress' : 'waiting';
        daily = 'waiting';
        break;
      case 'weekly_complete':
      case 'generating_daily':
        program = 'complete';
        weekly = 'complete';
        daily = status.status === 'generating_daily' ? 'in_progress' : 'waiting';
        break;
      case 'daily_complete':
      case 'phase_complete':
        program = 'complete';
        weekly = 'complete';
        daily = 'complete';
        break;
      case 'error':
        // do not know which stage failed; set the first non-complete to failed heuristically
        // default heuristic: if we never reached structure_complete -> program failed
        program = 'failed';
        weekly = 'waiting';
        daily = 'waiting';
        break;
      default:
        program = 'waiting';
        weekly = 'waiting';
        daily = 'waiting';
    }

    return { program, weekly, daily };
  }, [status]);

  const badge = (k: StatusKind) => {
    switch (k) {
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'waiting':
        return <Badge variant="outline" className="opacity-80">Waiting on Program Structure Completion</Badge>;
      case 'complete':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Successfully Generated</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const LongItem = ({ title, desc, state }: { title: string; desc: string; state: StatusKind }) => (
    <Card className="bg-gradient-to-br from-cornflower-blue/5 to-blue-500/5">
      <CardHeader className="py-3">
        <CardTitle className="text-base text-[#3E9EFF]">{title}</CardTitle>
        <CardDescription className="text-muted-foreground">{desc}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {badge(state)}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-3">
      <LongItem title="Program Structure Generation" desc="High-level program overview" state={program} />
      <LongItem title="Weekly Structure" desc="Training vs rest days and focus" state={weekly} />
      <LongItem title="Daily Workouts" desc="Per-day sessions for first phase" state={daily} />
    </div>
  );
}


