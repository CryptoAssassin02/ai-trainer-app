/**
 * Abstract base class for all fitness goal strategies
 * Provides consistent interface and shared functionality
 */
class BaseGoalStrategy {
    constructor(goalName) {
        this.goalName = goalName;
        this.priority = 1; // 1 = primary, 2+ = secondary
        this.category = 'general'; // strength, hypertrophy, metabolic, performance, etc.
    }

    /**
     * Get mesocycle structure for this goal
     * @param {Object} userProfile - User profile data
     * @param {number} totalWeeks - Total program duration (8-16 weeks)
     * @param {boolean} isPrimary - Whether this is the primary goal
     * @returns {Array} Mesocycle structure array
     */
    getMesocycleStructure(userProfile, totalWeeks, isPrimary = true) {
        throw new Error(`getMesocycleStructure must be implemented by ${this.goalName} strategy`);
    }

    /**
     * Get training parameters for this goal
     * @param {string} mesocycleFocus - Current mesocycle focus
     * @param {number} weekNumber - Week within mesocycle (1-6)
     * @returns {Object} Training parameters
     */
    getTrainingParameters(mesocycleFocus, weekNumber) {
        throw new Error(`getTrainingParameters must be implemented by ${this.goalName} strategy`);
    }

    /**
     * Get goal-specific prompt instructions
     * @param {Object} context - Training context
     * @returns {string} Prompt instructions for OpenAI
     */
    getPromptInstructions(context) {
        throw new Error(`getPromptInstructions must be implemented by ${this.goalName} strategy`);
    }

    /**
     * Validate compatibility with other goals
     * @param {string[]} otherGoals - Other selected goals
     * @returns {Object} Compatibility assessment
     */
    validateCompatibility(otherGoals) {
        return { 
            compatible: true, 
            conflicts: [], 
            recommendations: [],
            synergies: []
        };
    }

    /**
     * Get recommended program duration for this goal
     * @param {Object} userProfile - User profile
     * @returns {number} Recommended weeks
     */
    getRecommendedDuration(userProfile) {
        return 12; // Default 12 weeks
    }

    /**
     * Get goal-specific exercise priorities
     * @returns {Object} Exercise selection priorities
     */
    getExercisePriorities() {
        return {
            compound: 70,    // Percentage emphasis on compound movements
            isolation: 30,   // Percentage emphasis on isolation movements
            functional: 50,  // Functional movement emphasis
            unilateral: 20,  // Unilateral training emphasis
            plyometric: 10,  // Explosive/plyometric emphasis
            cardio: 20       // Cardiovascular integration
        };
    }

    /**
     * Get progression methodology for this goal
     * @returns {Object} Progression strategy
     */
    getProgressionStrategy() {
        return {
            primary: 'linear',           // linear, undulating, block, conjugate
            volumeEmphasis: 'moderate',  // low, moderate, high
            intensityEmphasis: 'moderate', // low, moderate, high
            frequencyRange: [3, 5],      // [min, max] days per week
            deloadFrequency: 4           // Every N weeks
        };
    }

    /**
     * Get recovery requirements for this goal
     * @returns {Object} Recovery parameters
     */
    getRecoveryRequirements() {
        return {
            restBetweenSets: '60-90 seconds',
            restBetweenSessions: '24-48 hours',
            sleepRecommendation: '7-9 hours',
            activeRecoveryDays: 1,
            deloadWeekFrequency: 4
        };
    }
}

module.exports = BaseGoalStrategy;