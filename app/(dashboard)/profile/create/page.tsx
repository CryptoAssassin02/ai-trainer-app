/**
 * Profile Creation Page
 * Uses the multi-step profile form component for comprehensive profile setup
 */

'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { MultiStepProfileForm } from "@/components/profile/multi-step-profile-form"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useAuth } from '@/hooks/use-auth'

// Loading component for the form
function ProfileFormSkeleton() {
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProfileCreatePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  
  // Check if user has a COMPLETE profile and redirect to profile view
  // Use auth context profile data instead of separate query to avoid conflicts
  const { profile: profileData, loading: authLoading } = useAuth();
  

  
  useEffect(() => {
    // Only redirect if user has a COMPLETE profile, not just any profile
    // Use auth context data which is already loaded and doesn't conflict with ProfileQueryProvider
    if (!authLoading && profileData) {
      // Check if profile is complete based on required fields
      const requiredFields = ['name', 'age', 'height', 'weight', 'experienceLevel', 'goals'];
      const hasAllRequiredFields = requiredFields.every(field => {
        const value = (profileData as any)?.[field];
        return value !== null && value !== undefined && value !== '' && 
               !(Array.isArray(value) && value.length === 0);
      });
      
      if (hasAllRequiredFields) {
        console.log('🔄 User has complete profile, redirecting to /profile');
        router.push('/profile');
        return;
      }
    }
    
    // Log the current state for debugging
    console.log('📊 Profile creation page state:', { 
      authLoading, 
      hasProfile: !!profileData, 
      profileId: profileData?.id 
    });
  }, [authLoading, profileData, router]);
  
  // Show loading while checking auth status and profile data
  if (authLoading) {
    return (
      <div className="container py-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Create Your Fitness Profile</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Checking your profile status...
          </p>
        </div>
        <ProfileFormSkeleton />
      </div>
    );
  }
  
  // If user has complete profile, show loading while redirect happens
  if (profileData) {
    const requiredFields = ['name', 'age', 'height', 'weight', 'experienceLevel', 'goals'];
    const hasAllRequiredFields = requiredFields.every(field => {
      const value = (profileData as any)?.[field];
      return value !== null && value !== undefined && value !== '' && 
             !(Array.isArray(value) && value.length === 0);
    });
    
    if (hasAllRequiredFields) {
      return (
        <div className="container py-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Redirecting...</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              You already have a complete profile. Redirecting to profile page...
            </p>
          </div>
          <ProfileFormSkeleton />
        </div>
      );
    }
  }

  return (
    <div className="container py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Create Your Fitness Profile</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Complete your personalized fitness profile to get AI-powered workout recommendations 
          tailored specifically to your goals, experience level, and available equipment.
        </p>
      </div>
      
      <MultiStepProfileForm 
        mode="create"
        enableAutoSave={false}
        enableOptimistic={true}
        initialStep={0}
        showProgress={true}
        allowSkipOptional={true}
        showStepNavigation={true}
        onSuccess={async (profile) => {
          // Ensure cache is updated before redirect
          await queryClient.invalidateQueries({ queryKey: ['profile'] });
          // Use Next.js router for proper navigation
          router.push('/profile');
        }}
        onCancel={() => {
          // Redirect back to dashboard if user cancels
          router.push('/dashboard')
        }}
      />
    </div>
  )
}
