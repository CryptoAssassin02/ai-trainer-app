'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Target, Play, Loader2 } from 'lucide-react';
import { ProgramStructure } from '@/lib/api/types';

interface ChunkedGenerationDisplayProps {
  structure: ProgramStructure;
  currentMesocycle: number;
  totalMesocycles: number;
  mesocyclesCompleted: number;
  isGenerating: boolean;
  onGenerateMesocycle?: (mesocycleNumber: number) => void;
  generatingMesocycle?: number | null;
}

export function ChunkedGenerationDisplay({
  structure,
  currentMesocycle,
  totalMesocycles,
  mesocyclesCompleted,
  isGenerating,
  onGenerateMesocycle,
  generatingMesocycle
}: ChunkedGenerationDisplayProps) {
  const progressPercentage = Math.round((mesocyclesCompleted / totalMesocycles) * 100);

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Target className="h-5 w-5" />
          {structure.programName}
        </CardTitle>
        <CardDescription className="text-blue-700">
          Progressive workout program generation in progress
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Program Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-blue-800">Duration</div>
            <div className="text-sm text-blue-700">{structure.totalDuration} weeks</div>
          </div>
          <div>
            <div className="text-sm font-medium text-blue-800">Training Frequency</div>
            <div className="text-sm text-blue-700">{structure.trainingFrequency.daysPerWeek} days/week</div>
          </div>
        </div>

        {/* Mesocycle Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-blue-800">Mesocycle Progress</span>
            <Badge variant={isGenerating ? "secondary" : "default"}>
              {mesocyclesCompleted} of {totalMesocycles} complete
            </Badge>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Mesocycle List */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-blue-800">Mesocycles</div>
          <div className="space-y-2">
            {structure.mesocycles.map((mesocycle, index) => {
              const mesocycleNumber = mesocycle.mesocycleNumber;
              const isCompleted = index < mesocyclesCompleted;
              const isCurrentlyGenerating = generatingMesocycle === mesocycleNumber;
              const canGenerate = !isCompleted && !isCurrentlyGenerating && onGenerateMesocycle;
              
              return (
                <div
                  key={mesocycleNumber}
                  className={`flex items-center justify-between p-3 rounded-md border ${
                    isCompleted
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : isCurrentlyGenerating
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
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
                  
                  {/* Generation Button */}
                  <div className="ml-3">
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
                        onClick={() => onGenerateMesocycle(mesocycleNumber)}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Generate
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Status */}
        {isGenerating && currentMesocycle > 0 && (
          <div className="bg-blue-100 border border-blue-200 rounded-md p-3">
            <div className="text-sm font-medium text-blue-800">
              Currently generating: Mesocycle {currentMesocycle}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Creating detailed exercises and progressions...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
