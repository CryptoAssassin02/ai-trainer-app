/**
 * Enhanced API Error Classes for Workout Operations
 * Comprehensive error handling aligned with backend error classification
 */

// Base API Error (extends existing APIError from constants.ts)
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

// ✅ NEW: Rate limiting error with retry-after support
export class RateLimitError extends APIError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

// ✅ NEW: Authentication error for token issues
export class AuthenticationError extends APIError {
  constructor(message: string) {
    super(message, 401, 'AUTHENTICATION_REQUIRED', false);
    this.name = 'AuthenticationError';
    
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

// ✅ NEW: Not found error (handles RLS authorization failures)
export class NotFoundError extends APIError {
  constructor(message: string) {
    super(message, 404, 'RESOURCE_NOT_FOUND', false);
    this.name = 'NotFoundError';
    
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

// ✅ NEW: Workout generation specific errors
export class WorkoutGenerationError extends APIError {
  public readonly agentType?: 'research' | 'generation' | 'adjustment';
  public readonly aiErrorDetails?: {
    researchErrors?: string[];
    generationFailure?: string;
    conflictingConstraints?: string[];
    safetyViolations?: string[];
  };

  constructor(
    message: string, 
    status: number = 500,
    agentType?: 'research' | 'generation' | 'adjustment',
    aiErrorDetails?: {
      researchErrors?: string[];
      generationFailure?: string;
      conflictingConstraints?: string[];
      safetyViolations?: string[];
    }
  ) {
    super(message, status, 'WORKOUT_GENERATION_FAILED', true);
    this.name = 'WorkoutGenerationError';
    this.agentType = agentType;
    this.aiErrorDetails = aiErrorDetails;
    
    Object.setPrototypeOf(this, WorkoutGenerationError.prototype);
  }
}

// ✅ NEW: Profile validation error for workout generation prerequisites
export class ProfileValidationError extends APIError {
  public readonly missingFields?: string[];
  public readonly invalidFields?: { field: string; reason: string }[];

  constructor(
    message: string,
    missingFields?: string[],
    invalidFields?: { field: string; reason: string }[]
  ) {
    super(message, 400, 'PROFILE_VALIDATION_FAILED', false);
    this.name = 'ProfileValidationError';
    this.missingFields = missingFields;
    this.invalidFields = invalidFields;
    
    Object.setPrototypeOf(this, ProfileValidationError.prototype);
  }
}

// ✅ NEW: Network timeout error for long AI operations
export class TimeoutError extends APIError {
  public readonly operation?: string;
  public readonly timeoutDuration?: number;

  constructor(message: string, operation?: string, timeoutDuration?: number) {
    super(message, 408, 'REQUEST_TIMEOUT', true);
    this.name = 'TimeoutError';
    this.operation = operation;
    this.timeoutDuration = timeoutDuration;
    
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

// ✅ NEW: Validation error for request data
export class ValidationError extends APIError {
  public readonly validationErrors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;

  constructor(
    message: string,
    validationErrors?: Array<{
      field: string;
      message: string;
      value?: any;
    }>
  ) {
    super(message, 400, 'VALIDATION_FAILED', false);
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
    
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

// ✅ NEW: Server error for backend issues
export class ServerError extends APIError {
  public readonly isOperational?: boolean;

  constructor(message: string, status: number = 500, isOperational: boolean = false) {
    super(message, status, 'SERVER_ERROR', isOperational);
    this.name = 'ServerError';
    this.isOperational = isOperational;
    
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

// ✅ NEW: Error factory for creating appropriate error types from API responses
export class ErrorFactory {
  static createFromResponse(error: any): APIError {
    const status = error.response?.status || error.status || 0;
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    const code = error.response?.data?.code || error.code;
    const isOperational = error.response?.data?.isOperational || false;

    // Rate limiting
    if (status === 429) {
      const retryAfter = error.response?.headers['retry-after'];
      return new RateLimitError(message, retryAfter);
    }

    // Authentication
    if (status === 401) {
      return new AuthenticationError(message);
    }

    // Not found / RLS authorization
    if (status === 404) {
      return new NotFoundError(message);
    }

    // Validation errors
    if (status === 400) {
      const validationErrors = error.response?.data?.errors;
      if (validationErrors) {
        return new ValidationError(message, validationErrors);
      }
      
      // Profile validation specific
      const missingFields = error.response?.data?.missingFields;
      const invalidFields = error.response?.data?.invalidFields;
      if (missingFields || invalidFields) {
        return new ProfileValidationError(message, missingFields, invalidFields);
      }
      
      return new ValidationError(message);
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED' || status === 408) {
      return new TimeoutError(message);
    }

    // Workout generation specific errors
    if (code === 'WORKOUT_GENERATION_FAILED' || message.includes('workout generation')) {
      const aiErrorDetails = error.response?.data?.details;
      return new WorkoutGenerationError(message, status, undefined, aiErrorDetails);
    }

    // Server errors
    if (status >= 500) {
      return new ServerError(message, status, isOperational);
    }

    // Generic API error
    return new APIError(message, status, code, isOperational);
  }
}

// ✅ NEW: Error type guards for better error handling
export const isRateLimitError = (error: any): error is RateLimitError => {
  return error instanceof RateLimitError;
};

export const isAuthenticationError = (error: any): error is AuthenticationError => {
  return error instanceof AuthenticationError;
};

export const isWorkoutGenerationError = (error: any): error is WorkoutGenerationError => {
  return error instanceof WorkoutGenerationError;
};

export const isProfileValidationError = (error: any): error is ProfileValidationError => {
  return error instanceof ProfileValidationError;
};

export const isTimeoutError = (error: any): error is TimeoutError => {
  return error instanceof TimeoutError;
};

export const isRetryableError = (error: any): boolean => {
  return error instanceof APIError && error.retryable;
};
