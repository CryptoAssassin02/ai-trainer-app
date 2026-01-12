/**
 * Enhanced Profile Context Tests
 * Phase 2.1.5 - Critical system foundation testing
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  EnhancedProfileProvider,
  useEnhancedProfile,
  useProfileCompleteness,
  useUnitPreference,
  type ProfileCompletenessData,
  type ProfileRecommendation,
} from '@/lib/enhanced-profile-context';
import type { UserProfile } from '@/lib/api/types';

// Mock the hooks that the context depends on
jest.mock('@/hooks/use-profile-queries', () => ({
  useProfile: jest.fn(),
}));

jest.mock('@/hooks/use-profile-advanced', () => ({
  useProfileAdvanced: jest.fn(),
}));

const mockUseProfile = require('@/hooks/use-profile-queries').useProfile;
const mockUseProfileAdvanced = require('@/hooks/use-profile-advanced').useProfileAdvanced;

// Mock profile data
const mockCompleteProfile: UserProfile = {
  id: 'profile-123',
  userId: 'user-123',
  name: 'John Doe',
  age: 30,
  height: 180,
  weight: 75,
  gender: 'male',
  unitPreference: 'metric',
  experienceLevel: 'intermediate',
  goals: ['muscle_gain', 'strength'],
  equipment: ['dumbbells', 'barbell'],
  medicalConditions: 'none',
  workoutFrequency: '4x per week',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const mockIncompleteProfile: UserProfile = {
  id: 'profile-456',
  userId: 'user-456',
  name: 'Jane Smith',
  age: 25,
  height: 165,
  weight: 60,
  unitPreference: 'metric',
  // Missing: experienceLevel, goals, equipment, workoutFrequency
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

// Test wrapper component
const createTestWrapper = (profile: UserProfile | null = null) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  mockUseProfile.mockReturnValue({
    profile: { data: profile },
    isLoading: false,
    error: null,
    updateProfile: jest.fn().mockResolvedValue(undefined),
  });

  mockUseProfileAdvanced.mockReturnValue({
    optimisticUpdate: jest.fn(),
    backgroundSync: jest.fn(),
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <EnhancedProfileProvider>{children}</EnhancedProfileProvider>
    </QueryClientProvider>
  );
};

describe('EnhancedProfileContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Context Functionality', () => {
    it('should provide profile data from useProfile hook', () => {
      const TestWrapper = createTestWrapper(mockCompleteProfile);
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      expect(result.current.profile).toEqual(mockCompleteProfile);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useEnhancedProfile());
      }).toThrow('useEnhancedProfile must be used within an EnhancedProfileProvider');

      console.error = originalError;
    });

    it('should handle null profile data', () => {
      const TestWrapper = createTestWrapper(null);
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.completeness.overallPercentage).toBe(0);
      expect(result.current.isProfileComplete).toBe(false);
    });
  });

  describe('Profile Completeness Calculations', () => {
    it('should calculate completeness for complete profile', () => {
      const TestWrapper = createTestWrapper(mockCompleteProfile);
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      const { completeness } = result.current;
      
      expect(completeness.overallPercentage).toBeGreaterThan(80);
      expect(completeness.completedSections).toContain('personal');
      expect(completeness.completedSections).toContain('physical');
      expect(completeness.completedSections).toContain('fitness');
      expect(completeness.missingSections).toHaveLength(0);
      expect(result.current.isProfileComplete).toBe(true);
    });

    it('should calculate completeness for incomplete profile', () => {
      const TestWrapper = createTestWrapper(mockIncompleteProfile);
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      const { completeness } = result.current;
      
      expect(completeness.overallPercentage).toBeLessThan(80);
      expect(completeness.missingSections).toContain('fitness');
      expect(completeness.recommendations).toHaveLength(1); // Limited to 5 max
      expect(result.current.isProfileComplete).toBe(false);
    });

    it('should generate recommendations for missing required fields', () => {
      const TestWrapper = createTestWrapper(mockIncompleteProfile);
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      const recommendations = result.current.completeness.recommendations;
      const requiredRecs = recommendations.filter(r => r.type === 'required');
      
      expect(requiredRecs.length).toBeGreaterThan(0);
      expect(requiredRecs[0]).toMatchObject({
        type: 'required',
        priority: 'high',
      });
    });

    it('should provide next recommendation', () => {
      const TestWrapper = createTestWrapper(mockIncompleteProfile);
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      const nextRec = result.current.getNextRecommendation();
      
      expect(nextRec).toBeTruthy();
      expect(nextRec?.type).toBe('required');
    });

    it('should calculate section progress correctly', () => {
      const TestWrapper = createTestWrapper(mockIncompleteProfile);
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      const sectionProgress = result.current.completeness.sectionProgress;
      
      // Personal section should be complete (name, age)
      expect(sectionProgress.personal.percentage).toBe(100);
      expect(sectionProgress.personal.completedFields).toContain('name');
      expect(sectionProgress.personal.completedFields).toContain('age');
      
      // Fitness section should be incomplete (missing experienceLevel)
      expect(sectionProgress.fitness.percentage).toBeLessThan(100);
      expect(sectionProgress.fitness.missingFields).toContain('experienceLevel');
    });
  });

  describe('Unit Conversion Utilities', () => {
    it('should provide unit converters', () => {
      const TestWrapper = createTestWrapper(mockCompleteProfile);
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      const { converters } = result.current;
      
      expect(converters.convertHeight).toBeDefined();
      expect(converters.convertWeight).toBeDefined();
      expect(converters.formatHeight).toBeDefined();
      expect(converters.formatWeight).toBeDefined();
    });

    it('should convert height from metric to imperial', () => {
      const TestWrapper = createTestWrapper(mockCompleteProfile);
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      const converted = result.current.converters.convertHeight(180, 'metric', 'imperial');
      
      expect(converted).toEqual({ feet: 5, inches: 11 }); // 180cm ≈ 5'11"
    });

    it('should convert height from imperial to metric', () => {
      const TestWrapper = createTestWrapper(mockCompleteProfile);
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      const converted = result.current.converters.convertHeight(
        { feet: 6, inches: 0 }, 
        'imperial', 
        'metric'
      );
      
      expect(converted).toBe(183); // 6'0" ≈ 183cm
    });

    it('should convert weight from metric to imperial', () => {
      const TestWrapper = createTestWrapper(mockCompleteProfile);
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      const converted = result.current.converters.convertWeight(75, 'metric', 'imperial');
      
      expect(converted).toBeCloseTo(165.3, 1); // 75kg ≈ 165.3lbs
    });

    it('should format height correctly', () => {
      const TestWrapper = createTestWrapper(mockCompleteProfile);
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      const metricFormat = result.current.converters.formatHeight(180, 'metric');
      const imperialFormat = result.current.converters.formatHeight(
        { feet: 5, inches: 11 }, 
        'imperial'
      );
      
      expect(metricFormat).toBe('180 cm');
      expect(imperialFormat).toBe(`5'11"`);
    });

    it('should format weight correctly', () => {
      const TestWrapper = createTestWrapper(mockCompleteProfile);
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      const metricFormat = result.current.converters.formatWeight(75, 'metric');
      const imperialFormat = result.current.converters.formatWeight(165, 'imperial');
      
      expect(metricFormat).toBe('75 kg');
      expect(imperialFormat).toBe('165 lbs');
    });
  });

  describe('Unit Preference Management', () => {
    it('should get unit preference from profile', () => {
      const TestWrapper = createTestWrapper({
        ...mockCompleteProfile,
        unitPreference: 'imperial',
      });
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      expect(result.current.unitPreference).toBe('imperial');
    });

    it('should default to metric when no profile', () => {
      const TestWrapper = createTestWrapper(null);
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      expect(result.current.unitPreference).toBe('metric');
    });

    it('should update unit preference', async () => {
      const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
      
      const TestWrapper = createTestWrapper(mockCompleteProfile);
      
      // Override the default mock with our specific mock
      mockUseProfile.mockReturnValue({
        profile: { data: mockCompleteProfile },
        isLoading: false,
        error: null,
        updateProfile: mockUpdateProfile,
      });
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.setUnitPreference('imperial');
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        ...mockCompleteProfile,
        unitPreference: 'imperial',
      });
    });
  });

  describe('Convenience Hooks', () => {
    it('should provide useProfileCompleteness hook', () => {
      const TestWrapper = createTestWrapper(mockCompleteProfile);
      
      const { result } = renderHook(() => useProfileCompleteness(), {
        wrapper: TestWrapper,
      });

      expect(result.current.completeness).toBeDefined();
      expect(result.current.isProfileComplete).toBe(true);
      expect(result.current.getNextRecommendation).toBeDefined();
    });

    it('should provide useUnitPreference hook', () => {
      const TestWrapper = createTestWrapper(mockCompleteProfile);
      
      const { result } = renderHook(() => useUnitPreference(), {
        wrapper: TestWrapper,
      });

      expect(result.current.unitPreference).toBe('metric');
      expect(result.current.setUnitPreference).toBeDefined();
      expect(result.current.converters).toBeDefined();
    });
  });

  describe('Profile Operations', () => {
    it('should provide updateProfile function', async () => {
      const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
      
      const TestWrapper = createTestWrapper(mockCompleteProfile);
      
      // Override the default mock with our specific mock
      mockUseProfile.mockReturnValue({
        profile: { data: mockCompleteProfile },
        isLoading: false,
        error: null,
        updateProfile: mockUpdateProfile,
      });
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      const updateData = { name: 'Updated Name' };
      
      await act(async () => {
        await result.current.updateProfile(updateData);
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith(updateData);
    });

    it('should provide refreshProfile function', async () => {
      const mockRefetch = jest.fn().mockResolvedValue(undefined);
      
      const TestWrapper = createTestWrapper(mockCompleteProfile);
      
      // Override the default mock with our specific mock
      mockUseProfile.mockReturnValue({
        profile: { 
          data: mockCompleteProfile,
        },
        isLoading: false,
        error: null,
        updateProfile: jest.fn(),
        refetch: mockRefetch,
      });
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.refreshProfile();
      });

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle profile with empty arrays', () => {
      const profileWithEmptyArrays: UserProfile = {
        ...mockCompleteProfile,
        goals: [],
        equipment: [],
      };

      const TestWrapper = createTestWrapper(profileWithEmptyArrays);
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      const fitnessSection = result.current.completeness.sectionProgress.fitness;
      expect(fitnessSection.missingFields).toContain('goals');
    });

    it('should handle profile with null values', () => {
      const profileWithNulls: UserProfile = {
        ...mockCompleteProfile,
        gender: null as any,
        medicalConditions: null as any,
      };

      const TestWrapper = createTestWrapper(profileWithNulls);
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      expect(result.current.completeness.overallPercentage).toBeGreaterThan(0);
    });

    it('should handle unit conversion edge cases', () => {
      const TestWrapper = createTestWrapper(mockCompleteProfile);
      
      const { result } = renderHook(() => useEnhancedProfile(), {
        wrapper: TestWrapper,
      });

      // Same unit conversion should return same value
      const sameHeight = result.current.converters.convertHeight(180, 'metric', 'metric');
      expect(sameHeight).toBe(180);
      
      const sameWeight = result.current.converters.convertWeight(75, 'imperial', 'imperial');
      expect(sameWeight).toBe(75);
    });
  });
});
