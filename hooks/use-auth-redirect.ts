'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStatus } from './use-auth-status';

interface UseAuthRedirectOptions {
  redirectTo?: string;
  requiresAuth?: boolean;
  requiresProfile?: boolean;
  requiresEmailVerification?: boolean;
  redirectIfAuthenticated?: boolean;
  enabled?: boolean;
}

/**
 * Hook to handle automatic redirects based on authentication state
 */
export function useAuthRedirect(options: UseAuthRedirectOptions = {}) {
  const {
    redirectTo = '/login',
    requiresAuth = false,
    requiresProfile = false,
    requiresEmailVerification = false,
    redirectIfAuthenticated = false,
    enabled = true,
  } = options;

  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);
  const {
    isAuthenticated,
    isLoading,
    hasProfile,
    isEmailVerified,
    needsEmailVerification,
    needsProfileCompletion,
  } = useAuthStatus();
  
  // Reset hasRedirected when authentication state changes
  useEffect(() => {
    setHasRedirected(false);
  }, [isAuthenticated]);

  useEffect(() => {
    // Don't redirect if disabled, still loading, or already redirected
    if (!enabled || isLoading || hasRedirected) return;

    // CRITICAL FIX: Use window.location.replace instead of router.push to avoid NEXT_REDIRECT errors
    // This performs a proper browser redirect without going through Next.js client-side routing
    const handleRedirect = (url: string) => {
      console.log('🔄 [AUTH REDIRECT] Performing browser redirect to:', url);
      setHasRedirected(true);
      window.location.replace(url);
    };

    // Get current path
    const currentPath = window.location.pathname;
    
    // Redirect authenticated users away from public pages (like login/signup)
    if (redirectIfAuthenticated && isAuthenticated) {
      console.log('🔄 [AUTH REDIRECT] Redirecting authenticated user:', { 
        needsProfileCompletion, 
        currentPath,
        hasProfile 
      });
      
      // Prevent redirect loop: don't redirect if already on target page
      if (needsProfileCompletion && currentPath !== '/profile/create') {
        handleRedirect('/profile/create');
        return;
      } else if (!needsProfileCompletion && currentPath !== '/' && !currentPath.startsWith('/profile') && !currentPath.startsWith('/progress') && !currentPath.startsWith('/workouts')) {
        handleRedirect('/');
        return;
      }
    }

    // Redirect unauthenticated users from protected pages
    if (requiresAuth && !isAuthenticated) {
      // Prevent redirect loop: don't redirect if already on login page
      if (currentPath !== redirectTo) {
        handleRedirect(redirectTo);
        return;
      }
    }

    // Redirect to email verification if required
    if (requiresEmailVerification && isAuthenticated && needsEmailVerification) {
      if (currentPath !== '/auth/verify-email') {
        handleRedirect('/auth/verify-email');
        return;
      }
    }

    // Redirect to profile completion if required
    if (requiresProfile && isAuthenticated && !hasProfile) {
      if (currentPath !== '/profile/create') {
        handleRedirect('/profile/create');
        return;
      }
    }
  }, [
    enabled,
    isLoading,
    isAuthenticated,
    hasProfile,
    isEmailVerified,
    needsEmailVerification,
    needsProfileCompletion,
    requiresAuth,
    requiresProfile,
    requiresEmailVerification,
    redirectIfAuthenticated,
    redirectTo,
    hasRedirected,
  ]);

  return {
    isRedirecting: isLoading,
    shouldRedirect: enabled && !isLoading && (
      (requiresAuth && !isAuthenticated) ||
      (requiresProfile && isAuthenticated && !hasProfile) ||
      (requiresEmailVerification && isAuthenticated && needsEmailVerification) ||
      (redirectIfAuthenticated && isAuthenticated)
    ),
  };
}

/**
 * Convenience hook for pages that require authentication
 */
export function useRequireAuth(redirectTo = '/login') {
  return useAuthRedirect({
    requiresAuth: true,
    redirectTo,
  });
}

/**
 * Convenience hook for pages that require authentication and profile
 */
export function useRequireProfile(redirectTo = '/login') {
  return useAuthRedirect({
    requiresAuth: true,
    requiresProfile: true,
    redirectTo,
  });
}

/**
 * Convenience hook for public pages that should redirect authenticated users
 */
export function useRedirectIfAuthenticated(redirectTo = '/') {
  return useAuthRedirect({
    redirectIfAuthenticated: true,
    redirectTo,
  });
}