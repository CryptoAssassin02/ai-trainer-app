import { useState, useEffect } from 'react';
import { ProgramStructure } from '@/lib/api/types';

// AI operation status type (matching workout-context.tsx)
type AIOperationStatus = 
  | { status: 'idle' }
  | { status: 'validating'; message: 'Checking profile completeness...' }
  | { status: 'generating'; progress: number; message: 'Workout Generation Agent creating plan...' }
  | { status: 'adjusting'; progress: number; message: 'Plan Adjustment Agent modifying plan...' }
  | { status: 'complete'; result: any }
  | { status: 'error'; error: Error; canRetry: boolean }
  
  // NEW: Chunked generation states
  | { status: 'generating_structure'; progress: number; message: 'Generating program structure...' }
  | { status: 'structure_complete'; structure: ProgramStructure; message: 'Program structure generated successfully' }
  | { status: 'generating_mesocycle'; mesocycleNumber: number; totalMesocycles: number; progress: number; message: string }
  | { status: 'mesocycle_complete'; mesocycleNumber: number; totalMesocycles: number; message: string }
  | { status: 'chunked_complete'; result: any; message: 'Complete workout program generated!' };

export const useAIOperationProgress = (operationStatus: AIOperationStatus) => {
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  
  useEffect(() => {
    if (operationStatus.status === 'generating') {
      // Generation phase: ~30s total
      const remaining = Math.max(0, 30000 - (operationStatus.progress / 100 * 30000));
      setEstimatedTimeRemaining(remaining);
    } else if (operationStatus.status === 'adjusting') {
      // Adjustment: ~60s total
      const remaining = Math.max(0, 60000 - (operationStatus.progress / 100 * 60000));
      setEstimatedTimeRemaining(remaining);
    } else if (operationStatus.status === 'generating_structure') {
      // Structure generation: ~15s total
      const remaining = Math.max(0, 15000 - (operationStatus.progress / 100 * 15000));
      setEstimatedTimeRemaining(remaining);
    } else if (operationStatus.status === 'generating_mesocycle') {
      // Mesocycle generation: ~20s per mesocycle
      const remaining = Math.max(0, 20000 - (operationStatus.progress / 100 * 20000));
      setEstimatedTimeRemaining(remaining);
    } else {
      setEstimatedTimeRemaining(null);
    }
  }, [operationStatus]);
  
  return { estimatedTimeRemaining };
};
