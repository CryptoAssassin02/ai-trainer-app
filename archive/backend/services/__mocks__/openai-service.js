// Mock for OpenAI service
const testWorkoutPlan = {
  planName: "Test Strength Plan",
  plan: [
    {
      exercise: "Dumbbell Bench Press",
      sets: 3,
      repsOrDuration: "8-12",
      notes: "Focus on form"
    },
    {
      exercise: "Bodyweight Squat",
      sets: 3,
      repsOrDuration: "15",
      notes: "Full range of motion"
    },
    {
      exercise: "Plank",
      sets: 3,
      repsOrDuration: "60 seconds",
      notes: "Keep core engaged"
    }
  ]
};

// Mock feedback parsing response for knee pain and exercise substitution
const mockFeedbackParsingResponse = {
  substitutions: [
    { 
      from: "squats", 
      to: "upper body exercises", 
      reason: "knee pain" 
    },
    { 
      from: "lunges", 
      to: "upper body exercises", 
      reason: "knee pain" 
    }
  ],
  volumeAdjustments: [],
  intensityAdjustments: [],
  scheduleChanges: [],
  restPeriodChanges: [],
  equipmentLimitations: [],
  painConcerns: [
    { 
      area: "knee", 
      exercise: "squats", 
      severity: "mentioned", 
      recommendation: "replace with upper body exercises" 
    },
    { 
      area: "knee", 
      exercise: "lunges", 
      severity: "mentioned", 
      recommendation: "replace with upper body exercises" 
    }
  ],
  generalFeedback: "User has knee pain during squats and lunges and wants upper body exercise replacements"
};

// Create a properly structured OpenAI response
const mockOpenAIResponse = {
  id: "chatcmpl-123456789",
  object: "chat.completion",
  created: Date.now(),
  model: "gpt-4",
  choices: [
    {
      message: {
        role: "assistant",
        content: "```json\n" + JSON.stringify(testWorkoutPlan, null, 2) + "\n```"
      },
      index: 0,
      finish_reason: "stop"
    }
  ]
};

// Generate a mock embedding with 1536 dimensions (matching text-embedding-ada-002)
const generateMockEmbedding = () => {
  const dimensions = 1536;
  const embedding = [];
  for (let i = 0; i < dimensions; i++) {
    // Generate random values between -1 and 1 (typical for normalized embeddings)
    embedding.push((Math.random() - 0.5) * 2);
  }
  return embedding;
};

// Create a mock constructor that supports 'new OpenAIService()'
const MockOpenAIService = jest.fn().mockImplementation(() => {
  return {
    createChatCompletion: jest.fn().mockResolvedValue(mockOpenAIResponse),
    generateChatCompletion: jest.fn().mockImplementation((messages, options) => {
      // DEBUG: Log mock call
      console.log('[MOCK] generateChatCompletion called with:', {
        messagesLength: messages?.length || 0,
        optionsKeys: options ? Object.keys(options) : []
      });
      
      // Check if this is a feedback parsing request by looking at the system prompt
      const systemMessage = messages.find(msg => msg.role === 'system');
      console.log('[MOCK] System message found:', !!systemMessage);
      console.log('[MOCK] System message content preview:', systemMessage?.content?.substring(0, 100) || 'None');
      
      const isParsingFeedback = systemMessage && systemMessage.content && (
        systemMessage.content.includes('parse user feedback') || 
        systemMessage.content.includes('extract structured information')
      );
      
      console.log('[MOCK] Is parsing feedback:', isParsingFeedback);
      
      if (isParsingFeedback) {
        console.log('[MOCK] Returning feedback parsing response');
        // Return parsed feedback JSON for feedback parsing requests
        return Promise.resolve(JSON.stringify(mockFeedbackParsingResponse, null, 2));
      } else {
        console.log('[MOCK] Returning workout plan response');
        // Return workout plan JSON for workout generation requests
        return Promise.resolve(JSON.stringify(testWorkoutPlan, null, 2));
      }
    }),
    generateEmbedding: jest.fn().mockResolvedValue(generateMockEmbedding()),
    initClient: jest.fn().mockResolvedValue()
  };
});

// Export the constructor function directly
module.exports = MockOpenAIService; 