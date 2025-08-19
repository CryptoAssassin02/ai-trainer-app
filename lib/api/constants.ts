/**
 * API Constants and Configuration
 * Separated from client to avoid instantiation issues in tests
 */

// API timeout configurations for different operation types
export const API_TIMEOUTS = {
  workoutGeneration: 45000,     // 45 seconds for AI workout generation
  workoutAdjustment: 30000,     // 30 seconds for AI plan adjustments
  nutritionPlanning: 40000,     // 40 seconds for nutrition analysis
  analyticsInsights: 35000,     // 35 seconds for analytics/AI insights
  perplexityResearch: 30000,    // 30 seconds for Perplexity AI research
  standardOperations: 15000,    // 15 seconds for standard CRUD operations
  fileOperations: 60000,        // 60 seconds for file upload/download
  localhost: 8000,              // 8 seconds for localhost development
} as const;

// API Error class for structured error handling
export class APIError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    status: number = 0,
    code?: string,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

// API endpoint constants based on backend routes
// Note: Base URL already includes /v1, so endpoints should not include /v1 prefix
export const API_ENDPOINTS = {
  // Health check (special case - not versioned, absolute path to root)
  HEALTH: '/health',
  
  // Authentication endpoints
  AUTH: {
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  // Profile endpoints
  PROFILE: {
    BASE: '/profile',
    PREFERENCES: '/profile/preferences',
  },
  
  // Workout endpoints
  WORKOUTS: {
    BASE: '/workouts',
    GENERATE: '/workouts',
    ADJUST: (planId: string) => `/workouts/${planId}`,
    DELETE: (planId: string) => `/workouts/${planId}`,
    LOG: '/workouts/log',
    LOGS: '/workouts/log',
  },
  
  // Analytics endpoints
  ANALYTICS: {
    OVERVIEW: '/analytics/overview',
    TRENDS: '/analytics/trends',
    INSIGHTS: '/analytics/ai/insights',
    PATTERNS: '/analytics/ai/patterns',
    REFRESH: '/analytics/refresh',
  },
  
  // Check-in endpoints
  CHECKINS: {
    CREATE: '/check-in',
    LIST: '/check-in',
    GET: (id: string) => `/check-in/${id}`,
    UPDATE: (id: string) => `/check-in/${id}`,
  },
  
  // Data transfer endpoints
  DATA_TRANSFER: {
    EXPORT: '/data-transfer/export',
    IMPORT: '/data-transfer/import',
  },
  
  // Notification endpoints
  NOTIFICATIONS: {
    PREFERENCES: '/notifications/preferences',
    SEND: '/notifications/send',
  },
  
  // Macros endpoints
  MACROS: {
    CALCULATE: '/macros/calculate',
  },
} as const;