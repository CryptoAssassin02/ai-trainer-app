# Component Documentation

## Structure

### Layout Components
- `app/(dashboard)/layout.tsx`: Dashboard layout wrapper with WorkoutProvider
- `app/page.tsx`: Home page with redirect to dashboard
- `app/dashboard/page.tsx`: Main dashboard page

### Progress Components
- `components/progress/body-metrics-chart.tsx`: Chart for body measurements
- `components/progress/strength-progression-chart.tsx`: Chart for strength progress
- `components/progress/dashboard-summary-cards.tsx`: Summary metrics display
- `components/progress/check-in-form.tsx`: Form for logging body metrics

### Workout Components
- `components/workout/workout-consistency-chart.tsx`: Chart for workout consistency
- `components/workout/workout-log-form.tsx`: Form for logging workouts
- `components/workout/workout-plan-form.tsx`: Form for creating workout plans
- `components/workout/workout-data-transfer.tsx`: Data import/export functionality

## Context Providers
- `contexts/workout-context.tsx`: Manages workout state and data
- `lib/profile-context.tsx`: Manages user profile data

## Usage Guidelines

### Data Flow
1. User data is managed through context providers
2. Components access data via hooks (useWorkout, useProfile)
3. Forms handle data submission through context methods
4. Charts automatically update when data changes

### Responsive Design
- Uses Tailwind CSS breakpoints
- Mobile-first approach
- Responsive grids and layouts
- Flexible chart containers

### Dark Mode
- Implemented using next-themes
- Color schemes defined in Tailwind config
- Components use theme-aware classes

## Backend Integration

### Data Models
- Workout Plans
- Workout Progress
- User Check-ins
- Body Metrics
- Exercise Library

### API Integration Points
1. User Authentication
2. Data Fetching
   - Workout plans
   - Progress history
   - Check-in data
3. Data Mutations
   - Log workouts
   - Create plans
   - Record check-ins

### State Management
1. Local state using React hooks
2. Global state using Context API
3. Server state using React Query

## Testing
- Jest setup with custom render utilities
- Mock providers for testing
- Comprehensive test coverage 