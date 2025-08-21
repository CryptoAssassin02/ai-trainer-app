/**
 * Shared Profile Form Business Logic
 * Extracted common patterns between UserProfileForm and MultiStepProfileForm
 * Maintains component separation while reducing code duplication
 * 
 * Following React 2025 best practices:
 * - Single Responsibility Principle
 * - Custom hooks for shared logic
 * - Component composition over inheritance
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/lib/api/types';

// ==========================================
// TYPES & INTERFACES
// ==========================================

interface UseProfileFormLogicProps {
  mode: 'create' | 'edit';
  onSuccess?: (profile: UserProfile) => void | Promise<void>;
  onCancel?: () => void;
  redirectOnSuccess?: string;
  redirectOnCancel?: string;
  enableAutoSave?: boolean;
}

interface ProfileFormState {
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string | null;
  successMessage: string | null;
}

interface UseProfileFormLogicReturn {
  // State
  formState: ProfileFormState;
  
  // Actions
  handleSuccess: (profile: UserProfile) => Promise<void>;
  handleCancel: () => void;
  handleFormSubmit: <T>(submitFunction: () => Promise<T>) => Promise<T>;
  setFormError: (error: string | null) => void;
  setSuccessMessage: (message: string | null) => void;
  resetFormState: () => void;
  
  // Computed values
  isCreateMode: boolean;
  isEditMode: boolean;
}

// ==========================================
// SHARED BUSINESS LOGIC HOOK
// ==========================================

export function useProfileFormLogic({
  mode,
  onSuccess,
  onCancel,
  redirectOnSuccess,
  redirectOnCancel,
  enableAutoSave = false,
}: UseProfileFormLogicProps): UseProfileFormLogicReturn {
  const router = useRouter();
  
  // Form state management
  const [formState, setFormState] = useState<ProfileFormState>({
    isSubmitting: false,
    isSuccess: false,
    error: null,
    successMessage: null,
  });

  // Computed values
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';

  // ==========================================
  // SUCCESS HANDLING
  // ==========================================
  
  const handleSuccess = useCallback(async (profile: UserProfile) => {
    try {
      // Set success state
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        isSuccess: true,
        error: null,
        successMessage: isCreateMode 
          ? 'Profile created successfully!' 
          : 'Profile updated successfully!',
      }));

      // Execute custom success callback if provided
      if (onSuccess) {
        await onSuccess(profile);
      } 
      // Otherwise use redirect if specified
      else if (redirectOnSuccess) {
        // Small delay to show success message
        setTimeout(() => {
          router.push(redirectOnSuccess);
        }, 1500);
      }
    } catch (error) {
      console.error('Success handler error:', error);
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        isSuccess: false,
        error: 'An error occurred after saving. Please refresh the page.',
      }));
    }
  }, [onSuccess, redirectOnSuccess, router, isCreateMode]);

  // ==========================================
  // CANCEL HANDLING
  // ==========================================
  
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else if (redirectOnCancel) {
      router.push(redirectOnCancel);
    }
  }, [onCancel, redirectOnCancel, router]);

  // ==========================================
  // FORM SUBMISSION WRAPPER
  // ==========================================
  
  const handleFormSubmit = useCallback(async <T>(
    submitFunction: () => Promise<T>
  ): Promise<T> => {
    // Set submitting state
    setFormState(prev => ({
      ...prev,
      isSubmitting: true,
      error: null,
      successMessage: null,
    }));

    try {
      // Execute the submission function
      const result = await submitFunction();
      
      // Note: Success handling is done by the component after getting the result
      // This allows the component to handle the specific profile data
      
      return result;
    } catch (error) {
      // Handle submission errors
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred. Please try again.';
      
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        isSuccess: false,
        error: errorMessage,
      }));
      
      throw error; // Re-throw to allow component-specific error handling
    }
  }, []);

  // ==========================================
  // STATE SETTERS
  // ==========================================
  
  const setFormError = useCallback((error: string | null) => {
    setFormState(prev => ({
      ...prev,
      error,
      successMessage: error ? null : prev.successMessage, // Clear success if error
    }));
  }, []);

  const setSuccessMessage = useCallback((message: string | null) => {
    setFormState(prev => ({
      ...prev,
      successMessage: message,
      error: message ? null : prev.error, // Clear error if success
    }));
  }, []);

  const resetFormState = useCallback(() => {
    setFormState({
      isSubmitting: false,
      isSuccess: false,
      error: null,
      successMessage: null,
    });
  }, []);

  // ==========================================
  // RETURN INTERFACE
  // ==========================================
  
  return {
    // State
    formState,
    
    // Actions
    handleSuccess,
    handleCancel,
    handleFormSubmit,
    setFormError,
    setSuccessMessage,
    resetFormState,
    
    // Computed values
    isCreateMode,
    isEditMode,
  };
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Get default success redirect based on mode
 */
export function getDefaultSuccessRedirect(mode: 'create' | 'edit'): string {
  return mode === 'create' ? '/profile' : '/';
}

/**
 * Get default cancel redirect based on mode
 */
export function getDefaultCancelRedirect(mode: 'create' | 'edit'): string {
  return '/';
}

/**
 * Generate success message based on mode and context
 */
export function generateSuccessMessage(
  mode: 'create' | 'edit',
  context?: 'auto-save' | 'manual'
): string {
  if (context === 'auto-save') {
    return 'Changes saved automatically';
  }
  
  return mode === 'create' 
    ? 'Profile created successfully!' 
    : 'Profile updated successfully!';
}
