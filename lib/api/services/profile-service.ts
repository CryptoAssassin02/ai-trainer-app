/**
 * Profile Service
 * Specialized service for user profile management aligned with backend API
 */

import { apiClient, API_ENDPOINTS, API_TIMEOUTS } from '../client';
import { APIError } from '../constants';
import type { 
  UserProfile,
  CreateProfileRequest,
  UpdateProfileRequest,
  ProfilePreferences,
  UpdatePreferencesRequest,
  GetProfileResponse,
  UserProfileResponse,
  GetPreferencesResponse,
  ProfilePreferencesResponse,
  RequestOptions 
} from '../types';

export class ProfileService {
  /**
   * Get complete user profile
   * Endpoint: GET /v1/profile
   */
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await apiClient.get<GetProfileResponse>(
        API_ENDPOINTS.PROFILE.BASE,
        {
          timeout: API_TIMEOUTS.standardOperations,
        }
      );
      
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        // Re-throw APIError with context
        throw new APIError(
          `Profile fetch failed: ${error.message}`,
          error.status,
          error.code,
          error.retryable
        );
      }
      // Handle unexpected errors
      throw new APIError('Failed to fetch profile', 500, 'UNKNOWN_ERROR', true);
    }
  }

  /**
   * Create new profile (or update if exists)
   * Endpoint: POST /v1/profile
   */
  async createProfile(profileData: CreateProfileRequest): Promise<UserProfile> {
    try {
      const response = await apiClient.post<UserProfileResponse>(
        API_ENDPOINTS.PROFILE.BASE,
        profileData,
        {
          timeout: API_TIMEOUTS.standardOperations,
        }
      );
      
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        // Handle validation errors specifically
        if (error.status === 400) {
          throw new APIError(
            `Profile creation validation failed: ${error.message}`,
            error.status,
            'VALIDATION_ERROR',
            false
          );
        }
        // Handle conflict errors (profile exists, unit conversion error)
        if (error.status === 409) {
          throw new APIError(
            `Profile creation conflict: ${error.message}`,
            error.status,
            'CONFLICT_ERROR',
            false
          );
        }
        // Re-throw other APIErrors with context
        throw new APIError(
          `Profile creation failed: ${error.message}`,
          error.status,
          error.code,
          error.retryable
        );
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error('🚨 UNKNOWN ERROR in createProfile:', error);
      console.error('🚨 Error type:', typeof error);
      console.error('🚨 Error constructor:', error?.constructor?.name);
      console.error('🚨 Error message:', errorMessage);
      console.error('🚨 Error stack:', errorStack);
      console.error('🚨 Error full object:', JSON.stringify(error, null, 2));
      throw new APIError(`Failed to create profile: ${errorMessage}`, 500, 'UNKNOWN_ERROR', true);
    }
  }

  /**
   * Update existing profile (partial updates supported)
   * Endpoint: PUT /v1/profile
   */
  async updateProfile(profileData: UpdateProfileRequest): Promise<UserProfile> {
    try {
      const response = await apiClient.put<UserProfileResponse>(
        API_ENDPOINTS.PROFILE.BASE,
        profileData,
        {
          timeout: API_TIMEOUTS.standardOperations,
        }
      );
      
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        // Handle validation errors specifically
        if (error.status === 400) {
          throw new APIError(
            `Profile update validation failed: ${error.message}`,
            error.status,
            'VALIDATION_ERROR',
            false
          );
        }
        // Re-throw other APIErrors with context
        throw new APIError(
          `Profile update failed: ${error.message}`,
          error.status,
          error.code,
          error.retryable
        );
      }
      throw new APIError('Failed to update profile', 500, 'UNKNOWN_ERROR', true);
    }
  }

  /**
   * Get preference-only data  
   * Endpoint: GET /v1/profile/preferences
   */
  async getPreferences(): Promise<ProfilePreferences> {
    try {
      const response = await apiClient.get<GetPreferencesResponse>(
        API_ENDPOINTS.PROFILE.PREFERENCES,
        {
          timeout: API_TIMEOUTS.standardOperations,
        }
      );
      
      // Ensure we never return undefined - TanStack Query v4+ requires non-undefined return values
      if (!response.data || !(response.data as any).data) {
        throw new APIError('Preferences response data is null or undefined', 500, 'INVALID_RESPONSE', true);
      }
      return (response.data as any).data;
    } catch (error) {
      if (error instanceof APIError) {
        throw new APIError(
          `Preferences fetch failed: ${error.message}`,
          error.status,
          error.code,
          error.retryable
        );
      }
      throw new APIError('Failed to fetch preferences', 500, 'UNKNOWN_ERROR', true);
    }
  }

  /**
   * Update preferences only
   * Endpoint: PUT /v1/profile/preferences
   * Important: Requires Content-Type: application/json header
   */
  async updatePreferences(preferences: UpdatePreferencesRequest): Promise<ProfilePreferences> {
    try {
      const response = await apiClient.put<ProfilePreferencesResponse>(
        API_ENDPOINTS.PROFILE.PREFERENCES,
        preferences,
        {
          timeout: API_TIMEOUTS.standardOperations,
          headers: { 'Content-Type': 'application/json' } // Required by backend
        }
      );
      
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        // Handle validation errors specifically
        if (error.status === 400) {
          throw new APIError(
            `Preferences validation failed: ${error.message}`,
            error.status,
            'VALIDATION_ERROR',
            false
          );
        }
        throw new APIError(
          `Preferences update failed: ${error.message}`,
          error.status,
          error.code,
          error.retryable
        );
      }
      throw new APIError('Failed to update preferences', 500, 'UNKNOWN_ERROR', true);
    }
  }

}

// Create singleton instance
export const profileService = new ProfileService();