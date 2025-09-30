'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WeeklyStructureCalendarProps {
  weeklyStructure?: Array<{ week: number; days: Array<{ day: string; type: 'training' | 'rest'; focus?: string | null }> }>;
  title?: string;
  description?: string;
}

export function WeeklyStructureCalendar({ weeklyStructure, title = 'Weekly Structure', description = 'Pre-determined daily order for the week' }: WeeklyStructureCalendarProps) {
  return (
    <Card className="border-cornflower-blue bg-gradient-to-br from-cornflower-blue/5 to-blue-500/5">
      <CardHeader>
        <CardTitle className="text-cornflower-blue">{title}</CardTitle>
        <CardDescription className="text-muted-foreground">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {Array.isArray(weeklyStructure) && weeklyStructure.length > 0 ? (
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
        ) : (
          <div className="text-sm text-muted-foreground">No weekly structure available yet.</div>
        )}
      </CardContent>
    </Card>
  );
}


