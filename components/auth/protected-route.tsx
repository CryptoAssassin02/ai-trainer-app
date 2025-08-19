'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  requiresAuth?: boolean;
  requiresProfile?: boolean;
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  redirectTo = '/login',
  requiresAuth = true,
  requiresProfile = false,
  fallback = <div>Loading...</div>,
}: ProtectedRouteProps) {
  const { isAuthenticated, loading, user, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while loading
    if (loading) return;

    // Check if authentication is required and user is not authenticated
    if (requiresAuth && !isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    // Check if profile is required but user doesn't have one
    if (requiresProfile && isAuthenticated && !profile) {
      router.push('/profile/create');  // Use multi-step form for new users
      return;
    }
  }, [isAuthenticated, loading, user, profile, requiresAuth, requiresProfile, router, redirectTo]);

  // Show loading state while authentication is being checked
  if (loading) {
    return <>{fallback}</>;
  }

  // Show children if authentication requirements are met
  if (requiresAuth && !isAuthenticated) {
    return <>{fallback}</>;
  }

  if (requiresProfile && isAuthenticated && !profile) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Convenience component for routes that require authentication
export function AuthRequired({ children, ...props }: Omit<ProtectedRouteProps, 'requiresAuth'>) {
  return (
    <ProtectedRoute requiresAuth={true} {...props}>
      {children}
    </ProtectedRoute>
  );
}

// Convenience component for routes that require both auth and profile
export function ProfileRequired({ children, ...props }: Omit<ProtectedRouteProps, 'requiresAuth' | 'requiresProfile'>) {
  return (
    <ProtectedRoute requiresAuth={true} requiresProfile={true} {...props}>
      {children}
    </ProtectedRoute>
  );
}

// Convenience component for routes that should redirect authenticated users (like login/signup pages)
export function PublicRoute({ children, redirectTo = '/dashboard', ...props }: Omit<ProtectedRouteProps, 'requiresAuth'>) {
  return (
    <ProtectedRoute requiresAuth={false} redirectTo={redirectTo} {...props}>
      {children}
    </ProtectedRoute>
  );
}