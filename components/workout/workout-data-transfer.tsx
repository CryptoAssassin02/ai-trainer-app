'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function WorkoutDataTransfer() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📤 Data Transfer
          <Badge variant="outline">Coming Soon</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Workout data transfer functionality will be available after Phase 3 implementation.
        </p>
      </CardContent>
    </Card>
  );
}

export default WorkoutDataTransfer;
