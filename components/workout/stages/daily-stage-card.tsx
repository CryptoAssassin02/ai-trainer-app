'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DailyStageCardProps {
  dailyWorkouts?: any;
}

export default function DailyStageCard({ dailyWorkouts }: DailyStageCardProps) {
  return (
    <Card className="border-cornflower-blue bg-gradient-to-br from-cornflower-blue/5 to-blue-500/5">
      <CardHeader>
        <CardTitle className="text-cornflower-blue">Daily Workouts</CardTitle>
        <CardDescription className="text-muted-foreground">Review daily workout details</CardDescription>
      </CardHeader>
      <CardContent>
        {dailyWorkouts ? (
          <div className="text-sm text-muted-foreground">Daily workouts generated for the current mesocycle.</div>
        ) : (
          <div className="text-sm text-muted-foreground">Daily workout details will appear here once generated.</div>
        )}
      </CardContent>
    </Card>
  );
}


