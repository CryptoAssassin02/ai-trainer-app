"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { useEffect as useEffectWithoutSSR } from "react"

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
        const { data, error } = await supabase
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
        } else if (data) {
          // If profile exists, use it
          setProfile(data)
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
      
      const updatedProfile = { ...profile, ...data, updated_at: new Date().toISOString() }
      
      // Get the current user session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const userId = session.user.id
        
        // Upsert the profile to Supabase
        const { error } = await supabase
          .from('user_profiles')
          .upsert({ 
            ...updatedProfile,
            user_id: userId,
            id: profile.id // Keep existing ID if present
          })
          
        if (error) {
          console.error('Error updating profile:', error)
          setError('Failed to update profile')
          toast({
            title: "Error",
            description: "Failed to save your profile data",
            variant: "destructive",
          })
          return
        }
        
        // Refetch the profile to get the latest data with ID
        const { data, error: fetchError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single()
          
        if (fetchError) {
          console.error('Error fetching updated profile:', fetchError)
        } else if (data) {
          setProfile(data)
          toast({
            title: "Success",
            description: "Your profile has been updated",
          })
        }
      } else {
        // No authenticated user, use localStorage as fallback
        setProfile(updatedProfile)
        localStorage.setItem("userProfile", JSON.stringify(updatedProfile))
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

