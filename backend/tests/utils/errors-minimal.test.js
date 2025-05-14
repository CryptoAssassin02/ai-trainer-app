const { 
  ApiError,
  AgentError,
  ValidationError,
  ERROR_CODES
} = require('../../utils/errors');

describe('Basic Error Tests', () => {
  test('ApiError should create with correct properties', () => {
    const error = new ApiError('Test error', 400, { detail: 'test' });
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ detail: 'test' });
  });
  
  test('AgentError should create with correct properties', () => {
    const error = new AgentError('Test error', ERROR_CODES.VALIDATION_ERROR);
    expect(error.name).toBe('AgentError');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
  });
  
  test('ValidationError should create with correct properties', () => {
    const error = new ValidationError('Test validation error');
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Test validation error');
    expect(error.statusCode).toBe(400);
  });
}); 