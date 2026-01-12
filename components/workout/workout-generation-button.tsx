'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface WorkoutGenerationButtonProps {
  canGenerate: boolean;
  isGenerating: boolean;
}

export function WorkoutGenerationButton({ canGenerate, isGenerating }: WorkoutGenerationButtonProps) {
  if (!canGenerate) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button disabled variant="outline" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Generate Plan
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Complete your profile to generate workout plans</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isGenerating) {
    return (
      <Button disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Generating...
      </Button>
    );
  }

  return (
    <Button asChild className="gap-2">
      <Link href="/workouts/generate">
        <Brain className="h-4 w-4" />
        Generate AI Plan
        <Badge variant="secondary" className="ml-1 text-xs">
          AI
        </Badge>
      </Link>
    </Button>
  );
}
