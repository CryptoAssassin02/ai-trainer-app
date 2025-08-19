# Form Patterns Documentation

## Table of Contents

1. [Overview](#overview)
2. [React Hook Form Foundation](#react-hook-form-foundation)
3. [Validation Strategies](#validation-strategies)
4. [Auto-Save Implementation](#auto-save-implementation)
5. [Mobile Form Optimizations](#mobile-form-optimizations)
6. [Complex Form Patterns](#complex-form-patterns)
7. [File Upload Patterns](#file-upload-patterns)
8. [Rate Limit Handling](#rate-limit-handling)
9. [Testing Strategies](#testing-strategies)
10. [Common Pitfalls](#common-pitfalls)
11. [Integration Examples](#integration-examples)

## Overview

This document outlines form patterns for the trAIner AI Fitness App frontend, focusing on React Hook Form implementation with comprehensive validation, accessibility, and mobile optimization.

### Key Technologies
- **React Hook Form v7.54.2**: Primary form management library
- **Radix UI Components**: Accessible form primitives
- **Joi Backend Validation**: Server-side validation mirroring
- **Tailwind CSS**: Styling and responsive design
- **React Testing Library**: Form testing patterns

### Core Principles
- **User-Centric Validation**: Real-time feedback without overwhelming users
- **Accessibility First**: WCAG AA compliance throughout
- **Mobile Optimization**: Touch-friendly interactions and layouts
- **Performance**: Efficient validation and minimal re-renders
- **Security**: Client-side validation that mirrors backend Joi schemas

## React Hook Form Foundation

### Basic Form Setup

```jsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Mirror backend Joi schema with Zod for type safety
const registrationSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .min(1, 'Email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters')
    .optional()
});

type RegistrationForm = z.infer<typeof registrationSchema>;

function RegistrationForm() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    watch,
    setError,
    clearErrors
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    mode: 'onBlur', // Validate on blur for better UX
    defaultValues: {
      email: '',
      password: '',
      name: ''
    }
  });

  const onSubmit = async (data: RegistrationForm) => {
    try {
      const response = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Handle backend validation errors
        if (error.errors) {
          error.errors.forEach(({ field, message }) => {
            setError(field as keyof RegistrationForm, { message });
          });
        }
        return;
      }

      // Success handling
      const result = await response.json();
      // Redirect or show success message
    } catch (error) {
      setError('root', { message: 'Network error. Please try again.' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email *
            </Label>
            <Input
              {...field}
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={fieldState.invalid}
              aria-describedby={fieldState.error ? 'email-error' : undefined}
              className={cn(
                'transition-colors',
                fieldState.error && 'border-red-500 focus:border-red-500'
              )}
            />
            {fieldState.error && (
              <p
                id="email-error"
                className="text-sm text-red-600"
                role="alert"
                aria-live="polite"
              >
                {fieldState.error.message}
              </p>
            )}
          </div>
        )}
      />
      
      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full min-h-[44px]" // Touch-friendly minimum
      >
        {isSubmitting ? 'Creating Account...' : 'Sign Up'}
      </Button>
    </form>
  );
}
```

### Custom Hook Pattern for Reusability

```jsx
// hooks/useWorkoutForm.js
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { workoutGenerationSchema } from '@/lib/validation';

export function useWorkoutForm(defaultValues = {}) {
  const form = useForm({
    resolver: zodResolver(workoutGenerationSchema),
    mode: 'onBlur',
    defaultValues: {
      fitnessLevel: 'beginner',
      goals: [],
      equipment: [],
      restrictions: [],
      exerciseTypes: [],
      workoutFrequency: '',
      additionalNotes: '',
      ...defaultValues
    }
  });

  const submitWorkout = async (data) => {
    try {
      const response = await fetch('/api/v1/workouts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      form.setError('root', { message: error.message });
      throw error;
    }
  };

  return {
    ...form,
    submitWorkout
  };
}
```

## Validation Strategies

### Real-Time Validation with Debouncing

```jsx
import { useCallback, useEffect } from 'react';
import { debounce } from 'lodash';

function useDebounceValidation(field, validateFn, delay = 300) {
  const debouncedValidate = useCallback(
    debounce(async (value) => {
      try {
        await validateFn(value);
        clearErrors(field);
      } catch (error) {
        setError(field, { message: error.message });
      }
    }, delay),
    [field, validateFn, delay]
  );

  return debouncedValidate;
}

// Usage in form component
function EmailField({ control, clearErrors, setError }) {
  const validateEmail = async (email) => {
    const response = await fetch(`/api/v1/auth/validate-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
  };

  const debouncedValidate = useDebounceValidation('email', validateEmail);

  return (
    <Controller
      name="email"
      control={control}
      render={({ field, fieldState }) => (
        <div>
          <Input
            {...field}
            onChange={(e) => {
              field.onChange(e);
              debouncedValidate(e.target.value);
            }}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.error && (
            <p className="text-sm text-red-600" role="alert">
              {fieldState.error.message}
            </p>
          )}
        </div>
      )}
    />
  );
}
```

### Field-Level vs Form-Level Validation Timing

```jsx
// Field-level: Validate on blur for individual fields
const fieldValidationConfig = {
  mode: 'onBlur',
  reValidateMode: 'onChange'
};

// Form-level: Validate on submit for complex interdependent fields
const formValidationConfig = {
  mode: 'onSubmit',
  reValidateMode: 'onBlur'
};

// Conditional validation timing based on field complexity
function getValidationMode(fieldName) {
  const immediateValidationFields = ['email', 'password'];
  const deferredValidationFields = ['height', 'medicalConditions'];
  
  if (immediateValidationFields.includes(fieldName)) {
    return 'onBlur';
  }
  
  if (deferredValidationFields.includes(fieldName)) {
    return 'onSubmit';
  }
  
  return 'onBlur'; // default
}
```

### Inline Error Display with ARIA

```jsx
function FormField({ 
  name, 
  label, 
  required = false, 
  children, 
  error,
  description 
}) {
  const errorId = `${name}-error`;
  const descriptionId = `${name}-description`;
  
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </Label>
      
      {description && (
        <p id={descriptionId} className="text-sm text-gray-600">
          {description}
        </p>
      )}
      
      <div className="relative">
        {React.cloneElement(children, {
          id: name,
          'aria-invalid': !!error,
          'aria-describedby': [
            error ? errorId : null,
            description ? descriptionId : null
          ].filter(Boolean).join(' ') || undefined
        })}
        
        {error && (
          <div className="flex items-center mt-1">
            <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
            <p
              id={errorId}
              className="text-sm text-red-600"
              role="alert"
              aria-live="polite"
            >
              {error.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

## Auto-Save Implementation

### LocalStorage Auto-Save with Debouncing

```jsx
import { useEffect, useCallback } from 'react';
import { debounce } from 'lodash';

function useAutoSave(formData, formKey, options = {}) {
  const {
    delay = 500,
    enabled = true,
    storageType = 'localStorage'
  } = options;

  const storage = storageType === 'sessionStorage' ? sessionStorage : localStorage;

  // Save to storage with debouncing
  const debouncedSave = useCallback(
    debounce((data) => {
      if (!enabled || !data) return;
      
      try {
        const saveData = {
          data,
          timestamp: Date.now(),
          version: '1.0'
        };
        storage.setItem(`autosave_${formKey}`, JSON.stringify(saveData));
      } catch (error) {
        console.warn('Auto-save failed:', error);
      }
    }, delay),
    [formKey, enabled, delay, storage]
  );

  // Load from storage
  const loadSavedData = useCallback(() => {
    try {
      const saved = storage.getItem(`autosave_${formKey}`);
      if (!saved) return null;
      
      const { data, timestamp } = JSON.parse(saved);
      
      // Check if data is not too old (24 hours)
      const isExpired = Date.now() - timestamp > 24 * 60 * 60 * 1000;
      if (isExpired) {
        storage.removeItem(`autosave_${formKey}`);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('Failed to load auto-saved data:', error);
      return null;
    }
  }, [formKey, storage]);

  // Clear saved data
  const clearSavedData = useCallback(() => {
    storage.removeItem(`autosave_${formKey}`);
  }, [formKey, storage]);

  // Auto-save on form data changes
  useEffect(() => {
    debouncedSave(formData);
  }, [formData, debouncedSave]);

  return {
    loadSavedData,
    clearSavedData
  };
}

// Usage in form component
function WorkoutGenerationForm() {
  const form = useWorkoutForm();
  const watchedData = form.watch();
  
  const { loadSavedData, clearSavedData } = useAutoSave(
    watchedData,
    'workout-generation',
    { delay: 500 }
  );

  // Load saved data on mount
  useEffect(() => {
    const savedData = loadSavedData();
    if (savedData) {
      const shouldRestore = window.confirm(
        'We found unsaved changes. Would you like to restore them?'
      );
      
      if (shouldRestore) {
        form.reset(savedData);
      } else {
        clearSavedData();
      }
    }
  }, []);

  // Clear saved data on successful submit
  const onSubmit = async (data) => {
    try {
      await form.submitWorkout(data);
      clearSavedData();
      // Success handling
    } catch (error) {
      // Error handling
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### Multi-Tab Conflict Resolution

```jsx
function useMultiTabSync(formKey, onConflictDetected) {
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === `autosave_${formKey}` && e.newValue) {
        try {
          const newData = JSON.parse(e.newValue);
          const currentData = localStorage.getItem(`autosave_${formKey}`);
          
          if (currentData && currentData !== e.oldValue) {
            // Conflict detected
            onConflictDetected?.(newData.data);
          }
        } catch (error) {
          console.warn('Failed to parse storage change:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [formKey, onConflictDetected]);
}

// Usage
function ProfileForm() {
  const form = useForm();
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState(null);

  useMultiTabSync('profile', (newData) => {
    setConflictData(newData);
    setShowConflictDialog(true);
  });

  const handleConflictResolution = (useRemoteData) => {
    if (useRemoteData && conflictData) {
      form.reset(conflictData);
    }
    setShowConflictDialog(false);
    setConflictData(null);
  };

  return (
    <>
      {/* Form content */}
      
      {showConflictDialog && (
        <AlertDialog open={showConflictDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conflicting Changes Detected</AlertDialogTitle>
              <AlertDialogDescription>
                This form has been modified in another tab. What would you like to do?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={() => handleConflictResolution(false)}
              >
                Keep Current Changes
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => handleConflictResolution(true)}
              >
                Use Other Tab's Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
```

## Mobile Form Optimizations

### Input Type Specifications

```jsx
const inputTypeMap = {
  email: 'email',
  phone: 'tel',
  age: 'number',
  weight: 'number',
  height: 'number',
  password: 'password',
  search: 'search',
  url: 'url'
};

function MobileOptimizedInput({ field, type, ...props }) {
  const inputProps = {
    ...props,
    type: inputTypeMap[type] || 'text',
    // Mobile-specific attributes
    autoCapitalize: type === 'email' ? 'none' : 'sentences',
    autoCorrect: type === 'email' ? 'off' : 'on',
    spellCheck: type === 'email' || type === 'password' ? 'false' : 'true',
    inputMode: getInputMode(type)
  };

  return <Input {...field} {...inputProps} />;
}

function getInputMode(type) {
  const inputModeMap = {
    email: 'email',
    tel: 'tel',
    number: 'numeric',
    decimal: 'decimal',
    search: 'search',
    url: 'url'
  };
  
  return inputModeMap[type] || 'text';
}
```

### Touch-Friendly Layouts

```jsx
function MobileFormLayout({ children, title }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header with large touch target */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between p-4 min-h-[60px]">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10" // 40px minimum touch target
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold truncate mx-4">{title}</h1>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>
      </header>

      {/* Form content with proper spacing */}
      <main className="p-4 pb-20 space-y-6">
        {children}
      </main>

      {/* Sticky footer for primary actions */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <Button className="w-full min-h-[48px] text-base font-medium">
          Continue
        </Button>
      </footer>
    </div>
  );
}
```

### Virtual Keyboard Management

```jsx
function useVirtualKeyboard() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // Detect virtual keyboard on mobile
      const heightChange = window.innerHeight / window.screen.height;
      setIsKeyboardOpen(heightChange < 0.75);
    };

    // Visual Viewport API for better detection
    if ('visualViewport' in window) {
      const handleViewportChange = () => {
        const viewport = window.visualViewport;
        const heightRatio = viewport.height / window.screen.height;
        setIsKeyboardOpen(heightRatio < 0.75);
      };

      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      };
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return { isKeyboardOpen };
}

// Usage in form
function ResponsiveForm() {
  const { isKeyboardOpen } = useVirtualKeyboard();

  return (
    <div className={cn(
      'min-h-screen transition-all duration-200',
      isKeyboardOpen && 'pb-0' // Remove bottom padding when keyboard is open
    )}>
      {/* Form content */}
    </div>
  );
}
```

## Complex Form Patterns

### Multi-Step Forms with Progress Indicators

```jsx
function useMultiStepForm(steps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
    }
  };

  const isStepCompleted = (stepIndex) => completedSteps.has(stepIndex);
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return {
    currentStep,
    currentStepData: steps[currentStep],
    nextStep,
    previousStep,
    goToStep,
    isStepCompleted,
    isLastStep,
    isFirstStep,
    progress: ((currentStep + 1) / steps.length) * 100
  };
}

function ProfileCreationWizard() {
  const steps = [
    { id: 'basic', title: 'Basic Info', component: BasicInfoStep },
    { id: 'fitness', title: 'Fitness Level', component: FitnessStep },
    { id: 'goals', title: 'Goals & Equipment', component: GoalsStep },
    { id: 'health', title: 'Health Information', component: HealthStep }
  ];

  const {
    currentStep,
    currentStepData,
    nextStep,
    previousStep,
    isLastStep,
    isFirstStep,
    progress
  } = useMultiStepForm(steps);

  const form = useForm({
    mode: 'onBlur',
    defaultValues: {
      // Flatten all step data
      name: '',
      age: '',
      height: '',
      weight: '',
      experienceLevel: '',
      goals: [],
      equipment: [],
      medicalConditions: []
    }
  });

  const CurrentStepComponent = currentStepData.component;

  const handleNext = async () => {
    // Validate current step
    const stepFields = getStepFields(currentStep);
    const isValid = await form.trigger(stepFields);
    
    if (isValid) {
      if (isLastStep) {
        form.handleSubmit(onSubmit)();
      } else {
        nextStep();
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>
        
        <Progress value={progress} className="w-full" />
        
        {/* Step indicators */}
        <div className="flex justify-between mt-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'flex flex-col items-center cursor-pointer',
                index <= currentStep ? 'text-primary' : 'text-muted-foreground'
              )}
              onClick={() => index <= currentStep && goToStep(index)}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                index < currentStep 
                  ? 'bg-primary text-primary-foreground'
                  : index === currentStep
                  ? 'bg-primary/20 text-primary border-2 border-primary'
                  : 'bg-muted'
              )}>
                {index < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span className="text-xs mt-1 hidden sm:block">
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      <FormProvider {...form}>
        <CurrentStepComponent />
      </FormProvider>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button
          type="button"
          variant="outline"
          onClick={previousStep}
          disabled={isFirstStep}
          className="min-h-[44px]"
        >
          Previous
        </Button>
        
        <Button
          type="button"
          onClick={handleNext}
          className="min-h-[44px]"
        >
          {isLastStep ? 'Complete Profile' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
```

### Conditional Fields (Equipment Based on Workout Type)

```jsx
function ConditionalEquipmentField() {
  const { control, watch } = useFormContext();
  const exerciseTypes = watch('exerciseTypes');

  // Equipment recommendations based on exercise types
  const getRelevantEquipment = (types) => {
    const equipmentMap = {
      'strength_training': ['dumbbells', 'barbell', 'resistance_bands', 'kettlebells'],
      'cardio': ['treadmill', 'stationary_bike', 'jump_rope', 'elliptical'],
      'yoga': ['yoga_mat', 'yoga_blocks', 'yoga_strap'],
      'pilates': ['pilates_mat', 'pilates_ball', 'resistance_bands'],
      'bodyweight': ['yoga_mat', 'pull_up_bar'],
      'crossfit': ['kettlebells', 'barbell', 'pull_up_bar', 'medicine_ball']
    };

    const relevant = new Set();
    types?.forEach(type => {
      equipmentMap[type]?.forEach(equipment => relevant.add(equipment));
    });

    return Array.from(relevant);
  };

  const relevantEquipment = getRelevantEquipment(exerciseTypes);

  if (!exerciseTypes?.length) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Select exercise types above to see relevant equipment options
        </p>
      </div>
    );
  }

  return (
    <Controller
      name="equipment"
      control={control}
      render={({ field }) => (
        <div className="space-y-4">
          <Label className="text-sm font-medium">
            Available Equipment
            <span className="text-muted-foreground ml-2">
              (based on your exercise preferences)
            </span>
          </Label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relevantEquipment.map((equipment) => (
              <div key={equipment} className="flex items-center space-x-2">
                <Checkbox
                  id={equipment}
                  checked={field.value?.includes(equipment) || false}
                  onCheckedChange={(checked) => {
                    const current = field.value || [];
                    if (checked) {
                      field.onChange([...current, equipment]);
                    } else {
                      field.onChange(current.filter(item => item !== equipment));
                    }
                  }}
                />
                <Label
                  htmlFor={equipment}
                  className="text-sm font-normal cursor-pointer"
                >
                  {equipment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Label>
              </div>
            ))}
          </div>
          
          {!relevantEquipment.length && (
            <p className="text-sm text-muted-foreground">
              No specific equipment needed for your selected exercise types
            </p>
          )}
        </div>
      )}
    />
  );
}
```

### Unit Conversion UI (Imperial/Metric)

```jsx
function HeightField() {
  const { control, watch, setValue } = useFormContext();
  const unitPreference = watch('unitPreference') || 'metric';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Height</Label>
        
        {/* Unit Toggle */}
        <div className="flex items-center space-x-2">
          <Label htmlFor="unit-toggle" className="text-sm">
            {unitPreference === 'metric' ? 'cm' : 'ft/in'}
          </Label>
          <Switch
            id="unit-toggle"
            checked={unitPreference === 'imperial'}
            onCheckedChange={(checked) => {
              setValue('unitPreference', checked ? 'imperial' : 'metric');
              // Clear height when switching units
              setValue('height', null);
            }}
          />
        </div>
      </div>

      {unitPreference === 'metric' ? (
        <Controller
          name="height"
          control={control}
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <div className="relative">
                <Input
                  {...field}
                  type="number"
                  placeholder="170"
                  min="50"
                  max="250"
                  value={typeof field.value === 'number' ? field.value : ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseFloat(e.target.value) : null;
                    field.onChange(value);
                  }}
                  className="pr-12"
                  aria-invalid={fieldState.invalid}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  cm
                </span>
              </div>
              {fieldState.error && (
                <p className="text-sm text-red-600">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
      ) : (
        <Controller
          name="height"
          control={control}
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="5"
                    min="3"
                    max="8"
                    value={field.value?.feet || ''}
                    onChange={(e) => {
                      const feet = e.target.value ? parseInt(e.target.value) : 0;
                      field.onChange({
                        ...field.value,
                        feet,
                        inches: field.value?.inches || 0
                      });
                    }}
                    className="pr-12"
                    aria-label="Feet"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ft
                  </span>
                </div>
                
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="10"
                    min="0"
                    max="11"
                    value={field.value?.inches || ''}
                    onChange={(e) => {
                      const inches = e.target.value ? parseInt(e.target.value) : 0;
                      field.onChange({
                        ...field.value,
                        feet: field.value?.feet || 0,
                        inches
                      });
                    }}
                    className="pr-12"
                    aria-label="Inches"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    in
                  </span>
                </div>
              </div>
              {fieldState.error && (
                <p className="text-sm text-red-600">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
      )}
    </div>
  );
}
```

### Medical Conditions as String Arrays

```jsx
function MedicalConditionsField() {
  const { control, formState } = useFormContext();
  const [inputValue, setInputValue] = useState('');

  return (
    <Controller
      name="medicalConditions"
      control={control}
      render={({ field, fieldState }) => (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <Label className="text-sm font-medium">
                Medical Conditions
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                List any medical conditions or injuries we should consider
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {field.value?.length || 0}/10
            </Badge>
          </div>

          {/* Current conditions */}
          {field.value?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {field.value.map((condition, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="flex items-center gap-2 pr-1"
                >
                  {condition}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => {
                      const newConditions = field.value.filter((_, i) => i !== index);
                      field.onChange(newConditions);
                    }}
                    aria-label={`Remove ${condition}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          {/* Add new condition */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="e.g., Lower back pain, Knee injury"
                maxLength={200}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCondition();
                  }
                }}
                disabled={(field.value?.length || 0) >= 10}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (inputValue.trim() && (field.value?.length || 0) < 10) {
                  const sanitized = inputValue.trim();
                  
                  // Basic validation matching backend Joi schema
                  if (!/^[a-zA-Z0-9\s\-.,()_]+$/.test(sanitized)) {
                    toast.error('Invalid characters detected');
                    return;
                  }

                  const current = field.value || [];
                  if (!current.includes(sanitized)) {
                    field.onChange([...current, sanitized]);
                    setInputValue('');
                  }
                }
              }}
              disabled={
                !inputValue.trim() || 
                (field.value?.length || 0) >= 10 ||
                field.value?.includes(inputValue.trim())
              }
            >
              Add
            </Button>
          </div>

          {fieldState.error && (
            <p className="text-sm text-red-600" role="alert">
              {fieldState.error.message}
            </p>
          )}

          {/* Help text */}
          <div className="text-xs text-muted-foreground">
            <p>• Each condition should be under 200 characters</p>
            <p>• Maximum 10 conditions allowed</p>
            <p>• This information helps us create safer workout plans</p>
          </div>
        </div>
      )}
    />
  );
}
```

## File Upload Patterns

### Drag-and-Drop with Progress Indicators

```jsx
import { useDropzone } from 'react-dropzone';
import { useState, useCallback } from 'react';

function FileUploadField({ name, accept, maxSize = 50 * 1024 * 1024, multiple = false }) {
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach(error => {
          switch (error.code) {
            case 'file-too-large':
              toast.error(`${file.name} is too large. Maximum size is ${maxSize / (1024 * 1024)}MB`);
              break;
            case 'file-invalid-type':
              toast.error(`${file.name} has an invalid file type`);
              break;
            default:
              toast.error(`Error with ${file.name}: ${error.message}`);
          }
        });
      });
    }

    // Upload accepted files
    for (const file of acceptedFiles) {
      await uploadFile(file);
    }
  }, [maxSize]);

  const uploadFile = async (file) => {
    const fileId = `${file.name}-${Date.now()}`;
    
    try {
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v1/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      setUploadedFiles(prev => [...prev, {
        id: fileId,
        name: file.name,
        size: file.size,
        url: result.url,
        type: file.type
      }]);

      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
      
      toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
      toast.error(`Failed to upload ${file.name}: ${error.message}`);
      setUploadProgress(prev => {
        const { [fileId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple,
    disabled: Object.keys(uploadProgress).length > 0
  });

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive && !isDragReject && 'border-primary bg-primary/5',
          isDragReject && 'border-destructive bg-destructive/5',
          Object.keys(uploadProgress).length > 0 && 'cursor-not-allowed opacity-50'
        )}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-2">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
          
          {isDragActive ? (
            <p className="text-sm">
              {isDragReject ? 'Invalid file type' : 'Drop files here'}
            </p>
          ) : (
            <div>
              <p className="text-sm font-medium">
                Drag & drop files here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                {accept ? `Accepts: ${Object.keys(accept).join(', ')}` : 'All file types'} 
                {' • '}Max size: {Math.round(maxSize / (1024 * 1024))}MB
                {multiple && ' • Multiple files allowed'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {Object.entries(uploadProgress).map(([fileId, progress]) => {
        const fileName = fileId.split('-')[0];
        return (
          <div key={fileId} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate">{fileName}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        );
      })}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Uploaded Files</Label>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <FileIcon className="h-4 w-4" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(file.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUploadedFiles(prev => prev.filter(f => f.id !== file.id));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Upload Resumption Strategies

```jsx
function useResumableUpload() {
  const [uploadSessions, setUploadSessions] = useState({});

  const createUploadSession = async (file) => {
    const sessionId = `${file.name}-${file.size}-${Date.now()}`;
    
    try {
      const response = await fetch('/api/v1/upload/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create upload session');
      }

      const session = await response.json();
      setUploadSessions(prev => ({ ...prev, [sessionId]: session }));
      
      return { sessionId, session };
    } catch (error) {
      throw new Error(`Failed to create upload session: ${error.message}`);
    }
  };

  const uploadChunk = async (sessionId, chunk, chunkIndex, onProgress) => {
    const session = uploadSessions[sessionId];
    if (!session) throw new Error('Upload session not found');

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('sessionId', sessionId);

    const response = await fetch('/api/v1/upload/chunk', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Chunk upload failed: ${response.statusText}`);
    }

    return response.json();
  };

  const resumeUpload = async (file, onProgress) => {
    const chunkSize = 1024 * 1024; // 1MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    const { sessionId } = await createUploadSession(file);
    
    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        
        await uploadChunk(sessionId, chunk, i, onProgress);
        
        const progress = ((i + 1) / totalChunks) * 100;
        onProgress?.(progress);
      }

      // Complete upload
      const response = await fetch(`/api/v1/upload/complete/${sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to complete upload');
      }

      return response.json();
    } catch (error) {
      // Store session for potential resume
      localStorage.setItem(`upload_session_${sessionId}`, JSON.stringify({
        sessionId,
        fileName: file.name,
        fileSize: file.size,
        timestamp: Date.now()
      }));
      
      throw error;
    }
  };

  return {
    resumeUpload,
    uploadSessions
  };
}
```

## Rate Limit Handling

### Graceful 429 Error Handling with Retry Logic

```jsx
function useRateLimitHandler() {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);

  const handleRequest = async (requestFn, options = {}) => {
    const {
      maxRetries = 3,
      backoffMultiplier = 2,
      initialDelay = 1000
    } = options;

    let retryCount = 0;
    let delay = initialDelay;

    while (retryCount <= maxRetries) {
      try {
        const response = await requestFn();
        
        if (response.status === 429) {
          const retryAfterHeader = response.headers.get('Retry-After');
          const retryAfterMs = retryAfterHeader 
            ? parseInt(retryAfterHeader) * 1000 
            : delay;

          setIsRateLimited(true);
          setRetryAfter(retryAfterMs);

          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryAfterMs));
            retryCount++;
            delay *= backoffMultiplier;
            continue;
          } else {
            throw new Error('Request rate limit exceeded. Please try again later.');
          }
        }

        setIsRateLimited(false);
        setRetryAfter(0);
        return response;
      } catch (error) {
        if (retryCount >= maxRetries) {
          throw error;
        }
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= backoffMultiplier;
      }
    }
  };

  return {
    handleRequest,
    isRateLimited,
    retryAfter
  };
}

// Usage in form submission
function WorkoutGenerationForm() {
  const form = useWorkoutForm();
  const { handleRequest, isRateLimited, retryAfter } = useRateLimitHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    
    try {
      await handleRequest(async () => {
        return fetch('/api/v1/workouts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: JSON.stringify(data)
        });
      });
      
      toast.success('Workout generated successfully!');
    } catch (error) {
      if (error.message.includes('rate limit')) {
        toast.error('Too many requests. Please wait before trying again.');
      } else {
        toast.error('Failed to generate workout. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
      
      {isRateLimited && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Rate limit reached</AlertTitle>
          <AlertDescription>
            Please wait {Math.ceil(retryAfter / 1000)} seconds before trying again.
          </AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || isRateLimited}
        className="w-full"
      >
        {isSubmitting ? 'Generating...' : 'Generate Workout'}
      </Button>
    </form>
  );
}
```

### User-Friendly Error Messages

```jsx
function getErrorMessage(error, context = 'form') {
  const errorMessages = {
    429: {
      form: 'You\'re submitting too quickly. Please wait a moment and try again.',
      auth: 'Too many login attempts. Please wait before trying again.',
      upload: 'Upload rate limit reached. Please wait before uploading more files.'
    },
    400: {
      form: 'Please check your input and try again.',
      auth: 'Invalid credentials provided.',
      upload: 'Invalid file format or size.'
    },
    401: {
      form: 'Your session has expired. Please log in again.',
      auth: 'Invalid credentials. Please check your email and password.',
      upload: 'Authentication required. Please log in.'
    },
    403: {
      form: 'You don\'t have permission to perform this action.',
      auth: 'Account access is restricted.',
      upload: 'File upload not permitted.'
    },
    500: {
      form: 'Something went wrong on our end. Please try again.',
      auth: 'Server error. Please try again later.',
      upload: 'Upload failed due to server error.'
    }
  };

  const statusCode = error.status || error.response?.status;
  const contextMessages = errorMessages[statusCode];
  
  if (contextMessages) {
    return contextMessages[context] || contextMessages.form;
  }
  
  return error.message || 'An unexpected error occurred. Please try again.';
}

// Usage in error boundary or form error handler
function FormErrorDisplay({ error, context = 'form' }) {
  const message = getErrorMessage(error, context);
  
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
```

## Testing Strategies

### Component Testing with React Testing Library

```jsx
// tests/components/forms/RegistrationForm.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import RegistrationForm from '../RegistrationForm';

expect.extend(toHaveNoViolations);

describe('RegistrationForm', () => {
  test('renders all required fields', () => {
    render(<RegistrationForm />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  test('validates email format', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    
    // Enter invalid email
    await user.type(emailInput, 'invalid-email');
    await user.tab(); // Trigger onBlur validation
    
    await waitFor(() => {
      expect(screen.getByText(/please provide a valid email address/i)).toBeInTheDocument();
    });
  });

  test('validates password requirements', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    
    // Enter weak password
    await user.type(passwordInput, 'weak');
    await user.tab();
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  test('handles successful form submission', async () => {
    const user = userEvent.setup();
    const mockSubmit = jest.fn().mockResolvedValue({ success: true });
    
    render(<RegistrationForm onSubmit={mockSubmit} />);
    
    // Fill out form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'SecurePass123!');
    await user.type(screen.getByLabelText(/name/i), 'Test User');
    
    // Submit form
    await user.click(screen.getRole('button', { name: /sign up/i }));
    
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      });
    });
  });

  test('handles server validation errors', async () => {
    const user = userEvent.setup();
    const mockSubmit = jest.fn().mockRejectedValue({
      status: 400,
      errors: [
        { field: 'email', message: 'Email already exists' }
      ]
    });
    
    render(<RegistrationForm onSubmit={mockSubmit} />);
    
    // Fill and submit form
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/password/i), 'SecurePass123!');
    await user.click(screen.getRole('button', { name: /sign up/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
    });
  });

  test('is accessible', async () => {
    const { container } = render(<RegistrationForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Accessibility Testing with Jest-Axe

```jsx
// tests/utils/accessibility.js
import { axe } from 'jest-axe';

export const runAccessibilityTests = async (component, options = {}) => {
  const { container } = render(component);
  
  // Test initial render
  let results = await axe(container, options);
  expect(results).toHaveNoViolations();
  
  return { container, results };
};

export const testFormAccessibility = async (FormComponent, props = {}) => {
  const { container } = await runAccessibilityTests(<FormComponent {...props} />);
  
  // Test with error states
  const inputs = container.querySelectorAll('input, select, textarea');
  for (const input of inputs) {
    // Trigger validation error
    fireEvent.blur(input);
    await waitFor(() => {
      // Re-test with errors present
      return axe(container);
    }).then(results => {
      expect(results).toHaveNoViolations();
    });
  }
};

// Usage in tests
describe('Form Accessibility', () => {
  test('profile form meets accessibility standards', async () => {
    await testFormAccessibility(ProfileForm);
  });
  
  test('workout form with errors is accessible', async () => {
    const { container } = render(<WorkoutForm />);
    
    // Trigger all validation errors
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(async () => {
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
```

### Form Submission Flow Testing

```jsx
// tests/flows/workout-generation.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import WorkoutGenerationFlow from '../WorkoutGenerationFlow';

const server = setupServer(
  rest.post('/api/v1/workouts', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        workoutId: 'test-workout-123',
        plan: {
          exercises: [
            { name: 'Push-ups', sets: 3, reps: 10 },
            { name: 'Squats', sets: 3, reps: 15 }
          ]
        }
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Workout Generation Flow', () => {
  test('complete workout generation flow', async () => {
    const user = userEvent.setup();
    render(<WorkoutGenerationFlow />);
    
    // Step 1: Select fitness level
    await user.click(screen.getByRole('radio', { name: /intermediate/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    
    // Step 2: Select goals
    await user.click(screen.getByRole('checkbox', { name: /build muscle/i }));
    await user.click(screen.getByRole('checkbox', { name: /lose weight/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    
    // Step 3: Select equipment
    await user.click(screen.getByRole('checkbox', { name: /dumbbells/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    
    // Step 4: Additional preferences
    await user.type(
      screen.getByLabelText(/additional notes/i),
      'Focus on compound movements'
    );
    
    // Submit
    await user.click(screen.getByRole('button', { name: /generate workout/i }));
    
    // Verify loading state
    expect(screen.getByText(/generating/i)).toBeInTheDocument();
    
    // Wait for success
    await waitFor(() => {
      expect(screen.getByText(/workout generated successfully/i)).toBeInTheDocument();
    });
    
    // Verify workout display
    expect(screen.getByText(/push-ups/i)).toBeInTheDocument();
    expect(screen.getByText(/squats/i)).toBeInTheDocument();
  });

  test('handles rate limit errors gracefully', async () => {
    server.use(
      rest.post('/api/v1/workouts', (req, res, ctx) => {
        return res(
          ctx.status(429),
          ctx.set('Retry-After', '30'),
          ctx.json({ message: 'Too many requests' })
        );
      })
    );

    const user = userEvent.setup();
    render(<WorkoutGenerationFlow />);
    
    // Fill form and submit
    await user.click(screen.getByRole('radio', { name: /beginner/i }));
    await user.click(screen.getByRole('button', { name: /generate workout/i }));
    
    // Verify rate limit message
    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
    });
  });
});
```

## Common Pitfalls

### 1. Over-Validation

```jsx
// ❌ Bad: Too aggressive validation
function BadEmailField() {
  return (
    <Controller
      name="email"
      control={control}
      rules={{
        required: 'Email is required',
        pattern: {
          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
          message: 'Invalid email'
        },
        validate: {
          noDisposable: value => 
            !value.includes('tempmail') || 'Disposable emails not allowed',
          mustBeGmail: value =>
            value.includes('gmail.com') || 'Must be Gmail address'
        }
      }}
      render={({ field, fieldState }) => (
        // Validates on every keystroke - annoying!
        <Input {...field} onBlur={field.onBlur} onChange={(e) => {
          field.onChange(e);
          field.onBlur(); // Triggers validation immediately
        }} />
      )}
    />
  );
}

// ✅ Good: Balanced validation
function GoodEmailField() {
  return (
    <Controller
      name="email"
      control={control}
      rules={{
        required: 'Email is required',
        pattern: {
          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
          message: 'Please enter a valid email address'
        }
      }}
      render={({ field, fieldState }) => (
        <Input 
          {...field} 
          // Only validate on blur for better UX
          aria-invalid={fieldState.invalid}
        />
      )}
    />
  );
}
```

### 2. Poor Error Display

```jsx
// ❌ Bad: Generic error display
function BadErrorDisplay({ errors }) {
  return (
    <div className="text-red-500">
      {Object.keys(errors).length > 0 && (
        <p>Please fix the errors below</p>
      )}
    </div>
  );
}

// ✅ Good: Specific, helpful error display
function GoodErrorDisplay({ fieldState, fieldName }) {
  if (!fieldState.error) return null;
  
  return (
    <div className="flex items-start space-x-2 mt-1">
      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
      <p 
        className="text-sm text-red-600"
        role="alert"
        aria-live="polite"
        id={`${fieldName}-error`}
      >
        {fieldState.error.message}
      </p>
    </div>
  );
}
```

### 3. Missing ARIA Attributes

```jsx
// ❌ Bad: No accessibility support
function BadFormField({ name, label, error, children }) {
  return (
    <div>
      <label>{label}</label>
      {children}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

// ✅ Good: Proper ARIA implementation
function GoodFormField({ name, label, error, required, children }) {
  const errorId = `${name}-error`;
  const helpId = `${name}-help`;
  
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        )}
      </Label>
      
      {React.cloneElement(children, {
        id: name,
        'aria-invalid': !!error,
        'aria-describedby': error ? errorId : undefined,
        'aria-required': required
      })}
      
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

### 4. Inefficient Re-Renders

```jsx
// ❌ Bad: Causes unnecessary re-renders
function BadForm() {
  const form = useForm();
  const allValues = form.watch(); // Watches everything!
  
  return (
    <form>
      {/* Every field change triggers re-render of entire form */}
      <pre>{JSON.stringify(allValues, null, 2)}</pre>
      {/* Form fields */}
    </form>
  );
}

// ✅ Good: Optimized watching
function GoodForm() {
  const form = useForm();
  const specificValue = form.watch('email'); // Only watch what you need
  
  return (
    <form>
      {/* Only re-renders when email changes */}
      <EmailPreview email={specificValue} />
      {/* Form fields */}
    </form>
  );
}
```

## Integration Examples

### Complete Profile Form Integration

```jsx
// components/forms/ProfileForm.jsx
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema } from '@/lib/validation';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useProfile } from '@/hooks/useProfile';

export function ProfileForm() {
  const { profile, updateProfile, isLoading } = useProfile();
  
  const form = useForm({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    defaultValues: profile || {
      name: '',
      age: null,
      height: null,
      weight: null,
      unitPreference: 'metric',
      experienceLevel: null,
      goals: [],
      equipment: [],
      medicalConditions: []
    }
  });

  const watchedData = form.watch();
  const { clearSavedData } = useAutoSave(watchedData, 'profile');

  const onSubmit = async (data) => {
    try {
      await updateProfile(data);
      clearSavedData();
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile. Please try again.');
    }
  };

  if (isLoading) {
    return <ProfileFormSkeleton />;
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Tell us about yourself to personalize your experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <BasicInfoFields />
            <HeightField />
            <ExperienceLevelField />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fitness Goals</CardTitle>
            <CardDescription>
              What do you want to achieve with your fitness journey?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <GoalsField />
            <EquipmentField />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health Information</CardTitle>
            <CardDescription>
              This information helps us create safer, more effective workouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MedicalConditionsField />
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => form.reset()}
          >
            Reset
          </Button>
          <Button 
            type="submit" 
            disabled={form.formState.isSubmitting}
            className="min-w-[120px]"
          >
            {form.formState.isSubmitting ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
```

This comprehensive form patterns documentation provides a solid foundation for implementing consistent, accessible, and user-friendly forms throughout the trAIner AI Fitness App. The patterns established here should be followed across all form implementations to ensure a cohesive user experience. 