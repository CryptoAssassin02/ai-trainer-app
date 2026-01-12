/**
 * Example Integration of AgentMemorySystem with NutritionAgent
 * 
 * This example shows how to:
 * 1. Initialize the AgentMemorySystem
 * 2. Store agent outputs in memory
 * 3. Retrieve relevant past memories for context
 * 4. Use memory for improving personalization
 */

const { createClient } = require('@supabase/supabase-js');
const { Configuration, OpenAIApi } = require('openai');
const AgentMemorySystem = require('../agents/agent-memory-system');
const NutritionAgent = require('../agents/nutrition-agent');

// Initialize logger (this would typically be your application's logger)
const logger = {
  info: (data, message) => console.log(`[INFO] ${message}`, data),
  error: (data, message) => console.error(`[ERROR] ${message}`, data),
  warn: (data, message) => console.warn(`[WARN] ${message}`, data)
};

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI client
const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

// Initialize AgentMemorySystem
const agentMemory = new AgentMemorySystem({
  supabase,
  openai,
  logger,
  config: {
    tableName: 'agent_memory',
    embeddingModel: 'text-embedding-ada-002',
    maxResults: 5,
    similarityThreshold: 0.7
  }
});

// Initialize NutritionAgent
const nutritionAgent = new NutritionAgent({
  openai,
  supabase,
  logger
});

/**
 * Example of generating nutrition plan with memory enhancement
 * @param {string} userId - User ID
 * @param {Array<string>} goals - User goals
 * @param {string} activityLevel - User activity level
 */
async function generateNutritionPlanWithMemory(userId, goals, activityLevel) {
  try {
    logger.info({ userId }, "Generating nutrition plan with memory enhancement");
    
    // 1. Check if we have any previous nutrition plans for context
    const previousPlans = await agentMemory.getMemoriesByAgentType(userId, 'nutrition', {
      limit: 3,
      sortBy: 'created_at',
      sortDirection: 'desc'
    });
    
    // 2. Check if we have any relevant user feedback
    const userFeedback = await agentMemory.getMemoriesByMetadata(userId, {
      type: 'user_feedback',
      referenced_agent_type: 'nutrition'
    }, { limit: 3 });
    
    // 3. Process nutritional plan with the NutritionAgent
    // First standard processing
    const nutritionPlan = await nutritionAgent.process(userId, goals, activityLevel);
    
    // 4. Enhance the plan with memory context if available
    let enhancedPlan = nutritionPlan;
    
    if (previousPlans.length > 0 || userFeedback.length > 0) {
      logger.info({ 
        userId, 
        previousPlans: previousPlans.length,
        userFeedback: userFeedback.length
      }, "Enhancing nutrition plan with memory context");
      
      // Extract relevant information from previous plans
      const previousPreferences = previousPlans.map(plan => {
        try {
          const planContent = typeof plan.content === 'string' 
            ? JSON.parse(plan.content) 
            : plan.content;
          
          return {
            // Extract key data points from previous plans
            macros: planContent.calculations?.macros,
            timestamp: plan.created_at,
            mealPlan: planContent.mealPlan
          };
        } catch (error) {
          logger.warn({ plan, error }, "Error parsing previous plan");
          return null;
        }
      }).filter(plan => plan !== null);
      
      // Extract feedback insights
      const feedbackInsights = userFeedback.map(feedback => {
        try {
          const feedbackContent = typeof feedback.content === 'string'
            ? JSON.parse(feedback.content)
            : feedback.content;
          
          return {
            timestamp: feedback.created_at,
            liked: feedbackContent.liked || [],
            disliked: feedbackContent.disliked || [],
            comments: feedbackContent.comments || ""
          };
        } catch (error) {
          logger.warn({ feedback, error }, "Error parsing feedback");
          return null;
        }
      }).filter(insight => insight !== null);
      
      // Incorporate insights to enhance the plan
      // In a real implementation, you might have more sophisticated logic
      if (feedbackInsights.length > 0) {
        enhancedPlan = { ...nutritionPlan };
        
        // Simple example: adjust meal plan based on liked/disliked foods
        const allLiked = feedbackInsights.flatMap(insight => insight.liked);
        const allDisliked = feedbackInsights.flatMap(insight => insight.disliked);
        
        // Prioritize foods the user liked in previous plans
        if (allLiked.length > 0 && enhancedPlan.foodSuggestions) {
          enhancedPlan.explanations = enhancedPlan.explanations || {};
          enhancedPlan.explanations.personalization = `Based on your previous feedback, I've prioritized foods you've enjoyed before: ${allLiked.join(', ')}`;
        }
        
        // Add note about avoiding disliked foods
        if (allDisliked.length > 0) {
          enhancedPlan.explanations = enhancedPlan.explanations || {};
          enhancedPlan.explanations.personalization = (enhancedPlan.explanations.personalization || '') +
            `\nI've avoided foods you didn't enjoy previously: ${allDisliked.join(', ')}`;
        }
      }
    }
    
    // 5. Store the generated plan in memory
    await agentMemory.storeAgentResult(userId, 'nutrition', enhancedPlan);
    
    logger.info({ userId }, "Successfully generated and stored nutrition plan with memory enhancement");
    
    return enhancedPlan;
  } catch (error) {
    logger.error({ userId, error }, "Error generating nutrition plan with memory");
    throw error;
  }
}

/**
 * Example of storing user feedback about a nutrition plan
 * @param {string} userId - User ID
 * @param {string} planId - Memory ID of the nutrition plan
 * @param {Object} feedback - User feedback
 */
async function storeNutritionFeedback(userId, planId, feedback) {
  try {
    logger.info({ userId, planId }, "Storing nutrition plan feedback");
    
    // Store the feedback in memory
    await agentMemory.storeUserFeedback(userId, planId, feedback);
    
    logger.info({ userId, planId }, "Successfully stored nutrition plan feedback");
  } catch (error) {
    logger.error({ userId, planId, error }, "Error storing nutrition plan feedback");
    throw error;
  }
}

/**
 * Example of retrieving a personalized nutrition plan history
 * @param {string} userId - User ID
 */
async function getNutritionPlanHistory(userId) {
  try {
    logger.info({ userId }, "Retrieving nutrition plan history");
    
    // Get all nutrition plans for the user
    const nutritionPlans = await agentMemory.getMemoriesByAgentType(userId, 'nutrition');
    
    // Get feedback for each plan
    const planHistory = [];
    
    for (const plan of nutritionPlans) {
      // Get feedback for this plan
      const feedback = await agentMemory.getMemoriesByMetadata(userId, {
        type: 'user_feedback',
        referenced_memory_id: plan.id
      });
      
      planHistory.push({
        plan: plan,
        feedback: feedback
      });
    }
    
    logger.info({ userId, planCount: planHistory.length }, "Successfully retrieved nutrition plan history");
    
    return planHistory;
  } catch (error) {
    logger.error({ userId, error }, "Error retrieving nutrition plan history");
    throw error;
  }
}

/**
 * Example of finding similar nutrition plans based on a query
 * @param {string} userId - User ID
 * @param {string} query - Search query
 */
async function findSimilarNutritionPlans(userId, query) {
  try {
    logger.info({ userId, query }, "Searching for similar nutrition plans");
    
    // Search for similar nutrition plans
    const similarPlans = await agentMemory.searchSimilarMemories(userId, query, {
      agentType: 'nutrition',
      limit: 3
    });
    
    logger.info({ userId, count: similarPlans.length }, "Found similar nutrition plans");
    
    return similarPlans;
  } catch (error) {
    logger.error({ userId, query, error }, "Error searching for similar nutrition plans");
    throw error;
  }
}

/**
 * Example of cleaning up old memories
 * @param {string} userId - User ID
 */
async function cleanupOldMemories(userId) {
  try {
    logger.info({ userId }, "Cleaning up old memories");
    
    // Prune memories older than 90 days
    const pruneResult = await agentMemory.pruneOldMemories(userId, 90);
    
    // Consolidate similar memories to reduce redundancy
    const consolidateResult = await agentMemory.consolidateMemories(userId, {
      agentType: 'nutrition',
      similarityThreshold: 0.85
    });
    
    logger.info({ 
      userId, 
      pruned: pruneResult.pruned,
      consolidated: consolidateResult.consolidated
    }, "Successfully cleaned up memories");
    
    return {
      pruneResult,
      consolidateResult
    };
  } catch (error) {
    logger.error({ userId, error }, "Error cleaning up memories");
    throw error;
  }
}

// Export functions for potential use in an API
module.exports = {
  generateNutritionPlanWithMemory,
  storeNutritionFeedback,
  getNutritionPlanHistory,
  findSimilarNutritionPlans,
  cleanupOldMemories
}; 