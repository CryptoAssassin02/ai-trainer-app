import { OpenAI } from "openai";
import { generateCompletion } from "./openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { UserProfile } from "@/lib/profile-context";

/**
 * Interface defining the common structure for all workout agent types
 */
interface WorkoutAgent {
  name: string;
  description: string;
  process(input: AgentInputType): Promise<AgentResultType>;
}

/**
 * Input data structure for agent processing
 */
export interface AgentInputType {
  profile: UserProfile;
  goals: string[];
  preferences: Record<string, any>;
  previousResults?: Record<string, any>;
  messages?: ChatCompletionMessageParam[];
  feedback?: string;
  planId?: string;
}

/**
 * Result data structure returned by agents
 */
export interface AgentResultType {
  success: boolean;
  data: Record<string, any>;
  reasoning: string;
  messages: ChatCompletionMessageParam[];
  error?: string;
}

/**
 * Memory system for maintaining agent context and personalization
 */
export class AgentMemorySystem {
  private agentHistory: Record<string, AgentResultType[]> = {};
  private userPreferences: Record<string, any> = {};
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Store agent result in memory
   */
  storeResult(agentName: string, result: AgentResultType): void {
    if (!this.agentHistory[agentName]) {
      this.agentHistory[agentName] = [];
    }
    this.agentHistory[agentName].push(result);
  }

  /**
   * Get the most recent result for a specific agent
   */
  getLatestResult(agentName: string): AgentResultType | null {
    if (!this.agentHistory[agentName] || this.agentHistory[agentName].length === 0) {
      return null;
    }
    return this.agentHistory[agentName][this.agentHistory[agentName].length - 1];
  }

  /**
   * Get all history for a specific agent
   */
  getAgentHistory(agentName: string): AgentResultType[] {
    return this.agentHistory[agentName] || [];
  }

  /**
   * Store user preferences
   */
  storeUserPreferences(preferences: Record<string, any>): void {
    this.userPreferences = { ...this.userPreferences, ...preferences };
  }

  /**
   * Get stored user preferences
   */
  getUserPreferences(): Record<string, any> {
    return this.userPreferences;
  }

  /**
   * Clear all memory for a fresh start
   */
  reset(): void {
    this.agentHistory = {};
  }
}

/**
 * Perplexity API integration - can be replaced with mock if not available
 */
class PerplexityAPI {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY;
  }

  async search(query: string): Promise<string> {
    if (!this.apiKey) {
      console.warn("Perplexity API key not found, using OpenAI as fallback");
      return this.openAIFallback(query);
    }

    try {
      const response = await fetch("https://api.perplexity.ai/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = await response.json();
      return data.answer || "";
    } catch (error) {
      console.error("Error using Perplexity API:", error);
      return this.openAIFallback(query);
    }
  }

  /**
   * OpenAI fallback for when Perplexity is unavailable
   */
  private async openAIFallback(query: string): Promise<string> {
    try {
      const messages: ChatCompletionMessageParam[] = [
        { 
          role: "system", 
          content: "You are a research assistant. Provide detailed, accurate information about exercise science, workouts, and fitness topics. Include scientific backing where possible."
        },
        { role: "user", content: query }
      ];

      const result = await generateCompletion({
        chat: messages,
        model: "gpt-4o",
        maxTokens: 1000
      });

      return typeof result === "string" ? result : result.content || "";
    } catch (error) {
      console.error("Error in OpenAI fallback:", error);
      throw new Error("Research failed with both Perplexity and OpenAI");
    }
  }
}

/**
 * Research Agent using Perplexity API (with OpenAI fallback) for exercise and fitness research
 */
export class ResearchAgent implements WorkoutAgent {
  name = "ResearchAgent";
  description = "Researches exercise science, proper form, and fitness concepts";
  private researchAPI: PerplexityAPI;

  constructor() {
    this.researchAPI = new PerplexityAPI();
  }

  async process(input: AgentInputType): Promise<AgentResultType> {
    try {
      const { profile, goals, preferences } = input;
      
      // Build the research query based on user profile and goals
      const researchQuery = this.buildResearchQuery(profile, goals, preferences);
      
      // Perform research using Perplexity API
      const researchResults = await this.researchAPI.search(researchQuery);
      
      // Structure the output
      const structuredInsights = this.structureResearchInsights(researchResults, profile, goals);
      
      // Build agent messages for the context
      const messages: ChatCompletionMessageParam[] = [
        { 
          role: "system", 
          content: `You are a fitness research agent. You've analyzed the user's profile, goals, and preferences and found research-backed information.`
        },
        {
          role: "assistant",
          content: `I've completed my research on the workout plan for ${profile.name}. Here are my insights:\n\n${structuredInsights.reasoning}`
        }
      ];
      
      return {
        success: true,
        data: structuredInsights.data,
        reasoning: structuredInsights.reasoning,
        messages: messages
      };
    } catch (error: any) {
      console.error("Research agent error:", error);
      return {
        success: false,
        data: {},
        reasoning: "Research failed due to technical issues",
        messages: [{ role: "assistant", content: "Research failed: " + error.message }],
        error: error.message
      };
    }
  }

  private buildResearchQuery(profile: UserProfile, goals: string[], preferences: Record<string, any>): string {
    const fitnessLevel = profile.experienceLevel || "beginner";
    const age = profile.age || "unknown";
    const focus = goals.join(", ");
    const equipment = preferences.equipment || "minimal equipment";
    const limitations = profile.medicalConditions || "none";
    
    return `Research-backed workout recommendations for a ${age} year old ${fitnessLevel} with goals of ${focus}. 
            Available equipment: ${equipment}. 
            Physical limitations or conditions: ${limitations}. 
            Include exercise science principles, optimal training frequency, volume recommendations, exercise selection criteria, and progression models.`;
  }

  private structureResearchInsights(rawResearch: string, profile: UserProfile, goals: string[]): { data: Record<string, any>, reasoning: string } {
    // Extract key insights from research
    const profileAnalysis = this.extractSection(rawResearch, "profile", profile);
    const goalIdentification = this.extractSection(rawResearch, "goals", goals);
    const trainingRecommendations = this.extractSection(rawResearch, "training");
    const exerciseSelectionReasoning = this.extractSection(rawResearch, "exercises");
    const progressionModel = this.extractSection(rawResearch, "progression");
    
    // Formatted reasoning for visibility
    const reasoning = `## Profile Analysis\n${profileAnalysis}\n\n` +
                     `## Goal Identification\n${goalIdentification}\n\n` +
                     `## Training Recommendations\n${trainingRecommendations}\n\n` +
                     `## Exercise Selection\n${exerciseSelectionReasoning}\n\n` +
                     `## Progression Model\n${progressionModel}`;
    
    // Structured data for the next agent
    const data = {
      profile_analysis: profileAnalysis,
      goal_identification: goalIdentification,
      training_recommendations: trainingRecommendations,
      exercise_selection: exerciseSelectionReasoning,
      progression_model: progressionModel
    };
    
    return { data, reasoning };
  }

  private extractSection(text: string, sectionHint: string, context?: any): string {
    // This is a simple extraction - in a more sophisticated implementation,
    // we could use NLP or more advanced text processing
    
    // Look for sections that might contain relevant information
    const lowercaseText = text.toLowerCase();
    const relevantParagraphs: string[] = [];
    
    const paragraphs = text.split('\n\n');
    for (const paragraph of paragraphs) {
      if (paragraph.toLowerCase().includes(sectionHint.toLowerCase())) {
        relevantParagraphs.push(paragraph);
      }
    }
    
    // If we found relevant content, return it
    if (relevantParagraphs.length > 0) {
      return relevantParagraphs.join('\n\n');
    }
    
    // If no relevant content found, generate something based on context
    if (sectionHint === "profile" && context) {
      return `Based on the profile information, this plan is designed for a ${context.experienceLevel || "beginner"} with ${context.age ? `age ${context.age}` : "unknown age"} and ${context.medicalConditions ? `limitations: ${context.medicalConditions}` : "no specified limitations"}.`;
    }
    
    if (sectionHint === "goals" && context) {
      return `The primary goals identified are: ${context.join(", ")}.`;
    }
    
    // Generic fallback
    return `No specific information about ${sectionHint} was found in the research.`;
  }
}

/**
 * Workout Generation Agent for creating personalized fitness plans
 */
export class WorkoutGenerationAgent implements WorkoutAgent {
  name = "WorkoutGenerationAgent";
  description = "Creates personalized workout plans based on research and user profile";

  async process(input: AgentInputType): Promise<AgentResultType> {
    try {
      const { profile, goals, preferences, previousResults } = input;
      
      if (!previousResults) {
        throw new Error("Research results required for workout generation");
      }
      
      // Prepare the generation prompt using research insights
      const generationMessages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: this.buildSystemPrompt(profile, goals, preferences, previousResults)
        }
      ];
      
      // Generate the workout plan
      const planContent = await generateCompletion({
        chat: generationMessages,
        model: "gpt-4o",
        maxTokens: 2500,
        responseFormatType: { type: "json_object" }
      });
      
      // Parse the plan
      const workoutPlan = typeof planContent === 'string' 
        ? this.parsePlanJson(planContent) 
        : this.parsePlanJson(planContent.content || "{}");
      
      // Extract reasoning elements
      const reasoningContent = this.extractReasoning(workoutPlan);
      
      // Add the assistant's message to the context
      const messages: ChatCompletionMessageParam[] = [
        ...generationMessages,
        {
          role: "assistant",
          content: `I've created a personalized workout plan based on your profile and goals. The plan includes:\n\n` +
                   `- ${workoutPlan.title}\n` +
                   `- ${workoutPlan.sessions} sessions per week for ${workoutPlan.duration}\n` +
                   `- Difficulty: ${workoutPlan.level}\n` +
                   `- Focus: ${workoutPlan.tags.join(", ")}\n\n` +
                   `${reasoningContent}`
        }
      ];
      
      return {
        success: true,
        data: workoutPlan,
        reasoning: reasoningContent,
        messages: messages
      };
    } catch (error: any) {
      console.error("Workout generation agent error:", error);
      return {
        success: false,
        data: {},
        reasoning: "Workout plan generation failed",
        messages: [{ role: "assistant", content: "Generation failed: " + error.message }],
        error: error.message
      };
    }
  }

  private buildSystemPrompt(
    profile: UserProfile, 
    goals: string[], 
    preferences: Record<string, any>,
    previousResults: Record<string, any>
  ): string {
    // Build a comprehensive system prompt that incorporates research findings
    return `You are a fitness program design agent specializing in creating personalized workout plans.
    
    ## USER PROFILE
    ${JSON.stringify(profile, null, 2)}
    
    ## USER GOALS
    ${goals.join(", ")}
    
    ## USER PREFERENCES
    ${JSON.stringify(preferences, null, 2)}
    
    ## RESEARCH INSIGHTS
    ${JSON.stringify(previousResults, null, 2)}
    
    ## TASK
    Create a detailed, personalized workout plan incorporating the research insights above.
    Include:
    1. Program title and description
    2. Duration (in weeks) and sessions per week
    3. Difficulty level based on user's fitness level
    4. Tags to categorize the workout
    5. Detailed exercises including sets, reps ranges, target muscles, equipment, and difficulty
    6. Full reasoning for your plan design choices
    
    For each exercise, specify:
    - name: The exercise name
    - sets: Number of sets
    - repsMin: Minimum repetitions per set
    - repsMax: Maximum repetitions per set (for a range)
    - notes: Any form tips or important notes
    - targetMuscles: Array of primary muscles targeted
    - equipment: Required equipment
    - difficulty: "beginner", "intermediate", or "advanced"
    - restTime: Recommended rest time between sets
    - alternatives: Array of alternative exercises
    
    Additionally, explain your reasoning process for:
    - Volume optimization (sets & reps)
    - Frequency determination (sessions per week)
    - Exercise selection rationale
    - Progression model for improvement
    
    RETURN A STRUCTURED JSON OBJECT THAT INCLUDES THE PLAN AND YOUR REASONING.`;
  }

  private parsePlanJson(jsonString: string): any {
    try {
      // Find JSON content within the string (in case there's additional text)
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      const jsonContent = jsonMatch ? jsonMatch[0] : jsonString;
      
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error("Error parsing workout plan JSON:", error);
      throw new Error("Invalid workout plan format");
    }
  }

  private extractReasoning(workoutPlan: any): string {
    // Extract reasoning elements from the workout plan
    let reasoning = "## Workout Plan Reasoning\n\n";
    
    if (workoutPlan.reasoning?.volumeOptimization) {
      reasoning += "### Volume Optimization\n" + workoutPlan.reasoning.volumeOptimization + "\n\n";
    }
    
    if (workoutPlan.reasoning?.frequencyDetermination) {
      reasoning += "### Frequency Determination\n" + workoutPlan.reasoning.frequencyDetermination + "\n\n";
    }
    
    if (workoutPlan.reasoning?.exerciseSelection) {
      reasoning += "### Exercise Selection\n" + workoutPlan.reasoning.exerciseSelection + "\n\n";
    }
    
    if (workoutPlan.reasoning?.progressionModel) {
      reasoning += "### Progression Model\n" + workoutPlan.reasoning.progressionModel + "\n\n";
    }
    
    return reasoning;
  }
}

/**
 * Plan Adjustment Agent for modifying workout plans based on user feedback
 */
export class PlanAdjustmentAgent implements WorkoutAgent {
  name = "PlanAdjustmentAgent";
  description = "Adjusts workout plans based on user feedback and preferences";

  async process(input: AgentInputType): Promise<AgentResultType> {
    try {
      const { profile, feedback, previousResults, planId } = input;
      
      if (!feedback) {
        throw new Error("Feedback required for plan adjustment");
      }
      
      if (!previousResults || !previousResults.data) {
        throw new Error("Original plan required for adjustment");
      }
      
      const originalPlan = previousResults.data;
      
      // Prepare the adjustment prompt
      const adjustmentMessages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: this.buildAdjustmentPrompt(profile, feedback, originalPlan)
        }
      ];
      
      // Generate the adjusted plan
      const adjustedPlanContent = await generateCompletion({
        chat: adjustmentMessages,
        model: "gpt-4o",
        maxTokens: 2500,
        responseFormatType: { type: "json_object" }
      });
      
      // Parse the adjusted plan
      const adjustedPlan = typeof adjustedPlanContent === 'string' 
        ? JSON.parse(adjustedPlanContent) 
        : JSON.parse(adjustedPlanContent.content || "{}");
      
      // Extract and format the reasoning for adjustments
      const reasoningContent = this.extractAdjustmentReasoning(adjustedPlan, feedback);
      
      // Build the messages array for context
      const messages: ChatCompletionMessageParam[] = [
        ...adjustmentMessages,
        {
          role: "assistant",
          content: `I've adjusted the workout plan based on your feedback. Here are the changes:\n\n${reasoningContent}`
        }
      ];
      
      return {
        success: true,
        data: {
          ...adjustedPlan,
          id: planId, // Preserve the original plan ID
          adjustmentFeedback: feedback,
          originalPlan: originalPlan
        },
        reasoning: reasoningContent,
        messages: messages
      };
    } catch (error: any) {
      console.error("Plan adjustment agent error:", error);
      return {
        success: false,
        data: {},
        reasoning: "Plan adjustment failed",
        messages: [{ role: "assistant", content: "Adjustment failed: " + error.message }],
        error: error.message
      };
    }
  }

  private buildAdjustmentPrompt(
    profile: UserProfile,
    feedback: string,
    originalPlan: any
  ): string {
    return `You are a fitness plan adjustment specialist. Your task is to modify an existing workout plan based on user feedback.
    
    ## USER PROFILE
    ${JSON.stringify(profile, null, 2)}
    
    ## USER FEEDBACK
    ${feedback}
    
    ## ORIGINAL PLAN
    ${JSON.stringify(originalPlan, null, 2)}
    
    ## TASK
    Analyze the user's feedback and adjust the workout plan accordingly. Consider:
    1. Exercise substitutions for any problematic exercises
    2. Volume adjustments (sets/reps)
    3. Difficulty modifications
    4. Schedule changes
    
    For each adjustment, provide clear reasoning explaining why the change addresses the user's feedback.
    
    Maintain the same structure as the original plan, but include an additional "adjustments" property
    that explains each modification made. 
    
    RETURN THE MODIFIED PLAN AS A STRUCTURED JSON OBJECT.`;
  }

  private extractAdjustmentReasoning(adjustedPlan: any, feedback: string): string {
    // Format the reasoning for adjustments
    let reasoning = "## Plan Adjustment Reasoning\n\n";
    
    reasoning += "### User Feedback\n" + feedback + "\n\n";
    
    if (adjustedPlan.adjustments) {
      reasoning += "### Adjustments Made\n" + 
        (typeof adjustedPlan.adjustments === 'string' 
          ? adjustedPlan.adjustments 
          : JSON.stringify(adjustedPlan.adjustments, null, 2)) + 
        "\n\n";
    }
    
    // Add reasoning for specific changes if available
    if (adjustedPlan.adjustmentReasoning) {
      reasoning += "### Adjustment Reasoning\n" + adjustedPlan.adjustmentReasoning + "\n\n";
    }
    
    return reasoning;
  }
}

/**
 * Nutrition Agent for calculating macros and providing dietary advice
 */
export class NutritionAgent implements WorkoutAgent {
  name = "NutritionAgent";
  description = "Provides nutrition advice and macro calculations";

  async process(input: AgentInputType): Promise<AgentResultType> {
    try {
      const { profile, goals, preferences } = input;
      
      // Prepare the nutrition prompt
      const nutritionMessages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: this.buildNutritionPrompt(profile, goals, preferences)
        }
      ];
      
      // Generate the nutrition plan
      const nutritionContent = await generateCompletion({
        chat: nutritionMessages,
        model: "gpt-4o",
        maxTokens: 1500,
        responseFormatType: { type: "json_object" }
      });
      
      // Parse the nutrition plan
      const nutritionPlan = typeof nutritionContent === 'string' 
        ? JSON.parse(nutritionContent) 
        : JSON.parse(nutritionContent.content || "{}");
      
      // Extract and format the nutrition reasoning
      const reasoningContent = this.extractNutritionReasoning(nutritionPlan);
      
      // Build the messages array for context
      const messages: ChatCompletionMessageParam[] = [
        ...nutritionMessages,
        {
          role: "assistant",
          content: `I've created nutrition recommendations to support your workout plan:\n\n${reasoningContent}`
        }
      ];
      
      return {
        success: true,
        data: nutritionPlan,
        reasoning: reasoningContent,
        messages: messages
      };
    } catch (error: any) {
      console.error("Nutrition agent error:", error);
      return {
        success: false,
        data: {},
        reasoning: "Nutrition calculation failed",
        messages: [{ role: "assistant", content: "Nutrition planning failed: " + error.message }],
        error: error.message
      };
    }
  }

  private buildNutritionPrompt(
    profile: UserProfile,
    goals: string[],
    preferences: Record<string, any>
  ): string {
    // Calculate estimated BMR and TDEE based on profile
    const { estimatedBMR, estimatedTDEE } = this.calculateEstimatedEnergy(profile);
    
    return `You are a nutrition specialist providing dietary advice to support fitness goals.
    
    ## USER PROFILE
    ${JSON.stringify(profile, null, 2)}
    
    ## USER GOALS
    ${goals.join(", ")}
    
    ## USER PREFERENCES
    ${JSON.stringify(preferences, null, 2)}
    
    ## ESTIMATED ENERGY REQUIREMENTS
    - Estimated BMR: ${estimatedBMR} calories/day
    - Estimated TDEE: ${estimatedTDEE} calories/day
    
    ## TASK
    Create a nutrition plan that supports the user's workout regimen and goals. Include:
    1. Daily calorie target
    2. Macronutrient breakdown (proteins, carbs, fats) in grams
    3. Meal timing recommendations relative to workouts
    4. Hydration guidelines
    5. Supplement recommendations (if appropriate)
    6. Sample meal plans that align with user preferences
    
    Explain your reasoning for each recommendation.
    
    RETURN A STRUCTURED JSON OBJECT WITH YOUR NUTRITION PLAN AND REASONING.`;
  }

  private calculateEstimatedEnergy(profile: UserProfile): { estimatedBMR: number, estimatedTDEE: number } {
    // Default values if profile data is missing
    const weight = profile.weight || 70; // kg
    const height = profile.height || 170; // cm
    const age = profile.age || 30;
    const gender = profile.gender || "other";
    const activityLevel = 
      profile.experienceLevel === "beginner" ? "light" : 
      profile.experienceLevel === "intermediate" ? "moderate" : 
      "active";
    
    // Simple BMR calculation using Mifflin-St Jeor Equation
    let bmr = 0;
    if (gender.toLowerCase() === "male") {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    
    // Activity multipliers
    const activityMultipliers: Record<string, number> = {
      "sedentary": 1.2,
      "light": 1.375,
      "moderate": 1.55,
      "active": 1.725,
      "very active": 1.9
    };
    
    const multiplier = activityMultipliers[activityLevel.toLowerCase()] || 1.55;
    const tdee = Math.round(bmr * multiplier);
    
    return {
      estimatedBMR: Math.round(bmr),
      estimatedTDEE: tdee
    };
  }

  private extractNutritionReasoning(nutritionPlan: any): string {
    // Format the nutrition reasoning
    let reasoning = "## Nutrition Recommendations\n\n";
    
    if (nutritionPlan.calorieTarget) {
      reasoning += "### Daily Calorie Target\n" +
        `${nutritionPlan.calorieTarget} calories per day\n\n`;
    }
    
    if (nutritionPlan.macros) {
      reasoning += "### Macronutrient Breakdown\n" +
        `- Protein: ${nutritionPlan.macros.protein}g (${nutritionPlan.macros.proteinPercentage || '~'}%)\n` +
        `- Carbohydrates: ${nutritionPlan.macros.carbs}g (${nutritionPlan.macros.carbsPercentage || '~'}%)\n` +
        `- Fat: ${nutritionPlan.macros.fat}g (${nutritionPlan.macros.fatPercentage || '~'}%)\n\n`;
    }
    
    if (nutritionPlan.mealTiming) {
      reasoning += "### Meal Timing\n" + nutritionPlan.mealTiming + "\n\n";
    }
    
    if (nutritionPlan.hydration) {
      reasoning += "### Hydration Guidelines\n" + nutritionPlan.hydration + "\n\n";
    }
    
    if (nutritionPlan.supplements) {
      reasoning += "### Supplement Recommendations\n" + nutritionPlan.supplements + "\n\n";
    }
    
    if (nutritionPlan.reasoning) {
      reasoning += "### Nutritional Reasoning\n" + nutritionPlan.reasoning + "\n\n";
    }
    
    return reasoning;
  }
}

/**
 * Factory function to create an agent of the specified type
 * @param type The type of agent to create
 * @returns A workout agent instance
 */
export function createWorkoutAgent(type: string): WorkoutAgent {
  switch (type.toLowerCase()) {
    case 'research':
      return new ResearchAgent();
    case 'generation':
      return new WorkoutGenerationAgent();
    case 'adjustment':
      return new PlanAdjustmentAgent();
    case 'nutrition':
      return new NutritionAgent();
    default:
      throw new Error(`Unknown agent type: ${type}`);
  }
} 