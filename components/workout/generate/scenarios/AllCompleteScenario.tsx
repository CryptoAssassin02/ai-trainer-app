'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface AllCompleteScenarioProps {
  onViewProgram?: () => void;
}

export function AllCompleteScenario({ onViewProgram }: AllCompleteScenarioProps) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          All Set!
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Your Program Structure, Weekly Structure, and Daily Workouts are complete.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button asChild className="w-full bg-[#3E9EFF] hover:bg-[#3E9EFF]/90">
          <Link href="/workouts" onClick={onViewProgram}>
            <Target className="h-4 w-4 mr-2" /> View Workout Program
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}


