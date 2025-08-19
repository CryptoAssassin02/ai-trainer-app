/**
 * Authentication Helper for E2E Tests
 * Provides utilities for handling backend authentication in Playwright tests
 */

import { Page, BrowserContext } from '@playwright/test';

// Backend API configuration for E2E tests
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1';

// Test user credentials
export const TEST_USER = {
  email: 'test@trainer-app.local',
  password: 'TestPassword123!',
  name: 'Test User',
};

/**
 * Create a backend API client for E2E testing
 * Maintains backward compatibility with existing test code
 */
export function createSupabaseTestClient() {
  return {
    signUp: async (credentials: { email: string; password: string; options?: any }) => {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          name: credentials.options?.data?.name || 'Test User',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { data: null, error: { message: errorText } };
      }

      const data = await response.json();
      return { 
        data: { 
          user: { id: data.userId, email: credentials.email },
          session: { access_token: data.jwtToken }
        }, 
        error: null 
      };
    },
    signIn: async (credentials: { email: string; password: string }) => {
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { data: null, error: { message: errorText } };
      }

      const data = await response.json();
      return { 
        data: { 
          user: { id: data.userId, email: credentials.email },
          session: { access_token: data.jwtToken }
        }, 
        error: null 
      };
    }
  };
}

/**
 * Sign up a test user via backend API (faster than UI)
 */
export async function signUpTestUser(email: string = TEST_USER.email, password: string = TEST_USER.password) {
  const client = createSupabaseTestClient();
  
  const { data, error } = await client.signUp({
    email,
    password,
    options: {
      data: {
        name: TEST_USER.name,
      },
    },
  });

  if (error && !error.message.includes('already registered')) {
    throw new Error(`Failed to sign up test user: ${error.message}`);
  }

  return data;
}

/**
 * Sign in a test user via backend API and set authentication state in browser
 */
export async function signInTestUser(
  page: Page,
  email: string = TEST_USER.email,
  password: string = TEST_USER.password
) {
  const client = createSupabaseTestClient();

  // Sign in via backend API
  const { data, error } = await client.signIn({
    email,
    password,
  });

  if (error) {
    throw new Error(`Failed to sign in test user: ${error.message}`);
  }

  if (!data.session) {
    throw new Error('No session returned from sign in');
  }

  // Set authentication state in the browser localStorage
  await page.goto('/'); // Navigate to app first
  
  // Set backend auth tokens in localStorage
  await page.evaluate(
    ({ userId, token, email }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_id', userId);
      localStorage.setItem('user_email', email);
    },
    { 
      userId: data.user.id, 
      token: data.session.access_token,
      email: data.user.email
    }
  );

  // Refresh the page to apply authentication state
  await page.reload();
  
  // Wait for auth state to be recognized
  await page.waitForTimeout(1000);

  return data;
}

/**
 * Clear all authentication state from the browser
 */
export async function clearAuthState(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userProfile');
  });
}

/**
 * Wait for authentication state to be loaded
 */
export async function waitForAuthState(page: Page, isAuthenticated: boolean = true) {
  await page.waitForFunction(
    (expectedAuth) => {
      const token = localStorage.getItem('auth_token');
      const userId = localStorage.getItem('user_id');
      
      if (expectedAuth) {
        return !!(token && userId);
      } else {
        return !token && !userId;
      }
    },
    isAuthenticated,
    { timeout: 10000 }
  );
}

/**
 * Navigate to login page and perform authentication
 */
export async function performLoginUI(
  page: Page,
  email: string = TEST_USER.email,
  password: string = TEST_USER.password
) {
  await page.goto('/login');
  
  await page.fill('[data-testid="email-input"], input[type="email"]', email);
  await page.fill('[data-testid="password-input"], input[type="password"]', password);
  
  const submitButton = page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")');
  await submitButton.click();
  
  // Wait for redirect or success indication
  await page.waitForURL(/\/(?:dashboard|profile|$)/, { timeout: 10000 });
  
  // Wait for auth state to be set
  await waitForAuthState(page, true);
}

/**
 * Navigate to signup page and perform registration
 */
export async function performSignupUI(
  page: Page,
  name: string = TEST_USER.name,
  email: string = TEST_USER.email,
  password: string = TEST_USER.password
) {
  await page.goto('/auth/signup');
  
  await page.fill('[data-testid="name-input"], input[name="name"]', name);
  await page.fill('[data-testid="email-input"], input[type="email"]', email);
  await page.fill('[data-testid="password-input"], input[type="password"]', password);
  
  const submitButton = page.locator('button[type="submit"], button:has-text("Sign up"), button:has-text("Create account")');
  await submitButton.click();
  
  // Wait for redirect or success indication
  await page.waitForURL(/\/(?:dashboard|profile|$)/, { timeout: 10000 });
  
  // Wait for auth state to be set
  await waitForAuthState(page, true);
}

/**
 * Delete a test user via backend API (cleanup)
 */
export async function deleteTestUser(email: string = TEST_USER.email) {
  // For now, we don't have a delete endpoint, so we'll just log
  console.log(`Would delete user: ${email}`);
  // TODO: Implement backend user deletion endpoint if needed for tests
}

/**
 * Check if user is currently authenticated in browser
 */
export async function isUserAuthenticated(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const token = localStorage.getItem('auth_token');
    const userId = localStorage.getItem('user_id');
    return !!(token && userId);
  });
}

/**
 * Get current user data from browser state
 */
export async function getCurrentUser(page: Page) {
  return await page.evaluate(() => {
    return {
      token: localStorage.getItem('auth_token'),
      userId: localStorage.getItem('user_id'),
      email: localStorage.getItem('user_email'),
    };
  });
}