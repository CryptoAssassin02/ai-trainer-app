'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Play, Target } from 'lucide-react';
import type { ProgramStructure } from '@/lib/api/types';

interface StructureStageCardProps {
  structure: ProgramStructure;
  currentMesocycle: number;
  totalMesocycles: number;
  mesocyclesCompleted: number;
  isGenerating: boolean;
  onGenerateMesocycle?: (mesocycleNumber: number) => void;
  generatingMesocycle?: number | null;
  onGenerateWeeklyStructure?: (mesocycleNumber: number) => void;
  onOpenAdjust?: () => void;
  progressPercentage: number;
  statusError: string | null;
  disableActions?: boolean;
  stageError?: string | null;
  onRetryWeekly?: () => void;
}

export default function StructureStageCard({
  structure,
  currentMesocycle,
  totalMesocycles,
  mesocyclesCompleted,
  isGenerating,
  onGenerateMesocycle,
  generatingMesocycle,
  onGenerateWeeklyStructure,
  onOpenAdjust,
  progressPercentage,
  statusError,
  disableActions,
  stageError,
  onRetryWeekly,
}: StructureStageCardProps) {
  const startDayLabel = useMemo(() => {
    const now = new Date();
    const isAfter4pm = now.getHours() >= 16;
    const startDate = new Date(now);
    if (isAfter4pm) startDate.setDate(now.getDate() + 1);
    return startDate.toLocaleDateString(undefined, { weekday: 'long' });
  }, []);

  return (
    <Card className="border-cornflower-blue bg-gradient-to-br from-cornflower-blue/5 to-blue-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cornflower-blue">
          <Target className="h-5 w-5" />
          {structure.programName}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Progressive workout program generation in progress
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {stageError && (
          <div role="alert" aria-live="polite" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between">
            <span>{stageError}</span>
            {onRetryWeekly && (
              <Button size="sm" variant="outline" onClick={onRetryWeekly} className="ml-3">
                Retry
              </Button>
            )}
          </div>
        )}
        {statusError && (
          <div role="alert" aria-live="polite" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {statusError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-cornflower-blue">Duration</div>
            <div className="text-sm text-muted-foreground">{structure.totalDuration} weeks</div>
          </div>
          <div>
            <div className="text-sm font-medium text-cornflower-blue">Training Frequency</div>
            <div className="text-sm text-muted-foreground">{structure.trainingFrequency.daysPerWeek} days/week</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-cornflower-blue">Mesocycle Progress</span>
            <Badge variant={isGenerating ? 'secondary' : 'default'}>
              {mesocyclesCompleted} of {totalMesocycles} complete
            </Badge>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-cornflower-blue">Mesocycles</div>
          <div className="space-y-2">
            {structure.mesocycles.map((mesocycle, index) => {
              const mesocycleNumber = mesocycle.mesocycleNumber;
              const isCompleted = index < mesocyclesCompleted;
              const isCurrentlyGenerating = generatingMesocycle === mesocycleNumber;
              const canGenerate = !isCompleted && !isCurrentlyGenerating && !!onGenerateMesocycle;

              return (
                <div
                  key={mesocycleNumber}
                  className={`flex items-center justify-between p-3 rounded-md border ${
                    isCompleted
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : isCurrentlyGenerating
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-muted border-border text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : isCurrentlyGenerating ? (
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-400" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        Mesocycle {mesocycleNumber}: {mesocycle.theme}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {mesocycle.duration} weeks • {mesocycle.focus}
                      </div>
                    </div>
                  </div>

                  <div className="ml-3 flex items-center gap-2">
                    {onGenerateWeeklyStructure && (index === mesocyclesCompleted) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onGenerateWeeklyStructure(mesocycleNumber)}
                        className="text-cornflower-blue border-cornflower-blue/30 hover:bg-cornflower-blue/10"
                        disabled={!!disableActions}
                        aria-label={`Generate Weekly Mesocycle ${mesocycleNumber}`}
                      >
                        Generate Weekly
                      </Button>
                    )}
                    {isCompleted ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Complete
                      </Badge>
                    ) : isCurrentlyGenerating ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Generating...
                      </Badge>
                    ) : canGenerate ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onGenerateMesocycle && onGenerateMesocycle(mesocycleNumber)}
                        className="text-cornflower-blue border-cornflower-blue/30 hover:bg-cornflower-blue/10"
                        disabled={!!disableActions}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Generate
                      </Button>
                    ) : (
                      <Badge variant="outline" className="opacity-60">
                        Pending
                      </Badge>
                    )}
                    {onOpenAdjust && (
                      <Button size="sm" variant="ghost" onClick={onOpenAdjust}>Adjust</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {isGenerating && currentMesocycle > 0 && (
          <div className="bg-blue-100 border border-blue-200 rounded-md p-3">
            <div className="text-sm font-medium text-cornflower-blue">
              Currently generating: Mesocycle {currentMesocycle}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Creating detailed exercises and progressions...
            </div>
          </div>
        )}

        <div className="sr-only" aria-live="polite">Week 1 starts on {startDayLabel}</div>
      </CardContent>
    </Card>
  );
}


