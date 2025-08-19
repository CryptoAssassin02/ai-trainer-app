/**
 * Standardized Profile Form Interfaces
 * Ensures consistent prop patterns across both form components
 * 
 * Following React 2025 best practices:
 * - Consistent interface design
 * - Type safety with TypeScript
 * - Extensible component props
 */

import React from 'react';
import type { UserProfile } from '@/lib/api/types';

// ==========================================
// BASE INTERFACES
// ==========================================

/**
 * Base props shared by all profile form components
 */
export interface BaseProfileFormProps {
  /** Form mode - determines behavior and validation */
  mode?: 'create' | 'edit';
  
  /** Enable automatic saving of form data */
  enableAutoSave?: boolean;
  
  /** Success callback with profile data */
  onSuccess?: (profile: UserProfile) => void | Promise<void>;
  
  /** Cancel callback */
  onCancel?: () => void;
  
  /** Redirect path on successful submission (alternative to onSuccess) */
  redirectOnSuccess?: string;
  
  /** Redirect path on cancel (alternative to onCancel) */
  redirectOnCancel?: string;
}

// ==========================================
// COMPONENT-SPECIFIC INTERFACES
// ==========================================

/**
 * Props specific to UserProfileForm (single-page edit form)
 */
export interface UserProfileFormProps extends BaseProfileFormProps {
  /** Show advanced options section */
  showAdvancedOptions?: boolean;
  
  /** Enable real-time validation feedback */
  enableRealTimeValidation?: boolean;
  
  /** Show form completion indicator */
  showCompletionIndicator?: boolean;
  
  /** Custom form title */
  title?: string;
  
  /** Custom form description */
  description?: string;
}

/**
 * Props specific to MultiStepProfileForm (multi-step creation form)
 */
export interface MultiStepProfileFormProps extends BaseProfileFormProps {
  /** Enable optimistic updates */
  enableOptimistic?: boolean;
  
  /** Initial step to start from (0-based index) */
  initialStep?: number;
  
  /** Show progress indicator */
  showProgress?: boolean;
  
  /** Allow skipping optional steps */
  allowSkipOptional?: boolean;
  
  /** Show step navigation */
  showStepNavigation?: boolean;
  
  /** Custom step configuration */
  customSteps?: FormStep[];
}

// ==========================================
// FORM STEP INTERFACE
// ==========================================

/**
 * Configuration for individual form steps in multi-step form
 */
export interface FormStep {
  /** Unique step identifier */
  id: string;
  
  /** Display title */
  title: string;
  
  /** Step description */
  description: string;
  
  /** Icon component */
  icon: React.ComponentType<{ className?: string }>;
  
  /** Step component */
  component: React.ComponentType<any>;
  
  /** Form fields included in this step */
  fields: string[];
  
  /** Whether this step is optional */
  optional?: boolean;
  
  /** Custom validation for this step */
  validate?: (data: any) => boolean | string;
}

// ==========================================
// FORM STATE INTERFACES
// ==========================================

/**
 * Standard form state structure
 */
export interface ProfileFormState {
  /** Whether form is currently submitting */
  isSubmitting: boolean;
  
  /** Whether submission was successful */
  isSuccess: boolean;
  
  /** Current error message */
  error: string | null;
  
  /** Current success message */
  successMessage: string | null;
}

/**
 * Extended form state for multi-step forms
 */
export interface MultiStepFormState extends ProfileFormState {
  /** Current active step */
  currentStep: number;
  
  /** Set of completed step indices */
  completedSteps: Set<number>;
  
  /** Whether form can proceed to next step */
  canProceed: boolean;
  
  /** Step-specific validation errors */
  stepErrors: Record<number, string[]>;
}

// ==========================================
// CALLBACK INTERFACES
// ==========================================

/**
 * Success callback with additional context
 */
export interface ProfileFormSuccessCallback {
  (profile: UserProfile, context?: {
    mode: 'create' | 'edit';
    isAutoSave?: boolean;
    completedSteps?: number[];
  }): void | Promise<void>;
}

/**
 * Error callback with detailed error information
 */
export interface ProfileFormErrorCallback {
  (error: {
    message: string;
    code?: string;
    field?: string;
    step?: number;
  }): void;
}

// ==========================================
// CONFIGURATION INTERFACES
// ==========================================

/**
 * Auto-save configuration
 */
export interface AutoSaveConfig {
  /** Enable auto-save functionality */
  enabled: boolean;
  
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  
  /** Fields to exclude from auto-save */
  excludeFields?: string[];
  
  /** Success callback for auto-save */
  onSuccess?: (data: any) => void;
  
  /** Error callback for auto-save */
  onError?: (error: Error) => void;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  /** Enable real-time validation */
  realTime: boolean;
  
  /** Validation mode */
  mode: 'onChange' | 'onBlur' | 'onSubmit';
  
  /** Show validation on pristine fields */
  showOnPristine?: boolean;
  
  /** Custom validation messages */
  customMessages?: Record<string, string>;
}

// ==========================================
// UTILITY TYPES
// ==========================================

/**
 * Form mode type guard
 */
export function isCreateMode(mode: string): mode is 'create' {
  return mode === 'create';
}

/**
 * Form mode type guard
 */
export function isEditMode(mode: string): mode is 'edit' {
  return mode === 'edit';
}

/**
 * Default props for UserProfileForm
 */
export const DEFAULT_USER_PROFILE_FORM_PROPS: Partial<UserProfileFormProps> = {
  mode: 'edit',
  enableAutoSave: true,
  showAdvancedOptions: true,
  enableRealTimeValidation: true,
  showCompletionIndicator: true,
};

/**
 * Default props for MultiStepProfileForm
 */
export const DEFAULT_MULTI_STEP_FORM_PROPS: Partial<MultiStepProfileFormProps> = {
  mode: 'create',
  enableAutoSave: false,
  enableOptimistic: true,
  initialStep: 0,
  showProgress: true,
  allowSkipOptional: true,
  showStepNavigation: true,
};
