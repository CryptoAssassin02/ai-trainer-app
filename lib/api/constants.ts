/**
 * API Constants and Configuration
 * Separated from client to avoid instantiation issues in tests
 */

// ✅ REVISED: Backend-aligned timeouts (matches agent timeouts exactly)
export const API_TIMEOUTS = {
  workoutGeneration: 180000,    // Keep existing for monolithic
  workoutStructure: 60000,      // NEW: 60s for structure generation
  workoutMesocycle: 120000,     // NEW: 120s for mesocycle generation
  workoutStatus: 5000,          // NEW: 5s for status checks
  workoutAdjustment: 60000,     // ✅ 60s (matches PlanAdjustmentAgent timeout)
  nutritionPlanning: 40000,     // 40 seconds for nutrition analysis
  analyticsInsights: 35000,     // 35 seconds for analytics/AI insights
  perplexityResearch: 30000,    // 30 seconds for Perplexity AI research
  standardOperations: 10000,    // ✅ 10s for CRUD operations (revised from 15s)
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
    BASE: '/workouts',                    // ✅ GET /workouts
    GENERATE: '/workouts',                // ✅ POST /workouts  
    GET: (planId: string) => `/workouts/${planId}`,     // ✅ GET /workouts/:planId
    ADJUST: (planId: string) => `/workouts/${planId}`,  // ✅ POST /workouts/:planId
    DELETE: (planId: string) => `/workouts/${planId}`,  // ✅ DELETE /workouts/:planId
    LOG: '/workouts/log',
    LOGS: '/workouts/log',
    
    // NEW: Chunked generation endpoints
    STRUCTURE: '/workouts/structure',
    MESOCYCLE: (planId: string, num: number) => `/workouts/${planId}/mesocycles/${num}`,
    STATUS: (planId: string) => `/workouts/${planId}/status`,
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

// ✅ NEW: Environment-aware rate limiting (matches backend exactly)
export const RATE_LIMITS = {
  WORKOUT_GENERATION: {
    PRODUCTION: { requests: 10, windowMs: 60 * 60 * 1000 }, // 10/hour
    TEST: { requests: 100, windowMs: 60 * 1000 }, // 100/minute
    DEVELOPMENT: { requests: 50, windowMs: 60 * 1000 }, // 50/minute
  }
} as const;

// ✅ NEW: Rate limit error messages (matches backend responses)
export const RATE_LIMIT_MESSAGES = {
  WORKOUT_GENERATION: 'Too many workout plan generation requests. Please try again after an hour.',
  GENERAL: 'Too many requests. Please try again later.',
} as const;