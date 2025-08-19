/**
 * Profile Auto-save Hook
 * Phase 2.1.4 - Auto-save functionality with optimistic updates and conflict resolution
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useProfile } from './use-profile-queries';
import { toast } from 'sonner';
import { UserProfile } from '@/lib/api/types';

interface AutoSaveOptions {
  enabled?: boolean;
  debounceMs?: number;
  enableOptimistic?: boolean;
  enableConflictResolution?: boolean;
  onSaveSuccess?: (data: any) => void;
  onSaveError?: (error: Error) => void;
  onConflict?: (serverData: any, localData: any) => any;
}

interface AutoSaveState {
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: Error | null;
  hasConflict: boolean;
  conflictData?: any;
}

export function useProfileAutoSave(
  form: UseFormReturn<any>,
  options: AutoSaveOptions = {}
) {
  const {
    enabled = true,
    debounceMs = 2000,
    enableOptimistic = true,
    enableConflictResolution = true,
    onSaveSuccess,
    onSaveError,
    onConflict,
  } = options;

  // State management
  const [state, setState] = useState<AutoSaveState>({
    isDirty: false,
    isSaving: false,
    lastSaved: null,
    saveError: null,
    hasConflict: false,
  });

  // Refs for managing timeouts and tracking changes
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<any>(null);
  const isInitialLoadRef = useRef(true);

  // Profile hooks
  const { 
    profile, 
    updateProfile, 
    isUpdating,
    error: profileError 
  } = useProfile({
    enableOptimistic,
  });

  // Watch form changes with memoization
  const { errors, isValid, isDirty: formIsDirty } = form.formState;

  // Initialize data on first load (separate effect)
  useEffect(() => {
    if (isInitialLoadRef.current && profile.data) {
      isInitialLoadRef.current = false;
      lastSavedDataRef.current = profile.data;
    }
  }, [profile.data]);

  // Update dirty state based on form changes using subscription
  // FIXED: Removed setState from useEffect to prevent infinite loops
  useEffect(() => {
    const subscription = form.watch((value) => {
      // Only check for changes after initialization is complete
      if (!isInitialLoadRef.current && lastSavedDataRef.current) {
        const savedProfile = lastSavedDataRef.current as UserProfile;
        
        // Extract form fields from saved profile for comparison
        const savedFormData = {
          name: savedProfile.name,
          age: savedProfile.age,
          height: savedProfile.height,
          weight: savedProfile.weight,
          // Add other form fields as needed
        };
        
        const hasChanges = JSON.stringify(value) !== JSON.stringify(savedFormData);
        
        // FIXED: Use refs instead of setState to avoid infinite loops
        // Only update state if value actually changed
        setState(prev => {
          if (prev.isDirty !== hasChanges) {
            return { ...prev, isDirty: hasChanges };
          }
          return prev;
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []); // FIXED: Empty dependency array since form object changes on every render

  // REMOVED: Redundant useEffect that was causing infinite loops
  // The form.watch subscription above already handles dirty state changes

  // Auto-save logic
  useEffect(() => {
    if (!enabled || !state.isDirty || !isValid || Object.keys(errors).length > 0) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(async () => {
      await performAutoSave();
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.isDirty, isValid, enabled, debounceMs]);

  // Clean up timeouts
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Update saving state when mutation state changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isSaving: isUpdating,
    }));
  }, [isUpdating]);

  // Handle profile errors
  useEffect(() => {
    if (profileError) {
      setState(prev => ({
        ...prev,
        saveError: profileError,
        isSaving: false,
      }));

      onSaveError?.(profileError);
      toast.error('Auto-save failed', {
        description: profileError.message || 'Please try saving manually',
      });
    }
  }, [profileError, onSaveError]);

  // Perform auto-save
  const performAutoSave = async () => {
    if (!isValid || state.isSaving) return;

    try {
      setState(prev => ({ ...prev, isSaving: true, saveError: null }));

      const currentData = form.getValues();
      
      // Optimistic update would be handled by React Query mutation
      // The mutation already handles optimistic updates internally

      // Check for conflicts if enabled
      if (enableConflictResolution && profile.data) {
        const hasConflict = await detectConflict(currentData);
        if (hasConflict) {
          return;
        }
      }

      // Perform the actual save
      await updateProfile(currentData);

      // Update state on success
      setState(prev => ({
        ...prev,
        isDirty: false,
        isSaving: false,
        lastSaved: new Date(),
        saveError: null,
        hasConflict: false,
      }));

      lastSavedDataRef.current = currentData;
      onSaveSuccess?.(currentData);

      // Show success toast (subtle)
      toast.success('Changes saved automatically', {
        duration: 2000,
      });

    } catch (error) {
      setState(prev => ({
        ...prev,
        isSaving: false,
        saveError: error as Error,
      }));

      // Error handling - optimistic updates are reverted by React Query automatically

      onSaveError?.(error as Error);
    }
  };

  // Detect conflicts between local and server data
  const detectConflict = async (localData: any): Promise<boolean> => {
    if (!profile.data) return false;

    // Simple conflict detection - check if server data was updated since last save
    const profileData = profile.data as UserProfile;
    if (!profileData?.updatedAt && !profileData?.createdAt) {
      return false; // No timestamp data available
    }
    
    const serverUpdatedAt = new Date(profileData.updatedAt || profileData.createdAt);
    const lastSavedAt = state.lastSaved;

    if (lastSavedAt && serverUpdatedAt > lastSavedAt) {
      // Conflict detected
      setState(prev => ({
        ...prev,
        hasConflict: true,
        conflictData: profile.data,
        isSaving: false,
      }));

      // Allow custom conflict resolution
      if (onConflict) {
        const resolvedData = onConflict(profile.data, localData);
        if (resolvedData) {
          form.reset(resolvedData);
          setState(prev => ({ ...prev, hasConflict: false, conflictData: undefined }));
          return false;
        }
      }

      toast.warning('Conflict detected', {
        description: 'Your changes conflict with recent updates. Please review and resolve.',
        duration: 5000,
      });

      return true;
    }

    return false;
  };

  // Manual save function
  const saveNow = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await performAutoSave();
  };

  // Resolve conflict by choosing local or server data
  const resolveConflict = (choice: 'local' | 'server') => {
    if (!state.hasConflict || !state.conflictData) return;

    if (choice === 'server') {
      // Use server data
      form.reset(state.conflictData);
      lastSavedDataRef.current = state.conflictData;
    } else {
      // Keep local data and force save
      lastSavedDataRef.current = form.getValues();
    }

    setState(prev => ({
      ...prev,
      hasConflict: false,
      conflictData: undefined,
      isDirty: choice === 'local',
    }));

    if (choice === 'local') {
      saveNow();
    }
  };

  // Disable auto-save temporarily
  const pauseAutoSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  };

  // Resume auto-save
  const resumeAutoSave = () => {
    if (state.isDirty && isValid) {
      saveTimeoutRef.current = setTimeout(performAutoSave, debounceMs);
    }
  };

  return {
    // State
    isDirty: state.isDirty,
    isSaving: state.isSaving,
    lastSaved: state.lastSaved,
    saveError: state.saveError,
    hasConflict: state.hasConflict,
    conflictData: state.conflictData,
    
    // Actions
    saveNow,
    resolveConflict,
    pauseAutoSave,
    resumeAutoSave,
    
    // Status helpers
    canSave: state.isDirty && isValid && !state.isSaving,
    isEnabled: enabled,
    
    // Display helpers
    statusText: state.isSaving ? 'Saving...' : 
                state.isDirty ? 'Unsaved changes' : 
                state.lastSaved ? `Saved ${formatLastSaved(state.lastSaved)}` : 
                'Up to date',
  };
}

// Helper function to format last saved time
function formatLastSaved(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}
