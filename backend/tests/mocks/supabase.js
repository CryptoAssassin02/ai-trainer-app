/**
 * Creates a deep mock of the Supabase client structure.
 * All methods are jest.fn() allowing for per-test configuration.
 */
const createMockSupabaseClient = () => ({
  // Mock top-level methods
  from: jest.fn().mockReturnThis(), // Allows chaining like .from('...').select()
  select: jest.fn().mockResolvedValue({ data: [], error: null }),
  insert: jest.fn().mockResolvedValue({ data: [{ id: 'mock-insert-id' }], error: null }),
  update: jest.fn().mockResolvedValue({ data: [{ id: 'mock-update-id' }], error: null }),
  delete: jest.fn().mockResolvedValue({ data: [{ id: 'mock-delete-id' }], error: null }),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  // Mock the 'auth' namespace
  auth: {
    signUp: jest.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id', email: 'test@example.com' }, session: null }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id', email: 'test@example.com' }, session: { access_token: 'mock-access-token', refresh_token: 'mock-refresh-token' } }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id', email: 'test@example.com' } }, error: null }),
    setSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'mock-refreshed-token' } }, error: null }),
    // Add other auth methods if needed, e.g., resetPasswordForEmail, updateUser, etc.
  },
  // Mock the 'storage' namespace (if used)
  storage: {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn().mockResolvedValue({ data: { path: 'mock/path/to/file.png' }, error: null }),
    download: jest.fn().mockResolvedValue({ data: new Blob(['mock file content']), error: null }),
    // Add other storage methods if needed
  },
  // Add mocks for any other Supabase namespaces or methods used in the application
});

module.exports = {
  createMockSupabaseClient,
}; 