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

// Create a mock constructor that supports 'new OpenAIService()'
const MockOpenAIService = jest.fn().mockImplementation(() => {
  return {
    createChatCompletion: jest.fn().mockResolvedValue(mockOpenAIResponse),
    generateChatCompletion: jest.fn().mockResolvedValue(JSON.stringify(testWorkoutPlan, null, 2)),
    generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3])
  };
});

// Export the constructor function directly
module.exports = MockOpenAIService; 