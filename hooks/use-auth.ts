// Re-export the authentication hook from the provider
export { useAuth, type User, type AuthContextType } from '@/components/auth/supabase-auth-provider';

// Re-export UserProfile type from API types
export type { UserProfile } from '@/lib/api/types';

// Re-export the protected route components for convenience
export { 
  ProtectedRoute, 
  AuthRequired, 
  ProfileRequired, 
  PublicRoute 
} from '@/components/auth/protected-route';

// Authentication status hooks
export { useAuthStatus } from './use-auth-status';
export { useAuthRedirect } from './use-auth-redirect';