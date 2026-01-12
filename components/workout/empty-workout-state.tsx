'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Target, Dumbbell, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface EmptyWorkoutStateProps {
  canGenerate: boolean;
}

export function EmptyWorkoutState({ canGenerate }: EmptyWorkoutStateProps) {
  return (
    <Card className="border-dashed border-2 hover:border-cornflower-blue/30 transition-all duration-300 hover:shadow-lg hover:shadow-cornflower-blue/10">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-cornflower-blue/10 to-blue-500/10 border border-cornflower-blue/20">
          <Dumbbell className="h-8 w-8 text-cornflower-blue" />
        </div>
        
        <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-cornflower-blue to-blue-600 bg-clip-text text-transparent">
          No Workout Plans Yet
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md text-lg leading-relaxed">
          Get started by generating your first trAIner workout plan.
        </p>
        
        {/* Features List */}
        <div className="grid gap-3 mb-6 text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-8 h-8 rounded-full bg-cornflower-blue/10 flex items-center justify-center">
              <Brain className="h-4 w-4 text-cornflower-blue" />
            </div>
            <span className="font-medium">AI-powered personalization</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-8 h-8 rounded-full bg-cornflower-blue/10 flex items-center justify-center">
              <Target className="h-4 w-4 text-cornflower-blue" />
            </div>
            <span className="font-medium">Tailored precision to align plans with your goals</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-8 h-8 rounded-full bg-cornflower-blue/10 flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-cornflower-blue" />
            </div>
            <span className="font-medium">Exercises based specifically on your equipment availability</span>
          </div>
        </div>
        
        {canGenerate ? (
          <Button asChild size="lg" className="gap-2 bg-gradient-to-r from-cornflower-blue to-blue-600 hover:from-cornflower-blue/90 hover:to-blue-600/90 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <Link href="/workouts/generate">
              <Brain className="h-4 w-4" />
              Generate Your First Plan
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div className="space-y-4">
            <Button asChild size="lg" className="gap-2 bg-gradient-to-r from-cornflower-blue to-blue-600 hover:from-cornflower-blue/90 hover:to-blue-600/90 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <Link href="/profile">
                Complete Profile First
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Complete your profile to unlock AI workout generation
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
