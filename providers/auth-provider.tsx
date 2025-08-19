'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService } from '@/lib/api/services/auth-service';
import { profileService } from '@/lib/api/services/profile-service';
import type { UserProfile } from '@/lib/api/types';

// Define types for auth context (simplified for backend auth)
export type User = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  created_at?: string;
  updated_at?: string;
};

// Simplified session type for backend auth
export type Session = {
  access_token: string;
  refresh_token?: string;
  user: {
    id: string;
    email: string;
  };
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  profile?: UserProfile | null;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<{ requiresEmailVerification: boolean }>;
  resetPassword: (email: string) => Promise<{ message: string }>;
  updatePassword: (newPassword: string) => Promise<{ message: string }>;
  refreshSession: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const isAuthenticated = !!user && !!session;

  // Helper function to map backend auth user to our User type
  const mapBackendUser = (backendUser: any, email: string, name?: string): User => ({
    id: backendUser.id,
    email: email,
    name: name || backendUser.user_metadata?.name,
    avatarUrl: backendUser.user_metadata?.avatar_url,
    created_at: backendUser.created_at,
    updated_at: backendUser.updated_at,
  });

  // Sign in with email and password
  const signIn = async (email: string, password: string, rememberMe = false) => {
    console.log('🔑 [AUTH PROVIDER] Sign in started for:', email);
    setLoading(true);
    try {
      console.log('📞 [AUTH PROVIDER] Calling authService.signIn...');
      const result = await authService.signIn({ email, password, rememberMe });
      console.log('✅ [AUTH PROVIDER] AuthService.signIn completed successfully');
      
      if (result.user && result.session) {
        console.log('👤 [AUTH PROVIDER] Setting user and session state');
        const mappedUser = mapBackendUser(result.user, email);
        setUser(mappedUser);
        setSession(result.session as Session);
        setProfile(result.profile || null);
        console.log('✅ [AUTH PROVIDER] State updated successfully');
      }
    } catch (error) {
      console.error('❌ [AUTH PROVIDER] Sign in failed:', error);
      throw error;
    } finally {
      console.log('🏁 [AUTH PROVIDER] Setting loading to false');
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign up new user
  const signUp = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const result = await authService.signUp({ name, email, password });
      
      // If session exists, user is automatically logged in
      if (result.user && result.session) {
        const mappedUser = mapBackendUser(result.user, email, name);
        setUser(mappedUser);
        setSession(result.session as Session);
        // Explicitly set profile to null for new users - this triggers needsProfileCompletion
        setProfile(null);
      }
      
      return { requiresEmailVerification: result.requiresEmailVerification };
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      return await authService.resetPassword(email);
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  };

  // Update password
  const updatePassword = async (newPassword: string) => {
    try {
      return await authService.updatePassword(newPassword);
    } catch (error) {
      console.error('Password update failed:', error);
      throw error;
    }
  };

  // Refresh session
  const refreshSession = async () => {
    try {
      const result = await authService.refreshSession();
      
      if (result.user && result.session) {
        const mappedUser = mapBackendUser(result.user, result.user.email || '');
        setUser(mappedUser);
        setSession(result.session as Session);
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
      throw error;
    }
  };

  // Check authentication status - FIXED: useCallback to prevent infinite loops
  const checkAuthStatus = useCallback(async () => {
    console.log('🔍 [AUTH PROVIDER] checkAuthStatus called');
    setLoading(true);
    try {
      console.log('📞 [AUTH PROVIDER] Calling authService.checkAuthStatus...');
      const authStatus = await authService.checkAuthStatus();
      console.log('✅ [AUTH PROVIDER] checkAuthStatus completed:', authStatus);
      
      if (authStatus.isAuthenticated && authStatus.user && authStatus.session) {
        console.log('👤 [AUTH PROVIDER] User is authenticated, setting state');
        const mappedUser = mapBackendUser(authStatus.user, authStatus.user.email || '');
        setUser(mappedUser);
        setSession(authStatus.session as Session);
        
        // Load user profile if authenticated - keep loading until profile is loaded
        try {
          console.log('📞 [AUTH PROVIDER] Loading user profile...');
          const profileService = await import('@/lib/api/services/profile-service');
          const userProfile = await profileService.profileService.getProfile();
          console.log('✅ [AUTH PROVIDER] Profile loaded successfully:', userProfile);
          setProfile(userProfile);
        } catch (profileError) {
          console.log('ℹ️ [AUTH PROVIDER] No profile found (user may need to create one):', profileError);
          setProfile(null);
        }
        // Note: loading will be set to false in the finally block after profile loading completes
      } else {
        console.log('👤 [AUTH PROVIDER] User not authenticated, clearing state');
        setUser(null);
        setSession(null);
        setProfile(null);
      }
    } catch (error) {
      console.error('❌ [AUTH PROVIDER] Auth status check failed:', error);
      setUser(null);
      setSession(null);
      setProfile(null);
    } finally {
      console.log('🏁 [AUTH PROVIDER] checkAuthStatus setting loading to false');
      setLoading(false);
    }
  }, []); // Empty dependency array since it doesn't depend on any props or state

  // Initial auth check on mount
  useEffect(() => {
    // Check initial auth status
    console.log('🔍 [AUTH PROVIDER] Starting initial checkAuthStatus...');
    checkAuthStatus();
  }, []);

  // Value object with state and methods
  const value = {
    user,
    session,
    loading,
    isAuthenticated,
    profile,
    signIn,
    signOut,
    signUp,
    resetPassword,
    updatePassword,
    refreshSession,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook for using the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
} 