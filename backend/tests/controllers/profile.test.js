/**
 * @fileoverview Tests for Profile Controller
 * Ensures proper functioning of profile controller methods
 */

const { jest: jestConfig } = require('@jest/globals');
const profileController = require('../../controllers/profile');
const profileService = require('../../services/profile-service');
const { ValidationError, NotFoundError, InternalError } = require('../../utils/errors');

// Mock the profile service
jest.mock('../../services/profile-service');

// Mock the logger to prevent console output during tests
jest.mock('../../config/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Profile Controller', () => {
  let req;
  let res;
  let next;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Manually create mock req, res, next
    req = {
      user: null, // Will be set per test case
      params: {}, // Will be set per test case
      body: {}    // Will be set per test case
    };
    res = {
      status: jest.fn().mockReturnThis(), // Allows chaining .status().json()
      json: jest.fn(),
      send: jest.fn(), // Add send if used
      // Add helper properties to check results
      _status: null,
      _json: null,
      _send: null
    };
    // Capture status code
    res.status.mockImplementation(status => {
      res._status = status;
      return res;
    });
    // Capture json body
    res.json.mockImplementation(body => {
      res._json = body;
    });
     // Capture send body
     res.send.mockImplementation(body => {
      res._send = body;
    });

    next = jest.fn();
  });
  
  describe('getProfile', () => {
    test('should get profile successfully from user ID in req.user', async () => {
      // Arrange
      const userId = 'user-123';
      const profile = {
        id: 'profile-123',
        userId,
        name: 'Test User',
        height: 180,
        weight: 75,
        unitPreference: 'metric'
      };
      
      req.user = { id: userId };
      profileService.getProfileByUserId.mockResolvedValue(profile);
      
      // Act
      await profileController.getProfile(req, res, next);
      
      // Assert
      expect(profileService.getProfileByUserId).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: profile
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should get profile successfully from user ID in params', async () => {
      // Arrange
      const userId = 'user-123';
      const profile = {
        id: 'profile-123',
        userId,
        name: 'Test User',
        height: 180,
        weight: 75,
        unitPreference: 'metric'
      };
      
      req.params = { userId };
      profileService.getProfileByUserId.mockResolvedValue(profile);
      
      // Act
      await profileController.getProfile(req, res, next);
      
      // Assert
      expect(profileService.getProfileByUserId).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: profile
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should return 404 when profile not found', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new NotFoundError(`Profile not found for user: ${userId}`);
      
      req.user = { id: userId };
      profileService.getProfileByUserId.mockRejectedValue(error);
      
      // Act
      await profileController.getProfile(req, res, next);
      
      // Assert
      expect(profileService.getProfileByUserId).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: error.message
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should return 400 when user ID is missing', async () => {
      // Arrange
      // Neither req.user nor req.params.userId is set
      req.user = null;
      req.params = {};

      // Act
      await profileController.getProfile(req, res, next);
      
      // Assert
      expect(profileService.getProfileByUserId).not.toHaveBeenCalled(); // Service shouldn't be called
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'User ID is required'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should forward unexpected errors to next middleware', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new InternalError('Database crashed');
      
      req.user = { id: userId };
      profileService.getProfileByUserId.mockRejectedValue(error);
      
      // Act
      await profileController.getProfile(req, res, next);
      
      // Assert
      expect(profileService.getProfileByUserId).toHaveBeenCalledWith(userId);
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
  
  describe('createOrUpdateProfile', () => {
    test('should update profile when it already exists', async () => {
      // Arrange
      const userId = 'user-123';
      const profileData = {
        name: 'Test User',
        height: 180,
        weight: 75,
        unitPreference: 'metric'
      };
      
      const existingProfile = {
        id: 'profile-123',
        userId,
        name: 'Old Name',
        height: 175,
        weight: 70,
        unitPreference: 'metric'
      };
      
      const updatedProfile = {
        ...existingProfile,
        ...profileData,
        userId
      };
      
      req.user = { id: userId };
      req.body = profileData;
      
      profileService.getProfileByUserId.mockResolvedValue(existingProfile);
      profileService.updateProfile.mockResolvedValue(updatedProfile);
      
      // Act
      await profileController.createOrUpdateProfile(req, res, next);
      
      // Assert
      expect(profileService.getProfileByUserId).toHaveBeenCalledWith(userId);
      expect(profileService.updateProfile).toHaveBeenCalledWith(userId, {
        ...profileData,
        userId
      });
      expect(profileService.createProfile).not.toHaveBeenCalled();
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Profile updated successfully',
        data: updatedProfile
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should create profile when it does not exist', async () => {
      // Arrange
      const userId = 'user-123';
      const profileData = {
        name: 'Test User',
        height: 180,
        weight: 75,
        unitPreference: 'metric'
      };
      
      const createdProfile = {
        id: 'profile-123',
        ...profileData,
        userId
      };
      
      req.user = { id: userId };
      req.body = profileData;
      
      profileService.getProfileByUserId.mockRejectedValue(new NotFoundError());
      profileService.createProfile.mockResolvedValue(createdProfile);
      
      // Act
      await profileController.createOrUpdateProfile(req, res, next);
      
      // Assert
      expect(profileService.getProfileByUserId).toHaveBeenCalledWith(userId);
      expect(profileService.createProfile).toHaveBeenCalledWith({
        ...profileData,
        userId
      });
      expect(profileService.updateProfile).not.toHaveBeenCalled();
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Profile updated successfully',
        data: createdProfile
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should handle unit conversion when creating profile with imperial data', async () => {
      // Arrange
      const userId = 'user-123';
      const imperialProfileData = {
        name: 'Test User',
        height: { feet: 5, inches: 11 }, // This will be converted to cm in the service
        weight: 165, // This will be converted to kg in the service
        unitPreference: 'imperial'
      };
      
      const createdProfile = {
        id: 'profile-123',
        userId,
        name: 'Test User',
        height: 180.3, // Already converted in the service
        weight: 74.8, // Already converted in the service
        unitPreference: 'imperial'
      };
      
      req.user = { id: userId };
      req.body = imperialProfileData;
      
      profileService.getProfileByUserId.mockRejectedValue(new NotFoundError());
      profileService.createProfile.mockResolvedValue(createdProfile);
      
      // Act
      await profileController.createOrUpdateProfile(req, res, next);
      
      // Assert
      expect(profileService.getProfileByUserId).toHaveBeenCalledWith(userId);
      expect(profileService.createProfile).toHaveBeenCalledWith({
        ...imperialProfileData,
        userId
      });
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Profile updated successfully',
        data: createdProfile
      });
    });
    
    test('should return 400 when user ID is missing', async () => {
      // Arrange
      const profileData = {
        name: 'Test User',
        height: 180,
        weight: 75,
        unitPreference: 'metric'
      };
      
      req.body = profileData;
      
      // Act
      await profileController.createOrUpdateProfile(req, res, next);
      
      // Assert
      expect(profileService.getProfileByUserId).not.toHaveBeenCalled();
      expect(profileService.createProfile).not.toHaveBeenCalled();
      expect(profileService.updateProfile).not.toHaveBeenCalled();
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'User ID is required'
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should forward validation errors from service', async () => {
      // Arrange
      const userId = 'user-123';
      const profileData = {
        name: 'Test User',
        height: -180, // Invalid negative height
        weight: 75,
        unitPreference: 'metric'
      };
      
      const validationError = new ValidationError('Height cannot be negative');
      
      req.user = { id: userId };
      req.body = profileData;
      
      profileService.getProfileByUserId.mockResolvedValue({ userId });
      profileService.updateProfile.mockRejectedValue(validationError);
      
      // Act
      await profileController.createOrUpdateProfile(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: validationError.message
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should forward unexpected errors to next middleware', async () => {
      // Arrange
      const userId = 'user-123';
      const profileData = {
        name: 'Test User',
        height: 180,
        weight: 75,
        unitPreference: 'metric'
      };
      
      const error = new InternalError('DB Error');
      
      req.user = { id: userId };
      req.body = profileData;
      
      profileService.getProfileByUserId.mockRejectedValue(error);
      
      // Act
      await profileController.createOrUpdateProfile(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(error);
    });
  });
  
  describe('getProfilePreferences', () => {
    test('should get profile preferences successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const preferences = {
        unitPreference: 'metric',
        goals: ['weight_loss', 'strength'],
        exercisePreferences: ['cardio', 'resistance'],
        equipmentPreferences: ['dumbbells', 'bodyweight'],
        workoutFrequency: '3x_per_week'
      };
      
      req.user = { id: userId };
      profileService.getProfilePreferences.mockResolvedValue(preferences);
      
      // Act
      await profileController.getProfilePreferences(req, res, next);
      
      // Assert
      expect(profileService.getProfilePreferences).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: preferences
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should return 404 when profile not found', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new NotFoundError(`Profile not found for user: ${userId}`);
      
      req.user = { id: userId };
      profileService.getProfilePreferences.mockRejectedValue(error);
      
      // Act
      await profileController.getProfilePreferences(req, res, next);
      
      // Assert
      expect(profileService.getProfilePreferences).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: error.message
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should return 400 when user ID is missing', async () => {
      // Arrange
      req.user = null;

      // Act
      await profileController.getProfilePreferences(req, res, next);

      // Assert
      expect(profileService.getProfilePreferences).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'User ID is required'
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should forward unexpected errors to next middleware', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new InternalError('DB Error');
      
      req.user = { id: userId };
      profileService.getProfilePreferences.mockRejectedValue(error);
      
      // Act
      await profileController.getProfilePreferences(req, res, next);
      
      // Assert
      expect(profileService.getProfilePreferences).toHaveBeenCalledWith(userId);
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
  
  describe('updateProfilePreferences', () => {
    test('should update profile preferences successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const preferenceData = {
        unitPreference: 'imperial',
        goals: ['muscle_gain']
      };
      
      const updatedPreferences = {
        unitPreference: 'imperial',
        goals: ['muscle_gain'],
        exercisePreferences: ['resistance'],
        equipmentPreferences: ['barbell', 'dumbbells'],
        workoutFrequency: '4x_per_week'
      };
      
      req.user = { id: userId };
      req.body = preferenceData;
      profileService.updateProfilePreferences.mockResolvedValue(updatedPreferences);
      
      // Act
      await profileController.updateProfilePreferences(req, res, next);
      
      // Assert
      expect(profileService.updateProfilePreferences).toHaveBeenCalledWith(userId, preferenceData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Profile preferences updated successfully',
        data: updatedPreferences
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should return 404 when profile not found', async () => {
      // Arrange
      const userId = 'user-123';
      const preferenceData = {
        unitPreference: 'imperial'
      };
      const error = new NotFoundError(`Profile not found for user: ${userId}`);
      
      req.user = { id: userId };
      req.body = preferenceData;
      profileService.updateProfilePreferences.mockRejectedValue(error);
      
      // Act
      await profileController.updateProfilePreferences(req, res, next);
      
      // Assert
      expect(profileService.updateProfilePreferences).toHaveBeenCalledWith(userId, preferenceData);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: error.message
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should return 400 when user ID is missing', async () => {
      // Arrange
      req.user = null;
      req.body = { unitPreference: 'imperial' };

      // Act
      await profileController.updateProfilePreferences(req, res, next);

      // Assert
      expect(profileService.updateProfilePreferences).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'User ID is required'
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should return 400 when preference data is empty', async () => {
      // Arrange
      req.user = { id: 'user-123' };
      req.body = {}; // Empty body

      // Act
      await profileController.updateProfilePreferences(req, res, next);

      // Assert
      expect(profileService.updateProfilePreferences).not.toHaveBeenCalled(); // Service shouldn't be called
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Preference data is required'
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should handle validation errors from service', async () => {
      // Arrange
      const userId = 'user-123';
      const preferenceData = {
        unitPreference: 'invalid_unit' // Invalid unit preference
      };
      
      const validationError = new ValidationError('Unit preference must be either "metric" or "imperial"');
      
      req.user = { id: userId };
      req.body = preferenceData;
      profileService.updateProfilePreferences.mockRejectedValue(validationError);
      
      // Act
      await profileController.updateProfilePreferences(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: validationError.message
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should forward unexpected errors to next middleware', async () => {
      // Arrange
      const userId = 'user-123';
      const preferenceData = {
        unitPreference: 'metric'
      };
      
      const error = new InternalError('DB Error');
      
      req.user = { id: userId };
      req.body = preferenceData;
      profileService.updateProfilePreferences.mockRejectedValue(error);
      
      // Act
      await profileController.updateProfilePreferences(req, res, next);
      
      // Assert
      expect(profileService.updateProfilePreferences).toHaveBeenCalledWith(userId, preferenceData);
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
}); 