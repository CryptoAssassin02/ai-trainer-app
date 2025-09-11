/**
 * @fileoverview Tests for the profile service
 */

const { jest: jestConfig } = require('@jest/globals');
// Import specific mock functions and the reset function directly
const {
  mockFrom,
  mockSelect,
  mockEq,
  mockSingle,
  mockInsert,
  mockUpdate,
  mockDelete,
  resetMocks // Import resetMocks directly
} = require('../mocks/supabase');
const {
  ValidationError,
  NotFoundError,
  InternalError
} = require('../../utils/errors');

// Mock the unit conversion utility directly
jest.mock('../../utils/unit-conversion', () => ({
  convertHeight: jest.fn(),
  convertWeight: jest.fn(),
}));
// Import after mocking
const unitConversion = require('../../utils/unit-conversion');

// Mock the Supabase client module to return an object containing the mocks
// We don't need the full client object from the mock file here anymore
jest.mock('../../services/supabase', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: mockFrom // Ensure the mock client has the 'from' method
    // Add other necessary top-level client methods if needed
  }))
}));

jest.mock('../../config/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
}));

// Import the service under test
const profileService = require('../../services/profile-service');

describe('Profile Service', () => {
  beforeEach(() => {
    resetMocks(); // Reset Supabase mocks
    jest.clearAllMocks(); // Clear all mocks including unitConversion

    // Provide default mock implementations for unit conversion
    unitConversion.convertHeight.mockImplementation((value, from, to) => {
      // Simple pass-through or basic mock logic for default cases
      if (to === 'imperial' && typeof value === 'number') return { feet: Math.floor(value / 30.48), inches: Math.round((value % 30.48) / 2.54) };
      if (to === 'metric' && typeof value === 'object') return Math.round(value.feet * 30.48 + value.inches * 2.54);
      return value; // Pass-through otherwise
    });
    unitConversion.convertWeight.mockImplementation((value, from, to) => {
       // Simple pass-through or basic mock logic for default cases
       if (to === 'imperial' && typeof value === 'number') return Math.round(value * 2.20462);
       if (to === 'metric' && typeof value === 'number') return Math.round(value / 2.20462);
       return value; // Pass-through otherwise
    });
  });

  // Test data
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  
  const metricProfileData = {
    userId,
    unitPreference: 'metric',
    height: 180,
    weight: 80,
    age: 30,
    gender: 'male',
    goals: ['weight_loss', 'muscle_gain'],
    exercisePreferences: ['cardio', 'strength'],
    equipmentPreferences: ['dumbbells', 'resistance bands'],
    workoutFrequency: '3x per week'
  };
  
  const imperialProfileData = {
    userId,
    unitPreference: 'imperial',
    height: { feet: 5, inches: 11 },
    weight: 176, // ~80kg in lbs
    age: 30,
    gender: 'male',
    goals: ['weight_loss', 'muscle_gain'],
    exercisePreferences: ['cardio', 'strength'],
    equipmentPreferences: ['dumbbells', 'resistance bands'],
    workoutFrequency: '3x per week'
  };
  
  const dbProfileData = {
    id: 1,
    user_id: userId,
    unit_preference: 'metric',
    height: 180, // stored in cm
    weight: 80, // stored in kg
    age: 30,
    gender: 'male',
    goals: ['weight_loss', 'muscle_gain'],
    exercise_preferences: ['cardio', 'strength'],
    equipment_preferences: ['dumbbells', 'resistance bands'],
    workout_frequency: '3x per week',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  };

  /**
   * Tests for getProfileByUserId
   */
  describe('getProfileByUserId', () => {
    test('should return profile data when profile exists', async () => {
      // Arrange
      // Chain is: from('user_profiles').select('*').eq('user_id', userId).single()
      mockSingle.mockResolvedValue({ data: dbProfileData, error: null });
      
      // Act
      const result = await profileService.getProfileByUserId(userId);
      
      // Assert
      expect(mockFrom).toHaveBeenCalledWith('user_profiles');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSingle).toHaveBeenCalled();
      
      expect(result).toEqual(expect.objectContaining({
        id: dbProfileData.id,
        userId: dbProfileData.user_id,
        unitPreference: dbProfileData.unit_preference,
        height: dbProfileData.height,
        weight: dbProfileData.weight,
        age: dbProfileData.age,
        gender: dbProfileData.gender,
        goals: dbProfileData.goals,
        exercisePreferences: dbProfileData.exercise_preferences,
        equipmentPreferences: dbProfileData.equipment_preferences,
        workoutFrequency: dbProfileData.workout_frequency,
        createdAt: dbProfileData.created_at,
        updatedAt: dbProfileData.updated_at
      }));
    });
    
    test('should convert height and weight to imperial if user preference is imperial', async () => {
      // Arrange
      const imperialDbProfileData = {
        ...dbProfileData,
        unit_preference: 'imperial'
      };
      mockSingle.mockResolvedValue({ data: imperialDbProfileData, error: null });

      // Act
      const result = await profileService.getProfileByUserId(userId);

      // Assert
      // Now assert against the mock function from the mocked module
      expect(unitConversion.convertHeight).toHaveBeenCalledWith(180, 'metric', 'imperial');
      expect(unitConversion.convertWeight).toHaveBeenCalledWith(80, 'metric', 'imperial');
      expect(result.unitPreference).toBe('imperial');
      expect(result.height).toHaveProperty('feet'); // Check structure based on mock implementation
      expect(result.height).toHaveProperty('inches');
      expect(result.weight).toBe(176); // Check value based on mock implementation
    });
    
    test('should throw NotFoundError when profile does not exist', async () => {
      // Arrange
      // Chain is: from('user_profiles').select('*').eq('user_id', userId).single()
      mockSingle.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Record not found' } 
      });
      
      // Act & Assert
      await expect(profileService.getProfileByUserId(userId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    test('should throw InternalError when database operation fails', async () => {
      // Arrange
      // Chain is: from('user_profiles').select('*').eq('user_id', userId).single()
      mockSingle.mockResolvedValue({ 
        data: null, 
        error: { code: 'INTERNAL_ERROR', message: 'Database error' } 
      });
      
      // Act & Assert
      await expect(profileService.getProfileByUserId(userId))
        .rejects
        .toThrow(InternalError);
    });
  });

  /**
   * Tests for createProfile
   */
  describe('createProfile', () => {
    test('should create a new profile with metric units', async () => {
      // Arrange
      // Chain is: from('user_profiles').insert(...).select().single()
      mockSingle.mockResolvedValue({ data: dbProfileData, error: null });
      
      // Act
      const result = await profileService.createProfile(metricProfileData);
      
      // Assert
      expect(mockFrom).toHaveBeenCalledWith('user_profiles');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: metricProfileData.userId,
        unit_preference: metricProfileData.unitPreference,
        height: metricProfileData.height,
        weight: metricProfileData.weight
      }));
      // Check the chain continues
      expect(mockSelect).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();
      
      expect(result).toEqual(expect.objectContaining({
        id: dbProfileData.id,
        userId: dbProfileData.user_id,
        unitPreference: dbProfileData.unit_preference
      }));
    });
    
    test('should create a new profile with imperial units and convert to metric for storage', async () => {
      // Arrange
      const imperialMetricConvertedHeight = 180;
      const imperialMetricConvertedWeight = 80;

      // Set specific return values for THIS test case if needed
      unitConversion.convertHeight.mockReturnValueOnce(imperialMetricConvertedHeight);
      unitConversion.convertWeight.mockReturnValueOnce(imperialMetricConvertedWeight);

      mockSingle.mockResolvedValue({ data: dbProfileData, error: null });

      // Act
      const result = await profileService.createProfile(imperialProfileData);

      // Assert
      // Assert against the mock function
      expect(unitConversion.convertHeight).toHaveBeenCalledWith(imperialProfileData.height, 'imperial', 'metric');
      expect(unitConversion.convertWeight).toHaveBeenCalledWith(imperialProfileData.weight, 'imperial', 'metric');

      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        height: imperialMetricConvertedHeight,
        weight: imperialMetricConvertedWeight
      }));
      // Check the chain continues
      expect(mockSelect).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();
      
      expect(result).toEqual(expect.objectContaining({
        id: dbProfileData.id,
        userId: dbProfileData.user_id
      }));
    });
    
    test('should throw ValidationError when profile data is invalid', async () => {
      // Arrange
      const invalidProfileData = {
        // Missing required userId
        unitPreference: 'invalid_unit', // Invalid unit preference
        height: 'not_a_number', // Invalid height
        weight: -10 // Invalid weight
      };
      
      // Act & Assert
      await expect(profileService.createProfile(invalidProfileData))
        .rejects
        .toThrow(ValidationError);
    });
    
    test('should throw InternalError when database operation fails', async () => {
      // Arrange
      // Chain is: from('user_profiles').insert(...).select().single()
      mockSingle.mockResolvedValue({ 
        data: null, 
        error: { code: 'INTERNAL_ERROR', message: 'Database insert error' } 
      });
      
      // Act & Assert
      await expect(profileService.createProfile(metricProfileData))
        .rejects
        .toThrow(InternalError);
    });
  });

  /**
   * Tests for updateProfile
   */
  describe('updateProfile', () => {
    const updateData = {
      weight: 85,
      goals: ['strength_training']
    };

    const updatedDbData = {
      ...dbProfileData,
      weight: 85,
      goals: ['strength_training'],
      updated_at: '2023-01-02T00:00:00Z'
    };

    test('should update an existing profile', async () => {
      // Arrange
      // Mock the initial fetch to return an existing profile
      mockSingle.mockResolvedValueOnce({ data: dbProfileData, error: null })
              // Mock the final select().single() after the update
              .mockResolvedValueOnce({ data: updatedDbData, error: null });

      // Act
      const result = await profileService.updateProfile(userId, updateData);

      // Assert
      expect(mockFrom).toHaveBeenCalledWith('user_profiles');
      // Check the initial select
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSingle).toHaveBeenCalledTimes(2); // Called for fetch and after update

      // Check the update call
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        weight: 85,
        goals: ['strength_training']
      }));
      // Check the eq after update
      expect(mockEq).toHaveBeenNthCalledWith(2, 'user_id', userId);
      // Check the select after update
      expect(mockSelect).toHaveBeenNthCalledWith(2);


      expect(result).toEqual(expect.objectContaining({
        weight: 85,
        goals: ['strength_training'],
        updatedAt: updatedDbData.updated_at
      }));
    });
    
    test('should throw NotFoundError when profile does not exist', async () => {
      // Arrange
      // Mock the *initial* fetch to return null (profile not found)
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      // Act & Assert
      await expect(profileService.updateProfile(userId, updateData))
        .rejects
        .toThrow(NotFoundError);

      // Verify the initial fetch was attempted
      expect(mockFrom).toHaveBeenCalledWith('user_profiles');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSingle).toHaveBeenCalledTimes(1); // Only called for the initial fetch
      // Verify the update was *not* attempted
      expect(mockUpdate).not.toHaveBeenCalled();
    });
    
    test('should throw ValidationError when update data is invalid', async () => {
      // Arrange
      const invalidUpdateData = { age: -10 };
      
      // Act & Assert
      await expect(profileService.updateProfile(userId, invalidUpdateData))
        .rejects
        .toThrow(ValidationError);
      // Ensure no DB operation was attempted
      expect(mockUpdate).not.toHaveBeenCalled();
    });
    
    test('should handle unit conversion when changing from metric to imperial', async () => {
      // Arrange
      const existingData = { ...dbProfileData, unit_preference: 'metric' };
      const updateWithImperial = { unitPreference: 'imperial', weight: 187 };
      const updatedDbDataMetricStorage = {
         ...dbProfileData,
         weight: 85,
         unit_preference: 'imperial',
         updated_at: '2023-01-02T00:00:00Z'
      };

      mockSingle.mockResolvedValueOnce({ data: existingData, error: null })
                .mockResolvedValueOnce({ data: updatedDbDataMetricStorage, error: null });

      // Set up mock implementations for this specific test
      unitConversion.convertWeight.mockImplementation((val, from, to) => {
         if (from === 'imperial' && to === 'metric' && val === 187) return 85; // For storage
         if (from === 'metric' && to === 'imperial' && val === 85) return 187; // For response
         return val;
      });
      // Height mock (not called for storage, but potentially for response)
       unitConversion.convertHeight.mockImplementation((val, from, to) => {
         if (from === 'metric' && to === 'imperial' && val === 180) return { feet: 5, inches: 11 };
         return val;
       });

      // Act
      const result = await profileService.updateProfile(userId, updateWithImperial);

      // Assert
      // Assert against the mock function
      expect(unitConversion.convertWeight).toHaveBeenCalledWith(187, 'imperial', 'metric'); // For storage
      expect(unitConversion.convertWeight).toHaveBeenCalledWith(85, 'metric', 'imperial'); // For response

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        unit_preference: 'imperial',
        weight: 85
      }));

      expect(result.unitPreference).toBe('imperial');
      expect(result.weight).toBe(187); // Check response value
    });

    test('should retry failed concurrent updates with the latest version', async () => {
      // Arrange
      resetMocks(); // Ensure all mocks are reset before the test

      // Initial profile data with version field
      const initialProfile = { ...dbProfileData, version: 1 };
      // Update data from user
      const updateData = { weight: 85, version: 1 }; // Version provided by user
      // Profile state after conflict (updated by another process) - uses DB format internally
      const updatedByOtherProcess_DB_Format = { ...dbProfileData, height: 182, version: 2 };
      // Expected final state after successful retry - in DB format
      const afterRetryUpdate_DB_Format = {
        id: dbProfileData.id,
        user_id: userId,
        unit_preference: updatedByOtherProcess_DB_Format.unit_preference,
        height: updatedByOtherProcess_DB_Format.height, // Concurrent change preserved
        weight: 85, // Our update applied (metric kg)
        age: updatedByOtherProcess_DB_Format.age,
        gender: updatedByOtherProcess_DB_Format.gender,
        goals: updatedByOtherProcess_DB_Format.goals,
        exercise_preferences: updatedByOtherProcess_DB_Format.exercise_preferences,
        equipment_preferences: updatedByOtherProcess_DB_Format.equipment_preferences,
        workout_frequency: updatedByOtherProcess_DB_Format.workout_frequency,
        created_at: updatedByOtherProcess_DB_Format.created_at,
        updated_at: '2023-01-02T00:00:00Z', // Mocked update time
        version: 3 // Final incremented version
      };
      // Version conflict error object
      const versionConflictError = { code: 'P2034', message: 'Concurrent update detected.' };

      // --- Mock Implementation Sequence --- 

      // Mock chain object to be returned by intermediate steps
      const mockChain = { select: mockSelect, eq: mockEq, single: mockSingle, update: mockUpdate };

      // 1. Initial Fetch: supabase.from('user_profiles').select('*').eq('user_id', userId).single();
      mockFrom.mockImplementationOnce(() => mockChain);
      mockSelect.mockImplementationOnce(() => mockChain);
      mockEq.mockImplementationOnce(() => mockChain);
      mockSingle.mockImplementationOnce(() => Promise.resolve({ data: initialProfile, error: null }));

      // 2. First Update Attempt (Fails): supabase.from('...').update({...}).eq('user_id', ...).eq('version', currentVersion=1).select().single();
      mockFrom.mockImplementationOnce(() => mockChain);
      mockUpdate.mockImplementationOnce(() => mockChain); // Payload check happens via expect(mockUpdate).toHaveBeenCalledWith(...)
      mockEq.mockImplementationOnce(() => mockChain); // eq user_id
      mockEq.mockImplementationOnce(() => mockChain); // eq version (currentVersion = 1)
      mockSelect.mockImplementationOnce(() => mockChain);
      mockSingle.mockImplementationOnce(() => Promise.resolve({ data: null, error: versionConflictError }));

      // 3. Refetch After Conflict: supabase.from('user_profiles').select('*').eq('user_id', userId).single();
      mockFrom.mockImplementationOnce(() => mockChain);
      mockSelect.mockImplementationOnce(() => mockChain);
      mockEq.mockImplementationOnce(() => mockChain);
      // Use the DB format for the refetched profile
      mockSingle.mockImplementationOnce(() => Promise.resolve({ data: updatedByOtherProcess_DB_Format, error: null }));

      // 4. Retry Update Attempt (Succeeds): supabase.from('...').update({...}).eq('user_id', ...).eq('version', currentVersion=2).select().single();
      mockFrom.mockImplementationOnce(() => mockChain);
      mockUpdate.mockImplementationOnce(() => mockChain); // Payload check happens via expect(mockUpdate).toHaveBeenCalledWith(...)
      mockEq.mockImplementationOnce(() => mockChain); // eq user_id
      mockEq.mockImplementationOnce(() => mockChain); // eq version (currentVersion = 2)
      mockSelect.mockImplementationOnce(() => mockChain);
      mockSingle.mockImplementationOnce(() => {
        // Return the DB format data
        return Promise.resolve({ data: afterRetryUpdate_DB_Format, error: null });
      });

      // --- Act --- 
      let result;
      try {
        result = await profileService.updateProfile(userId, updateData);
      } catch (err) {
        throw err; // Re-throw error if it occurs unexpectedly
      }

      // --- Assert --- 
      expect(mockUpdate).toHaveBeenCalledTimes(2); // Called for first attempt and retry
      // Initial Fetch (select->eq->single) -> 1 single
      // First Update (update->eq->eq->select->single) -> 1 single
      // Refetch (select->eq->single) -> 1 single
      // Retry Update (update->eq->eq->select->single) -> 1 single
      expect(mockSingle).toHaveBeenCalledTimes(4);

      // Check update payloads
      const firstUpdatePayload = mockUpdate.mock.calls[0][0];
      expect(firstUpdatePayload.weight).toBe(85);
      expect(firstUpdatePayload.version).toBe(2); // Incremented from initialProfile.version (1)

      const retryUpdatePayload = mockUpdate.mock.calls[1][0];
      expect(retryUpdatePayload.weight).toBe(85);
      expect(retryUpdatePayload.version).toBe(3); // Incremented from updatedByOtherProcess.version (2)

      // Check final result (which should be converted back to camelCase by the service)
      expect(result.version).toBe(3);
      expect(result.weight).toBe(85); // Our change (still in metric for result check)
      expect(result.height).toBe(182); // Other process's change preserved (metric)
      expect(result.userId).toBe(userId);
      expect(result.unitPreference).toBe('metric');
    });
  });

  /**
   * Tests for getProfilePreferences
   */
  describe('getProfilePreferences', () => {
    test('should return only preference fields', async () => {
      // Arrange
      // Chain: from('user_profiles').select('unit_preference, exercise_preferences, ...').eq(...).single()
      mockSingle.mockResolvedValue({
        data: {
          unit_preference: dbProfileData.unit_preference,
          exercise_preferences: dbProfileData.exercise_preferences,
          equipment_preferences: dbProfileData.equipment_preferences,
          workout_frequency: dbProfileData.workout_frequency,
          goals: dbProfileData.goals
        },
        error: null
      });
      
      // Act
      const result = await profileService.getProfilePreferences(userId);
      
      // Assert
      expect(mockSelect).toHaveBeenCalledWith('unit_preference, goals, exercise_preferences, equipment_preferences, workout_frequency, updated_at');
      expect(mockEq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSingle).toHaveBeenCalled();
      
      expect(result).toEqual({
        unitPreference: dbProfileData.unit_preference,
        goals: dbProfileData.goals,
        exercisePreferences: dbProfileData.exercise_preferences,
        equipmentPreferences: dbProfileData.equipment_preferences,
        workoutFrequency: dbProfileData.workout_frequency
      });
      // Ensure other fields are not present
      expect(result).not.toHaveProperty('height');
      expect(result).not.toHaveProperty('weight');
    });
    
    test('should throw NotFoundError when profile does not exist', async () => {
      // Arrange
      // Chain: from('user_profiles').select(...).eq(...).single()
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Record not found' }
      });
      
      // Act & Assert
      await expect(profileService.getProfilePreferences(userId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    test('should throw InternalError when database operation fails', async () => {
      // Arrange
      // Chain: from('user_profiles').select(...).eq(...).single()
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'DB_ERROR', message: 'DB error' }
      });
      
      // Act & Assert
      await expect(profileService.getProfilePreferences(userId))
        .rejects
        .toThrow(InternalError);
    });
  });

  /**
   * Tests for updateProfilePreferences
   */
  describe('updateProfilePreferences', () => {
    const preferenceData = {
      unitPreference: 'imperial',
      goals: ['endurance']
    };

    const updatedPreferencesDb = {
      ...dbProfileData,
      unit_preference: 'imperial',
      goals: ['endurance']
    };

    test('should update only preference fields', async () => {
      // Arrange
      // Mock initial fetch
      mockSingle.mockResolvedValueOnce({ data: dbProfileData, error: null })
                // Mock result after update
                .mockResolvedValueOnce({ data: updatedPreferencesDb, error: null });

      // Act
      const result = await profileService.updateProfilePreferences(userId, preferenceData);

      // Assert
       // Check initial fetch
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSingle).toHaveBeenCalledTimes(2); // Fetch and after update

      // Check update call
      expect(mockUpdate).toHaveBeenCalledWith({
        unit_preference: 'imperial',
        goals: ['endurance'],
        // Ensure existing preferences that weren't updated are NOT included here
        exercise_preferences: undefined,
        equipment_preferences: undefined,
        workout_frequency: undefined,
        // But updated_at should be included
        updated_at: expect.any(String)
      });
      // Check eq after update
      expect(mockEq).toHaveBeenNthCalledWith(2, 'user_id', userId);
      // Check select after update
      expect(mockSelect).toHaveBeenNthCalledWith(2, 'unit_preference, goals, exercise_preferences, equipment_preferences, workout_frequency');


      expect(result).toEqual({
        unitPreference: 'imperial',
        goals: ['endurance'],
        exercisePreferences: dbProfileData.exercise_preferences,
        equipmentPreferences: dbProfileData.equipment_preferences,
        workoutFrequency: dbProfileData.workout_frequency,
      });
    });
    
    test('should throw NotFoundError when profile does not exist', async () => {
      // Arrange
      // Mock *initial* fetch to return null
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      // Act & Assert
      await expect(profileService.updateProfilePreferences(userId, preferenceData))
        .rejects
        .toThrow(NotFoundError);

       // Verify initial fetch was attempted
       expect(mockSelect).toHaveBeenCalledWith('*');
       expect(mockEq).toHaveBeenCalledWith('user_id', userId);
       expect(mockSingle).toHaveBeenCalledTimes(1);
       // Verify update was not attempted
       expect(mockUpdate).not.toHaveBeenCalled();
    });
    
    test('should throw ValidationError for invalid preference data', async () => {
      // Arrange
      const invalidPreferenceData = { unitPreference: 'invalid' };
      
      // Act & Assert
      await expect(profileService.updateProfilePreferences(userId, invalidPreferenceData))
        .rejects
        .toThrow(ValidationError);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
}); 