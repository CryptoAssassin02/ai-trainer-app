/**
 * Hook to get the current user's auth token for API calls
 * Now uses localStorage tokens from backend auth
 */

import { useCallback } from 'react';

export function useAuthToken() {
  const getAuthToken = useCallback((): string | null => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        console.warn('[AUTH TOKEN] No auth token in localStorage');
        return null;
      }
      
      console.log('[AUTH TOKEN] Retrieved token:', token.substring(0, 50) + '...');
      return token;
    } catch (error) {
      console.error('[AUTH TOKEN] Failed to get auth token:', error);
      return null;
    }
  }, []);
  
  return { getAuthToken };
}
