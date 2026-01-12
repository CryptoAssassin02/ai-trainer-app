'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ExerciseCardProps {
  exercise?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function ExerciseCard({ exercise, ...props }: ExerciseCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🏋️ Exercise Details
          <Badge variant="outline">Coming Soon</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Exercise card functionality will be available after Phase 3 implementation.
        </p>
        {exercise && (
          <p className="text-xs text-muted-foreground mt-2">
            Exercise data: {JSON.stringify(exercise, null, 2)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default ExerciseCard;
