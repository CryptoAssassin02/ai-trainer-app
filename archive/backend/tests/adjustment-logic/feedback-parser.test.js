const FeedbackParser = require('../../agents/adjustment-logic/feedback-parser');

describe('FeedbackParser', () => {
  let feedbackParser;
  let mockOpenAI;
  let mockLogger;
  let mockConfig;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock OpenAI client
    mockOpenAI = {
      createChatCompletion: jest.fn()
    };
    
    // Setup mock Logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    // Setup mock config
    mockConfig = {
      model: 'gpt-4-turbo'
    };
    
    // Create a new FeedbackParser instance for each test
    feedbackParser = new FeedbackParser(
      mockOpenAI,
      mockConfig,
      mockLogger
    );
    
    // Mock successful OpenAI completion response
    mockOpenAI.createChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              substitutions: [
                { from: 'Bench Press', to: 'Deadlift', reason: 'user preference' }
              ],
              volumeAdjustments: [
                { exercise: 'Squat', property: 'sets', change: 'increase', value: '4' }
              ],
              intensityAdjustments: [
                { exercise: 'Squat', parameter: 'weight', change: 'increase' }
              ],
              painConcerns: [
                { area: 'lower back', exercise: 'general', severity: 'mild' }
              ],
              scheduleChanges: [
                { type: 'move', details: 'move Monday to Wednesday' }
              ],
              restPeriodChanges: [
                { type: 'between_sets', change: 'increase', value: '90 seconds' }
              ],
              equipmentLimitations: [
                { equipment: 'barbell', alternative: 'dumbbell' }
              ],
              generalFeedback: 'I want to make some adjustments to my workout plan.'
            })
          }
        }
      ]
    });
  });
  
  test('constructor should initialize with required dependencies', () => {
    expect(feedbackParser.openaiService).toBe(mockOpenAI);
    expect(feedbackParser.config).toBe(mockConfig);
    expect(feedbackParser.logger).toBe(mockLogger);
  });
  
  test('constructor should throw error when OpenAIService is not provided', () => {
    expect(() => new FeedbackParser(null, mockConfig, mockLogger))
      .toThrow('[FeedbackParser] OpenAIService instance is required.');
  });
  
  test('parse should call OpenAI API with correct parameters', async () => {
    const feedback = 'I want to add deadlifts and do more squats';
    
    await feedbackParser.parse(feedback);
    
    expect(mockOpenAI.createChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: mockConfig.model,
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.any(String)
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining(feedback)
          })
        ]),
        temperature: expect.any(Number),
        max_tokens: expect.any(Number),
        response_format: { type: "json_object" }
      })
    );
  });
  
  test('parse should return structured feedback when OpenAI returns valid JSON', async () => {
    const feedback = 'I want to add deadlifts and do more squats';
    
    const result = await feedbackParser.parse(feedback);
    
    expect(result).toHaveProperty('parsed');
    expect(result).toHaveProperty('categorized');
    expect(result).toHaveProperty('specifics');
    
    // Check parsed feedback
    expect(result.parsed).toHaveProperty('substitutions');
    expect(result.parsed).toHaveProperty('volumeAdjustments');
    expect(result.parsed).toHaveProperty('intensityAdjustments');
    expect(result.parsed).toHaveProperty('painConcerns');
    expect(result.parsed).toHaveProperty('scheduleChanges');
    expect(result.parsed).toHaveProperty('restPeriodChanges');
    expect(result.parsed).toHaveProperty('equipmentLimitations');
    expect(result.parsed).toHaveProperty('generalFeedback');
    
    // Check categorization
    expect(result.categorized).toHaveProperty('highPriority');
    expect(result.categorized).toHaveProperty('mediumPriority');
    expect(result.categorized).toHaveProperty('lowPriority');
    expect(result.categorized).toHaveProperty('byType');
    expect(result.categorized.byType).toHaveProperty('safety');
    expect(result.categorized.byType).toHaveProperty('convenience');
    expect(result.categorized.byType).toHaveProperty('preference');
    
    // Check specifics
    expect(result.specifics).toHaveProperty('exercisesMentioned');
    expect(result.specifics).toHaveProperty('parametersChanged');
    expect(result.specifics).toHaveProperty('painAreas');
    expect(result.specifics).toHaveProperty('equipmentLimited');
    expect(result.specifics).toHaveProperty('scheduleDaysAffected');
  });
  
  test('parse should handle and log errors from OpenAI API', async () => {
    // Mock a failed API call
    mockOpenAI.createChatCompletion.mockRejectedValue(new Error('API Error'));
    
    const feedback = 'I want to add deadlifts and do more squats';
    
    const result = await feedbackParser.parse(feedback);
    
    // Should fall back to a basic structure rather than throw an error
    expect(result).toHaveProperty('parsed');
    expect(result).toHaveProperty('categorized');
    expect(result).toHaveProperty('specifics');
    
    // Check for both error messages that appear in the logs
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('OpenAI API call failed during feedback parsing'),
      expect.any(Object)
    );
  });
  
  test('parse should handle invalid JSON from OpenAI and use fallback parsing', async () => {
    // Mock OpenAI returning invalid JSON
    mockOpenAI.createChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Not a valid JSON response'
          }
        }
      ]
    });
    
    const feedback = 'I want to add lunges';
    
    const result = await feedbackParser.parse(feedback);
    
    // Should fall back to a basic structure
    expect(result).toHaveProperty('parsed');
    expect(result).toHaveProperty('categorized');
    expect(result).toHaveProperty('specifics');
    
    // Check for the actual warning message used in the implementation
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Using fallback parsing method for feedback')
    );
  });
  
  test('_fallbackParseFeedback should extract basic adjustments from feedback text', () => {
    const feedback = 'Add lunges and remove push-ups';
    
    // Access the private method directly for testing
    const result = feedbackParser._fallbackParseFeedback(feedback);
    
    // Expecting a minimal adjustment structure based on keyword parsing
    expect(result).toHaveProperty('substitutions');
    expect(result).toHaveProperty('volumeAdjustments');
    expect(result).toHaveProperty('intensityAdjustments');
    expect(result).toHaveProperty('scheduleChanges');
    expect(result).toHaveProperty('restPeriodChanges');
    expect(result).toHaveProperty('equipmentLimitations');
    expect(result).toHaveProperty('painConcerns');
    expect(result).toHaveProperty('generalFeedback');
    expect(result.generalFeedback).toBe(feedback);
  });
  
  test('_categorizeAdjustments should properly categorize by priority and type', () => {
    const parsedFeedback = {
      substitutions: [
        { from: 'Bench Press', to: 'Push-up', reason: 'equipment limitation' }
      ],
      volumeAdjustments: [
        { exercise: 'Squat', property: 'sets', change: 'increase' }
      ],
      intensityAdjustments: [
        { exercise: 'all', parameter: 'weight', change: 'increase' }
      ],
      painConcerns: [
        { area: 'knee', exercise: 'Squat', severity: 'moderate' }
      ],
      equipmentLimitations: [
        { equipment: 'barbell', alternative: 'dumbbells' }
      ],
      scheduleChanges: [
        { type: 'move', details: 'move Monday to Wednesday' }
      ],
      restPeriodChanges: [
        { type: 'between_sets', change: 'increase' }
      ]
    };
    
    const categorized = feedbackParser._categorizeAdjustments(parsedFeedback);
    
    // Equipment-related substitution also goes to high priority
    expect(categorized.highPriority.length).toBeGreaterThanOrEqual(2);
    expect(categorized.highPriority.map(item => item.type)).toContain('painConcern');
    expect(categorized.highPriority.map(item => item.type)).toContain('equipmentLimitation');
    
    // Medium priority should include volume and intensity adjustments
    expect(categorized.mediumPriority.length).toBeGreaterThan(0);
    expect(categorized.mediumPriority.map(item => item.type)).toContain('volumeAdjustment');
    expect(categorized.mediumPriority.map(item => item.type)).toContain('intensityAdjustment');
    
    // Low priority should include schedule and rest period changes
    expect(categorized.lowPriority.length).toBeGreaterThan(0);
    expect(categorized.lowPriority.map(item => item.type)).toContain('scheduleChange');
    expect(categorized.lowPriority.map(item => item.type)).toContain('restPeriodChange');
    
    // By type categorization
    expect(categorized.byType.safety.length).toBeGreaterThan(0); // Pain concerns
    expect(categorized.byType.convenience.length).toBeGreaterThan(0); // Equipment limitations, schedule changes
    expect(categorized.byType.preference.length).toBeGreaterThan(0); // Volume, intensity, rest
  });
  
  test('_extractSpecifics should identify key details from parsed feedback', () => {
    const parsedFeedback = {
      substitutions: [
        { from: 'Bench Press', to: 'Push-up', reason: 'equipment limitation' }
      ],
      volumeAdjustments: [
        { exercise: 'Squat', property: 'sets', change: 'increase' }
      ],
      painConcerns: [
        { area: 'knee', exercise: 'Squat', severity: 'moderate' }
      ],
      scheduleChanges: [
        { type: 'move', details: 'move Monday to Wednesday' }
      ]
    };
    
    const specifics = feedbackParser._extractSpecifics(parsedFeedback);
    
    expect(specifics.exercisesMentioned).toContain('bench press');
    expect(specifics.exercisesMentioned).toContain('push-up');
    expect(specifics.exercisesMentioned).toContain('squat');
    
    expect(specifics.parametersChanged).toContain('sets');
    expect(specifics.painAreas).toContain('knee');
    
    // If the implementation correctly extracts days from schedule changes
    expect(specifics.scheduleDaysAffected).toEqual(
      expect.arrayContaining(['monday', 'wednesday'])
    );
  });

  test('parse should ensure all required keys are present in parsedFeedback even if LLM response is incomplete', async () => {
    mockOpenAI.createChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            // LLM returns an object, but it's missing many keys
            content: JSON.stringify({
              generalFeedback: 'Just some general feedback.',
              // substitutions, volumeAdjustments, etc., are missing
            }),
          },
        },
      ],
    });
    const feedback = 'Incomplete LLM response test';
    const result = await feedbackParser.parse(feedback);

    expect(result.parsed).toBeDefined();
    const requiredKeys = ['substitutions', 'volumeAdjustments', 'intensityAdjustments', 'scheduleChanges', 'restPeriodChanges', 'equipmentLimitations', 'painConcerns', 'generalFeedback'];
    requiredKeys.forEach(key => {
      expect(result.parsed).toHaveProperty(key);
      if (key === 'generalFeedback') {
        expect(typeof result.parsed[key]).toBe('string');
      } else {
        expect(Array.isArray(result.parsed[key])).toBe(true);
      }
    });
    expect(result.parsed.generalFeedback).toBe('Just some general feedback.');
    expect(result.parsed.substitutions).toEqual([]);
  });

  describe('_parseFeedbackWithLLM', () => {
    test('should throw error if OpenAI response is empty or invalid (no choices)', async () => {
      mockOpenAI.createChatCompletion.mockResolvedValue({}); // Empty response
      const feedback = 'test feedback';
      await expect(feedbackParser._parseFeedbackWithLLM(feedback))
        .rejects.toThrow('Invalid or empty response from OpenAI service during feedback parsing.');
    });

    test('should throw error if OpenAI response has no message content', async () => {
      mockOpenAI.createChatCompletion.mockResolvedValue({ choices: [{ message: {} }] }); // No content
      const feedback = 'test feedback';
      await expect(feedbackParser._parseFeedbackWithLLM(feedback))
        .rejects.toThrow('Invalid or empty response from OpenAI service during feedback parsing.');
    });
  });

  describe('_fallbackParseFeedback', () => {
    test('should extract substitutions for "replace X with Y" pattern', () => {
      const feedback = 'Please replace Bench Press with Dumbbell Press.';
      const result = feedbackParser._fallbackParseFeedback(feedback);
      expect(result.substitutions).toEqual([
        { from: 'bench press', to: 'dumbbell press', reason: 'Fallback parsing' },
      ]);
      expect(result.generalFeedback).toBe(feedback);
    });

    test('should extract volume adjustments for "more sets" or "increase sets" pattern', () => {
      const feedback = 'I want more sets for squats and also increase sets for lunges.';
      const result = feedbackParser._fallbackParseFeedback(feedback);
      expect(result.volumeAdjustments).toEqual([
        { exercise: 'all', property: 'sets', change: 'increase', reason: 'Fallback parsing' },
      ]);
      // Note: The current fallback only adds one adjustment per type. This test reflects current behavior.
      // If it should find multiple, the implementation of _fallbackParseFeedback would need to change.
      expect(result.generalFeedback).toBe(feedback);
    });
    
    test('should extract volume adjustments for "less reps" or "decrease reps" pattern', () => {
      const feedback = 'Can I do less reps on pull-ups? And also decrease reps for rows.';
      const result = feedbackParser._fallbackParseFeedback(feedback);
      expect(result.volumeAdjustments).toEqual([
        { exercise: 'all', property: 'reps', change: 'decrease', reason: 'Fallback parsing' },
      ]);
      expect(result.generalFeedback).toBe(feedback);
    });

    test('should extract pain concerns for "[body part] pain" pattern', () => {
      const feedback = 'I have knee pain during squats.';
      const result = feedbackParser._fallbackParseFeedback(feedback);
      expect(result.painConcerns).toEqual([
        { area: 'knee', exercise: 'general', severity: 'mentioned', reason: 'Fallback parsing' },
      ]);
      expect(result.generalFeedback).toBe(feedback);
    });

    test('should return default structure with generalFeedback if no specific patterns match', () => {
      const feedback = 'This is a great plan!';
      const result = feedbackParser._fallbackParseFeedback(feedback);
      expect(result.substitutions).toEqual([]);
      expect(result.volumeAdjustments).toEqual([]);
      expect(result.intensityAdjustments).toEqual([]);
      expect(result.scheduleChanges).toEqual([]);
      expect(result.restPeriodChanges).toEqual([]);
      expect(result.equipmentLimitations).toEqual([]);
      expect(result.painConcerns).toEqual([]);
      expect(result.generalFeedback).toBe(feedback);
    });
  });

  describe('_categorizeAdjustments', () => {
    test('should categorize painConcerns into highPriority and byType.safety', () => {
      const parsedFeedback = {
        painConcerns: [{ area: 'knee', exercise: 'squats', severity: 'high' }],
      };
      const categorized = feedbackParser._categorizeAdjustments(parsedFeedback);
      expect(categorized.highPriority).toEqual([
        { type: 'painConcern', data: parsedFeedback.painConcerns[0], reason: 'Safety concern' },
      ]);
      expect(categorized.byType.safety).toEqual([
        { type: 'painConcern', data: parsedFeedback.painConcerns[0], reason: 'Safety concern' },
      ]);
      expect(categorized.mediumPriority).toEqual([]);
      expect(categorized.lowPriority).toEqual([]);
      expect(categorized.byType.convenience).toEqual([]);
      expect(categorized.byType.preference).toEqual([]);
    });

    test('should categorize equipmentLimitations into highPriority and byType.convenience', () => {
      const parsedFeedback = {
        equipmentLimitations: [{ equipment: 'barbell', alternative: 'bodyweight' }],
      };
      const categorized = feedbackParser._categorizeAdjustments(parsedFeedback);
      expect(categorized.highPriority).toEqual([
        { type: 'equipmentLimitation', data: parsedFeedback.equipmentLimitations[0], reason: 'Feasibility constraint' },
      ]);
      expect(categorized.byType.convenience).toEqual([
        { type: 'equipmentLimitation', data: parsedFeedback.equipmentLimitations[0], reason: 'Feasibility constraint' },
      ]);
      expect(categorized.mediumPriority).toEqual([]);
      expect(categorized.lowPriority).toEqual([]);
      expect(categorized.byType.safety).toEqual([]);
      expect(categorized.byType.preference).toEqual([]);
    });

    test('should categorize substitutions (safety reason) into highPriority and byType.safety', () => {
      const parsedFeedback = {
        substitutions: [{ from: 'Squat', to: 'Leg Press', reason: 'knee pain' }],
      };
      const categorized = feedbackParser._categorizeAdjustments(parsedFeedback);
      expect(categorized.highPriority).toEqual([
        { type: 'substitution', data: parsedFeedback.substitutions[0], reason: 'Safety/Pain related' },
      ]);
      expect(categorized.byType.safety).toEqual([
        { type: 'substitution', data: parsedFeedback.substitutions[0], reason: 'Safety/Pain related' },
      ]);
    });

    test('should categorize substitutions (equipment reason) into highPriority and byType.convenience', () => {
      const parsedFeedback = {
        substitutions: [{ from: 'Pull-up', to: 'Lat Pulldown', reason: 'no pull-up bar available' }],
      };
      const categorized = feedbackParser._categorizeAdjustments(parsedFeedback);
      expect(categorized.highPriority).toEqual([
        { type: 'substitution', data: parsedFeedback.substitutions[0], reason: 'Equipment related' },
      ]);
      expect(categorized.byType.convenience).toEqual([
        { type: 'substitution', data: parsedFeedback.substitutions[0], reason: 'Equipment related' },
      ]);
    });

    test('should categorize substitutions (preference reason) into mediumPriority and byType.preference', () => {
      const parsedFeedback = {
        substitutions: [{ from: 'Lunge', to: 'Split Squat', reason: 'prefer split squats' }],
      };
      const categorized = feedbackParser._categorizeAdjustments(parsedFeedback);
      expect(categorized.mediumPriority).toEqual([
        { type: 'substitution', data: parsedFeedback.substitutions[0], reason: 'User preference' },
      ]);
      expect(categorized.byType.preference).toEqual([
        { type: 'substitution', data: parsedFeedback.substitutions[0], reason: 'User preference' },
      ]);
    });

    test('should categorize volumeAdjustments into mediumPriority and byType.preference', () => {
      const parsedFeedback = {
        volumeAdjustments: [{ exercise: 'Squat', property: 'sets', change: 'increase' }],
      };
      const categorized = feedbackParser._categorizeAdjustments(parsedFeedback);
      expect(categorized.mediumPriority).toEqual([
        { type: 'volumeAdjustment', data: parsedFeedback.volumeAdjustments[0], reason: 'Performance/Preference' },
      ]);
      expect(categorized.byType.preference).toEqual([
        { type: 'volumeAdjustment', data: parsedFeedback.volumeAdjustments[0], reason: 'Performance/Preference' },
      ]);
      expect(categorized.highPriority).toEqual([]);
      expect(categorized.lowPriority).toEqual([]);
    });

    test('should categorize intensityAdjustments into mediumPriority and byType.preference', () => {
      const parsedFeedback = {
        intensityAdjustments: [{ exercise: 'all', parameter: 'RPE', change: 'set', value: '8' }],
      };
      const categorized = feedbackParser._categorizeAdjustments(parsedFeedback);
      expect(categorized.mediumPriority).toEqual([
        { type: 'intensityAdjustment', data: parsedFeedback.intensityAdjustments[0], reason: 'Performance/Preference' },
      ]);
      expect(categorized.byType.preference).toEqual([
        { type: 'intensityAdjustment', data: parsedFeedback.intensityAdjustments[0], reason: 'Performance/Preference' },
      ]);
    });

    test('should categorize scheduleChanges into lowPriority and byType.convenience', () => {
      const parsedFeedback = {
        scheduleChanges: [{ type: 'move', details: 'Move Tuesday to Friday' }],
      };
      const categorized = feedbackParser._categorizeAdjustments(parsedFeedback);
      expect(categorized.lowPriority).toEqual([
        { type: 'scheduleChange', data: parsedFeedback.scheduleChanges[0], reason: 'Scheduling preference' },
      ]);
      expect(categorized.byType.convenience).toEqual([
        { type: 'scheduleChange', data: parsedFeedback.scheduleChanges[0], reason: 'Scheduling preference' },
      ]);
    });

    test('should categorize restPeriodChanges into lowPriority and byType.preference', () => {
      const parsedFeedback = {
        restPeriodChanges: [{ type: 'between_sets', change: 'decrease', value: '45s' }],
      };
      const categorized = feedbackParser._categorizeAdjustments(parsedFeedback);
      expect(categorized.lowPriority).toEqual([
        { type: 'restPeriodChange', data: parsedFeedback.restPeriodChanges[0], reason: 'Rest preference' },
      ]);
      expect(categorized.byType.preference).toEqual([
        { type: 'restPeriodChange', data: parsedFeedback.restPeriodChanges[0], reason: 'Rest preference' },
      ]);
    });

    test('should categorize mixed adjustment types correctly', () => {
      const parsedFeedback = {
        painConcerns: [{ area: 'shoulder', exercise: 'Overhead Press' }],
        substitutions: [{ from: 'Lunge', to: 'Split Squat', reason: 'prefer it' }],
        scheduleChanges: [{ type: 'add_day', details: 'add Saturday workout' }],
      };
      const categorized = feedbackParser._categorizeAdjustments(parsedFeedback);
      
      expect(categorized.highPriority.length).toBe(1);
      expect(categorized.highPriority[0].type).toBe('painConcern');
      expect(categorized.byType.safety.length).toBe(1);
      expect(categorized.byType.safety[0].type).toBe('painConcern');

      expect(categorized.mediumPriority.length).toBe(1);
      expect(categorized.mediumPriority[0].type).toBe('substitution');
      expect(categorized.byType.preference.length).toBe(1); // Substitution is preference here
      expect(categorized.byType.preference[0].type).toBe('substitution');

      expect(categorized.lowPriority.length).toBe(1);
      expect(categorized.lowPriority[0].type).toBe('scheduleChange');
      expect(categorized.byType.convenience.length).toBe(1);
      expect(categorized.byType.convenience[0].type).toBe('scheduleChange');
    });
  });

  describe('_extractSpecifics', () => {
    test('should ignore "all" and "general" as specific exercise names', () => {
      const parsedFeedback = {
        volumeAdjustments: [{ exercise: 'all', property: 'sets', change: 'increase' }],
        painConcerns: [{ area: 'knee', exercise: 'general', severity: 'mild' }],
      };
      const specifics = feedbackParser._extractSpecifics(parsedFeedback);
      expect(specifics.exercisesMentioned).toEqual([]);
    });

    test('should handle missing or null fields gracefully when extracting specifics', () => {
      const parsedFeedback = {
        substitutions: [{ from: 'Squat' /* to is missing */ }],
        volumeAdjustments: [{ exercise: 'Bench' /* property is missing */, change: 'increase' }],
        painConcerns: [{ area: 'shoulder' /* exercise is missing */ }],
      };
      const specifics = feedbackParser._extractSpecifics(parsedFeedback);
      expect(specifics.exercisesMentioned).toEqual(['squat', 'bench']);
      expect(specifics.parametersChanged).toEqual([]);
      expect(specifics.painAreas).toEqual(['shoulder']);
    });

    test('should convert extracted specifics to lowercase', () => {
      const parsedFeedback = {
        substitutions: [{ from: 'SQUAT', to: 'Leg Press' }],
        painConcerns: [{ area: 'KNEE', exercise: 'LUNGES' }],
      };
      const specifics = feedbackParser._extractSpecifics(parsedFeedback);
      expect(specifics.exercisesMentioned).toEqual(expect.arrayContaining(['squat', 'leg press', 'lunges']));
      expect(specifics.painAreas).toEqual(expect.arrayContaining(['knee']));
    });

    test('should extract specifics from substitutions', () => {
      const parsedFeedback = {
        substitutions: [{ from: 'Barbell Squat', to: 'Goblet Squat' }],
      };
      const specifics = feedbackParser._extractSpecifics(parsedFeedback);
      expect(specifics.exercisesMentioned).toEqual(expect.arrayContaining(['barbell squat', 'goblet squat']));
    });

    test('should extract specifics from volumeAdjustments', () => {
      const parsedFeedback = {
        volumeAdjustments: [{ exercise: 'Deadlift', property: 'sets', change: 'increase' }],
      };
      const specifics = feedbackParser._extractSpecifics(parsedFeedback);
      expect(specifics.exercisesMentioned).toEqual(expect.arrayContaining(['deadlift']));
      expect(specifics.parametersChanged).toEqual(expect.arrayContaining(['sets']));
    });

    test('should extract specifics from intensityAdjustments', () => {
      const parsedFeedback = {
        intensityAdjustments: [{ exercise: 'Bench Press', parameter: 'RPE', change: 'increase' }],
      };
      const specifics = feedbackParser._extractSpecifics(parsedFeedback);
      expect(specifics.exercisesMentioned).toEqual(expect.arrayContaining(['bench press']));
      expect(specifics.parametersChanged).toEqual(expect.arrayContaining(['rpe']));
    });

    test('should extract specifics from scheduleChanges', () => {
      const parsedFeedback = {
        scheduleChanges: [{ type: 'move', details: 'move Monday to Wednesday and shift Friday to Saturday' }],
      };
      const specifics = feedbackParser._extractSpecifics(parsedFeedback);
      expect(specifics.scheduleDaysAffected).toEqual(expect.arrayContaining(['monday', 'wednesday', 'friday', 'saturday']));
    });

    test('should extract specifics from restPeriodChanges', () => {
      const parsedFeedback = {
        restPeriodChanges: [{ type: 'between_sets', change: 'set', value: '75s' }],
      };
      const specifics = feedbackParser._extractSpecifics(parsedFeedback);
      expect(specifics.parametersChanged).toEqual(expect.arrayContaining(['rest_between_sets']));
    });

    test('should extract specifics from equipmentLimitations', () => {
      const parsedFeedback = {
        equipmentLimitations: [{ equipment: 'Cable Machine', alternative: 'bands' }],
      };
      const specifics = feedbackParser._extractSpecifics(parsedFeedback);
      expect(specifics.equipmentLimited).toEqual(expect.arrayContaining(['cable machine']));
    });

    test('should extract specifics from painConcerns', () => {
      const parsedFeedback = {
        painConcerns: [{ area: 'Elbow', exercise: 'Tricep Extension', severity: 'moderate' }],
      };
      const specifics = feedbackParser._extractSpecifics(parsedFeedback);
      expect(specifics.painAreas).toEqual(expect.arrayContaining(['elbow']));
      expect(specifics.exercisesMentioned).toEqual(expect.arrayContaining(['tricep extension']));
    });
  });

  describe('_validateParsedFeedback', () => {
    test('should include LLM contradictionsDetected in warnings', () => {
      const parsedJson = {
        contradictionsDetected: ['Contradiction 1'],
        ambiguityNotes: [],
      };
      const { warnings } = feedbackParser._validateParsedFeedback(parsedJson);
      expect(warnings).toEqual(expect.arrayContaining([
        { type: 'contradiction', message: 'Contradiction 1' },
      ]));
    });

    test('should include LLM ambiguityNotes in warnings', () => {
      const parsedJson = {
        contradictionsDetected: [],
        ambiguityNotes: ['Ambiguity 1'],
      };
      const { warnings } = feedbackParser._validateParsedFeedback(parsedJson);
      expect(warnings).toEqual(expect.arrayContaining([
        { type: 'ambiguity', message: 'Ambiguity 1' },
      ]));
    });

    test('should add heuristic warning for add/remove same exercise substitution', () => {
      const parsedJson = {
        substitutions: [{ from: 'squat', to: 'squat' }],
      };
      const { warnings } = feedbackParser._validateParsedFeedback(parsedJson);
      expect(warnings).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'contradiction', message: expect.stringContaining('substitute TO \'squat\' but also substitute FROM the same exercise') }),
      ]));
    });

    test('should add heuristic warning for increase/decrease volume for same exercise', () => {
      const parsedJson = {
        volumeAdjustments: [
          { exercise: 'bench', change: 'increase' },
          { exercise: 'bench', change: 'decrease' },
        ],
      };
      const { warnings } = feedbackParser._validateParsedFeedback(parsedJson);
      expect(warnings).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'contradiction', message: expect.stringContaining('Conflicting volume requests (increase and decrease) for exercise: \'bench\'') }),
      ]));
    });

    test('should add heuristic warning for pain concern and intensity increase for same exercise', () => {
      const parsedJson = {
        painConcerns: [{ area: 'knee', exercise: 'Squat' }],
        intensityAdjustments: [{ exercise: 'Squat', change: 'increase' }],
      };
      const { warnings } = feedbackParser._validateParsedFeedback(parsedJson);
      expect(warnings).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'contradiction/safety', message: expect.stringContaining('User reported pain with \'squat\' but also requested an intensity increase') }),
      ]));
    });

    test('should add heuristic warning for pain concern and volume increase for same exercise', () => {
      const parsedJson = {
        painConcerns: [{ area: 'knee', exercise: 'Squat' }],
        volumeAdjustments: [{ exercise: 'Squat', change: 'increase' }],
      };
      const { warnings } = feedbackParser._validateParsedFeedback(parsedJson);
      expect(warnings).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'contradiction/safety', message: expect.stringContaining('User reported pain with \'squat\' but also requested a volume increase') }),
      ]));
    });

    test('should return empty warnings if no contradictions or ambiguities are found', () => {
      const parsedJson = {
        substitutions: [{ from: 'squat', to: 'leg press' }],
        volumeAdjustments: [{ exercise: 'bench', change: 'increase' }],
        painConcerns: [{area: 'shoulder', exercise: 'flys'}]
      };
      const { warnings } = feedbackParser._validateParsedFeedback(parsedJson);
      expect(warnings).toEqual([]);
    });
  });
}); 