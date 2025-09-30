'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Cpu, List } from 'lucide-react';

interface OnePartCompleteScenarioProps {
  onGenerateWeekly?: () => void;
  onViewProgram?: () => void;
  isGenerating?: boolean;
}

export function OnePartCompleteScenario({ onGenerateWeekly, onViewProgram, isGenerating }: OnePartCompleteScenarioProps) {
  return (
    <div className="space-y-4">
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Brain className="h-5 w-5" /> Program Structure Generated
          </CardTitle>
          <CardDescription className="text-muted-foreground">Next step: Generate Weekly Structure.</CardDescription>
        </CardHeader>
      </Card>
      <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Cpu className="h-5 w-5 text-[#3E9EFF]" /> Weekly Structure
          </CardTitle>
          <CardDescription className="text-muted-foreground">Create training vs rest days and focuses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Button onClick={onGenerateWeekly} disabled={isGenerating} className="bg-[#3E9EFF] hover:bg-[#3E9EFF]/90">Generate Weekly Structure</Button>
            <Button onClick={onViewProgram} variant="outline"><List className="h-4 w-4 mr-2"/>View Program Overview</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


