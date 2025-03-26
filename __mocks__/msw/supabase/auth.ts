import { v4 as uuidv4 } from 'uuid';

// Mock user data store
const mockUsers = {
  'test@example.com': {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  'admin@example.com': {
    id: 'user-456',
    email: 'admin@example.com',
    name: 'Admin User',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
};

// Store for access tokens and refresh tokens
const tokens = new Map<string, string>();

/**
 * Generate mock authentication responses for Supabase
 */
export const mockAuthResponses = {
  /**
   * Mock response for sign up
   */
  signUp: (email: string) => {
    const userId = uuidv4();
    const accessToken = `mock-access-token-${userId}`;
    const refreshToken = `mock-refresh-token-${userId}`;
    
    tokens.set(refreshToken, accessToken);
    
    return {
      user: {
        id: userId,
        email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
      },
    };
  },
  
  /**
   * Mock response for sign in
   */
  signIn: (email: string) => {
    const user = mockUsers[email] || {
      id: uuidv4(),
      email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const accessToken = `mock-access-token-${user.id}`;
    const refreshToken = `mock-refresh-token-${user.id}`;
    
    tokens.set(refreshToken, accessToken);
    
    return {
      user,
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
      },
    };
  },
  
  /**
   * Mock response for refresh token
   */
  refreshToken: (refreshToken: string) => {
    const accessToken = tokens.get(refreshToken) || `mock-access-token-${uuidv4()}`;
    const newRefreshToken = `mock-refresh-token-${uuidv4()}`;
    
    tokens.set(newRefreshToken, accessToken);
    tokens.delete(refreshToken);
    
    return {
      session: {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
      },
    };
  },
  
  /**
   * Mock response for get user
   */
  getUser: (token: string) => {
    // Extract user ID from token (in a real app, this would be decoded from JWT)
    const userId = token.includes('user-123') ? 'user-123' : 
                 token.includes('user-456') ? 'user-456' : 
                 token.replace('mock-access-token-', '');
    
    // Find user by ID
    const user = Object.values(mockUsers).find(u => u.id === userId) || {
      id: userId,
      email: `user-${userId.substring(0, 6)}@example.com`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    return { user };
  },
}; 