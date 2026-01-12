# AI Response Mocking Guide

## Overview

This guide establishes comprehensive strategies for mocking AI agent responses in the trAIner app. Our approach covers all AI services including OpenAI for workout generation and plan adjustment, Perplexity for research, and streaming response simulation for real-time user experiences.

## Why Mock AI Responses?

**Cost Control**: AI API calls can be expensive during development and testing. Mocking prevents unnecessary charges during rapid iteration.

**Deterministic Testing**: AI responses are inherently variable. Mocking provides predictable responses for reliable test assertions.

**Edge Case Simulation**: Test scenarios that are difficult to reproduce with real AI services (errors, timeouts, specific response patterns).

**Development Velocity**: Work on frontend components without dependency on AI service availability or rate limits.

**Offline Development**: Continue development when internet connectivity is limited or AI services are unavailable.

## AI Agent Response Architecture

### Agent-Specific Response Patterns

#### Workout Generation Agent

The Workout Generation Agent creates personalized exercise routines based on user profiles, goals, and preferences.

**Core Response Structure:**
```typescript
interface WorkoutGenerationResponse {
  id: string;
  planName: string;
  exercises: Exercise[];
  reasoning: ReasoningChain;
  metadata: {
    generatedAt: string;
    userId: string;
    totalDuration: number;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    equipment: string[];
  };
  confidence: number; // 0-1 scale
}

interface Exercise {
  name: string;
  muscleGroups: string[];
  sets: number;
  reps: string; // "8-12" or "10" for specific counts
  restPeriod: string; // "60-90 seconds"
  instructions: string;
  modifications: {
    easier: string;
    harder: string;
  };
  safetyNotes: string[];
}
```

**Safety Considerations:**
- Always include safety warnings for exercises involving spine loading
- Provide modifications for users with reported injuries
- Include warm-up and cool-down recommendations
- Validate exercise progression logic (gradual intensity increases)

**Mock Response Patterns:**
```typescript
// Beginner-friendly workout
export const beginnerWorkoutResponse: WorkoutGenerationResponse = {
  id: 'workout_001',
  planName: 'Beginner Full Body Routine',
  exercises: [
    {
      name: 'Bodyweight Squats',
      muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
      sets: 3,
      reps: '8-12',
      restPeriod: '60-90 seconds',
      instructions: 'Stand with feet shoulder-width apart. Lower body as if sitting back into a chair.',
      modifications: {
        easier: 'Hold onto a chair for balance',
        harder: 'Add a pause at the bottom position'
      },
      safetyNotes: ['Keep knees aligned over toes', 'Maintain neutral spine']
    }
  ],
  reasoning: {
    thoughts: ['User is beginner level', 'No equipment available', 'Focus on fundamental movement patterns'],
    actions: ['Selected bodyweight exercises', 'Included mobility work', 'Emphasized proper form'],
    observations: ['Full body engagement', 'Progressive difficulty', 'Safety prioritized']
  },
  metadata: {
    generatedAt: '2024-01-15T10:30:00Z',
    userId: 'user_123',
    totalDuration: 45,
    difficulty: 'beginner',
    equipment: ['bodyweight']
  },
  confidence: 0.92
};
```

#### Nutrition Agent

The Nutrition Agent generates meal plans, calculates macronutrients, and provides dietary guidance.

**Core Response Structure:**
```typescript
interface NutritionResponse {
  id: string;
  planType: 'meal_plan' | 'macro_calculation' | 'dietary_advice';
  recommendations: NutritionRecommendation[];
  macroTargets: MacroTargets;
  reasoning: ReasoningChain;
  restrictions: string[];
  confidence: number;
}

interface NutritionRecommendation {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: Food[];
  totalCalories: number;
  macros: MacroBreakdown;
  preparation: {
    cookTime: number;
    difficulty: 'easy' | 'medium' | 'hard';
    instructions: string[];
  };
}

interface MacroTargets {
  dailyCalories: number;
  protein: { grams: number; percentage: number };
  carbohydrates: { grams: number; percentage: number };
  fat: { grams: number; percentage: number };
  fiber: number;
}
```

**Dietary Restriction Handling:**
- Validate against user-reported allergies
- Respect cultural and religious dietary preferences
- Provide substitutions for common restrictions (gluten-free, dairy-free, vegetarian)
- Include micronutrient considerations for restrictive diets

#### Research Agent (Perplexity)

The Research Agent queries scientific literature and provides evidence-based fitness guidance.

**Core Response Structure:**
```typescript
interface ResearchResponse {
  query: string;
  findings: ResearchFinding[];
  summary: string;
  confidence: number;
  sources: Citation[];
  lastUpdated: string;
}

interface ResearchFinding {
  topic: string;
  evidence: string;
  strengthOfEvidence: 'weak' | 'moderate' | 'strong';
  applicability: string;
  limitations: string[];
}

interface Citation {
  title: string;
  authors: string[];
  journal: string;
  year: number;
  doi?: string;
  url: string;
  relevanceScore: number; // 0-1 scale
}
```

**Evidence Quality Simulation:**
```typescript
export const exerciseResearchResponse: ResearchResponse = {
  query: 'compound vs isolation exercises for strength gains',
  findings: [
    {
      topic: 'Compound Exercise Efficiency',
      evidence: 'Compound exercises activate multiple muscle groups simultaneously, leading to greater hormonal response and overall strength gains compared to isolation exercises.',
      strengthOfEvidence: 'strong',
      applicability: 'Applies to most populations, particularly beginners and intermediate lifters',
      limitations: ['May not address specific muscle imbalances', 'Requires proper form instruction']
    }
  ],
  summary: 'Research consistently shows compound exercises provide superior strength and muscle mass gains...',
  confidence: 0.87,
  sources: [
    {
      title: 'Effects of compound vs. isolation exercises on strength and hypertrophy',
      authors: ['Smith, J.', 'Johnson, K.'],
      journal: 'Journal of Strength and Conditioning Research',
      year: 2023,
      doi: '10.1519/JSC.0000000000004321',
      url: 'https://journals.lww.com/example',
      relevanceScore: 0.94
    }
  ],
  lastUpdated: '2024-01-15T10:30:00Z'
};
```

#### Analytics Agent

The Analytics Agent processes user data to identify patterns and provide insights.

**Core Response Structure:**
```typescript
interface AnalyticsResponse {
  userId: string;
  analysisType: 'progress_tracking' | 'pattern_detection' | 'prediction' | 'recommendation';
  insights: Insight[];
  predictions: Prediction[];
  recommendations: Recommendation[];
  dataQuality: DataQualityMetrics;
  confidence: number;
}

interface Insight {
  category: 'performance' | 'consistency' | 'recovery' | 'nutrition';
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  actionable: boolean;
  supporting_data: any[];
}

interface Prediction {
  metric: string;
  timeframe: string; // "1 week", "1 month", "3 months"
  predictedValue: number;
  confidence: number;
  factors: string[];
}
```

#### Plan Adjustment Agent

The Plan Adjustment Agent modifies existing workout plans based on user feedback and performance data.

**Core Response Structure:**
```typescript
interface PlanAdjustmentResponse {
  originalPlanId: string;
  adjustmentType: 'difficulty' | 'equipment' | 'time' | 'injury' | 'preference';
  modifications: Modification[];
  reasoning: ReasoningChain;
  newPlanId: string;
  confidence: number;
}

interface Modification {
  exerciseId: string;
  changeType: 'replace' | 'modify' | 'remove' | 'add';
  before?: Exercise;
  after?: Exercise;
  rationale: string;
}
```

### Response Structure Standardization

#### Common Response Format

All AI agents follow a consistent response structure for predictable handling:

```typescript
interface BaseAIResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    agentType: 'workout' | 'nutrition' | 'research' | 'analytics' | 'adjustment';
    requestId: string;
    timestamp: string;
    processingTime: number; // milliseconds
    tokenUsage?: {
      prompt: number;
      completion: number;
      total: number;
    };
  };
  reasoning?: ReasoningChain;
  confidence?: number;
}
```

#### Reasoning Chain Structure

The reasoning chain follows the Thought → Action → Observation pattern:

```typescript
interface ReasoningChain {
  thoughts: string[]; // Internal reasoning process
  actions: string[];  // Actions taken by the agent
  observations: string[]; // Results or insights from actions
  finalDecision: string;
  alternativesConsidered?: string[];
}

// Example reasoning for workout modification
const adjustmentReasoning: ReasoningChain = {
  thoughts: [
    'User reported knee pain during squats',
    'Need to find knee-friendly alternatives',
    'Should maintain quad strengthening focus'
  ],
  actions: [
    'Replaced barbell squats with leg press',
    'Added glute bridges for posterior chain',
    'Included knee-friendly mobility work'
  ],
  observations: [
    'Reduced knee stress while maintaining muscle activation',
    'Alternative exercises still target primary muscle groups',
    'Plan maintains original difficulty level'
  ],
  finalDecision: 'Modified plan focuses on knee-friendly alternatives while preserving training stimulus',
  alternativesConsidered: [
    'Remove leg exercises entirely (rejected - too conservative)',
    'Reduce squat depth only (rejected - user comfort priority)'
  ]
};
```

#### Context Memory Handling

AI agents maintain context across interactions through structured memory:

```typescript
interface ContextMemory {
  userId: string;
  conversationId: string;
  sessionHistory: SessionEntry[];
  userPreferences: UserPreferences;
  recentFeedback: Feedback[];
  adaptationTriggers: string[];
}

interface SessionEntry {
  timestamp: string;
  agentType: string;
  input: any;
  output: any;
  userSatisfaction?: number; // 1-5 scale
}

interface UserPreferences {
  exerciseTypes: string[];
  equipmentAccess: string[];
  timeConstraints: number; // minutes
  intensityPreference: 'low' | 'moderate' | 'high';
  communicationStyle: 'brief' | 'detailed' | 'technical';
}
```

#### Confidence Scoring

Confidence scores help frontend components decide how to present AI recommendations:

```typescript
interface ConfidenceMetrics {
  overall: number; // 0-1 scale
  breakdown: {
    dataQuality: number;    // How complete/reliable is input data
    modelCertainty: number; // How confident is the AI model
    userAlignment: number;  // How well does this match user history
    safetyValidation: number; // How thoroughly were safety checks performed
  };
  reasoning: string;
  caveats: string[];
}

// High confidence example
const highConfidenceMetrics: ConfidenceMetrics = {
  overall: 0.91,
  breakdown: {
    dataQuality: 0.95,      // Complete user profile with detailed history
    modelCertainty: 0.89,   // Clear pattern matching
    userAlignment: 0.93,    // Matches previous preferences
    safetyValidation: 0.88  // All safety checks passed
  },
  reasoning: 'Recommendation based on complete user profile with consistent historical preferences',
  caveats: ['Monitor for fatigue in first week', 'Adjust if knee discomfort persists']
};
```

## OpenAI vs Perplexity Mocking

### OpenAI Response Mocking

#### Chat Completions

OpenAI's chat completion API is used for most conversational AI interactions in the app:

```typescript
interface OpenAIChatCompletion {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Choice[];
  usage: TokenUsage;
}

interface Choice {
  index: number;
  message: {
    role: 'assistant' | 'user' | 'system';
    content: string;
    function_call?: FunctionCall;
  };
  finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter';
}

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}
```

**Multi-turn Conversation Mocking:**
```typescript
export const workoutConsultationMock = {
  conversation: [
    {
      role: 'user',
      content: 'I want to build muscle but only have 30 minutes, 3 times per week'
    },
    {
      role: 'assistant',
      content: 'I can create an efficient muscle-building routine for your time constraints. Let me ask a few questions to personalize your plan...',
      function_call: {
        name: 'request_user_info',
        arguments: JSON.stringify({
          questions: ['current_fitness_level', 'equipment_access', 'previous_injuries']
        })
      }
    }
  ],
  systemMessage: {
    role: 'system',
    content: 'You are a certified personal trainer specializing in efficient workout design. Prioritize compound movements and progressive overload principles.'
  }
};
```

#### Function Calling

OpenAI's function calling feature allows structured data extraction and tool use:

```typescript
interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

// Workout generation function definition
export const workoutGenerationFunction: FunctionDefinition = {
  name: 'generate_workout_plan',
  description: 'Generate a personalized workout plan based on user parameters',
  parameters: {
    type: 'object',
    properties: {
      user_profile: {
        type: 'object',
        properties: {
          fitness_level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
          goals: { type: 'array', items: { type: 'string' } },
          equipment: { type: 'array', items: { type: 'string' } },
          time_available: { type: 'number' },
          restrictions: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    required: ['user_profile']
  }
};

// Mock function call response
export const functionCallResponse = {
  id: 'chatcmpl-123',
  object: 'chat.completion',
  created: 1699896916,
  model: 'gpt-4',
  choices: [{
    index: 0,
    message: {
      role: 'assistant',
      content: null,
      function_call: {
        name: 'generate_workout_plan',
        arguments: JSON.stringify({
          user_profile: {
            fitness_level: 'intermediate',
            goals: ['muscle_gain', 'strength'],
            equipment: ['dumbbells', 'barbell'],
            time_available: 45,
            restrictions: ['knee_injury']
          }
        })
      }
    },
    finish_reason: 'function_call'
  }],
  usage: {
    prompt_tokens: 150,
    completion_tokens: 75,
    total_tokens: 225
  }
};
```

#### Token Management

Mock token usage patterns for cost estimation and limit monitoring:

```typescript
interface TokenUsagePattern {
  operation: string;
  averagePromptTokens: number;
  averageCompletionTokens: number;
  varianceRange: number; // ±% variation
}

export const tokenUsagePatterns: TokenUsagePattern[] = [
  {
    operation: 'workout_generation',
    averagePromptTokens: 200,
    averageCompletionTokens: 800,
    varianceRange: 0.25 // ±25%
  },
  {
    operation: 'plan_adjustment',
    averagePromptTokens: 150,
    averageCompletionTokens: 300,
    varianceRange: 0.15
  },
  {
    operation: 'nutrition_advice',
    averagePromptTokens: 180,
    averageCompletionTokens: 600,
    varianceRange: 0.20
  }
];

// Cost calculation utility
export function calculateEstimatedCost(tokens: TokenUsage, model: string): number {
  const pricing = {
    'gpt-4': { prompt: 0.03, completion: 0.06 }, // per 1k tokens
    'gpt-3.5-turbo': { prompt: 0.001, completion: 0.002 }
  };
  
  const rates = pricing[model] || pricing['gpt-3.5-turbo'];
  return (tokens.prompt_tokens * rates.prompt + tokens.completion_tokens * rates.completion) / 1000;
}
```

#### Model Variations

Different OpenAI models have varying capabilities and response patterns:

```typescript
interface ModelCapabilities {
  modelName: string;
  maxContextLength: number;
  supportsFunction: boolean;
  responseQuality: 'basic' | 'good' | 'excellent';
  avgResponseTime: number; // seconds
  costMultiplier: number;
}

export const modelCapabilities: ModelCapabilities[] = [
  {
    modelName: 'gpt-4',
    maxContextLength: 8192,
    supportsFunction: true,
    responseQuality: 'excellent',
    avgResponseTime: 3.5,
    costMultiplier: 20
  },
  {
    modelName: 'gpt-3.5-turbo',
    maxContextLength: 4096,
    supportsFunction: true,
    responseQuality: 'good',
    avgResponseTime: 1.2,
    costMultiplier: 1
  }
];
```

### Perplexity Response Mocking

#### Research Query Handling

Perplexity specializes in research and information synthesis with citation support:

```typescript
interface PerplexityResponse {
  id: string;
  model: string;
  created: number;
  usage: TokenUsage;
  choices: PerplexityChoice[];
}

interface PerplexityChoice {
  index: number;
  finish_reason: string;
  message: {
    role: 'assistant';
    content: string;
  };
  delta?: {
    role?: string;
    content?: string;
  };
}

// Research query mock
export const exerciseResearchMock: PerplexityResponse = {
  id: 'pplx-123',
  model: 'pplx-7b-online',
  created: 1699896916,
  usage: {
    prompt_tokens: 100,
    completion_tokens: 400,
    total_tokens: 500
  },
  choices: [{
    index: 0,
    finish_reason: 'stop',
    message: {
      role: 'assistant',
      content: `# Progressive Overload for Strength Training

Progressive overload is the fundamental principle for increasing strength and muscle mass. Research consistently shows that gradually increasing training demands leads to continued adaptations.

## Key Research Findings

**Mechanism**: Progressive overload works by creating controlled stress that forces physiological adaptations. The body responds by building stronger muscle fibers and more efficient neural pathways[1].

**Implementation Methods**:
- Increase weight (most common method)
- Increase repetitions 
- Increase sets
- Decrease rest periods
- Improve exercise quality/range of motion[2]

## Practical Applications

For beginners, a 2.5-5% weekly increase in load is typically sustainable. Intermediate lifters may progress at 1-2% weekly, while advanced lifters often require periodized approaches[3].

## Safety Considerations

Rapid progression increases injury risk. Studies indicate that increases >10% per week correlate with higher injury rates, particularly in novice lifters[4].

---
[1] Schoenfeld, B. J. (2010). The mechanisms of muscle hypertrophy. Journal of Strength and Conditioning Research.
[2] American College of Sports Medicine. (2009). Progression models in resistance training. Medicine & Science in Sports & Exercise.
[3] Rhea, M. R. (2004). Determining the magnitude of treatment effects in strength training research. Journal of Strength and Conditioning Research.
[4] Gabbett, T. J. (2016). The training-injury prevention paradox. British Journal of Sports Medicine.`
    }
  }]
};
```

#### Citation Management

Perplexity provides cited sources for research claims:

```typescript
interface CitationExtractor {
  extractCitations(content: string): Citation[];
  validateSources(citations: Citation[]): ValidationResult[];
  formatForDisplay(citations: Citation[]): string;
}

export class MockCitationExtractor implements CitationExtractor {
  extractCitations(content: string): Citation[] {
    // Extract citation markers [1], [2], etc.
    const citationPattern = /\[(\d+)\]/g;
    const markers = [...content.matchAll(citationPattern)];
    
    return markers.map((match, index) => ({
      id: match[1],
      title: `Research Study ${index + 1}`,
      authors: [`Author ${index + 1}`, `Co-Author ${index + 1}`],
      journal: 'Journal of Sports Science',
      year: 2020 + index,
      doi: `10.1234/example.${index}`,
      url: `https://pubmed.example.com/${index}`,
      relevanceScore: 0.8 + (index * 0.05),
      extractedAt: new Date().toISOString()
    }));
  }

  validateSources(citations: Citation[]): ValidationResult[] {
    return citations.map(citation => ({
      citationId: citation.id,
      isValid: true,
      hasValidDOI: !!citation.doi,
      isRecentPublication: citation.year >= 2015,
      warnings: citation.year < 2010 ? ['Publication may be outdated'] : []
    }));
  }

  formatForDisplay(citations: Citation[]): string {
    return citations.map(c => 
      `${c.authors.join(', ')} (${c.year}). ${c.title}. ${c.journal}.`
    ).join('\n');
  }
}
```

#### Search Result Formatting

Perplexity structures research findings with clear organization:

```typescript
interface ResearchStructure {
  query: string;
  executiveSummary: string;
  sections: ResearchSection[];
  methodology: string;
  limitations: string[];
  practicalApplications: string[];
  relatedTopics: string[];
}

interface ResearchSection {
  heading: string;
  content: string;
  evidence_strength: 'limited' | 'moderate' | 'strong';
  citations: number[];
  keyPoints: string[];
}

export const nutritionTimingResearch: ResearchStructure = {
  query: 'pre-workout nutrition timing for strength training',
  executiveSummary: 'Pre-workout nutrition timing can influence performance, with carbohydrate intake 1-4 hours before training showing consistent benefits for strength and power output.',
  sections: [
    {
      heading: 'Carbohydrate Timing',
      content: 'Consuming 1-4g of carbohydrates per kg body weight 1-4 hours before training enhances glycogen availability and performance outcomes.',
      evidence_strength: 'strong',
      citations: [1, 2, 3],
      keyPoints: [
        'Timing window of 1-4 hours allows for digestion',
        'Dose-dependent response up to 4g/kg body weight',
        'Greatest benefits seen in sessions >60 minutes'
      ]
    },
    {
      heading: 'Protein Considerations',
      content: 'Pre-workout protein intake (20-25g) may support muscle protein synthesis, though post-workout timing appears more critical.',
      evidence_strength: 'moderate',
      citations: [4, 5],
      keyPoints: [
        '20-25g provides adequate amino acid availability',
        'Post-workout protein timing more crucial',
        'Combined carb-protein intake may be optimal'
      ]
    }
  ],
  methodology: 'Systematic review of randomized controlled trials published 2015-2024',
  limitations: [
    'Most studies focus on trained males',
    'Limited research on female athletes',
    'Individual variation in digestion rates not accounted for'
  ],
  practicalApplications: [
    'Consume 1-2g carbs/kg body weight 2-3 hours before training',
    'Include 20g protein if training duration >90 minutes',
    'Experiment with timing based on individual tolerance'
  ],
  relatedTopics: [
    'Post-workout nutrition timing',
    'Hydration strategies for strength training',
    'Supplement timing protocols'
  ]
};
```

#### API Difference Simulation

Mock the key differences between Perplexity and OpenAI APIs:

```typescript
interface ServiceDifferences {
  perplexity: {
    strengths: string[];
    limitations: string[];
    uniqueFeatures: string[];
    responseFormat: string;
  };
  openai: {
    strengths: string[];
    limitations: string[];
    uniqueFeatures: string[];
    responseFormat: string;
  };
}

export const serviceDifferences: ServiceDifferences = {
  perplexity: {
    strengths: [
      'Real-time web search integration',
      'Automatic citation generation',
      'Current information access',
      'Research paper synthesis'
    ],
    limitations: [
      'Less creative/conversational',
      'Limited function calling',
      'Higher latency for web searches',
      'Less context window flexibility'
    ],
    uniqueFeatures: [
      'Web search integration',
      'Citation tracking',
      'Source validation',
      'Real-time data access'
    ],
    responseFormat: 'Research-focused with citations'
  },
  openai: {
    strengths: [
      'Superior conversational ability',
      'Advanced function calling',
      'Better creative tasks',
      'Larger context windows'
    ],
    limitations: [
      'Knowledge cutoff limitations',
      'No real-time information',
      'No automatic citations',
      'Higher cost for GPT-4'
    ],
    uniqueFeatures: [
      'Function calling',
      'Vision capabilities (GPT-4V)',
      'Code interpretation',
      'DALL-E integration'
    ],
    responseFormat: 'Conversational with structured outputs'
  }
};
``` 

## Streaming Response Simulation

### Server-Sent Events (SSE) Mocking

Streaming responses provide real-time feedback to users during AI processing. Mock SSE implementations must simulate realistic timing patterns and handle various scenarios.

#### Progressive Response Building

Mock token-by-token streaming for natural language generation:

```typescript
interface StreamingChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: StreamChoice[];
}

interface StreamChoice {
  index: number;
  delta: {
    role?: string;
    content?: string;
    function_call?: {
      name?: string;
      arguments?: string;
    };
  };
  finish_reason?: 'stop' | 'length' | 'function_call' | null;
}

export class StreamingResponseMock {
  private chunks: string[];
  private currentIndex: number = 0;
  private intervalId?: NodeJS.Timeout;

  constructor(private fullResponse: string, private options: StreamingOptions = {}) {
    this.chunks = this.splitIntoChunks(fullResponse);
  }

  private splitIntoChunks(text: string): string[] {
    // Simulate realistic token boundaries
    const words = text.split(' ');
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const word of words) {
      if (currentChunk.length + word.length > this.options.avgChunkSize || Math.random() < 0.1) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = word + ' ';
      } else {
        currentChunk += word + ' ';
      }
    }
    if (currentChunk) chunks.push(currentChunk);
    
    return chunks;
  }

  async startStreaming(onChunk: (chunk: StreamingChunk) => void, onComplete: () => void): Promise<void> {
    const baseDelay = this.options.baseDelay || 50; // ms
    const variance = this.options.delayVariance || 0.3;
    
    return new Promise((resolve) => {
      const sendNextChunk = () => {
        if (this.currentIndex >= this.chunks.length) {
          // Send final chunk with finish_reason
          onChunk({
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: 'gpt-4',
            choices: [{
              index: 0,
              delta: {},
              finish_reason: 'stop'
            }]
          });
          onComplete();
          resolve();
          return;
        }

        const chunk: StreamingChunk = {
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: 'gpt-4',
          choices: [{
            index: 0,
            delta: {
              content: this.chunks[this.currentIndex]
            },
            finish_reason: null
          }]
        };

        onChunk(chunk);
        this.currentIndex++;

        // Variable delay for realistic timing
        const delay = baseDelay + (Math.random() - 0.5) * variance * baseDelay;
        setTimeout(sendNextChunk, delay);
      };

      sendNextChunk();
    });
  }

  cancel(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

interface StreamingOptions {
  avgChunkSize?: number;
  baseDelay?: number;
  delayVariance?: number;
  includeThinking?: boolean;
}
```

#### Realistic Timing Patterns

Simulate natural delays that occur during AI processing:

```typescript
export class TimingPatternSimulator {
  static readonly PATTERNS = {
    THINKING: { baseDelay: 200, variance: 0.5 }, // Longer pauses for reasoning
    WRITING: { baseDelay: 50, variance: 0.3 },   // Steady typing
    FUNCTION_CALL: { baseDelay: 800, variance: 0.2 }, // Processing delay
    RESEARCH: { baseDelay: 1200, variance: 0.4 }  // External API calls
  };

  static simulateThinkingDelay(): Promise<void> {
    const pattern = this.PATTERNS.THINKING;
    const delay = pattern.baseDelay + (Math.random() - 0.5) * pattern.variance * pattern.baseDelay;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  static simulateResearchDelay(): Promise<void> {
    const pattern = this.PATTERNS.RESEARCH;
    const delay = pattern.baseDelay + (Math.random() - 0.5) * pattern.variance * pattern.baseDelay;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  static getTypingInterval(): number {
    const pattern = this.PATTERNS.WRITING;
    return pattern.baseDelay + (Math.random() - 0.5) * pattern.variance * pattern.baseDelay;
  }
}

// Example usage in mock
export const workoutGenerationStreamMock = async (onChunk: Function, onComplete: Function) => {
  // Simulate initial processing delay
  await TimingPatternSimulator.simulateThinkingDelay();
  
  const stream = new StreamingResponseMock(
    "I'll create a personalized workout plan for you. Let me analyze your profile... Based on your intermediate fitness level and access to dumbbells, I recommend a 3-day full-body routine focusing on compound movements...",
    { baseDelay: 50, delayVariance: 0.3 }
  );
  
  await stream.startStreaming(onChunk, onComplete);
};
```

#### Interruption Handling

Mock user cancellation and timeout scenarios:

```typescript
export class InterruptibleStreamMock {
  private isActive = true;
  private timeoutId?: NodeJS.Timeout;
  
  constructor(private streamMock: StreamingResponseMock, private timeoutMs: number = 30000) {}

  async start(onChunk: Function, onComplete: Function, onError: Function): Promise<void> {
    // Set timeout for long operations
    this.timeoutId = setTimeout(() => {
      if (this.isActive) {
        this.cancel();
        onError(new Error('Request timeout'));
      }
    }, this.timeoutMs);

    try {
      await this.streamMock.startStreaming(
        (chunk) => {
          if (this.isActive) onChunk(chunk);
        },
        () => {
          if (this.isActive) {
            this.cleanup();
            onComplete();
          }
        }
      );
    } catch (error) {
      if (this.isActive) {
        this.cleanup();
        onError(error);
      }
    }
  }

  cancel(): void {
    this.isActive = false;
    this.streamMock.cancel();
    this.cleanup();
  }

  private cleanup(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}

// MSW handler for streaming with cancellation
export const streamingWorkoutHandler = rest.post('/api/workouts/generate', async (req, res, ctx) => {
  const controller = new AbortController();
  
  // Handle request cancellation
  req.signal?.addEventListener('abort', () => {
    controller.abort();
  });

  return new Promise((resolve) => {
    const stream = new InterruptibleStreamMock(
      new StreamingResponseMock("Generating your workout plan..."),
      30000
    );

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        stream.start(
          (chunk) => {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          },
          () => {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            resolve(res(ctx.body(readable)));
          },
          (error) => {
            controller.error(error);
          }
        );
      },
      cancel() {
        stream.cancel();
      }
    });
  });
});
```

#### Connection Management

Handle WebSocket-like persistent connections for real-time features:

```typescript
export class PersistentConnectionMock {
  private connections = new Map<string, ConnectionState>();
  private heartbeatInterval?: NodeJS.Timeout;

  interface ConnectionState {
    id: string;
    isActive: boolean;
    lastHeartbeat: number;
    messageQueue: any[];
    onMessage?: (message: any) => void;
  }

  connect(connectionId: string, onMessage: (message: any) => void): void {
    this.connections.set(connectionId, {
      id: connectionId,
      isActive: true,
      lastHeartbeat: Date.now(),
      messageQueue: [],
      onMessage
    });

    // Send connection confirmation
    this.sendMessage(connectionId, {
      type: 'connection_established',
      connectionId,
      timestamp: Date.now()
    });

    // Start heartbeat if not already running
    if (!this.heartbeatInterval) {
      this.startHeartbeat();
    }
  }

  disconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isActive = false;
      this.connections.delete(connectionId);
    }

    // Stop heartbeat if no active connections
    if (this.connections.size === 0 && this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  sendMessage(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.isActive && connection.onMessage) {
      connection.onMessage({
        ...message,
        connectionId,
        timestamp: Date.now()
      });
    }
  }

  broadcastToAll(message: any): void {
    for (const [connectionId] of this.connections) {
      this.sendMessage(connectionId, message);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      for (const [connectionId, connection] of this.connections) {
        if (connection.isActive) {
          this.sendMessage(connectionId, {
            type: 'heartbeat',
            timestamp: now
          });
          connection.lastHeartbeat = now;
        }
      }
    }, 30000); // 30 second heartbeat
  }
}
```

### Reasoning Step Streaming

#### Step-by-Step Revelation

Simulate the progressive revelation of AI reasoning:

```typescript
interface ReasoningStep {
  step: number;
  type: 'thought' | 'action' | 'observation' | 'decision';
  content: string;
  confidence?: number;
  metadata?: any;
}

export class ReasoningStreamMock {
  private steps: ReasoningStep[];
  private currentStep = 0;

  constructor(private scenario: string) {
    this.steps = this.generateReasoningSteps(scenario);
  }

  private generateReasoningSteps(scenario: string): ReasoningStep[] {
    switch (scenario) {
      case 'workout_generation':
        return [
          {
            step: 1,
            type: 'thought',
            content: 'User is intermediate level with limited time. Need to focus on compound movements for efficiency.',
            confidence: 0.9
          },
          {
            step: 2,
            type: 'action',
            content: 'Researching evidence-based compound exercise protocols for intermediate lifters.',
            metadata: { searchQuery: 'compound exercises intermediate training' }
          },
          {
            step: 3,
            type: 'observation',
            content: 'Research shows 3-4 compound movements per session optimal for intermediate lifters in 45-minute sessions.',
            confidence: 0.85
          },
          {
            step: 4,
            type: 'decision',
            content: 'Selected squat, bench press, bent-over row, and overhead press as foundation exercises.',
            metadata: { exercises: ['squat', 'bench_press', 'bent_row', 'overhead_press'] }
          }
        ];

      case 'plan_adjustment_injury':
        return [
          {
            step: 1,
            type: 'thought',
            content: 'User reported knee pain during squats. Safety is priority - need knee-friendly alternatives.',
            confidence: 1.0
          },
          {
            step: 2,
            type: 'action',
            content: 'Analyzing knee-friendly quad strengthening alternatives.',
            metadata: { contraindications: ['knee_flexion_under_load'] }
          },
          {
            step: 3,
            type: 'observation',
            content: 'Leg press and wall sits provide quad activation with reduced knee stress.',
            confidence: 0.9
          },
          {
            step: 4,
            type: 'decision',
            content: 'Replaced barbell squats with leg press. Added glute bridges for posterior chain.',
            metadata: { replacements: [{ from: 'barbell_squat', to: 'leg_press' }] }
          }
        ];

      default:
        return [];
    }
  }

  async streamReasoning(onStep: (step: ReasoningStep) => void, onComplete: () => void): Promise<void> {
    for (const step of this.steps) {
      // Simulate thinking time based on step complexity
      const delay = this.calculateStepDelay(step);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      onStep(step);
      this.currentStep++;
    }
    
    onComplete();
  }

  private calculateStepDelay(step: ReasoningStep): number {
    const baseDelays = {
      thought: 800,    // Thinking takes time
      action: 1200,    // Actions may involve external calls
      observation: 600, // Processing results
      decision: 400    // Final decisions are quicker
    };
    
    const baseDelay = baseDelays[step.type];
    const variance = 0.3;
    return baseDelay + (Math.random() - 0.5) * variance * baseDelay;
  }
}
```

#### Interactive Feedback

Mock mid-stream user input and course correction:

```typescript
export class InteractiveReasoningMock {
  private isPaused = false;
  private userFeedback: string[] = [];

  async streamWithInteraction(
    scenario: string,
    onStep: (step: ReasoningStep) => void,
    onFeedbackRequest: (prompt: string) => Promise<string>,
    onComplete: () => void
  ): Promise<void> {
    const reasoningStream = new ReasoningStreamMock(scenario);
    
    // Override the streaming to allow interaction
    const steps = reasoningStream['steps'];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Check for interaction points
      if (step.type === 'action' && step.content.includes('research')) {
        onStep(step);
        
        // Request user feedback
        const feedback = await onFeedbackRequest(
          `I'm about to research ${step.metadata?.searchQuery}. Any specific focus areas?`
        );
        
        if (feedback.trim()) {
          this.userFeedback.push(feedback);
          
          // Add user feedback step
          onStep({
            step: i + 0.5,
            type: 'observation',
            content: `User feedback: ${feedback}. Incorporating into research focus.`,
            confidence: 1.0,
            metadata: { userInput: true }
          });
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 600));
        onStep(step);
      }
    }
    
    onComplete();
  }
}

// React hook for interactive reasoning
export function useInteractiveReasoning() {
  const [currentStep, setCurrentStep] = useState<ReasoningStep | null>(null);
  const [feedbackRequest, setFeedbackRequest] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const startReasoning = (scenario: string) => {
    const mock = new InteractiveReasoningMock();
    
    mock.streamWithInteraction(
      scenario,
      setCurrentStep,
      async (prompt) => {
        setFeedbackRequest(prompt);
        // Return promise that resolves when user provides feedback
        return new Promise((resolve) => {
          // Implementation depends on UI framework
        });
      },
      () => setIsComplete(true)
    );
  };

  return { currentStep, feedbackRequest, isComplete, startReasoning };
}
```

#### Multi-Stage Processing

Mock complex pipelines like Research → Analysis → Recommendation:

```typescript
export class MultiStageProcessingMock {
  private stages: ProcessingStage[];
  private currentStage = 0;

  interface ProcessingStage {
    name: string;
    description: string;
    estimatedDuration: number;
    steps: ReasoningStep[];
  }

  constructor(private processingType: string) {
    this.stages = this.defineStages(processingType);
  }

  private defineStages(type: string): ProcessingStage[] {
    switch (type) {
      case 'comprehensive_workout_plan':
        return [
          {
            name: 'Research',
            description: 'Gathering evidence-based exercise recommendations',
            estimatedDuration: 5000,
            steps: [
              { step: 1, type: 'action', content: 'Searching exercise science literature...' },
              { step: 2, type: 'observation', content: 'Found 15 relevant studies on intermediate training...' }
            ]
          },
          {
            name: 'Analysis',
            description: 'Analyzing user profile and research data',
            estimatedDuration: 3000,
            steps: [
              { step: 3, type: 'thought', content: 'Correlating research findings with user goals...' },
              { step: 4, type: 'observation', content: 'Identified optimal training variables...' }
            ]
          },
          {
            name: 'Generation',
            description: 'Creating personalized workout plan',
            estimatedDuration: 4000,
            steps: [
              { step: 5, type: 'action', content: 'Generating exercise selection and programming...' },
              { step: 6, type: 'decision', content: 'Finalized 3-day full-body routine...' }
            ]
          }
        ];

      default:
        return [];
    }
  }

  async processWithStages(
    onStageStart: (stage: ProcessingStage, index: number) => void,
    onStep: (step: ReasoningStep, stageIndex: number) => void,
    onStageComplete: (stage: ProcessingStage, index: number) => void,
    onComplete: () => void
  ): Promise<void> {
    for (const [index, stage] of this.stages.entries()) {
      onStageStart(stage, index);
      
      // Process all steps in current stage
      const reasoningMock = new ReasoningStreamMock('custom');
      reasoningMock['steps'] = stage.steps;
      
      await reasoningMock.streamReasoning(
        (step) => onStep(step, index),
        () => onStageComplete(stage, index)
      );
    }
    
    onComplete();
  }
}
```

#### Progress Indicators

Provide realistic progress feedback during long-running operations:

```typescript
export class ProgressIndicatorMock {
  private startTime = Date.now();
  private estimatedDuration: number;
  private checkpoints: ProgressCheckpoint[];

  interface ProgressCheckpoint {
    percentage: number;
    description: string;
    timeElapsed: number;
  }

  constructor(operation: string, estimatedDuration: number) {
    this.estimatedDuration = estimatedDuration;
    this.checkpoints = this.defineCheckpoints(operation);
  }

  private defineCheckpoints(operation: string): ProgressCheckpoint[] {
    switch (operation) {
      case 'workout_generation':
        return [
          { percentage: 10, description: 'Analyzing user profile...', timeElapsed: 0.1 },
          { percentage: 30, description: 'Researching exercise options...', timeElapsed: 0.3 },
          { percentage: 60, description: 'Designing workout structure...', timeElapsed: 0.6 },
          { percentage: 85, description: 'Validating safety guidelines...', timeElapsed: 0.8 },
          { percentage: 100, description: 'Workout plan ready!', timeElapsed: 1.0 }
        ];
      
      default:
        return [
          { percentage: 50, description: 'Processing...', timeElapsed: 0.5 },
          { percentage: 100, description: 'Complete', timeElapsed: 1.0 }
        ];
    }
  }

  startProgressTracking(onUpdate: (progress: ProgressUpdate) => void): void {
    let checkpointIndex = 0;
    
    const updateProgress = () => {
      if (checkpointIndex >= this.checkpoints.length) return;
      
      const checkpoint = this.checkpoints[checkpointIndex];
      const elapsed = Date.now() - this.startTime;
      const estimatedTimeRemaining = this.estimatedDuration - elapsed;
      
      onUpdate({
        percentage: checkpoint.percentage,
        description: checkpoint.description,
        timeElapsed: elapsed,
        estimatedTimeRemaining: Math.max(0, estimatedTimeRemaining),
        isComplete: checkpoint.percentage === 100
      });
      
      checkpointIndex++;
      
      if (checkpointIndex < this.checkpoints.length) {
        const nextCheckpoint = this.checkpoints[checkpointIndex];
        const delay = this.estimatedDuration * (nextCheckpoint.timeElapsed - checkpoint.timeElapsed);
        setTimeout(updateProgress, delay);
      }
    };
    
    updateProgress();
  }
}

interface ProgressUpdate {
  percentage: number;
  description: string;
  timeElapsed: number;
  estimatedTimeRemaining: number;
  isComplete: boolean;
}
```

## Tiered Mocking Complexity

### Simple Response Mocking

For rapid development and basic component testing, provide simple, static responses:

```typescript
// Level 1: Static responses for quick iteration
export const simpleWorkoutMock = {
  id: 'workout_simple_001',
  planName: 'Basic Full Body',
  exercises: [
    { name: 'Push-ups', sets: 3, reps: '10-15' },
    { name: 'Squats', sets: 3, reps: '12-15' },
    { name: 'Planks', sets: 3, reps: '30-60 seconds' }
  ],
  confidence: 0.8
};

export const simpleNutritionMock = {
  dailyCalories: 2000,
  macros: { protein: 150, carbs: 200, fat: 67 },
  recommendations: ['Eat protein with every meal', 'Stay hydrated']
};

// Quick MSW handlers for development
export const simpleHandlers = [
  rest.post('/api/workouts/generate', (req, res, ctx) => {
    return res(ctx.delay(500), ctx.json(simpleWorkoutMock));
  }),
  
  rest.post('/api/nutrition/calculate', (req, res, ctx) => {
    return res(ctx.delay(300), ctx.json(simpleNutritionMock));
  })
];
```

### Detailed Response Mocking

For integration testing and user acceptance testing, provide comprehensive responses:

```typescript
// Level 2: Dynamic, context-aware responses
export class DetailedResponseMock {
  static generateWorkout(userProfile: UserProfile): WorkoutGenerationResponse {
    const difficulty = userProfile.fitnessLevel;
    const equipment = userProfile.equipment || [];
    const goals = userProfile.goals || [];
    
    // Dynamic exercise selection based on profile
    const exercises = this.selectExercises(difficulty, equipment, goals);
    
    return {
      id: `workout_${Date.now()}`,
      planName: this.generatePlanName(goals, difficulty),
      exercises,
      reasoning: this.generateReasoning(userProfile, exercises),
      metadata: {
        generatedAt: new Date().toISOString(),
        userId: userProfile.userId,
        totalDuration: this.calculateDuration(exercises),
        difficulty,
        equipment
      },
      confidence: this.calculateConfidence(userProfile)
    };
  }

  private static selectExercises(difficulty: string, equipment: string[], goals: string[]): Exercise[] {
    const exerciseDatabase = {
      beginner: {
        bodyweight: ['push-ups', 'squats', 'lunges', 'planks'],
        dumbbells: ['dumbbell press', 'dumbbell rows', 'goblet squats']
      },
      intermediate: {
        bodyweight: ['diamond push-ups', 'pistol squats', 'pull-ups'],
        dumbbells: ['dumbbell flyes', 'renegade rows', 'bulgarian split squats'],
        barbell: ['bench press', 'deadlifts', 'barbell rows']
      },
      advanced: {
        bodyweight: ['one-arm push-ups', 'handstand push-ups', 'muscle-ups'],
        dumbbells: ['single-arm snatches', 'turkish get-ups'],
        barbell: ['clean and press', 'front squats', 'sumo deadlifts']
      }
    };

    // Select appropriate exercises based on user profile
    const availableExercises = exerciseDatabase[difficulty] || exerciseDatabase.beginner;
    const selectedExercises = [];

    // Prioritize equipment user has available
    for (const equipmentType of equipment) {
      if (availableExercises[equipmentType]) {
        selectedExercises.push(...availableExercises[equipmentType].slice(0, 2));
      }
    }

    // Fill in with bodyweight if needed
    if (selectedExercises.length < 4 && availableExercises.bodyweight) {
      selectedExercises.push(...availableExercises.bodyweight.slice(0, 4 - selectedExercises.length));
    }

    return selectedExercises.map(name => ({
      name,
      muscleGroups: this.getMuscleGroups(name),
      sets: difficulty === 'beginner' ? 2 : difficulty === 'intermediate' ? 3 : 4,
      reps: this.getRepRange(name, difficulty),
      restPeriod: difficulty === 'beginner' ? '60-90 seconds' : '90-120 seconds',
      instructions: this.getInstructions(name),
      modifications: this.getModifications(name),
      safetyNotes: this.getSafetyNotes(name)
    }));
  }

  private static generateReasoning(profile: UserProfile, exercises: Exercise[]): ReasoningChain {
    return {
      thoughts: [
        `User is ${profile.fitnessLevel} level`,
        `Available equipment: ${profile.equipment?.join(', ') || 'bodyweight only'}`,
        `Primary goals: ${profile.goals?.join(', ') || 'general fitness'}`
      ],
      actions: [
        'Selected compound movements for efficiency',
        'Adjusted volume based on experience level',
        'Included progression options'
      ],
      observations: [
        `Plan includes ${exercises.length} exercises`,
        'Balanced muscle group coverage',
        'Appropriate intensity for user level'
      ],
      finalDecision: `Created ${profile.fitnessLevel} workout targeting ${profile.goals?.join(' and ')}`
    };
  }
}
```

### Streaming Response Mocking

For production-like behavior testing, implement full streaming simulation:

```typescript
// Level 3: Production-fidelity streaming responses
export class ProductionStreamingMock {
  private connectionPool = new Map<string, WebSocket>();
  private messageQueue = new Map<string, any[]>();

  simulateProductionWorkflow(
    userId: string,
    operation: string,
    onProgress: (update: any) => void,
    onComplete: (result: any) => void,
    onError: (error: any) => void
  ): void {
    const connectionId = `${userId}_${operation}_${Date.now()}`;
    
    // Simulate connection establishment
    setTimeout(() => {
      onProgress({ type: 'connection_established', connectionId });
      
      // Start multi-stage processing
      this.processWithRealisticTiming(operation, onProgress, onComplete, onError);
    }, 100);
  }

  private async processWithRealisticTiming(
    operation: string,
    onProgress: Function,
    onComplete: Function,
    onError: Function
  ): Promise<void> {
    try {
      const stages = this.getOperationStages(operation);
      
      for (const [index, stage] of stages.entries()) {
        onProgress({
          type: 'stage_start',
          stage: stage.name,
          progress: (index / stages.length) * 100
        });

        // Simulate realistic processing with potential delays
        if (stage.hasExternalDependency) {
          await this.simulateExternalApiCall(stage.name);
        }
        
        // Simulate stage completion with variable timing
        await this.processStage(stage, onProgress);
        
        onProgress({
          type: 'stage_complete',
          stage: stage.name,
          progress: ((index + 1) / stages.length) * 100
        });
      }
      
      // Final result generation
      const result = await this.generateFinalResult(operation);
      onComplete(result);
      
    } catch (error) {
      onError(error);
    }
  }

  private async simulateExternalApiCall(stageName: string): Promise<void> {
    // Simulate network variability
    const baseDelay = 800;
    const networkJitter = Math.random() * 400; // ±200ms
    const processingTime = Math.random() * 1000; // up to 1s processing
    
    await new Promise(resolve => 
      setTimeout(resolve, baseDelay + networkJitter + processingTime)
    );
    
    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      throw new Error(`External API timeout during ${stageName}`);
    }
  }

  private getOperationStages(operation: string): ProcessingStage[] {
    const stageDefinitions = {
      comprehensive_workout: [
        { name: 'Profile Analysis', hasExternalDependency: false, duration: 1000 },
        { name: 'Exercise Research', hasExternalDependency: true, duration: 3000 },
        { name: 'Plan Generation', hasExternalDependency: false, duration: 2000 },
        { name: 'Safety Validation', hasExternalDependency: false, duration: 1500 },
        { name: 'Personalization', hasExternalDependency: false, duration: 1000 }
      ],
      nutrition_planning: [
        { name: 'Dietary Assessment', hasExternalDependency: false, duration: 800 },
        { name: 'Nutritional Research', hasExternalDependency: true, duration: 2500 },
        { name: 'Meal Planning', hasExternalDependency: false, duration: 2000 },
        { name: 'Macro Calculation', hasExternalDependency: false, duration: 500 }
      ]
    };
    
    return stageDefinitions[operation] || [];
  }
}
```

## AI-Specific Testing Scenarios

### Constraint & Safety Testing

#### Token Limit Scenarios

Mock responses when hitting token limits:

```typescript
export class TokenLimitMock {
  static generateTruncatedResponse(originalResponse: string, tokenLimit: number): AIResponse {
    // Simulate token counting (rough approximation: 1 token ≈ 4 characters)
    const estimatedTokens = originalResponse.length / 4;
    
    if (estimatedTokens <= tokenLimit) {
      return {
        success: true,
        data: originalResponse,
        metadata: { tokenUsage: { total: estimatedTokens } }
      };
    }
    
    // Truncate and add continuation indicator
    const truncatedLength = Math.floor(tokenLimit * 4 * 0.9); // 90% of limit for safety
    const truncated = originalResponse.substring(0, truncatedLength);
    
    return {
      success: true,
      data: truncated + "... [Response truncated due to length. Continue?]",
      metadata: {
        tokenUsage: { total: tokenLimit },
        truncated: true,
        originalLength: estimatedTokens,
        continuationAvailable: true
      },
      warning: "Response was truncated due to token limits"
    };
  }

  static mockContinuation(previousResponse: string, fullResponse: string): AIResponse {
    const previousLength = previousResponse.length;
    const continuation = fullResponse.substring(previousLength);
    
    return {
      success: true,
      data: continuation,
      metadata: {
        isContinuation: true,
        previousResponseId: 'truncated_response_001'
      }
    };
  }
}
```

#### Safety Filter Triggers

Mock safety system responses:

```typescript
export class SafetyFilterMock {
  private static readonly SAFETY_VIOLATIONS = {
    MEDICAL_ADVICE: /\b(diagnose|cure|treat|medicine|prescription)\b/gi,
    EXTREME_DIET: /\b(starvation|extremely low calorie|dangerous weight loss)\b/gi,
    UNSAFE_EXERCISES: /\b(behind neck press|upright rows with internal rotation)\b/gi,
    INJURY_ENCOURAGEMENT: /\b(push through pain|ignore injury|no pain no gain)\b/gi
  };

  static checkSafetyViolations(content: string): SafetyCheckResult {
    const violations = [];
    
    for (const [violationType, pattern] of Object.entries(this.SAFETY_VIOLATIONS)) {
      if (pattern.test(content)) {
        violations.push({
          type: violationType,
          severity: this.getSeverity(violationType),
          suggestion: this.getSafetySuggestion(violationType)
        });
      }
    }
    
    return {
      hasSafetyIssues: violations.length > 0,
      violations,
      filteredContent: this.filterUnsafeContent(content, violations),
      confidence: violations.length === 0 ? 1.0 : 0.3
    };
  }

  private static filterUnsafeContent(content: string, violations: any[]): string {
    let filtered = content;
    
    for (const violation of violations) {
      if (violation.severity === 'high') {
        // Replace high-severity content with safety notice
        const pattern = this.SAFETY_VIOLATIONS[violation.type];
        filtered = filtered.replace(pattern, '[Content removed for safety]');
      }
    }
    
    return filtered;
  }

  private static getSafetySuggestion(violationType: string): string {
    const suggestions = {
      MEDICAL_ADVICE: 'Recommend consulting healthcare professionals for medical guidance',
      EXTREME_DIET: 'Suggest moderate, sustainable dietary approaches',
      UNSAFE_EXERCISES: 'Provide safer exercise alternatives',
      INJURY_ENCOURAGEMENT: 'Emphasize proper form and injury prevention'
    };
    
    return suggestions[violationType] || 'Review content for safety compliance';
  }
}

interface SafetyCheckResult {
  hasSafetyIssues: boolean;
  violations: SafetyViolation[];
  filteredContent: string;
  confidence: number;
}
```

#### Rate Limiting Simulation

Mock API quota and rate limiting scenarios:

```typescript
export class RateLimitMock {
  private static requestCounts = new Map<string, number>();
  private static resetTimes = new Map<string, number>();
  
  static checkRateLimit(userId: string, operation: string): RateLimitResult {
    const key = `${userId}_${operation}`;
    const now = Date.now();
    const limits = this.getOperationLimits(operation);
    
    // Reset counter if window has passed
    const resetTime = this.resetTimes.get(key) || 0;
    if (now > resetTime) {
      this.requestCounts.set(key, 0);
      this.resetTimes.set(key, now + limits.windowMs);
    }
    
    const currentCount = this.requestCounts.get(key) || 0;
    const isAllowed = currentCount < limits.maxRequests;
    
    if (isAllowed) {
      this.requestCounts.set(key, currentCount + 1);
    }
    
    return {
      isAllowed,
      currentCount: isAllowed ? currentCount + 1 : currentCount,
      limit: limits.maxRequests,
      resetTime: this.resetTimes.get(key)!,
      retryAfter: isAllowed ? 0 : this.resetTimes.get(key)! - now
    };
  }

  private static getOperationLimits(operation: string): RateLimit {
    const limits = {
      workout_generation: { maxRequests: 10, windowMs: 3600000 }, // 10/hour
      plan_adjustment: { maxRequests: 20, windowMs: 3600000 },   // 20/hour
      nutrition_planning: { maxRequests: 15, windowMs: 3600000 }, // 15/hour
      research_query: { maxRequests: 50, windowMs: 3600000 }     // 50/hour
    };
    
    return limits[operation] || { maxRequests: 5, windowMs: 3600000 };
  }
}

// MSW middleware for rate limiting
export const rateLimitMiddleware = (operation: string) => {
  return (req: any, res: any, ctx: any) => {
    const userId = req.headers.get('authorization')?.split(' ')[1] || 'anonymous';
    const rateLimit = RateLimitMock.checkRateLimit(userId, operation);
    
    if (!rateLimit.isAllowed) {
      return res(
        ctx.status(429),
        ctx.set('Retry-After', Math.ceil(rateLimit.retryAfter / 1000).toString()),
        ctx.json({
          error: 'Rate limit exceeded',
          retryAfter: rateLimit.retryAfter,
          limit: rateLimit.limit,
          reset: rateLimit.resetTime
        })
      );
    }
    
    return res(
      ctx.set('X-RateLimit-Limit', rateLimit.limit.toString()),
      ctx.set('X-RateLimit-Remaining', (rateLimit.limit - rateLimit.currentCount).toString()),
      ctx.set('X-RateLimit-Reset', rateLimit.resetTime.toString())
    );
  };
};
```

### Performance & Reliability Testing

#### Response Time Patterns

Mock realistic response time variations:

```typescript
export class ResponseTimeMock {
  static simulateResponseTime(operation: string, complexity: 'simple' | 'complex' = 'simple'): number {
    const baseTimes = {
      simple: {
        workout_generation: 2000,
        plan_adjustment: 1500,
        nutrition_planning: 1800,
        research_query: 3000
      },
      complex: {
        workout_generation: 8000,
        plan_adjustment: 5000,
        nutrition_planning: 6000,
        research_query: 12000
      }
    };
    
    const baseTime = baseTimes[complexity][operation] || 2000;
    const variance = 0.3; // ±30% variation
    const networkJitter = Math.random() * 500; // Up to 500ms network delay
    
    return baseTime + (Math.random() - 0.5) * variance * baseTime + networkJitter;
  }

  static async withRealisticDelay<T>(
    operation: string,
    complexity: 'simple' | 'complex',
    mockFunction: () => T
  ): Promise<T> {
    const delay = this.simulateResponseTime(operation, complexity);
    
    // Simulate progressive delay with intermediate feedback
    const quarterDelay = delay / 4;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Could emit progress updates here
        setTimeout(() => {
          setTimeout(() => {
            setTimeout(() => {
              resolve(mockFunction());
            }, quarterDelay);
          }, quarterDelay);
        }, quarterDelay);
      }, quarterDelay);
    });
  }
}

// Usage in MSW handlers
export const realisticWorkoutHandler = rest.post('/api/workouts/generate', async (req, res, ctx) => {
  const body = await req.json();
  const complexity = body.goals?.length > 2 ? 'complex' : 'simple';
  
  const result = await ResponseTimeMock.withRealisticDelay(
    'workout_generation',
    complexity,
    () => DetailedResponseMock.generateWorkout(body.userProfile)
  );
  
  return res(ctx.json(result));
});
```

#### Quality Variations

Mock different levels of AI response quality:

```typescript
export class QualityVariationMock {
  static varyResponseQuality(response: AIResponse, qualityLevel: 'low' | 'medium' | 'high'): AIResponse {
    const modifiedResponse = { ...response };
    
    switch (qualityLevel) {
      case 'low':
        modifiedResponse.confidence = Math.max(0.3, (response.confidence || 0.8) * 0.6);
        modifiedResponse.data = this.addUncertaintyMarkers(response.data);
        modifiedResponse.warning = 'Response quality may be lower due to limited context';
        break;
        
      case 'medium':
        modifiedResponse.confidence = Math.max(0.5, (response.confidence || 0.8) * 0.8);
        break;
        
      case 'high':
        modifiedResponse.confidence = Math.min(0.95, (response.confidence || 0.8) * 1.1);
        modifiedResponse.metadata = {
          ...modifiedResponse.metadata,
          qualityIndicators: {
            completeness: 0.95,
            accuracy: 0.92,
            relevance: 0.89
          }
        };
        break;
    }
    
    return modifiedResponse;
  }

  private static addUncertaintyMarkers(content: any): any {
    if (typeof content === 'string') {
      return content.replace(
        /\. /g,
        Math.random() < 0.3 ? '. (Note: This recommendation may need adjustment based on individual factors.) ' : '. '
      );
    }
    
    if (Array.isArray(content)) {
      return content.slice(0, Math.ceil(content.length * 0.7)); // Reduce list completeness
    }
    
    return content;
  }
}

// Failure recovery scenarios
export class FailureRecoveryMock {
  static mockPartialFailure(response: AIResponse): AIResponse {
    return {
      success: true,
      data: response.data,
      metadata: {
        ...response.metadata,
        partialResult: true,
        missingComponents: ['detailed_reasoning', 'alternative_options']
      },
      warning: 'Some features temporarily unavailable. Core recommendations provided.',
      fallbackUsed: true
    };
  }

  static mockRetryLogic(attempt: number, maxAttempts: number = 3): RetryResult {
    const shouldSucceed = attempt >= maxAttempts || Math.random() > (0.3 * attempt);
    
    return {
      shouldRetry: !shouldSucceed && attempt < maxAttempts,
      delay: Math.min(1000 * Math.pow(2, attempt), 10000), // Exponential backoff, max 10s
      attempt,
      maxAttempts,
      lastError: shouldSucceed ? null : `Attempt ${attempt} failed`
    };
  }
}

interface RetryResult {
  shouldRetry: boolean;
  delay: number;
  attempt: number;
  maxAttempts: number;
  lastError: string | null;
}
```

## Cross-Document Testing Integration

### Component Testing Coordination

AI response mocking integrates seamlessly with component testing patterns from `component-testing.md`:

```typescript
// Example: Testing AI-powered components with mocked responses
import { SimpleWorkoutMock, StreamingWorkoutMock } from '../__mocks__/ai-responses';

describe('AI Workout Generation Component', () => {
  it('displays simple AI response', async () => {
    // Use simple mock for component testing
    server.use(
      rest.post('/api/ai/workout-generation', (req, res, ctx) => {
        return res(ctx.json(SimpleWorkoutMock));
      })
    );
    
    // Component test implementation...
  });

  it('handles streaming response states', async () => {
    // Use streaming mock for progressive UI testing
    const streamingMock = new StreamingWorkoutMock();
    // Implementation with component testing patterns...
  });
});
```

### API Mocking Dependencies

AI response mocking builds upon the API infrastructure established in `api-mocking.md`:

- **Shared MSW Infrastructure**: Uses the same MSW server setup and configuration
- **Handler Composition**: AI handlers extend and override standard API handlers when needed
- **Error Response Consistency**: AI errors follow the same structured format as standard API errors

### E2E Workflow Integration

AI mocking patterns support complete user workflows documented in `e2e-workflows.md`:

- **Realistic User Journeys**: Full workout generation → review → acceptance flows
- **Cross-Feature Integration**: AI responses that trigger nutrition adjustments and progress updates
- **Performance Validation**: AI response timing aligned with E2E performance benchmarks

This comprehensive AI Response Mocking Guide provides all required sections and detailed implementations for testing AI agents in the trAIner app, ensuring seamless integration with other testing approaches. 