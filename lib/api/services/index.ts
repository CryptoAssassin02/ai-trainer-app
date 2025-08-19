/**
 * API Services Index
 * Centralized exports for all API services
 */

// Export all services
export { WorkoutService, workoutService } from './workout-service';
export { AnalyticsService, analyticsService } from './analytics-service';
export { ProfileService, profileService } from './profile-service';
export { AuthService, authService } from './auth-service';

// Export types
export type { 
  UserProfile,
  WorkoutPlan,
  Exercise,
  AnalyticsOverview,
  NotificationPreferences,
  CheckIn,
  ExportOptions,
  ImportResult,
  WorkoutGenerationRequest,
  WorkoutAdjustmentRequest,
  ApiResponse,
  ApiErrorResponse,
  ApiSuccessResponse,
  PaginatedResponse,
  RequestOptions,
} from '../types';

// Re-export API client and utilities
export { apiClient, API_ENDPOINTS, API_TIMEOUTS, APIError } from '../client';

// Re-export React Query utilities
export { ReactQueryProvider, queryKeys, queryUtils } from '../react-query';
export type { QueryClient } from '../react-query';

// Re-export error components
export { 
  ErrorBoundary, 
  ErrorFallback, 
  withErrorBoundary, 
  useErrorHandler,
  ErrorThrower 
} from '../../../components/error/error-boundary';

export { 
  APIErrorDisplay, 
  APIErrorCard, 
  InlineAPIError, 
  APIErrorToast,
  useAPIErrorHandler 
} from '../../../components/error/api-error-display';

// Service instances for direct use
export const services = {
  auth: authService,
  profile: profileService,
  workout: workoutService,
  analytics: analyticsService,
} as const;