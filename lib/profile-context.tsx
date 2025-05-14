"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { useEffect as useEffectWithoutSSR } from "react"
// Import the specific table type from generated types
import type { Tables } from "@/types/database.types"

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
  fitnessGoals: string[]
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
  fitnessGoals: [],
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
    medicalConditions: dbProfile.medical_conditions || defaultProfile.medicalConditions,
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
    // updated_at will be handled by DB/Supabase
  };
};

// Provider component
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile)
  const [isProfileComplete, setIsProfileComplete] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const { toast } = useToast()

  // Load profile from Supabase on mount (client-side only)
  useEffectWithoutSSR(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Get the current user session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          // No authenticated user, use localStorage as fallback
          const savedProfile = localStorage.getItem("userProfile")
          if (savedProfile) {
            setProfile(JSON.parse(savedProfile))
          }
          setIsLoading(false)
          return
        }

        const userId = session.user.id

        // Fetch the user's profile from the database
        const { data: dbData, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (error) {
          // If no profile exists yet, use defaults
          if (error.code === 'PGRST116') {
            // Profile doesn't exist yet, use default values
            setProfile({
              ...defaultProfile,
              user_id: userId
            })
          } else {
            console.error('Error fetching profile:', error)
            setError('Failed to load profile')
            toast({
              title: "Error",
              description: "Failed to load your profile data",
              variant: "destructive",
            })
          }
        } else if (dbData) {
          // If profile exists, transform it and set state
          const transformedProfile = transformDbProfileToFrontend(dbData);
          if (transformedProfile) {
            setProfile(transformedProfile)
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

    // Set up auth state change listener
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUserProfile()
      } else if (event === 'SIGNED_OUT') {
        setProfile(defaultProfile)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, toast])

  // Check if profile is complete
  useEffect(() => {
    const requiredFields: (keyof UserProfile)[] = ["name", "experienceLevel"]
    const isComplete = requiredFields.every((field) => Boolean(profile[field]))
    setIsProfileComplete(isComplete)
  }, [profile])

  // Update profile function
  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Merge incoming data with current profile state
      const profileToSave: UserProfile = { ...profile, ...data };
      
      // Get the current user session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const userId = session.user.id
        
        // Transform frontend profile to DB structure before upserting
        const dbProfileData = transformFrontendProfileToDb(profileToSave, userId);

        // Upsert the profile to Supabase
        const { error: upsertError } = await supabase
          .from('user_profiles')
          .upsert(dbProfileData) // Use transformed data
          
        if (upsertError) {
          console.error('Error updating profile:', upsertError)
          setError('Failed to update profile')
          toast({
            title: "Error",
            description: "Failed to save your profile data",
            variant: "destructive",
          })
          return
        }
        
        // Refetch the profile to get the latest data (e.g., with generated ID/timestamps)
        const { data: refetchedDbData, error: fetchError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single()
          
        if (fetchError) {
          console.error('Error fetching updated profile:', fetchError)
        } else if (refetchedDbData) {
          // Transform the refetched data before setting state
          const updatedTransformedProfile = transformDbProfileToFrontend(refetchedDbData);
          if (updatedTransformedProfile) {
             setProfile(updatedTransformedProfile)
          }
          toast({
            title: "Success",
            description: "Your profile has been updated",
          })
        }
      } else {
        // No authenticated user, update local state and localStorage (no transformation needed here)
        const updatedLocalProfile = { ...profile, ...data, updated_at: new Date().toISOString() };
        setProfile(updatedLocalProfile)
        localStorage.setItem("userProfile", JSON.stringify(updatedLocalProfile))
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

