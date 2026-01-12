/// <reference types="@testing-library/jest-dom" />
import React, { createContext, useContext } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CheckInForm } from '@/components/progress/check-in-form';
import { useProfile, UserProfile, ProfileProvider } from '@/lib/profile-context';
import { renderWithProviders } from '../../utils/test-utils';
import { User } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '../../../__mocks__/msw/index'; // Corrected relative path to index
import { useToast } from '@/components/ui/use-toast';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/react';

// --- Mocks --- 

// Mock the useProfile hook
jest.mock('@/lib/profile-context', () => ({
  ...jest.requireActual('@/lib/profile-context'), // Keep original exports
  useProfile: jest.fn(), // Mock the hook itself
}));

// Define the Supabase mock functions object FIRST
const mockSupabaseFunctions = {
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  insert: jest.fn().mockResolvedValue({ data: [], error: null }),
  update: jest.fn().mockResolvedValue({ data: [], error: null }),
  delete: jest.fn().mockResolvedValue({ data: [], error: null }),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
};

// Mock the Supabase client module. 
// Export a mock `createClient` function that returns the mock object.
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabaseFunctions) // Mock the function to return the object
}));

// Mock useToast (assuming it's used for notifications)
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock Select component parts using Context for proper onChange handling
jest.mock('@/components/ui/select', () => {
  // Define Context
  const MockSelectContext = createContext<{ onChange: ((value: string) => void) | null }>({ onChange: null });

  const Select = ({ children, onValueChange }: { children: React.ReactNode, onValueChange?: (value: string) => void }) => {
    // Provide the specific onChange for this instance via Context
    console.log('Mock Select Provider Rendered, providing onChange:', !!onValueChange);
    return (
      <MockSelectContext.Provider value={{ onChange: onValueChange || null }}>
        <div data-testid="mock-select-wrapper">{children}</div>
      </MockSelectContext.Provider>
    );
  };

  const SelectTrigger = ({ children, 'aria-describedby': ariaDescribedby, id }: { children: React.ReactNode, 'aria-describedby'?: string, id?: string }) => {
    return (
      <button 
        type="button" 
        id={id} 
        aria-describedby={ariaDescribedby}
        onClick={() => console.log('Mock SelectTrigger Clicked')}
      >
        {children}
      </button>
    );
  };

  const SelectContent = ({ children }: { children: React.ReactNode }) => {
    return <div data-testid="mock-select-content">{children}</div>;
  };

  const SelectItem = ({ children, value }: { children: React.ReactNode, value: string }) => {
    // Consume the onChange from the parent Select Provider
    const { onChange } = useContext(MockSelectContext);
    
    const handleClick = () => {
      if (onChange) {
        console.log(`Mock SelectItem Calling Context onChange with value: ${value}`);
        onChange(value); // Call the correct onChange from context
      } else {
         console.warn(`Mock SelectItem clicked but no onChange found in context for value: ${value}`);
      }
    };
    return (
      <div 
        role="option"
        data-testid={`select-item-${value}`}
        data-value={value}
        onClick={handleClick}
        tabIndex={0}
        style={{ cursor: 'pointer' }}
      >
        {children}
      </div>
    );
  };

  // Return the mocked components
  return {
    Select,
    SelectTrigger,
    SelectValue: ({ placeholder }: { placeholder: string }) => <span>{placeholder}</span>, 
    SelectContent,
    SelectItem,
    SelectGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

// --- Helper Functions ---

// Helper to create a mock user
const createMockUser = (id = 'user-123', email = 'test@example.com'): User => ({
  id,
  app_metadata: { provider: 'email' },
  user_metadata: { name: 'Test User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  // Add any other necessary User properties used by your components/context
});

// Create a QueryClient instance for the tests
const queryClient = new QueryClient();

// Mock the workout context, preserving the original provider
const mockLogCheckInFn = jest.fn().mockResolvedValue(true);
jest.mock('@/contexts/workout-context', () => {
  const originalModule = jest.requireActual('@/contexts/workout-context');
  return {
    __esModule: true,
    ...originalModule,
    useWorkout: () => ({
      workoutPlans: [],
      selectedPlan: null,
      userProgress: [],
      userCheckIns: [],
      generationStatus: 'idle',
      generationProgress: 0,
      currentAgent: null,
      agentMessages: [],
      fetchUserWorkoutPlans: jest.fn(),
      fetchWorkoutPlan: jest.fn(),
      generateWorkoutPlan: jest.fn().mockResolvedValue('plan-id'),
      adjustWorkoutPlan: jest.fn(),
      saveWorkoutPlan: jest.fn(),
      deleteWorkoutPlan: jest.fn(),
      logWorkoutProgress: jest.fn().mockResolvedValue(true),
      logCheckIn: mockLogCheckInFn,
      getProgressHistory: jest.fn().mockResolvedValue([]),
      getCheckInHistory: jest.fn().mockResolvedValue([]),
      sendMessageToAgent: jest.fn(),
      resetAgentConversation: jest.fn(),
    }),
  };
});

// Mock the useToast hook
jest.mock('@/components/ui/use-toast');
const mockedUseToast = useToast as jest.Mock;

// Test Suite
describe('CheckInForm Component', () => {
  let mockUser: User;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    queryClient.clear(); // Clear query cache

    // Setup mock data
    mockUser = createMockUser();
    // Create a FRESH default profile object with CORRECT structure
    const defaultMockProfileData: UserProfile = { // Use UserProfile type for better checking
      id: mockUser.id,
      name: mockUser.user_metadata.name || '',
      // Add other required fields from UserProfile definition with defaults
      age: 30,
      gender: 'prefer-not-to-say',
      height: 178,
      weight: 75,
      experienceLevel: 'beginner',
      fitnessGoals: [],
      medicalConditions: '',
      equipment: [],
      // --- Correct structure --- 
      unit_preference: 'metric', 
    };

    // Mock the useProfile hook to return the correctly structured default data
    (useProfile as jest.Mock).mockReturnValue({
      profile: defaultMockProfileData,
      isLoading: false,
      error: null,
      refetchProfile: jest.fn(),
    });

    // --- Reset the implementations on the object *returned* by the mocked createClient --- 
    const actualMockedSupabase = require('@/lib/supabase/client').createClient();

    // Reset specific mock implementations for this test run
    actualMockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    actualMockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser, /* other session props */ } },
      error: null,
    });
    actualMockedSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
      error: null,
    });

    actualMockedSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'user_profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          // Use the fresh default data for Supabase mock as well
          single: jest.fn().mockResolvedValue({ data: defaultMockProfileData, error: null }),
          upsert: jest.fn().mockResolvedValue({ data: [defaultMockProfileData], error: null }),
        } as any;
      }
      if (tableName === 'user_check_ins') {
         return {
           insert: jest.fn().mockResolvedValue({ data: [{ id: 'log-123' }], error: null }),
           select: jest.fn().mockReturnThis(),
           eq: jest.fn().mockReturnThis(),
           order: jest.fn().mockReturnThis(),
           limit: jest.fn().mockResolvedValue({ data: [], error: null }) 
         } as any;
      }
      // Return the base mock object for chained calls on other tables
      return actualMockedSupabase; // Return the main mock object
    });

  });

  // Test Case: Renders the form with metric units
  test('renders the form with all fields (metric units)', async () => {
    render(
      // Provide the QueryClientProvider
      <QueryClientProvider client={queryClient}>
        {/* Wrap CheckInForm with ProfileProvider */}
        <ProfileProvider>
           <CheckInForm />
        </ProfileProvider>
      </QueryClientProvider>
    );

    // Wait specifically for the label text to appear
    const weightLabel = await screen.findByText(/weight \(kg\)/i);
    expect(weightLabel).toBeInTheDocument();

    // Now that the label exists, try getting the associated input by role/name
    // Note: The accessible name includes the label text
    const weightInput = screen.getByRole('spinbutton', { name: /weight \(kg\)/i });
    expect(weightInput).toBeInTheDocument();

    // Check other fields
    expect(await screen.findByLabelText(/check-in date/i)).toBeInTheDocument(); // Keep others as LabelText for now
    expect(await screen.findByRole('button', { name: /body measurements/i })).toBeInTheDocument();
    expect(await screen.findByLabelText(/energy level/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/sleep quality/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/stress level/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/notes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Check-in/i })).toBeInTheDocument();

    // Check that imperial fields are NOT present
    expect(screen.queryByText(/weight \(lbs\)/i)).not.toBeInTheDocument();
  });

  // Test Case: Renders the form with imperial units when profile preference changes
  test('renders the form with all fields (imperial units)', async () => {
     // Create a FRESH profile object with CORRECT structure
     const imperialMockProfileData: UserProfile = {
       id: mockUser.id,
       name: mockUser.user_metadata.name || '',
       // Add other required fields from UserProfile definition with defaults
       age: 30,
       gender: 'prefer-not-to-say',
       height: 178,
       weight: 75,
       experienceLevel: 'beginner',
       fitnessGoals: [],
       medicalConditions: '',
       equipment: [],
       // --- Correct structure --- 
       unit_preference: 'imperial', 
     };

     // Override useProfile mock specifically for this test with the correctly structured imperial data
    (useProfile as jest.Mock).mockReturnValue({
      profile: imperialMockProfileData,
      isLoading: false,
      error: null,
      refetchProfile: jest.fn(),
    });

    // Also update the Supabase mock if it needs the imperial data for this test
    const actualMockedSupabase = require('@/lib/supabase/client').createClient();
    actualMockedSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'user_profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: imperialMockProfileData, error: null }),
          upsert: jest.fn().mockResolvedValue({ data: [imperialMockProfileData], error: null }),
        } as any;
      }
      // Return the original mock implementation for other tables/calls if needed
      // This depends on how isolated you want the Supabase mock per test
       if (tableName === 'user_check_ins') {
         return {
           insert: jest.fn().mockResolvedValue({ data: [{ id: 'log-123' }], error: null }),
           select: jest.fn().mockReturnThis(),
           eq: jest.fn().mockReturnThis(),
           order: jest.fn().mockReturnThis(),
           limit: jest.fn().mockResolvedValue({ data: [], error: null }) 
         } as any;
      }
      return actualMockedSupabase; 
    });


    render(
      <QueryClientProvider client={queryClient}>
        <ProfileProvider>
          <CheckInForm />
        </ProfileProvider>
      </QueryClientProvider>
    );

    // Wait specifically for the label text to appear
    const weightLabel = await screen.findByText(/weight \(lbs\)/i);
    expect(weightLabel).toBeInTheDocument();

    // Now get the associated input by role/name
    const weightInput = screen.getByRole('spinbutton', { name: /weight \(lbs\)/i });
    expect(weightInput).toBeInTheDocument();

    // Check that metric fields are NOT present
    expect(screen.queryByText(/weight \(kg\)/i)).not.toBeInTheDocument();

     // Check other common fields still exist
    expect(await screen.findByLabelText(/check-in date/i)).toBeInTheDocument();
    // Correct button text query
    expect(await screen.findByRole('button', { name: /Save Check-in/i })).toBeInTheDocument();

  });

   // Test Case: Submits the form successfully
  test('submits the form data correctly', async () => {
     // Uses metric profile from beforeEach
    render(
       // ... providers ...
      <CheckInForm />
       // ... providers ...
    );

    // Wait for form elements using the new strategy
    const weightLabel = await screen.findByText(/weight \(kg\)/i);
    expect(weightLabel).toBeInTheDocument();
    const weightInput = screen.getByRole('spinbutton', { name: /weight \(kg\)/i });
    const bodyFatInput = screen.getByRole('spinbutton', { name: /body fat \(%\)/i });
    
    // Query sliders differently - find all, then filter/select by default value
    const sliders = screen.getAllByRole('slider');
    const energySlider = sliders.find(slider => slider.getAttribute('aria-valuenow') === '7');
    const stressSlider = sliders.find(slider => slider.getAttribute('aria-valuenow') === '4');

    // Basic check if sliders were found
    if (!energySlider || !stressSlider) {
      throw new Error('Could not find required sliders based on default values');
    }

    // Find mood and sleep quality selects (using the mock structure)
    const moodSelectTrigger = screen.getByRole('button', { name: /Mood/i });
    const sleepSelectTrigger = screen.getByRole('button', { name: /Sleep Quality/i });
    const notesInput = screen.getByLabelText(/notes/i);
    // Correct button text query
    const submitButton = screen.getByRole('button', { name: /Save Check-in/i });

    // Fill the form
    await userEvent.clear(weightInput);
    await userEvent.type(weightInput, '75.5');
    await userEvent.clear(bodyFatInput);
    await userEvent.type(bodyFatInput, '15.2');

    // Interact with selects using `within` scoped to the field
    // Find the container for the Mood field (assuming label is a good anchor)
    const moodLabel = screen.getByText('Mood');
    const moodFieldContainerEl = moodLabel.closest('div[role="group"]') || moodLabel.closest('div'); // Adjust selector based on actual FormField structure if needed
    if (!(moodFieldContainerEl instanceof HTMLElement)) { // Type check for within
      throw new Error('Could not find Mood field container or it is not an HTMLElement');
    }
    const moodFieldContainer = moodFieldContainerEl; // Assign to typed variable
    
    await userEvent.click(moodSelectTrigger);
    // Click the specific item using its test ID *within the field container*
    const excellentMoodItem = await within(moodFieldContainer).findByTestId('select-item-excellent');
    await userEvent.click(excellentMoodItem);
    
    // Find the container for the Sleep Quality field
    const sleepLabel = screen.getByText('Sleep Quality');
    const sleepFieldContainerEl = sleepLabel.closest('div[role="group"]') || sleepLabel.closest('div'); // Adjust selector
    if (!(sleepFieldContainerEl instanceof HTMLElement)) { // Type check for within
      throw new Error('Could not find Sleep Quality field container or it is not an HTMLElement');
    }
    const sleepFieldContainer = sleepFieldContainerEl; // Assign to typed variable

    await userEvent.click(sleepSelectTrigger);
    const fairSleepItem = await within(sleepFieldContainer).findByTestId('select-item-fair');
    await userEvent.click(fairSleepItem); 

    await userEvent.clear(notesInput);
    await userEvent.type(notesInput, 'Feeling good, sleep was okay.');

    // Submit the form
    await userEvent.click(submitButton);

    // Wait for the submission to complete and check results
    await waitFor(() => {
      // Check that the logCheckIn mock was called with correct data
      expect(mockLogCheckInFn).toHaveBeenCalledTimes(1);
      expect(mockLogCheckInFn).toHaveBeenCalledWith(expect.objectContaining({
        weight: 75.5,
        body_fat_percentage: 15.2,
        mood: 'excellent', // Check submitted select value
        sleep_quality: 'fair', // Check submitted select value
        energy_level: 7, // Check default slider value (since we didn't interact)
        stress_level: 4, // Check default slider value
        notes: 'Feeling good, sleep was okay.',
        date: expect.any(String), // Corrected key and expected type (string)
      }));
    });

    // Optional: Check for success message
    expect(await screen.findByText(/Your check-in has been saved successfully!/i)).toBeInTheDocument();

  });


   // Add more tests:
   // - Test validation errors (e.g., submitting with missing required fields)
   // - Test interaction with the Body Measurements modal/accordion
   // - Test different slider values
   // - Test edge cases or specific logic within the form

}); 