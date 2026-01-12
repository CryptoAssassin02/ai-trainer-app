'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/components/auth/supabase-auth-provider';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  requiresAuth?: boolean;
  requiresProfile?: boolean;
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  requiresAuth = true,
  requiresProfile = false,
  fallback = <div>Loading...</div>,
}: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();

  // Remove redirect logic - this will be handled by Middleware

  // Show loading state while authentication is being checked
  if (loading) {
    return <>{fallback}</>;
  }

  // Show children if authentication requirements are met
  if (requiresAuth && !isAuthenticated) {
    return <>{fallback}</>;
  }

  // Profile requirement check would need to be implemented with profile context
  // For now, we'll skip this check as profile is handled separately

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
export function PublicRoute({ children, redirectTo = '/', ...props }: Omit<ProtectedRouteProps, 'requiresAuth'>) {
  return (
    <ProtectedRoute requiresAuth={false} redirectTo={redirectTo} {...props}>
      {children}
    </ProtectedRoute>
  );
}