// Mock for workout-prompts.js
const generateWorkoutPrompt = jest.fn().mockImplementation(
    (userProfile, goals, researchData, injuryPrompt = '') => {
        return `Mock workout prompt for ${userProfile.fitnessLevel} user with goals: ${goals.join(', ')}${injuryPrompt ? `\nInjury notes: ${injuryPrompt}` : ''}`;
    }
);

module.exports = {
    generateWorkoutPrompt
}; 