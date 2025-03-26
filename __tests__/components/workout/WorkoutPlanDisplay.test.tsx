import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { axe } from 'jest-axe'
import 'jest-axe/extend-expect'

// Mock component for testing
const WorkoutPlanDisplay = ({ 
  workoutPlan,
  onSaveWorkout,
  isLoading = false,
  error = null
}: { 
  workoutPlan: any
  onSaveWorkout?: (workout: any) => void
  isLoading?: boolean
  error?: string | null
}) => {
  if (isLoading) {
    return <div data-testid="loading-indicator">Loading workout plan...</div>
  }
  
  if (error) {
    return <div data-testid="error-message" role="alert">{error}</div>
  }
  
  if (!workoutPlan) {
    return <div data-testid="empty-state">No workout plan available</div>
  }
  
  return (
    <div data-testid="workout-plan-display">
      <h2 data-testid="workout-plan-title">{workoutPlan.title}</h2>
      {workoutPlan.description && (
        <p data-testid="workout-plan-description">{workoutPlan.description}</p>
      )}
      
      <div data-testid="workout-days">
        {workoutPlan.days.map((day: any, dayIndex: number) => (
          <div key={dayIndex} data-testid={`workout-day-${dayIndex}`} className="workout-day">
            <h3 data-testid={`day-title-${dayIndex}`}>{day.title}</h3>
            
            <ul data-testid={`exercise-list-${dayIndex}`}>
              {day.exercises.map((exercise: any, exerciseIndex: number) => (
                <li 
                  key={exerciseIndex} 
                  data-testid={`exercise-${dayIndex}-${exerciseIndex}`} 
                  className="exercise-item"
                >
                  <div data-testid={`exercise-name-${dayIndex}-${exerciseIndex}`}>
                    {exercise.name}
                  </div>
                  
                  <div data-testid={`exercise-details-${dayIndex}-${exerciseIndex}`}>
                    {exercise.sets} sets x {exercise.reps} reps
                    {exercise.weight && ` @ ${exercise.weight}`}
                  </div>
                  
                  {exercise.notes && (
                    <div data-testid={`exercise-notes-${dayIndex}-${exerciseIndex}`} className="notes">
                      {exercise.notes}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      
      {onSaveWorkout && (
        <button 
          data-testid="save-workout-button" 
          onClick={() => onSaveWorkout(workoutPlan)}
        >
          Save Workout Plan
        </button>
      )}
    </div>
  )
}

describe('WorkoutPlanDisplay', () => {
  const mockWorkoutPlan = {
    title: '4-Week Strength Building Program',
    description: 'A comprehensive program focused on building overall strength',
    days: [
      {
        title: 'Day 1: Upper Body',
        exercises: [
          { name: 'Bench Press', sets: 4, reps: 8, weight: '70% 1RM' },
          { name: 'Overhead Press', sets: 3, reps: 10 },
          { name: 'Pull-ups', sets: 3, reps: '8-12', notes: 'Use assistance if needed' }
        ]
      },
      {
        title: 'Day 2: Lower Body',
        exercises: [
          { name: 'Squats', sets: 4, reps: 8, weight: '75% 1RM' },
          { name: 'Deadlifts', sets: 3, reps: 8, weight: '70% 1RM' },
          { name: 'Lunges', sets: 3, reps: 10, notes: 'Each leg' }
        ]
      }
    ]
  }

  it('renders workout plan title and description', () => {
    render(<WorkoutPlanDisplay workoutPlan={mockWorkoutPlan} />)
    
    expect(screen.getByTestId('workout-plan-title')).toHaveTextContent('4-Week Strength Building Program')
    expect(screen.getByTestId('workout-plan-description')).toHaveTextContent('A comprehensive program focused on building overall strength')
  })
  
  it('renders all workout days', () => {
    render(<WorkoutPlanDisplay workoutPlan={mockWorkoutPlan} />)
    
    expect(screen.getByTestId('workout-days')).toBeInTheDocument()
    expect(screen.getByTestId('workout-day-0')).toBeInTheDocument()
    expect(screen.getByTestId('workout-day-1')).toBeInTheDocument()
    
    expect(screen.getByTestId('day-title-0')).toHaveTextContent('Day 1: Upper Body')
    expect(screen.getByTestId('day-title-1')).toHaveTextContent('Day 2: Lower Body')
  })
  
  it('renders all exercises for each day', () => {
    render(<WorkoutPlanDisplay workoutPlan={mockWorkoutPlan} />)
    
    // Day 1 exercises
    expect(screen.getByTestId('exercise-list-0')).toBeInTheDocument()
    expect(screen.getByTestId('exercise-0-0')).toBeInTheDocument()
    expect(screen.getByTestId('exercise-0-1')).toBeInTheDocument()
    expect(screen.getByTestId('exercise-0-2')).toBeInTheDocument()
    
    expect(screen.getByTestId('exercise-name-0-0')).toHaveTextContent('Bench Press')
    expect(screen.getByTestId('exercise-name-0-1')).toHaveTextContent('Overhead Press')
    expect(screen.getByTestId('exercise-name-0-2')).toHaveTextContent('Pull-ups')
    
    // Day 2 exercises
    expect(screen.getByTestId('exercise-list-1')).toBeInTheDocument()
    expect(screen.getByTestId('exercise-1-0')).toBeInTheDocument()
    expect(screen.getByTestId('exercise-1-1')).toBeInTheDocument()
    expect(screen.getByTestId('exercise-1-2')).toBeInTheDocument()
    
    expect(screen.getByTestId('exercise-name-1-0')).toHaveTextContent('Squats')
    expect(screen.getByTestId('exercise-name-1-1')).toHaveTextContent('Deadlifts')
    expect(screen.getByTestId('exercise-name-1-2')).toHaveTextContent('Lunges')
  })
  
  it('displays exercise details correctly', () => {
    render(<WorkoutPlanDisplay workoutPlan={mockWorkoutPlan} />)
    
    expect(screen.getByTestId('exercise-details-0-0')).toHaveTextContent('4 sets x 8 reps @ 70% 1RM')
    expect(screen.getByTestId('exercise-details-0-1')).toHaveTextContent('3 sets x 10 reps')
    expect(screen.getByTestId('exercise-details-1-0')).toHaveTextContent('4 sets x 8 reps @ 75% 1RM')
  })
  
  it('displays exercise notes when available', () => {
    render(<WorkoutPlanDisplay workoutPlan={mockWorkoutPlan} />)
    
    expect(screen.getByTestId('exercise-notes-0-2')).toHaveTextContent('Use assistance if needed')
    expect(screen.getByTestId('exercise-notes-1-2')).toHaveTextContent('Each leg')
  })
  
  it('shows loading indicator when isLoading is true', () => {
    render(<WorkoutPlanDisplay workoutPlan={mockWorkoutPlan} isLoading={true} />)
    
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    expect(screen.queryByTestId('workout-plan-display')).not.toBeInTheDocument()
  })
  
  it('shows error message when error is provided', () => {
    render(
      <WorkoutPlanDisplay 
        workoutPlan={mockWorkoutPlan} 
        error="Failed to load workout plan"
      />
    )
    
    expect(screen.getByTestId('error-message')).toBeInTheDocument()
    expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to load workout plan')
    expect(screen.queryByTestId('workout-plan-display')).not.toBeInTheDocument()
  })
  
  it('shows empty state when no workout plan is provided', () => {
    render(<WorkoutPlanDisplay workoutPlan={null} />)
    
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByTestId('empty-state')).toHaveTextContent('No workout plan available')
  })
  
  it('renders save button when onSaveWorkout is provided', () => {
    const mockSaveWorkout = jest.fn()
    render(
      <WorkoutPlanDisplay 
        workoutPlan={mockWorkoutPlan} 
        onSaveWorkout={mockSaveWorkout} 
      />
    )
    
    expect(screen.getByTestId('save-workout-button')).toBeInTheDocument()
  })
  
  it('does not render save button when onSaveWorkout is not provided', () => {
    render(<WorkoutPlanDisplay workoutPlan={mockWorkoutPlan} />)
    
    expect(screen.queryByTestId('save-workout-button')).not.toBeInTheDocument()
  })
  
  it('calls onSaveWorkout when save button is clicked', () => {
    const mockSaveWorkout = jest.fn()
    render(
      <WorkoutPlanDisplay 
        workoutPlan={mockWorkoutPlan} 
        onSaveWorkout={mockSaveWorkout} 
      />
    )
    
    fireEvent.click(screen.getByTestId('save-workout-button'))
    expect(mockSaveWorkout).toHaveBeenCalledTimes(1)
    expect(mockSaveWorkout).toHaveBeenCalledWith(mockWorkoutPlan)
  })
  
  it('handles workout plans with different structures', () => {
    const simplifiedWorkoutPlan = {
      title: 'Simple Workout',
      days: [
        {
          title: 'Full Body Workout',
          exercises: [
            { name: 'Push-ups', sets: 3, reps: 10 }
          ]
        }
      ]
    }
    
    render(<WorkoutPlanDisplay workoutPlan={simplifiedWorkoutPlan} />)
    
    expect(screen.getByTestId('workout-plan-title')).toHaveTextContent('Simple Workout')
    expect(screen.queryByTestId('workout-plan-description')).not.toBeInTheDocument()
    expect(screen.getByTestId('day-title-0')).toHaveTextContent('Full Body Workout')
    expect(screen.getByTestId('exercise-name-0-0')).toHaveTextContent('Push-ups')
    expect(screen.getByTestId('exercise-details-0-0')).toHaveTextContent('3 sets x 10 reps')
  })
  
  it('has no accessibility violations', async () => {
    const { container } = render(<WorkoutPlanDisplay workoutPlan={mockWorkoutPlan} />)
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
}) 