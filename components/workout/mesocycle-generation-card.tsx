"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Loader2, CheckCircle, PencilLine } from 'lucide-react';
import type { GenerationStatusResponse } from '@/lib/api/types';

interface MesocycleGenerationCardProps {
  planId: string;
  mesocycleNumber: number;
  status?: GenerationStatusResponse | null;
  isCompleted: boolean;
  isGenerating: boolean;
  canGenerateNow: boolean; // next in sequence gating from status
  enforceCompletion?: boolean; // default false for Phase 2.3
  // NEW: Mesocycle details for richer display
  theme?: string;
  focus?: string;
  durationWeeks?: number;
  onGenerate: (mesocycleNumber: number) => void;
  // NEW: Weekly structure display and adjustments
  weeklyStructure?: any[];
}

export function MesocycleGenerationCard({
  planId,
  mesocycleNumber,
  status,
  isCompleted,
  isGenerating,
  canGenerateNow,
  enforceCompletion = false,
  theme,
  focus,
  durationWeeks,
  onGenerate,
  weeklyStructure
}: MesocycleGenerationCardProps) {
  const [showAdjust, setShowAdjust] = useState(false);
  const startDayLabel = useMemo(() => {
    const now = new Date();
    const isAfter4pm = now.getHours() >= 16;
    const startDate = new Date(now);
    if (isAfter4pm) startDate.setDate(now.getDate() + 1);
    return startDate.toLocaleDateString(undefined, { weekday: 'long' });
  }, []);
  const overallPercent = status?.progress?.percentage ?? 0;
  const totalMesocycles = status?.progress?.total ?? 0;
  const completedMesocycles = status?.progress?.completed ?? 0;

  // Simple gating: allow first mesocycle always; for others, optionally enforce completion rule (80%) in future
  const hasPrevious = mesocycleNumber > 1;
  const meetsCompletionRule = !enforceCompletion || !hasPrevious || overallPercent >= 80;
  const buttonDisabled = isCompleted || isGenerating || !canGenerateNow || !meetsCompletionRule;
  const showViewPlans = isCompleted && (mesocycleNumber === 1 || (completedMesocycles >= 1));

  return (
    <Card className="border-cornflower-blue/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-cornflower-blue">
              {`Mesocycle ${mesocycleNumber}`}{theme ? `: ${theme}` : ''}
            </CardTitle>
            <CardDescription>
              {(typeof durationWeeks === 'number' || focus) && (
                <>
                  {typeof durationWeeks === 'number' ? `${durationWeeks} weeks` : ''}
                  {focus ? `${typeof durationWeeks === 'number' ? ' • ' : ''}${focus}` : ''}
                </>
              )}
              <div className="mt-1">
                {totalMesocycles > 0 ? (
                  <>Overall progress: {completedMesocycles}/{totalMesocycles} • {overallPercent}%</>
                ) : (
                  <>Overall progress unavailable</>
                )}
              </div>
            </CardDescription>
          </div>
          {isCompleted ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" /> Complete
            </Badge>
          ) : isGenerating ? (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating...
            </Badge>
          ) : canGenerateNow ? (
            meetsCompletionRule ? (
              <Badge variant="outline" className="text-green-700 border-green-300">Ready</Badge>
            ) : (
              <Badge variant="outline" className="text-amber-700 border-amber-300">Requires 80% completion</Badge>
            )
          ) : (
            <Badge variant="outline" className="text-gray-600">Pending</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Progress value={overallPercent} className="h-2" />
          <div className="mt-1 text-xs text-muted-foreground">
            This indicator reflects overall program generation/usage progress. Per-mesocycle tracking arrives in a later phase.
          </div>
        </div>

        {/* Weekly Structure Calendar/Table */}
        {Array.isArray(weeklyStructure) && weeklyStructure.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-cornflower-blue">Weekly Structure (Week 1 starts on {startDayLabel})</div>
              <Button size="sm" variant="outline" onClick={() => setShowAdjust(true)} aria-label="Edit weekly structure">
                <PencilLine className="h-4 w-4 mr-1" /> Edit
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2" role="table" aria-label="Weekly structure calendar">
              {weeklyStructure[0]?.days?.map((d: any, idx: number) => (
                <div
                  key={idx}
                  role="row"
                  className={`p-2 rounded border text-xs ${d.type === 'rest' ? 'bg-gray-50 border-gray-200' : 'bg-white border-cornflower-blue/30'}`}
                  aria-label={`${d.day}: ${d.type}${d.focus ? `, focus ${d.focus}` : ''}`}
                >
                  <div className="font-medium" role="cell">{d.day}</div>
                  <div className="mt-1" role="cell">
                    <Badge variant={d.type === 'rest' ? 'secondary' : 'default'} className="text-[10px]">
                      {d.type}
                    </Badge>
                  </div>
                  {d.focus && d.type === 'training' && (
                    <div className="mt-1 text-[10px] text-muted-foreground" role="cell">Focus: {d.focus}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Adjustment Drawer/Inline */}
        {showAdjust && (
          <div className="mt-3">
            {/* Lazy import to avoid SSR issues */}
            {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
            {(() => {
              const AdjustmentForm = require('./adjustment-form').AdjustmentForm as any; // eslint-disable-line @typescript-eslint/no-explicit-any
              return (
                <AdjustmentForm
                  planId={planId}
                  defaultAgentType="weekly_structure"
                  mesocycleIndex={mesocycleNumber - 1}
                  onAdjusted={() => setShowAdjust(false)}
                />
              );
            })()}
          </div>
        )}

        <div className="flex justify-end">
          {showViewPlans ? (
            <Link
              href={{ pathname: '/workouts/plans' }}
              onClick={() => {
                try {
                  const ctx = { planId: planId, mesocycleNumber };
                  localStorage.setItem('plansViewContext', JSON.stringify(ctx));
                } catch {}
              }}
              data-testid={`meso-card-view-program-${mesocycleNumber}`}
            >
              <Button size="sm" className="bg-cornflower-blue hover:bg-cornflower-blue/90">
                View Plans
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              disabled={buttonDisabled}
              onClick={() => onGenerate(mesocycleNumber)}
              className="bg-cornflower-blue hover:bg-cornflower-blue/90 disabled:opacity-60"
              data-testid={`meso-card-generate-${mesocycleNumber}`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" /> Generate
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default MesocycleGenerationCard;


