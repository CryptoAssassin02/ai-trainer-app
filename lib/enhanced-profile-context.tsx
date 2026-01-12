/**
 * Enhanced Profile Context
 * Phase 2.1.4 - Modern React Query integration with profile completeness calculations
 */

'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useProfile } from '@/hooks/use-profile-queries';
import { useProfileCompletion, useProfileValidation, useProfileOverview } from '@/hooks/use-profile-advanced';
import type { UserProfile } from '@/lib/api/types';

// Profile completeness calculation interface
export interface ProfileCompletenessData {
  overallPercentage: number;
  completedSections: string[];
  missingSections: string[];
  recommendations: ProfileRecommendation[];
  sectionProgress: {
    [key: string]: {
      percentage: number;
      completedFields: string[];
      missingFields: string[];
      isRequired: boolean;
    };
  };
}

// Profile recommendation interface
export interface ProfileRecommendation {
  id: string;
  type: 'required' | 'suggested' | 'optional';
  section: string;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

// Unit conversion utilities interface
export interface UnitConverters {
  convertHeight: (value: number | { feet: number; inches: number }, from: 'metric' | 'imperial', to: 'metric' | 'imperial') => number | { feet: number; inches: number };
  convertWeight: (value: number, from: 'metric' | 'imperial', to: 'metric' | 'imperial') => number;
  formatHeight: (value: number | { feet: number; inches: number }, units: 'metric' | 'imperial') => string;
  formatWeight: (value: number, units: 'metric' | 'imperial') => string;
}

// Enhanced context interface
export interface EnhancedProfileContextType {
  // Profile data and operations
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  updateProfile: (data: any) => Promise<void>;
  refreshProfile: () => Promise<void>;
  
  // Completeness calculations
  completeness: ProfileCompletenessData;
  isProfileComplete: boolean;
  getNextRecommendation: () => ProfileRecommendation | null;
  
  // Unit management
  unitPreference: 'metric' | 'imperial';
  setUnitPreference: (units: 'metric' | 'imperial') => Promise<void>;
  converters: UnitConverters;
  
  // Advanced features
  optimisticUpdates: boolean;
  setOptimisticUpdates: (enabled: boolean) => void;
  conflictResolution: {
    hasConflict: boolean;
    resolve: (choice: 'local' | 'server') => void;
  };
}

const EnhancedProfileContext = createContext<EnhancedProfileContextType | undefined>(undefined);

// Profile section definitions
const PROFILE_SECTIONS = {
  personal: {
    name: 'Personal Information',
    requiredFields: ['name', 'age'],
    optionalFields: ['gender'],
    weight: 0.3,
  },
  physical: {
    name: 'Physical Measurements',
    requiredFields: ['height', 'weight'],
    optionalFields: [],
    weight: 0.25,
  },
  fitness: {
    name: 'Fitness Information',
    requiredFields: ['experienceLevel'],
    optionalFields: ['goals', 'medicalConditions'],
    weight: 0.25,
  },
  preferences: {
    name: 'Preferences & Equipment',
    requiredFields: [],
    optionalFields: ['equipment', 'workoutFrequency'],
    weight: 0.2,
  },
} as const;

// Unit conversion utilities
const createUnitConverters = (): UnitConverters => ({
  convertHeight: (value, from, to) => {
    if (from === to) return value;
    
    if (from === 'imperial' && to === 'metric') {
      if (typeof value === 'object') {
        return Math.round(((value.feet * 12) + value.inches) * 2.54);
      }
      return value;
    }
    
    if (from === 'metric' && to === 'imperial') {
      if (typeof value === 'number') {
        const totalInches = Math.round(value / 2.54);
        return {
          feet: Math.floor(totalInches / 12),
          inches: totalInches % 12,
        };
      }
      return value;
    }
    
    return value;
  },
  
  convertWeight: (value, from, to) => {
    if (from === to) return value;
    
    if (from === 'imperial' && to === 'metric') {
      return Math.round((value * 0.453592) * 10) / 10;
    }
    
    if (from === 'metric' && to === 'imperial') {
      return Math.round((value * 2.20462) * 10) / 10;
    }
    
    return value;
  },
  
  formatHeight: (value, units) => {
    if (units === 'imperial' && typeof value === 'object') {
      return `${value.feet}'${value.inches}"`;
    }
    if (units === 'metric' && typeof value === 'number') {
      return `${value} cm`;
    }
    return String(value);
  },
  
  formatWeight: (value, units) => {
    const unit = units === 'metric' ? 'kg' : 'lbs';
    return `${value} ${unit}`;
  },
});

// Completeness calculation function
const calculateProfileCompleteness = (profile: UserProfile | null): ProfileCompletenessData => {
  if (!profile) {
    return {
      overallPercentage: 0,
      completedSections: [],
      missingSections: Object.keys(PROFILE_SECTIONS),
      recommendations: [],
      sectionProgress: {},
    };
  }

  const sectionProgress: ProfileCompletenessData['sectionProgress'] = {};
  const completedSections: string[] = [];
  const missingSections: string[] = [];
  const recommendations: ProfileRecommendation[] = [];

  let totalWeight = 0;
  let completedWeight = 0;

  Object.entries(PROFILE_SECTIONS).forEach(([sectionKey, section]) => {
    const allFields = [...section.requiredFields, ...section.optionalFields];
    const requiredFields = section.requiredFields;
    
    const completedFields = allFields.filter(field => {
      const value = (profile as any)[field];
      return value !== undefined && value !== null && value !== '' && 
             !(Array.isArray(value) && value.length === 0);
    });
    
    const missingFields = allFields.filter(field => !completedFields.includes(field));
    const completedRequired = requiredFields.filter(field => completedFields.includes(field));
    
    // Calculate percentage - if all required fields are complete, show 100%
    // Otherwise, show percentage based on required field completion
    const requiredPercentage = requiredFields.length > 0 ? 
      (completedRequired.length / requiredFields.length) * 100 : 100;
    
    const sectionPercentage = requiredFields.length > 0 ? 
      (completedRequired.length === requiredFields.length ? 100 : Math.round(requiredPercentage)) :
      Math.round((completedFields.length / allFields.length) * 100);
    
    const isComplete = requiredFields.every(field => completedFields.includes(field));
    
    sectionProgress[sectionKey] = {
      percentage: sectionPercentage,
      completedFields,
      missingFields,
      isRequired: requiredFields.length > 0,
    };

    if (isComplete) {
      completedSections.push(sectionKey);
      completedWeight += section.weight;
    } else {
      missingSections.push(sectionKey);
      
      // Add recommendations for missing required fields
      const missingRequired = requiredFields.filter(field => !completedFields.includes(field));
      missingRequired.forEach(field => {
        recommendations.push({
          id: `${sectionKey}-${field}`,
          type: 'required',
          section: section.name,
          title: `Complete ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
          description: `This information is required for personalized workout recommendations.`,
          action: `Fill in your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
          priority: 'high',
        });
      });
      
      // Add suggestions for optional fields that could improve recommendations
      const missingOptional = section.optionalFields.filter(field => !completedFields.includes(field));
      if (completedRequired.length === requiredFields.length && missingOptional.length > 0) {
        missingOptional.slice(0, 2).forEach(field => { // Limit to 2 suggestions per section
          recommendations.push({
            id: `${sectionKey}-${field}-optional`,
            type: 'suggested',
            section: section.name,
            title: `Add ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
            description: `This information will help us provide better workout recommendations.`,
            action: `Consider adding your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
            priority: 'medium',
          });
        });
      }
    }

    totalWeight += section.weight;
  });

  const overallPercentage = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  // Sort recommendations by priority
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

  return {
    overallPercentage,
    completedSections,
    missingSections,
    recommendations: recommendations.slice(0, 5), // Limit to top 5 recommendations
    sectionProgress,
  };
};

// Provider component
export function EnhancedProfileProvider({ children }: { children: React.ReactNode }) {
  const profileQuery = useProfile({ enableOptimistic: true });
  const profileCompletion = useProfileCompletion();
  const profileValidation = useProfileValidation();
  const profileOverview = useProfileOverview();

  // Unit converters
  const converters = useMemo(() => createUnitConverters(), []);

  // Completeness calculations
  const completeness = useMemo(() => 
    calculateProfileCompleteness(profileQuery.profile.data), 
    [profileQuery.profile.data]
  );

  // Unit preference from profile or default
  const unitPreference = profileQuery.profile?.data?.unitPreference || 'metric';

  // Profile completeness check
  const isProfileComplete = useMemo(() => 
    completeness.overallPercentage >= 80 && completeness.recommendations.filter(r => r.type === 'required').length === 0,
    [completeness]
  );

  // Get next recommendation
  const getNextRecommendation = (): ProfileRecommendation | null => {
    return completeness.recommendations.find(r => r.type === 'required') || 
           completeness.recommendations.find(r => r.type === 'suggested') || 
           null;
  };

  // Set unit preference
  const setUnitPreference = async (units: 'metric' | 'imperial') => {
    if (!profileQuery.profile?.data) return;
    
    await profileQuery.updateProfile({
      ...profileQuery.profile.data,
      unitPreference: units,
    });
  };

  // Conflict resolution
  const conflictResolution = {
    hasConflict: false, // This would be implemented with the auto-save conflict detection
    resolve: (choice: 'local' | 'server') => {
      // Implementation would depend on the conflict resolution system
      console.log(`Resolving conflict with choice: ${choice}`);
    },
  };

  const contextValue: EnhancedProfileContextType = {
    // Profile data and operations
    profile: profileQuery.profile?.data || null,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    updateProfile: profileQuery.updateProfile,
    refreshProfile: profileQuery.refetch,
    
    // Completeness calculations
    completeness,
    isProfileComplete,
    getNextRecommendation,
    
    // Unit management
    unitPreference,
    setUnitPreference,
    converters,
    
    // Advanced features
    optimisticUpdates: true,
    setOptimisticUpdates: () => {}, // Could be implemented with state
    conflictResolution,
  };

  return (
    <EnhancedProfileContext.Provider value={contextValue}>
      {children}
    </EnhancedProfileContext.Provider>
  );
}

// Hook for using the enhanced profile context
export function useEnhancedProfile() {
  const context = useContext(EnhancedProfileContext);
  if (context === undefined) {
    throw new Error('useEnhancedProfile must be used within an EnhancedProfileProvider');
  }
  return context;
}

// Convenience hooks for specific features
export function useProfileCompleteness() {
  const { completeness, isProfileComplete, getNextRecommendation } = useEnhancedProfile();
  return { completeness, isProfileComplete, getNextRecommendation };
}

export function useUnitPreference() {
  const { unitPreference, setUnitPreference, converters } = useEnhancedProfile();
  return { unitPreference, setUnitPreference, converters };
}
