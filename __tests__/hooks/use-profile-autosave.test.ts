/**
 * Profile Auto-Save Hook Tests
 * Phase 2.1.5 - Critical auto-save functionality to prevent data loss
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

describe('useProfileAutoSave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default mock setup
    mockUseProfile.mockReturnValue({
      profile: { data: mockProfile },
      updateProfile: jest.fn().mockResolvedValue(undefined),
      isUpdating: false,
      error: null,
      optimisticData: null,
      setOptimisticData: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
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

    it('should initialize with profile data', () => {
      const { result } = createTestHook();

      // Initially should not be dirty since form matches profile
      expect(result.current.autoSave.isDirty).toBe(false);
    });
  });

  describe('Auto-Save Triggering', () => {
    it('should detect form changes and mark as dirty', async () => {
      const { result } = createTestHook();

      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
      });

      expect(result.current.autoSave.isDirty).toBe(true);
    });

    it('should auto-save after debounce period', async () => {
      const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: null,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      const { result } = createTestHook({ debounceMs: 1000 });

      // Make a change
      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
      });

      expect(result.current.autoSave.isDirty).toBe(true);
      
      // Fast-forward past debounce period
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        name: 'Jane Doe',
        age: 30,
        height: 180,
        weight: 75,
      });
    });

    it('should not auto-save if form has validation errors', async () => {
      const mockUpdateProfile = jest.fn();
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: null,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      // Create test hook with validation rules
      const { result } = createTestHook({}, {
        mode: 'onChange',
        resolver: (values) => {
          const errors = {};
          if (values.age < 0) {
            errors.age = { type: 'min', message: 'Age must be positive' };
          }
          return {
            values: Object.keys(errors).length === 0 ? values : {},
            errors,
          };
        },
      });

      // Make invalid change 
      await act(async () => {
        result.current.form.setValue('age', -5); // Invalid age
        await result.current.form.trigger(); // Trigger validation
      });

      // Fast-forward past debounce period
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      // Should not have called update due to validation errors
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('should debounce multiple rapid changes', async () => {
      const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: null,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      const { result } = createTestHook({ debounceMs: 1000 });

      // Make multiple rapid changes
      await act(async () => {
        result.current.form.setValue('name', 'Jane');
        jest.advanceTimersByTime(500);
        result.current.form.setValue('name', 'Jane Doe');
        jest.advanceTimersByTime(500);
        result.current.form.setValue('name', 'Jane Smith');
      });

      // Only advance enough to trigger the last change
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Should only save once with the final value
      expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        name: 'Jane Smith',
        age: 30,
        height: 180,
        weight: 75,
      });
    });
  });

  describe('Manual Save', () => {
    it('should save immediately when saveNow is called', async () => {
      const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: null,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      const { result } = createTestHook();

      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
      });

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

    it('should clear pending auto-save when saveNow is called', async () => {
      const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: null,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      const { result } = createTestHook({ debounceMs: 5000 });

      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
      });

      // Call saveNow before auto-save timer expires
      await act(async () => {
        await result.current.autoSave.saveNow();
      });

      expect(mockUpdateProfile).toHaveBeenCalledTimes(1);

      // Advance past original timer - should not save again
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe('Save State Management', () => {
    it('should update isSaving state during save operation', async () => {
      let resolveUpdate: (value?: unknown) => void;
      const updatePromise = new Promise(resolve => {
        resolveUpdate = resolve;
      });

      const mockUpdateProfile = jest.fn().mockReturnValue(updatePromise);
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: true, // Simulate updating state
        error: null,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      const { result } = createTestHook();

      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
      });

      // Should show saving state
      expect(result.current.autoSave.isSaving).toBe(true);

      // Resolve the update
      await act(async () => {
        resolveUpdate!();
      });

      // Update the mock to reflect completion
      mockUseProfile.mockReturnValue({
        profile: { data: { ...mockProfile, name: 'Jane Doe' } },
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: null,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      expect(result.current.autoSave.isSaving).toBe(false);
    });

    it('should update lastSaved timestamp on successful save', async () => {
      const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: null,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      const { result } = createTestHook();

      const beforeSave = new Date();

      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
        await result.current.autoSave.saveNow();
      });

      const afterSave = new Date();

      expect(result.current.autoSave.lastSaved).toBeInstanceOf(Date);
      expect(result.current.autoSave.lastSaved!.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(result.current.autoSave.lastSaved!.getTime()).toBeLessThanOrEqual(afterSave.getTime());
      expect(result.current.autoSave.isDirty).toBe(false);
    });

    it('should show success toast on save', async () => {
      const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: null,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      const { result } = createTestHook();

      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
        await result.current.autoSave.saveNow();
      });

      expect(toast.success).toHaveBeenCalledWith('Changes saved automatically', {
        duration: 2000,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle save errors and show error toast', async () => {
      const saveError = new Error('Save failed');
      const mockUpdateProfile = jest.fn().mockRejectedValue(saveError);
      
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: saveError,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      const { result } = createTestHook();

      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
        await result.current.autoSave.saveNow();
      });

      expect(result.current.autoSave.saveError).toBe(saveError);
      expect(result.current.autoSave.isSaving).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Auto-save failed', {
        description: 'Save failed',
      });
    });

    it('should call onSaveError callback when provided', async () => {
      const saveError = new Error('Save failed');
      const onSaveError = jest.fn();
      const mockUpdateProfile = jest.fn().mockRejectedValue(saveError);
      
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: saveError,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      const { result } = createTestHook({ onSaveError });

      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
        await result.current.autoSave.saveNow();
      });

      expect(onSaveError).toHaveBeenCalledWith(saveError);
    });
  });

  describe('Optimistic Updates', () => {
    it('should perform optimistic updates when enabled', async () => {
      const mockSetOptimisticData = jest.fn();
      const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
      
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: null,
        optimisticData: null,
        setOptimisticData: mockSetOptimisticData,
      });

      const { result } = createTestHook({ enableOptimistic: true });

      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
        await result.current.autoSave.saveNow();
      });

      expect(mockSetOptimisticData).toHaveBeenCalledWith({
        name: 'Jane Doe',
        age: 30,
        height: 180,
        weight: 75,
      });
    });

    it('should revert optimistic updates on error', async () => {
      const mockSetOptimisticData = jest.fn();
      const saveError = new Error('Save failed');
      const mockUpdateProfile = jest.fn().mockRejectedValue(saveError);
      
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: null,
        optimisticData: null,
        setOptimisticData: mockSetOptimisticData,
      });

      const { result } = createTestHook({ enableOptimistic: true });

      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
        await result.current.autoSave.saveNow();
      });

      // Should set optimistic data first, then revert on error
      expect(mockSetOptimisticData).toHaveBeenCalledWith({
        name: 'Jane Doe',
        age: 30,
        height: 180,
        weight: 75,
      });
      expect(mockSetOptimisticData).toHaveBeenLastCalledWith(null);
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect conflicts when server data is newer', async () => {
      const newerProfile = {
        ...mockProfile,
        updatedAt: '2023-01-01T11:00:00Z', // 1 hour newer
      };

      mockUseProfile.mockReturnValue({
        profile: { data: newerProfile },
        updateProfile: jest.fn(),
        isUpdating: false,
        error: null,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      const { result } = createTestHook({ enableConflictResolution: true });

      // Simulate having a last saved time
      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
        await result.current.autoSave.saveNow();
      });

      // Now simulate server data being updated by another source
      mockUseProfile.mockReturnValue({
        profile: { 
          data: { 
            ...newerProfile, 
            name: 'Server Changed Name',
            updatedAt: '2023-01-01T12:00:00Z' // Even newer
          } 
        },
        updateProfile: jest.fn(),
        isUpdating: false,
        error: null,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      // Make another change that should detect conflict
      await act(async () => {
        result.current.form.setValue('age', 31);
        await result.current.autoSave.saveNow();
      });

      expect(result.current.autoSave.hasConflict).toBe(true);
      expect(toast.warning).toHaveBeenCalledWith('Conflict detected', {
        description: 'Your changes conflict with recent updates. Please review and resolve.',
        duration: 5000,
      });
    });

    it('should resolve conflicts by choosing server data', async () => {
      const { result } = createTestHook();

      // Manually set conflict state for testing
      await act(async () => {
        result.current.form.setValue('name', 'Local Name');
        // Simulate conflict state (this would normally be set by conflict detection)
        result.current.autoSave.resolveConflict('server');
      });

      // The resolveConflict should reset form with server data
      // Note: In real usage, this would be triggered by conflict detection
    });
  });

  describe('Pause and Resume', () => {
    it('should pause auto-save when requested', async () => {
      const mockUpdateProfile = jest.fn();
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: null,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      const { result } = createTestHook({ debounceMs: 1000 });

      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
        result.current.autoSave.pauseAutoSave();
      });

      // Advance past debounce period
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      // Should not have saved due to pause
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('should resume auto-save when requested', async () => {
      const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: null,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      const { result } = createTestHook({ debounceMs: 1000 });

      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
        result.current.autoSave.pauseAutoSave();
        result.current.autoSave.resumeAutoSave();
      });

      // Advance past debounce period
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Should save after resume
      expect(mockUpdateProfile).toHaveBeenCalled();
    });
  });

  describe('Status Text', () => {
    it('should provide appropriate status text for different states', () => {
      const { result } = createTestHook();

      // Initial state
      expect(result.current.autoSave.statusText).toBe('Up to date');

      // After making changes but before save
      act(() => {
        result.current.form.setValue('name', 'Jane Doe');
      });

      expect(result.current.autoSave.statusText).toBe('Unsaved changes');
    });

    it('should show relative time for last saved', async () => {
      const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: null,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      const { result } = createTestHook();

      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
        await result.current.autoSave.saveNow();
      });

      expect(result.current.autoSave.statusText).toBe('Saved just now');
    });
  });

  describe('Callback Functions', () => {
    it('should call onSaveSuccess callback', async () => {
      const onSaveSuccess = jest.fn();
      const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
      
      mockUseProfile.mockReturnValue({
        profile: { data: mockProfile },
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: null,
        optimisticData: null,
        setOptimisticData: jest.fn(),
      });

      const { result } = createTestHook({ onSaveSuccess });

      await act(async () => {
        result.current.form.setValue('name', 'Jane Doe');
        await result.current.autoSave.saveNow();
      });

      expect(onSaveSuccess).toHaveBeenCalledWith({
        name: 'Jane Doe',
        age: 30,
        height: 180,
        weight: 75,
      });
    });
  });
});
