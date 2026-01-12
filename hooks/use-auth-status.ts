'use client';

import { useAuth } from '@/components/auth/supabase-auth-provider';

/**
 * Hook to check various authentication states
 */
export function useAuthStatus() {
  const { user, loading, isAuthenticated } = useAuth();
  
  // Note: Profile data should be fetched separately using profile queries
  // Session data is managed internally by Supabase auth
  const profile = null; // TODO: Get from profile context when needed
  const session = null; // Session is managed internally by Supabase

  // Check if profile is complete (same logic as profile creation page)
  const isProfileComplete = profile ? (() => {
    const requiredFields = ['name', 'age', 'height', 'weight', 'experienceLevel', 'goals'];
    return requiredFields.every(field => {
      const value = (profile as any)?.[field];
      return value !== null && value !== undefined && value !== '' && 
             !(Array.isArray(value) && value.length === 0);
    });
  })() : false;

  return {
    // Basic states
    isAuthenticated,
    isLoading: loading,
    hasSession: isAuthenticated, // Simplified: if authenticated, has session
    hasUser: !!user,
    hasProfile: !!profile,
    
    // Derived states
    isAnonymous: !isAuthenticated,
    isEmailVerified: !!user?.email, // Simplified - assume email presence means verified
    needsEmailVerification: false, // Disabled - not using email verification in current auth system
    needsProfileCompletion: isAuthenticated && (!profile || !isProfileComplete),
    
    // User info
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.name,
    userAvatarUrl: user?.avatarUrl,
    
    // Session info (managed internally by Supabase)
    sessionExpiresAt: undefined, // Managed internally by Supabase
    sessionExpiresIn: undefined, // Managed internally by Supabase  
    accessToken: undefined, // Not exposed in simplified auth context
    refreshToken: undefined, // Not exposed in simplified auth context
    
    // Profile info
    userProfile: profile,
    
    // Convenience checks
    canAccessDashboard: isAuthenticated && !!profile,
    canAccessSettings: isAuthenticated,
    shouldRedirectToProfile: isAuthenticated && !profile,
    shouldRedirectToLogin: !isAuthenticated,
  };
}