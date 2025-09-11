import { useState, useEffect } from 'react';
import { workoutService } from '@/lib/api/services/workout-service';
import type { GenerationStatusResponse } from '@/lib/api/types';

export function useChunkedGenerationProgress(planId: string | null) {
  const [status, setStatus] = useState<GenerationStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!planId || !isPolling) return;

    const pollStatus = async () => {
      try {
        const statusResponse = await workoutService.getGenerationStatus(planId);
        setStatus(statusResponse);
        setError(null);
        
        // Stop polling when complete or failed
        if (statusResponse.state === 'completed' || statusResponse.state === 'failed') {
          setIsPolling(false);
        }
      } catch (err) {
        console.error('Status polling error:', err);
        setError(err as Error);
        setIsPolling(false);
      }
    };

    // Initial poll
    pollStatus();

    // Set up polling interval
    const interval = setInterval(pollStatus, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [planId, isPolling]);

  const startPolling = () => {
    setError(null);
    setIsPolling(true);
  };
  
  const stopPolling = () => setIsPolling(false);

  return { 
    status, 
    isPolling, 
    error,
    startPolling, 
    stopPolling 
  };
}
