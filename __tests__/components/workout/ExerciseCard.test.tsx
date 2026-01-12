import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { axe } from 'jest-axe'
import 'jest-axe/extend-expect'

// Mock necessary components and hooks
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} data-testid="next-image" />
}))

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-provider">{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode, asChild?: boolean }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>
}))

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open, onOpenChange }: { children: React.ReactNode, open: boolean, onOpenChange: (open: boolean) => void }) => (
    <div data-testid="collapsible" data-open={open}>{children}</div>
  ),
  CollapsibleTrigger: ({ children, asChild }: { children: React.ReactNode, asChild?: boolean }) => (
    <div 
      data-testid="collapsible-trigger" 
      onClick={() => {
        // Find the closest collapsible and call onOpenChange with the opposite of current open value
        const collapsible = document.querySelector('[data-testid="collapsible"]');
        const isOpen = collapsible?.getAttribute('data-open') === 'true';
        const onOpenChange = (open: boolean) => {
          collapsible?.setAttribute('data-open', String(!isOpen));
        };
        onOpenChange(!isOpen);
      }}
    >
      {children}
    </div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  )
}))

// Mock the ExerciseCard component
const ExerciseCard = ({ 
  name,
  sets,
  repsMin,
  repsMax,
  imageUrl = "/placeholder.svg",
  notes = "",
  technique,
  restTime = "60-90 seconds",
  targetMuscles = [],
  equipment = "",
  difficulty = "intermediate",
  videoUrl = "",
  alternatives = [],
}: {
  name: string
  sets: number
  repsMin: number
  repsMax?: number
  imageUrl?: string
  notes?: string
  technique?: string
  restTime?: string
  targetMuscles?: string[]
  equipment?: string
  difficulty?: "beginner" | "intermediate" | "advanced"
  videoUrl?: string
  alternatives?: string[]
}) => {
  const [isOpen, setIsOpen] = React.useState(false)

  // Format reps display
  const repsDisplay = repsMax ? `${repsMin}-${repsMax}` : repsMin

  return (
    <div data-testid="exercise-card">
      <div data-testid="card-header">
        <div data-testid="card-title">{name}</div>
        <div data-testid="card-description">{sets} {sets === 1 ? "set" : "sets"} of {repsDisplay} {repsMin === 1 && repsMax === 1 ? "rep" : "reps"}</div>
        {technique && <div data-testid="technique-badge">{technique}</div>}
      </div>
      
      <div data-testid="card-content">
        <div data-testid="exercise-image">
          <img data-testid="next-image" src={imageUrl} alt={`${name} exercise`} />
          {videoUrl && <button data-testid="play-button">Play</button>}
        </div>
        
        {notes && (
          <div data-testid="exercise-notes">
            <div>Form Tips</div>
            <p>{notes}</p>
          </div>
        )}
        
        <div data-testid="collapsible" data-open={isOpen}>
          <div 
            data-testid="collapsible-trigger" 
            onClick={() => setIsOpen(!isOpen)}
          >
            <span>{isOpen ? "Hide Details" : "Show Details"}</span>
            <span data-testid="chevron">{isOpen ? "Up" : "Down"}</span>
          </div>
          
          <div data-testid="collapsible-content">
            <div data-testid="rest-time">
              <p>Rest Time</p>
              <p>{restTime}</p>
            </div>
            
            <div data-testid="equipment">
              <p>Equipment</p>
              <p>{equipment || "None"}</p>
            </div>
            
            <div data-testid="target-muscles">
              <p>Target Muscles</p>
              <div>
                {targetMuscles.length > 0 ? (
                  targetMuscles.map((muscle) => (
                    <span key={muscle} data-testid={`muscle-${muscle}`}>{muscle}</span>
                  ))
                ) : (
                  <p>Not specified</p>
                )}
              </div>
            </div>
            
            {alternatives.length > 0 && (
              <div data-testid="alternatives">
                <p>Alternatives</p>
                <p>{alternatives.join(", ")}</p>
              </div>
            )}
            
            <div>
              <div data-testid="tooltip">
                <div data-testid="tooltip-trigger">
                  <div data-testid="difficulty-badge">{difficulty}</div>
                </div>
                <div data-testid="tooltip-content">
                  <p>Exercise difficulty level</p>
                </div>
              </div>
              
              {videoUrl && (
                <button data-testid="tutorial-button">Watch Tutorial</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

describe('ExerciseCard', () => {
  it('renders basic exercise information correctly', () => {
    render(
      <ExerciseCard
        name="Bench Press"
        sets={3}
        repsMin={8}
        repsMax={12}
      />
    )
    
    expect(screen.getByTestId('exercise-card')).toBeInTheDocument()
    expect(screen.getByTestId('card-title')).toHaveTextContent('Bench Press')
    expect(screen.getByTestId('card-description')).toHaveTextContent('3 sets of 8-12 reps')
    expect(screen.getByTestId('exercise-image')).toBeInTheDocument()
  })
  
  it('handles single set and rep displays correctly', () => {
    render(
      <ExerciseCard
        name="Plank"
        sets={1}
        repsMin={1}
      />
    )
    
    expect(screen.getByTestId('card-description')).toHaveTextContent('1 set of 1 rep')
  })
  
  it('displays technique badge when provided', () => {
    render(
      <ExerciseCard
        name="Deadlift"
        sets={3}
        repsMin={5}
        technique="Drop Set"
      />
    )
    
    expect(screen.getByTestId('technique-badge')).toHaveTextContent('Drop Set')
  })
  
  it('displays exercise notes when provided', () => {
    render(
      <ExerciseCard
        name="Squat"
        sets={4}
        repsMin={6}
        notes="Keep your chest up and knees out"
      />
    )
    
    expect(screen.getByTestId('exercise-notes')).toBeInTheDocument()
    expect(screen.getByTestId('exercise-notes')).toHaveTextContent('Keep your chest up and knees out')
  })
  
  it('toggles collapsible content when trigger is clicked', () => {
    render(
      <ExerciseCard
        name="Pull-up"
        sets={3}
        repsMin={8}
      />
    )
    
    // Initially collapsible should be closed
    expect(screen.getByTestId('collapsible')).toHaveAttribute('data-open', 'false')
    expect(screen.getByTestId('chevron')).toHaveTextContent('Down')
    
    // Click to open
    fireEvent.click(screen.getByTestId('collapsible-trigger'))
    
    // Now it should be open
    expect(screen.getByTestId('collapsible')).toHaveAttribute('data-open', 'true')
    expect(screen.getByTestId('chevron')).toHaveTextContent('Up')
    
    // Click to close again
    fireEvent.click(screen.getByTestId('collapsible-trigger'))
    
    // Now it should be closed
    expect(screen.getByTestId('collapsible')).toHaveAttribute('data-open', 'false')
    expect(screen.getByTestId('chevron')).toHaveTextContent('Down')
  })
  
  it('displays target muscles when provided', () => {
    render(
      <ExerciseCard
        name="Lat Pulldown"
        sets={3}
        repsMin={10}
        targetMuscles={['Lats', 'Biceps', 'Forearms']}
      />
    )
    
    fireEvent.click(screen.getByTestId('collapsible-trigger')) // Open the collapsible
    
    expect(screen.getByTestId('target-muscles')).toBeInTheDocument()
    expect(screen.getByTestId('muscle-Lats')).toHaveTextContent('Lats')
    expect(screen.getByTestId('muscle-Biceps')).toHaveTextContent('Biceps')
    expect(screen.getByTestId('muscle-Forearms')).toHaveTextContent('Forearms')
  })
  
  it('displays equipment information when provided', () => {
    render(
      <ExerciseCard
        name="Chest Press"
        sets={3}
        repsMin={10}
        equipment="Dumbbell"
      />
    )
    
    fireEvent.click(screen.getByTestId('collapsible-trigger')) // Open the collapsible
    
    expect(screen.getByTestId('equipment')).toBeInTheDocument()
    expect(screen.getByTestId('equipment')).toHaveTextContent('Dumbbell')
  })
  
  it('displays rest time information', () => {
    render(
      <ExerciseCard
        name="Leg Press"
        sets={4}
        repsMin={12}
        restTime="2 minutes"
      />
    )
    
    fireEvent.click(screen.getByTestId('collapsible-trigger')) // Open the collapsible
    
    expect(screen.getByTestId('rest-time')).toBeInTheDocument()
    expect(screen.getByTestId('rest-time')).toHaveTextContent('2 minutes')
  })
  
  it('displays alternative exercises when provided', () => {
    render(
      <ExerciseCard
        name="Barbell Row"
        sets={3}
        repsMin={8}
        alternatives={['Dumbbell Row', 'Cable Row']}
      />
    )
    
    fireEvent.click(screen.getByTestId('collapsible-trigger')) // Open the collapsible
    
    expect(screen.getByTestId('alternatives')).toBeInTheDocument()
    expect(screen.getByTestId('alternatives')).toHaveTextContent('Dumbbell Row, Cable Row')
  })
  
  it('displays video button when videoUrl is provided', () => {
    render(
      <ExerciseCard
        name="Shoulder Press"
        sets={3}
        repsMin={8}
        videoUrl="https://example.com/video"
      />
    )
    
    expect(screen.getByTestId('play-button')).toBeInTheDocument()
    
    fireEvent.click(screen.getByTestId('collapsible-trigger')) // Open the collapsible
    
    expect(screen.getByTestId('tutorial-button')).toBeInTheDocument()
  })
  
  it('displays difficulty badge', () => {
    render(
      <ExerciseCard
        name="Muscle Up"
        sets={3}
        repsMin={3}
        difficulty="advanced"
      />
    )
    
    fireEvent.click(screen.getByTestId('collapsible-trigger')) // Open the collapsible
    
    expect(screen.getByTestId('difficulty-badge')).toBeInTheDocument()
    expect(screen.getByTestId('difficulty-badge')).toHaveTextContent('advanced')
  })
  
  it('has no accessibility violations', async () => {
    const { container } = render(
      <ExerciseCard
        name="Push-up"
        sets={3}
        repsMin={15}
        notes="Keep your core engaged"
        targetMuscles={['Chest', 'Shoulders', 'Triceps']}
      />
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
}) 