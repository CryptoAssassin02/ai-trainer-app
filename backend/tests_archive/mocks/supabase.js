/**
 * @fileoverview Mocks for Supabase client
 * Provides consistent mocking of the Supabase client for tests
 */

// Mock functions
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockDelete = jest.fn();
const mockLt = jest.fn();
const mockMaybeSingle = jest.fn();
const mockOnAuthStateChange = jest.fn().mockImplementation((callback) => {
  // Immediately invoke callback with a mock session
  callback('SIGNED_IN', { user: { id: 'user123' } });
  // Return an unsubscribe function
  return () => {};
});

/**
 * Create a mock Supabase client for testing
 * @returns {Object} Mock Supabase client
 */
const createSupabaseClient = () => {
  // When auth.signUp is called directly via supabase.auth.signUp
  mockSignUp.mockImplementation((data) => {
    return Promise.resolve(mockSignUpResponse || {
      data: { user: { id: 'user123', email: data.email } },
      error: null
    });
  });

  // When auth.signInWithPassword is called directly via supabase.auth.signInWithPassword
  mockSignInWithPassword.mockImplementation((data) => {
    return Promise.resolve(mockSignInResponse || {
      data: {
        user: { id: 'user123', email: data.email },
        session: { access_token: 'access_token123', refresh_token: 'refresh_token123' }
      },
      error: null
    });
  });

  // When auth.signOut is called directly via supabase.auth.signOut
  mockSignOut.mockImplementation(() => {
    return Promise.resolve({ error: null });
  });

  const mockSupabase = {
    from: mockFrom,
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange
    }
  };

  return mockSupabase;
};

// Response objects to modify for testing
let mockSignUpResponse = null;
let mockSignInResponse = null;

/**
 * Reset all mocks to their initial state
 * This is important to call before each test to avoid test pollution
 */
const resetMocks = () => {
  mockFrom.mockReset();
  mockSelect.mockReset();
  mockEq.mockReset();
  mockSingle.mockReset();
  mockInsert.mockReset();
  mockUpdate.mockReset();
  mockSignUp.mockReset();
  mockSignInWithPassword.mockReset();
  mockSignOut.mockReset();
  mockDelete.mockReset();
  mockLt.mockReset();
  mockMaybeSingle.mockReset();
  
  // Reset response objects
  mockSignUpResponse = null;
  mockSignInResponse = null;

  // Define the mock chain object that methods will return
  const mockChain = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    lt: mockLt,
    single: mockSingle,
    maybeSingle: mockMaybeSingle
    // Add other methods like gt, etc. if needed
  };

  // Set up default chains to return the mockChain object
  // This allows methods like .select().eq().single() to work
  mockFrom.mockReturnValue(mockChain);
  mockSelect.mockReturnValue(mockChain);
  mockEq.mockReturnValue(mockChain);
  mockInsert.mockReturnValue(mockChain);
  mockUpdate.mockReturnValue(mockChain);
  mockDelete.mockReturnValue(mockChain);
  mockLt.mockReturnValue(mockChain);

  // The final methods (.single(), .maybeSingle(), etc.)
  // will be mocked directly in the tests to resolve with data/error
  // e.g., mockSingle.mockResolvedValue(...), mockMaybeSingle.mockResolvedValue(...)

  // When auth.signUp is called directly via supabase.auth.signUp
  mockSignUp.mockImplementation((data) => {
    return Promise.resolve(mockSignUpResponse || {
      data: { user: { id: 'user123', email: data.email } },
      error: null
    });
  });

  // When auth.signInWithPassword is called directly via supabase.auth.signInWithPassword
  mockSignInWithPassword.mockImplementation((data) => {
    return Promise.resolve(mockSignInResponse || {
      data: {
        user: { id: 'user123', email: data.email },
        session: { access_token: 'access_token123', refresh_token: 'refresh_token123' }
      },
      error: null
    });
  });
};

/**
 * Set up mock chains for database operations
 * @returns {Object} Mock functions for testing
 */
const setupMockChains = () => {
  resetMocks();
  
  return {
    mockFrom,
    mockSelect,
    mockEq,
    mockSingle,
    mockInsert,
    mockUpdate,
    mockSignUp,
    mockSignInWithPassword,
    mockSignOut,
    mockDelete,
    mockLt,
    mockMaybeSingle,
    setMockSignUpResponse: (response) => { mockSignUpResponse = response; },
    setMockSignInResponse: (response) => { mockSignInResponse = response; }
  };
};

// Create a mock Supabase client that can be exported directly
const mockSupabaseClient = {
  from: mockFrom,
  auth: {
    signUp: mockSignUp,
    signInWithPassword: mockSignInWithPassword,
    signOut: mockSignOut,
    onAuthStateChange: mockOnAuthStateChange
  },
  resetMocks // Add the reset function directly to the client
};

// Define and export the structure needed by the config mock factory
const mockSupabaseClientImplementation = {
  auth: {
    signUp: mockSignUp,
    signInWithPassword: mockSignInWithPassword,
    signOut: mockSignOut
  },
  from: mockFrom
};

module.exports = {
  createSupabaseClient,
  setupMockChains,
  resetMocks,
  mockFrom,
  mockSelect,
  mockEq,
  mockSingle,
  mockInsert,
  mockUpdate,
  mockSignUp,
  mockSignInWithPassword,
  mockSignOut,
  mockDelete,
  mockOnAuthStateChange,
  mockLt,
  mockMaybeSingle,
  mockSupabaseClientImplementation, // Export the implementation structure
  // Export the ready-to-use mock client
  ...mockSupabaseClient
}; 