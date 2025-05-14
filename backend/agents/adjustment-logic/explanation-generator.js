const logger = require('../../config/logger');
// Import prompt templates
const { getExplanationSummaryPrompt } = require('../../utils/adjustment-prompts');
// Placeholder: Import prompt templates when created in Step 8.3F
// const { explanationSystemPrompt, ... } = require('../../utils/adjustment-prompts');

/**
 * Generates explanations for workout plan adjustments and compares plan versions.
 */
class ExplanationGenerator {
    /**
     * Initializes the ExplanationGenerator.
     * @param {OpenAIService} openaiService - Instance of the OpenAI service.
     * @param {object} config - Agent configuration.
     * @param {Logger} loggerInstance - Logger instance.
     */
    constructor(openaiService, config = {}, loggerInstance = logger) {
        if (!openaiService) {
            throw new Error('[ExplanationGenerator] OpenAIService instance is required.');
        }
        this.openaiService = openaiService;
        this.config = config;
        this.logger = loggerInstance;
        this.logger.info('[ExplanationGenerator] Initialized.');
    }

    /**
     * Generates clear, concise explanations for the adjustments made to the plan.
     * (Part of Step 8.3D)
     * @param {Object} adjustedPlan - The final adjusted workout plan.
     * @param {Object} originalPlan - The original workout plan.
     * @param {Object} parsedFeedback - Structured feedback from FeedbackParser.
     * @param {Array} appliedChanges - List of changes successfully applied by PlanModifier.
     * @returns {Promise<Object>} A structured object containing explanations for each significant change.
     */
    async generate(adjustedPlan, originalPlan, parsedFeedback, appliedChanges) {
        this.logger.info(`[ExplanationGenerator] Generating explanations for ${appliedChanges?.length || 0} applied changes...`);
        if (!appliedChanges || appliedChanges.length === 0) {
            return { summary: "No changes were applied.", details: [] };
        }

        // Option 1: Simple rule-based explanations based on appliedChanges
        const detailedExplanations = appliedChanges.map(change => this._generateSimpleExplanation(change, parsedFeedback));

        // Option 2: Use LLM for a more narrative summary (could combine with rules)
        // const summary = await this._generateLLMSummary(adjustedPlan, originalPlan, parsedFeedback, appliedChanges);

        this.logger.info('[ExplanationGenerator] Explanation generation complete.');
        return {
            summary: `Applied ${appliedChanges.length} adjustment(s) based on feedback.`, // Placeholder summary
            details: detailedExplanations
        };
    }

    /**
     * Generates a simple explanation string for a single applied change.
     * @param {Object} change - An item from the appliedChanges array.
     * @param {Object} parsedFeedback - The original parsed feedback.
     * @returns {{changeType: string, explanation: string, details: Object}}
     * @private
     */
    _generateSimpleExplanation(change, parsedFeedback) {
        let explanation = `Applied change: ${change.type}.`;
        const details = change.details || {};
        const originalReason = details.reason || 'User request'; // Default reason
        
        // Enhance explanation based on change type
         switch (change.type) {
            case 'exerciseSubstituted':
                 explanation = `Substituted '${details.from}' with '${details.to}'`;
                 if (originalReason) explanation += ` due to: ${originalReason}.`;
                 break;
             case 'volumeAdjustment':
                 explanation = `Adjusted ${details.property} for '${details.exercise}' (${details.change})`;
                 if (details.value) explanation += ` to ${details.value}`;
                 if (originalReason) explanation += ` based on feedback: ${originalReason}.`;
                  break;
             case 'intensityAdjustment':
                 explanation = `Adjusted ${details.parameter} for '${details.exercise}' (${details.change})`;
                 if (details.value) explanation += ` towards ${details.value}`;
                 if (originalReason) explanation += ` based on feedback: ${originalReason}.`;
                 break;
             case 'scheduleChange':
                  explanation = `Modified schedule (${details.type}): ${details.details}.`;
                  if (originalReason) explanation += ` Reason: ${originalReason}.`;
                 break;
             case 'restPeriodChange':
                 explanation = `Adjusted rest periods (${details.type}, ${details.change})`;
                  if (details.value) explanation += ` towards ${details.value}`;
                  if (originalReason) explanation += ` based on feedback: ${originalReason}.`;
                 break;
            case 'equipmentLimitation':
                  explanation = `Handled equipment limitation for '${details.equipment}'. ${change.outcome || ''}`;
                 break;
             case 'painConcern':
                 explanation = `Acknowledged pain concern regarding ${details.area}. ${change.outcome || ''}`;
                 break;
             // Add more cases as needed
             default:
                 explanation = `Applied adjustment of type '${change.type}'. ${change.outcome || ''}`;
        }

        return {
            changeType: change.type,
            explanation: explanation.trim(),
            details: change.details // Include original details for context
        };
    }
    
     /**
     * (Optional) Generates a narrative summary explanation using an LLM.
     * @param {Object} adjustedPlan - The final adjusted workout plan.
     * @param {Object} originalPlan - The original workout plan.
     * @param {Object} parsedFeedback - Structured feedback from FeedbackParser.
     * @param {Array} appliedChanges - List of changes successfully applied by PlanModifier.
     * @returns {Promise<string>} A narrative summary.
     * @private
     */
     async _generateLLMSummary(adjustedPlan, originalPlan, parsedFeedback, appliedChanges) {
         this.logger.debug('[ExplanationGenerator] Calling LLM for summary explanation...');
         // Use imported prompt function
         const prompt = getExplanationSummaryPrompt(appliedChanges);
         
         try {
              const response = await this.openaiService.createChatCompletion({
                  model: this.config.model || 'gpt-4o', 
                  messages: [{ role: 'system', content: 'You are a helpful fitness coach explaining plan changes.' }, { role: 'user', content: prompt }],
                  temperature: 0.5,
                  max_tokens: 500 
              });
              return response?.choices?.[0]?.message?.content || "Summary generation failed.";
         } catch (error) {
              this.logger.error(`[ExplanationGenerator] LLM summary generation failed: ${error.message}`);
              return "Could not generate a narrative summary due to an error.";
         }
     }

    /**
     * Compares the original and adjusted plan versions, highlighting key differences.
     * (Part of Step 8.3D)
     * @param {Object} adjustedPlan - The modified workout plan.
     * @param {Object} originalPlan - The original workout plan.
     * @returns {Promise<Object>} A structured comparison highlighting major changes.
     */
    async compare(adjustedPlan, originalPlan) {
        this.logger.info('[ExplanationGenerator] Comparing original and adjusted plans...');
        const comparison = {
            summary: "Comparison complete.",
            majorChanges: [],
            structuralDiff: {} // Could include a more detailed diff if needed
        };

        if (!originalPlan || !adjustedPlan) {
            comparison.summary = "Comparison failed: One or both plans are missing.";
            return comparison;
        }

        // Example comparisons:
        if (originalPlan.planName !== adjustedPlan.planName) {
            comparison.majorChanges.push(`Plan name changed from "${originalPlan.planName}" to "${adjustedPlan.planName}".`);
        }

        // Compare workout days
        const originalDays = Object.keys(originalPlan.weeklySchedule || {});
        const adjustedDays = Object.keys(adjustedPlan.weeklySchedule || {});
        const allDays = [...new Set([...originalDays, ...adjustedDays])];
        let workoutDayCountDiff = 0;

        allDays.forEach(day => {
            const originalSession = originalPlan.weeklySchedule[day];
            const adjustedSession = adjustedPlan.weeklySchedule[day];
            const wasWorkout = typeof originalSession === 'object';
            const isWorkout = typeof adjustedSession === 'object';

            if (wasWorkout && !isWorkout) {
                comparison.majorChanges.push(`${day} changed from a workout day to a rest day.`);
                workoutDayCountDiff--;
            } else if (!wasWorkout && isWorkout) {
                comparison.majorChanges.push(`${day} changed from a rest day to a workout day (${adjustedSession.sessionName || 'New Session'}).`);
                workoutDayCountDiff++;
            } else if (wasWorkout && isWorkout) {
                // Compare exercises within the session (simplified check)
                 const originalExCount = originalSession.exercises?.length || 0;
                 const adjustedExCount = adjustedSession.exercises?.length || 0;
                 if (originalExCount !== adjustedExCount) {
                      comparison.majorChanges.push(`${day}: Number of exercises changed from ${originalExCount} to ${adjustedExCount}.`);
                 }
                 // A more detailed exercise diff could be added here
            }
        });
        
        if (workoutDayCountDiff !== 0) {
             comparison.majorChanges.push(`Total workout days changed by ${workoutDayCountDiff}.`);
        }

        // TODO: Add comparison for overall volume, intensity metrics if calculable.

        if (comparison.majorChanges.length === 0) {
             comparison.summary = "No major structural changes identified between plans.";
        }

        this.logger.info(`[ExplanationGenerator] Comparison complete. Found ${comparison.majorChanges.length} major changes.`);
        return comparison;
    }
}

module.exports = ExplanationGenerator; 