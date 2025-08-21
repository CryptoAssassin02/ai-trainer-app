"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { profileService } from "@/lib/api/services/profile-service"
import { useEffect as useEffectWithoutSSR } from "react"
// Import the specific table type from generated types
import type { Tables } from "@/types/database.types"
import type { UserProfile as ApiUserProfile, CreateProfileRequest } from "@/lib/api/types"

// Profile completion calculation (imported from hooks)
const calculateProfileCompletion = (profile: UserProfile): number => {
  const requiredFields = ['name', 'age', 'height', 'weight', 'experienceLevel', 'fitnessGoals'];
  const missingFields = requiredFields.filter(field => {
    const value = profile[field as keyof UserProfile];
    return !value || (Array.isArray(value) && value.length === 0);
  });
  const totalFields = requiredFields.length;
  const completedFields = totalFields - missingFields.length;
  return Math.round((completedFields / totalFields) * 100);
};

// Helper functions to convert between UserProfile types
const convertApiToLocalProfile = (apiProfile: ApiUserProfile): UserProfile => {
  return {
    id: apiProfile.id,
    user_id: apiProfile.userId,
    name: apiProfile.name || '',
    age: apiProfile.age || 0,
    gender: apiProfile.gender || '',
    height: typeof apiProfile.height === 'number' ? apiProfile.height : 0,
    weight: apiProfile.weight || 0,
    experienceLevel: apiProfile.experienceLevel || 'beginner',
    fitnessGoals: apiProfile.goals || [],
    medicalConditions: apiProfile.medicalConditions || '',
    equipment: apiProfile.equipment || [],
    created_at: apiProfile.createdAt,
    updated_at: apiProfile.updatedAt,
    unit_preference: apiProfile.unitPreference || 'metric'
  };
};

const convertLocalToApiProfile = (localProfile: UserProfile): CreateProfileRequest => {
  return {
    unitPreference: localProfile.unit_preference || 'metric',
    name: localProfile.name,
    age: localProfile.age,
    gender: localProfile.gender as any,
    height: localProfile.height,
    weight: localProfile.weight,
    experienceLevel: localProfile.experienceLevel,
    goals: localProfile.goals || localProfile.fitnessGoals, // FIXED: Support both field names
    equipment: localProfile.equipment,
    medicalConditions: localProfile.medicalConditions,
    workoutFrequency: ''
  };
};

// Define the shape of the user profile data
export interface UserProfile {
  id?: string
  user_id?: string
  name: string
  age: number
  gender: string
  height: number // in cm
  weight: number // in kg
  experienceLevel: "beginner" | "intermediate" | "advanced"
  goals?: string[] // New field name (preferred)
  fitnessGoals: string[] // Legacy field name (for backward compatibility)
  medicalConditions: string
  equipment: string[]
  created_at?: string
  updated_at?: string
  unit_preference?: "metric" | "imperial"
}

// Default profile values
const defaultProfile: UserProfile = {
  name: "",
  age: 30,
  gender: "prefer-not-to-say",
  height: 178,
  weight: 75,
  experienceLevel: "beginner",
  goals: [], // New field name (preferred)
  fitnessGoals: [], // Legacy field name (for backward compatibility)
  medicalConditions: "",
  equipment: [],
  unit_preference: "metric"
}

// Create the context
interface ProfileContextType {
  profile: UserProfile
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
  isProfileComplete: boolean
  isLoading: boolean
  error: string | null
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

// Helper function to transform DB profile to frontend UserProfile
const transformDbProfileToFrontend = (dbProfile: Tables<'user_profiles'> | null): UserProfile | null => {
  if (!dbProfile) return null;

  // Type guard helper for experience level
  const experienceLevels = ["beginner", "intermediate", "advanced"] as const;
  type ExperienceLevel = typeof experienceLevels[number];
  const isValidExperienceLevel = (level: string | null): level is ExperienceLevel => 
    experienceLevels.includes(level as ExperienceLevel);

  // Type guard helper for unit preference
  const unitPreferences = ["metric", "imperial"] as const;
  type UnitPreference = typeof unitPreferences[number];
  const isValidUnitPreference = (pref: string | null): pref is UnitPreference =>
    unitPreferences.includes(pref as UnitPreference);

  return {
    id: dbProfile.id,
    user_id: dbProfile.user_id,
    name: dbProfile.name || defaultProfile.name,
    age: dbProfile.age === null ? defaultProfile.age : dbProfile.age,
    gender: dbProfile.gender === null ? defaultProfile.gender : dbProfile.gender,
    height: dbProfile.height === null ? defaultProfile.height : dbProfile.height,
    weight: dbProfile.weight === null ? defaultProfile.weight : dbProfile.weight,
    // Use type guard or default for experienceLevel
    experienceLevel: isValidExperienceLevel(dbProfile.experience_level) 
      ? dbProfile.experience_level 
      : defaultProfile.experienceLevel,
    fitnessGoals: dbProfile.fitness_goals || defaultProfile.fitnessGoals,
    medicalConditions: typeof dbProfile.medical_conditions === 'string' 
      ? dbProfile.medical_conditions 
      : defaultProfile.medicalConditions,
    equipment: dbProfile.equipment || defaultProfile.equipment,
    created_at: dbProfile.created_at || undefined,
    updated_at: dbProfile.updated_at || undefined,
    // Use type guard or default for unit_preference
    unit_preference: isValidUnitPreference(dbProfile.unit_preference)
      ? dbProfile.unit_preference
      : defaultProfile.unit_preference,
  };
};

// Helper function to transform frontend UserProfile to DB structure
const transformFrontendProfileToDb = (profile: UserProfile, userId: string) => {
  return {
    // Map camelCase to snake_case
    id: profile.id, // Include if updating
    user_id: profile.user_id || userId,
    name: profile.name,
    age: profile.age,
    gender: profile.gender,
    height: profile.height,
    weight: profile.weight,
    experience_level: profile.experienceLevel,
    fitness_goals: profile.fitnessGoals,
    medical_conditions: profile.medicalConditions,
    equipment: profile.equipment,
    unit_preference: profile.unit_preference,
    // updated_at will be handled by backend database
  };
};

// Provider component
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile)
  const [isProfileComplete, setIsProfileComplete] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Load profile from backend API on mount (client-side only)
  useEffectWithoutSSR(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Check if user is authenticated via localStorage
        const authToken = localStorage.getItem('auth_token')
        const userId = localStorage.getItem('user_id')
        
        if (!authToken || !userId) {
          console.log('No auth token or user ID, using defaults')
          const savedProfile = localStorage.getItem("userProfile")
          if (savedProfile) {
            setProfile(JSON.parse(savedProfile))
          }
          setIsLoading(false)
          return
        }

        // Fetch the user's profile from the backend API
        try {
          console.log('Fetching user profile from backend API...')
          const profileData = await profileService.getProfile()
          
          if (profileData) {
            console.log('Profile found via backend API:', profileData)
            const transformedProfile = convertApiToLocalProfile(profileData)
            setProfile(transformedProfile)
            setIsProfileComplete(calculateProfileCompletion(transformedProfile) >= 80)
          }
        } catch (apiError: any) {
          // Handle API errors
          if (apiError?.status === 404 || apiError?.message?.includes('not found')) {
            // No profile found, this is expected for new users
            setProfile({
              ...defaultProfile,
              user_id: userId
            })
            setIsProfileComplete(false)
          } else {
            console.error('Error fetching profile from API:', apiError)
            setError('Failed to load profile')
            toast({
              title: "Error",
              description: "Failed to load your profile data",
              variant: "destructive",
            })
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('An unexpected error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserProfile()
  }, [toast])

  // Check if profile is complete - FIXED: Use specific profile values to prevent infinite loops
  useEffect(() => {
    const requiredFields: (keyof UserProfile)[] = ["name", "experienceLevel"]
    const isComplete = requiredFields.every((field) => Boolean(profile[field]))
    
    // Only update state if the completion status actually changed
    setIsProfileComplete(prev => {
      if (prev !== isComplete) {
        return isComplete;
      }
      return prev;
    });
  }, [profile.name, profile.experienceLevel]) // FIXED: Depend on specific values, not entire profile object

  // Update profile function
  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Check if user is authenticated
      const authToken = localStorage.getItem('auth_token')
      const userId = localStorage.getItem('user_id')
      
      if (!authToken || !userId) {
        console.warn('Not authenticated, saving to localStorage only')
        const updatedProfile = { ...profile, ...data }
        setProfile(updatedProfile)
        localStorage.setItem("userProfile", JSON.stringify(updatedProfile))
        return
      }

      // Merge incoming data with current profile state
      const profileToSave: UserProfile = { ...profile, ...data };
      
      // Save profile via backend API
      try {
        console.log('Updating profile via backend API...')
        const apiProfileData = convertLocalToApiProfile(profileToSave)
        const updatedApiProfile = await profileService.updateProfile(apiProfileData)
        
        // Convert API response back to local format and update state
        const updatedProfile = convertApiToLocalProfile(updatedApiProfile)
        setProfile(updatedProfile)
        toast({
          title: "Success",
          description: "Your profile has been updated",
        })
      } catch (apiError: any) {
        console.error('Error updating profile via backend API:', apiError)
        setError('Failed to update profile')
        toast({
          title: "Error",
          description: "Failed to save your profile data",
          variant: "destructive",
        })
        return
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const contextValue: ProfileContextType = {
    profile,
    updateProfile,
    isProfileComplete,
    isLoading,
    error
  }

  return (
    <ProfileContext.Provider value={contextValue}>{children}</ProfileContext.Provider>
  )
}

// Hook for using the profile context
export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider")
  }
  return context
}

