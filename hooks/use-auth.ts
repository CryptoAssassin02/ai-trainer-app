// Re-export the authentication hook from the provider
export { useAuth, type User, type UserProfile, type AuthContextType } from '@/providers/auth-provider';

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