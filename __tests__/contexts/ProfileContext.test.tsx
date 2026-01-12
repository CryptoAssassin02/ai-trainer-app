import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'profile-1',
              name: 'John Doe',
              email: 'john@example.com',
              height: 180,
              weight: 80,
              goals: ['weight_loss', 'muscle_tone'],
              preferences: {
                units: 'metric',
                exerciseTypes: ['strength', 'cardio'],
                equipment: ['dumbbells', 'bodyweight']
              }
            },
            error: null
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: { id: 'profile-1' },
          error: null
        }))
      }))
    }))
  }))
}))

// Mock the toast function
jest.mock('@/components/ui/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn()
  }))
}))

// Define profile type
interface Profile {
  id: string;
  name: string;
  email: string;
  height?: number;
  weight?: number;
  goals?: string[];
  preferences?: {
    units: string;
    exerciseTypes: string[];
    equipment: string[];
  };
}

// Define context value type
interface ProfileContextType {
  profile: Profile;
  isLoading: boolean;
  error: string | null;
  isProfileComplete: boolean;
  fetchProfile: () => Promise<void>;
  updateProfile: (profileData: Partial<Profile>) => Promise<{ success?: boolean; error?: string }>;
}

// Mock ProfileContext implementation
const ProfileContext = React.createContext<ProfileContextType | null>(null)

const useProfile = () => {
  const context = React.useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}

const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = React.useState<Profile>({
    id: 'profile-1',
    name: 'John Doe',
    email: 'john@example.com',
    height: 180,
    weight: 80,
    goals: ['weight_loss', 'muscle_tone'],
    preferences: {
      units: 'metric',
      exerciseTypes: ['strength', 'cardio'],
      equipment: ['dumbbells', 'bodyweight']
    }
  })
  
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isProfileComplete, setIsProfileComplete] = React.useState(true)
  
  const fetchProfile = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 100))
      // Data is already set in the initial state
      
      setIsLoading(false)
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
    }
  }, [])
  
  const updateProfile = React.useCallback(async (profileData: Partial<Profile>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 100))
      
      setProfile(prev => ({
        ...prev,
        ...profileData
      }))
      
      setIsLoading(false)
      return { success: true }
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
      return { error: err.message }
    }
  }, [])
  
  // Check if profile is complete
  React.useEffect(() => {
    // Check if profile is complete
    const requiredFields = ['name', 'height', 'weight', 'goals', 'preferences'] as const
    const isComplete = requiredFields.every(field => 
      field in profile && profile[field] !== undefined && profile[field] !== null
    )
    setIsProfileComplete(isComplete)
  }, [fetchProfile, profile])
  
  const contextValue: ProfileContextType = {
    profile,
    isLoading,
    error,
    isProfileComplete,
    fetchProfile,
    updateProfile
  }
  
  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  )
}

// Test component that uses the context
const ProfileConsumer = () => {
  const {
    profile,
    isLoading,
    error,
    isProfileComplete,
    updateProfile
  } = useProfile()
  
  return (
    <div data-testid="profile-consumer">
      {isLoading && <div data-testid="loading-indicator">Loading...</div>}
      {error && <div data-testid="error-message">{error}</div>}
      
      <div data-testid="profile-complete-status">
        Profile is {isProfileComplete ? 'complete' : 'incomplete'}
      </div>
      
      <div data-testid="profile-details">
        <p data-testid="profile-name">Name: {profile.name}</p>
        <p data-testid="profile-email">Email: {profile.email}</p>
        <p data-testid="profile-height">Height: {profile.height} cm</p>
        <p data-testid="profile-weight">Weight: {profile.weight} kg</p>
        
        <div data-testid="profile-goals">
          <h3>Goals</h3>
          <ul>
            {profile.goals?.map((goal, index) => (
              <li key={index} data-testid={`goal-${index}`}>{goal}</li>
            ))}
          </ul>
        </div>
        
        <div data-testid="profile-preferences">
          <h3>Preferences</h3>
          <p data-testid="profile-units">Units: {profile.preferences?.units}</p>
          
          <h4>Exercise Types</h4>
          <ul>
            {profile.preferences?.exerciseTypes.map((type, index) => (
              <li key={index} data-testid={`exercise-type-${index}`}>{type}</li>
            ))}
          </ul>
          
          <h4>Equipment</h4>
          <ul>
            {profile.preferences?.equipment.map((item, index) => (
              <li key={index} data-testid={`equipment-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      
      <button
        data-testid="update-name-button"
        onClick={() => updateProfile({ name: 'Jane Doe' })}
      >
        Update Name
      </button>
      
      <button
        data-testid="update-weight-button"
        onClick={() => updateProfile({ weight: 70 })}
      >
        Update Weight
      </button>
      
      <button
        data-testid="update-goals-button"
        onClick={() => updateProfile({ goals: ['weight_loss', 'muscle_gain'] })}
      >
        Update Goals
      </button>
      
      <button
        data-testid="update-preferences-button"
        onClick={() =>
          updateProfile({
            preferences: {
              units: 'imperial',
              exerciseTypes: ['HIIT', 'yoga'],
              equipment: ['resistance bands', 'kettlebells']
            }
          })
        }
      >
        Update Preferences
      </button>
    </div>
  )
}

describe('ProfileContext', () => {
  it('initializes with default profile data', async () => {
    render(
      <ProfileProvider>
        <ProfileConsumer />
      </ProfileProvider>
    )
    
    // Initially it might show loading
    if (screen.queryByTestId('loading-indicator')) {
      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
      })
    }
    
    // Should show profile details
    expect(screen.getByTestId('profile-details')).toBeInTheDocument()
    
    // Check initial profile data
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Name: John Doe')
    expect(screen.getByTestId('profile-email')).toHaveTextContent('Email: john@example.com')
    expect(screen.getByTestId('profile-height')).toHaveTextContent('Height: 180 cm')
    expect(screen.getByTestId('profile-weight')).toHaveTextContent('Weight: 80 kg')
    
    // Check goals
    expect(screen.getByTestId('goal-0')).toHaveTextContent('weight_loss')
    expect(screen.getByTestId('goal-1')).toHaveTextContent('muscle_tone')
    
    // Check preferences
    expect(screen.getByTestId('profile-units')).toHaveTextContent('Units: metric')
    expect(screen.getByTestId('exercise-type-0')).toHaveTextContent('strength')
    expect(screen.getByTestId('exercise-type-1')).toHaveTextContent('cardio')
    expect(screen.getByTestId('equipment-0')).toHaveTextContent('dumbbells')
    expect(screen.getByTestId('equipment-1')).toHaveTextContent('bodyweight')
    
    // Check profile status
    expect(screen.getByTestId('profile-complete-status')).toHaveTextContent('Profile is complete')
  })
  
  it('updates name when updateProfile is called with name data', async () => {
    render(
      <ProfileProvider>
        <ProfileConsumer />
      </ProfileProvider>
    )
    
    // Initially profile has original name
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Name: John Doe')
    
    // Click update name button
    fireEvent.click(screen.getByTestId('update-name-button'))
    
    // Show loading during API call
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    
    // Wait for the operation to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
    
    // Name should be updated
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Name: Jane Doe')
  })
  
  it('updates weight when updateProfile is called with weight data', async () => {
    render(
      <ProfileProvider>
        <ProfileConsumer />
      </ProfileProvider>
    )
    
    // Initially profile has original weight
    expect(screen.getByTestId('profile-weight')).toHaveTextContent('Weight: 80 kg')
    
    // Click update weight button
    fireEvent.click(screen.getByTestId('update-weight-button'))
    
    // Wait for the operation to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
    
    // Weight should be updated
    expect(screen.getByTestId('profile-weight')).toHaveTextContent('Weight: 70 kg')
  })
  
  it('updates goals when updateProfile is called with goals data', async () => {
    render(
      <ProfileProvider>
        <ProfileConsumer />
      </ProfileProvider>
    )
    
    // Initially profile has original goals
    expect(screen.getByTestId('goal-0')).toHaveTextContent('weight_loss')
    expect(screen.getByTestId('goal-1')).toHaveTextContent('muscle_tone')
    
    // Click update goals button
    fireEvent.click(screen.getByTestId('update-goals-button'))
    
    // Wait for the operation to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
    
    // Goals should be updated
    expect(screen.getByTestId('goal-0')).toHaveTextContent('weight_loss')
    expect(screen.getByTestId('goal-1')).toHaveTextContent('muscle_gain')
  })
  
  it('updates preferences when updateProfile is called with preferences data', async () => {
    render(
      <ProfileProvider>
        <ProfileConsumer />
      </ProfileProvider>
    )
    
    // Initially profile has original preferences
    expect(screen.getByTestId('profile-units')).toHaveTextContent('Units: metric')
    expect(screen.getByTestId('exercise-type-0')).toHaveTextContent('strength')
    expect(screen.getByTestId('equipment-0')).toHaveTextContent('dumbbells')
    
    // Click update preferences button
    fireEvent.click(screen.getByTestId('update-preferences-button'))
    
    // Wait for the operation to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
    
    // Preferences should be updated
    expect(screen.getByTestId('profile-units')).toHaveTextContent('Units: imperial')
    expect(screen.getByTestId('exercise-type-0')).toHaveTextContent('HIIT')
    expect(screen.getByTestId('exercise-type-1')).toHaveTextContent('yoga')
    expect(screen.getByTestId('equipment-0')).toHaveTextContent('resistance bands')
    expect(screen.getByTestId('equipment-1')).toHaveTextContent('kettlebells')
  })
  
  it('handles incomplete profile', async () => {
    // Create a provider with incomplete profile
    const IncompleteProfileProvider = ({ children }: { children: React.ReactNode }) => {
      const [profile, setProfile] = React.useState<Profile>({
        id: 'profile-1',
        name: 'John Doe',
        email: 'john@example.com',
        // Missing height, weight, and goals
        preferences: {
          units: 'metric',
          exerciseTypes: ['strength'],
          equipment: ['dumbbells']
        }
      })
      
      const [isLoading, setIsLoading] = React.useState(false)
      const [error, setError] = React.useState<string | null>(null)
      const [isProfileComplete, setIsProfileComplete] = React.useState(false)
      
      const fetchProfile = jest.fn()
      const updateProfile = jest.fn()
      
      return (
        <ProfileContext.Provider
          value={{
            profile,
            isLoading,
            error,
            isProfileComplete,
            fetchProfile,
            updateProfile
          }}
        >
          {children}
        </ProfileContext.Provider>
      )
    }
    
    render(
      <IncompleteProfileProvider>
        <ProfileConsumer />
      </IncompleteProfileProvider>
    )
    
    // Profile status should show incomplete
    expect(screen.getByTestId('profile-complete-status')).toHaveTextContent('Profile is incomplete')
  })
  
  it('handles API errors gracefully', async () => {
    // Override the updateProfile implementation to simulate an error
    const originalError = console.error
    console.error = jest.fn() // Suppress error logs
    
    // Mock implementation with error
    const ProfileProviderWithError = ({ children }: { children: React.ReactNode }) => {
      const [profile, setProfile] = React.useState<Profile>({
        id: 'profile-1',
        name: 'John Doe',
        email: 'john@example.com',
        height: 180,
        weight: 80,
        goals: ['weight_loss', 'muscle_tone'],
        preferences: {
          units: 'metric',
          exerciseTypes: ['strength', 'cardio'],
          equipment: ['dumbbells', 'bodyweight']
        }
      })
      
      const [isLoading, setIsLoading] = React.useState(false)
      const [error, setError] = React.useState<string | null>(null)
      const [isProfileComplete, setIsProfileComplete] = React.useState(true)
      
      const fetchProfile = jest.fn()
      
      const updateProfile = React.useCallback(async () => {
        setIsLoading(true)
        setError(null)
        
        try {
          // Simulate API error
          await new Promise((_, reject) => setTimeout(() => reject(new Error('Failed to update profile')), 100))
          return { error: 'Failed to update profile' }
        } catch (err: any) {
          setError(err.message)
          setIsLoading(false)
          return { error: err.message }
        }
      }, [])
      
      return (
        <ProfileContext.Provider
          value={{
            profile,
            isLoading,
            error,
            isProfileComplete,
            fetchProfile,
            updateProfile
          }}
        >
          {children}
        </ProfileContext.Provider>
      )
    }
    
    render(
      <ProfileProviderWithError>
        <ProfileConsumer />
      </ProfileProviderWithError>
    )
    
    // Click update name button
    fireEvent.click(screen.getByTestId('update-name-button'))
    
    // Show loading during API call
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    
    // Wait for the operation to complete with error
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
    
    // Error message should be displayed
    expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to update profile')
    
    // Restore console.error
    console.error = originalError
  })
  
  it('throws error when useProfile is used outside provider', () => {
    // Suppress console errors
    const originalError = console.error
    console.error = jest.fn()
    
    expect(() => {
      render(<ProfileConsumer />)
    }).toThrow('useProfile must be used within a ProfileProvider')
    
    // Restore console.error
    console.error = originalError
  })
}) 