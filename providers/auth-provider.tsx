'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define types for auth context
export type User = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  // Add other user properties as needed
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, userData?: Partial<User>) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  // Add other methods as needed
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Mock implementation of auth methods for testing
  const signIn = async (email: string, password: string) => {
    // Mock authentication logic
    setIsLoading(true);
    try {
      // In a real implementation, this would call an API
      setUser({
        id: 'test-user-id',
        email,
        name: 'Test User',
      });
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    // Mock sign out logic
    setIsLoading(true);
    try {
      // In a real implementation, this would call an API
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData?: Partial<User>) => {
    // Mock sign up logic
    setIsLoading(true);
    try {
      // In a real implementation, this would call an API
      setUser({
        id: 'new-test-user-id',
        email,
        name: userData?.name || 'New User',
        ...userData,
      });
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    // Mock profile update logic
    setIsLoading(true);
    try {
      // In a real implementation, this would call an API
      if (user) {
        setUser({
          ...user,
          ...userData,
        });
      }
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to simulate checking auth status on mount
  useEffect(() => {
    // Mock check auth status
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        // In a real implementation, this would check for an existing session
        const hasSession = false; // For testing purposes
        if (hasSession) {
          setUser({
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
          });
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Value object with state and methods
  const value = {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signOut,
    signUp,
    updateProfile,
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