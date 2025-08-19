'use client';

import { useAuth } from '@/providers/auth-provider';

/**
 * Hook to check various authentication states
 */
export function useAuthStatus() {
  const { user, session, loading, isAuthenticated, profile } = useAuth();

  return {
    // Basic states
    isAuthenticated,
    isLoading: loading,
    hasSession: !!session,
    hasUser: !!user,
    hasProfile: !!profile,
    
    // Derived states
    isAnonymous: !isAuthenticated,
    isEmailVerified: !!user?.email_confirmed_at,
    needsEmailVerification: isAuthenticated && !user?.email_confirmed_at,
    needsProfileCompletion: isAuthenticated && !profile,
    
    // User info
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.name,
    userAvatarUrl: user?.avatarUrl,
    
    // Session info
    sessionExpiresAt: session?.expires_at,
    sessionExpiresIn: session?.expires_in,
    accessToken: session?.access_token,
    refreshToken: session?.refresh_token,
    
    // Profile info
    userProfile: profile,
    
    // Convenience checks
    canAccessDashboard: isAuthenticated && !!profile,
    canAccessSettings: isAuthenticated,
    shouldRedirectToProfile: isAuthenticated && !profile,
    shouldRedirectToLogin: !isAuthenticated,
  };
}