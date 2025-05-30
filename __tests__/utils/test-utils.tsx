import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { WorkoutProvider } from '@/contexts/workout-context';
import { AuthContextProvider } from '@/providers/auth-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react-dom/test-utils';
import { ReactNode } from 'react';
import { ProfileProvider } from '@/lib/profile-context';
import { useForm, FormProvider } from 'react-hook-form';

// Mock Supabase client to prevent errors in tests
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      signInWithPassword: jest.fn(() => Promise.resolve({ data: { session: { user: { id: 'test-user-id' } } }, error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn()
          }
        }
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null })),
      delete: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }))
}));

// Mock OpenAI client to prevent API key errors
jest.mock('@/utils/ai/openai', () => {
  // Mock OpenAI client
  const mockOpenAIClient = {
    chat: {
      completions: {
        create: jest.fn(() => Promise.resolve({
          choices: [{ message: { content: 'Mocked OpenAI response' } }]
        }))
      }
    },
    beta: {
      assistants: {
        retrieve: jest.fn(),
        create: jest.fn(),
        list: jest.fn()
      }
    }
  };
  
  return {
    createOpenAIClient: jest.fn(() => mockOpenAIClient),
    getModels: jest.fn(() => Promise.resolve(['gpt-3.5-turbo', 'gpt-4'])),
    useOpenAI: jest.fn(() => mockOpenAIClient)
  };
});

// Set environment variables for tests
process.env.NEXT_PUBLIC_OPENAI_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Create a new QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Custom render that wraps the component with all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withAuth?: boolean;
  withWorkout?: boolean;
  withReactQuery?: boolean;
  withTheme?: boolean;
}

const queryClient = new QueryClient();

// Helper component to provide Form context
const TestWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  const methods = useForm(); // Create dummy form instance
  return (
    <QueryClientProvider client={queryClient}>
      <ProfileProvider>
        <WorkoutProvider>
          <FormProvider {...methods}>{children}</FormProvider> {/* Wrap children in FormProvider */}
        </WorkoutProvider>
      </ProfileProvider>
    </QueryClientProvider>
  );
};

export function renderWithProviders(ui: ReactNode) {
  const user = userEvent.setup();
  const result = render(
    <TestWrapper>{ui}</TestWrapper> // Use the wrapper component
  );
  return {
    ...result,
    user,
  };
}

// Wait for a specified amount of time (useful for animations, etc.)
export const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to wait for elements to be removed
export const waitForElementToBeRemoved = async (callback: () => boolean, timeout = 5000) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (!callback()) {
      return;
    }
    await wait(50);
  }
  throw new Error('Element was not removed within timeout period');
};

// Mock next/navigation for tests
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    params: {},
  }),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => '/'),
}));

// Mock next/image for tests
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Helper for mocking supabase auth
export const mockSupabaseUser = (isAuthenticated = true) => {
  // Create a mock implementation of the Supabase auth client
  const mockAuth = isAuthenticated
    ? {
        getUser: jest.fn(() =>
          Promise.resolve({
            data: {
              user: {
                id: 'test-user-id',
                email: 'test@example.com',
                created_at: new Date().toISOString(),
              },
            },
            error: null,
          })
        ),
        getSession: jest.fn(() =>
          Promise.resolve({
            data: {
              session: {
                access_token: 'test-access-token',
                refresh_token: 'test-refresh-token',
                expires_in: 3600,
                user: {
                  id: 'test-user-id',
                  email: 'test@example.com',
                },
              },
            },
            error: null,
          })
        ),
        signOut: jest.fn(() => Promise.resolve({ error: null })),
        onAuthStateChange: jest.fn((callback) => ({
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        })),
      }
    : {
        getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        signOut: jest.fn(() => Promise.resolve({ error: null })),
        onAuthStateChange: jest.fn((callback) => ({
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        })),
      };

  // Return the mock auth object
  return mockAuth;
};

// Add a simple test to prevent the "Your test suite must contain at least one test" error
describe('Test Utilities', () => {
  it('creates a mock supabase user', () => {
    const mockAuth = mockSupabaseUser();
    expect(mockAuth).toBeDefined();
    expect(typeof mockAuth.getUser).toBe('function');
    expect(typeof mockAuth.getSession).toBe('function');
    expect(typeof mockAuth.signOut).toBe('function');
  });
});

// Export all testing library utilities
export * from '@testing-library/react';
export { userEvent, act }; 