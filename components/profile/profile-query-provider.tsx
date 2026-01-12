/**
 * Profile Query Provider
 * Comprehensive integration of React Query hooks with profile management
 */

'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useProfile, 
  profileQueryKeys, 
  profileCacheUtils 
} from '@/hooks/use-profile-queries';
import { 
  useProfileAuthSync, 
  useProfileBackgroundSync, 
  setupProfileQueryDefaults,
  useProfileCompletion,
  useProfileValidation
} from '@/hooks/use-profile-advanced';
import { useAuth } from '@/components/auth/supabase-auth-provider';
import type { UserProfile, ProfilePreferences, UpdateProfileRequest, UpdatePreferencesRequest } from '@/lib/api/types';

// ==========================================
// CONTEXT DEFINITION
// ==========================================

interface ProfileQueryContextValue {
  // Data
  profile: UserProfile | undefined;
  preferences: ProfilePreferences | undefined;
  completion: ReturnType<typeof useProfileCompletion>;
  validation: ReturnType<typeof useProfileValidation>;
  
  // Loading states
  isLoading: boolean;
  isFetching: boolean;
  isUpdating: boolean;
  
  // Error states
  error: Error | null;
  isError: boolean;
  updateError: Error | null;
  
  // Actions
  updateProfile: (data: UpdateProfileRequest) => void;
  updateProfileAsync: (data: UpdateProfileRequest) => Promise<UserProfile>;
  updatePreferences: (data: UpdatePreferencesRequest) => void;
  updatePreferencesAsync: (data: UpdatePreferencesRequest) => Promise<ProfilePreferences>;
  
  // Utilities
  refetch: () => Promise<any[]>;
  reset: () => void;
  clearCache: () => void;
  
  // Status helpers
  isProfileComplete: boolean;
  completionPercentage: number;
  missingFields: string[];
  validationScore: number;
  hasValidationErrors: boolean;
}

const ProfileQueryContext = createContext<ProfileQueryContextValue | null>(null);

// ==========================================
// PROVIDER COMPONENT
// ==========================================

interface ProfileQueryProviderProps {
  children: ReactNode;
  enableOptimistic?: boolean;
  enableBackgroundSync?: boolean;
  completionThreshold?: number;
  autoSetupDefaults?: boolean;
}

export function ProfileQueryProvider({
  children,
  enableOptimistic = true,
  enableBackgroundSync = process.env.NODE_ENV === 'production', // Disable in development to prevent auto-refresh
  completionThreshold = 80,
  autoSetupDefaults = true,
}: ProfileQueryProviderProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Detect if we're in profile creation mode
  const isCreateMode = typeof window !== 'undefined' && window.location.pathname.includes('/profile/create');
  
  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('🔍 [PROFILE QUERY PROVIDER] isCreateMode:', isCreateMode, 'pathname:', window.location.pathname);
  }

  // Set up query defaults once
  useEffect(() => {
    if (autoSetupDefaults) {
      setupProfileQueryDefaults(queryClient);
    }
  }, [queryClient, autoSetupDefaults]);

  // Core profile hooks
  const profileHooks = useProfile({
    enableOptimistic,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !isCreateMode, // Disable profile queries in create mode
  });
  
  // Debug logging for profile hook
  if (typeof window !== 'undefined') {
    console.log('🔍 [PROFILE QUERY PROVIDER] useProfile enabled:', !isCreateMode);
  }

  // Dependent queries
  const completion = useProfileCompletion({
    enabled: Boolean(user?.id && profileHooks.profile.data),
    threshold: completionThreshold,
  });

  const validation = useProfileValidation({
    enabled: Boolean(user?.id && profileHooks.profile.data && !isCreateMode), // Disable in create mode
    includePreferences: Boolean(profileHooks.profile.data && !isCreateMode), // Only include preferences if profile exists and not in create mode
  });

  // Background sync and auth integration
  useProfileAuthSync();
  useProfileBackgroundSync({
    enabled: enableBackgroundSync,
    onlineOnly: true,
  });

  // Utility functions
  const clearCache = () => {
    if (user?.id) {
      profileCacheUtils.clearProfileCache(queryClient, user.id);
    } else {
      profileCacheUtils.clearProfileCache(queryClient);
    }
  };

  // Context value
  const contextValue: ProfileQueryContextValue = {
    // Data
    profile: profileHooks.profile.data as UserProfile | undefined,
    preferences: profileHooks.preferences.data as ProfilePreferences | undefined,
    completion,
    validation,
    
    // Loading states
    isLoading: profileHooks.isLoading,
    isFetching: profileHooks.isFetching,
    isUpdating: profileHooks.isUpdating,
    
    // Error states - suppress errors in create mode for new users
    error: isCreateMode ? null : profileHooks.error,
    isError: isCreateMode ? false : profileHooks.isError,
    updateError: profileHooks.updateError,
    
    // Actions
    updateProfile: profileHooks.updateProfile,
    updateProfileAsync: profileHooks.updateProfileAsync,
    updatePreferences: profileHooks.updatePreferences,
    updatePreferencesAsync: profileHooks.updatePreferencesAsync,
    
    // Utilities
    refetch: profileHooks.refetch,
    reset: profileHooks.reset,
    clearCache,
    
    // Status helpers
    isProfileComplete: completion.data?.isComplete ?? false,
    completionPercentage: completion.data?.percentage ?? 0,
    missingFields: completion.data?.missingFields ?? [],
    validationScore: validation.data?.score ?? 0,
    hasValidationErrors: (validation.data?.errors?.length ?? 0) > 0,
  };

  return (
    <ProfileQueryContext.Provider value={contextValue}>
      {children}
    </ProfileQueryContext.Provider>
  );
}

// ==========================================
// HOOK FOR CONSUMING CONTEXT
// ==========================================

export function useProfileQueryContext(): ProfileQueryContextValue {
  const context = useContext(ProfileQueryContext);
  
  if (!context) {
    throw new Error('useProfileQueryContext must be used within a ProfileQueryProvider');
  }
  
  return context;
}

// ==========================================
// ENHANCED FORM INTEGRATION HOOKS
// ==========================================

/**
 * Enhanced hook for form integration with React Hook Form
 */
export function useProfileForm(options?: {
  mode?: 'create' | 'update';
  enableOptimistic?: boolean;
  onSuccess?: (data: UserProfile) => void;
  onError?: (error: Error) => void;
}) {
  const { 
    profile, 
    preferences, 
    updateProfile, 
    updateProfileAsync,
    isLoading, 
    isUpdating,
    error 
  } = useProfileQueryContext();

  // Default values for form initialization
  const defaultValues = React.useMemo(() => {
    if (!profile && options?.mode === 'update') {
      return {};
    }

    return {
      name: profile?.name || '',
      age: profile?.age || 30,
      gender: profile?.gender || 'prefer_not_to_say',
      unitPreference: profile?.unitPreference || preferences?.unitPreference || 'metric',
      height: profile?.height || (profile?.unitPreference === 'imperial' ? { feet: 5, inches: 10 } : 175),
      weight: profile?.weight || (profile?.unitPreference === 'imperial' ? 160 : 72.5),
      experienceLevel: profile?.experienceLevel || 'beginner',
      goals: profile?.goals || [],
      gymCategory: profile?.gymCategory || 'minimal_home',
      medicalConditions: Array.isArray(profile?.medicalConditions) 
        ? profile.medicalConditions.join(', ') 
        : profile?.medicalConditions || '',
      workoutFrequency: profile?.workoutFrequency || '',
    };
  }, [profile, preferences, options?.mode]);

  // Submit handler with optimistic updates
  const handleSubmit = React.useCallback(async (data: UpdateProfileRequest) => {
    try {
      // Convert medicalConditions from string back to array for backend
      const processedData = {
        ...data,
        medicalConditions: typeof data.medicalConditions === 'string' 
          ? (data.medicalConditions as string).split(',').map((c: string) => c.trim()).filter((c: string) => c.length > 0)
          : data.medicalConditions
      };

      if (options?.enableOptimistic !== false) {
        // Use optimistic update
        updateProfile(processedData);
        options?.onSuccess?.(processedData as any); // Type assertion for callback
      } else {
        // Wait for server response
        const result = await updateProfileAsync(processedData);
        options?.onSuccess?.(result);
      }
    } catch (err) {
      const error = err as Error;
      options?.onError?.(error);
    }
  }, [updateProfile, updateProfileAsync, options]);

  return {
    // Form data
    defaultValues,
    profile,
    preferences,
    
    // Form state
    isLoading: isLoading || isUpdating,
    isSubmitting: isUpdating,
    error,
    
    // Form actions
    onSubmit: handleSubmit,
    
    // Mode helpers
    isCreateMode: options?.mode === 'create' || !profile,
    isUpdateMode: options?.mode === 'update' || Boolean(profile),
  };
}

/**
 * Hook for profile completion status in forms
 */
export function useProfileFormCompletion() {
  const { completion, isProfileComplete, completionPercentage, missingFields } = useProfileQueryContext();

  const getFieldCompletionStatus = (fieldName: string) => {
    if (!completion.data) return 'unknown';
    
    if (completion.data.completedFields.includes(fieldName)) {
      return 'completed';
    }
    
    if (completion.data.missingFields.includes(fieldName)) {
      return 'missing';
    }
    
    return 'optional';
  };

  const getNextRecommendation = () => {
    return completion.data?.recommendations?.[0] || null;
  };

  return {
    isComplete: isProfileComplete,
    percentage: completionPercentage,
    missingFields,
    recommendations: completion.data?.recommendations || [],
    getFieldCompletionStatus,
    getNextRecommendation,
    isLoading: completion.isLoading,
  };
}

/**
 * Hook for real-time form validation feedback
 */
export function useProfileFormValidation() {
  const { validation, hasValidationErrors, validationScore } = useProfileQueryContext();

  const getFieldValidation = (fieldName: string) => {
    if (!validation.data) return null;
    
    const fieldError = validation.data.errors.find(err => err.field === fieldName);
    const fieldWarning = validation.data.warnings.find(warn => warn.field === fieldName);
    
    return {
      error: fieldError || null,
      warning: fieldWarning || null,
      hasIssues: Boolean(fieldError || fieldWarning),
      severity: fieldError ? 'error' : (fieldWarning ? 'warning' : 'none'),
    };
  };

  const getValidationSummary = () => {
    if (!validation.data) return null;
    
    return {
      score: validationScore,
      isValid: validation.data.isValid,
      errorCount: validation.data.errors.length,
      warningCount: validation.data.warnings.length,
      hasIssues: hasValidationErrors,
    };
  };

  return {
    hasErrors: hasValidationErrors,
    score: validationScore,
    isValid: validation.data?.isValid ?? true,
    errors: validation.data?.errors || [],
    warnings: validation.data?.warnings || [],
    getFieldValidation,
    getValidationSummary,
    isLoading: validation.isLoading,
  };
}

// ==========================================
// DEBUGGING AND DEV TOOLS
// ==========================================

/**
 * Development hook for debugging profile query state
 */
export function useProfileQueryDebug() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const context = useProfileQueryContext();

  const getQueryState = () => {
    if (!user?.id) return null;
    
    return {
      profile: queryClient.getQueryState(profileQueryKeys.userProfile(user.id)),
      preferences: queryClient.getQueryState(profileQueryKeys.userPreferences(user.id)),
      completion: queryClient.getQueryState(profileQueryKeys.completion(user.id)),
      validation: queryClient.getQueryState(profileQueryKeys.validation(user.id)),
    };
  };

  const getCacheData = () => {
    if (!user?.id) return null;
    
    return {
      profile: queryClient.getQueryData(profileQueryKeys.userProfile(user.id)),
      preferences: queryClient.getQueryData(profileQueryKeys.userPreferences(user.id)),
      completion: queryClient.getQueryData(profileQueryKeys.completion(user.id)),
      validation: queryClient.getQueryData(profileQueryKeys.validation(user.id)),
    };
  };

  const invalidateAll = () => {
    if (user?.id) {
      profileCacheUtils.invalidateUserProfile(queryClient, user.id);
    }
  };

  return {
    context,
    queryState: getQueryState(),
    cacheData: getCacheData(),
    actions: {
      invalidateAll,
      clearCache: context.clearCache,
      refetch: context.refetch,
    },
  };
}

// Export for debugging in development
if (process.env.NODE_ENV === 'development') {
  (global as any).__profileQueryDebug = {
    useProfileQueryDebug,
    profileQueryKeys,
    profileCacheUtils,
  };
}
