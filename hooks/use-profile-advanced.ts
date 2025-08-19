/**
 * Advanced Profile React Query Patterns
 * Step 7: Performance optimizations, dependent queries, and auth integration
 */

'use client';

import { useQuery, useQueries, useQueryClient, useMutation, type QueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useAuth } from './use-auth';
import { profileQueryKeys, useProfileQuery, useProfilePreferencesQuery } from './use-profile-queries';
import { profileService } from '@/lib/api/services/profile-service';
import { toast } from '@/hooks/use-toast';
import type { UserProfile, ProfilePreferences } from '@/lib/api/types';

// ==========================================
// DEPENDENT QUERIES
// ==========================================

/**
 * Profile completion status - depends on profile data
 */
export function useProfileCompletion(options?: {
  enabled?: boolean;
  threshold?: number;
}) {
  const { user } = useAuth();
  const profileQuery = useProfileQuery({ enabled: Boolean(user?.id) });

  return useQuery({
    queryKey: user?.id ? profileQueryKeys.completion(user.id) : ['completion', 'no-user'],
    queryFn: (): ProfileCompletionStatus => {
      if (!profileQuery.data) {
        throw new Error('Profile data not available');
      }
      
      return calculateProfileCompletion(profileQuery.data, options?.threshold);
    },
    enabled: Boolean(user?.id) && Boolean(profileQuery.data) && (options?.enabled !== false),
    staleTime: 30 * 1000, // 30 seconds - completion status changes with profile
    select: (data) => data, // Pass through for now, could transform if needed
  });
}

/**
 * Profile validation status - depends on profile and preferences
 */
export function useProfileValidation(options?: {
  enabled?: boolean;
  includePreferences?: boolean;
}) {
  const { user } = useAuth();
  const profileQuery = useProfileQuery({ enabled: Boolean(user?.id) });
  const preferencesQuery = useProfilePreferencesQuery({ 
    enabled: Boolean(user?.id) && Boolean(profileQuery.data) && options?.includePreferences !== false 
  });

  return useQuery({
    queryKey: user?.id ? profileQueryKeys.validation(user.id) : ['validation', 'no-user'],
    queryFn: (): ProfileValidationResult => {
      if (!profileQuery.data) {
        throw new Error('Profile data not available');
      }

      return validateProfileData({
        profile: profileQuery.data,
        preferences: preferencesQuery.data,
        includePreferences: options?.includePreferences
      });
    },
    enabled: Boolean(user?.id) && Boolean(profileQuery.data) && (options?.enabled !== false),
    staleTime: 60 * 1000, // 1 minute - validation is expensive
  });
}

/**
 * Parallel queries for profile overview dashboard
 */
export function useProfileOverview(options?: {
  enabled?: boolean;
  includeCompletion?: boolean;
  includeValidation?: boolean;
}) {
  const { user } = useAuth();

  const queries = useMemo(() => {
    if (!user?.id) return [];

    const baseQueries = [
      {
        queryKey: profileQueryKeys.userProfile(user.id),
        queryFn: () => profileService.getProfile().then(res => res.data),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: profileQueryKeys.userPreferences(user.id),
        queryFn: () => profileService.getPreferences().then(res => res.data),
        staleTime: 2 * 60 * 1000,
      },
    ];

    if (options?.includeCompletion) {
      baseQueries.push({
        queryKey: profileQueryKeys.completion(user.id),
        queryFn: async () => {
          const profileData = await profileService.getProfile().then(res => res.data);
          return calculateProfileCompletion(profileData);
        },
        staleTime: 30 * 1000,
      } as any);
    }

    if (options?.includeValidation) {
      baseQueries.push({
        queryKey: profileQueryKeys.validation(user.id),
        queryFn: async () => {
          const [profileData, preferencesData] = await Promise.all([
            profileService.getProfile().then(res => res.data),
            profileService.getPreferences().then(res => res.data),
          ]);
          return validateProfileData({ profile: profileData, preferences: preferencesData });
        },
        staleTime: 60 * 1000,
      } as any);
    }

    return baseQueries;
  }, [user?.id, options?.includeCompletion, options?.includeValidation]);

  const results = useQueries({
    queries: queries.map(query => ({
      ...query,
      enabled: Boolean(user?.id) && (options?.enabled !== false),
    })),
  });

  return {
    profile: results[0],
    preferences: results[1],
    completion: options?.includeCompletion ? results[2] : undefined,
    validation: options?.includeValidation ? results[results.length - 1] : undefined,
    isLoading: results.some(r => r.isLoading),
    isFetching: results.some(r => r.isFetching),
    isError: results.some(r => r.isError),
    errors: results.filter(r => r.error).map(r => r.error),
  };
}

// ==========================================
// AUTH STATE INTEGRATION
// ==========================================

/**
 * Hook that manages profile cache based on auth state changes
 */
export function useProfileAuthSync() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    // When user logs out, clear all profile cache
    if (!authLoading && !user) {
      queryClient.removeQueries({ queryKey: profileQueryKeys.all });
      return;
    }

    // When user changes, invalidate and refetch profile data
    if (user?.id) {
      // Invalidate all queries for the new user
      queryClient.invalidateQueries({ 
        queryKey: profileQueryKeys.user(user.id),
        exact: false 
      });
    }
  }, [user?.id, authLoading, queryClient]);

  // Prefetch profile data when user logs in
  useEffect(() => {
    if (user?.id && !authLoading) {
      // Prefetch main profile data
      queryClient.prefetchQuery({
        queryKey: profileQueryKeys.userProfile(user.id),
        queryFn: () => profileService.getProfile().then(res => res.data),
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch preferences
      queryClient.prefetchQuery({
        queryKey: profileQueryKeys.userPreferences(user.id),
        queryFn: () => profileService.getPreferences().then(res => res.data),
        staleTime: 2 * 60 * 1000,
      });
    }
  }, [user?.id, authLoading, queryClient]);
}

// ==========================================
// BACKGROUND REFETCHING STRATEGIES
// ==========================================

/**
 * Hook for smart background refetching based on user activity
 */
export function useProfileBackgroundSync(options?: {
  enabled?: boolean;
  onlineOnly?: boolean;
  focusInterval?: number;
  idleInterval?: number;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id || options?.enabled === false) return;

    const handleFocus = () => {
      // Refetch profile data when window regains focus
      queryClient.invalidateQueries({
        queryKey: profileQueryKeys.user(user.id),
        exact: false,
        refetchType: 'active', // Only refetch active queries
      });
    };

    const handleOnline = () => {
      // Refetch when connection is restored
      if (options?.onlineOnly !== false) {
        queryClient.invalidateQueries({
          queryKey: profileQueryKeys.user(user.id),
          exact: false,
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };

    // Set up event listeners
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, queryClient, options?.enabled, options?.onlineOnly]);
}

// ==========================================
// OPTIMISTIC UPDATE HELPERS
// ==========================================

/**
 * Advanced optimistic update hook with conflict resolution
 */
export function useOptimisticProfileUpdate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (update: OptimisticUpdatePayload) => {
      // Simulate API delay for testing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (update.type === 'profile') {
        return await profileService.updateProfile(update.data);
      } else {
        return await profileService.updatePreferences(update.data);
      }
    },

    onMutate: async (variables) => {
      if (!user?.id) return;

      const isProfile = variables.type === 'profile';
      const queryKey = isProfile 
        ? profileQueryKeys.userProfile(user.id)
        : profileQueryKeys.userPreferences(user.id);

      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey });

      // Get current data
      const previousData = queryClient.getQueryData(queryKey);

      // Apply optimistic update with conflict detection
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return variables.data;

        // Check for conflicts (version mismatch, etc.)
        const hasConflict = detectUpdateConflict(old, variables.data, variables.metadata);
        if (hasConflict) {
          toast({
            title: "Update Conflict Detected",
            description: "Your changes may conflict with recent updates. Please review.",
            variant: "destructive",
          });
        }

        return {
          ...old,
          ...variables.data,
          updatedAt: new Date().toISOString(),
          _optimistic: true, // Mark as optimistic
        };
      });

      return { previousData, queryKey, isProfile };
    },

    onSuccess: (result, variables, context) => {
      if (!context?.queryKey) return;

      // Update with server response and remove optimistic flag
      queryClient.setQueryData(context.queryKey, (old: any) => ({
        ...result.data,
        _optimistic: false,
      }));
    },

    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }

      toast({
        title: "Update Failed",
        description: error.message || "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    },

    onSettled: (data, error, variables, context) => {
      if (user?.id && context?.queryKey) {
        // Always invalidate to ensure consistency
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });
}

// ==========================================
// TYPE DEFINITIONS
// ==========================================

interface ProfileCompletionStatus {
  percentage: number;
  missingFields: string[];
  completedFields: string[];
  isComplete: boolean;
  recommendations: string[];
}

interface ProfileValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number;
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

interface OptimisticUpdatePayload {
  type: 'profile' | 'preferences';
  data: any;
  metadata?: {
    version?: string;
    timestamp?: string;
    source?: string;
  };
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Calculate profile completion percentage and missing fields
 */
function calculateProfileCompletion(
  profile: UserProfile, 
  threshold: number = 80
): ProfileCompletionStatus {
  const requiredFields = [
    'name', 'age', 'gender', 'height', 'weight', 
    'experienceLevel', 'goals', 'unitPreference'
  ];
  
  const optionalFields = [
    'equipment', 'medicalConditions', 'workoutFrequency'
  ];

  const completedRequired = requiredFields.filter(field => {
    const value = profile[field as keyof UserProfile];
    return value !== null && value !== undefined && value !== '' && 
           !(Array.isArray(value) && value.length === 0);
  });

  const completedOptional = optionalFields.filter(field => {
    const value = profile[field as keyof UserProfile];
    return value !== null && value !== undefined && value !== '' && 
           !(Array.isArray(value) && value.length === 0);
  });

  const totalRequired = requiredFields.length;
  const totalOptional = optionalFields.length;
  
  // Weight required fields more heavily
  const requiredWeight = 0.8;
  const optionalWeight = 0.2;
  
  const requiredScore = (completedRequired.length / totalRequired) * requiredWeight;
  const optionalScore = (completedOptional.length / totalOptional) * optionalWeight;
  
  const percentage = Math.round((requiredScore + optionalScore) * 100);
  
  const missingRequired = requiredFields.filter(f => !completedRequired.includes(f));
  const missingOptional = optionalFields.filter(f => !completedOptional.includes(f));

  const recommendations = [];
  if (missingRequired.length > 0) {
    recommendations.push(`Complete required fields: ${missingRequired.join(', ')}`);
  }
  if (missingOptional.length > 0 && percentage >= 70) {
    recommendations.push(`Consider adding: ${missingOptional.slice(0, 2).join(', ')}`);
  }

  return {
    percentage,
    missingFields: [...missingRequired, ...missingOptional],
    completedFields: [...completedRequired, ...completedOptional],
    isComplete: percentage >= threshold && missingRequired.length === 0,
    recommendations,
  };
}

/**
 * Validate profile data for consistency and completeness
 */
function validateProfileData(params: {
  profile: UserProfile;
  preferences?: ProfilePreferences;
  includePreferences?: boolean;
}): ProfileValidationResult {
  const { profile, preferences, includePreferences } = params;
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Age validation
  if (profile.age && (profile.age < 13 || profile.age > 120)) {
    errors.push({
      field: 'age',
      message: 'Age must be between 13 and 120 years',
      severity: 'error',
    });
  }

  // Height validation based on unit system
  if (profile.height && profile.unitPreference) {
    if (profile.unitPreference === 'metric' && typeof profile.height === 'number') {
      if (profile.height < 50 || profile.height > 300) {
        errors.push({
          field: 'height',
          message: 'Height must be between 50 and 300 cm',
          severity: 'error',
        });
      }
    } else if (profile.unitPreference === 'imperial' && typeof profile.height === 'object') {
      const heightObj = profile.height as any;
      if (heightObj.feet < 0 || heightObj.feet > 10 || heightObj.inches < 0 || heightObj.inches > 11) {
        errors.push({
          field: 'height',
          message: 'Invalid height format for imperial system',
          severity: 'error',
        });
      }
    } else {
      errors.push({
        field: 'height',
        message: 'Height format does not match unit preference',
        severity: 'error',
      });
    }
  }

  // Weight validation
  if (profile.weight && profile.unitPreference) {
    const minWeight = profile.unitPreference === 'metric' ? 20 : 44;
    const maxWeight = profile.unitPreference === 'metric' ? 1000 : 2200;
    
    if (profile.weight < minWeight || profile.weight > maxWeight) {
      errors.push({
        field: 'weight',
        message: `Weight must be between ${minWeight} and ${maxWeight} ${profile.unitPreference === 'metric' ? 'kg' : 'lbs'}`,
        severity: 'error',
      });
    }
  }

  // Goals validation
  if (profile.goals && profile.goals.length > 5) {
    warnings.push({
      field: 'goals',
      message: 'Too many goals selected',
      suggestion: 'Consider focusing on 3-5 primary goals for better results',
    });
  }

  // Medical conditions validation
  if (profile.medicalConditions && Array.isArray(profile.medicalConditions)) {
    if (profile.medicalConditions.length > 10) {
      errors.push({
        field: 'medicalConditions',
        message: 'Maximum 10 medical conditions allowed',
        severity: 'error',
      });
    }
  }

  // Cross-field validation
  if (profile.age && profile.experienceLevel) {
    if (profile.age < 16 && profile.experienceLevel === 'advanced') {
      warnings.push({
        field: 'experienceLevel',
        message: 'Advanced level unusual for this age',
        suggestion: 'Consider intermediate level for safety',
      });
    }
  }

  // Preferences validation (if included)
  if (includePreferences && preferences) {
    if (preferences.unitPreference !== profile.unitPreference) {
      warnings.push({
        field: 'unitPreference',
        message: 'Unit preference mismatch between profile and preferences',
        suggestion: 'Sync unit preferences for consistency',
      });
    }
  }

  const totalChecks = 10; // Total number of validation checks
  const errorWeight = 2;
  const warningWeight = 1;
  
  const deductions = (errors.length * errorWeight) + (warnings.length * warningWeight);
  const score = Math.max(0, Math.round(((totalChecks - deductions) / totalChecks) * 100));

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score,
  };
}

/**
 * Detect potential conflicts in optimistic updates
 */
function detectUpdateConflict(
  currentData: any, 
  newData: any, 
  metadata?: OptimisticUpdatePayload['metadata']
): boolean {
  // Check for version conflicts
  if (metadata?.version && currentData.version && metadata.version < currentData.version) {
    return true;
  }

  // Check for timestamp conflicts (data was updated recently)
  if (currentData.updatedAt) {
    const lastUpdate = new Date(currentData.updatedAt).getTime();
    const now = Date.now();
    const timeDiff = now - lastUpdate;
    
    // If data was updated in the last 30 seconds, flag as potential conflict
    if (timeDiff < 30 * 1000) {
      return true;
    }
  }

  // Check for concurrent modifications (field-level)
  const sensitiveFields = ['height', 'weight', 'medicalConditions', 'unitPreference'];
  for (const field of sensitiveFields) {
    if (field in newData && field in currentData && 
        JSON.stringify(currentData[field]) !== JSON.stringify(newData[field])) {
      // This could indicate concurrent edits
      return true;
    }
  }

  return false;
}

/**
 * Global query client setup for profile management
 */
export function setupProfileQueryDefaults(queryClient: QueryClient) {
  // Set default options for all profile queries
  queryClient.setQueryDefaults(profileQueryKeys.all, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      if (error?.message?.includes('401')) return false;
      return failureCount < 3;
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Set default options for profile mutations
  queryClient.setMutationDefaults(['profile'], {
    retry: 1,
    networkMode: 'online',
  });
}
