/**
 * Environment Configuration for trAIner App
 * Handles environment detection and API integration setup
 */

import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  // Core application
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'test', 'production']),
  NEXT_PUBLIC_APP_VERSION: z.string().optional(),
  
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(100),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(100),
  SUPABASE_PROJECT_REF: z.string().min(10),
  
  // Application URLs
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  
  // Feature Flags
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('false'),
  NEXT_PUBLIC_ENABLE_AI_CACHING: z.string().transform(val => val === 'true').default('true'),
  NEXT_PUBLIC_DEBUG_MODE: z.string().transform(val => val === 'true').default('false'),
  
  // Optional monitoring
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_VERCEL_ANALYTICS_ID: z.string().optional(),
  
  // Vercel Configuration (auto-injected)
  NEXT_PUBLIC_VERCEL_ENV: z.string().optional(),
  NEXT_PUBLIC_VERCEL_URL: z.string().optional(),
});

// Validate environment variables
function validateEnvironment() {
  try {
    const env = envSchema.parse(process.env);
    if (typeof window === 'undefined') {
      console.log('✅ Environment validation passed for:', env.NEXT_PUBLIC_APP_ENV);
    }
    return env;
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    if (typeof window === 'undefined') {
      process.exit(1);
    }
    throw error;
  }
}

// Environment configuration
export const env = validateEnvironment();

// Environment-specific configuration
export const environmentConfig = {
  // Environment detection
  isDevelopment: env.NEXT_PUBLIC_APP_ENV === 'development',
  isTest: env.NEXT_PUBLIC_APP_ENV === 'test',
  isProduction: env.NEXT_PUBLIC_APP_ENV === 'production',
  
  // API Configuration
  api: {
    baseUrl: env.NEXT_PUBLIC_API_URL || `${env.NEXT_PUBLIC_SITE_URL}/api`,
    timeout: env.NEXT_PUBLIC_APP_ENV === 'development' ? 60000 : 30000,
  },
  
  // Supabase Configuration
  supabase: {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: env.SUPABASE_SERVICE_ROLE_KEY,
    projectRef: env.SUPABASE_PROJECT_REF,
  },
  
  // Application URLs
  urls: {
    site: env.NEXT_PUBLIC_SITE_URL,
    api: env.NEXT_PUBLIC_API_URL || `${env.NEXT_PUBLIC_SITE_URL}/api`,
  },
  
  // Feature flags
  features: {
    analytics: env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    aiCaching: env.NEXT_PUBLIC_ENABLE_AI_CACHING,
    debugMode: env.NEXT_PUBLIC_DEBUG_MODE,
  },
  
  // Monitoring configuration
  monitoring: {
    sentry: {
      dsn: env.SENTRY_DSN,
      enabled: !!env.SENTRY_DSN,
    },
    vercel: {
      analyticsId: env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID,
      enabled: !!env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID,
    },
  },
  
  // Environment-specific settings
  settings: {
    development: {
      logging: 'verbose',
      caching: false,
      rateLimiting: false,
    },
    test: {
      logging: 'minimal',
      caching: false,
      rateLimiting: false,
    },
    production: {
      logging: 'errors',
      caching: true,
      rateLimiting: true,
    },
  }[env.NEXT_PUBLIC_APP_ENV],
};

// Dynamic URL configuration for Vercel
export const getAppUrl = () => {
  // In production, use the configured site URL
  if (env.NEXT_PUBLIC_APP_ENV === 'production') {
    return env.NEXT_PUBLIC_SITE_URL;
  }
  
  // In preview deployments, use Vercel URL
  if (env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  
  // Fallback to configured site URL
  return env.NEXT_PUBLIC_SITE_URL;
};

// API client configuration
export const apiConfig = {
  baseURL: environmentConfig.api.baseUrl,
  timeout: environmentConfig.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
  // Environment-specific configurations
  ...(environmentConfig.isDevelopment && {
    // Development-specific API config
    validateStatus: (status: number) => status < 500, // Accept 4xx errors in dev
  }),
  ...(environmentConfig.isProduction && {
    // Production-specific API config
    validateStatus: (status: number) => status >= 200 && status < 300,
  }),
};

// Export environment info for debugging
export const environmentInfo = {
  nodeEnv: env.NODE_ENV,
  appEnv: env.NEXT_PUBLIC_APP_ENV,
  appVersion: env.NEXT_PUBLIC_APP_VERSION,
  vercelEnv: env.NEXT_PUBLIC_VERCEL_ENV,
  isVercelDeployment: !!env.NEXT_PUBLIC_VERCEL_URL,
  urls: {
    site: getAppUrl(),
    api: environmentConfig.api.baseUrl,
  },
  features: environmentConfig.features,
};

// Console log environment info (server-side only)
if (typeof window === 'undefined' && environmentConfig.features.debugMode) {
  console.log('🌍 Environment Info:', environmentInfo);
}