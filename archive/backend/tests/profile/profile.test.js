const request = require('supertest');
const express = require('express');
const profileRouter = require('../../routes/profile');
const profileController = require('../../controllers/profile');
const profileService = require('../../services/profile-service');
const { ValidationError, NotFoundError, ConflictError } = require('../../utils/errors');
const { getSupabaseClient } = require('../../services/supabase');
const { logger } = require('../../config');
const unitConversion = require('../../utils/unit-conversion');

// Mock dependencies for testing
jest.mock('../../services/profile-service');
jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  })
}));

jest.mock('../../middleware/validation', () => ({
  validate: jest.fn(() => (req, res, next) => next()),
  validateProfile: {},
  validatePartialProfile: {},
  validateProfilePreferences: {}
}));

// Setup Express app for testing routes
const app = express();
app.use(express.json());
app.use('/api/profile', profileRouter);

// Mock error handler middleware (Keep this for testing controller errors)
app.use((err, req, res, next) => {
  const statusCode = err?.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    errorCode: err?.errorCode || err?.code || 'INTERNAL_SERVER_ERROR', // Include err.code
    message: err?.message || 'An unexpected error occurred'
  });
});

describe('Profile Management API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/profile', () => {
    it('should return user profile successfully', async () => {
      const mockProfile = {
        id: 'test-profile-id',
        userId: 'test-user-id',
        name: 'Test User',
        age: 25,
        height: 180,
        weight: 75,
        gender: 'male',
        unitPreference: 'metric',
        goals: ['weight_loss', 'muscle_gain'],
        exercisePreferences: ['cardio', 'strength']
      };

      profileService.getProfileByUserId.mockResolvedValueOnce(mockProfile);

      const response = await request(app).get('/api/profile');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data', mockProfile);
      expect(profileService.getProfileByUserId).toHaveBeenCalledWith('test-user-id');
    });

    it('should return 404 if profile not found', async () => {
      profileService.getProfileByUserId.mockRejectedValueOnce(
        new NotFoundError('Profile not found for user: test-user-id')
      );

      const response = await request(app).get('/api/profile');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Profile not found for user: test-user-id');
      expect(profileService.getProfileByUserId).toHaveBeenCalledWith('test-user-id');
    });

    it('should return 500 if an unexpected error occurs', async () => {
      profileService.getProfileByUserId.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const response = await request(app).get('/api/profile');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Database connection failed');
      expect(profileService.getProfileByUserId).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('GET /api/profile/:userId (admin access)', () => {
    it('should return another user\'s profile for admin', async () => {
      const mockProfile = {
        id: 'other-profile-id',
        userId: 'other-user-id',
        name: 'Other User',
        age: 30
      };

      profileService.getProfileByUserId.mockResolvedValueOnce(mockProfile);

      const response = await request(app).get('/api/profile/other-user-id');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data', mockProfile);
      expect(profileService.getProfileByUserId).toHaveBeenCalledWith('other-user-id');
    });

    it('should return 404 if profile not found by admin', async () => {
      profileService.getProfileByUserId.mockRejectedValueOnce(
        new NotFoundError('Profile not found for user: non-existent-id')
      );

      const response = await request(app).get('/api/profile/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Profile not found for user: non-existent-id');
      expect(profileService.getProfileByUserId).toHaveBeenCalledWith('non-existent-id');
    });
  });

  describe('POST /api/profile (Create Profile)', () => {
    const validProfileData = {
      name: 'New User',
      age: 28,
      height: 175,
      weight: 70,
      gender: 'male',
      unitPreference: 'metric',
      goals: ['weight_loss'],
      exercisePreferences: ['cardio']
    };

    it('should create a new profile successfully', async () => {
      // Mock profile not found (to trigger creation path)
      profileService.getProfileByUserId.mockRejectedValueOnce(
        new NotFoundError('Profile not found')
      );

      // Mock successful profile creation
      const createdProfile = { ...validProfileData, userId: 'test-user-id', id: 'new-profile-id' };
      profileService.createProfile.mockResolvedValueOnce(createdProfile);

      const response = await request(app)
        .post('/api/profile')
        .send(validProfileData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Profile updated successfully');
      expect(response.body).toHaveProperty('data', createdProfile);
      expect(profileService.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({ ...validProfileData, userId: 'test-user-id' })
      );
    });

    it('should return 400 if validation fails during creation', async () => {
      // Mock profile not found (to trigger creation path)
      profileService.getProfileByUserId.mockRejectedValueOnce(
        new NotFoundError('Profile not found')
      );

      // Mock validation error
      const validationErrors = [
        { field: 'age', message: 'Age must be a positive integer' }
      ];
      profileService.createProfile.mockRejectedValueOnce(
        new ValidationError('Profile data validation failed', validationErrors)
      );

      const response = await request(app)
        .post('/api/profile')
        .send({ ...validProfileData, age: -5 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Profile data validation failed');
      expect(response.body).toHaveProperty('details', validationErrors);
    });

    it('should return 500 if profile creation fails unexpectedly', async () => {
      // Mock profile not found (to trigger creation path)
      profileService.getProfileByUserId.mockRejectedValueOnce(
        new NotFoundError('Profile not found')
      );

      // Mock unexpected error
      profileService.createProfile.mockRejectedValueOnce(
        new Error('Database error during profile creation')
      );

      const response = await request(app)
        .post('/api/profile')
        .send(validProfileData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Database error during profile creation');
    });
  });

  describe('POST /api/profile (Update Profile)', () => {
    const updateData = {
      weight: 72,
      goals: ['muscle_gain', 'endurance']
    };

    it('should update an existing profile successfully', async () => {
      // Mock profile found
      const existingProfile = {
        id: 'existing-profile-id',
        userId: 'test-user-id',
        name: 'Existing User',
        age: 30,
        weight: 70,
        goals: ['weight_loss']
      };
      profileService.getProfileByUserId.mockResolvedValueOnce(existingProfile);

      // Mock successful profile update
      const updatedProfile = { ...existingProfile, ...updateData };
      profileService.updateProfile.mockResolvedValueOnce(updatedProfile);

      const response = await request(app)
        .post('/api/profile')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Profile updated successfully');
      expect(response.body).toHaveProperty('data', updatedProfile);
      expect(profileService.updateProfile).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ ...updateData, userId: 'test-user-id' })
      );
    });

    it('should return 400 if validation fails during update', async () => {
      // Mock profile found
      const existingProfile = {
        id: 'existing-profile-id',
        userId: 'test-user-id',
        name: 'Existing User'
      };
      profileService.getProfileByUserId.mockResolvedValueOnce(existingProfile);

      // Mock validation error
      const validationErrors = [
        { field: 'weight', message: 'Weight must be a positive number' }
      ];
      profileService.updateProfile.mockRejectedValueOnce(
        new ValidationError('Profile data validation failed', validationErrors)
      );

      const response = await request(app)
        .post('/api/profile')
        .send({ weight: -10 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Profile data validation failed');
      expect(response.body).toHaveProperty('details', validationErrors);
    });

    it('should handle version conflict errors during update', async () => {
      // Mock profile found
      profileService.getProfileByUserId.mockResolvedValueOnce({
        id: 'existing-profile-id',
        userId: 'test-user-id'
      });

      // Mock version conflict
      const conflictError = new ConflictError('Profile was updated by another request. Please try again.');
      profileService.updateProfile.mockRejectedValueOnce(conflictError);

      const response = await request(app)
        .post('/api/profile')
        .send(updateData);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', conflictError.message);
      expect(response.body).toHaveProperty('errorCode', 'PROFILE_CONFLICT_ERROR');
    });
  });

  describe('PUT /api/profile (Partial Update)', () => {
    it('should perform partial update successfully', async () => {
      const partialUpdate = { weight: 68 };

      // Mock profile found
      const existingProfile = {
        id: 'existing-profile-id',
        userId: 'test-user-id',
        name: 'Existing User',
        age: 30,
        weight: 70
      };
      profileService.getProfileByUserId.mockResolvedValueOnce(existingProfile);

      // Mock successful profile update
      const updatedProfile = { ...existingProfile, ...partialUpdate };
      profileService.updateProfile.mockResolvedValueOnce(updatedProfile);

      const response = await request(app)
        .put('/api/profile')
        .send(partialUpdate);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Profile updated successfully');
      expect(response.body).toHaveProperty('data', updatedProfile);
      expect(profileService.updateProfile).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ ...partialUpdate, userId: 'test-user-id' })
      );
    });
  });

  describe('GET /api/profile/preferences', () => {
    it('should return user profile preferences successfully', async () => {
      const mockPreferences = {
        unitPreference: 'metric',
        exercisePreferences: ['cardio', 'strength'],
        equipmentPreferences: ['dumbbells', 'resistance bands'],
        workoutFrequency: '3x per week'
      };

      profileService.getProfilePreferences.mockResolvedValueOnce(mockPreferences);

      const response = await request(app).get('/api/profile/preferences');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data', mockPreferences);
      expect(profileService.getProfilePreferences).toHaveBeenCalledWith('test-user-id');
    });

    it('should return 404 if preferences not found', async () => {
      profileService.getProfilePreferences.mockRejectedValueOnce(
        new NotFoundError('Profile preferences not found')
      );

      const response = await request(app).get('/api/profile/preferences');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Profile preferences not found');
    });
  });

  describe('PUT /api/profile/preferences', () => {
    const preferenceData = {
      unitPreference: 'imperial',
      exercisePreferences: ['strength', 'yoga'],
      workoutFrequency: '4x per week'
    };

    it('should update preferences successfully', async () => {
      const updatedPreferences = {
        unitPreference: 'imperial',
        exercisePreferences: ['strength', 'yoga'],
        equipmentPreferences: ['dumbbells'], // Retained from existing
        workoutFrequency: '4x per week'
      };

      profileService.updateProfilePreferences.mockResolvedValueOnce(updatedPreferences);

      const response = await request(app)
        .put('/api/profile/preferences')
        .send(preferenceData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Profile preferences updated successfully');
      expect(response.body).toHaveProperty('data', updatedPreferences);
      expect(profileService.updateProfilePreferences).toHaveBeenCalledWith(
        'test-user-id',
        preferenceData
      );
    });

    it('should return 400 if preference data is empty', async () => {
      const response = await request(app)
        .put('/api/profile/preferences')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Preference data is required');
      expect(profileService.updateProfilePreferences).not.toHaveBeenCalled();
    });

    it('should return 400 if validation fails', async () => {
      const validationErrors = [
        { field: 'unitPreference', message: 'Unit preference must be either metric or imperial' }
      ];

      profileService.updateProfilePreferences.mockRejectedValueOnce(
        new ValidationError('Preference data validation failed', validationErrors)
      );

      const response = await request(app)
        .put('/api/profile/preferences')
        .send({ unitPreference: 'invalid_unit' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Preference data validation failed');
      expect(response.body).toHaveProperty('details', validationErrors);
    });

    it('should return 404 if profile not found during preference update', async () => {
      profileService.updateProfilePreferences.mockRejectedValueOnce(
        new NotFoundError('Profile not found for user: test-user-id')
      );

      const response = await request(app)
        .put('/api/profile/preferences')
        .send(preferenceData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Profile not found for user: test-user-id');
    });
  });

  describe('Concurrency Handling', () => {
    // Test 1 - Simulating service handling retry correctly
    it('should handle concurrent profile updates correctly (simulating service success)', async () => {
      // console.log('[TEST_RUN] Starting: should handle concurrent profile updates correctly (simulating service success)');
      // Mock profile found (needed for both attempts indirectly via controller)
      profileService.getProfileByUserId.mockResolvedValue({
        id: 'existing-profile-id',
        userId: 'test-user-id',
        version: 1
      });

      // Mock updateProfile to succeed on the first call
      profileService.updateProfile.mockResolvedValueOnce({
        id: 'existing-profile-id',
        userId: 'test-user-id',
        weight: 72,
        version: 2 // Simulate version increment
      });
      // Mock updateProfile to succeed on the second call (even if internal retry happened)
       profileService.updateProfile.mockResolvedValueOnce({
        id: 'existing-profile-id',
        userId: 'test-user-id',
        height: 180,
        version: 3 // Simulate version increment
      });


      // First update call via controller
      // console.log('[TEST_RUN] Sending first update request');
      const response1 = await request(app)
        .post('/api/profile')
        .send({ weight: 72 });
      // console.log('[TEST_RUN] First update response status:', response1.status);


      // Second update call via controller
      // Note: In a real scenario these are concurrent, but here we test sequential controller calls
      // where the *service* is assumed to handle internal retries if needed.
      // The controller itself doesn't retry.
      // console.log('[TEST_RUN] Sending second update request');
       const response2 = await request(app)
        .post('/api/profile')
        .send({ height: 180 });
      // console.log('[TEST_RUN] Second update response status:', response2.status);


      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200); // Expecting 200 as the service mock resolves

      // Verify the service's updateProfile was called twice by the controller
      expect(profileService.updateProfile).toHaveBeenCalledTimes(2);
      // Verify getProfileByUserId was called twice by the controller (once for each update attempt)
      expect(profileService.getProfileByUserId).toHaveBeenCalledTimes(2);
      // console.log('[TEST_RUN] Finished: should handle concurrent profile updates correctly (simulating service success)');
    });

    // Test 2 - Testing controller reaction when service *fails* after retries
    it('should return 409 after max retry attempts for concurrency conflicts', async () => {
      // console.log('[TEST_RUN] Starting: should return 409 after max retry attempts');
      // Mock profile found
      profileService.getProfileByUserId.mockResolvedValueOnce({
        id: 'existing-profile-id',
        userId: 'test-user-id'
      });

      // Mock repeated version conflicts (simulate service failing after internal retries)
      const conflictError = new ConflictError('Profile was updated by another request');
      profileService.updateProfile.mockRejectedValue(conflictError); // Always reject

      // console.log('[TEST_RUN] Sending update request expected to fail');
      const response = await request(app)
        .post('/api/profile')
        .send({ weight: 75 });
      // console.log('[TEST_RUN] Update response status:', response.status);


      expect(response.status).toBe(409); // Controller should catch ConflictError and return 409
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', conflictError.message);
      expect(profileService.updateProfile).toHaveBeenCalledTimes(1); // Controller calls service once
      // console.log('[TEST_RUN] Finished: should return 409 after max retry attempts');
    });
  });
}); 