/**
 * Profile Creation Page
 * Uses the multi-step profile form component for comprehensive profile setup
 */

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { MultiStepProfileForm } from "@/components/profile/multi-step-profile-form"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useServerAuth } from '@/hooks/use-server-auth'
import { useProfileQueryContext } from '@/components/profile/profile-query-provider'
import { Sparkles } from 'lucide-react'

// Loading component for the form
function ProfileFormSkeleton() {
  return (
    <Card className="w-full max-w-4xl mx-auto bg-card/50 backdrop-blur-sm border border-border/50">
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
  const { user, loading: authLoading } = useServerAuth();
  const { profile: profileData, isLoading: profileLoading } = useProfileQueryContext();
  
  // State to prevent loading flash
  const [showContent, setShowContent] = useState(false);
  
  // Effect to control content visibility and prevent flash
  useEffect(() => {
    if (!authLoading && !profileLoading) {
      // Small delay to prevent flash for very fast loads
      const timer = setTimeout(() => setShowContent(true), 150);
      return () => clearTimeout(timer);
    }
  }, [authLoading, profileLoading]);
  
  useEffect(() => {
    // Only redirect if user has a COMPLETE profile AND they're not intentionally on this page
    // Add a delay to prevent immediate redirects that interfere with navigation
    const timer = setTimeout(() => {
      if (!authLoading && !profileLoading && profileData) {
        // Check if profile is complete based on required fields
        const requiredFields = ['name', 'age', 'height', 'weight', 'experienceLevel', 'goals'];
        const hasAllRequiredFields = requiredFields.every(field => {
          const value = (profileData as any)?.[field];
          return value !== null && value !== undefined && value !== '' && 
                 !(Array.isArray(value) && value.length === 0);
        });
        
        // Only redirect if user has complete profile AND they didn't just navigate here intentionally
        // Check if this is a fresh page load vs intentional navigation
        if (hasAllRequiredFields && !document.referrer.includes('/profile')) {
          console.log('🔄 User has complete profile, redirecting to /profile');
          router.push('/profile');
          return;
        }
      }
      
      // Log the current state for debugging
      console.log('📊 Profile creation page state:', { 
        authLoading, 
        profileLoading,
        hasProfile: !!profileData, 
        profileId: profileData?.id 
      });
    }, 500); // 500ms delay to prevent immediate redirects

    return () => clearTimeout(timer);
  }, [authLoading, profileLoading, profileData, router]);
  
  // Show loading while checking auth status and profile data
  if (authLoading || profileLoading || !showContent) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Background Effects - consistent with landing page */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/50" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(100,149,237,0.1),transparent_50%)]" />
        </div>

        <div className="relative">
          <div className="container py-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4">Create Your trAIner Profile</h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Checking your profile status...
              </p>
            </div>
            <ProfileFormSkeleton />
          </div>
        </div>
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
        <div className="min-h-screen bg-background relative overflow-hidden">
          {/* Background Effects - consistent with landing page */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/50" />
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(100,149,237,0.1),transparent_50%)]" />
          </div>

          <div className="relative">
            <div className="container py-10">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-4">Redirecting...</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  You already have a complete profile. Redirecting to profile page...
                </p>
              </div>
              <ProfileFormSkeleton />
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Effects - consistent with landing page */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/50" />
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(100,149,237,0.1),transparent_50%)]" />
      </div>

      {/* Content */}
      <div className="relative">
        <div className="container py-10">
          {/* Header Section - consistent with landing page style */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-cornflower-blue/10 border border-cornflower-blue/20 mb-6">
              <Sparkles className="w-4 h-4 text-cornflower-blue mr-2" />
              <span className="text-sm font-medium text-cornflower-blue">Profile Creation</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight">
              Create Your{' '}
              <span className="text-cornflower-blue bg-gradient-to-r from-cornflower-blue to-blue-400 bg-clip-text text-transparent">
                trAIner
              </span>{' '}
              Profile
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
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
              router.push('/')
            }}
          />
        </div>
      </div>
    </div>
  )
}
