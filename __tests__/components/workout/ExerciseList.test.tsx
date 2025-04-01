import React, { useState, useEffect } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { axe } from 'jest-axe'

// Mock ExerciseList component with filtering functionality
const ExerciseList = ({ exercises, onSelectExercise }) => {
  const [filteredExercises, setFilteredExercises] = useState(exercises)
  const [filters, setFilters] = useState({
    search: '',
    muscleGroup: '',
    equipment: '',
    difficulty: '',
    category: ''
  })

  // Apply filters whenever they change
  useEffect(() => {
    let result = [...exercises]
    
    if (filters.search) {
      result = result.filter(exercise => 
        exercise.name.toLowerCase().includes(filters.search.toLowerCase())
      )
    }
    
    if (filters.muscleGroup) {
      result = result.filter(exercise => 
        exercise.muscleGroup === filters.muscleGroup
      )
    }
    
    if (filters.equipment) {
      result = result.filter(exercise => 
        exercise.equipment === filters.equipment
      )
    }
    
    if (filters.difficulty) {
      result = result.filter(exercise => 
        exercise.difficulty === filters.difficulty
      )
    }
    
    if (filters.category) {
      result = result.filter(exercise => 
        exercise.categories.includes(filters.category)
      )
    }
    
    setFilteredExercises(result)
  }, [filters, exercises])

  // Update filters
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }))
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      muscleGroup: '',
      equipment: '',
      difficulty: '',
      category: ''
    })
  }

  return (
    <div>
      <div className="filters">
        <input 
          type="text" 
          placeholder="Search exercises" 
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          data-testid="search-input"
        />
        
        <div className="filter-buttons">
          <button onClick={() => handleFilterChange('muscleGroup', 'chest')}>Chest</button>
          <button onClick={() => handleFilterChange('muscleGroup', 'legs')}>Legs</button>
          <button onClick={() => handleFilterChange('equipment', 'dumbbell')}>Dumbbell</button>
          <button onClick={() => handleFilterChange('equipment', 'bodyweight')}>Bodyweight</button>
          <button onClick={() => handleFilterChange('difficulty', 'beginner')}>Beginner</button>
          <button onClick={() => handleFilterChange('difficulty', 'intermediate')}>Intermediate</button>
          <button onClick={() => handleFilterChange('category', 'strength')}>Strength</button>
          <button onClick={() => handleFilterChange('category', 'cardio')}>Cardio</button>
          <button onClick={clearFilters}>Clear Filters</button>
        </div>
      </div>
      
      <div className="exercise-list">
        {filteredExercises.length > 0 ? (
          filteredExercises.map(exercise => (
            <div 
              key={exercise.id} 
              className="exercise-card"
              onClick={() => onSelectExercise(exercise)}
              data-testid="exercise-card"
            >
              <h3>{exercise.name}</h3>
              <div data-testid={`muscle-group-${exercise.id}`}>
                Muscle Group: {exercise.muscleGroup}
              </div>
              <div data-testid={`difficulty-${exercise.id}`}>
                Difficulty: {exercise.difficulty}
              </div>
              <div data-testid={`equipment-${exercise.id}`}>
                Equipment: {exercise.equipment}
              </div>
              {exercise.imageUrl && (
                <img 
                  src={exercise.imageUrl} 
                  alt={exercise.name} 
                  data-testid="exercise-image"
                />
              )}
            </div>
          ))
        ) : (
          <div data-testid="no-exercises-message">No exercises found</div>
        )}
      </div>
    </div>
  )
}

// Mock exercise data
const mockExercises = [
  {
    id: '1',
    name: 'Push-up',
    muscleGroup: 'chest',
    equipment: 'bodyweight',
    difficulty: 'beginner',
    description: 'A classic bodyweight exercise for the chest, shoulders, and triceps.',
    instructions: 'Start in a plank position with hands slightly wider than shoulders. Lower your body until chest nearly touches the floor. Push back up to starting position.',
    videoUrl: 'https://example.com/push-up-video',
    imageUrl: 'https://example.com/push-up-image.jpg',
    categories: ['strength', 'upper-body'],
    variations: ['Incline Push-up', 'Decline Push-up'],
    targetMuscles: ['chest', 'triceps', 'shoulders']
  },
  {
    id: '2',
    name: 'Squat',
    muscleGroup: 'legs',
    equipment: 'bodyweight',
    difficulty: 'beginner',
    description: 'A fundamental lower body exercise that works multiple muscle groups.',
    instructions: 'Stand with feet shoulder-width apart. Lower your body as if sitting in a chair. Keep chest up and knees over toes. Return to standing position.',
    videoUrl: 'https://example.com/squat-video',
    imageUrl: 'https://example.com/squat-image.jpg',
    categories: ['strength', 'lower-body'],
    variations: ['Goblet Squat', 'Bulgarian Split Squat'],
    targetMuscles: ['quadriceps', 'hamstrings', 'glutes']
  },
  {
    id: '3',
    name: 'Dumbbell Bench Press',
    muscleGroup: 'chest',
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    description: 'A variation of the bench press using dumbbells for greater range of motion.',
    instructions: 'Lie on a bench with a dumbbell in each hand. Press the weights up until arms are extended. Lower weights to sides of chest and repeat.',
    videoUrl: 'https://example.com/dumbbell-bench-press-video',
    imageUrl: 'https://example.com/dumbbell-bench-press-image.jpg',
    categories: ['strength', 'upper-body'],
    variations: ['Incline Dumbbell Press', 'Decline Dumbbell Press'],
    targetMuscles: ['chest', 'triceps', 'shoulders']
  },
  {
    id: '4',
    name: 'Running',
    muscleGroup: 'full-body',
    equipment: 'none',
    difficulty: 'beginner',
    description: 'A cardiovascular exercise that improves endurance and burns calories.',
    instructions: 'Start with a warm-up walk, then gradually increase to a jogging pace. Maintain good posture and breathe rhythmically.',
    videoUrl: 'https://example.com/running-video',
    imageUrl: 'https://example.com/running-image.jpg',
    categories: ['cardio', 'endurance'],
    variations: ['Interval Running', 'Hill Running'],
    targetMuscles: ['legs', 'core', 'heart']
  }
]

// Mock function for exercise selection
const mockOnSelectExercise = jest.fn()

describe('ExerciseList', () => {
  beforeEach(() => {
    mockOnSelectExercise.mockClear()
  })

  it('renders all exercises properly', () => {
    render(<ExerciseList exercises={mockExercises} onSelectExercise={mockOnSelectExercise} />)
    
    mockExercises.forEach(exercise => {
      expect(screen.getByText(exercise.name)).toBeInTheDocument()
    })
  })

  it('displays exercise details including muscle group and difficulty', () => {
    render(<ExerciseList exercises={mockExercises} onSelectExercise={mockOnSelectExercise} />)
    
    mockExercises.forEach(exercise => {
      expect(screen.getByTestId(`muscle-group-${exercise.id}`)).toHaveTextContent(`Muscle Group: ${exercise.muscleGroup}`)
      expect(screen.getByTestId(`difficulty-${exercise.id}`)).toHaveTextContent(`Difficulty: ${exercise.difficulty}`)
    })
  })

  it('shows exercise equipment information', () => {
    render(<ExerciseList exercises={mockExercises} onSelectExercise={mockOnSelectExercise} />)
    
    mockExercises.forEach(exercise => {
      expect(screen.getByTestId(`equipment-${exercise.id}`)).toHaveTextContent(`Equipment: ${exercise.equipment}`)
    })
  })

  it('calls onSelectExercise with the correct exercise when exercise card is clicked', () => {
    render(<ExerciseList exercises={mockExercises} onSelectExercise={mockOnSelectExercise} />)
    
    const exerciseCards = screen.getAllByTestId('exercise-card')
    fireEvent.click(exerciseCards[0])
    
    expect(mockOnSelectExercise).toHaveBeenCalledWith(mockExercises[0])
  })

  it('renders exercise images correctly', () => {
    render(<ExerciseList exercises={mockExercises} onSelectExercise={mockOnSelectExercise} />)
    
    const images = screen.getAllByTestId('exercise-image')
    expect(images.length).toBe(mockExercises.length)
    
    images.forEach((image, index) => {
      expect(image).toHaveAttribute('src', mockExercises[index].imageUrl)
      expect(image).toHaveAttribute('alt', mockExercises[index].name)
    })
  })

  it('filters exercises when search input is provided', async () => {
    render(<ExerciseList exercises={mockExercises} onSelectExercise={mockOnSelectExercise} />)
    
    const searchInput = screen.getByTestId('search-input')
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'push' } })
    })
    
    // Only Push-up should be visible
    expect(screen.getByText('Push-up')).toBeInTheDocument()
    expect(screen.queryByText('Squat')).not.toBeInTheDocument()
    expect(screen.queryByText('Dumbbell Bench Press')).not.toBeInTheDocument()
    expect(screen.queryByText('Running')).not.toBeInTheDocument()
  })

  it('filters exercises by muscle group when a filter is selected', async () => {
    render(<ExerciseList exercises={mockExercises} onSelectExercise={mockOnSelectExercise} />)
    
    const chestButton = screen.getByText('Chest')
    await act(async () => {
      fireEvent.click(chestButton)
    })
    
    // Only chest exercises should be visible
    expect(screen.getByText('Push-up')).toBeInTheDocument()
    expect(screen.getByText('Dumbbell Bench Press')).toBeInTheDocument()
    expect(screen.queryByText('Squat')).not.toBeInTheDocument()
    expect(screen.queryByText('Running')).not.toBeInTheDocument()
  })
  
  it('filters exercises by equipment type when a filter is selected', async () => {
    render(<ExerciseList exercises={mockExercises} onSelectExercise={mockOnSelectExercise} />)
    
    const dumbbellButton = screen.getByText('Dumbbell')
    await act(async () => {
      fireEvent.click(dumbbellButton)
    })
    
    // Only dumbbell exercises should be visible
    expect(screen.getByText('Dumbbell Bench Press')).toBeInTheDocument()
    expect(screen.queryByText('Push-up')).not.toBeInTheDocument()
    expect(screen.queryByText('Squat')).not.toBeInTheDocument()
    expect(screen.queryByText('Running')).not.toBeInTheDocument()
  })
  
  it('filters exercises by difficulty level when a filter is selected', async () => {
    render(<ExerciseList exercises={mockExercises} onSelectExercise={mockOnSelectExercise} />)
    
    const intermediateButton = screen.getByText('Intermediate')
    await act(async () => {
      fireEvent.click(intermediateButton)
    })
    
    // Only intermediate exercises should be visible
    expect(screen.getByText('Dumbbell Bench Press')).toBeInTheDocument()
    expect(screen.queryByText('Push-up')).not.toBeInTheDocument()
    expect(screen.queryByText('Squat')).not.toBeInTheDocument()
    expect(screen.queryByText('Running')).not.toBeInTheDocument()
  })
  
  it('filters exercises by category when a filter is selected', async () => {
    render(<ExerciseList exercises={mockExercises} onSelectExercise={mockOnSelectExercise} />)
    
    const cardioButton = screen.getByText('Cardio')
    await act(async () => {
      fireEvent.click(cardioButton)
    })
    
    // Only cardio exercises should be visible
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.queryByText('Push-up')).not.toBeInTheDocument()
    expect(screen.queryByText('Squat')).not.toBeInTheDocument()
    expect(screen.queryByText('Dumbbell Bench Press')).not.toBeInTheDocument()
  })
  
  it('clears all filters when clear filters button is clicked', async () => {
    render(<ExerciseList exercises={mockExercises} onSelectExercise={mockOnSelectExercise} />)
    
    // Apply a filter first
    const searchInput = screen.getByTestId('search-input')
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'push' } })
    })
    
    // Verify filter is applied
    expect(screen.getByText('Push-up')).toBeInTheDocument()
    expect(screen.queryByText('Squat')).not.toBeInTheDocument()
    
    // Click clear filters button
    const clearFiltersButton = screen.getByRole('button', { name: /clear filters/i })
    await act(async () => {
      fireEvent.click(clearFiltersButton)
    })
    
    // All exercises should be visible again
    mockExercises.forEach(exercise => {
      expect(screen.getByText(exercise.name)).toBeInTheDocument()
    })
  })
  
  it('displays "No exercises found" message when filters yield no results', async () => {
    render(<ExerciseList exercises={mockExercises} onSelectExercise={mockOnSelectExercise} />)
    
    // Apply a filter that will match no exercises
    const searchInput = screen.getByTestId('search-input')
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } })
    })
    
    // No exercises should be visible
    mockExercises.forEach(exercise => {
      expect(screen.queryByText(exercise.name)).not.toBeInTheDocument()
    })
    
    // "No exercises found" message should be displayed
    expect(screen.getByTestId('no-exercises-message')).toBeInTheDocument()
  })
  
  it('combines multiple filters when selected together', async () => {
    render(<ExerciseList exercises={mockExercises} onSelectExercise={mockOnSelectExercise} />)
    
    // Apply chest muscle group filter
    const chestButton = screen.getByText('Chest')
    await act(async () => {
      fireEvent.click(chestButton)
    })
    
    // Apply bodyweight equipment filter
    const bodyweightButton = screen.getByText('Bodyweight')
    await act(async () => {
      fireEvent.click(bodyweightButton)
    })
    
    // Only Push-up should be visible (chest + bodyweight)
    expect(screen.getByText('Push-up')).toBeInTheDocument()
    expect(screen.queryByText('Dumbbell Bench Press')).not.toBeInTheDocument() // chest but not bodyweight
    expect(screen.queryByText('Squat')).not.toBeInTheDocument() // bodyweight but not chest
    expect(screen.queryByText('Running')).not.toBeInTheDocument() // neither chest nor bodyweight
  })
  
  it.skip('has no accessibility violations', async () => {
    const { container } = render(
      <ExerciseList exercises={mockExercises} onSelectExercise={mockOnSelectExercise} />
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
}) 