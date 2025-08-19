'use client';

import { useEffect } from 'react';
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
  const {
    isAuthenticated,
    isLoading,
    hasProfile,
    isEmailVerified,
    needsEmailVerification,
    needsProfileCompletion,
  } = useAuthStatus();

  useEffect(() => {
    // Don't redirect if disabled
    if (!enabled) return;

    // Force a small delay to ensure all state updates are complete
    // This follows Next.js best practice: "Always do navigations after the first render"
    const timer = setTimeout(() => {
      // Skip if still loading (but don't block indefinitely)
      if (isLoading) return;

      // Redirect authenticated users away from public pages (like login/signup)
      if (redirectIfAuthenticated && isAuthenticated) {
        console.log('🔄 [AUTH REDIRECT] Redirecting authenticated user:', { needsProfileCompletion });
        if (needsProfileCompletion) {
          router.push('/profile/create');  // Use multi-step form for new users
        } else {
          router.push('/dashboard');
        }
        return;
      }

      // Redirect unauthenticated users from protected pages
      if (requiresAuth && !isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      // Redirect to email verification if required
      if (requiresEmailVerification && isAuthenticated && needsEmailVerification) {
        router.push('/auth/verify-email');
        return;
      }

      // Redirect to profile completion if required
      if (requiresProfile && isAuthenticated && !hasProfile) {
        router.push('/profile/create');  // Use multi-step form for new users
        return;
      }
    }, 100); // 100ms delay ensures state is stable

    return () => clearTimeout(timer);
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
    router,
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
export function useRedirectIfAuthenticated(redirectTo = '/dashboard') {
  return useAuthRedirect({
    redirectIfAuthenticated: true,
    redirectTo,
  });
}