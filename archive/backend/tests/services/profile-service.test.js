/**
 * @fileoverview Tests for profile service
 */

// Import required dependencies and errors
const { ValidationError, NotFoundError, InternalError, ConflictError } = require('../../utils/errors');
const logger = require('../../config/logger');

// Mock the logger
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock unit conversion utilities
jest.mock('../../utils/unit-conversion', () => ({
  convertHeight: jest.fn(),
  convertWeight: jest.fn()
}));
const unitConversion = require('../../utils/unit-conversion');

// Mock Supabase client
jest.mock('../../services/supabase', () => {
  const mockSingle = jest.fn();
  const mockSelect = jest.fn();
  const mockEq = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  
  return {
    getSupabaseClient: jest.fn(() => ({
      from: jest.fn(() => ({
        // For select operations
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockSingle,
          })),
          single: mockSingle, // For direct selects
        })),
        
        // For insert operations
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: mockSingle,
          })),
        })),
        
        // For update operations
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                single: mockSingle,
              })),
            })),
          })),
        })),
      })),
    })),
    mockSingle, // Export mock function for test assertions
  };
});

// Import the mock function for assertions
const { mockSingle } = require('../../services/supabase');

// Import the service under test
const profileService = require('../../services/profile-service');

describe('Profile Service', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Default mock implementations for unit conversion
    unitConversion.convertHeight.mockImplementation((value, from, to) => {
      if (to === 'imperial' && typeof value === 'number') return { feet: Math.floor(value / 30.48), inches: Math.round((value % 30.48) / 2.54) };
      if (to === 'metric' && typeof value === 'object') return Math.round(value.feet * 30.48 + value.inches * 2.54);
      return value; // Pass-through otherwise
    });
    
    unitConversion.convertWeight.mockImplementation((value, from, to) => {
      if (to === 'imperial' && typeof value === 'number') return Math.round(value * 2.20462);
      if (to === 'metric' && typeof value === 'number') return Math.round(value / 2.20462);
      return value; // Pass-through otherwise
    });
  });
  
  // Test data
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  
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
    updated_at: '2023-01-01T00:00:00Z',
    version: 1
  };
  
  /**
   * Tests for getProfileByUserId
   */
  describe('getProfileByUserId', () => {
    test('should return profile data when profile exists', async () => {
      // Arrange - Set up the successful response
      mockSingle.mockResolvedValue({ 
        data: dbProfileData, 
        error: null 
      });
      
      // Act
      const result = await profileService.getProfileByUserId(userId);
      
      // Assert
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
        updatedAt: dbProfileData.updated_at,
        version: dbProfileData.version
      }));
    });
    
    test('should convert height and weight to imperial if user preference is imperial', async () => {
      // Arrange
      const imperialDbProfileData = {
        ...dbProfileData,
        unit_preference: 'imperial'
      };
      mockSingle.mockResolvedValue({ 
        data: imperialDbProfileData, 
        error: null 
      });
      
      // Mock specific conversion results for this test
      unitConversion.convertHeight.mockReturnValueOnce({ feet: 5, inches: 11 });
      unitConversion.convertWeight.mockReturnValueOnce(176);

      // Act
      const result = await profileService.getProfileByUserId(userId);

      // Assert
      expect(unitConversion.convertHeight).toHaveBeenCalledWith(180, 'metric', 'imperial');
      expect(unitConversion.convertWeight).toHaveBeenCalledWith(80, 'metric', 'imperial');
      expect(result.unitPreference).toBe('imperial');
      expect(result.height).toEqual({ feet: 5, inches: 11 });
      expect(result.weight).toBe(176);
    });
    
    test('should throw NotFoundError when profile does not exist', async () => {
      // Arrange - Important: Return PGRST116 error to trigger the NotFoundError correctly
      mockSingle.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Record not found' } 
      });
      
      // Act & Assert
      await expect(profileService.getProfileByUserId(userId))
        .rejects
        .toThrow(NotFoundError);
      
      expect(mockSingle).toHaveBeenCalled();
    });
    
    test('should throw NotFoundError when response data is null', async () => {
      // Arrange - Important: Return null data but NO error
      mockSingle.mockResolvedValue({ 
        data: null, 
        error: null 
      });
      
      // Act & Assert
      await expect(profileService.getProfileByUserId(userId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    test('should throw InternalError when database operation fails with non-PGRST116 error', async () => {
      // Arrange
      mockSingle.mockResolvedValue({ 
        data: null, 
        error: { code: 'INTERNAL_ERROR', message: 'Database error' } 
      });
      
      // Act & Assert
      await expect(profileService.getProfileByUserId(userId))
        .rejects
        .toThrow(InternalError);
    });
    
    test('should throw InternalError when an unexpected error occurs', async () => {
      // Arrange
      mockSingle.mockRejectedValue(new Error('Unexpected error'));
      
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
    
    test('should create a new profile with metric units', async () => {
      // Arrange - Setup successful DB response
      mockSingle.mockResolvedValue({ 
        data: dbProfileData, 
        error: null 
      });
      
      // Act
      const result = await profileService.createProfile(metricProfileData);
      
      // Assert
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
        workoutFrequency: dbProfileData.workout_frequency
      }));
    });
    
    test('should create a new profile with imperial units and convert to metric for storage', async () => {
      // Arrange
      const imperialMetricConvertedHeight = 180;
      const imperialMetricConvertedWeight = 80;
      
      // Set up specific conversion results for this test
      unitConversion.convertHeight.mockReturnValue(imperialMetricConvertedHeight);
      unitConversion.convertWeight.mockReturnValue(imperialMetricConvertedWeight);
      
      // Mock the database response
      mockSingle.mockResolvedValue({ data: dbProfileData, error: null });
      
      // Act
      const result = await profileService.createProfile(imperialProfileData);
      
      // Assert
      expect(unitConversion.convertHeight).toHaveBeenCalledWith(
        imperialProfileData.height, 
        'imperial', 
        'metric'
      );
      expect(unitConversion.convertWeight).toHaveBeenCalledWith(
        imperialProfileData.weight, 
        'imperial', 
        'metric'
      );
      
      // Verify the result returned after the conversion process
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
    
    test('should throw ValidationError when required fields are missing', async () => {
      // Arrange
      const incompleteProfileData = {
        // Missing userId and unitPreference (required fields)
        height: 180,
        weight: 80
      };
      
      // Act & Assert
      await expect(profileService.createProfile(incompleteProfileData))
        .rejects
        .toThrow(ValidationError);
      
      // Verify validation errors contain field information
      await expect(profileService.createProfile(incompleteProfileData))
        .rejects
        .toMatchObject({
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'userId' }),
            expect.objectContaining({ field: 'unitPreference' })
          ])
        });
    });
    
    test('should throw InternalError when database operation fails', async () => {
      // Arrange - Setup error response from Supabase
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
    // For this function, we need to test:
    // 1. Successful update
    // 2. Not found errors
    // 3. Version conflict resolution (happy path where retry succeeds)
    // 4. Version conflict with max retries exceeded
    // 5. Validation errors

    // Setup update test data
    const updateData = {
      weight: 85, // Changed from 80
      goals: ['strength_training'] // Changed from ['weight_loss', 'muscle_gain']
    };

    test('should update an existing profile successfully', async () => {
      // Arrange
      const existingProfile = {...dbProfileData};
      const updatedProfile = {
        ...dbProfileData,
        weight: 85,
        goals: ['strength_training'],
        updated_at: '2023-01-02T00:00:00Z',
        version: 2 // Version incremented
      };

      // First call to mockSingle fetches the existing profile
      // Second call returns the updated profile
      mockSingle
        .mockResolvedValueOnce({ data: existingProfile, error: null })
        .mockResolvedValueOnce({ data: updatedProfile, error: null });

      // Act
      const result = await profileService.updateProfile(userId, updateData);

      // Assert
      expect(mockSingle).toHaveBeenCalledTimes(2);
      expect(result).toEqual(expect.objectContaining({
        id: updatedProfile.id,
        userId: updatedProfile.user_id,
        weight: updatedProfile.weight,
        goals: updatedProfile.goals,
        version: updatedProfile.version,
        updatedAt: updatedProfile.updated_at
      }));
    });

    test('should throw NotFoundError when profile does not exist', async () => {
      // Arrange
      // Profile not found during the fetch
      mockSingle.mockResolvedValueOnce({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Profile not found' }
      });

      // Act & Assert
      await expect(profileService.updateProfile(userId, updateData))
        .rejects
        .toThrow(NotFoundError);
    });

    test('should throw ValidationError when update data is invalid', async () => {
      // Arrange
      const invalidUpdateData = {
        weight: -10, // Invalid: must be positive
        unitPreference: 'advanced' // Invalid: must be 'metric' or 'imperial'
      };

      // Act & Assert
      await expect(profileService.updateProfile(userId, invalidUpdateData))
        .rejects
        .toThrow(ValidationError);

      // Verify we didn't even attempt to fetch the profile
      expect(mockSingle).not.toHaveBeenCalled();
    });

    test('should handle version conflict and retry successfully', async () => {
      // Arrange
      // Version 1 of the profile
      const existingProfileV1 = {...dbProfileData, version: 1};
      
      // Version 2 - updated by another process
      const existingProfileV2 = {
        ...dbProfileData,
        height: 182, // Changed by another process
        version: 2
      };
      
      // Version 3 - after our update is applied to V2
      const updatedProfileV3 = {
        ...existingProfileV2,
        weight: 85, // Our change
        goals: ['strength_training'], // Our change
        version: 3
      };

      // First call: Gets v1
      // Second call: Update fails (version conflict)
      // Third call: Gets v2 after conflict
      // Fourth call: Update succeeds on v2
      mockSingle
        .mockResolvedValueOnce({ data: existingProfileV1, error: null }) // Initial fetch
        .mockResolvedValueOnce({ data: null, error: { code: 'P2034', message: 'Version conflict' } }) // First update fails
        .mockResolvedValueOnce({ data: existingProfileV2, error: null }) // Fetch after conflict
        .mockResolvedValueOnce({ data: updatedProfileV3, error: null }); // Second update succeeds

      // Act
      const result = await profileService.updateProfile(userId, updateData);

      // Assert
      expect(mockSingle).toHaveBeenCalledTimes(4);
      expect(result).toEqual(expect.objectContaining({
        height: updatedProfileV3.height, // Preserved from V2
        weight: updatedProfileV3.weight, // Our change
        goals: updatedProfileV3.goals, // Our change
        version: 3
      }));
    });

    test('should throw ConflictError after exceeding maximum retry attempts', async () => {
      // Arrange
      const MAX_RETRY_ATTEMPTS = 3; // Same as in profile-service.js
      
      // Initial profile version
      const existingProfile = {...dbProfileData, version: 1};
      
      // Mock responses:
      // 1. First fetch: Gets original profile
      // 2-3. First update attempt: Fails with version conflict + fetch updated version (v2)
      // 4-5. Second update attempt: Fails with version conflict + fetch updated version (v3)
      // 6. Third update attempt: Fails with version conflict, which exceeds MAX_RETRY_ATTEMPTS
      mockSingle
        .mockResolvedValueOnce({ data: existingProfile, error: null }) // Initial fetch
        // First attempt
        .mockResolvedValueOnce({ data: null, error: { code: 'P2034', message: 'Version conflict' } })
        .mockResolvedValueOnce({ data: {...existingProfile, version: 2}, error: null })
        // Second attempt
        .mockResolvedValueOnce({ data: null, error: { code: 'P2034', message: 'Version conflict' } })
        .mockResolvedValueOnce({ data: {...existingProfile, version: 3}, error: null })
        // Third attempt
        .mockResolvedValueOnce({ data: null, error: { code: 'P2034', message: 'Version conflict' } });
        // The implementation throws ConflictError after the third attempt fails, without fetching v4
        // or making a fourth attempt

      // Act & Assert
      await expect(profileService.updateProfile(userId, updateData))
        .rejects
        .toThrow(ConflictError);

      // Should match the number of calls we mocked
      expect(mockSingle).toHaveBeenCalledTimes(6);
    });
  });
}); 