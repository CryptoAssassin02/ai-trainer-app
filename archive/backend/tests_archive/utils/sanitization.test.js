// Unit tests for backend/utils/sanitization.js

// Mock dependencies FIRST
const mockLogger = {
  error: jest.fn(),
};
// Mock the logger module directly
jest.mock('../../config/logger', () => mockLogger);

// REMOVE: No longer mocking config barrel file or env
/*
jest.mock('../../config', () => ({
  logger: mockLogger, 
}));
jest.mock('../../config/env', () => ({
  supabase: { ... },
}));
*/

// Now import the module to test and its dependencies
const {
  sanitizeUserHtml,
  sanitizeText,
  sanitizeSql,
  sanitizeObject,
  sanitizeProfileData,
  sanitizeWorkoutPlan,
  isValidEmail,
  isValidUrl,
  validateProps
} = require('../../utils/sanitization');
const { ApiError } = require('../../utils/errors'); // For testing validateProps

describe('Sanitization Utilities', () => {
  beforeEach(() => {
    // Reset logger mock if needed
    mockLogger.error.mockClear();
  });

  describe('sanitizeUserHtml', () => {
    it('should strip all HTML by default', () => {
      const input = '<p>Hello <script>alert("XSS")</script> <b>World</b></p>';
      expect(sanitizeUserHtml(input)).toBe('Hello  World');
    });

    it('should allow basic tags with relaxed option', () => {
      const input = '<p>Hello <b>World</b></p><script>alert("no")</script>';
      const options = { relaxed: true };
      expect(sanitizeUserHtml(input, options)).toBe('<p>Hello <b>World</b></p>');
    });

    it('should handle non-string input', () => {
      expect(sanitizeUserHtml(null)).toBeNull();
      expect(sanitizeUserHtml(undefined)).toBeUndefined();
      expect(sanitizeUserHtml(123)).toBe(123);
      expect(sanitizeUserHtml({})).toEqual({});
    });
    
    it('should add noopener noreferrer to target="_blank" links in relaxed mode', () => {
        const input = '<a href="http://example.com" target="_blank">Click</a>';
        const options = { relaxed: true };
        expect(sanitizeUserHtml(input, options)).toBe('<a href="http://example.com" target="_blank" rel="noopener noreferrer">Click</a>');
    });

    it('should not modify links without target="_blank" in relaxed mode', () => {
        const input = '<a href="http://example.com">Click</a>';
        const options = { relaxed: true };
        expect(sanitizeUserHtml(input, options)).toBe('<a href="http://example.com">Click</a>');
    });
  });

  describe('sanitizeText', () => {
    it('should strip HTML and trim', () => {
      const input = '  <p> Text with spaces and tags </p>  ';
      expect(sanitizeText(input)).toBe('Text with spaces and tags');
    });

    it('should enforce maxLength', () => {
      const input = 'This is a long string that should be truncated';
      expect(sanitizeText(input, 10)).toBe('This is a ');
    });

    it('should handle non-string input', () => {
      expect(sanitizeText(null)).toBeNull();
      expect(sanitizeText(123)).toBe(123);
    });
    
    it('should remove control characters', () => {
      const input = 'Text with\x00null\x1Fchar';
      expect(sanitizeText(input)).toBe('Text withnullchar');
    });
  });

  describe('sanitizeSql', () => {
    it('should escape single quotes', () => {
      expect(sanitizeSql("O'Malley")).toBe("O''Malley");
    });

    it('should remove semicolons and comments', () => {
      const input = "SELECT * FROM users; WHERE name = 'test'; -- comment";
      expect(sanitizeSql(input)).toBe("SELECT * FROM users WHERE name = ''test'' ");
    });
    
     it('should escape backslashes', () => {
      expect(sanitizeSql("C:\\path\\to\\file")).toBe("C:\\\\path\\\\to\\\\file");
    });
    
    it('should remove block comments', () => {
      expect(sanitizeSql("SELECT /* comment */ * FROM table")).toBe("SELECT  * FROM table");
    });

    it('should handle non-string input', () => {
      expect(sanitizeSql(null)).toBeNull();
      expect(sanitizeSql(123)).toBe(123);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string properties recursively', () => {
      const input = {
        level1: ' <p>text1</p> ',
        nested: {
          level2: ' <script>alert()</script> text2 ',
          arr: [' <b>text3</b> ', { deep: ' text4 ' }]
        },
        num: 123
      };
      const expected = {
        level1: 'text1',
        nested: {
          level2: 'text2',
          arr: ['text3', { deep: 'text4' }]
        },
        num: 123
      };
      expect(sanitizeObject(input, sanitizeText)).toEqual(expected);
    });

    it('should handle arrays correctly', () => {
      const input = [' <a>1</a> ', { b: ' <i>2</i> ' }];
      const expected = ['1', { b: '2' }];
      expect(sanitizeObject(input, sanitizeText)).toEqual(expected);
    });

    it('should handle non-object input', () => {
      expect(sanitizeObject(null)).toBeNull();
      expect(sanitizeObject('string')).toBe('string');
      expect(sanitizeObject(123)).toBe(123);
    });
  });
  
   describe('sanitizeProfileData', () => {
    it('should sanitize name and email with sanitizeText', () => {
      const input = { name: '  <p>Test</p>  ', email: ' test@test.com ', age: 30 };
      const expected = { name: 'Test', email: 'test@test.com', age: 30 };
      expect(sanitizeProfileData(input)).toEqual(expected);
    });

    it('should sanitize bio with relaxed HTML rules', () => {
      const input = { bio: '<b>Bold</b> <script>no</script> <i>Italic</i>' };
      const expected = { bio: '<b>Bold</b>  <i>Italic</i>' }; // Script removed, tags kept
      expect(sanitizeProfileData(input)).toEqual(expected);
    });
    
    it('should sanitize nested objects with default sanitizeText', () => {
        const input = { preferences: { units: ' <p>metric</p> ' } };
        const expected = { preferences: { units: 'metric' } };
        expect(sanitizeProfileData(input)).toEqual(expected);
    });

    it('should handle non-object input', () => {
      expect(sanitizeProfileData(null)).toEqual({});
      expect(sanitizeProfileData('string')).toEqual({});
    });
  });
  
  describe('sanitizeWorkoutPlan', () => {
    it('should sanitize planName and exercise details', () => {
      const input = {
        planName: ' <p>My Plan</p> ',
        exercises: [
          { name: ' <b>Push Up</b> ', sets: 3, repsOrRange: ' 8-12 ', notes: ' <script>alert()</script> Go deep ' },
          { name: ' Squat ', sets: 3, repsOrRange: ' 10 ', notes: ' Bar <p>high</p> ' }
        ]
      };
      const expected = {
        planName: 'My Plan',
        exercises: [
          { name: 'Push Up', sets: 3, repsOrRange: '8-12', notes: 'Go deep' },
          { name: 'Squat', sets: 3, repsOrRange: '10', notes: 'Bar high' }
        ]
      };
      expect(sanitizeWorkoutPlan(input)).toEqual(expected);
    });
    
    it('should sanitize reasoning and researchInsights with relaxed HTML', () => {
      const input = {
        reasoning: 'Plan includes <b>strength</b> work.',
        researchInsights: ['Insight <i>1</i>', '<script>alert()</script>']
      };
      const expected = {
        reasoning: 'Plan includes <b>strength</b> work.',
        researchInsights: ['Insight <i>1</i>', '']
      };
      expect(sanitizeWorkoutPlan(input)).toEqual(expected);
    });
    
    it('should handle missing/invalid fields gracefully', () => {
        const input = {
          exercises: [null, { name: ' Pull Up '}]
        };
         const expected = {
          exercises: [{}, { name: 'Pull Up', notes: '', repsOrRange: ''}]
        };
        expect(sanitizeWorkoutPlan(input)).toEqual(expected);
    });

    it('should handle non-object input', () => {
      expect(sanitizeWorkoutPlan(null)).toEqual({});
      expect(sanitizeWorkoutPlan([])).toEqual({});
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('test.name@example.co.uk')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isValidEmail('test@example')).toBe(false);
      expect(isValidEmail('test@.com')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(123)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid http/https URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=1')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false);
      expect(isValidUrl('just text')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(null)).toBe(false);
      expect(isValidUrl(123)).toBe(false);
    });
  });
  
  describe('validateProps', () => {
      const allowedProps = ['name', 'age'];
      
      it('should keep only allowed properties', () => {
          const input = { name: 'Test', age: 30, extra: 'remove' };
          const expected = { name: 'Test', age: 30 };
          expect(validateProps(input, allowedProps)).toEqual(expected);
      });
      
      it('should sanitize string properties', () => {
          const input = { name: ' <p>Test</p> ', age: 30 };
          const expected = { name: 'Test', age: 30 };
           expect(validateProps(input, allowedProps)).toEqual(expected);
      });
      
      it('should throw ApiError if input is not an object', () => {
          expect(() => validateProps(null, allowedProps)).toThrow(ApiError);
          expect(() => validateProps('string', allowedProps)).toThrow(ApiError);
      });
      
      it('should throw ApiError in strict mode if extra properties exist', () => {
          const input = { name: 'Test', age: 30, extra: 'fail' };
          expect(() => validateProps(input, allowedProps, true)).toThrow(ApiError);
          expect(() => validateProps(input, allowedProps, true)).toThrow('Unexpected properties: extra');
      });
      
       it('should not throw in strict mode if only allowed properties exist', () => {
          const input = { name: 'Test', age: 30 };
          expect(() => validateProps(input, allowedProps, true)).not.toThrow();
      });
  });

}); 