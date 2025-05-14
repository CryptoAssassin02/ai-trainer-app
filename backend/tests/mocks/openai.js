// backend/tests/mocks/openai.js

/**
 * Creates a mock of the OpenAI client structure.
 * Methods relevant to the application are mocked with jest.fn().
 */
const createMockOpenAIClient = () => ({
  // Mock structure based on typical usage, e.g., v4 client
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        id: 'chatcmpl-mockid',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-mock-model',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Mocked AI response content.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      }),
    },
  },
  // Add mocks for other OpenAI functionalities if used (e.g., embeddings, images)
  // embeddings: {
  //   create: jest.fn().mockResolvedValue({ ...mock embedding response... })
  // },
});

// If the OpenAI client is instantiated differently (e.g., new OpenAI()),
// mock the constructor and its methods accordingly.

module.exports = {
  createMockOpenAIClient,
};
