'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Loader2, CheckCircle } from 'lucide-react';

interface TwoPartsCompleteScenarioProps {
  onGenerateDaily?: () => void;
  onViewProgram?: () => void;
  isGenerating?: boolean;
}

export function TwoPartsCompleteScenario({ onGenerateDaily, onViewProgram, isGenerating }: TwoPartsCompleteScenarioProps) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-[#3E9EFF]" />
          Program Structure & Weekly Structure Complete
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Generate Daily Workouts to finish your first mesocycle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Button
            onClick={onGenerateDaily}
            disabled={isGenerating}
            className="bg-[#3E9EFF] hover:bg-[#3E9EFF]/90"
          >
            {isGenerating ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Generating Daily Workouts...</>) : 'Generate Daily Workouts'}
          </Button>
          <Button onClick={onViewProgram} variant="outline"><Target className="h-4 w-4 mr-2"/>View Program</Button>
        </div>
      </CardContent>
    </Card>
  );
}


