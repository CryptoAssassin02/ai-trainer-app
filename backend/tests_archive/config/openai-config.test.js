/**
 * OpenAI Configuration Tests
 */

describe('OpenAI Configuration', () => {
  // Import actual module for tests
  const openaiConfig = require('../../config/openai');
  
  test('configuration should have expected structure', () => {
    // Test core properties
    expect(openaiConfig).toHaveProperty('temperature');
    expect(openaiConfig).toHaveProperty('defaultChatModel');
    expect(openaiConfig).toHaveProperty('defaultEmbeddingModel');
    expect(openaiConfig).toHaveProperty('retry');
    expect(openaiConfig).toHaveProperty('MODELS');
    expect(openaiConfig).toHaveProperty('utils');
    expect(openaiConfig).toHaveProperty('pricing');
    
    // Test nested properties
    expect(openaiConfig.retry).toHaveProperty('maxRetries');
    expect(openaiConfig.retry).toHaveProperty('initialDelayMs');
    expect(openaiConfig.retry).toHaveProperty('retryableStatusCodes');
  });
  
  test('MODELS enum should have expected values', () => {
    expect(openaiConfig.MODELS.GPT_4o).toBe('gpt-4o');
    expect(openaiConfig.MODELS.GPT_4o_MINI).toBe('gpt-4o-mini');
    expect(openaiConfig.MODELS.GPT_3_5_TURBO).toBe('gpt-3.5-turbo-0125');
    expect(openaiConfig.MODELS.TEXT_EMBEDDING_3_SMALL).toBe('text-embedding-3-small');
  });
  
  test('default models should be defined', () => {
    // These should be defined regardless of environment
    expect(openaiConfig.defaultChatModel).toBeDefined();
    expect(openaiConfig.defaultEmbeddingModel).toBeDefined();
    
    // Verify the model references exist in the MODELS enum
    const modelExists = Object.values(openaiConfig.MODELS).includes(openaiConfig.defaultChatModel);
    expect(modelExists).toBe(true);
  });
  
  test('retry configuration should have reasonable defaults', () => {
    expect(openaiConfig.retry.maxRetries).toBeGreaterThanOrEqual(1);
    expect(openaiConfig.retry.initialDelayMs).toBeGreaterThan(0);
    expect(openaiConfig.retry.retryableStatusCodes).toContain(429); // Rate limit status
    expect(openaiConfig.retry.retryableStatusCodes).toContain(500); // Server error
  });
  
  test('should have utility functions', () => {
    expect(typeof openaiConfig.utils.estimateTokens).toBe('function');
    expect(typeof openaiConfig.utils.estimateCost).toBe('function');
  });
  
  test('estimateTokens should provide reasonable estimates', () => {
    expect(openaiConfig.utils.estimateTokens('')).toBe(0);
    expect(openaiConfig.utils.estimateTokens('word')).toBe(1);
    expect(openaiConfig.utils.estimateTokens('hello world test')).toBe(4);
    expect(openaiConfig.utils.estimateTokens('A slightly longer sentence for testing purposes.')).toBe(12);
  });
  
  test('estimateCost should calculate properly for existing models', () => {
    const model = openaiConfig.defaultChatModel;
    const pricing = openaiConfig.pricing[model];
    
    // Skip test if pricing is unavailable for this model
    if (!pricing || !pricing.input || !pricing.output) {
      console.log(`Skipping test: No pricing for ${model}`);
      return;
    }
    
    const inputTokens = 10000;
    const outputTokens = 20000;
    const expectedCost = (inputTokens / 1000000 * pricing.input) + 
                         (outputTokens / 1000000 * pricing.output);
    
    const calculatedCost = openaiConfig.utils.estimateCost(inputTokens, outputTokens, model);
    expect(calculatedCost).toBeCloseTo(expectedCost);
  });
  
  test('estimateCost should calculate correctly for embedding models', () => {
    const model = openaiConfig.defaultEmbeddingModel;
    const pricing = openaiConfig.pricing[model];
    
    // Skip test if pricing is unavailable for this model
    if (!pricing || !pricing.usage) {
      console.log(`Skipping test: No pricing for ${model}`);
      return;
    }
    
    const tokens = 50000;
    const expectedCost = (tokens / 1000000 * pricing.usage);
    
    const calculatedCost = openaiConfig.utils.estimateCost(tokens, 0, model);
    expect(calculatedCost).toBeCloseTo(expectedCost);
  });
  
  test('estimateCost should return 0 for unknown models', () => {
    // Spy on console.warn
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const result = openaiConfig.utils.estimateCost(1000, 1000, 'unknown-model');
    
    expect(result).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Pricing not available for model: unknown-model')
    );
    
    warnSpy.mockRestore();
  });
}); 