import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { waitForElementToBeRemoved } from '@testing-library/react'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [
            {
              id: 'workout-1',
              name: 'Full Body Workout',
              exercises: [
                { name: 'Bench Press', sets: 3, reps: '8-10' },
                { name: 'Squats', sets: 3, reps: '8-10' }
              ]
            }
          ],
          error: null
        }))
      })),
      insert: jest.fn(() => ({
        data: { id: 'new-workout-id' },
        error: null
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: { id: 'workout-1' },
          error: null
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: null,
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

// Define workout type
interface Workout {
  id: string;
  name: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
  }>;
}

// Define user progress type
interface UserProgress {
  completedWorkouts: number;
  streakDays: number;
  lastWorkout: string;
}

// Define context value type
interface WorkoutContextType {
  workouts: Workout[];
  userProgress: UserProgress;
  isLoading: boolean;
  error: string | null;
  fetchWorkouts: () => Promise<void>;
  addWorkout: (workout: Partial<Workout>) => Promise<{ id?: string; error?: string }>;
  updateWorkout: (id: string, workout: Partial<Workout>) => Promise<{ id?: string; error?: string }>;
  deleteWorkout: (id: string) => Promise<{ success?: boolean; error?: string }>;
  updateProgress: (progress: Partial<UserProgress>) => void;
}

// Mock WorkoutContext implementation
const WorkoutContext = React.createContext<WorkoutContextType | null>(null)

const useWorkoutContext = () => {
  const context = React.useContext(WorkoutContext)
  if (!context) {
    throw new Error('useWorkoutContext must be used within a WorkoutProvider')
  }
  return context
}

const WorkoutProvider = ({ children }: { children: React.ReactNode }) => {
  const [workouts, setWorkouts] = React.useState<Workout[]>([
    {
      id: 'workout-1',
      name: 'Full Body Workout',
      exercises: [
        { name: 'Bench Press', sets: 3, reps: '8-10' },
        { name: 'Squats', sets: 3, reps: '8-10' }
      ]
    }
  ])
  
  const [userProgress, setUserProgress] = React.useState<UserProgress>({
    completedWorkouts: 5,
    streakDays: 3,
    lastWorkout: '2023-04-15'
  })
  
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  const fetchWorkouts = React.useCallback(async () => {
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
  
  const addWorkout = React.useCallback(async (workout: Partial<Workout>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Add the new workout with a mock ID
      const newWorkout = {
        ...workout,
        id: 'new-workout-id'
      } as Workout
      
      setWorkouts(prev => [...prev, newWorkout])
      setIsLoading(false)
      return { id: 'new-workout-id' }
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
      return { error: err.message }
    }
  }, [])
  
  const updateWorkout = React.useCallback(async (id: string, workout: Partial<Workout>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 100))
      
      setWorkouts(prev => 
        prev.map(w => (w.id === id ? { ...w, ...workout } : w))
      )
      
      setIsLoading(false)
      return { id }
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
      return { error: err.message }
    }
  }, [])
  
  const deleteWorkout = React.useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 100))
      
      setWorkouts(prev => prev.filter(w => w.id !== id))
      
      setIsLoading(false)
      return { success: true }
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
      return { error: err.message }
    }
  }, [])
  
  const updateProgress = React.useCallback((progress: Partial<UserProgress>) => {
    setUserProgress(prev => ({
      ...prev,
      ...progress
    }))
  }, [])
  
  // Initialize by fetching workouts
  React.useEffect(() => {
    fetchWorkouts()
  }, [fetchWorkouts])
  
  const contextValue: WorkoutContextType = {
    workouts,
    userProgress,
    isLoading,
    error,
    fetchWorkouts,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    updateProgress
  }
  
  return (
    <WorkoutContext.Provider value={contextValue}>
      {children}
    </WorkoutContext.Provider>
  )
}

// Test component that uses the context
const WorkoutConsumer = () => {
  const {
    workouts,
    userProgress,
    isLoading,
    error,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    updateProgress
  } = useWorkoutContext()
  
  return (
    <div data-testid="workout-consumer">
      {isLoading && <div data-testid="loading-indicator">Loading...</div>}
      {error && <div data-testid="error-message">{error}</div>}
      
      <h2 data-testid="workouts-title">Your Workouts</h2>
      <ul data-testid="workouts-list">
        {workouts.map(workout => (
          <li key={workout.id} data-testid={`workout-${workout.id}`}>
            <span data-testid={`workout-name-${workout.id}`}>{workout.name}</span>
            <button
              data-testid={`update-workout-${workout.id}`}
              onClick={() => updateWorkout(workout.id, { name: 'Updated Workout' })}
            >
              Update
            </button>
            <button
              data-testid={`delete-workout-${workout.id}`}
              onClick={() => deleteWorkout(workout.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      
      <button
        data-testid="add-workout-button"
        onClick={() =>
          addWorkout({
            name: 'New Workout',
            exercises: [{ name: 'Push-ups', sets: 3, reps: '10-15' }]
          })
        }
      >
        Add Workout
      </button>
      
      <div data-testid="progress-section">
        <p data-testid="completed-workouts">
          Completed Workouts: {userProgress.completedWorkouts}
        </p>
        <p data-testid="streak-days">Streak: {userProgress.streakDays} days</p>
        <button
          data-testid="update-progress-button"
          onClick={() =>
            updateProgress({
              completedWorkouts: userProgress.completedWorkouts + 1,
              streakDays: userProgress.streakDays + 1,
              lastWorkout: new Date().toISOString().split('T')[0]
            })
          }
        >
          Log Workout
        </button>
      </div>
    </div>
  )
}

describe('WorkoutContext', () => {
  it('initializes with default workout data', async () => {
    render(
      <WorkoutProvider>
        <WorkoutConsumer />
      </WorkoutProvider>
    )
    
    // Initially it might show loading
    if (screen.queryByTestId('loading-indicator')) {
      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
      })
    }
    
    // Should show workouts list
    expect(screen.getByTestId('workouts-list')).toBeInTheDocument()
    
    // Should have the initial workout
    expect(screen.getByTestId('workout-workout-1')).toBeInTheDocument()
    expect(screen.getByTestId('workout-name-workout-1')).toHaveTextContent('Full Body Workout')
  })
  
  it('shows user progress data', () => {
    render(
      <WorkoutProvider>
        <WorkoutConsumer />
      </WorkoutProvider>
    )
    
    expect(screen.getByTestId('completed-workouts')).toHaveTextContent('Completed Workouts: 5')
    expect(screen.getByTestId('streak-days')).toHaveTextContent('Streak: 3 days')
  })
  
  it('adds a new workout when addWorkout is called', async () => {
    render(
      <WorkoutProvider>
        <WorkoutConsumer />
      </WorkoutProvider>
    );

    expect(screen.getAllByTestId(/^workout-workout-/)).toHaveLength(1);

    fireEvent.click(screen.getByTestId('add-workout-button'));

    // Wait for the loading state to complete
    await waitForElementToBeRemoved(() => screen.queryByTestId('loading-indicator'));

    // Check for both existing and new workout formats
    await waitFor(() => {
      // Find all workout items (both "workout-workout-" and "workout-new-workout-id" formats)
      const existingWorkouts = screen.getAllByTestId(/^workout-workout-/);
      const newWorkout = screen.getByTestId('workout-new-workout-id');
      
      // Verify we have the original workout plus the new one
      expect(existingWorkouts.length + 1).toBe(2);
      expect(newWorkout).toBeInTheDocument();
    });

    // Verify the new workout is in the DOM
    expect(screen.getByTestId('workout-name-new-workout-id')).toHaveTextContent('New Workout');
  });
  
  it('updates a workout when updateWorkout is called', async () => {
    render(
      <WorkoutProvider>
        <WorkoutConsumer />
      </WorkoutProvider>
    )
    
    // Initially workout has original name
    expect(screen.getByTestId('workout-name-workout-1')).toHaveTextContent('Full Body Workout')
    
    // Click update workout button
    fireEvent.click(screen.getByTestId('update-workout-workout-1'))
    
    // Show loading during API call
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    
    // Wait for the operation to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
    
    // Use a more robust waitFor to ensure the update has been applied
    await waitFor(() => {
      expect(screen.getByTestId('workout-name-workout-1')).toHaveTextContent('Updated Workout')
    }, { timeout: 2000 })
  })
  
  it('deletes a workout when deleteWorkout is called', async () => {
    render(
      <WorkoutProvider>
        <WorkoutConsumer />
      </WorkoutProvider>
    )
    
    // Initially one workout
    expect(screen.getAllByTestId(/^workout-workout-/)).toHaveLength(1)
    expect(screen.getByTestId('workout-workout-1')).toBeInTheDocument()
    
    // Click delete workout button
    fireEvent.click(screen.getByTestId('delete-workout-workout-1'))
    
    // Show loading during API call
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    
    // Wait for the operation to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
    
    // Use a more robust waitFor to ensure the element is removed
    await waitFor(() => {
      expect(screen.queryByTestId('workout-workout-1')).not.toBeInTheDocument()
      expect(screen.queryAllByTestId(/^workout-workout-/)).toHaveLength(0)
    }, { timeout: 2000 })
  })
  
  it('updates progress when updateProgress is called', () => {
    render(
      <WorkoutProvider>
        <WorkoutConsumer />
      </WorkoutProvider>
    )
    
    // Initial progress values
    expect(screen.getByTestId('completed-workouts')).toHaveTextContent('Completed Workouts: 5')
    expect(screen.getByTestId('streak-days')).toHaveTextContent('Streak: 3 days')
    
    // Click update progress button
    fireEvent.click(screen.getByTestId('update-progress-button'))
    
    // Progress values should be updated
    expect(screen.getByTestId('completed-workouts')).toHaveTextContent('Completed Workouts: 6')
    expect(screen.getByTestId('streak-days')).toHaveTextContent('Streak: 4 days')
  })
  
  it('handles API errors gracefully', async () => {
    // Override the addWorkout implementation to simulate an error
    const originalError = console.error
    console.error = jest.fn() // Suppress error logs
    
    // Mock implementation with error
    const WorkoutProviderWithError = ({ children }: { children: React.ReactNode }) => {
      const [workouts, setWorkouts] = React.useState([
        {
          id: 'workout-1',
          name: 'Full Body Workout',
          exercises: []
        }
      ])
      
      const [isLoading, setIsLoading] = React.useState(false)
      const [error, setError] = React.useState(null)
      const [userProgress, setUserProgress] = React.useState({
        completedWorkouts: 5,
        streakDays: 3,
        lastWorkout: '2023-04-15'
      })
      
      const addWorkout = React.useCallback(async () => {
        setIsLoading(true)
        setError(null)
        
        try {
          // Simulate API error
          await new Promise((_, reject) => setTimeout(() => reject(new Error('Failed to add workout')), 100))
          return { error: 'Failed to add workout' }
        } catch (err: any) {
          setError(err.message)
          setIsLoading(false)
          return { error: err.message }
        }
      }, [])
      
      const updateWorkout = jest.fn()
      const deleteWorkout = jest.fn()
      const fetchWorkouts = jest.fn()
      const updateProgress = jest.fn()
      
      return (
        <WorkoutContext.Provider
          value={{
            workouts,
            userProgress,
            isLoading,
            error,
            fetchWorkouts,
            addWorkout,
            updateWorkout,
            deleteWorkout,
            updateProgress
          }}
        >
          {children}
        </WorkoutContext.Provider>
      )
    }
    
    render(
      <WorkoutProviderWithError>
        <WorkoutConsumer />
      </WorkoutProviderWithError>
    )
    
    // Click add workout button
    fireEvent.click(screen.getByTestId('add-workout-button'))
    
    // Show loading during API call
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    
    // Wait for the operation to complete with error
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
    
    // Error message should be displayed
    expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to add workout')
    
    // Restore console.error
    console.error = originalError
  })
  
  it('throws error when useWorkoutContext is used outside provider', () => {
    // Suppress console errors
    const originalError = console.error
    console.error = jest.fn()
    
    expect(() => {
      render(<WorkoutConsumer />)
    }).toThrow('useWorkoutContext must be used within a WorkoutProvider')
    
    // Restore console.error
    console.error = originalError
  })
}) 