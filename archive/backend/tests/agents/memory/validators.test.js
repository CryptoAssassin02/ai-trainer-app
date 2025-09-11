const { isValidUUID, isValidAgentType, validateMemoryInput } = require('../../../agents/memory/validators');
const { validate: uuidValidate } = require('uuid');

// Mock the 'uuid' library, specifically the 'validate' function
jest.mock('uuid', () => ({
  validate: jest.fn(),
}));

describe('Memory Validators', () => {

  afterEach(() => {
    // Clear mocks after each test
    jest.clearAllMocks();
  });

  describe('isValidUUID', () => {
    test('should return true for a valid UUID string', () => {
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      // Configure the mock implementation for this test
      uuidValidate.mockReturnValue(true);
      expect(isValidUUID(validId)).toBe(true);
      // Verify the mock was called with the correct argument
      expect(uuidValidate).toHaveBeenCalledWith(validId);
      expect(uuidValidate).toHaveBeenCalledTimes(1);
    });

    test('should return false for an invalid UUID string', () => {
      const invalidId = 'not-a-valid-uuid';
      // Configure the mock implementation
      uuidValidate.mockReturnValue(false);
      expect(isValidUUID(invalidId)).toBe(false);
      expect(uuidValidate).toHaveBeenCalledWith(invalidId);
      expect(uuidValidate).toHaveBeenCalledTimes(1);
    });

    test('should return false for null input', () => {
      expect(isValidUUID(null)).toBe(false);
      // Ensure uuidValidate was not called because type check fails first
      expect(uuidValidate).not.toHaveBeenCalled();
    });

    test('should return false for undefined input', () => {
      expect(isValidUUID(undefined)).toBe(false);
      expect(uuidValidate).not.toHaveBeenCalled();
    });

    test('should return false for number input', () => {
      expect(isValidUUID(12345)).toBe(false);
      expect(uuidValidate).not.toHaveBeenCalled();
    });

    test('should return false for object input', () => {
      expect(isValidUUID({ id: '123' })).toBe(false);
      expect(uuidValidate).not.toHaveBeenCalled();
    });
  });

  describe('isValidAgentType', () => {
    const validTypes = ['nutrition', 'workout', 'research', 'adjustment', 'system'];

    validTypes.forEach(type => {
      test(`should return true for valid type: ${type}`, () => {
        expect(isValidAgentType(type)).toBe(true);
      });

      test(`should return true for valid type with different casing: ${type.toUpperCase()}`, () => {
        expect(isValidAgentType(type.toUpperCase())).toBe(true);
      });

      test(`should return true for valid type with padding: '  ${type}  '`, () => {
        expect(isValidAgentType(`  ${type}  `)).toBe(true);
      });
    });

    test('should return false for an invalid string type', () => {
      expect(isValidAgentType('invalid_type')).toBe(false);
      expect(isValidAgentType('agent')).toBe(false);
      expect(isValidAgentType('')).toBe(false);
    });

    test('should return false for null input', () => {
      expect(isValidAgentType(null)).toBe(false);
    });

    test('should return false for undefined input', () => {
      expect(isValidAgentType(undefined)).toBe(false);
    });

    test('should return false for number input', () => {
      expect(isValidAgentType(123)).toBe(false);
    });

    test('should return false for object input', () => {
      expect(isValidAgentType({ type: 'workout' })).toBe(false);
    });
  });

  describe('validateMemoryInput', () => {
    test('should return true for truthy string content', () => {
      expect(validateMemoryInput('some content')).toBe(true);
    });

    test('should return true for truthy number content (0 is falsy)', () => {
      expect(validateMemoryInput(1)).toBe(true);
      expect(validateMemoryInput(-1)).toBe(true);
    });

    test('should return true for truthy object content', () => {
      expect(validateMemoryInput({ key: 'value' })).toBe(true);
      expect(validateMemoryInput([])).toBe(true); // Empty array is truthy
    });

    test('should throw error for null content', () => {
      expect(() => validateMemoryInput(null)).toThrow('Memory content cannot be empty');
    });

    test('should throw error for undefined content', () => {
      expect(() => validateMemoryInput(undefined)).toThrow('Memory content cannot be empty');
    });

    test('should throw error for empty string content', () => {
      expect(() => validateMemoryInput('')).toThrow('Memory content cannot be empty');
    });

    test('should throw error for number 0 content', () => {
      expect(() => validateMemoryInput(0)).toThrow('Memory content cannot be empty');
    });

    test('should throw error for boolean false content', () => {
      expect(() => validateMemoryInput(false)).toThrow('Memory content cannot be empty');
    });
  });
}); 