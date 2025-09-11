/**
 * @fileoverview Mock for Supabase client in backend/config/supabase.js
 * This file provides a mock implementation for the Supabase client used in tests.
 */

// Mock functions for chaining
const mockFrom = jest.fn().mockReturnThis();
const mockSelect = jest.fn().mockReturnThis();
const mockInsert = jest.fn().mockReturnThis();
const mockUpdate = jest.fn().mockReturnThis();
const mockDelete = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockLt = jest.fn().mockReturnThis();
const mockGt = jest.fn().mockReturnThis();
const mockSingle = jest.fn().mockReturnThis();
const mockMaybeSingle = jest.fn().mockReturnThis();
const mockIn = jest.fn().mockReturnThis();
const mockGet = jest.fn().mockReturnThis();
const mockIs = jest.fn().mockReturnThis();
const mockNot = jest.fn().mockReturnThis();
const mockMatch = jest.fn().mockReturnThis();
const mockIlike = jest.fn().mockReturnThis();
const mockContains = jest.fn().mockReturnThis();
const mockOr = jest.fn().mockReturnThis();
const mockAnd = jest.fn().mockReturnThis();
const mockRange = jest.fn().mockReturnThis();
const mockLike = jest.fn().mockReturnThis();
const mockOrder = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnThis();
const mockOffset = jest.fn().mockReturnThis();

// Auth mock functions
const mockSignUp = jest.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id' } }, error: null });
const mockSignIn = jest.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id' } }, error: null });
const mockSignOut = jest.fn().mockResolvedValue({ error: null });
const mockSession = jest.fn().mockReturnValue({ user: { id: 'mock-user-id' } });
const mockUser = jest.fn().mockReturnValue({ id: 'mock-user-id' });
const mockGetUser = jest.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id' } }, error: null });
const mockRefreshSession = jest.fn().mockResolvedValue({ data: { session: { access_token: 'mock-access-token' } }, error: null });

// Mock Supabase client
const mockSupabaseClient = {
  from: mockFrom,
  auth: {
    signUp: mockSignUp,
    signIn: mockSignIn,
    signOut: mockSignOut,
    session: mockSession,
    user: mockUser,
    getUser: mockGetUser,
    refreshSession: mockRefreshSession
  },
  // Add any other required functions or properties
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
      download: jest.fn().mockResolvedValue({ data: 'mock-data', error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'mock-url' } })
    })
  },
  rpc: jest.fn().mockResolvedValue({ data: null, error: null })
};

// Function to create a Supabase client
const createSupabaseClient = jest.fn().mockReturnValue(mockSupabaseClient);

// Function to get a Supabase admin client
const getSupabaseAdmin = jest.fn().mockReturnValue(mockSupabaseClient);

// Export mock functions and client
module.exports = {
  createSupabaseClient,
  getSupabaseAdmin,
  mockFrom,
  mockSelect,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockEq,
  mockLt,
  mockGt,
  mockSingle,
  mockMaybeSingle,
  mockIn,
  mockGet,
  mockIs,
  mockNot,
  mockMatch,
  mockIlike,
  mockContains,
  mockOr,
  mockAnd,
  mockRange,
  mockLike,
  mockOrder,
  mockLimit,
  mockOffset,
  // Auth mocks
  mockSignUp,
  mockSignIn,
  mockSignOut,
  mockSession,
  mockUser,
  mockGetUser,
  mockRefreshSession
}; 