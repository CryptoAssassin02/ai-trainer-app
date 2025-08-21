/**
 * Auth Service
 * Specialized service for authentication operations using backend API
 */

import { apiClient, API_ENDPOINTS, API_TIMEOUTS } from '../client';
import type { 
  UserProfile,
  ApiResponse,
  RequestOptions 
} from '../types';

// Auth response types from backend
interface AuthResponse {
  status: string;
  message: string;
  userId: string;
  jwtToken: string;
  refreshToken?: string;
}

interface LoginResponse {
  status: string;
  message: string;
  userId: string;
  jwtToken: string;
  refreshToken?: string;
  profile?: UserProfile;
}

export class AuthService {
  // No longer requires Supabase client - uses backend API directly

  /**
   * Sign up a new user using backend API
   */
  async signUp(credentials: {
    email: string;
    password: string;
    name: string;
  }): Promise<{
    user: any;
    session: any;
    requiresEmailVerification: boolean;
  }> {
    try {
      console.log('🚀 [AUTH SERVICE] Starting backend signUp for:', { email: credentials.email, name: credentials.name });
      
      const response = await apiClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.SIGNUP,
        {
          email: credentials.email,
          password: credentials.password,
          name: credentials.name,
        },
        {
          timeout: API_TIMEOUTS.standardOperations,
          skipAuth: true, // Don't attach auth headers for signup
        }
      );

      console.log('📡 [AUTH SERVICE] Backend signUp response:', { 
        status: response.status, 
        hasUserId: !!response.userId,
        hasJwtToken: !!response.jwtToken,
        message: response.message 
      });

      // Store tokens in localStorage
      localStorage.setItem('auth_token', response.jwtToken);
      localStorage.setItem('user_id', response.userId);
      localStorage.setItem('user_email', credentials.email);
      if (response.refreshToken) {
        localStorage.setItem('refresh_token', response.refreshToken);
      }

      // Transform backend response to match expected interface
      const result = {
        user: {
          id: response.userId,
          email: credentials.email,
          user_metadata: { name: credentials.name },
        },
        session: {
          access_token: response.jwtToken,
          refresh_token: response.refreshToken,
          user: {
            id: response.userId,
            email: credentials.email,
          },
        },
        requiresEmailVerification: false, // Backend handles email verification differently
      };
      
      console.log('✅ [AUTH SERVICE] Backend signUp completed successfully:', {
        hasUser: !!result.user,
        hasSession: !!result.session,
        requiresEmailVerification: result.requiresEmailVerification
      });

      return result;
    } catch (error) {
      console.error('❌ [AUTH SERVICE] Backend sign up failed:', error);
      throw error;
    }
  }

  /**
   * Sign in with email and password using backend API
   */
  async signIn(credentials: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }): Promise<{
    user: any;
    session: any;
    profile?: UserProfile;
  }> {
    try {
      console.log('🚀 [AUTH SERVICE] Starting backend signIn for:', { email: credentials.email });
      
      const response = await apiClient.post<LoginResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        {
          email: credentials.email,
          password: credentials.password,
          rememberMe: credentials.rememberMe,
        },
        {
          timeout: API_TIMEOUTS.standardOperations,
          skipAuth: true, // Don't attach auth headers for login
        }
      );

      console.log('📡 [AUTH SERVICE] Backend signIn response:', { 
        status: response.status, 
        hasUserId: !!response.userId,
        hasJwtToken: !!response.jwtToken,
        hasProfile: !!response.profile,
        message: response.message 
      });

      // Store tokens based on rememberMe preference
      if (credentials.rememberMe) {
        console.log('🔒 [AUTH SERVICE] Storing tokens persistently (Remember Me enabled)');
        // Persistent storage - survives browser restart
        localStorage.setItem('auth_token', response.jwtToken);
        localStorage.setItem('user_id', response.userId);
        localStorage.setItem('user_email', credentials.email);
        localStorage.setItem('remember_me', 'true');
        if (response.refreshToken) {
          localStorage.setItem('refresh_token', response.refreshToken);
        }
      } else {
        console.log('🔒 [AUTH SERVICE] Storing tokens in session only (Remember Me disabled)');
        // Session-only storage - cleared when browser closes
        sessionStorage.setItem('auth_token', response.jwtToken);
        sessionStorage.setItem('user_id', response.userId);
        sessionStorage.setItem('user_email', credentials.email);
        if (response.refreshToken) {
          sessionStorage.setItem('refresh_token', response.refreshToken);
        }
      }

      // Transform backend response to match expected interface
      const result = {
        user: {
          id: response.userId,
          email: credentials.email,
        },
        session: {
          access_token: response.jwtToken,
          refresh_token: response.refreshToken,
          user: {
            id: response.userId,
            email: credentials.email,
          },
        },
        profile: response.profile,
      };
      
      console.log('✅ [AUTH SERVICE] Backend signIn completed successfully:', {
        hasUser: !!result.user,
        hasSession: !!result.session,
        hasProfile: !!result.profile
      });

      return result;
    } catch (error) {
      console.error('❌ [AUTH SERVICE] Backend sign in failed:', error);
      throw error;
    }
  }

  /**
   * Sign out using backend API
   */
  async signOut(): Promise<void> {
    try {
      console.log('🚀 [AUTH SERVICE] Starting backend signOut');
      
      await apiClient.post(
        API_ENDPOINTS.AUTH.LOGOUT,
        {},
        {
          timeout: API_TIMEOUTS.standardOperations,
          // Auth header will be automatically attached by interceptor
        }
      );
      
      // Clear stored tokens from both storage types
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_email');
      localStorage.removeItem('remember_me');
      
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('user_id');
      sessionStorage.removeItem('user_email');
      
      console.log('✅ [AUTH SERVICE] Backend signOut completed successfully');
    } catch (error) {
      console.error('❌ [AUTH SERVICE] Backend sign out failed:', error);
      // Clear tokens even if backend call fails
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_email');
      localStorage.removeItem('remember_me');
      
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('user_id');
      sessionStorage.removeItem('user_email');
      throw error;
    }
  }

  /**
   * Reset password using backend API
   */
  async resetPassword(email: string): Promise<{ message: string }> {
    try {
      console.log('🚀 [AUTH SERVICE] Starting backend password reset for:', { email });
      
      const response = await apiClient.post<{ status: string; message: string }>(
        API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
        { 
          email,
          redirectTo: `${window.location.origin}/auth/reset-password`,
        },
        {
          timeout: API_TIMEOUTS.standardOperations,
          skipAuth: true, // Don't attach auth headers for password reset
        }
      );
      
      console.log('✅ [AUTH SERVICE] Backend password reset completed:', response.message);
      return { message: response.message };
    } catch (error) {
      console.error('❌ [AUTH SERVICE] Backend password reset failed:', error);
      throw error;
    }
  }

  /**
   * Update password using backend API
   */
  async updatePassword(newPassword: string): Promise<{ message: string }> {
    try {
      console.log('🚀 [AUTH SERVICE] Starting backend password update');
      
      const response = await apiClient.post<{ status: string; message: string }>(
        API_ENDPOINTS.AUTH.RESET_PASSWORD,
        { 
          password: newPassword,
        },
        {
          timeout: API_TIMEOUTS.standardOperations,
          // Auth header will be automatically attached by interceptor
        }
      );
      
      console.log('✅ [AUTH SERVICE] Backend password update completed:', response.message);
      return { message: response.message };
    } catch (error) {
      console.error('❌ [AUTH SERVICE] Backend password update failed:', error);
      throw error;
    }
  }

  /**
   * Get current session from storage (checks both localStorage and sessionStorage)
   */
  async getCurrentSession(): Promise<{
    session: any;
    user: any;
  } | null> {
    try {
      // First check sessionStorage (session-only tokens)
      let token = sessionStorage.getItem('auth_token');
      let userId = sessionStorage.getItem('user_id');
      let userEmail = sessionStorage.getItem('user_email');
      
      // If not found in sessionStorage, check localStorage (persistent tokens)
      if (!token || !userId) {
        token = localStorage.getItem('auth_token');
        userId = localStorage.getItem('user_id');
        userEmail = localStorage.getItem('user_email');
      }
      
      if (!token || !userId) {
        return null;
      }

      return {
        session: {
          access_token: token,
          user: {
            id: userId,
            email: userEmail,
          },
        },
        user: {
          id: userId,
          email: userEmail,
        },
      };
    } catch (error) {
      console.error('Failed to get current session:', error);
      return null;
    }
  }

  /**
   * Refresh session using backend API
   */
  async refreshSession(): Promise<{
    session: any;
    user: any;
  }> {
    try {
      console.log('🚀 [AUTH SERVICE] Starting backend session refresh');
      
      // Check both storage types for refresh token
      let refreshToken = sessionStorage.getItem('refresh_token') || localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await apiClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.REFRESH,
        { 
          refreshToken,
        },
        {
          timeout: API_TIMEOUTS.standardOperations,
          skipAuth: true, // Don't attach auth headers for refresh
        }
      );
      
      // Update stored tokens in the same storage type where they were found
      const isRemembered = localStorage.getItem('remember_me') === 'true';
      if (isRemembered) {
        localStorage.setItem('auth_token', response.jwtToken);
        if (response.refreshToken) {
          localStorage.setItem('refresh_token', response.refreshToken);
        }
      } else {
        sessionStorage.setItem('auth_token', response.jwtToken);
        if (response.refreshToken) {
          sessionStorage.setItem('refresh_token', response.refreshToken);
        }
      }
      
      const result = {
        session: {
          access_token: response.jwtToken,
          user: {
            id: response.userId,
          },
        },
        user: {
          id: response.userId,
        },
      };
      
      console.log('✅ [AUTH SERVICE] Backend session refresh completed');
      return result;
    } catch (error) {
      console.error('❌ [AUTH SERVICE] Backend session refresh failed:', error);
      throw error;
    }
  }

  /**
   * Clear expired tokens from storage
   */
  private clearExpiredTokens(): void {
    console.log('🧹 [AUTH SERVICE] Clearing expired tokens from storage');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('remember_me');
    
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('user_id');
    sessionStorage.removeItem('user_email');
  }

  /**
   * Check authentication status (simplified for backend auth)
   */
  async checkAuthStatus(): Promise<{
    isAuthenticated: boolean;
    user: any | null;
    session: any | null;
  }> {
    try {
      const session = await this.getCurrentSession();
      
      // If we have a session, try to validate it's not expired
      if (session) {
        // You could add JWT expiration checking here if needed
        return {
          isAuthenticated: true,
          user: session.user,
          session: session.session,
        };
      }
      
      return {
        isAuthenticated: false,
        user: null,
        session: null,
      };
    } catch (error) {
      console.error('Auth status check failed:', error);
      // Clear potentially corrupted tokens
      this.clearExpiredTokens();
      return {
        isAuthenticated: false,
        user: null,
        session: null,
      };
    }
  }
}

// Factory function to create AuthService (no longer needs Supabase client)
export const createAuthService = () => new AuthService();

// Singleton instance
export const authService = new AuthService();