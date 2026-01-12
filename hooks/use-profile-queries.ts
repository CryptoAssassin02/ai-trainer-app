/**
 * Profile Management React Query Hooks
 * Modern TanStack Query v5 patterns with optimistic updates, caching, and type safety
 */

'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { profileService } from '@/lib/api/services/profile-service';
import { toast } from '@/hooks/use-toast';
import type {
  UserProfile,
  CreateProfileRequest,
  UpdateProfileRequest,
  ProfilePreferences,
  UpdatePreferencesRequest,
  UserProfileResponse,
  ProfilePreferencesResponse,
  GetProfileResponse,
  GetPreferencesResponse
} from '@/lib/api/types';

// ==========================================
// QUERY KEY FACTORIES
// ==========================================

/**
 * Centralized query key factory for consistent cache management
 * Following TanStack Query v5 best practices
 */
export const profileQueryKeys = {
  // Base keys
  all: ['profile'] as const,
  lists: () => [...profileQueryKeys.all, 'list'] as const,
  list: (filters: string) => [...profileQueryKeys.lists(), { filters }] as const,
  
  // Detail keys
  details: () => [...profileQueryKeys.all, 'detail'] as const,
  detail: (id?: string) => [...profileQueryKeys.details(), id] as const,
  
  // User-specific keys
  user: (userId: string) => [...profileQueryKeys.all, 'user', userId] as const,
  userProfile: (userId: string) => [...profileQueryKeys.user(userId), 'profile'] as const,
  userPreferences: (userId: string) => [...profileQueryKeys.user(userId), 'preferences'] as const,
  
  // Context-specific keys
  current: () => [...profileQueryKeys.all, 'current'] as const,
  preferences: () => [...profileQueryKeys.all, 'preferences'] as const,
  
  // Dependent queries
  completion: (userId: string) => [...profileQueryKeys.user(userId), 'completion'] as const,
  validation: (userId: string) => [...profileQueryKeys.user(userId), 'validation'] as const,
} as const;

// ==========================================
// PROFILE QUERY HOOK
// ==========================================

/**
 * Hook for fetching user profile data with advanced caching strategies
 */
export function useProfileQuery(options?: {
  userId?: string;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  select?: (data: UserProfile) => unknown;
}) {
  const { user } = useAuth();
  const userId = options?.userId || user?.id;

  return useQuery({
    queryKey: userId ? profileQueryKeys.userProfile(userId) : ['profile', 'no-user'],
    queryFn: async (): Promise<UserProfile> => {
      if (!userId) {
        throw new Error('User ID is required to fetch profile');
      }
      
      const response = await profileService.getProfile();
      return response;
    },
    enabled: Boolean(userId) && (options?.enabled !== false),
    staleTime: options?.staleTime || 5 * 60 * 1000, // 5 minutes - profile changes infrequently
    gcTime: options?.gcTime || 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? true,
    refetchOnMount: options?.refetchOnMount ?? true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('401') || error?.message?.includes('authentication')) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    select: options?.select,
    // Enable background refetching for fresh data
    refetchInterval: (query) => {
      // Only refetch in background if user is active and window is focused
      // Check if we're in browser environment first (SSR safety)
      return typeof window !== 'undefined' && document.hasFocus() ? 30 * 60 * 1000 : false; // 30 minutes
    },
    meta: {
      errorMessage: 'Failed to fetch profile data',
    },
  });
}

// ==========================================
// PROFILE PREFERENCES QUERY HOOK  
// ==========================================

/**
 * Separate hook for profile preferences with independent caching
 */
export function useProfilePreferencesQuery(options?: {
  userId?: string;
  enabled?: boolean;
  staleTime?: number;
  select?: (data: ProfilePreferences) => unknown;
}) {
  const { user } = useAuth();
  const userId = options?.userId || user?.id;

  return useQuery({
    queryKey: userId ? profileQueryKeys.userPreferences(userId) : ['preferences', 'no-user'],
    queryFn: async (): Promise<ProfilePreferences> => {
      if (!userId) {
        throw new Error('User ID is required to fetch preferences');
      }
      
      const response = await profileService.getPreferences();
      
      // Return default preferences if response is null/undefined instead of throwing
      if (!response) {
        return {
          userId: userId,
          unitPreference: 'metric',
          goals: [],
          gymCategory: 'minimal_home',
          experienceLevel: 'beginner',
          workoutFrequency: '3',
          updatedAt: new Date().toISOString()
        };
      }
      
      return response;
    },
    enabled: Boolean(userId) && (options?.enabled ?? true),
    staleTime: options?.staleTime || 2 * 60 * 1000, // 2 minutes - preferences change more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      if (error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
    select: options?.select,
    meta: {
      errorMessage: 'Failed to fetch profile preferences',
    },
  });
}

// ==========================================
// PROFILE MUTATION HOOKS
// ==========================================

/**
 * Hook for creating/updating profile with optimistic updates
 */
export function useProfileMutation(options?: {
  onSuccess?: (data: UserProfile, variables: CreateProfileRequest | UpdateProfileRequest) => void;
  onError?: (error: Error, variables: CreateProfileRequest | UpdateProfileRequest) => void;
  enableOptimistic?: boolean;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateProfileRequest | UpdateProfileRequest) => {
      // Determine if this is create or update based on existing profile
      const existingProfile = queryClient.getQueryData(
        user?.id ? profileQueryKeys.userProfile(user.id) : ['profile', 'no-user']
      );

      if (existingProfile) {
        const response = await profileService.updateProfile(data as UpdateProfileRequest);
        return response;
      } else {
        const response = await profileService.createProfile(data as CreateProfileRequest);
        return response;
      }
    },
    
    // Optimistic updates
    onMutate: async (variables) => {
      if (!user?.id || options?.enableOptimistic === false) return;

      const queryKey = profileQueryKeys.userProfile(user.id);
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousProfile = queryClient.getQueryData<UserProfile>(queryKey);

      // Optimistically update cache
      if (previousProfile) {
        const optimisticProfile: UserProfile = {
          ...previousProfile,
          ...variables,
          updatedAt: new Date().toISOString(),
        };

        queryClient.setQueryData(queryKey, optimisticProfile);
      }

      return { previousProfile, queryKey };
    },

    // Handle success
    onSuccess: (data, variables, context) => {
      if (!user?.id) return;

      const queryKey = profileQueryKeys.userProfile(user.id);
      
      // Update cache with server response
      queryClient.setQueryData(queryKey, data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: profileQueryKeys.user(user.id),
        exact: false 
      });

      // Show success notification
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
        variant: "default",
      });

      options?.onSuccess?.(data, variables);
    },

    // Handle errors and rollback
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousProfile && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousProfile);
      }

      // Show error notification
      toast({
        title: "Profile Update Failed",
        description: error.message || "Failed to save profile. Please try again.",
        variant: "destructive",
      });

      options?.onError?.(error as Error, variables);
    },

    // Always refetch after settling to ensure consistency
    onSettled: (_data, _error, _variables, context) => {
      if (user?.id && context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },

    meta: {
      errorMessage: 'Failed to save profile',
    },
  });
}

// ==========================================
// PROFILE PREFERENCES MUTATION HOOK
// ==========================================

/**
 * Hook for updating profile preferences with unit conversion handling
 */
export function useProfilePreferencesMutation(options?: {
  onSuccess?: (data: ProfilePreferences, variables: UpdatePreferencesRequest) => void;
  onError?: (error: Error, variables: UpdatePreferencesRequest) => void;
  enableOptimistic?: boolean;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdatePreferencesRequest) => {
      const response = await profileService.updatePreferences(data);
      return response;
    },

    onMutate: async (variables) => {
      if (!user?.id || options?.enableOptimistic === false) return;

      const preferencesKey = profileQueryKeys.userPreferences(user.id);
      const profileKey = profileQueryKeys.userProfile(user.id);
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: preferencesKey });
      await queryClient.cancelQueries({ queryKey: profileKey });

      // Snapshot previous values
      const previousPreferences = queryClient.getQueryData<ProfilePreferences>(preferencesKey);
      const previousProfile = queryClient.getQueryData<UserProfile>(profileKey);

      // Optimistically update preferences
      if (previousPreferences) {
        const optimisticPreferences: ProfilePreferences = {
          ...previousPreferences,
          ...variables,
          updatedAt: new Date().toISOString(),
        };
        queryClient.setQueryData(preferencesKey, optimisticPreferences);
      }

      // If unit preference changed, handle conversion in profile
      if (variables.unitPreference && previousProfile && 
          previousProfile.unitPreference !== variables.unitPreference) {
        
        const convertedProfile = convertProfileUnits(previousProfile, variables.unitPreference);
        queryClient.setQueryData(profileKey, convertedProfile);
      }

      return { previousPreferences, previousProfile, preferencesKey, profileKey };
    },

    onSuccess: (data, variables, context) => {
      if (!user?.id) return;

      // Update preferences cache
      queryClient.setQueryData(profileQueryKeys.userPreferences(user.id), data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: profileQueryKeys.user(user.id),
        exact: false 
      });

      toast({
        title: "Preferences Updated",
        description: "Your preferences have been saved successfully.",
        variant: "default",
      });

      options?.onSuccess?.(data, variables);
    },

    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousPreferences && context?.preferencesKey) {
        queryClient.setQueryData(context.preferencesKey, context.previousPreferences);
      }
      if (context?.previousProfile && context?.profileKey) {
        queryClient.setQueryData(context.profileKey, context.previousProfile);
      }

      toast({
        title: "Preferences Update Failed",
        description: error.message || "Failed to save preferences. Please try again.",
        variant: "destructive",
      });

      options?.onError?.(error as Error, variables);
    },

    onSettled: (_data, _error, _variables, context) => {
      if (user?.id) {
        if (context?.preferencesKey) {
          queryClient.invalidateQueries({ queryKey: context.preferencesKey });
        }
        if (context?.profileKey) {
          queryClient.invalidateQueries({ queryKey: context.profileKey });
        }
      }
    },

    meta: {
      errorMessage: 'Failed to save preferences',
    },
  });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Convert profile data between unit systems
 */
function convertProfileUnits(profile: UserProfile, toUnit: 'metric' | 'imperial'): UserProfile {
  if (profile.unitPreference === toUnit) return profile;

  const converted = { ...profile, unitPreference: toUnit };

  // Convert height
  if (profile.height !== undefined && profile.height !== null) {
    if (toUnit === 'imperial' && typeof profile.height === 'number') {
      // Convert cm to feet/inches
      const totalInches = profile.height / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      converted.height = { feet, inches } as any;
    } else if (toUnit === 'metric' && typeof profile.height === 'object') {
      // Convert feet/inches to cm
      const totalInches = (profile.height as any).feet * 12 + (profile.height as any).inches;
      converted.height = Math.round(totalInches * 2.54) as any;
    }
  }

  // Convert weight
  if (profile.weight !== undefined && profile.weight !== null) {
    if (toUnit === 'imperial') {
      // Convert kg to lbs
      converted.weight = Math.round(profile.weight * 2.20462 * 10) / 10;
    } else {
      // Convert lbs to kg  
      converted.weight = Math.round(profile.weight * 0.453592 * 10) / 10;
    }
  }

  return converted;
}

// ==========================================
// CACHE UTILITIES
// ==========================================

/**
 * Utility functions for manual cache management
 */
export const profileCacheUtils = {
  /**
   * Manually invalidate all profile queries for a user
   */
  invalidateUserProfile: (queryClient: QueryClient, userId: string) => {
    queryClient.invalidateQueries({ 
      queryKey: profileQueryKeys.user(userId),
      exact: false 
    });
  },

  /**
   * Manually set profile data in cache
   */
  setProfileData: (queryClient: QueryClient, userId: string, data: UserProfile) => {
    queryClient.setQueryData(profileQueryKeys.userProfile(userId), data);
  },

  /**
   * Manually set preferences data in cache
   */
  setPreferencesData: (queryClient: QueryClient, userId: string, data: ProfilePreferences) => {
    queryClient.setQueryData(profileQueryKeys.userPreferences(userId), data);
  },

  /**
   * Get current profile from cache
   */
  getProfileFromCache: (queryClient: QueryClient, userId: string): UserProfile | undefined => {
    return queryClient.getQueryData<UserProfile>(profileQueryKeys.userProfile(userId));
  },

  /**
   * Clear all profile-related cache
   */
  clearProfileCache: (queryClient: QueryClient, userId?: string) => {
    if (userId) {
      queryClient.removeQueries({ queryKey: profileQueryKeys.user(userId) });
    } else {
      queryClient.removeQueries({ queryKey: profileQueryKeys.all });
    }
  },
};

// ==========================================
// COMPOUND HOOKS
// ==========================================

/**
 * Compound hook that provides all profile-related queries and mutations
 */
export function useProfile(options?: {
  enableOptimistic?: boolean;
  staleTime?: number;
  enabled?: boolean;
  onSuccess?: (data: UserProfile) => void;
  onError?: (error: Error) => void;
}) {
  const profile = useProfileQuery({
    staleTime: options?.staleTime,
    enabled: options?.enabled,
  });

  const preferences = useProfilePreferencesQuery({
    enabled: Boolean(profile.data) && (options?.enabled !== false)
  });

  const updateProfile = useProfileMutation({
    enableOptimistic: options?.enableOptimistic,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });

  const updatePreferences = useProfilePreferencesMutation({
    enableOptimistic: options?.enableOptimistic,
  });

  return {
    // Query states
    profile,
    preferences,
    
    // Loading states
    isLoading: profile.isLoading || preferences.isLoading,
    isFetching: profile.isFetching || preferences.isFetching,
    
    // Error states - prioritize profile errors, make preferences errors non-blocking
    error: profile.error,
    isError: profile.isError,
    
    // Mutation functions
    updateProfile: updateProfile.mutate,
    updateProfileAsync: updateProfile.mutateAsync,
    updatePreferences: updatePreferences.mutate,
    updatePreferencesAsync: updatePreferences.mutateAsync,
    
    // Mutation states
    isUpdating: updateProfile.isPending || updatePreferences.isPending,
    updateError: updateProfile.error || updatePreferences.error,
    
    // Utils
    refetch: () => Promise.all([profile.refetch(), preferences.refetch()]),
    reset: () => {
      updateProfile.reset();
      updatePreferences.reset();
    },
  };
}

/**
 * Hook to calculate profile completion percentage
 * @param userId - User ID to calculate completion for
 * @returns Profile completion data including percentage and missing fields
 */
export function useProfileCompletion(userId?: string) {
  const { data: profile, isLoading, error } = useProfileQuery({ 
    userId: userId,
    enabled: Boolean(userId)
  });
  
  if (isLoading || error || !profile || typeof profile !== 'object') {
    return null;
  }
  
  const requiredFields = ['name', 'age', 'height', 'weight', 'experienceLevel', 'goals'];
  const missingFields = requiredFields.filter(field => !(profile as UserProfile)?.[field as keyof UserProfile]);
  
  const totalFields = requiredFields.length;
  const completedFields = totalFields - missingFields.length;
  const percentage = Math.round((completedFields / totalFields) * 100);
  
  return {
    percentage,
    missingFields,
    isComplete: missingFields.length === 0,
    recommendations: missingFields.length > 0 
      ? [`Complete your profile by adding: ${missingFields.join(', ')}`]
      : ['Your profile is complete!'],
  };
}
