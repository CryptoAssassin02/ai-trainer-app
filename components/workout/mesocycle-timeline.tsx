import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, Activity } from 'lucide-react';
import { MesocycleStructure } from '@/lib/api/types';

interface MesocycleTimelineProps {
  mesocycles: MesocycleStructure[];
  currentWeek?: number;
}

export function MesocycleTimeline({ mesocycles, currentWeek = 1 }: MesocycleTimelineProps) {
  let cumulativeWeeks = 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-cornflower-blue" />
        <h3 className="text-lg font-semibold">Program Timeline</h3>
      </div>

      <div className="space-y-4">
        {mesocycles.map((mesocycle, index) => {
          const startWeek = cumulativeWeeks + 1;
          const endWeek = cumulativeWeeks + mesocycle.durationWeeks;
          const isActive = currentWeek >= startWeek && currentWeek <= endWeek;
          const isCompleted = currentWeek > endWeek;
          
          cumulativeWeeks += mesocycle.durationWeeks;

          return (
            <Card key={mesocycle.mesocycleNumber} className={isActive ? 'border-cornflower-blue' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Mesocycle {mesocycle.mesocycleNumber}
                      </span>
                      <Badge variant={isActive ? "default" : isCompleted ? "secondary" : "outline"}>
                        {isActive ? 'Active' : isCompleted ? 'Completed' : 'Upcoming'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="font-medium text-base">
                      {mesocycle.name}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">Weeks {startWeek}-{endWeek}</div>
                    <div className="text-xs text-muted-foreground">{mesocycle.durationWeeks} weeks</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Phase</span>
                    </div>
                    <Badge variant="outline">{mesocycle.phase}</Badge>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Focus</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{mesocycle.focus}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium mb-1">Progression</div>
                    <div className="text-xs text-muted-foreground">
                      Volume: {mesocycle.progressionStrategy.volumeProgression}<br/>
                      Intensity: {mesocycle.progressionStrategy.intensityProgression}
                    </div>
                  </div>
                </div>

                {/* Training Parameters */}
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Training Parameters</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="font-medium">Frequency:</span> {mesocycle.trainingParameters.frequency}x/week
                    </div>
                    <div>
                      <span className="font-medium">Intensity:</span> {mesocycle.trainingParameters.intensity}
                    </div>
                    <div>
                      <span className="font-medium">Volume:</span> {mesocycle.trainingParameters.volume}
                    </div>
                    <div>
                      <span className="font-medium">Rest:</span> {mesocycle.trainingParameters.restPeriods}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
