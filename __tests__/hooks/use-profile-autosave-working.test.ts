/**
 * Profile Auto-Save Hook Tests - Working Version
 * Focus on actual implementation behavior vs assumptions
 * 
 * VERIFIED FACTS:
 * ✅ Hook tracks form state changes and dirty state
 * ✅ debounceMs controls auto-save timing
 * ✅ enabled flag controls auto-save functionality
 * ✅ Integrates with React Query useProfile mutation
 * ✅ Provides manual save functionality via saveNow()
 * ✅ State management tracks isSaving from useProfile.isUpdating
 */

import { renderHook, act } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useProfileAutoSave } from '@/hooks/use-profile-autosave';

// Mock dependencies
jest.mock('@/hooks/use-profile-queries', () => ({
  useProfile: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

const mockUseProfile = require('@/hooks/use-profile-queries').useProfile;
const mockToast = toast as jest.Mocked<typeof toast>;

// Mock profile data
const mockProfile = {
  id: 'profile-123',
  userId: 'user-123',
  name: 'John Doe',
  age: 30,
  height: 180,
  weight: 75,
  unitPreference: 'metric',
  experienceLevel: 'intermediate',
  updatedAt: '2023-01-01T10:00:00Z',
  createdAt: '2023-01-01T09:00:00Z',
};

// Helper to create a test hook with form
const createTestHook = (options = {}, formOptions = {}) => {
  return renderHook(() => {
    const form = useForm({
      defaultValues: {
        name: 'John Doe',
        age: 30,
        height: 180,
        weight: 75,
      },
      ...formOptions,
    });
    
    const autoSave = useProfileAutoSave(form, options);
    
    return { form, autoSave };
  });
};

describe('useProfileAutoSave - Working Tests', () => {
  let mockUpdateProfile: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
    
    // Default mock setup with working state
    mockUseProfile.mockReturnValue({
      profile: { data: mockProfile },
      updateProfile: mockUpdateProfile,
      isUpdating: false,
      error: null,
      optimisticData: null,
      setOptimisticData: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization and Basic State', () => {
    it('should initialize with correct default state', () => {
      const { result } = createTestHook();

      expect(result.current.autoSave.isDirty).toBe(false);
      expect(result.current.autoSave.isSaving).toBe(false);
      expect(result.current.autoSave.lastSaved).toBeNull();
      expect(result.current.autoSave.saveError).toBeNull();
      expect(result.current.autoSave.hasConflict).toBe(false);
      expect(result.current.autoSave.isEnabled).toBe(true);
    });

    it('should respect enabled option', () => {
      const { result } = createTestHook({ enabled: false });

      expect(result.current.autoSave.isEnabled).toBe(false);
    });

    it('should track form dirty state changes', async () => {
      const { result } = createTestHook();

      // Initially not dirty
      expect(result.current.autoSave.isDirty).toBe(false);

      // Change form value
      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
      });

      // Should become dirty
      expect(result.current.autoSave.isDirty).toBe(true);
    });
  });

  describe('Manual Save Functionality', () => {
    it('should provide saveNow function that calls updateProfile', async () => {
      const { result } = createTestHook();

      // First make form dirty
      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
      });

      // Then manually save
      await act(async () => {
        await result.current.autoSave.saveNow();
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        name: 'Jane Doe',
        age: 30,
        height: 180,
        weight: 75,
      });
    });

    it('should handle saveNow when form is invalid', async () => {
      const { result } = createTestHook({}, {
        mode: 'onChange',
        resolver: (data: any) => {
          const errors: any = {};
          if (!data.name) errors.name = { type: 'required', message: 'Name is required' };
          return { values: data, errors };
        }
      });

      await act(async () => {
        result.current.form.setValue('name', ''); // Invalid
        await result.current.autoSave.saveNow();
      });

      // Should not call updateProfile for invalid form
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });
  });

  describe('Auto-Save Timing', () => {
    it('should auto-save after debounce period when form changes', async () => {
      const { result } = createTestHook({ debounceMs: 1000 });

      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
      });

      // Should not save immediately
      expect(mockUpdateProfile).not.toHaveBeenCalled();

      // Fast forward past debounce period
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Should save after debounce
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        name: 'Jane Doe',
        age: 30,
        height: 180,
        weight: 75,
      });
    });

    it('should not auto-save when disabled', async () => {
      const { result } = createTestHook({ enabled: false, debounceMs: 100 });

      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
      });

      await act(async () => {
        jest.advanceTimersByTime(200);
      });

      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });
  });

  describe('State Management Integration', () => {
    it('should reflect isSaving state from useProfile hook', () => {
      // Mock updating state
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: true, // Hook is saving
        error: null,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      const { result } = createTestHook();

      expect(result.current.autoSave.isSaving).toBe(true);
    });

    it('should track errors from useProfile hook', () => {
      const testError = new Error('Save failed');
      
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: testError,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      const { result } = createTestHook();

      expect(result.current.autoSave.saveError).toBe(testError);
    });
  });

  describe('Control Functions', () => {
    it('should provide pause and resume functions', () => {
      const { result } = createTestHook();

      expect(typeof result.current.autoSave.pauseAutoSave).toBe('function');
      expect(typeof result.current.autoSave.resumeAutoSave).toBe('function');
    });

    it('should provide saveNow function', () => {
      const { result } = createTestHook();

      expect(typeof result.current.autoSave.saveNow).toBe('function');
    });

    it('should provide resolveConflict function', () => {
      const { result } = createTestHook();

      expect(typeof result.current.autoSave.resolveConflict).toBe('function');
    });
  });

  describe('Status Information', () => {
    it('should provide status text for UI display', () => {
      const { result } = createTestHook();

      expect(typeof result.current.autoSave.statusText).toBe('string');
      // Default should be "Up to date" when form is clean and no saves yet
      expect(result.current.autoSave.statusText).toBe('Up to date');
    });

    it('should provide all required state properties', () => {
      const { result } = createTestHook();
      const { autoSave } = result.current;

      // Verify all expected properties exist (based on actual implementation)
      expect(autoSave).toHaveProperty('isDirty');
      expect(autoSave).toHaveProperty('isSaving');
      expect(autoSave).toHaveProperty('lastSaved');
      expect(autoSave).toHaveProperty('saveError');
      expect(autoSave).toHaveProperty('hasConflict');
      expect(autoSave).toHaveProperty('conflictData');
      expect(autoSave).toHaveProperty('isEnabled');
      expect(autoSave).toHaveProperty('canSave');
      expect(autoSave).toHaveProperty('statusText');
      expect(autoSave).toHaveProperty('saveNow');
      expect(autoSave).toHaveProperty('pauseAutoSave');
      expect(autoSave).toHaveProperty('resumeAutoSave');
      expect(autoSave).toHaveProperty('resolveConflict');
    });
  });

  describe('Callback Integration', () => {
    it('should accept onSaveSuccess callback option', () => {
      const onSaveSuccess = jest.fn();
      const { result } = createTestHook({ onSaveSuccess });

      // Callback should be accepted without errors
      expect(result.current.autoSave).toBeDefined();
    });

    it('should accept onSaveError callback option', () => {
      const onSaveError = jest.fn();
      const { result } = createTestHook({ onSaveError });

      expect(result.current.autoSave).toBeDefined();
    });
  });

  describe('Form Validation Integration', () => {
    it('should provide canSave flag that reflects form state', async () => {
      const { result } = createTestHook();

      // Initially not dirty, so canSave should be false
      expect(result.current.autoSave.canSave).toBe(false);

      // Set valid value to make form dirty
      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
      });

      // canSave should be true for valid, dirty form
      expect(result.current.autoSave.canSave).toBe(true);
    });

    it('should provide saveNow function for manual saving', async () => {
      const { result } = createTestHook();

      // First make form dirty
      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
      });

      // Then manually save
      await act(async () => {
        await result.current.autoSave.saveNow();
      });

      // saveNow should attempt to save
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        name: 'Jane Doe',
        age: 30,
        height: 180,
        weight: 75,
      });
    });
  });
});
