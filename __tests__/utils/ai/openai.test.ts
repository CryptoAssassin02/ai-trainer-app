import { generateCompletion, useOpenAI } from '@/utils/ai/openai';
import { renderHook } from '@testing-library/react';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Import the entire mock module. Jest resolves 'openai' to '__mocks__/openai.ts'.
import * as OpenAIMock from 'openai';

// Now access the mocks via the imported object
const { mockCreate, MockOpenAIConstructor } = OpenAIMock as any; // Cast to access exported mocks

// Store original process.env
const originalEnv = { ...process.env };

describe('utils/ai/openai', () => {
  beforeEach(() => {
    // Use imported mocks directly
    jest.clearAllMocks(); // Clears mockCreate and MockOpenAIConstructor calls
    process.env = { ...originalEnv };
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.NEXT_PUBLIC_OPENAI_API_KEY = 'test-public-api-key';
  });

  afterAll(() => {
    // Restore original env after all tests
    process.env = { ...originalEnv };
  });

  describe('generateCompletion', () => {
    const chatMessages: ChatCompletionMessageParam[] = [{ role: 'user', content: 'Hello' }];

    it('should call OpenAI API with default parameters and return content', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Hi there!' } }],
      };
      mockCreate.mockResolvedValue(mockResponse); // Use imported mock

      const result = await generateCompletion({ chat: chatMessages });

      expect(mockCreate).toHaveBeenCalledTimes(1); // Use imported mock
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          messages: chatMessages,
          response_format: { type: 'text' },
        })
      );
      expect(result).toBe('Hi there!');
    });

    it('should call OpenAI API with specified parameters', async () => {
      const mockResponse = { choices: [{ message: { content: 'Specific response' } }] };
      mockCreate.mockResolvedValue(mockResponse);
      const onComplete = jest.fn();
      const toolParams = {
        toolsChoice: 'auto' as const,
        tools: [{ type: 'function' as const, function: { name: 'test_func' } }],
      };

      await generateCompletion({
        chat: chatMessages,
        maxTokens: 150,
        model: 'gpt-3.5-turbo',
        responseFormatType: { type: 'json_object' },
        onComplete,
        toolParams,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: chatMessages,
        max_tokens: 150,
        response_format: { type: 'json_object' },
        tool_choice: 'auto',
        tools: toolParams.tools,
        max_completion_tokens: undefined,
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(mockResponse);
    });

     it('should handle reasoning model token parameters correctly (o3)', async () => {
        const mockResponse = { choices: [{ message: { content: 'Reasoning response' } }] };
        mockCreate.mockResolvedValue(mockResponse);

        await generateCompletion({
            chat: chatMessages,
            maxTokens: 100,
            model: 'gpt-4o-o3-mini' as any, // Cast to bypass strict type check for test model name
        });

        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
            model: 'gpt-4o-o3-mini',
            max_tokens: undefined, // Should be undefined for reasoning models
            max_completion_tokens: 100, // maxTokens goes here
        }));
    });

    it('should handle reasoning model token parameters correctly (o1)', async () => {
        const mockResponse = { choices: [{ message: { content: 'Reasoning response' } }] };
        mockCreate.mockResolvedValue(mockResponse);

        await generateCompletion({
            chat: chatMessages,
            maxTokens: 100,
            model: 'gpt-4o-o1-mini' as any, // Cast to bypass strict type check for test model name
        });

        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
            model: 'gpt-4o-o1-mini',
            max_tokens: undefined, // Should be undefined for reasoning models
            max_completion_tokens: 100, // maxTokens goes here
        }));
    });

    it('should throw error if OPENAI_API_KEY is not configured', async () => {
      delete process.env.OPENAI_API_KEY;
      await expect(generateCompletion({ chat: chatMessages })).rejects.toThrow(
        'OpenAI API key is not configured'
      );
    });

    it('should throw error if API call fails', async () => {
      const apiError = new Error('API call failed');
      mockCreate.mockRejectedValue(apiError);

      await expect(generateCompletion({ chat: chatMessages })).rejects.toThrow(
        'API call failed'
      );
    });

    it('should throw error if response has no choices', async () => {
      const mockResponse = { choices: [] };
      mockCreate.mockResolvedValue(mockResponse);

      await expect(generateCompletion({ chat: chatMessages })).rejects.toThrow(
        'No completion content found in the response'
      );
    });

    it('should throw error if response choice has no message', async () => {
      const mockResponse = { choices: [{ message: undefined }] }; // Or null
      mockCreate.mockResolvedValue(mockResponse);

      await expect(generateCompletion({ chat: chatMessages })).rejects.toThrow(
        'No completion content found in the response'
      );
    });

    it('should throw error if response message has no content', async () => {
      const mockResponse = { choices: [{ message: { content: null } }] }; // Or undefined
      mockCreate.mockResolvedValue(mockResponse);

      await expect(generateCompletion({ chat: chatMessages })).rejects.toThrow(
        'No completion content found in the response'
      );
    });

    it('should call OpenAI API with correct parameters for default model', async () => {
      mockCreate.mockResolvedValue({ choices: [{ message: { content: 'Test completion' } }] } as any);
      await generateCompletion({ chat: [{ role: 'user', content: 'Hello' }] });

      expect(MockOpenAIConstructor).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          messages: chatMessages,
          response_format: { type: 'text' },
        })
      );
    });

    it('should handle API errors correctly', async () => {
      const error = new Error('API Error');
      mockCreate.mockRejectedValue(error);

      await expect(
        generateCompletion({ chat: [{ role: 'user', content: 'Test' }] })
      ).rejects.toThrow('API Error');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should handle missing completion content', async () => {
      mockCreate.mockResolvedValue({ choices: [{ message: { content: null } }] } as any);
      await expect(
        generateCompletion({ chat: [{ role: 'user', content: 'Test' }] })
      ).rejects.toThrow('No completion content found in the response');
    });

    it('should use provided model and maxTokens', async () => {
      mockCreate.mockResolvedValue({ choices: [{ message: { content: 'Test' } }] } as any);
      await generateCompletion({
        chat: [{ role: 'user', content: 'Test' }],
        model: 'gpt-4-turbo',
        maxTokens: 500,
      });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo',
          max_tokens: 500,
          messages: [{ role: 'user', content: 'Test' }],
        })
      );
    });

    it('should call onComplete callback if provided', async () => {
      const mockResponse = { choices: [{ message: { content: 'Test' } }] };
      mockCreate.mockResolvedValue(mockResponse as any);
      const onComplete = jest.fn();

      await generateCompletion({ chat: [{ role: 'user', content: 'Test' }], onComplete });

      expect(onComplete).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('useOpenAI', () => {
    it('should create and return an OpenAI client instance', () => {
      const { result } = renderHook(() => useOpenAI());

      expect(MockOpenAIConstructor).toHaveBeenCalledTimes(1); // Use imported mock constructor
      expect(MockOpenAIConstructor).toHaveBeenCalledWith({
        apiKey: 'test-public-api-key',
        dangerouslyAllowBrowser: true,
      });

      expect(result.current).toBeDefined();
      expect(result.current.chat.completions.create).toBe(mockCreate); // Use imported mock create
    });

    it('should throw error if NEXT_PUBLIC_OPENAI_API_KEY is not configured', () => {
      delete process.env.NEXT_PUBLIC_OPENAI_API_KEY;

      expect(() => renderHook(() => useOpenAI())).toThrow('OpenAI API key is not configured');
    });
  });
}); 