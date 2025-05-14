/**
 * ValidationUtils - Utility class for validating user profile data
 * Provides methods to validate various user attributes and nutrition-related inputs
 */
class ValidationUtils {
  /**
   * Validates essential user profile attributes
   * @param {Object} userProfile - User profile object
   * @returns {Object} - Validation result with status and messages
   */
  static validateUserProfile(userProfile) {
    const result = {
      isValid: true,
      messages: []
    };

    if (!userProfile) {
      result.isValid = false;
      result.messages.push('User profile is required');
      return result;
    }

    // Check essential attributes
    if (!this.isValidNumber(userProfile.weight)) {
      result.isValid = false;
      result.messages.push('Weight must be a valid number');
    }

    if (!this.isValidNumber(userProfile.height)) {
      result.isValid = false;
      result.messages.push('Height must be a valid number');
    }

    if (!this.isValidNumber(userProfile.age)) {
      result.isValid = false;
      result.messages.push('Age must be a valid number');
    }

    // Gender check with flexible validation
    if (userProfile.gender && !this.isValidGender(userProfile.gender)) {
      result.isValid = false;
      result.messages.push('Gender must be valid (male, female, or other)');
    }

    // Activity level validation
    if (userProfile.activityLevel && !this.isValidActivityLevel(userProfile.activityLevel)) {
      result.isValid = false;
      result.messages.push('Activity level must be valid (sedentary, light, moderate, active, very_active)');
    }

    return result;
  }

  /**
   * Validates nutritional goals from user profile
   * @param {Array} goals - User's nutritional/fitness goals
   * @returns {Object} - Validation result with status and messages
   */
  static validateGoals(goals) {
    const result = {
      isValid: true,
      messages: []
    };

    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      result.isValid = false;
      result.messages.push('At least one valid fitness goal is required');
      return result;
    }

    const validGoals = ['weight_loss', 'muscle_gain', 'maintenance', 'performance', 'general_health'];
    const invalidGoals = goals.filter(goal => !validGoals.includes(goal));

    if (invalidGoals.length > 0) {
      result.isValid = false;
      result.messages.push(`Invalid goals detected: ${invalidGoals.join(', ')}`);
    }

    // Check for conflicting goals (e.g., weight_loss and muscle_gain)
    if (goals.includes('weight_loss') && goals.includes('muscle_gain')) {
      result.messages.push('Note: Weight loss and muscle gain goals may require special consideration');
    }

    return result;
  }

  /**
   * Validates dietary preferences
   * @param {Object} preferences - User's dietary preferences
   * @returns {Object} - Validation result
   */
  static validateDietaryPreferences(preferences) {
    const result = {
      isValid: true,
      messages: []
    };

    if (!preferences) {
      return result; // Preferences are optional
    }

    // Validate diet types
    const validDietTypes = [
      'vegan', 'vegetarian', 'pescatarian', 'paleo', 'keto', 
      'mediterranean', 'gluten_free', 'dairy_free', 'no_restrictions'
    ];

    if (preferences.dietType && !validDietTypes.includes(preferences.dietType)) {
      result.isValid = false;
      result.messages.push(`Invalid diet type: ${preferences.dietType}`);
    }

    // Validate allergies
    if (preferences.allergies && !Array.isArray(preferences.allergies)) {
      result.isValid = false;
      result.messages.push('Allergies must be an array');
    }

    // Validate preferred foods
    if (preferences.preferredFoods && !Array.isArray(preferences.preferredFoods)) {
      result.isValid = false;
      result.messages.push('Preferred foods must be an array');
    }

    // Validate avoided foods
    if (preferences.avoidedFoods && !Array.isArray(preferences.avoidedFoods)) {
      result.isValid = false;
      result.messages.push('Avoided foods must be an array');
    }

    return result;
  }

  /**
   * Checks if a value is a valid number
   * @param {any} value - Value to check
   * @returns {boolean} - True if valid
   */
  static isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value) && value > 0;
  }

  /**
   * Validates gender input (case-insensitive)
   * @param {string} gender - Gender value
   * @returns {boolean} - True if valid
   */
  static isValidGender(gender) {
    if (typeof gender !== 'string') return false;
    const normalizedGender = gender.toLowerCase().trim();
    return ['male', 'female', 'other'].includes(normalizedGender);
  }

  /**
   * Validates activity level input
   * @param {string} level - Activity level
   * @returns {boolean} - True if valid
   */
  static isValidActivityLevel(level) {
    if (typeof level !== 'string') return false;
    const normalizedLevel = level.toLowerCase().trim();
    return [
      'sedentary', 'light', 'moderate', 'active', 'very_active'
    ].includes(normalizedLevel);
  }

  /**
   * Resolves conflicting goals based on priority
   * @param {Array} goals - Array of user goals
   * @returns {Object} - Resolved primary goal and secondary goals
   */
  static resolveGoalPriority(goals) {
    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      return { primaryGoal: 'general_health', secondaryGoals: [] };
    }

    // Goal priority order (highest to lowest)
    const priorityOrder = [
      'weight_loss',
      'muscle_gain',
      'performance',
      'maintenance',
      'general_health'
    ];

    // Sort goals by priority
    const sortedGoals = [...goals].sort((a, b) => {
      const priorityA = priorityOrder.indexOf(a);
      const priorityB = priorityOrder.indexOf(b);
      
      // Handle unknown goals (place them at the end)
      if (priorityA === -1) return 1;
      if (priorityB === -1) return -1;
      
      return priorityA - priorityB;
    });

    return {
      primaryGoal: sortedGoals[0],
      secondaryGoals: sortedGoals.slice(1)
    };
  }
}

module.exports = ValidationUtils; 