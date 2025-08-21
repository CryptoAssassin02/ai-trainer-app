/**
 * Enhanced Field Validation Component
 * Phase 2.1.4 - Real-time validation feedback with accessibility improvements
 */

'use client';

import React from 'react';
import { useFormState, useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Check, AlertCircle, Loader2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
// Temporarily disabled Tooltip imports to prevent Radix UI infinite loops
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ValidationIndicatorProps {
  fieldName: string;
  form?: any; // Made optional since we can use context
  showSuccess?: boolean;
  showLoading?: boolean;
  className?: string;
}

export function ValidationIndicator({ 
  fieldName, 
  form, 
  showSuccess = true, 
  showLoading = false,
  className 
}: ValidationIndicatorProps) {
  // Use form context if no form prop provided
  const contextForm = useFormContext();
  const activeForm = form || contextForm;
  
  // All hooks must be called unconditionally - use dummy control if needed
  const dummyControl = {} as any; // Fallback control object
  const formState = useFormState({ control: activeForm?.control || dummyControl });
  
  // Return null if no form available (early return for safety)
  if (!activeForm?.control) {
    return null;
  }
  
  const { errors, dirtyFields, isValidating } = formState;
  
  const fieldError = errors[fieldName];
  const isDirty = dirtyFields[fieldName];
  const isValid = isDirty && !fieldError;
  const isLoading = isValidating || showLoading;

  if (isLoading) {
    return (
      <div className={cn("inline-flex items-center", className)} title="Validating...">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (fieldError) {
    return (
      <div className={cn("inline-flex items-center", className)} title={`Error: ${String(fieldError?.message || 'Validation error')}`}>
        <AlertCircle className="h-4 w-4 text-red-500" />
      </div>
    );
  }

  if (isValid && showSuccess) {
    return (
      <div className={cn("inline-flex items-center", className)} title="Valid ✓">
        <Check className="h-4 w-4 text-green-500" />
      </div>
    );
  }

  return null;
}

interface FieldStatusBadgeProps {
  fieldName: string;
  form?: any;
  requiredFields?: string[];
  className?: string;
}

export function FieldStatusBadge({ 
  fieldName, 
  form, 
  requiredFields = [],
  className 
}: FieldStatusBadgeProps) {
  // Use form context if no form prop provided
  const contextForm = useFormContext();
  const activeForm = form || contextForm;
  
  // All hooks must be called unconditionally - use dummy control if needed
  const dummyControl = {} as any; // Fallback control object
  const formState = useFormState({ control: activeForm?.control || dummyControl });
  const fieldValue = activeForm?.control ? activeForm.watch(fieldName) : undefined;
  
  // Return null if no form available
  if (!activeForm?.control || !formState) {
    return null;
  }
  
  const { errors, dirtyFields } = formState;
  
  const isRequired = requiredFields.includes(fieldName);
  const hasError = errors[fieldName];
  const isDirty = dirtyFields[fieldName];
  const hasValue = fieldValue !== undefined && fieldValue !== null && fieldValue !== '' && 
                  !(Array.isArray(fieldValue) && fieldValue.length === 0);

  let status: 'required' | 'optional' | 'completed' | 'error' = 'optional';
  let statusText = 'Optional';

  if (hasError) {
    status = 'error';
    statusText = 'Error';
  } else if (hasValue) {
    // Consider field completed if it has a value, regardless of dirty state
    // This handles cases where fields are pre-populated (like name from auth context)
    status = 'completed';
    statusText = 'Completed';
  } else if (isRequired) {
    status = 'required';
    statusText = 'Required';
  }

  const variants = {
    required: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    optional: 'bg-gray-100 text-gray-600 border-gray-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    error: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(variants[status], "text-xs", className)}
    >
      {statusText}
    </Badge>
  );
}

interface ValidationFeedbackProps {
  fieldName: string;
  form?: any;
  helpText?: string;
  validationRules?: string[];
  showProgressiveHints?: boolean;
  className?: string;
}

export function ValidationFeedback({ 
  fieldName, 
  form, 
  helpText,
  validationRules = [],
  showProgressiveHints = true,
  className 
}: ValidationFeedbackProps) {
  // Use form context if no form prop provided
  const contextForm = useFormContext();
  const activeForm = form || contextForm;
  
  // All hooks must be called unconditionally - use dummy control if needed
  const dummyControl = {} as any; // Fallback control object
  const formState = useFormState({ control: activeForm?.control || dummyControl });
  const fieldValue = activeForm?.control ? activeForm.watch(fieldName) : undefined;
  
  // Return null if no form available
  if (!activeForm?.control || !formState) {
    return null;
  }
  
  const { errors, dirtyFields, touchedFields } = formState;
  
  const fieldError = errors[fieldName];
  const isDirty = dirtyFields[fieldName];
  const isTouched = touchedFields[fieldName];
  const shouldShowHints = showProgressiveHints && (isDirty || isTouched);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Help text */}
      {helpText && !fieldError && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>{helpText}</p>
        </div>
      )}

      {/* Validation rules progress */}
      {validationRules.length > 0 && shouldShowHints && !fieldError && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Requirements:</p>
          <ul className="space-y-1">
            {validationRules.map((rule, index) => {
              // You can add custom logic here to check if each rule is satisfied
              const isSatisfied = !!fieldValue; // Simplified check
              return (
                <li key={index} className="flex items-center gap-2 text-xs">
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    isSatisfied ? "bg-green-500" : "bg-gray-300"
                  )} />
                  <span className={cn(
                    isSatisfied ? "text-green-700" : "text-muted-foreground"
                  )}>
                    {rule}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Error message */}
      {fieldError && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Validation Error</p>
            <p>{String(fieldError?.message || 'Validation error')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface StepValidationSummaryProps {
  form?: any;
  stepFields: string[];
  requiredFields?: string[];
  className?: string;
}

export function StepValidationSummary({ 
  form, 
  stepFields, 
  requiredFields = [],
  className 
}: StepValidationSummaryProps) {
  // Use form context if no form prop provided
  const contextForm = useFormContext();
  const activeForm = form || contextForm;
  
  // All hooks must be called unconditionally - use dummy control if needed
  const dummyControl = {} as any; // Fallback control object
  const formState = useFormState({ control: activeForm?.control || dummyControl });
  const watchedValues = activeForm?.control ? 
    stepFields.reduce((acc, field) => {
      acc[field] = activeForm.watch(field);
      return acc;
    }, {} as Record<string, any>) : {};
  
  // Return null if no form available
  if (!activeForm?.control || !formState) {
    return null;
  }
  
  const { errors, dirtyFields } = formState;
  
  const stepErrors = stepFields.filter(field => errors[field]);
  const completedFields = stepFields.filter(field => {
    const value = watchedValues[field];
    const isDirty = dirtyFields[field];
    const hasValue = value !== undefined && value !== null && value !== '' && 
                    !(Array.isArray(value) && value.length === 0);
    // Consider field completed if it has a value and no errors, regardless of dirty state
    // This handles cases where fields are pre-populated (like name from auth context)
    return hasValue && !errors[field];
  });
  
  const requiredStepFields = stepFields.filter(field => requiredFields.includes(field));
  const completedRequiredFields = requiredStepFields.filter(field => 
    completedFields.includes(field)
  );

  const isStepValid = stepErrors.length === 0;
  const isStepComplete = requiredStepFields.length === 0 || 
                         completedRequiredFields.length === requiredStepFields.length;

  if (stepErrors.length === 0 && isStepComplete) return null;

  return (
    <div className={cn("p-4 bg-muted/50 rounded-lg border", className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm">Step Progress</h4>
        <div className="flex items-center gap-2">
          <Badge variant={isStepValid ? "default" : "destructive"}>
            {isStepValid ? "Valid" : `${stepErrors.length} error${stepErrors.length > 1 ? 's' : ''}`}
          </Badge>
          {requiredStepFields.length > 0 && (
            <Badge variant={isStepComplete ? "default" : "secondary"}>
              {completedRequiredFields.length}/{requiredStepFields.length} required
            </Badge>
          )}
        </div>
      </div>

      {/* Error summary */}
      {stepErrors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-red-600">Please fix the following issues:</p>
          <ul className="space-y-1">
            {stepErrors.map((field) => (
              <li key={field} className="flex items-start gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span className="ml-1">{String(errors[field]?.message || 'Validation error')}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Completion progress */}
      {stepErrors.length === 0 && !isStepComplete && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-600">Required fields remaining:</p>
          <ul className="space-y-1">
            {requiredStepFields
              .filter(field => !completedRequiredFields.includes(field))
              .map((field) => (
                <li key={field} className="flex items-center gap-2 text-sm text-amber-600">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                </li>
              ))
            }
          </ul>
        </div>
      )}
    </div>
  );
}
