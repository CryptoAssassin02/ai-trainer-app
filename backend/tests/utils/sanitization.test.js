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

describe('Sanitization Utilities', () => {
  describe('sanitizeUserHtml', () => {
    test('should sanitize HTML in strings', () => {
      const dirtyInput = '<script>alert("XSS")</script>Hello World';
      const sanitizedOutput = sanitizeUserHtml(dirtyInput);
      expect(sanitizedOutput).not.toContain('<script>');
      expect(sanitizedOutput).toContain('Hello World');
    });

    test('should handle non-string inputs', () => {
      expect(sanitizeUserHtml(null)).toBe(null);
      expect(sanitizeUserHtml(undefined)).toBe(undefined);
      expect(sanitizeUserHtml(123)).toBe(123);
      expect(sanitizeUserHtml(true)).toBe(true);
    });
    
    test('should allow limited HTML with relaxed option', () => {
      const html = '<p>This is <b>bold</b> and <i>italic</i> text with <script>alert("XSS")</script></p>';
      const sanitized = sanitizeUserHtml(html, { relaxed: true });
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<b>bold</b>');
      expect(sanitized).toContain('<i>italic</i>');
    });
  });

  describe('sanitizeText', () => {
    test('should remove HTML and control characters', () => {
      const dirtyText = '<div onclick="evil()">Text with \x00control\x1F chars</div>';
      const sanitized = sanitizeText(dirtyText);
      
      expect(sanitized).not.toContain('<div');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('\x00');
      expect(sanitized).not.toContain('\x1F');
      expect(sanitized).toBe('Text with control chars');
    });
    
    test('should enforce maximum length', () => {
      const longText = 'This is a very long text that should be truncated';
      const sanitized = sanitizeText(longText, 10);
      
      expect(sanitized.length).toBe(10);
      expect(sanitized).toBe('This is a ');
    });
    
    test('should handle non-string inputs', () => {
      expect(sanitizeText(null)).toBe(null);
      expect(sanitizeText(undefined)).toBe(undefined);
      expect(sanitizeText(123)).toBe(123);
    });
  });
  
  describe('sanitizeSql', () => {
    test('should escape SQL special characters', () => {
      const sqlInput = "SELECT * FROM users WHERE name = 'John'; DROP TABLE users; --";
      const sanitized = sanitizeSql(sqlInput);
      
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('--');
      expect(sanitized).toContain("''");
    });
    
    test('should remove SQL comments', () => {
      const withComments = "SELECT * FROM users /* This is a comment */ WHERE id = 1";
      const sanitized = sanitizeSql(withComments);
      
      expect(sanitized).not.toContain('/*');
      expect(sanitized).not.toContain('*/');
      expect(sanitized).toBe('SELECT * FROM users  WHERE id = 1');
    });
    
    test('should handle non-string inputs', () => {
      expect(sanitizeSql(null)).toBe(null);
      expect(sanitizeSql(undefined)).toBe(undefined);
      expect(sanitizeSql(123)).toBe(123);
    });
  });

  describe('sanitizeObject', () => {
    test('should sanitize HTML in object properties', () => {
      const dirtyObject = {
        name: '<script>alert("XSS")</script>John Doe',
        description: '<img src="x" onerror="alert(1)">Description',
        nested: {
          content: '<iframe src="evil.com"></iframe>Content'
        }
      };
      
      const sanitizedObject = sanitizeObject(dirtyObject);
      
      expect(sanitizedObject.name).not.toContain('<script>');
      expect(sanitizedObject.name).toContain('John Doe');
      expect(sanitizedObject.description).not.toContain('onerror');
      expect(sanitizedObject.description).toContain('Description');
      expect(sanitizedObject.nested.content).not.toContain('<iframe');
      expect(sanitizedObject.nested.content).toContain('Content');
    });

    test('should sanitize HTML in arrays', () => {
      const dirtyArray = [
        '<script>alert("XSS")</script>Item 1',
        '<img src="x" onerror="alert(1)">Item 2',
        { content: '<iframe src="evil.com"></iframe>Item 3' }
      ];
      
      const sanitizedArray = sanitizeObject(dirtyArray);
      
      expect(sanitizedArray[0]).not.toContain('<script>');
      expect(sanitizedArray[0]).toContain('Item 1');
      expect(sanitizedArray[1]).not.toContain('onerror');
      expect(sanitizedArray[1]).toContain('Item 2');
      expect(sanitizedArray[2].content).not.toContain('<iframe');
      expect(sanitizedArray[2].content).toContain('Item 3');
    });

    test('should return non-string/object/array values as is', () => {
      expect(sanitizeObject(123)).toBe(123);
      expect(sanitizeObject(true)).toBe(true);
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });
    
    test('should use custom sanitize function when provided', () => {
      const customSanitizer = (str) => str.toUpperCase();
      const obj = { name: 'john', items: ['apple', 'banana'] };
      
      const sanitized = sanitizeObject(obj, customSanitizer);
      
      expect(sanitized.name).toBe('JOHN');
      expect(sanitized.items[0]).toBe('APPLE');
      expect(sanitized.items[1]).toBe('BANANA');
    });
  });

  describe('sanitizeProfileData', () => {
    test('should sanitize profile data with field-specific rules', () => {
      const profileData = {
        name: '<script>alert("XSS")</script>John Doe',
        bio: 'This is <b>formatted</b> with some <script>alert("XSS")</script>',
        email: 'john.doe@example.com<script>alert("XSS")</script>',
        customField: '<img src="x" onerror="alert(1)">Custom Value'
      };
      
      const sanitized = sanitizeProfileData(profileData);
      
      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.name).toBe('John Doe');
      
      expect(sanitized.bio).toContain('<b>formatted</b>');
      expect(sanitized.bio).not.toContain('<script>');
      
      expect(sanitized.email).toBe('john.doe@example.com');
      expect(sanitized.customField).not.toContain('<img');
    });
    
    test('should handle non-object input', () => {
      expect(sanitizeProfileData(null)).toEqual({});
      expect(sanitizeProfileData('string')).toEqual({});
      expect(sanitizeProfileData(123)).toEqual({});
    });
  });
  
  describe('sanitizeWorkoutPlan', () => {
    test('should sanitize workout plan data', () => {
      const workoutPlan = {
        planName: '<script>alert("XSS")</script>My Workout Plan',
        reasoning: 'This plan includes <b>strength</b> training and <script>evil()</script>',
        exercises: [
          {
            name: '<img src="x" onerror="alert(1)">Squats',
            notes: 'Keep your <script>alert("XSS")</script>back straight',
            repsOrRange: '<script>alert("XSS")</script>3x10'
          }
        ],
        researchInsights: [
          'Research shows <script>alert("XSS")</script><b>benefits</b>',
          '<img src="x" onerror="alert(1)">Another insight'
        ]
      };
      
      const sanitized = sanitizeWorkoutPlan(workoutPlan);
      
      expect(sanitized.planName).toBe('My Workout Plan');
      expect(sanitized.reasoning).toContain('<b>strength</b>');
      expect(sanitized.reasoning).not.toContain('<script>');
      
      expect(sanitized.exercises[0].name).toBe('Squats');
      expect(sanitized.exercises[0].notes).toBe('Keep your back straight');
      expect(sanitized.exercises[0].repsOrRange).toBe('3x10');
      
      expect(sanitized.researchInsights[0]).toContain('<b>benefits</b>');
      expect(sanitized.researchInsights[0]).not.toContain('<script>');
      expect(sanitized.researchInsights[1]).not.toContain('<img');
    });
    
    test('should handle non-object input', () => {
      expect(sanitizeWorkoutPlan(null)).toEqual({});
      expect(sanitizeWorkoutPlan('string')).toEqual({});
      expect(sanitizeWorkoutPlan(123)).toEqual({});
    });
  });
  
  describe('isValidEmail', () => {
    test('should validate correct email formats', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('name.surname@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });
    
    test('should reject invalid email formats', () => {
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
      expect(isValidEmail('user domain.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
    
    test('should handle non-string inputs', () => {
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
      expect(isValidEmail(123)).toBe(false);
      expect(isValidEmail({})).toBe(false);
    });
  });
  
  describe('isValidUrl', () => {
    test('should validate correct URL formats', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://subdomain.example.co.uk/path?query=value')).toBe(true);
      expect(isValidUrl('https://example.com:8080/path#fragment')).toBe(true);
    });
    
    test('should reject invalid URL formats', () => {
      expect(isValidUrl('example.com')).toBe(false); // Missing protocol
      expect(isValidUrl('ftp://example.com')).toBe(false); // Not http/https
      expect(isValidUrl('http://')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
    
    test('should handle non-string inputs', () => {
      expect(isValidUrl(null)).toBe(false);
      expect(isValidUrl(undefined)).toBe(false);
      expect(isValidUrl(123)).toBe(false);
      expect(isValidUrl({})).toBe(false);
    });
  });
  
  describe('validateProps', () => {
    test('should filter object to only include allowed properties', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
        internal: 'secret',
        _private: 'hidden'
      };
      
      const allowedProps = ['name', 'email', 'role'];
      const result = validateProps(input, allowedProps);
      
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('role');
      expect(result).not.toHaveProperty('internal');
      expect(result).not.toHaveProperty('_private');
    });
    
    test('should sanitize string properties', () => {
      const input = {
        name: '<script>alert("XSS")</script>John Doe',
        count: 42
      };
      
      const result = validateProps(input, ['name', 'count']);
      
      expect(result.name).not.toContain('<script>');
      expect(result.name).toContain('John Doe');
      expect(result.count).toBe(42); // Non-string should remain unchanged
    });
    
    test('should throw error in strict mode for unexpected properties', () => {
      const input = {
        name: 'John',
        unexpected: 'value'
      };
      
      const allowedProps = ['name', 'email'];
      
      expect(() => validateProps(input, allowedProps, true)).toThrow();
    });
    
    test('should throw error for non-object input', () => {
      expect(() => validateProps('string', [])).toThrow();
      expect(() => validateProps(null, [])).toThrow();
      expect(() => validateProps(123, [])).toThrow();
    });
  });
}); 