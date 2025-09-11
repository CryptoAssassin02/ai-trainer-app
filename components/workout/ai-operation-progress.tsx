'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Brain, 
  Search, 
  Cpu, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Clock
} from 'lucide-react';
import { useAIOperationProgress } from '@/hooks/use-ai-operation-progress';
import { ProgramStructure } from '@/lib/api/types';

// AI operation status type (matching workout-context.tsx)
type AIOperationStatus = 
  | { status: 'idle' }
  | { status: 'validating'; message: 'Checking profile completeness...' }
  | { status: 'generating'; progress: number; message: 'Workout Generation Agent creating plan...' }
  | { status: 'adjusting'; progress: number; message: 'Plan Adjustment Agent modifying plan...' }
  | { status: 'complete'; result: any } // eslint-disable-line @typescript-eslint/no-explicit-any
  | { status: 'error'; error: Error; canRetry: boolean }
  
  // NEW: Chunked generation states
  | { status: 'generating_structure'; progress: number; message: 'Generating program structure...' }
  | { status: 'structure_complete'; structure: ProgramStructure; message: 'Program structure generated successfully' }
  | { status: 'generating_mesocycle'; mesocycleNumber: number; totalMesocycles: number; progress: number; message: string }
  | { status: 'mesocycle_complete'; mesocycleNumber: number; totalMesocycles: number; message: string }
  | { status: 'chunked_complete'; result: any; message: 'Complete workout program generated!' }; // eslint-disable-line @typescript-eslint/no-explicit-any

interface AIOperationProgressProps {
  status: AIOperationStatus;
}

export function AIOperationProgress({ status }: AIOperationProgressProps) {
  const { estimatedTimeRemaining } = useAIOperationProgress(status);

  // Don't render anything for idle status
  if (status.status === 'idle') {
    return null;
  }

  const getStatusIcon = () => {
    switch (status.status) {
      case 'validating':
        return <Settings className="h-4 w-4 animate-spin" />;
      case 'generating':
        return <Brain className="h-4 w-4 animate-pulse" />;
      case 'adjusting':
        return <Cpu className="h-4 w-4 animate-pulse" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      
      // NEW: Chunked generation icons
      case 'generating_structure':
        return <Brain className="h-4 w-4 animate-pulse text-blue-600" />;
      case 'structure_complete':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'generating_mesocycle':
        return <Cpu className="h-4 w-4 animate-pulse text-blue-600" />;
      case 'mesocycle_complete':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'chunked_complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'complete':
        return 'text-green-600';
      case 'error':
        return 'text-destructive';
      default:
        return 'text-blue-600';
    }
  };

  const getProgressValue = () => {
    if ('progress' in status) {
      return status.progress;
    }
    switch (status.status) {
      case 'validating':
        return 10;
      case 'complete':
        return 100;
      case 'error':
        return 0;
      default:
        return 0;
    }
  };

  const formatTimeRemaining = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusDescription = () => {
    switch (status.status) {
      case 'validating':
        return 'Verifying your profile information and fitness goals...';
      case 'generating':
        return 'Our Workout Generation Agent is creating your personalized plan...';
      case 'adjusting':
        return 'Our Plan Adjustment Agent is fine-tuning your workout...';
      case 'complete':
        return 'Your personalized workout plan has been successfully generated!';
      case 'error':
        return `Generation failed: ${status.error.message}`;
      
      // NEW: Chunked generation descriptions
      case 'generating_structure':
        return 'Creating your personalized program structure with mesocycle planning...';
      case 'structure_complete':
        return `Program structure ready! ${status.structure.totalMesocycles} mesocycles planned.`;
      case 'generating_mesocycle':
        return `Generating detailed exercises for mesocycle ${status.mesocycleNumber} of ${status.totalMesocycles}...`;
      case 'mesocycle_complete':
        return `Mesocycle ${status.mesocycleNumber} completed. ${status.totalMesocycles - status.mesocycleNumber} remaining.`;
      case 'chunked_complete':
        return 'Your complete workout program has been successfully generated!';
      default:
        return 'Processing your request...';
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className={`text-lg ${getStatusColor()}`}>
              {status.status === 'complete' ? 'Generation Complete!' : 
               status.status === 'error' ? 'Generation Failed' : 
               'AI Agents Working...'}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Brain className="mr-1 h-3 w-3" />
              AI Powered
            </Badge>
            {estimatedTimeRemaining && status.status !== 'complete' && status.status !== 'error' && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="mr-1 h-3 w-3" />
                ~{formatTimeRemaining(estimatedTimeRemaining)}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          {getStatusDescription()}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {status.status !== 'error' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{getProgressValue()}%</span>
            </div>
            <Progress 
              value={getProgressValue()} 
              className="h-2"
            />
          </div>
        )}

        {/* Current Operation Message */}
        {'message' in status && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-muted-foreground">{status.message}</span>
          </div>
        )}

        {/* Agent Process Steps */}
        {(status.status === 'generating' || status.status === 'adjusting' || status.status === 'complete') && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground mb-2">AI Agent Pipeline:</div>
            <div className="grid gap-2">

              {/* Generation Agent */}
              <div className={`flex items-center gap-2 text-sm p-2 rounded-md ${
                status.status === 'generating' ? 'bg-blue-50 border border-blue-200' :
                ['adjusting', 'complete'].includes(status.status) ? 'bg-green-50 border border-green-200' :
                'bg-muted/50'
              }`}>
                <Brain className={`h-3 w-3 ${
                  status.status === 'generating' ? 'animate-pulse text-blue-600' :
                  ['adjusting', 'complete'].includes(status.status) ? 'text-green-600' :
                  'text-muted-foreground'
                }`} />
                <span className="flex-1">Workout Generation Agent</span>
                {['adjusting', 'complete'].includes(status.status) && (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                )}
              </div>

              {/* Adjustment Agent (only for adjustments) */}
              {status.status === 'adjusting' && (
                <div className="flex items-center gap-2 text-sm p-2 rounded-md bg-blue-50 border border-blue-200">
                  <Cpu className="h-3 w-3 animate-pulse text-blue-600" />
                  <span className="flex-1">Plan Adjustment Agent</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {status.status === 'error' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Generation Failed</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {status.error.message}
            </p>
            {status.canRetry && (
              <p className="text-xs text-muted-foreground mt-2">
                You can try generating again or adjust your preferences.
              </p>
            )}
          </div>
        )}

        {/* Success State */}
        {status.status === 'complete' && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Plan Generated Successfully!</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Your personalized workout plan is ready. You can now view, edit, or start your workout.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
