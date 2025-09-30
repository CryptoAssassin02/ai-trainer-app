'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Loader2 } from 'lucide-react';

interface AdjustmentFormProps {
  planId: string;
  mesocycleIndex?: number; // zero-based
  defaultAgentType?: 'structure' | 'weekly_structure' | 'daily_workout';
  onAdjusted?: (result: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function AdjustmentForm({ planId, mesocycleIndex = 0, defaultAgentType = 'weekly_structure', onAdjusted }: AdjustmentFormProps) {
  const [agentType, setAgentType] = useState<'structure' | 'weekly_structure' | 'daily_workout'>(defaultAgentType);
  const [editRequest, setEditRequest] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { workoutService } = await import('@/lib/api/services/workout-service');
      const payload = {
        ...(startDate ? { startDate: startDate.toISOString().slice(0, 10) } : {}),
        instructions: editRequest,
      };
      const result = await workoutService.adjustPlan(planId, agentType, payload, mesocycleIndex);
      onAdjusted && onAdjusted(result);
    } catch (err: any) {
      setError(err?.message || 'Adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-sm">Adjust Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Agent Type</Label>
              <Select value={agentType} onValueChange={(v) => setAgentType(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select agent type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="structure">Structure</SelectItem>
                  <SelectItem value="weekly_structure">Weekly Structure</SelectItem>
                  <SelectItem value="daily_workout">Daily Workouts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs">Edit Request</Label>
              <Textarea
                value={editRequest}
                onChange={(e) => setEditRequest(e.target.value)}
                placeholder="E.g., shift leg day to Wednesday, focus upper body twice/week, reduce volume on deadlifts"
                className="min-h-[80px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Start Date (optional)</Label>
            <div className="rounded border p-2">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
            </div>
          </div>

          {error && <div className="text-red-600 text-xs">{error}</div>}

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting} className="min-w-[140px]">
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Applying...</> : 'Apply Adjustments'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default AdjustmentForm;
