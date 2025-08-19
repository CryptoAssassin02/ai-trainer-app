/**
 * Multi-Step Profile Form Component
 * Phase 2.1.4 - Modern React Hook Form with step progression, real-time validation,
 * and accessibility improvements following shadcn/ui best practices
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeFormWatch } from '@/hooks/use-safe-form-watch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Loader2, 
  AlertCircle, 
  Info,
  User,
  Activity,
  Target,
  Settings
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { useProfile } from '@/hooks/use-profile-queries';
import { useProfileAutoSave } from '@/hooks/use-profile-autosave';
import { ConflictResolutionDialog } from './conflict-resolution-dialog';
import { 
  createDynamicProfileSchema,
  type ProfileCreationFormData,
  type ProfileUpdateFormData 
} from '@/lib/validation/profile-schemas';

// Step components
import { PersonalInfoStep } from './steps/personal-info-step';
import { PhysicalMeasurementsStep } from './steps/physical-measurements-step';
import { FitnessInfoStep } from './steps/fitness-info-step';
import { EquipmentPreferencesStep } from './steps/equipment-preferences-step';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface FormStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<StepComponentProps>;
  fields: string[];
  optional?: boolean;
}

interface StepComponentProps {
  form: any;
  unitPreference: 'metric' | 'imperial';
  isLoading?: boolean;
  validation?: any;
}

interface MultiStepProfileFormProps {
  mode?: 'create' | 'update';
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
  enableOptimistic?: boolean;
  enableAutoSave?: boolean;
  initialStep?: number;
}

type FormData = ProfileCreationFormData | ProfileUpdateFormData;

// ==========================================
// FORM STEPS CONFIGURATION
// ==========================================

const FORM_STEPS: FormStep[] = [
  {
    id: 'personal-info',
    title: 'Personal Information',
    description: 'Basic details about yourself',
    icon: User,
    component: PersonalInfoStep,
    fields: ['name', 'age', 'gender', 'unitPreference'],
  },
  {
    id: 'physical-measurements',
    title: 'Physical Measurements',
    description: 'Height and weight information',
    icon: Activity,
    component: PhysicalMeasurementsStep,
    fields: ['height', 'weight'],
  },
  {
    id: 'fitness-info',
    title: 'Fitness Information',
    description: 'Experience level and goals',
    icon: Target,
    component: FitnessInfoStep,
    fields: ['experienceLevel', 'goals', 'medicalConditions'],
  },
  {
    id: 'equipment-preferences',
    title: 'Preferences & Equipment',
    description: 'Workout preferences and available equipment',
    icon: Settings,
    component: EquipmentPreferencesStep,
    fields: ['equipment', 'workoutFrequency'],
    optional: true,
  },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export function MultiStepProfileForm({
  mode = 'update',
  onSuccess,
  onCancel,
  enableOptimistic = true,
  enableAutoSave = false,
  initialStep = 0,
}: MultiStepProfileFormProps) {
  // State management
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [lastSubmittedData, setLastSubmittedData] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<string>('Ready for submission');

  // React Query integration - Handle create mode without suspending
  const { 
    profile, 
    isLoading: profileLoading,
    updateProfileAsync,
    isUpdating,
    error: profileError 
  } = useProfile({
    enableOptimistic,
    // For create mode, don't suspend on missing profile
    enabled: mode === 'update',
  });

  const isCreateMode = mode === 'create';
  const isUpdateMode = mode === 'update';

  // Handle success callback using the recommended React Hook Form pattern
  // This ensures proper timing - success message displays first, then redirect happens
  useEffect(() => {
    if (submitSuccess && onSuccess && lastSubmittedData) {
      // CRITICAL FIX: Call onSuccess outside setTimeout to preserve async context
      // Use a separate async function to handle the delay and callback
      const handleSuccessCallback = async () => {
        try {
          // Small delay to allow success message to be visible and tests to catch it
          await new Promise(resolve => setTimeout(resolve, 500));
          // Call the async success callback with the actual profile data and await it
          await onSuccess(lastSubmittedData);
        } catch (error) {
          console.error('❌ onSuccess callback failed:', error);
        }
      };

      // Execute immediately without setTimeout to preserve Next.js async context
      handleSuccessCallback();
    }
  }, [submitSuccess, onSuccess, lastSubmittedData]);

  // Get initial unit preference from profile or default to 'metric'
  const initialUnitPreference = (profile.data as any)?.unitPreference || 'metric';
  
  // Create schema once with initial unit preference - no dynamic updates needed
  const schema = useMemo(() => {
    return createDynamicProfileSchema(
      isCreateMode ? 'create' : 'update',
      initialUnitPreference
    );
  }, [isCreateMode, initialUnitPreference]);

  // Form setup with dynamic schema
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      unitPreference: initialUnitPreference,
      name: (profile.data as any)?.name ?? '',
      age: (profile.data as any)?.age ?? undefined,
      gender: (profile.data as any)?.gender ?? '',
      height: (profile.data as any)?.height ?? '',
      weight: (profile.data as any)?.weight ?? '',
      experienceLevel: (profile.data as any)?.experienceLevel ?? '',
      goals: (profile.data as any)?.goals ?? [],
      equipment: (profile.data as any)?.equipment ?? [],
      medicalConditions: (profile.data as any)?.medicalConditions ?? '',
      workoutFrequency: (profile.data as any)?.workoutFrequency ?? '',
    },
    mode: 'onChange',
  });

  // Safely watch unit preference without causing infinite loops
  const currentUnitPreference = useSafeFormWatch(form, 'unitPreference', initialUnitPreference);

  // Enhanced auto-save functionality (only when enabled to avoid profile fetch issues in create mode)
  const autoSave = enableAutoSave ? useProfileAutoSave(form, {
    enabled: enableAutoSave,
    debounceMs: 2000,
    enableOptimistic,
    enableConflictResolution: true,
    onSaveSuccess: (data) => {
      // Optional: callback on successful save
    },
    onSaveError: (error) => {
      console.error('Auto-save error:', error);
    },
    onConflict: (serverData, localData) => {
      // Custom conflict resolution logic can be added here
      return null; // Return null to show conflict dialog
    },
  }) : null;

  // Get current form values without watching to prevent infinite loops
  const watchedValues = form.getValues();



  // Step validation function - kept simple without memoization to avoid circular dependencies
  const isStepValid = (stepIndex: number): boolean => {
    const step = FORM_STEPS[stepIndex];
    const errors = form.formState.errors;
    
    // Check if any required fields in this step have errors
    return !step.fields.some(field => errors[field as keyof typeof errors]);
  };

  // Step completion calculation - kept simple without memoization to avoid circular dependencies  
  const isStepComplete = (stepIndex: number): boolean => {
    const step = FORM_STEPS[stepIndex];
    const values = form.getValues();
    
    // For optional steps, consider complete if valid
    if (step.optional) {
      return isStepValid(stepIndex);
    }
    
    // For required steps, check if all required fields have values
    return step.fields.every(field => {
      const value = values[field as keyof typeof values];
      return value !== undefined && value !== null && value !== '' && 
             !(Array.isArray(value) && value.length === 0);
    });
  };

  // Update completed steps when form values change
  useEffect(() => {
    try {
      const subscription = form.watch(() => {
        try {
          const newCompletedSteps = new Set<number>();
          FORM_STEPS.forEach((_, index) => {
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
  }, [form]);

  // Navigation handlers
  const goToNext = () => {
    if (currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
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

  // React Query client for cache invalidation
  const queryClient = useQueryClient();

  // Form submission
  const onSubmit = async (data: FormData) => {
    setDebugInfo('🔥 FORM SUBMISSION TRIGGERED!!!');
    console.log('🔥 FORM SUBMISSION TRIGGERED!!! 🔥');
    console.log('📊 Form is valid:', form.formState.isValid);
    console.log('📊 Form errors:', form.formState.errors);
    setSubmitSuccess(false); // Reset first
    try {
      setDebugInfo('📝 Calling updateProfileAsync...');
      console.log('📝 Starting form submission...');
      console.log('📝 Submitting profile data:', JSON.stringify(data, null, 2));
      console.log('📝 Data keys:', Object.keys(data));
      
      // Transform medical conditions from string to array if needed
      const profileData: any = { ...data };
      if (typeof profileData.medicalConditions === 'string') {
        // Convert string to array - split by comma or newline, trim, and filter empty
        const conditionsArray = profileData.medicalConditions
          .split(/[,\n]/)
          .map((condition: string) => condition.trim())
          .filter((condition: string) => condition.length > 0);
        
        // If empty or just "none", send empty array
        if (conditionsArray.length === 0 || 
            conditionsArray[0]?.toLowerCase() === 'none' ||
            conditionsArray[0]?.toLowerCase() === 'none reported') {
          profileData.medicalConditions = [];
        } else {
          profileData.medicalConditions = conditionsArray;
        }
      } else if (!profileData.medicalConditions) {
        profileData.medicalConditions = [];
      }
      
      console.log('📝 Transformed data:', JSON.stringify(profileData, null, 2));
      console.log('📝 About to call updateProfileAsync...');
      const result = await updateProfileAsync(profileData as any);
      setDebugInfo('✅ Profile saved! Invalidating cache...');
      console.log('✅ Profile saved successfully:', result);
      
      // Critical: Invalidate and refetch profile data after successful update
      await queryClient.invalidateQueries({ 
        queryKey: ['profile'], 
        refetchType: 'active' 
      });
      setDebugInfo('🔄 Cache invalidated! Showing success...');
      console.log('🔄 Cache invalidated');
      
      setSubmitSuccess(true);
      setLastSubmittedData(profileData); // Store the submitted data for the onSuccess callback
      setDebugInfo('🎉 SUCCESS! Profile saved successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setDebugInfo(`❌ ERROR: ${errorMessage.substring(0, 100)}...`);
      console.error('❌ Form submission failed!');
      console.error('❌ Error details:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', errorMessage);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      setSubmitSuccess(false);
    }
  };

  // Progress calculation
  const overallProgress = Math.round((completedSteps.size / FORM_STEPS.length) * 100);
  const currentStepProgress = Math.round(((currentStep + 1) / FORM_STEPS.length) * 100);

  // Only show loading state in update mode when fetching existing profile
  // In create mode, we don't need to wait for profile to load
  const isLoading = isUpdateMode && profileLoading;
  const isProcessing = isUpdating;

  if (isLoading) {
    return <MultiStepFormSkeleton />;
  }

  const currentStepData = FORM_STEPS[currentStep];
  const StepComponent = currentStepData.component;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6" data-testid="multi-step-form">
      
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isCreateMode ? '🆕 Create Your Profile' : '✏️ Update Profile'}
              </CardTitle>
              <CardDescription>
                Step {currentStep + 1} of {FORM_STEPS.length}: {currentStepData.title}
              </CardDescription>
            </div>
            
            <div className="text-right">
              <Badge variant={overallProgress === 100 ? "default" : "secondary"}>
                {overallProgress}% Complete
              </Badge>
              {enableAutoSave && autoSave && (
                <div className="text-xs text-muted-foreground mt-1">
                  {autoSave.statusText}
                </div>
              )}
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

      {/* Step Navigation - Mobile-First Responsive */}
      <Card>
        <CardContent className="pt-6">
          {/* Mobile: Horizontal Scrollable Steps */}
          <div className="block sm:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {FORM_STEPS.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => goToStep(index)}
                  className={`flex flex-col items-center justify-center min-w-[80px] h-[80px] p-2 rounded-lg transition-all touch-manipulation
                    ${index === currentStep ? 'bg-[#3E9EFF]/10 text-[#3E9EFF] ring-2 ring-[#3E9EFF]/20' : 
                      completedSteps.has(index) ? 'bg-green-50 text-green-700' :
                      'text-muted-foreground bg-muted/50'
                    }`}
                  disabled={isProcessing}
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
              {FORM_STEPS.map((_, index) => (
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
            {FORM_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => goToStep(index)}
                  className={`flex flex-col items-center space-y-2 p-3 rounded-lg transition-colors
                    ${index === currentStep ? 'bg-[#3E9EFF]/10 text-[#3E9EFF]' : 
                      completedSteps.has(index) ? 'bg-green-50 text-green-700 hover:bg-green-100' :
                      'text-muted-foreground hover:bg-muted'
                    }`}
                  disabled={isProcessing}
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
                
                {index < FORM_STEPS.length - 1 && (
                  <Separator className="flex-1 mx-2" />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {profileError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {profileError.message || 'An error occurred'}
          </AlertDescription>
        </Alert>
      )}

      {/* Form Content */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <currentStepData.icon className="h-5 w-5" />
                {currentStepData.title}
              </CardTitle>
              <CardDescription>
                {currentStepData.description}
                {currentStepData.optional && (
                  <Badge variant="outline" className="ml-2">Optional</Badge>
                )}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div data-testid={`${currentStepData.id}-step`}>
                <StepComponent
                  form={form}
                  unitPreference={currentUnitPreference}
                  isLoading={isProcessing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Navigation Controls - Mobile-Optimized */}
          <Card>
            <CardContent className="pt-6">
              {/* Mobile: Stack navigation vertically */}
              <div className="block sm:hidden space-y-4">
                {/* Auto-save status on mobile */}
                {enableAutoSave && autoSave && (
                  <div className="text-center text-xs text-muted-foreground bg-muted/50 p-2 rounded" data-testid="auto-save-status">
                    {autoSave.statusText}
                  </div>
                )}

                {/* Primary action button - full width on mobile */}
                {currentStep === FORM_STEPS.length - 1 ? (
                  <Button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full h-12 bg-[#3E9EFF] hover:bg-[#3E9EFF]/90 text-base font-semibold touch-manipulation"
                    data-testid="submit-button"
                    onClick={() => {
                      setDebugInfo('🚨 BUTTON CLICKED! Processing...');
                      console.log('🚨 BUTTON CLICKED!');
                      console.log('🚨 isProcessing:', isProcessing);
                      console.log('🚨 form.formState.isValid:', form.formState.isValid);
                      console.log('🚨 form.formState.errors:', form.formState.errors);
                      console.log('🚨 Button disabled?', isProcessing);
                      console.log('🚨 Form data:', form.getValues());
                    }}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {isCreateMode ? 'Creating Profile...' : 'Saving Changes...'}
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        {isCreateMode ? 'Create Profile' : 'Save Changes'}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={goToNext}
                    disabled={!isStepValid(currentStep) || isProcessing}
                    className="w-full h-12 bg-[#3E9EFF] hover:bg-[#3E9EFF]/90 text-base font-semibold touch-manipulation"
                    data-testid="continue-button"
                  >
                    Continue to {FORM_STEPS[currentStep + 1]?.title}
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                )}

                {/* Secondary actions */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPrevious}
                    disabled={currentStep === 0 || isProcessing}
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
                      disabled={isProcessing}
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
                  disabled={currentStep === 0 || isProcessing}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  {enableAutoSave && autoSave && (
                    <div className="text-xs text-muted-foreground">
                      {autoSave.statusText}
                    </div>
                  )}
                  
                  {currentStep === FORM_STEPS.length - 1 ? (
                    <Button
                      type="submit"
                      disabled={isProcessing}
                      className="bg-[#3E9EFF] hover:bg-[#3E9EFF]/90"
                      data-testid="submit-button"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isCreateMode ? 'Creating...' : 'Saving...'}
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          {isCreateMode ? 'Create Profile' : 'Save Changes'}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={goToNext}
                      disabled={!isStepValid(currentStep) || isProcessing}
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
                    disabled={isProcessing}
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

      {/* Debug Info */}
      <Alert className="mb-6 bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Debug Info</AlertTitle>
        <AlertDescription className="text-blue-700" data-testid="debug-info">
          {debugInfo}
        </AlertDescription>
      </Alert>

      {/* Success Message */}
      {submitSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success!</AlertTitle>
          <AlertDescription className="text-green-700" data-testid="success-message">
            Profile created successfully. Your fitness profile has been saved and you can now get personalized workout recommendations.
          </AlertDescription>
        </Alert>
      )}

      {/* Conflict Resolution Dialog */}
      {enableAutoSave && autoSave && (
        <ConflictResolutionDialog
          open={autoSave.hasConflict}
          onOpenChange={(open) => {
            if (!open && autoSave.hasConflict) {
              // User closed dialog without resolving - pause auto-save
              autoSave.pauseAutoSave();
            }
          }}
          localData={form.getValues()}
          serverData={autoSave.conflictData}
          onResolve={autoSave.resolveConflict}
        />
      )}
    </div>
  );
}

// ==========================================
// SKELETON COMPONENT
// ==========================================

function MultiStepFormSkeleton() {
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
            {Array.from({ length: 4 }).map((_, i) => (
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

export default MultiStepProfileForm;
