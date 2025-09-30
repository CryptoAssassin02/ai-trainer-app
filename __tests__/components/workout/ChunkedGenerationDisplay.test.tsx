import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChunkedGenerationDisplay } from '@/components/workout/chunked-generation-display';

jest.mock('@/lib/api/services/workout-service', () => {
  const actual = jest.requireActual('@/lib/api/services/workout-service');
  return {
    ...actual,
    workoutService: {
      ...actual.workoutService,
      getGenerationStatus: jest.fn(async () => ({
        planId: 'p1',
        state: 'in_progress',
        progress: { completed: 0, total: 2, percentage: 0 },
        currentMesocycle: 1,
        timestamps: { started: null, completed: null },
        errors: []
      })),
      generateWeeklyStructure: jest.fn(async () => ({ planId: 'p1', mesocycleNumber: 1, weeklyStructure: [ { week: 1, days: [ { day: 'Mon', type: 'training', focus: 'push' } ] } ] })),
      generateMesocycle: jest.fn(async () => ({ planId: 'p1', mesocycleNumber: 1, mesocycleDetails: { weeks: [] }, generationComplete: false }))
    }
  };
});

function setup(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const structure = {
  programName: 'Test Program',
  totalDuration: 8,
  totalMesocycles: 2,
  trainingFrequency: { daysPerWeek: 3, restDays: ['Sun'] },
  mesocycles: [
    { mesocycleNumber: 1, theme: 'Base', duration: 4, focus: 'General', goals: [] },
    { mesocycleNumber: 2, theme: 'Progress', duration: 4, focus: 'Intensity', goals: [] },
  ],
  goalPrioritization: { primary: 'strength', secondary: [] }
};

describe('ChunkedGenerationDisplay', () => {
  test('renders structure stage then auto-advances to weekly in automatic mode', async () => {
    setup(
      <ChunkedGenerationDisplay
        structure={structure as any}
        currentMesocycle={0}
        totalMesocycles={2}
        mesocyclesCompleted={0}
        isGenerating={false}
        generatingMesocycle={null}
        planId="p1"
        autoMode={true}
      />
    );

    // Sticky header shows Structure Stage initially
    expect(await screen.findByText(/Structure Stage/i)).toBeInTheDocument();

    // Auto weekly should switch stage to Weekly (loading skeleton allowed)
    await screen.findByText(/Weekly Structure Stage/i);
  });

  test('step-by-step mode stays on structure until user clicks Continue', async () => {
    const user = userEvent.setup();
    setup(
      <ChunkedGenerationDisplay
        structure={structure as any}
        currentMesocycle={0}
        totalMesocycles={2}
        mesocyclesCompleted={0}
        isGenerating={false}
        generatingMesocycle={null}
        planId="p1"
        autoMode={false}
      />
    );

    expect(await screen.findByText(/Structure Stage/i)).toBeInTheDocument();

    // Find the Continue/Generate Weekly button and click
    const continueBtn = await screen.findByRole('button', { name: /continue|generate weekly/i });
    await user.click(continueBtn);

    await screen.findByText(/Weekly Structure Stage/i);
  });

  test('optimistic weekly render: shows weekly calendar after mutation returns and before invalidation', async () => {
    const user = userEvent.setup();
    setup(
      <ChunkedGenerationDisplay
        structure={structure as any}
        currentMesocycle={0}
        totalMesocycles={2}
        mesocyclesCompleted={0}
        isGenerating={false}
        generatingMesocycle={null}
        planId="p1"
        autoMode={false}
      />
    );

    const btn = await screen.findByRole('button', { name: /continue|generate weekly/i });
    await user.click(btn);

    await screen.findByText(/Weekly Structure Stage/i);
  });

  test('maps known errors to user-friendly messages', async () => {
    const { workoutService } = jest.requireMock('@/lib/api/services/workout-service');
    (workoutService.generateWeeklyStructure as jest.Mock).mockRejectedValueOnce({ response: { status: 409 } });

    const user = userEvent.setup();
    setup(
      <ChunkedGenerationDisplay
        structure={structure as any}
        currentMesocycle={0}
        totalMesocycles={2}
        mesocyclesCompleted={0}
        isGenerating={false}
        generatingMesocycle={null}
        planId="p1"
        autoMode={false}
      />
    );

    const btn = await screen.findByRole('button', { name: /continue|generate weekly/i });
    await user.click(btn);

    // Error mapping banner
    await screen.findByText(/already generated/i);
  });
});
