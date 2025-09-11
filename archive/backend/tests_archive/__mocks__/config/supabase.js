/**
 * @fileoverview Mocked Supabase configuration for tests
 */

// Mock Supabase clients for testing
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    delete: jest.fn(() => ({
      lt: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  })),
  auth: {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn()
  }
};

// Export Supabase client factory functions
const createSupabaseClient = jest.fn(() => mockSupabaseClient);
const getSupabaseAdmin = jest.fn(() => mockSupabaseClient);

module.exports = {
  createSupabaseClient,
  getSupabaseAdmin,
  developmentConfig: {
    url: 'https://mock-supabase-url.com',
    key: 'mock-anon-key',
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  },
  productionConfig: {
    url: 'https://mock-supabase-url.com',
    key: 'mock-anon-key',
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  }
}; 