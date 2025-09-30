/**
 * Single-Step Workout Generation Form Component
 * Simplified workout generation following detailed-profile-to-workout-gen-workflow.mmd
 * Displays user's profile selections for review and generates workout plan
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Check, 
  Loader2, 
  AlertCircle, 
  Info,
  User,
  Target,
  Settings,
  Brain,
  Edit,
  CheckCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

import { useProfile } from '@/hooks/use-profile-queries';
import { useAuth } from '@/components/auth/supabase-auth-provider';
import { useQueryClient } from '@tanstack/react-query';
import { 
  workoutGenerationSchema,
  validateProfileCompleteness,
  type WorkoutGenerationFormData
} from '@/lib/validation/workout-schemas';
import { ProgramStructure } from '@/lib/api/types';
import { useWorkoutGeneration } from '@/hooks/use-workout-generation';

// AI Operation Progress Component
import { AIOperationProgress } from './ai-operation-progress';
import { GenerationStatusDeck } from './generate/generation-status-deck';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Eye, EyeOff, NotebookText, ListTree, FileText } from 'lucide-react';
import { ChunkedGenerationDisplay } from './chunked-generation-display';
import AdjustmentForm from './adjustment-form';
import { useWorkout } from '@/hooks/use-workout';
import { resolveScenarioFromPlans } from './generate/resolve-scenario';
import { AllCompleteScenario, TwoPartsCompleteScenario, OnePartCompleteScenario } from './index';

// ==========================================
// TYPES & INTERFACES
// ==========================================

interface SingleStepWorkoutFormProps {
  onSuccess?: (workoutPlan: any) => void | Promise<void>; // eslint-disable-line @typescript-eslint/no-explicit-any
  onCancel?: () => void;
  redirectOnSuccess?: string;
  redirectOnCancel?: string;
  enableChunkedGeneration?: boolean; // NEW: Enable chunked generation workflow
}

// Gym category display names mapping
const GYM_CATEGORY_NAMES: Record<string, string> = {
  'full_service_commercial': 'Full-Service Commercial Gym',
  'budget_friendly': 'Budget-Friendly Gym', 
  'hardcore_strength': 'Hardcore Strength/Powerlifting Gym',
  'luxury_athletic_club': 'Luxury Athletic Club',
  'franchise_24_7': '24/7 Franchise Gym',
  'community_recreation': 'Community Recreation Center',
  'crossfit_functional': 'CrossFit/Functional Fitness Gym',
  'limited_residential': 'Limited Residential Gym',
  'personal_home_setup': 'Personal Home Setup',
  'minimal_home': 'Minimal/No-Equipment Home Workout'
};

// Fitness goals display mapping
const FITNESS_GOALS_DISPLAY: Record<string, { label: string; icon: string }> = {
  'weight_loss': { label: 'Weight Loss', icon: '📉' },
  'muscle_gain': { label: 'Muscle Gain', icon: '💪' },
  'strength': { label: 'Strength', icon: '🏋️' },
  'endurance': { label: 'Endurance', icon: '🏃' },
  'flexibility': { label: 'Flexibility', icon: '🧘' },
  'general_fitness': { label: 'General Fitness', icon: '⚡' },
  'sports_performance': { label: 'Sports Performance', icon: '🏆' },
  'body_recomposition': { label: 'Body Recomposition', icon: '🔄' }
};

// Exercise types display mapping
const EXERCISE_TYPES_DISPLAY: Record<string, { label: string; icon: string }> = {
  'cardio': { label: 'Cardio', icon: '🏃' },
  'strength': { label: 'Strength Training', icon: '💪' },
  'hiit': { label: 'HIIT', icon: '⚡' },
  'yoga': { label: 'Yoga', icon: '🧘' },
  'pilates': { label: 'Pilates', icon: '🤸' },
  'functional': { label: 'Functional Training', icon: '🏋️' },
  'sports': { label: 'Sports-Specific', icon: '🏆' },
  'flexibility': { label: 'Flexibility/Stretching', icon: '🤲' }
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export function SingleStepWorkoutForm({
  onSuccess,
  onCancel,
  redirectOnSuccess, // eslint-disable-line @typescript-eslint/no-unused-vars
  redirectOnCancel, // eslint-disable-line @typescript-eslint/no-unused-vars
  enableChunkedGeneration = true, // NEW: Default to chunked for better UX
}: SingleStepWorkoutFormProps) {
  // State management
  const queryClient = useQueryClient();
  const { plans } = useWorkout();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSuccess, setGenerationSuccess] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [backendValidationErrors, setBackendValidationErrors] = useState<Record<string, string>>({});
  
  // AI Operation Progress State
  const [aiOperationStatus, setAiOperationStatus] = useState<
    | { status: 'idle' }
    | { status: 'validating'; message: 'Checking profile completeness...' }
    | { status: 'generating'; progress: number; message: 'Workout Generation Agent creating plan...' }
    | { status: 'complete'; result: any } // eslint-disable-line @typescript-eslint/no-explicit-any
    | { status: 'error'; error: Error; canRetry: boolean; retryData?: any }
    
    // NEW: Chunked generation states
    | { status: 'generating_structure'; progress: number; message: 'Generating program structure...' }
    | { status: 'structure_complete'; structure: ProgramStructure; message: 'Program structure generated successfully' }
    | { status: 'generating_weekly'; progress: number; message: 'Generating weekly structure...' }
    | { status: 'weekly_complete'; message: 'Weekly structure generated successfully' }
    | { status: 'generating_daily'; mesocycleNumber: number; totalMesocycles: number; progress: number; message: string }
    | { status: 'daily_complete'; mesocycleNumber: number; totalMesocycles: number; remainingMesocycles?: number; progress?: number; message: string }
    | { status: 'phase_complete'; result: any; message: 'Complete workout program generated!' } // eslint-disable-line @typescript-eslint/no-explicit-any
  >({ status: 'idle' });
  
  // AbortController for cancellation support
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // NEW: Chunked generation state (following multi-step form pattern)
  const [chunkingState, setChunkingState] = useState<{
    enabled: boolean;
    planId: string | null;
    structure: ProgramStructure | null;
    currentMesocycle: number;
    totalMesocycles: number;
    mesocyclesCompleted: number;
    showProgressiveGeneration: boolean;
    generatingMesocycle: number | null;
  }>({
    enabled: enableChunkedGeneration,
    planId: null,
    structure: null,
    currentMesocycle: 0,
    totalMesocycles: 0,
    mesocyclesCompleted: 0,
    showProgressiveGeneration: false,
    generatingMesocycle: null
  });

  // NEW: Agent reasoning visibility and logs
  const [showAgentReasoning, setShowAgentReasoning] = useState(false);
  const [agentReasoningLogs, setAgentReasoningLogs] = useState<Array<{
    timestamp: number;
    phase: 'validate' | 'structure' | 'mesocycle' | 'complete' | 'error' | 'monolithic';
    message: string;
    payload?: any;
  }>>([]);

  // SSE for progressive generation (optional future use)
  const { isStreaming, lastEvent, connectProgressive, disconnect } = useWorkoutGeneration();
  useEffect(() => {
    if (!lastEvent) return;
    // Map SSE events to reasoning logs
    if (lastEvent.type === 'structure_generated') {
      setAgentReasoningLogs((prev) => [
        ...prev,
        { timestamp: Date.now(), phase: 'structure', message: 'SSE: Structure generated', payload: lastEvent.data }
      ]);
    } else if (lastEvent.type === 'mesocycle_progress') {
      setAgentReasoningLogs((prev) => [
        ...prev,
        { timestamp: Date.now(), phase: 'mesocycle', message: `SSE: Mesocycle ${lastEvent.data?.mesocycleNumber} ${lastEvent.data?.status}`, payload: lastEvent.data }
      ]);
    } else if (lastEvent.type === 'completed') {
      setAgentReasoningLogs((prev) => [
        ...prev,
        { timestamp: Date.now(), phase: 'complete', message: 'SSE: Generation completed', payload: lastEvent.data }
      ]);
    } else if (lastEvent.type === 'error') {
      setAgentReasoningLogs((prev) => [
        ...prev,
        { timestamp: Date.now(), phase: 'error', message: `SSE: ${lastEvent.data?.message || 'error'}`, payload: lastEvent.data }
      ]);
    }
  }, [lastEvent]);

  // Get user profile for pre-population and validation
  const { 
    profile, 
    isLoading: profileLoading,
    error: profileError 
  } = useProfile({
    enableOptimistic: true,
  });

  // Profile completeness validation
  const profileValidation = React.useMemo(() => {
    if (!profile.data) return null;
    return validateProfileCompleteness(profile.data);
  }, [profile.data]);

  // Form setup with profile data pre-population
  const form = useForm<WorkoutGenerationFormData>({
    resolver: zodResolver(workoutGenerationSchema),
    defaultValues: {
      fitnessLevel: (profile.data as any)?.experienceLevel || 'beginner', // eslint-disable-line @typescript-eslint/no-explicit-any
      goals: (profile.data as any)?.goals || [], // eslint-disable-line @typescript-eslint/no-explicit-any
      restrictions: [], // Will be populated from medicalConditions
      exerciseTypes: (profile.data as any)?.exerciseTypes || [], // eslint-disable-line @typescript-eslint/no-explicit-any
      workoutFrequency: (profile.data as any)?.workoutFrequency || '', // eslint-disable-line @typescript-eslint/no-explicit-any
      additionalNotes: '',
    },
    mode: 'onChange',
  });

  // Update form when profile data loads
  const { reset } = form;
  useEffect(() => {
    if (!profileLoading && profile.data) {
      const profileData = profile.data as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      
      // Transform medical conditions to restrictions
      const restrictions = Array.isArray(profileData.medicalConditions) 
        ? profileData.medicalConditions
        : profileData.medicalConditions 
          ? profileData.medicalConditions.split(',').map((c: string) => c.trim()).filter(Boolean)
          : [];

      reset({
        fitnessLevel: profileData.experienceLevel || 'beginner',
        goals: profileData.goals || [],
        restrictions,
        exerciseTypes: profileData.exerciseTypes || [],
        workoutFrequency: profileData.workoutFrequency || '',
        additionalNotes: '',
      });
    }
  }, [(profile.data as any)?.id, (profile.data as any)?.updatedAt, profileLoading, reset]); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Cancel workout generation
  const cancelGeneration = () => {
    if (abortController) {
      console.log('🚫 Cancelling workout generation...');
      abortController.abort();
      setAbortController(null);
      setIsGenerating(false);
      setAiOperationStatus({ status: 'idle' });
      setGenerationError(null);
      setBackendValidationErrors({});
    }
  };

  // Form submission (workout generation)
  const onSubmit = async (data: WorkoutGenerationFormData) => {
    console.log('🔥 WORKOUT GENERATION TRIGGERED!', data);
    setGenerationError(null);
    setBackendValidationErrors({});
    setIsGenerating(true);
    setAiOperationStatus({ status: 'validating', message: 'Checking profile completeness...' });
    setAgentReasoningLogs((prev) => [
      ...prev,
      { timestamp: Date.now(), phase: 'validate', message: 'Validating profile completeness and inputs', payload: { data } }
    ]);
    
    // Create AbortController for cancellation
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      // Connect to real backend AI agents with actual progress tracking
      console.log('📝 Generating workout plan with data:', data);
      
      // Import WorkoutService dynamically to avoid SSR issues
      const { workoutService } = await import('@/lib/api/services/workout-service');
      
      // NEW BEHAVIOR: Immediately transition UI to progressive mode and start SSE-driven flow
      await handleChunkedGeneration(data, workoutService, controller);
      
      // Invalidate workout plans cache to show new plan immediately
      queryClient.invalidateQueries({ 
        queryKey: ['workoutPlans'], 
        exact: false 
      });
      
    } catch (error) {
      console.error('❌ Workout generation failed:', error);
      setAgentReasoningLogs((prev) => [
        ...prev,
        { timestamp: Date.now(), phase: 'error', message: (error as Error)?.message || 'Generation failed', payload: error }
      ]);
      
      // Enhanced error handling for different error types
      let errorMessage = 'Workout generation failed';
      let canRetry = true;
      const validationErrors: Record<string, string> = {};
      
      // Check if this is an API error with response data
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as any;
        const responseData = apiError.response?.data;
        
        if (responseData) {
          // Handle backend validation errors (400 status with field-specific errors)
          if (apiError.response?.status === 400 && responseData.errors && Array.isArray(responseData.errors)) {
            console.log('📝 Processing backend validation errors:', responseData.errors);
            
            // Map backend validation errors to form fields
            responseData.errors.forEach((err: any) => {
              if (err.field && err.message) {
                validationErrors[err.field] = err.message;
              }
            });
            
            errorMessage = responseData.message || 'Please fix the validation errors below';
            canRetry = true;
          } 
          // Handle AgentError responses from backend
          else if (responseData.errorCode && responseData.errorCode.startsWith('AGENT_')) {
            console.log('🤖 Processing AgentError from backend:', responseData);
            
            // Map AgentError codes to user-friendly messages
            switch (responseData.errorCode) {
              case 'AGENT_VALIDATION_ERROR':
                errorMessage = 'Invalid workout parameters. Please check your selections.';
                canRetry = true;
                break;
              case 'AGENT_EXTERNAL_SERVICE_ERROR':
                errorMessage = 'AI service temporarily unavailable. Please try again in a moment.';
                canRetry = true;
                break;
              case 'AGENT_PROCESSING_ERROR':
                errorMessage = 'Workout generation failed. Please try again with different parameters.';
                canRetry = true;
                break;
              case 'AGENT_RESOURCE_ERROR':
                errorMessage = 'AI resources temporarily unavailable. Please try again later.';
                canRetry = false;
                break;
              case 'AGENT_CONFIGURATION_ERROR':
                errorMessage = 'Service configuration issue. Please contact support.';
                canRetry = false;
                break;
              default:
                errorMessage = responseData.message || 'AI agent error occurred';
                canRetry = true;
            }
          } else {
            // Handle other API errors
            errorMessage = responseData.message || errorMessage;
          }
        }
      }
      
      if (error instanceof Error) {
        // Handle cancellation
        if (error.message.includes('cancelled') || error.name === 'AbortError') {
          console.log('🚫 Workout generation cancelled by user');
          setAiOperationStatus({ status: 'idle' });
          return; // Exit early for cancellation
        }
        
        // Handle specific API error types
        if (error.message.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded (10 generations per hour). Please try again in a few minutes.';
          canRetry = false;
        } else if (error.message.includes('authentication')) {
          errorMessage = 'Authentication required. Please sign in again.';
          canRetry = false;
        } else if (error.message.includes('profile')) {
          errorMessage = 'Profile validation failed. Please complete your profile.';
          canRetry = false;
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          errorMessage = 'Network error. Please check your connection and try again.';
          canRetry = true;
        } else if (!validationErrors || Object.keys(validationErrors).length === 0) {
          errorMessage = error.message;
        }
      }
      
      // Set validation errors for form field display
      setBackendValidationErrors(validationErrors);
      
      setAiOperationStatus({ 
        status: 'error', 
        error: new Error(errorMessage), 
        canRetry 
      });
      setGenerationError(errorMessage);
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  // NEW: Chunked generation handler
  const handleChunkedGeneration = async (data: WorkoutGenerationFormData, workoutService: any, controller: AbortController) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      // Step 1: Generate structure (SSE-driven path)
      setAiOperationStatus({ status: 'generating_structure', progress: 0, message: 'Generating program structure...' });
      setAgentReasoningLogs((prev) => [
        ...prev,
        { timestamp: Date.now(), phase: 'structure', message: 'Invoking StructureGenerationAgent with prompt and constraints', payload: { goals: data.goals, fitnessLevel: data.fitnessLevel, exerciseTypes: data.exerciseTypes } }
      ]);
      
      const structureResult = await workoutService.generateStructure({
        goals: data.goals,
        fitnessLevel: data.fitnessLevel,
        exerciseTypes: data.exerciseTypes,
        restrictions: data.restrictions,
        workoutFrequency: data.workoutFrequency,
        additionalNotes: data.additionalNotes,
        primaryGoal: data.primaryGoal
      }, { signal: controller.signal });
      
      // Update chunking state
      setChunkingState(prev => ({
        ...prev,
        planId: structureResult.planId,
        structure: structureResult.structure,
        totalMesocycles: structureResult.structure.totalMesocycles,
        showProgressiveGeneration: true
      }));
      
      setAiOperationStatus({ status: 'structure_complete', structure: structureResult.structure, message: 'Program structure generated successfully' });
      setAgentReasoningLogs((prev) => [
        ...prev,
        { timestamp: Date.now(), phase: 'structure', message: 'Structure generated', payload: structureResult }
      ]);
      
      // NEW: Immediately start SSE progressive generation on backend if route available
      try {
        const disconnectHandle = workoutService.progressiveGenerate(
          structureResult.planId,
          {},
          (evt: any) => {
            if (evt.type === 'structure_generated') {
              // Snap to first milestone
              setAiOperationStatus({ status: 'generating_weekly', progress: 33, message: 'Generating weekly structure...' } as any);
            } else if (evt.type === 'weekly_complete') {
              // Snap to second milestone
              setAiOperationStatus({ status: 'weekly_complete', message: 'Weekly structure generated successfully' } as any);
            } else if (evt.type === 'mesocycle_progress') {
              // Keep progress at 66% during daily generation for phase 1
              setAiOperationStatus({ status: 'generating_daily', mesocycleNumber: evt.data?.mesocycleNumber || 1, totalMesocycles: chunkingState.totalMesocycles || structureResult.structure.totalMesocycles, progress: 66, message: 'Generating daily workouts...' } as any);
            } else if (evt.type === 'completed') {
              // Snap to completion
              setAiOperationStatus({ status: 'phase_complete', result: evt.data, message: 'Complete workout program generated!' } as any);
              setGenerationSuccess(true);
            } else if (evt.type === 'error') {
              setAiOperationStatus({ status: 'error', error: new Error(evt.data?.message || 'Generation failed'), canRetry: true });
            }
          }
        );
      } catch {
        // Fallback to polling-only UX if SSE not available
      }
      
    } catch (error) {
      // Handle structure generation errors with existing error handling patterns
      setGenerationError((error as Error).message);
      setAiOperationStatus({ 
        status: 'error', 
        error: error as Error, 
        canRetry: true
      });
      setAgentReasoningLogs((prev) => [
        ...prev,
        { timestamp: Date.now(), phase: 'error', message: 'Structure generation failed', payload: error }
      ]);
    }
  };

  // EXISTING: Monolithic generation handler (unchanged)
  const handleMonolithicGeneration = async (data: WorkoutGenerationFormData, workoutService: any, controller: AbortController) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    setAiOperationStatus({ 
      status: 'generating', 
      progress: 50, 
      message: 'Workout Generation Agent creating plan...' 
    });
    setAgentReasoningLogs((prev) => [
      ...prev,
      { timestamp: Date.now(), phase: 'monolithic', message: 'Invoking WorkoutGenerationAgent with prompt and constraints', payload: { data } }
    ]);
    
    const workoutPlan = await workoutService.generatePlan(data, { signal: controller.signal });
    
    setAiOperationStatus({ status: 'complete', result: workoutPlan });
    setAgentReasoningLogs((prev) => [
      ...prev,
      { timestamp: Date.now(), phase: 'complete', message: 'Plan generated successfully', payload: workoutPlan }
    ]);
    
    setGenerationSuccess(true);
    
    if (onSuccess) {
      await onSuccess(workoutPlan);
    }
  };

  // NEW: Individual mesocycle generation handler for chunked architecture
  const handleIndividualMesocycleGeneration = async (mesocycleNumber: number) => {
    if (!chunkingState.planId || !chunkingState.structure) {
      console.error('Cannot generate mesocycle: missing plan ID or structure');
      return;
    }

    // Get the original form data to pass to mesocycle generation
    const formData = form.getValues();
    
    setChunkingState(prev => ({
      ...prev,
      generatingMesocycle: mesocycleNumber
    }));

    setIsGenerating(true);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      setAiOperationStatus({
        status: 'generating_daily',
        progress: Math.round(((mesocycleNumber - 1) / chunkingState.totalMesocycles) * 100),
        message: `Generating mesocycle ${mesocycleNumber} of ${chunkingState.totalMesocycles}...`,
        mesocycleNumber: mesocycleNumber,
        totalMesocycles: chunkingState.totalMesocycles
      });
      setAgentReasoningLogs((prev) => [
        ...prev,
        { timestamp: Date.now(), phase: 'mesocycle', message: `Invoking MesocycleGenerationAgent for mesocycle ${mesocycleNumber}`, payload: { mesocycleNumber } }
      ]);

      // Import WorkoutService dynamically
      const { workoutService } = await import('@/lib/api/services/workout-service');
      
      // Generate the specific mesocycle (context comes from stored structure and user profile)
      const mesocycleResult = await workoutService.generateMesocycle(
        chunkingState.planId,
        mesocycleNumber,
        { signal: controller.signal }
      );

      // Update state to reflect completion
      setChunkingState(prev => ({
        ...prev,
        mesocyclesCompleted: Math.max(prev.mesocyclesCompleted, mesocycleNumber),
        currentMesocycle: mesocycleNumber + 1,
        generatingMesocycle: null
      }));

      setAiOperationStatus({
        status: 'daily_complete',
        progress: Math.round((mesocycleNumber / chunkingState.totalMesocycles) * 100),
        message: `Mesocycle ${mesocycleNumber} completed successfully!`,
        mesocycleNumber: mesocycleNumber,
        totalMesocycles: chunkingState.totalMesocycles,
        remainingMesocycles: chunkingState.totalMesocycles - mesocycleNumber
      });
      setAgentReasoningLogs((prev) => [
        ...prev,
        { timestamp: Date.now(), phase: 'mesocycle', message: `Mesocycle ${mesocycleNumber} generated`, payload: mesocycleResult }
      ]);

      console.log(`✅ Mesocycle ${mesocycleNumber} generated successfully:`, mesocycleResult);

    } catch (error) {
      console.error(`❌ Mesocycle ${mesocycleNumber} generation failed:`, error);
      
      setChunkingState(prev => ({
        ...prev,
        generatingMesocycle: null
      }));

      setGenerationError((error as Error).message);
      setAiOperationStatus({
        status: 'error',
        error: error as Error,
        canRetry: true,
        retryData: {
          type: 'mesocycle',
          planId: chunkingState.planId,
          mesocycleNumber: mesocycleNumber,
          completedMesocycles: chunkingState.mesocyclesCompleted
        }
      });
      setAgentReasoningLogs((prev) => [
        ...prev,
        { timestamp: Date.now(), phase: 'error', message: `Mesocycle ${mesocycleNumber} generation failed`, payload: error }
      ]);
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  // NEW: Weekly structure generation handler
  const handleWeeklyStructureGeneration = async (mesocycleNumber: number) => {
    if (!chunkingState.planId) return;
    setIsGenerating(true);
    try {
      const { workoutService } = await import('@/lib/api/services/workout-service');
      await workoutService.generateWeeklyStructure(chunkingState.planId, mesocycleNumber);
      // Optionally fetch status to refresh flags
      await queryClient.invalidateQueries({ queryKey: ['workoutPlans'], exact: false });
    } catch (error) {
      setGenerationError((error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Loading state
  if (profileLoading) {
    return <WorkoutFormSkeleton />;
  }

  // Determine display scenario for /workouts/generate per rules
  const { scenario, planId } = resolveScenarioFromPlans(plans as any);

  // Profile completeness check
  if (!profileValidation?.isComplete) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              Profile Completion Required
            </CardTitle>
            <CardDescription className="text-amber-700">
              Please complete your profile before generating a workout plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profileValidation?.recommendations.map((rec, index) => (
                <p key={index} className="text-sm text-amber-700">• {rec}</p>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <Button 
                onClick={() => window.location.href = '/profile'}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Complete Profile
              </Button>
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userProfile = profile.data as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const formValues = form.getValues();

  // Remove scenario-gated alternate UIs to prevent duplicate/competing cards.
  // Always render a single unified flow below; status is driven by aiOperationStatus and SSE/progress.

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6" data-testid="single-step-workout-form">
      
      {/* Error Display */}
      {(profileError || generationError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {profileError?.message || generationError || 'An error occurred'}
          </AlertDescription>
        </Alert>
      )}

      {/* Backend Validation Errors */}
      {Object.keys(backendValidationErrors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            <div className="space-y-1 mt-2">
              {Object.entries(backendValidationErrors).map(([field, message]) => (
                <div key={field} className="text-sm">
                  <span className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}:</span> {message}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Form Content */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step-by-Step Mode removed */}
          
          {/* Review Your Selections Section */}
          <Card className="review-section bg-card/50 backdrop-blur-sm border border-border/50 hover:border-cornflower-blue/30 transition-all duration-300 hover:shadow-lg hover:shadow-cornflower-blue/10">
            <CardHeader>
              <CardTitle className="text-xlg flex items-center gap-2">
                📋 Review Your Selections
              </CardTitle>
              <CardDescription>
                All selections from profile creation are displayed below
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              
              {/* 1. Basic Information Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-lg font-medium">
                  <User className="h-4 w-4 text-[#3E9EFF]" />
                  1. Basic Information
                </div>
                <div className="pl-6 space-y-2 text-md">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Full Name:</span>
                    <span className="text-md font-medium">{userProfile?.name || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Age:</span>
                    <span className="text-md font-medium">{userProfile?.age || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gender:</span>
                    <span className="text-md font-medium">
                      {userProfile?.gender ? 
                        userProfile.gender.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) 
                        : 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unit System:</span>
                    <span className="text-md font-medium">
                      {userProfile?.unitPreference === 'metric' ? 'Metric (kg, cm)' : 'Imperial (lbs, ft/in)'}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 2. Body Measurements Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-lg font-medium">
                  <User className="h-4 w-4 text-[#3E9EFF]" />
                  2. Body Measurements
                </div>
                <div className="pl-6 space-y-2 text-md">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Height:</span>
                    <span className="text-md font-medium">
                      {userProfile?.height ? 
                        (typeof userProfile.height === 'object' ? 
                          `${userProfile.height.feet}'${userProfile.height.inches}"` :
                          `${userProfile.height} cm`)
                        : 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weight:</span>
                    <span className="text-md font-medium">
                      {userProfile?.weight ? 
                        `${userProfile.weight} ${userProfile?.unitPreference === 'metric' ? 'kg' : 'lbs'}`
                        : 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 3. Fitness Information Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-lg font-medium">
                  <Target className="h-4 w-4 text-[#3E9EFF]" />
                  3. Fitness Information
                </div>
                <div className="pl-6 space-y-3 text-md">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fitness Experience Level:</span>
                    <span className="text-md font-medium">
                      {userProfile?.experienceLevel ? 
                        userProfile.experienceLevel.replace(/\b\w/g, (l: string) => l.toUpperCase())
                        : 'Not specified'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">Fitness Goals:</span>
                    <div className="mt-1">
                      {userProfile?.goals?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {userProfile.goals.map((goal: string) => (
                            <Badge 
                              key={goal} 
                              variant={goal === userProfile.primaryGoal ? "default" : "secondary"} 
                              className={`text-xs ${goal === userProfile.primaryGoal ? "bg-[#3E9EFF] border-[#3E9EFF]" : ""}`}
                            >
                              {FITNESS_GOALS_DISPLAY[goal]?.icon} {FITNESS_GOALS_DISPLAY[goal]?.label || goal.replace('_', ' ')}
                              {goal === userProfile.primaryGoal && " (Primary)"}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not specified</span>
                      )}
                    </div>
                  </div>

                  {userProfile?.primaryGoal && userProfile?.goals?.length > 1 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Primary Goal Selection:</span>
                      <Badge variant="default" className="bg-[#3E9EFF] text-xs">
                        🎯 {FITNESS_GOALS_DISPLAY[userProfile.primaryGoal]?.label || userProfile.primaryGoal.replace('_', ' ')}
                      </Badge>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-muted-foreground">Medical Considerations:</span>
                    <div className="mt-1">
                      {formValues.restrictions?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {formValues.restrictions.map((restriction: string) => (
                            <Badge key={restriction} variant="destructive" className="text-xs">
                              {restriction}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="mt-1 whitespace-pre-wrap text-md font-medium">None specified</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 4. Preferences & Equipment Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-lg font-medium">
                  <Settings className="h-4 w-4 text-[#3E9EFF]" />
                  4. Preferences & Equipment
                </div>
                <div className="pl-6 space-y-3 text-md">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Workout Frequency:</span>
                    <span className="text-md font-medium">
                      {userProfile?.workoutFrequency ? 
                        `${userProfile.workoutFrequency} times per week`
                        : 'Not specified'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">Exercise Types:</span>
                    <div className="mt-1">
                      {userProfile?.exerciseTypes?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {userProfile.exerciseTypes.map((type: string) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {EXERCISE_TYPES_DISPLAY[type]?.icon} {EXERCISE_TYPES_DISPLAY[type]?.label || type.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not specified</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gym Type & Equipment Access:</span>
                    <span className="text-md font-medium">
                      {userProfile?.gymCategory ? 
                        GYM_CATEGORY_NAMES[userProfile.gymCategory] || userProfile.gymCategory.replace('_', ' ')
                        : 'Minimal/No-Equipment Home Workout'}
                    </span>
                  </div>
                  {/* Additional Notes (moved under Preferences & Equipment) */}
                  {userProfile?.additionalNotes && (String(userProfile.additionalNotes).trim().length > 0) && (
                    <div>
                      <span className="text-muted-foreground">Additional Notes:</span>
                      <div className="mt-1 whitespace-pre-wrap text-md">{userProfile.additionalNotes}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Profile Data Button */}
              <div className="pt-4 border-t">
                <Button 
                  type="button"
                  variant="outline"
                  asChild
                  className="w-full"
                >
                  <Link href="/profile">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile Data
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          

          {/* Workout Program Structure Generation Section */}
          <Card className="bg-gradient-to-r from-cornflower-blue/5 to-blue-500/5 border-cornflower-blue/20 intro-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-[#3E9EFF]" />
                Workout Program Generation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Our AI Agents will use your profile data and preferences above to craft a highly personalized and curated workout program:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#3E9EFF]" />
                    <span><strong>Program Structure Agent</strong> will first generate a personalized, high-level program overview</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#3E9EFF]" />
                    <span><strong>Weekly Structure Agent</strong> will then determine training vs. rest days and daily focuses for the 1st phase of your program</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#3E9EFF]" />
                    <span><strong>Daily Workouts Agent</strong> will then generate the actual daily workouts per week for the entire first phase of the program</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#3E9EFF]" />
                    <span><strong>Upon successful generation</strong>, you can review your entire program and request any adjustments as needed</span>
                  </div>
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Entire program generation may take up to 2-3 minutes. You can cancel at any time if needed.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card className="bg-card/50 backdrop-blur-sm border border-border/50 action-buttons-card">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:justify-between">
                {/* Left: Edit Profile Data Button */}
                <Button 
                  type="button"
                  variant="outline"
                  asChild
                  disabled={isGenerating}
                  className="order-2 sm:order-1"
                >
                  <Link href="/profile">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile Data
                  </Link>
                </Button>

                {/* Center: Generate Workout Plan Button */}
                <Button
                  type="submit"
                  disabled={isGenerating}
                  className="order-1 sm:order-2 bg-[#3E9EFF] hover:bg-[#3E9EFF]/90 flex-1 sm:flex-initial sm:min-w-[200px]"
                  data-testid="generate-button"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Workout Plan...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Generate Workout Plan
                    </>
                  )}
                </Button>

                {/* Right: Cancel Button */}
                {onCancel && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={isGenerating}
                    className="order-3"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* AI Operation Progress and Status Cards (visible after submission) */}
      {aiOperationStatus.status !== 'idle' && (
        <div className="space-y-4">
          {/* Progress bar must appear first */}
          <AIOperationProgress status={aiOperationStatus} />
          {/* Stacked cards below */}
          <GenerationStatusDeck status={aiOperationStatus as any} />

          {/* Hide intro message box and action buttons after generation begins */}
          <style jsx global>{`
            [data-testid="single-step-workout-form"] .review-section { display: none; }
            [data-testid="single-step-workout-form"] .intro-card { display: none; }
            [data-testid="single-step-workout-form"] .action-buttons-card { display: none; }
          `}</style>
          
          {/* Agent Reasoning Toggle and Display */}
          <Card className="border-border/50">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <NotebookText className="h-4 w-4" />
                Agent Reasoning & Output
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAgentReasoning((s) => !s)}
                className="text-muted-foreground"
                data-testid="toggle-agent-reasoning"
              >
                {showAgentReasoning ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" /> Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" /> Show
                  </>
                )}
              </Button>
            </div>
            <Collapsible open={showAgentReasoning}>
              <CollapsibleContent>
                <div className="px-6 pb-6">
                  {/* Live step-by-step reasoning log */}
                  <div className="space-y-3">
                    {agentReasoningLogs.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No reasoning logs yet.</div>
                    ) : (
                      agentReasoningLogs
                        .sort((a, b) => a.timestamp - b.timestamp)
                        .map((log, idx) => (
                          <div
                            key={`${log.timestamp}-${idx}`}
                            className="p-3 rounded-md border bg-card/50"
                            data-testid={`reasoning-log-${idx}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <ListTree className="h-3 w-3" />
                                <span className="capitalize">{log.phase}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="mt-1 text-sm">{log.message}</div>
                            {log.payload && (
                              <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                                <span className="inline-flex items-center gap-1 font-medium">
                                  <FileText className="h-3 w-3" /> Output
                                </span>
                                <div className="mt-1 p-2 rounded bg-muted/40 border">
                                  {typeof log.payload === 'string' ? log.payload : JSON.stringify(log.payload, null, 2)}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Cancel button during generation */}
          {isGenerating && abortController && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-amber-700">
                    Generating your workout plan... This may take up to 30 seconds.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelGeneration}
                    className="text-amber-700 border-amber-300 hover:bg-amber-100"
                  >
                    Cancel Generation
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Unified deck-only view: hide legacy step-by-step display to prevent duplicate cards */}

      {/* Success Message with Real AI Insights */}
      {generationSuccess && aiOperationStatus.status === 'complete' && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success!</AlertTitle>
          <AlertDescription className="text-green-700" data-testid="success-message">
            <div className="space-y-3">
              <p>Your personalized workout plan has been generated successfully! Your AI-powered fitness journey begins now.</p>
              
              {/* Display actual AI reasoning from backend */}
              {aiOperationStatus.result && (
                <div className="mt-4 space-y-2">
                  {aiOperationStatus.result.reasoning && (
                    <div>
                      <h4 className="font-medium text-green-800 mb-1">AI Reasoning:</h4>
                      <p className="text-sm">{aiOperationStatus.result.reasoning}</p>
                    </div>
                  )}
                  
                  {/* View Workout Plan Button */}
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <Button 
                      asChild 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Link href="/workouts">
                        <Target className="mr-2 h-4 w-4" />
                        View Program
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ==========================================
// SKELETON COMPONENT
// ==========================================

function WorkoutFormSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Form content skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SingleStepWorkoutForm;
