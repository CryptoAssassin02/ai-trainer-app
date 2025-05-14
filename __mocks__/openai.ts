// __mocks__/openai.ts
// Manual mock for the 'openai' library using Jest

// Export the mock functions so tests can access them for assertions
export const mockCreate = jest.fn();
const mockCompletions = { create: mockCreate };
const mockChat = { completions: mockCompletions };
const mockInstance = { chat: mockChat };

// Export the mock constructor function
export const MockOpenAIConstructor = jest.fn((...args: any[]) => {
  return mockInstance;
});

// Define and export the mock class (assuming named export is needed)
export class OpenAI {
  public chat: any;
  constructor(...args: any[]) {
    MockOpenAIConstructor(...args);
    this.chat = mockChat;
  }
  // Add other static/instance methods if needed
}

// If the original library uses `export default OpenAI`, add:
// export default OpenAI;

// It seems Jest requires the default export for module mocking sometimes,
// even if the original uses named exports. Let's try adding it.
export default OpenAI; 