'use client'

import { UserProfileForm } from "@/components/profile/user-profile-form"
import { Sparkles } from 'lucide-react'

export default function ProfilePage() {
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
              <span className="text-sm font-medium text-cornflower-blue">Profile Management</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight">
              Your{' '}
              <span className="text-cornflower-blue bg-gradient-to-r from-cornflower-blue to-blue-400 bg-clip-text text-transparent">
                trAIner
              </span>{' '}
              Profile
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Update your profile to keep your workout recommendations personalized and effective.
            </p>
          </div>

          <UserProfileForm 
            mode="edit"
            enableAutoSave={true}
            redirectOnSuccess="/workouts"
            showAdvancedOptions={true}
            enableRealTimeValidation={true}
            showCompletionIndicator={true}
            title="" // Remove title since we're using our own header
            description="" // Remove description since we're using our own header
          />
        </div>
      </div>
    </div>
  )
} 