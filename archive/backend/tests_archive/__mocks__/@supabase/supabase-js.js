/**
 * Mock implementation for Supabase client
 */

// Create a mock Supabase client
const createClient = jest.fn().mockImplementation(() => {
  return {
    from: jest.fn(),
    auth: {
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      session: jest.fn(),
      user: jest.fn()
    }
  };
});

module.exports = {
  createClient
}; 