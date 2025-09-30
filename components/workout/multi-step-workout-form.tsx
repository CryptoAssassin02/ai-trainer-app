/**
 * Multi-Step Workout Generation Form Component
 * Phase 2 - Follows proven multi-step-profile-form.tsx patterns exactly
 * with surgical precision alignment to backend schemas and validation
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Loader2, 
  AlertCircle, 
  Info,
  Target,
  Settings,
  CheckCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
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
import { ChunkedGenerationDisplay } from './chunked-generation-display';

// Step components
import { GoalsPreferencesStep } from './steps/goals-preferences-step';
// Equipment step removed - equipment will be resolved from user profile gym category
import { ReviewGenerateStep } from './steps/review-generate-step';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface WorkoutFormStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<WorkoutStepComponentProps>;
  fields: string[];
  optional?: boolean;
}

interface WorkoutStepComponentProps {
  form: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  userProfile: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  isLoading?: boolean;
}

interface MultiStepWorkoutFormProps {
  onSuccess?: (workoutPlan: any) => void | Promise<void>; // eslint-disable-line @typescript-eslint/no-explicit-any
  onCancel?: () => void;
  redirectOnSuccess?: string;
  redirectOnCancel?: string;
  initialStep?: number;
  showProgress?: boolean;
  showStepNavigation?: boolean;
  enableChunkedGeneration?: boolean; // NEW: Feature flag for chunked mode
}

// ==========================================
// FORM STEPS CONFIGURATION
// ==========================================

const WORKOUT_FORM_STEPS: WorkoutFormStep[] = [
  {
    id: 'goals-preferences',
    title: 'Goals & Preferences',
    description: 'Fitness goals, exercise types, and workout frequency',
    icon: Target,
    component: GoalsPreferencesStep,
    fields: ['goals', 'primaryGoal', 'exerciseTypes', 'workoutFrequency', 'restrictions'],
  },
  // Equipment step removed - equipment will be resolved from user profile gym category
  {
    id: 'review-generate',
    title: 'Review & Generate',
    description: 'Review selections and generate your workout plan',
    icon: CheckCircle,
    component: ReviewGenerateStep,
    fields: ['fitnessLevel'], // Final validation field
  },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export function MultiStepWorkoutForm({
  onSuccess,
  onCancel,
  redirectOnSuccess, // eslint-disable-line @typescript-eslint/no-unused-vars
  redirectOnCancel, // eslint-disable-line @typescript-eslint/no-unused-vars
  initialStep = 0,
  showProgress = true,
  showStepNavigation = true,
  enableChunkedGeneration = false, // NEW: Default to monolithic for backward compatibility
}: MultiStepWorkoutFormProps) {
  // State management
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
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
  
  // ✅ PHASE 2 DAY 4: AbortController for cancellation support
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // NEW: Add chunked generation state (in addition to existing state)
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

  // SSE for progressive generation (optional future use)
  const { isStreaming, lastEvent, connectProgressive, disconnect } = useWorkoutGeneration();

  // Debug state for troubleshooting (reduced logging)
  useEffect(() => {
    if (isGenerating || generationSuccess) {
      console.log('🔍 [WORKOUT FORM] State change:', { currentStep, isGenerating, generationSuccess });
    }
  }, [currentStep, isGenerating, generationSuccess]);

  // Reset success/error states when step changes
  useEffect(() => {
    if (currentStep < WORKOUT_FORM_STEPS.length - 1) {
      setGenerationSuccess(false);
      setGenerationError(null);
      setBackendValidationErrors({});
      setAiOperationStatus({ status: 'idle' });
    }
  }, [currentStep]);

  // ✅ DEBUG: Track AI operation status changes (reduced logging)
  useEffect(() => {
    if (aiOperationStatus.status !== 'idle') {
      console.log('🤖 [AI OPERATION STATUS]:', aiOperationStatus.status);
    }
  }, [aiOperationStatus]);

  // Get user profile for pre-population and validation
  const { 
    profile, 
    isLoading: profileLoading,
    error: profileError 
  } = useProfile({
    enableOptimistic: true,
  });

  // Get auth context
  // const { user } = useAuth(); // Temporarily disabled until needed

  // Profile completeness validation
  const profileValidation = useMemo(() => {
    if (!profile.data) return null;
    return validateProfileCompleteness(profile.data);
  }, [profile.data]);

  // Form setup with profile data pre-population
  const form = useForm<WorkoutGenerationFormData>({
    resolver: zodResolver(workoutGenerationSchema),
    defaultValues: {
      fitnessLevel: (profile.data as any)?.experienceLevel || 'beginner', // eslint-disable-line @typescript-eslint/no-explicit-any
      goals: (profile.data as any)?.goals || [], // eslint-disable-line @typescript-eslint/no-explicit-any
      // Equipment will be resolved from user profile gym category
      restrictions: [], // Will be populated from medicalConditions
      exerciseTypes: [],
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
      
      console.log('🔄 [WORKOUT FORM] Updating form with profile data:', profileData);
      
      // Transform medical conditions to restrictions
      const restrictions = Array.isArray(profileData.medicalConditions) 
        ? profileData.medicalConditions
        : profileData.medicalConditions 
          ? profileData.medicalConditions.split(',').map((c: string) => c.trim()).filter(Boolean)
          : [];

      reset({
        fitnessLevel: profileData.experienceLevel || 'beginner',
        goals: profileData.goals || [],
        // Equipment will be resolved from user profile gym category
        restrictions,
        exerciseTypes: [], // User needs to select these
        workoutFrequency: profileData.workoutFrequency || '',
        additionalNotes: '',
      });
    }
  }, [(profile.data as any)?.id, (profile.data as any)?.updatedAt, profileLoading, reset]); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Step validation function
  const isStepValid = (stepIndex: number): boolean => {
    const step = WORKOUT_FORM_STEPS[stepIndex];
    const errors = form.formState.errors;
    const values = form.getValues();
    
    // Check if any required fields in this step have errors
    const hasErrors = step.fields.some(field => errors[field as keyof typeof errors]);
    if (hasErrors) {
      return false;
    }
    
    // Step-specific validation
    if (stepIndex === 0) {
      // Goals & Preferences: require goals (max 3) and exerciseTypes
      return !!(values.goals?.length > 0 && values.goals?.length <= 3 && values.exerciseTypes?.length > 0);
    }
    
    if (stepIndex === 1) {
      // Review & Generate: final validation
      return true;
    }
    
    if (stepIndex === 2) {
      // Review & Generate: final validation (max 3 goals)
      return !!(values.fitnessLevel && values.goals?.length > 0 && values.goals?.length <= 3 && values.exerciseTypes?.length > 0);
    }
    
    return true;
  };

  // Step completion calculation
  const isStepComplete = (stepIndex: number): boolean => {
    const step = WORKOUT_FORM_STEPS[stepIndex];
    const values = form.getValues();
    
    // Step-specific completion logic
    if (stepIndex === 0) {
      // Goals & Preferences: require goals (max 3) and exerciseTypes (others are optional)
      return !!(values.goals?.length > 0 && values.goals?.length <= 3 && values.exerciseTypes?.length > 0);
    }
    
    if (stepIndex === 1) {
      // Review & Generate: final validation
      return true;
    }
    
    if (stepIndex === 2) {
      // Review & Generate: require fitnessLevel
      return !!(values.fitnessLevel);
    }
    
    return true;
  };

  // Update completed steps when form values change
  useEffect(() => {
    try {
      const subscription = form.watch(() => {
        try {
          const newCompletedSteps = new Set<number>();
          WORKOUT_FORM_STEPS.forEach((_, index) => {
            try {
              if (isStepComplete(index)) {
                newCompletedSteps.add(index);
              }
            } catch (error) {
              console.error(`Error checking step ${index} completion:`, error);
            }
          });
          setCompletedSteps(newCompletedSteps);
        } catch (error) {
          console.error('Error in form watch callback:', error);
        }
      });

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Error setting up form watch:', error);
    }
  }, [form, isStepComplete]);

  // Navigation handlers
  const goToNext = async () => {
    if (currentStep < WORKOUT_FORM_STEPS.length - 1) {
      // Validate current step before advancing
      const currentStepFields = WORKOUT_FORM_STEPS[currentStep].fields;
      const isValid = await form.trigger(currentStepFields as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      
      if (isValid && isStepValid(currentStep)) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const goToPrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  // ✅ PHASE 2 DAY 4: Cancel workout generation
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
    // CRITICAL FIX: Prevent accidental auto-submission
    if (currentStep !== WORKOUT_FORM_STEPS.length - 1) {
      console.warn('🚫 [WORKOUT FORM] Prevented accidental submission on step:', currentStep);
      return;
    }
    
    console.log('🔥 WORKOUT GENERATION TRIGGERED!', data);
    setGenerationError(null);
    setBackendValidationErrors({});
    setIsGenerating(true);
    setAiOperationStatus({ status: 'validating', message: 'Checking profile completeness...' });
    
    // ✅ PHASE 2 DAY 4: Create AbortController for cancellation
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      // ✅ PHASE 2 DAY 4: Connect to real backend AI agents with actual progress tracking
      console.log('📝 Generating workout plan with data:', data);
      
      // Import WorkoutService dynamically to avoid SSR issues
      const { workoutService } = await import('@/lib/api/services/workout-service');
      
      // BRANCH: Chunked vs Monolithic generation
      if (chunkingState.enabled) {
        // NEW: Chunked generation flow
        await handleChunkedGeneration(data, workoutService, controller);
      } else {
        // EXISTING: Monolithic generation flow (completely unchanged)
        await handleMonolithicGeneration(data, workoutService, controller);
      }
      
      // Invalidate workout plans cache to show new plan immediately
      queryClient.invalidateQueries({ 
        queryKey: ['workoutPlans'], 
        exact: false 
      });
      
    } catch (error) {
      console.error('❌ Workout generation failed:', error);
      
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
        // ✅ PHASE 2 DAY 4: Handle cancellation
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
      setAbortController(null); // ✅ PHASE 2 DAY 4: Cleanup AbortController
    }
  };

  // NEW: Chunked generation handler
  const handleChunkedGeneration = async (data: WorkoutGenerationFormData, workoutService: any, controller: AbortController) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      // Step 1: Generate structure
      setAiOperationStatus({ 
        status: 'generating_structure', 
        progress: 20, 
        message: 'Generating program structure...' 
      });
      
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
      
      setAiOperationStatus({ 
        status: 'structure_complete', 
        structure: structureResult.structure,
        message: 'Program structure generated successfully' 
      });
      
      // CHUNKED ARCHITECTURE: Stop here and let user generate mesocycles individually
      // The ChunkedGenerationDisplay component will show buttons for each mesocycle
      console.log('✅ Structure generation complete. Waiting for user to generate mesocycles individually.');
      
      // Structure generation complete - user can now generate mesocycles individually
      setGenerationSuccess(true);
      
    } catch (error) {
      // Handle structure generation errors with existing error handling patterns
      setGenerationError((error as Error).message);
      setAiOperationStatus({ 
        status: 'error', 
        error: error as Error, 
        canRetry: true
      });
    }
  };

  // ADD: Retry handler for specific mesocycle failures
  const handleMesocycleRetry = async (retryData: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!retryData || retryData.type !== 'mesocycle') return;
    
    setGenerationError(null);
    setIsGenerating(true);
    
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      // Resume from failed mesocycle
      const { planId, mesocycleNumber, completedMesocycles } = retryData;
      
      setChunkingState(prev => ({
        ...prev,
        mesocyclesCompleted: completedMesocycles,
        currentMesocycle: mesocycleNumber
      }));
      
      // Retry the specific mesocycle with same retry logic as above
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          setAiOperationStatus({ 
            status: 'generating_daily', 
            progress: Math.round(((mesocycleNumber - 1) / chunkingState.totalMesocycles) * 100), 
            message: `Retrying mesocycle ${mesocycleNumber}...`,
            mesocycleNumber: mesocycleNumber,
            totalMesocycles: chunkingState.totalMesocycles
          });

          const mesocycleResult = await import('@/lib/api/services/workout-service').then(module => 
            module.workoutService.generateMesocycle(
              planId, 
              mesocycleNumber, 
              { signal: controller.signal }
            )
          );

          // Success - update state
          setChunkingState(prev => ({
            ...prev,
            mesocyclesCompleted: mesocycleNumber,
            currentMesocycle: mesocycleNumber + 1
          }));

          setAiOperationStatus({ 
            status: 'daily_complete', 
            progress: Math.round((mesocycleNumber / chunkingState.totalMesocycles) * 100), 
            message: `Mesocycle ${mesocycleNumber} completed successfully!`,
            mesocycleNumber: mesocycleNumber,
            totalMesocycles: chunkingState.totalMesocycles,
            remainingMesocycles: chunkingState.totalMesocycles - mesocycleNumber
          });

          setGenerationSuccess(true);
          return; // Success, exit function

        } catch (error) {
          attempts++;
          console.warn(`Mesocycle ${mesocycleNumber} retry attempt ${attempts} failed:`, error);
          
          if (attempts >= maxAttempts) {
            throw error; // Re-throw to be caught by outer try-catch
          }
          
          // Wait before retry with exponential backoff
          const backoffDelay = Math.pow(2, attempts) * 1000;
          console.log(`Retrying mesocycle ${mesocycleNumber} again in ${backoffDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
      
    } catch (error) {
      setGenerationError((error as Error).message);
      setAiOperationStatus({ 
        status: 'error', 
        error: error as Error, 
        canRetry: true,
        retryData
      });
    } finally {
      setIsGenerating(false);
      setAbortController(null);
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
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  // EXISTING: Monolithic generation handler (unchanged)
  const handleMonolithicGeneration = async (data: WorkoutGenerationFormData, workoutService: any, controller: AbortController) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    setAiOperationStatus({ 
      status: 'generating', 
      progress: 50, 
      message: 'Workout Generation Agent creating plan...' 
    });
    
    const workoutPlan = await workoutService.generatePlan(data, { signal: controller.signal });
    
    setAiOperationStatus({ status: 'complete', result: workoutPlan });
    
    setGenerationSuccess(true);
    
    if (onSuccess) {
      await onSuccess(workoutPlan);
    }
  };

  // Progress calculation
  const overallProgress = Math.round((completedSteps.size / WORKOUT_FORM_STEPS.length) * 100);
  const currentStepProgress = Math.round(((currentStep + 1) / WORKOUT_FORM_STEPS.length) * 100);

  // Loading state
  if (profileLoading) {
    return <WorkoutFormSkeleton />;
  }

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

  const currentStepData = WORKOUT_FORM_STEPS[currentStep];
  const StepComponent = currentStepData.component;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6" data-testid="multi-step-workout-form">
      
      {/* Progress Header */}
      {showProgress && (
        <Card className="bg-card/50 backdrop-blur-sm border border-border/50 hover:border-cornflower-blue/30 transition-all duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  🏋️ Generate trAIner Workout Plan
                </CardTitle>
                <CardDescription>
                  Step {currentStep + 1} of {WORKOUT_FORM_STEPS.length}: {currentStepData.title}
                </CardDescription>
              </div>
              
              <div className="text-right">
                <Badge variant={overallProgress === 100 ? "default" : "secondary"}>
                  {overallProgress}% Complete
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Progress value={currentStepProgress} className="h-2" />
              <div className="text-xs text-muted-foreground">
                Overall Progress: {overallProgress}%
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Step Navigation */}
      {showStepNavigation && (
        <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
          <CardContent className="pt-6">
            {/* Mobile: Horizontal Scrollable Steps */}
            <div className="block sm:hidden">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {WORKOUT_FORM_STEPS.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => goToStep(index)}
                    className={`flex flex-col items-center justify-center min-w-[80px] h-[80px] p-2 rounded-lg transition-all touch-manipulation
                      ${index === currentStep ? 'bg-[#3E9EFF]/10 text-[#3E9EFF] ring-2 ring-[#3E9EFF]/20' : 
                        completedSteps.has(index) ? 'bg-green-50 text-green-700' :
                        'text-muted-foreground bg-muted/50'
                      }`}
                    disabled={isGenerating}
                  >
                    <div className={`p-1.5 rounded-full ${
                      index === currentStep ? 'bg-[#3E9EFF]/20' :
                      completedSteps.has(index) ? 'bg-green-100' : 'bg-muted'
                    }`}>
                      {completedSteps.has(index) ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <step.icon className="h-3 w-3" />
                      )}
                    </div>
                    <div className="text-[10px] font-medium text-center leading-tight mt-1">
                      {step.title.split(' ').map((word, i) => (
                        <div key={i}>{word}</div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Progress indicator for mobile */}
              <div className="mt-3 flex items-center gap-1">
                {WORKOUT_FORM_STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      index <= currentStep ? 'bg-[#3E9EFF]' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Desktop: Original Design */}
            <div className="hidden sm:flex items-center justify-between">
              {WORKOUT_FORM_STEPS.map((step, index) => (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => goToStep(index)}
                    className={`flex flex-col items-center space-y-2 p-3 rounded-lg transition-colors
                      ${index === currentStep ? 'bg-[#3E9EFF]/10 text-[#3E9EFF]' : 
                        completedSteps.has(index) ? 'bg-green-50 text-green-700 hover:bg-green-100' :
                        'text-muted-foreground hover:bg-muted'
                      }`}
                    disabled={isGenerating}
                    data-testid={`step-indicator-${index + 1}`}
                  >
                    <div className={`p-2 rounded-full ${
                      index === currentStep ? 'bg-[#3E9EFF]/20' :
                      completedSteps.has(index) ? 'bg-green-100' : 'bg-muted'
                    }`}>
                      {completedSteps.has(index) ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <step.icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{step.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {step.description}
                      </div>
                    </div>
                  </button>
                  
                  {index < WORKOUT_FORM_STEPS.length - 1 && (
                    <Separator className="flex-1 mx-2" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
          <Card className="bg-card/50 backdrop-blur-sm border border-border/50 hover:border-cornflower-blue/30 transition-all duration-300 hover:shadow-lg hover:shadow-cornflower-blue/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <currentStepData.icon className="h-5 w-5" />
                {currentStepData.title}
              </CardTitle>
              <CardDescription>
                {currentStepData.description}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div data-testid={`${currentStepData.id}-step`}>
                <StepComponent
                  form={form}
                  userProfile={profile.data}
                  isLoading={isGenerating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Navigation Controls */}
          <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
            <CardContent className="pt-6">
              {/* Mobile: Stack navigation vertically */}
              <div className="block sm:hidden space-y-4">
                {/* Primary action button - full width on mobile */}
                {currentStep === WORKOUT_FORM_STEPS.length - 1 ? (
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('🔥 [WORKOUT FORM] Generate button clicked');
                      form.handleSubmit(onSubmit)();
                    }}
                    disabled={!isStepValid(currentStep) || isGenerating}
                    className="w-full h-12 bg-[#3E9EFF] hover:bg-[#3E9EFF]/90 text-base font-semibold touch-manipulation"
                    data-testid="generate-button"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating Workout Plan...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        Generate Workout Plan
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={goToNext}
                    disabled={!isStepValid(currentStep) || isGenerating}
                    className="w-full h-12 bg-[#3E9EFF] hover:bg-[#3E9EFF]/90 text-base font-semibold touch-manipulation"
                    data-testid="continue-button"
                  >
                    Continue to {WORKOUT_FORM_STEPS[currentStep + 1]?.title}
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                )}

                {/* Secondary actions */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPrevious}
                    disabled={currentStep === 0 || isGenerating}
                    className="flex-1 h-11 touch-manipulation"
                    data-testid="back-button"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  
                  {onCancel && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onCancel}
                      disabled={isGenerating}
                      className="flex-1 h-11 touch-manipulation"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              {/* Desktop: Original horizontal layout */}
              <div className="hidden sm:flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToPrevious}
                  disabled={currentStep === 0 || isGenerating}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  {currentStep === WORKOUT_FORM_STEPS.length - 1 ? (
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        console.log('🔥 [WORKOUT FORM] Generate button clicked (desktop)');
                        form.handleSubmit(onSubmit)();
                      }}
                      disabled={!isStepValid(currentStep) || isGenerating}
                      className="bg-[#3E9EFF] hover:bg-[#3E9EFF]/90"
                      data-testid="generate-button"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Generate Workout Plan
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={goToNext}
                      disabled={!isStepValid(currentStep) || isGenerating}
                      className="flex items-center gap-2"
                      data-testid="continue-button"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {onCancel && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={isGenerating}
                  >
                    Cancel
                  </Button>
                )}
              </div>

              {/* Step validation info */}
              {!isStepValid(currentStep) && (
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Please complete all required fields before proceeding to the next step.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* AI Operation Progress */}
      {aiOperationStatus.status !== 'idle' && (
        <div className="space-y-4">
          <AIOperationProgress status={aiOperationStatus} />
          
          {/* ✅ PHASE 2 DAY 4: Cancel button during generation */}
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

      {/* NEW: Chunked generation display (when enabled) */}
      {generationSuccess && chunkingState.showProgressiveGeneration && (
        <ChunkedGenerationDisplay
          structure={chunkingState.structure!}
          currentMesocycle={chunkingState.currentMesocycle}
          totalMesocycles={chunkingState.totalMesocycles}
          mesocyclesCompleted={chunkingState.mesocyclesCompleted}
          isGenerating={isGenerating}
          onGenerateMesocycle={handleIndividualMesocycleGeneration}
          generatingMesocycle={chunkingState.generatingMesocycle}
        />
      )}

      {/* Success Message with Real AI Insights */}
      {generationSuccess && aiOperationStatus.status === 'complete' && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success!</AlertTitle>
          <AlertDescription className="text-green-700" data-testid="success-message">
            <div className="space-y-3">
              <p>Your personalized workout plan has been generated successfully! Your AI-powered fitness journey begins now.</p>
              
              {/* ✅ PHASE 2 DAY 4: Display actual AI reasoning from backend */}
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
                        View Workout Plan
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
      {/* Progress skeleton */}
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-2 bg-gray-200 rounded" />
          </div>
        </CardHeader>
      </Card>

      {/* Step navigation skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center space-y-2">
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form content skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
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

export default MultiStepWorkoutForm;
