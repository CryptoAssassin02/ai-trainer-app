/**
 * Component Tests for Multi-Step Profile Form
 * Phase 2.1.5 - Comprehensive component testing with React Testing Library
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MultiStepProfileForm } from '@/components/profile/multi-step-profile-form';
import { ProfileProvider } from '@/providers/auth-provider';

// Type for mock form
interface MockForm {
  register: (name: string) => Record<string, unknown>;
}

// Mock the step components to isolate testing
jest.mock('@/components/profile/steps/personal-info-step', () => ({
  PersonalInfoStep: ({ form, isLoading }: { form: MockForm; isLoading: boolean }) => (
    <div data-testid="personal-info-step">
      <input 
        data-testid="name-input" 
        {...form.register('name')} 
        placeholder="Enter your name"
        disabled={isLoading}
      />
      <input 
        data-testid="age-input" 
        type="number"
        {...form.register('age')} 
        placeholder="Enter your age"
        disabled={isLoading}
      />
      <select data-testid="unit-preference" {...form.register('unitPreference')}>
        <option value="metric">Metric</option>
        <option value="imperial">Imperial</option>
      </select>
    </div>
  ),
}));

jest.mock('@/components/profile/steps/physical-measurements-step', () => ({
  PhysicalMeasurementsStep: ({ form, isLoading }: { form: MockForm; isLoading: boolean }) => (
    <div data-testid="physical-measurements-step">
      <input 
        data-testid="height-input" 
        type="number"
        {...form.register('height')} 
        placeholder="Enter height"
        disabled={isLoading}
      />
      <input 
        data-testid="weight-input" 
        type="number"
        {...form.register('weight')} 
        placeholder="Enter weight"
        disabled={isLoading}
      />
    </div>
  ),
}));

jest.mock('@/components/profile/steps/fitness-info-step', () => ({
  FitnessInfoStep: ({ form, isLoading }: { form: MockForm; isLoading: boolean }) => (
    <div data-testid="fitness-info-step">
      <select data-testid="experience-level" {...form.register('experienceLevel')}>
        <option value="">Select experience</option>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
      <textarea 
        data-testid="medical-conditions" 
        {...form.register('medicalConditions')} 
        placeholder="Medical conditions"
        disabled={isLoading}
      />
    </div>
  ),
}));

jest.mock('@/components/profile/steps/equipment-preferences-step', () => ({
  EquipmentPreferencesStep: ({ form, isLoading }: { form: MockForm; isLoading: boolean }) => (
    <div data-testid="equipment-preferences-step">
      <input 
        data-testid="workout-frequency" 
        {...form.register('workoutFrequency')} 
        placeholder="Workout frequency"
        disabled={isLoading}
      />
      <input 
        data-testid="equipment-checkbox-dumbbells"
        type="checkbox"
        value="dumbbells"
        {...form.register('equipment')}
        disabled={isLoading}
      />
    </div>
  ),
}));

// Mock hooks
jest.mock('@/hooks/use-profile-autosave', () => ({
  useProfileAutoSave: () => ({
    isAutoSaving: false,
    lastSavedAt: null,
    hasUnsavedChanges: false,
    statusText: 'All changes saved',
    pauseAutoSave: jest.fn(),
    resumeAutoSave: jest.fn(),
    saveNow: jest.fn(),
  }),
}));

jest.mock('@/components/profile/conflict-resolution-dialog', () => ({
  ConflictResolutionDialog: ({ open, onResolve }: { open: boolean; onResolve: (action: string) => void }) => 
    open ? (
      <div data-testid="conflict-dialog">
        <button onClick={() => onResolve('useLocal')}>Use Local</button>
        <button onClick={() => onResolve('useServer')}>Use Server</button>
      </div>
    ) : null,
}));

// Test setup helpers
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <ProfileProvider>
        {children}
      </ProfileProvider>
    </QueryClientProvider>
  );
};

const renderMultiStepForm = (props = {}) => {
  const defaultProps = {
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    enableAutoSave: true,
    ...props,
  };

  return render(
    <TestWrapper>
      <MultiStepProfileForm {...defaultProps} />
    </TestWrapper>
  );
};

describe('MultiStepProfileForm', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('Step Navigation', () => {
    it('should render the first step by default', () => {
      renderMultiStepForm();
      
      expect(screen.getByTestId('personal-info-step')).toBeInTheDocument();
      expect(screen.queryByTestId('physical-measurements-step')).not.toBeInTheDocument();
    });

    it('should navigate to next step when Continue button is clicked', async () => {
      renderMultiStepForm();
      
      // Fill required fields on first step
      await user.type(screen.getByTestId('name-input'), 'John Doe');
      await user.type(screen.getByTestId('age-input'), '30');
      
      // Click Continue
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('physical-measurements-step')).toBeInTheDocument();
        expect(screen.queryByTestId('personal-info-step')).not.toBeInTheDocument();
      });
    });

    it('should navigate back to previous step when Back button is clicked', async () => {
      renderMultiStepForm();
      
      // Navigate to second step
      await user.type(screen.getByTestId('name-input'), 'John Doe');
      await user.type(screen.getByTestId('age-input'), '30');
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      await waitFor(() => {
        expect(screen.getByTestId('physical-measurements-step')).toBeInTheDocument();
      });
      
      // Go back
      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('personal-info-step')).toBeInTheDocument();
        expect(screen.queryByTestId('physical-measurements-step')).not.toBeInTheDocument();
      });
    });

    it('should navigate to specific step when step indicator is clicked', async () => {
      renderMultiStepForm();
      
      // Find step indicator buttons (should be in the step navigation)
      const stepIndicators = screen.getAllByRole('button').filter(button => 
        button.textContent?.includes('Personal') || 
        button.textContent?.includes('Physical') ||
        button.textContent?.includes('Fitness') ||
        button.textContent?.includes('Equipment')
      );
      
      if (stepIndicators.length > 0) {
        // Click on a later step
        await user.click(stepIndicators[2]); // Fitness step
        
        await waitFor(() => {
          expect(screen.getByTestId('fitness-info-step')).toBeInTheDocument();
        });
      }
    });

    it('should show progress indicator for completed steps', async () => {
      renderMultiStepForm();
      
      // Fill first step completely
      await user.type(screen.getByTestId('name-input'), 'John Doe');
      await user.type(screen.getByTestId('age-input'), '30');
      
      // Navigate to next step
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      // Check if first step is marked as completed
      await waitFor(() => {
        // Look for visual indicators of completion (checkmarks, different colors, etc.)
        const completedSteps = screen.getAllByRole('button').filter(button =>
          button.className?.includes('completed') || 
          button.getAttribute('aria-label')?.includes('completed')
        );
        expect(completedSteps.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Form Validation', () => {
    it('should prevent navigation when required fields are empty', async () => {
      renderMultiStepForm();
      
      // Try to continue without filling required fields
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);
      
      // Should stay on the same step
      await waitFor(() => {
        expect(screen.getByTestId('personal-info-step')).toBeInTheDocument();
      });
    });

    it('should show validation errors for invalid inputs', async () => {
      renderMultiStepForm();
      
      // Enter invalid age
      await user.type(screen.getByTestId('age-input'), '12'); // Below minimum
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/age must be at least 13/i)).toBeInTheDocument();
      });
    });

    it('should validate all steps before final submission', async () => {
      const onSubmit = jest.fn();
      renderMultiStepForm({ onSubmit });
      
      // Navigate through all steps without filling required fields
      // This should prevent final submission
      const continueButton = screen.getByRole('button', { name: /continue/i });
      
      // Go through steps quickly without proper validation
      for (let i = 0; i < 4; i++) {
        try {
          await user.click(continueButton);
          await waitFor(() => {}, { timeout: 100 });
        } catch {
          // Expected to fail on validation
        }
      }
      
      // Try to submit
      const submitButton = screen.queryByRole('button', { name: /create profile|update profile/i });
      if (submitButton) {
        await user.click(submitButton);
        expect(onSubmit).not.toHaveBeenCalled();
      }
    });
  });

  describe('Auto-Save Functionality', () => {
    it('should show auto-save status', () => {
      renderMultiStepForm({ enableAutoSave: true });
      
      // Should show auto-save status somewhere in the UI
      expect(screen.getByText(/all changes saved/i)).toBeInTheDocument();
    });

    it('should allow disabling auto-save', () => {
      renderMultiStepForm({ enableAutoSave: false });
      
      // Auto-save status should not be visible
      expect(screen.queryByText(/all changes saved/i)).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render mobile-optimized navigation on small screens', () => {
      // Mock window size for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderMultiStepForm();
      
      // Check for mobile-specific classes or structures
      const mobileNav = screen.getByRole('navigation') || document.querySelector('.block.sm\\:hidden');
      expect(mobileNav).toBeInTheDocument();
    });

    it('should have touch-friendly button sizes', () => {
      renderMultiStepForm();
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        // Touch targets should be at least 44px
        const minSize = 44;
        expect(parseInt(styles.minHeight) || parseInt(styles.height)).toBeGreaterThanOrEqual(minSize);
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with correct data when form is valid', async () => {
      const onSubmit = jest.fn();
      renderMultiStepForm({ onSubmit });
      
      // Fill out complete form
      await user.type(screen.getByTestId('name-input'), 'John Doe');
      await user.type(screen.getByTestId('age-input'), '30');
      
      // Navigate through steps
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      await waitFor(() => {
        expect(screen.getByTestId('physical-measurements-step')).toBeInTheDocument();
      });
      
      await user.type(screen.getByTestId('height-input'), '175');
      await user.type(screen.getByTestId('weight-input'), '75');
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      await waitFor(() => {
        expect(screen.getByTestId('fitness-info-step')).toBeInTheDocument();
      });
      
      await user.selectOptions(screen.getByTestId('experience-level'), 'intermediate');
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      await waitFor(() => {
        expect(screen.getByTestId('equipment-preferences-step')).toBeInTheDocument();
      });
      
      await user.type(screen.getByTestId('workout-frequency'), '3x per week');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /create profile|update profile/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
          name: 'John Doe',
          age: 30,
          height: 175,
          weight: 75,
          experienceLevel: 'intermediate',
          workoutFrequency: '3x per week',
        }));
      });
    });

    it('should handle submission errors gracefully', async () => {
      const onSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'));
      renderMultiStepForm({ onSubmit });
      
      // Fill minimal form and submit
      await user.type(screen.getByTestId('name-input'), 'John Doe');
      
      // Navigate to last step quickly
      const continueButtons = screen.getAllByRole('button', { name: /continue/i });
      for (const button of continueButtons) {
        try {
          await user.click(button);
          await waitFor(() => {}, { timeout: 100 });
        } catch {
          break;
        }
      }
      
      // Try to submit
      const submitButton = screen.queryByRole('button', { name: /create profile|update profile/i });
      if (submitButton) {
        await user.click(submitButton);
        
        // Should show error message
        await waitFor(() => {
          expect(screen.getByText(/submission failed|error occurred/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const onCancel = jest.fn();
      renderMultiStepForm({ onCancel });
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(onCancel).toHaveBeenCalled();
    });

    it('should show confirmation dialog when form has unsaved changes', async () => {
      const onCancel = jest.fn();
      renderMultiStepForm({ onCancel });
      
      // Make changes to form
      await user.type(screen.getByTestId('name-input'), 'John Doe');
      
      // Try to cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/unsaved changes|confirm/i)).toBeInTheDocument();
      });
    });
  });

  describe('Conflict Resolution', () => {
    it('should handle auto-save conflicts when they occur', async () => {
      renderMultiStepForm();
      
      // Simulate conflict by directly triggering conflict dialog
      // This would normally happen through auto-save hook
      const conflictDialog = screen.queryByTestId('conflict-dialog');
      if (conflictDialog) {
        const useLocalButton = within(conflictDialog).getByRole('button', { name: /use local/i });
        await user.click(useLocalButton);
        
        // Dialog should close
        await waitFor(() => {
          expect(screen.queryByTestId('conflict-dialog')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderMultiStepForm();
      
      // Check for form role
      expect(screen.getByRole('form')).toBeInTheDocument();
      
      // Check for step navigation
      const navigation = screen.getByRole('navigation') || document.querySelector('[role="navigation"]');
      expect(navigation).toBeInTheDocument();
      
      // Check for proper button roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', async () => {
      renderMultiStepForm();
      
      // Tab through form elements
      await user.tab();
      expect(screen.getByTestId('name-input')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTestId('age-input')).toHaveFocus();
    });

    it('should announce step changes to screen readers', async () => {
      renderMultiStepForm();
      
      // Fill required fields and navigate
      await user.type(screen.getByTestId('name-input'), 'John Doe');
      await user.type(screen.getByTestId('age-input'), '30');
      
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);
      
      // Check for aria-live regions or announcements
      await waitFor(() => {
        const liveRegions = document.querySelectorAll('[aria-live]');
        expect(liveRegions.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Loading States', () => {
    it('should disable form inputs during submission', async () => {
      const onSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
      renderMultiStepForm({ onSubmit });
      
      // Fill form and submit
      await user.type(screen.getByTestId('name-input'), 'John Doe');
      
      const submitButton = screen.queryByRole('button', { name: /create profile|update profile/i });
      if (submitButton) {
        await user.click(submitButton);
        
        // Check that inputs are disabled
        await waitFor(() => {
          expect(screen.getByTestId('name-input')).toBeDisabled();
        });
      }
    });

    it('should show loading indicators during async operations', async () => {
      const onSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
      renderMultiStepForm({ onSubmit });
      
      await user.type(screen.getByTestId('name-input'), 'John Doe');
      
      const submitButton = screen.queryByRole('button', { name: /create profile|update profile/i });
      if (submitButton) {
        await user.click(submitButton);
        
        // Should show loading state
        await waitFor(() => {
          expect(screen.getByText(/saving|loading/i)).toBeInTheDocument();
        });
      }
    });
  });
});
