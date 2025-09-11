/**
 * Profile Management Hooks
 * React Query hooks for profile operations with optimistic updates and cache invalidation
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@/lib/api/services/profile-service';
import { queryKeys, queryUtils } from '@/lib/api/react-query';
import { APIError } from '@/lib/api/constants';
import { toast } from '@/hooks/use-toast';
import type {
  UserProfile,
  CreateProfileRequest,
  UpdateProfileRequest,
  ProfilePreferences,
  UpdatePreferencesRequest
} from '@/lib/api/types';

/**
 * Hook to get user profile
 */
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => profileService.getProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication or not found errors
      if (error instanceof APIError && (error.status === 401 || error.status === 404)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to get profile preferences only
 */
export function useProfilePreferences() {
  return useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: () => profileService.getPreferences(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      if (error instanceof APIError && (error.status === 401 || error.status === 404)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to create a new profile
 */
export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileData: CreateProfileRequest) => 
      profileService.createProfile(profileData),
    
    onMutate: async (newProfile) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.profile });

      // Snapshot previous value
      const previousProfile = queryClient.getQueryData<UserProfile>(queryKeys.profile);

      // Optimistically update profile
      queryClient.setQueryData<UserProfile>(queryKeys.profile, (old) => {
        if (old) {
          return { ...old, ...newProfile } as UserProfile;
        }
        // Create optimistic profile structure for new users
        return {
          id: 'temp-id',
          userId: 'temp-user-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...newProfile,
        } as UserProfile;
      });

      return { previousProfile };
    },

    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKeys.profile, context.previousProfile);
      }
      
      // Handle specific error types
      if (error instanceof APIError) {
        if (error.status === 400) {
          toast({
            title: 'Validation Error',
            description: 'Please check your profile information and try again.',
            variant: 'destructive',
          });
        } else if (error.status === 409) {
          toast({
            title: 'Profile Conflict',
            description: 'A profile already exists or there was a unit conversion error.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: 'Failed to create profile. Please try again.',
            variant: 'destructive',
          });
        }
      }
    },

    onSuccess: (data) => {
      // Update profile cache with actual data
      queryClient.setQueryData(queryKeys.profile, data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.profileCompletion });
      queryClient.invalidateQueries({ queryKey: queryKeys.profileInsights });
      
      toast({
        title: 'Success',
        description: 'Profile created successfully!',
      });
    },
  });
}

/**
 * Hook to update existing profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileData: UpdateProfileRequest) => 
      profileService.updateProfile(profileData),
    
    onMutate: async (updateData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.profile });

      // Snapshot previous value
      const previousProfile = queryClient.getQueryData<UserProfile>(queryKeys.profile);

      // Optimistically update profile
      queryClient.setQueryData<UserProfile>(queryKeys.profile, (old) => {
        if (old) {
          return {
            ...old,
            ...updateData,
            updatedAt: new Date().toISOString(),
          };
        }
        return old;
      });

      return { previousProfile };
    },

    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKeys.profile, context.previousProfile);
      }
      
      if (error instanceof APIError && error.status === 400) {
        toast({
          title: 'Validation Error',
          description: 'Please check your profile information and try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update profile. Please try again.',
          variant: 'destructive',
        });
      }
    },

    onSuccess: (data) => {
      // Update profile cache with actual data
      queryClient.setQueryData(queryKeys.profile, data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.profileCompletion });
      queryClient.invalidateQueries({ queryKey: queryKeys.profileInsights });
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully!',
      });
    },
  });
}

/**
 * Hook to update preferences only
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: UpdatePreferencesRequest) => 
      profileService.updatePreferences(preferences),
    
    onMutate: async (updateData) => {
      // Cancel outgoing refetches for both profile and preferences
      await queryClient.cancelQueries({ queryKey: queryKeys.profile });
      await queryClient.cancelQueries({ queryKey: queryKeys.notificationPreferences });

      // Snapshot previous values
      const previousProfile = queryClient.getQueryData<UserProfile>(queryKeys.profile);
      const previousPreferences = queryClient.getQueryData<ProfilePreferences>(queryKeys.notificationPreferences);

      // Optimistically update preferences
      queryClient.setQueryData<ProfilePreferences>(queryKeys.notificationPreferences, (old) => {
        if (old) {
          return {
            ...old,
            ...updateData,
            updatedAt: new Date().toISOString(),
          };
        }
        return old;
      });

      // If unit preference changed, update profile cache too
      if (updateData.unitPreference && previousProfile) {
        queryClient.setQueryData<UserProfile>(queryKeys.profile, (old) => {
          if (old) {
            return {
              ...old,
              unitPreference: updateData.unitPreference!,
              updatedAt: new Date().toISOString(),
            };
          }
          return old;
        });
      }

      return { previousProfile, previousPreferences };
    },

    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKeys.profile, context.previousProfile);
      }
      if (context?.previousPreferences) {
        queryClient.setQueryData(queryKeys.notificationPreferences, context.previousPreferences);
      }
      
      if (error instanceof APIError && error.status === 400) {
        toast({
          title: 'Validation Error',
          description: 'Please check your preferences and try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update preferences. Please try again.',
          variant: 'destructive',
        });
      }
    },

    onSuccess: (data, variables) => {
      // Update preferences cache with actual data
      queryClient.setQueryData(queryKeys.notificationPreferences, data);
      
      // If unit preference was changed, invalidate profile to trigger re-fetch with converted units
      if (variables.unitPreference) {
        queryClient.invalidateQueries({ queryKey: queryKeys.profile });
        toast({
          title: 'Success',
          description: 'Unit preference updated! Your measurements have been converted.',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Preferences updated successfully!',
        });
      }
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.profileCompletion });
    },
  });
}

/**
 * Utility hook for profile completion status
 * Calculates completion based on profile data
 */
export function useProfileCompletion() {
  const { data: profile } = useProfile();

  const getCompletionStatus = () => {
    if (!profile) {
      return {
        percentage: 0,
        missingFields: [],
        completedSections: [],
        isComplete: false,
      };
    }

    const requiredFields = {
      personal: ['name', 'age', 'gender'],
      physical: ['height', 'weight', 'unitPreference'],
      fitness: ['experienceLevel', 'goals'],
      preferences: ['workoutFrequency', 'gymCategory'],
    } as const;

    const completedSections: string[] = [];
    const missingFields: string[] = [];

    Object.entries(requiredFields).forEach(([section, fields]) => {
      const sectionFields = fields.filter(field => {
        const value = profile[field as keyof UserProfile];
        return value !== null && value !== undefined && value !== '';
      });
      
      if (sectionFields.length === fields.length) {
        completedSections.push(section);
      } else {
        missingFields.push(...fields.filter(field => {
          const value = profile[field as keyof UserProfile];
          return value === null || value === undefined || value === '';
        }));
      }
    });

    const totalFields = Object.values(requiredFields).flat().length;
    const completedFields = totalFields - missingFields.length;
    const percentage = Math.round((completedFields / totalFields) * 100);
    const isComplete = percentage === 100;

    return {
      percentage,
      missingFields,
      completedSections,
      isComplete,
    };
  };

  return {
    ...getCompletionStatus(),
    profile,
  };
}

/**
 * Utility hook for unit conversion helpers
 */
export function useUnitConversion() {
  const { data: profile } = useProfile();
  const { mutate: updatePreferences } = useUpdatePreferences();

  const currentUnit = profile?.unitPreference || 'metric';

  const changeUnitSystem = (newUnit: 'metric' | 'imperial') => {
    if (newUnit === currentUnit) return;
    
    updatePreferences({ unitPreference: newUnit });
  };

  const formatHeight = (height: number | { feet: number; inches: number }): string => {
    if (currentUnit === 'imperial' && typeof height === 'object') {
      return `${height.feet}'${height.inches}"`;
    }
    return `${height} cm`;
  };

  const formatWeight = (weight: number): string => {
    return `${weight} ${currentUnit === 'imperial' ? 'lbs' : 'kg'}`;
  };

  return {
    currentUnit,
    changeUnitSystem,
    formatHeight,
    formatWeight,
  };
}
