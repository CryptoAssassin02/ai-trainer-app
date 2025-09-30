const { ValidationError } = require('./errors');

function mergeProfileWithRequest(userProfile = {}, requestData = {}) {
  const preferences = {
    ...(userProfile.preferences || {}),
    exerciseTypes: requestData.exerciseTypes || userProfile.preferences?.exerciseTypes || [],
    restrictions: requestData.restrictions || userProfile.preferences?.restrictions || [],
    workoutFrequency: requestData.workoutFrequency || userProfile.preferences?.workoutFrequency || userProfile.workoutFrequency,
    gymCategory: userProfile.gymCategory || 'minimal_home'
  };

  return {
    ...userProfile,
    fitnessLevel: requestData.fitnessLevel || userProfile.experienceLevel || userProfile.fitnessLevel,
    preferences,
    // Include additionalNotes only if provided, preferring requestData over profile
    ...(requestData.additionalNotes && requestData.additionalNotes.trim().length > 0
      ? { additionalNotes: requestData.additionalNotes.trim() }
      : (userProfile.additionalNotes && String(userProfile.additionalNotes).trim().length > 0
          ? { additionalNotes: String(userProfile.additionalNotes).trim() }
          : {}))
  };
}

function validateWorkoutGoals(goals) {
  if (!goals || !Array.isArray(goals) || goals.length === 0) {
    throw new ValidationError('Goals array is required and cannot be empty');
  }
  return true;
}

module.exports = {
  mergeProfileWithRequest,
  validateWorkoutGoals
};


