const {
  validateUserParams,
  formatResearchQuery,
  formatExerciseQuery,
  formatTechniqueQuery,
  formatNutritionQuery,
  formatProgressionQuery,
  extractResearchInsights,
  formatExerciseData,
  formatNutritionData,
  validateResearchResults,
  // ... other functions will be imported as needed
} = require('../../utils/research-helpers');

// Mock console methods
let consoleSpy;
let errorSpy;
let warnSpy;

beforeEach(() => {
  // Reset spies before each test
  consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  errorSpy = jest.spyOn(console, 'error').mockImplementation();
  warnSpy = jest.spyOn(console, 'warn').mockImplementation();
});

afterEach(() => {
  // Restore console methods after each test
  consoleSpy.mockRestore();
  errorSpy.mockRestore();
  warnSpy.mockRestore();
});

describe('validateUserParams', () => {
  it('should return true for valid userParams and requiredFields', () => {
    const userParams = { goals: ['strength'], fitnessLevel: 'intermediate' };
    const requiredFields = ['goals', 'fitnessLevel'];
    expect(validateUserParams(userParams, requiredFields)).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should return false and log error if userParams is missing', () => {
    const requiredFields = ['goals', 'fitnessLevel'];
    expect(validateUserParams(null, requiredFields)).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith('ERROR: User parameters object is missing.', '');
  });

  it('should return false and log warning if a required field is missing', () => {
    const userParams = { goals: ['strength'] }; // Missing fitnessLevel
    const requiredFields = ['goals', 'fitnessLevel'];
    expect(validateUserParams(userParams, requiredFields)).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('WARN: Missing or invalid required user parameter: fitnessLevel');
  });

  it('should return false and log warning if a required field is null', () => {
    const userParams = { goals: null, fitnessLevel: 'intermediate' };
    const requiredFields = ['goals', 'fitnessLevel'];
    expect(validateUserParams(userParams, requiredFields)).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('WARN: Missing or invalid required user parameter: goals');
  });

   it('should return false and log warning if a required field is an empty string', () => {
    const userParams = { goals: ['strength'], fitnessLevel: '' };
    const requiredFields = ['goals', 'fitnessLevel'];
    expect(validateUserParams(userParams, requiredFields)).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('WARN: Missing or invalid required user parameter: fitnessLevel');
  });
});

describe('formatResearchQuery', () => {
  const baseUserParams = {
    goals: ['muscle_gain', 'endurance'],
    fitnessLevel: 'advanced',
    equipment: ['barbell', 'dumbbells'],
    preferences: { dietary: 'keto' },
    restrictions: ['shoulder_pain'],
  };

  it('should return null and log error if base validation fails', () => {
    const invalidParams = { goals: ['strength'] }; // Missing fitnessLevel
    expect(formatResearchQuery(invalidParams, 'exercise')).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith('ERROR: Base validation failed for formatResearchQuery. Missing required fields.', '');
  });

  it('should format query correctly for "exercise" type with all params', () => {
    const query = formatResearchQuery(baseUserParams, 'exercise');
    expect(query).toContain('advanced individual');
    expect(query).toContain('goals of muscle_gain, endurance');
    expect(query).toContain('using barbell or dumbbells');
    expect(query).toContain('considering these restrictions: shoulder_pain');
    expect(query).toContain('What are some effective exercises');
    expect(query).not.toContain('nutritional information'); // Ensure type specificity
    expect(query).not.toContain('progress in my workouts');
  });

  it('should format query correctly for "exercise" type with minimal params', () => {
    const minParams = { goals: ['weight_loss'], fitnessLevel: 'beginner' };
    const query = formatResearchQuery(minParams, 'exercise');
    expect(query).toContain('beginner individual');
    expect(query).toContain('goals of weight_loss');
    expect(query).toContain('using no equipment'); // Default equipment
    expect(query).not.toContain('restrictions');
    expect(query).not.toContain('preferences');
    expect(query).toContain('What are some effective exercises');
  });

  it('should format query correctly for "nutrition" type', () => {
    const query = formatResearchQuery(baseUserParams, 'nutrition');
    expect(query).toContain('advanced individual');
    expect(query).toContain('goals of muscle_gain, endurance');
    expect(query).toContain('suitable for a keto diet'); // Preference included
    expect(query).toContain('considering these restrictions: shoulder_pain');
    expect(query).toContain('What nutritional information is relevant');
  });

   it('should format query correctly for "progression" type', () => {
    const query = formatResearchQuery(baseUserParams, 'progression');
    expect(query).toContain('advanced individual');
    expect(query).toContain('goals of muscle_gain, endurance');
    expect(query).toContain('using barbell or dumbbells');
    expect(query).toContain('considering these restrictions: shoulder_pain');
    expect(query).toContain('How can I progress in my workouts');
  });

   it('should handle "technique" type placeholder in base query', () => {
    // formatResearchQuery itself doesn't fully format technique, but sets a base
    const query = formatResearchQuery(baseUserParams, 'technique');
    expect(query).toContain('advanced individual');
    expect(query).toContain('goals of muscle_gain, endurance');
    expect(query).toContain('How do I properly perform specific exercises?'); // Placeholder
  });

  it('should log warning and use default query for unknown researchType', () => {
    const query = formatResearchQuery(baseUserParams, 'unknown_type');
    expect(warnSpy).toHaveBeenCalledWith("WARN: Unknown researchType unknown_type provided to formatResearchQuery.");
    expect(query).toContain('advanced individual');
    expect(query).toContain('goals of muscle_gain, endurance');
    expect(query).toContain('Provide relevant health and fitness information.'); // Default fallback
  });

});

describe('formatExerciseQuery', () => {
   const baseUserParams = {
    goals: ['strength'],
    fitnessLevel: 'intermediate',
   };

   it('should return null if base formatter fails', () => {
       const invalidParams = { goals: ['strength'] }; // Missing fitnessLevel
       expect(formatExerciseQuery(invalidParams)).toBeNull();
       expect(errorSpy).toHaveBeenCalledWith('ERROR: Base validation failed for formatResearchQuery. Missing required fields.', '');
   });

   it('should include base exercise query details', () => {
       const query = formatExerciseQuery(baseUserParams);
       expect(query).toContain('intermediate individual');
       expect(query).toContain('goals of strength');
       expect(query).toContain('What are some effective exercises');
       expect(query).toContain('Include details like difficulty, muscles targeted, and safety precautions.');
   });

    it('should add target muscle focus if present in preferences', () => {
       const paramsWithMuscles = {
           ...baseUserParams,
           preferences: { targetMuscles: ['legs', 'glutes'] }
       };
       const query = formatExerciseQuery(paramsWithMuscles);
       expect(query).toContain('Focus on targeting legs, glutes.');
   });

   it('should not add target muscle focus if not present', () => {
       const query = formatExerciseQuery(baseUserParams);
       expect(query).not.toContain('Focus on targeting');
   });
});

describe('formatTechniqueQuery', () => {
    it('should return null and log error if userParams is missing', () => {
        expect(formatTechniqueQuery(null)).toBeNull();
        expect(errorSpy).toHaveBeenCalledWith('ERROR: Missing exerciseName parameter for formatTechniqueQuery.', '');
    });

    it('should return null and log error if exerciseName is missing', () => {
        const userParams = { fitnessLevel: 'beginner' };
        expect(formatTechniqueQuery(userParams)).toBeNull();
        expect(errorSpy).toHaveBeenCalledWith('ERROR: Missing exerciseName parameter for formatTechniqueQuery.', '');
    });

    it('should format the technique query correctly', () => {
        const userParams = { exerciseName: 'Barbell Squat' };
        const query = formatTechniqueQuery(userParams);
        expect(query).toContain("Provide detailed instructions on the proper form and technique for performing Barbell Squat.");
        expect(query).toContain('Include common mistakes and safety tips.');
    });
});

describe('formatNutritionQuery', () => {
  const baseUserParams = {
    goals: ['weight_loss'],
    fitnessLevel: 'beginner',
    preferences: { dietary: 'vegan' },
  };

  it('should return null if base formatter fails', () => {
    const invalidParams = { goals: ['weight_loss'] }; // Missing fitnessLevel
    expect(formatNutritionQuery(invalidParams)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith('ERROR: Base validation failed for formatResearchQuery. Missing required fields.', '');
  });

  it('should include base nutrition query details', () => {
    const query = formatNutritionQuery(baseUserParams);
    expect(query).toContain('beginner individual');
    expect(query).toContain('goals of weight_loss');
    expect(query).toContain('suitable for a vegan diet');
    expect(query).toContain('What nutritional information is relevant');
    expect(query).toContain('Provide details on macronutrients, calories, benefits, and typical serving sizes.');
  });

  it('should call logger.info regarding domain filtering', () => {
    formatNutritionQuery(baseUserParams);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('For nutrition queries, consider using search_domain_filter'));
  });
});

describe('formatProgressionQuery', () => {
  const baseUserParams = {
    goals: ['strength'],
    fitnessLevel: 'intermediate',
    equipment: ['kettlebell'],
  };

  it('should return null if base formatter fails', () => {
    const invalidParams = { goals: ['strength'] }; // Missing fitnessLevel
    expect(formatProgressionQuery(invalidParams)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith('ERROR: Base validation failed for formatResearchQuery. Missing required fields.', '');
  });

  it('should include base progression query details', () => {
    const query = formatProgressionQuery(baseUserParams);
    expect(query).toContain('intermediate individual');
    expect(query).toContain('goals of strength');
    expect(query).toContain('using kettlebell');
    expect(query).toContain('How can I progress in my workouts');
    expect(query).toContain('Explain principles like progressive overload, periodization, and modifying exercises to increase difficulty. Provide actionable strategies.');
  });
});

describe('extractResearchInsights', () => {
  it('should return null and log error for invalid rawResponse', () => {
    expect(extractResearchInsights(null, 'exercise')).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith('ERROR: Invalid or empty rawResponse provided to extractResearchInsights.', '');
    errorSpy.mockClear(); // Clear spy for next assertion
    expect(extractResearchInsights(123, 'exercise')).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith('ERROR: Invalid or empty rawResponse provided to extractResearchInsights.', '');
  });

  it('should extract exercise data correctly when all fields are present', () => {
    const rawResponse = `Exercise: Bench Press\nDescription: Chest exercise\nDifficulty: Intermediate\nEquipment: Barbell, Bench\nMuscles Targeted: Chest, Triceps, Shoulders\nInstructions: Lie on bench...\nSource: example.com`;
    const result = extractResearchInsights(rawResponse, 'exercise');
    expect(result).toEqual({
      name: 'Bench Press',
      description: 'Chest exercise',
      difficulty: 'Intermediate',
      equipmentNeeded: ['Barbell', 'Bench'],
      musclesTargeted: ['Chest', 'Triceps', 'Shoulders'],
      instructions: 'Lie on bench...',
    });
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should extract exercise data with defaults for missing optional fields', () => {
    const rawResponse = `Exercise: Push-up\nDescription: Bodyweight exercise\nDifficulty: Beginner\nInstructions: Place hands...`;
    const result = extractResearchInsights(rawResponse, 'exercise');
    expect(result).toEqual({
      name: 'Push-up',
      description: 'Bodyweight exercise',
      difficulty: 'Beginner',
      equipmentNeeded: ['Bodyweight'], // Default applied by formatExerciseData
      musclesTargeted: [], // Default applied by formatExerciseData
      instructions: 'Place hands...',
    });
  });

  it('should handle multi-line instructions correctly for exercise', () => {
    const rawResponse = `Exercise: Squat\nDifficulty: Intermediate\nInstructions: Stand with feet shoulder-width apart.\nLower your hips back and down.\nKeep your chest up.\nSource: trusted.com`;
    const result = extractResearchInsights(rawResponse, 'exercise');
    expect(result.instructions).toBe('Stand with feet shoulder-width apart.\nLower your hips back and down.\nKeep your chest up.');
  });

  it('should extract nutrition data correctly when all fields are present', () => {
    const rawResponse = `Food Item: Chicken Breast\nCalories: 165\nProtein: 31g\nCarbs: 0g\nFat: 3.6g\nBenefits: Lean protein source\nServing Size: 100g`;
    const result = extractResearchInsights(rawResponse, 'nutrition');
    expect(result).toEqual({
      foodItem: 'Chicken Breast',
      calories: 165,
      macronutrients: { protein: '31g', carbs: '0g', fat: '3.6g' },
      benefits: 'Lean protein source',
      servingSize: '100g',
    });
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should extract nutrition data with defaults for missing optional fields', () => {
    const rawResponse = `Food Item: Apple\nCalories: 95\nProtein: 0.5g\nCarbs: 25g\nFat: 0.3g`; // Missing benefits, serving size
    const result = extractResearchInsights(rawResponse, 'nutrition');
    expect(result).toEqual({
      foodItem: 'Apple',
      calories: 95,
      macronutrients: { protein: '0.5g', carbs: '25g', fat: '0.3g' },
      benefits: 'No benefits listed.', // Default applied by formatNutritionData
      servingSize: 'Not specified', // Default applied by formatNutritionData
    });
  });

  it('should handle decimal calories correctly for nutrition', () => {
    const rawResponse = `Food Item: Almonds\nCalories: 7.5\nProtein: 0.3g\nCarbs: 0.6g\nFat: 0.6g`;
    const result = extractResearchInsights(rawResponse, 'nutrition');
    expect(result.calories).toBe(7.5);
  });

  it('should return rawContent for unknown researchType and log warning', () => {
    const rawResponse = 'Some generic text response.';
    const result = extractResearchInsights(rawResponse, 'unknown');
    expect(result).toEqual({ rawContent: rawResponse });
    expect(warnSpy).toHaveBeenCalledWith('WARN: Extraction logic not implemented for researchType: unknown');
  });

  it('should return null and log error if internal parsing fails', () => {
    // Simulate an error during regex matching or processing
    const mockRawResponse = 'Exercise: Test\nDescription: Bad Data';
    // Temporarily break String.prototype.match to simulate error
    const originalMatch = String.prototype.match;
    String.prototype.match = jest.fn(() => { throw new Error('Simulated parsing error'); });

    const result = extractResearchInsights(mockRawResponse, 'exercise');
    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith('ERROR: Failed to extract research insights from raw response.', expect.any(Error));

    // Restore original match function
    String.prototype.match = originalMatch;
  });
});

describe('validateResearchResults', () => {
  const baseUserParams = {
    goals: ['strength'],
    fitnessLevel: 'intermediate',
    equipment: ['barbell', 'bench'],
    restrictions: [],
  };

  const baseExerciseData = {
    name: 'Bench Press',
    description: 'Chest exercise',
    difficulty: 'Intermediate',
    equipmentNeeded: ['Barbell', 'Bench'],
    musclesTargeted: ['Chest', 'Triceps', 'Shoulders'],
    instructions: 'Lie on bench, lower bar to chest, press up. Use proper form and a spotter.',
  };

  const baseNutritionData = {
    foodItem: 'Chicken Breast',
    calories: 165,
    macronutrients: { protein: '31g', carbs: '0g', fat: '3.6g' },
    benefits: 'Lean protein source',
    servingSize: '100g',
  };

  it('should return false and log warning for invalid structuredData', () => {
    expect(validateResearchResults(null, baseUserParams, 'exercise')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('WARN: Validation failed: Structured data is missing or not an object.');
    warnSpy.mockClear();
    expect(validateResearchResults(undefined, baseUserParams, 'exercise')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('WARN: Validation failed: Structured data is missing or not an object.');
    warnSpy.mockClear();
    expect(validateResearchResults('not an object', baseUserParams, 'exercise')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('WARN: Validation failed: Structured data is missing or not an object.');
  });

  it('should return false if required exercise field "name" is missing', () => {
    const missingName = { ...baseExerciseData, name: '' };
    expect(validateResearchResults(missingName, baseUserParams, 'exercise')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Missing or empty required field: name'));
  });

  it('should return false if required exercise field "description" is missing', () => {
    const missingDesc = { ...baseExerciseData, description: null };
    expect(validateResearchResults(missingDesc, baseUserParams, 'exercise')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Missing or empty required field: description'));
  });

  it('should return false if required exercise field "difficulty" is missing', () => {
    const missingDiff = { ...baseExerciseData, difficulty: undefined };
    expect(validateResearchResults(missingDiff, baseUserParams, 'exercise')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Missing or empty required field: difficulty'));
  });

  it('should return false if required exercise field "instructions" is missing', () => {
    const missingInstr = { ...baseExerciseData, instructions: '' };
    expect(validateResearchResults(missingInstr, baseUserParams, 'exercise')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Missing or empty required field: instructions'));
  });

  it('should return false if required nutrition field "foodItem" is missing', () => {
    const missingItem = { ...baseNutritionData, foodItem: '' };
    expect(validateResearchResults(missingItem, baseUserParams, 'nutrition')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Missing or empty required field: foodItem'));
  });

  it('should return false if required nutrition field "calories" is missing', () => {
    const missingCals = { ...baseNutritionData, calories: null };
    expect(validateResearchResults(missingCals, baseUserParams, 'nutrition')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Missing or empty required field: calories'));
  });

  it('should return false if required nutrition field "macronutrients" is missing', () => {
    const missingMacros = { ...baseNutritionData, macronutrients: undefined };
    expect(validateResearchResults(missingMacros, baseUserParams, 'nutrition')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Missing or empty required field: macronutrients'));
  });

  it('should return false if required nutrition field "macronutrients.protein" is missing', () => {
    const missingProtein = { ...baseNutritionData, macronutrients: { carbs: '10g', fat: '5g' } };
    expect(validateResearchResults(missingProtein, baseUserParams, 'nutrition')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Missing or empty required field: macronutrients'));
  });

  it('should return false and log warning for invalid structuredData', () => {
    expect(validateResearchResults(null, baseUserParams, 'exercise')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('WARN: Validation failed: Structured data is missing or not an object.');
    warnSpy.mockClear();
    expect(validateResearchResults(undefined, baseUserParams, 'exercise')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('WARN: Validation failed: Structured data is missing or not an object.');
    warnSpy.mockClear();
    expect(validateResearchResults('not an object', baseUserParams, 'exercise')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('WARN: Validation failed: Structured data is missing or not an object.');
  });

  // --- Relevance Check Tests --- 

  it('should log relevance warning when keywords dont match (even if other checks pass)', () => {
    const irrelevantData = { ...baseExerciseData, name: 'Irrelevant Topic', description: 'Something unrelated' };
    const userParams = { ...baseUserParams, goals: ['swimming'], fitnessLevel: 'beginner' };
    // Provide mockApiResponse WITH AN UNTRUSTED SOURCE to force the "warnings" log path
    const apiResponse = mockApiResponseWithSources([{ url: 'https://untrusted-source.com' }]); 

    const result = validateResearchResults(irrelevantData, userParams, 'exercise', apiResponse);

    // Assert the INFO log contains the "Validation passed with warnings" preamble 
    // AND the specific relevance warning 
    // AND the source warning
    expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Validation passed with warnings') &&
        expect.stringContaining('Relevance check failed') &&
        expect.stringContaining('No citations found from predefined trusted domains') &&
        expect.stringContaining('untrusted-source.com')
    );
    expect(warnSpy).not.toHaveBeenCalled(); // Ensure warn wasn't called (isValid should be true)
    expect(result).toBe(true); // Result is true because only warnings occurred
  });

  it('should NOT log relevance warning if keywords match', () => {
    // Provide mockApiResponse to prevent source check warnings
    const apiResponse = mockApiResponseWithSources([{ url: 'https://pubmed.ncbi.nlm.nih.gov/test' }]); 
    const result = validateResearchResults(baseExerciseData, baseUserParams, 'exercise', apiResponse);
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Relevance check failed'));
    expect(result).toBe(true);
    // Check the final success log message
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Research results validated successfully'));
  });

  it('should skip relevance check if queryKeywords are empty', () => {
    const userParams = { ...baseUserParams, goals: [], fitnessLevel: null }; // No keywords
    // Provide mockApiResponse to prevent source check warnings
    const apiResponse = mockApiResponseWithSources([{ url: 'https://www.mayoclinic.org/page' }]);
    const result = validateResearchResults(baseExerciseData, userParams, 'exercise', apiResponse);
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Relevance check failed'));
    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Research results validated successfully'));
  });

  // --- Trusted Sources Check Tests --- 

  const mockApiResponseWithSources = (sources) => ({
    choices: [{ sources: sources }],
  });

  it('should NOT log source warning if only trusted sources are provided', () => {
    const apiResponse = mockApiResponseWithSources([
      { url: 'https://pubmed.ncbi.nlm.nih.gov/test' },
      { url: 'https://www.mayoclinic.org/page' },
    ]);
    const result = validateResearchResults(baseExerciseData, baseUserParams, 'exercise', apiResponse);
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Source check warning'));
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Source check info'));
    expect(result).toBe(true); 
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Research results validated successfully'));
  });

  it('should log source warning (via info) if only untrusted sources are provided', () => {
    const apiResponse = mockApiResponseWithSources([
      { url: 'https://untrusted-blog.com/info' },
      { url: 'https://another-random-site.net' },
    ]);
    const result = validateResearchResults(baseExerciseData, baseUserParams, 'exercise', apiResponse);
    // Assert the INFO log contains the warning message
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No citations found from predefined trusted domains'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('untrusted-blog.com'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('another-random-site.net'));
    expect(warnSpy).not.toHaveBeenCalled(); // Ensure warn wasn't called
    expect(result).toBe(true); // Source warning doesn't cause failure alone
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Validation passed with warnings'));
  });

  it('should NOT log source warning if a mix of trusted and untrusted sources are provided', () => {
    const apiResponse = mockApiResponseWithSources([
      { url: 'https://untrusted-blog.com/info' },
      { url: 'https://www.cdc.gov/page' }, // Trusted source
    ]);
    const result = validateResearchResults(baseExerciseData, baseUserParams, 'exercise', apiResponse);
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Source check warning'));
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Source check info'));
    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Research results validated successfully'));
  });

  it('should log source info if no sources are provided in API response', () => {
    const apiResponse = mockApiResponseWithSources([]); // Empty sources array
    const result = validateResearchResults(baseExerciseData, baseUserParams, 'exercise', apiResponse);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Source check info: No citations provided'));
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Source check warning'));
    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Validation passed with warnings')); // Expect info log with warnings (due to missing citations)

    consoleSpy.mockClear(); // Clear for next check

    const apiResponseNoSourcesField = { choices: [{}] }; // sources field missing
    const result2 = validateResearchResults(baseExerciseData, baseUserParams, 'exercise', apiResponseNoSourcesField);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Source check info: No citations provided'));
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Source check warning'));
    expect(result2).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Validation passed with warnings'));
  });

  it('should handle malformed source objects gracefully', () => {
    const apiResponse = mockApiResponseWithSources([
      { url: 'https://pubmed.ncbi.nlm.nih.gov/test' },
      { url: null }, // Malformed
      { not_url: 'https://untrusted.com' }, // Malformed
      null // Malformed
    ]);
    const result = validateResearchResults(baseExerciseData, baseUserParams, 'exercise', apiResponse);
    // Should still pass as one trusted source exists, and malformed ones are skipped
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Source check warning')); 
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Source check info'));
    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Research results validated successfully'));
  });

  // --- Safety Check Tests ---

  it('should log warn containing safety warning for missing instructions WHEN isValid is false', () => {
    const data = { ...baseExerciseData, instructions: '' }; 
    // Force isValid = false by creating equipment mismatch
    const userParamsNoEquipment = { goals: [], fitnessLevel: 'intermediate', equipment: [], restrictions: [] };
    const apiResponse = mockApiResponseWithSources([{ url: 'https://www.nih.gov/info' }]);

    const result = validateResearchResults(data, userParamsNoEquipment, 'exercise', apiResponse);

    expect(result).toBe(false); // Should return false due to constraint failure
    // Check the WARN log contains both the fatal constraint message and the safety warning
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Research results validation failed') && // Base fatal message
      expect.stringContaining('Constraint check failed: Exercise requires equipment') && // Constraint failure
      expect.stringContaining('Safety check warning: Exercise instructions are missing.') // Safety warning
    );
    expect(consoleSpy).not.toHaveBeenCalled(); // Info should not have been called
  });

  it('should log safety warning for exercise instructions lacking safety keywords', () => {
    const data = { ...baseExerciseData, instructions: 'Just lift the heavy thing.' }; // No safety words
    validateResearchResults(data, baseUserParams, 'exercise');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Exercise instructions lack common safety precautions or notes.'));
  });

  it('should NOT log safety warning for exercise instructions with safety keywords', () => {
    const data = { ...baseExerciseData, instructions: 'Warm up properly before starting. Consult a doctor if unsure.' };
    validateResearchResults(data, baseUserParams, 'exercise');
    // Check the final log doesn't contain the safety warning messages
    const allCalls = consoleSpy.mock.calls.flat(); // Flatten all arguments from all calls
    expect(allCalls.join('; ')).not.toContain('Safety check warning');
  });

  it('should log safety warning for very low nutrition calories', () => {
    const data = { ...baseNutritionData, calories: 750 };
    validateResearchResults(data, baseUserParams, 'nutrition');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Safety check warning: Very low calorie count (750)'));
  });

  it('should NOT log low calorie warning for normal nutrition calories', () => {
    const data = { ...baseNutritionData, calories: 1800 };
    validateResearchResults(data, baseUserParams, 'nutrition');
    const allCalls = consoleSpy.mock.calls.flat();
    expect(allCalls.join('; ')).not.toContain('Very low calorie count');
  });

  // --- User Constraints Check Tests ---

  // Equipment
  it('should return false and log warning for equipment mismatch (exercise requires, user has none)', () => {
    const userParams = { ...baseUserParams, equipment: [] };
    const result = validateResearchResults(baseExerciseData, userParams, 'exercise');
    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Constraint check failed: Exercise requires equipment (barbell, bench), but user listed no equipment.'));
  });

  it('should return false and log warning for equipment mismatch (exercise requires specific, user has different)', () => {
    const userParams = { ...baseUserParams, equipment: ['dumbbell'] };
    const result = validateResearchResults(baseExerciseData, userParams, 'exercise');
    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Constraint check failed: Exercise requires specific equipment (barbell, bench) not listed by user (dumbbell).'));
  });

  it('should pass constraint check if user has required equipment', () => {
    const userParams = { ...baseUserParams, equipment: ['barbell', 'bench', 'kettlebell'] }; // Has required
    const result = validateResearchResults(baseExerciseData, userParams, 'exercise');
    expect(result).toBe(true);
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Constraint check failed: Exercise requires equipment'));
  });

  it('should pass constraint check if exercise requires equipment and user has "various"', () => {
    const userParams = { ...baseUserParams, equipment: ['various'] }; 
    const result = validateResearchResults(baseExerciseData, userParams, 'exercise');
    expect(result).toBe(true);
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Constraint check failed: Exercise requires equipment'));
  });

  it('should pass constraint check if exercise requires bodyweight', () => {
    const data = { ...baseExerciseData, equipmentNeeded: ['bodyweight'] };
    const userParams = { ...baseUserParams, equipment: ['dumbbell'] }; // User has something else
    const result = validateResearchResults(data, userParams, 'exercise');
    expect(result).toBe(true);
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Constraint check failed: Exercise requires equipment'));
  });

  // Dietary
  it('should return false and log warning for explicit dietary conflict', () => {
    const data = { ...baseNutritionData, benefits: 'High protein, not suitable for vegan diets.' };
    const userParams = { ...baseUserParams, preferences: { dietary: 'vegan' } };
    const result = validateResearchResults(data, userParams, 'nutrition');
    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Constraint check failed: Nutrition info explicitly unsuitable for user\'s vegan preference.'));
  });

  it('should log warning for implicit dietary conflict (food name)', () => {
    const data = { 
      ...baseNutritionData, 
      foodItem: 'Beef Steak', 
      calories: 1000, 
      benefits: 'Contains iron, relevant to strength goal'
    };
    const userParams = { ...baseUserParams, preferences: { dietary: 'vegan' }, goals: ['strength'] };
    const apiResponse = mockApiResponseWithSources([{ url: 'https://nutrition.gov/page' }]); 

    const result = validateResearchResults(data, userParams, 'nutrition', apiResponse);
    expect(result).toBe(true); // Implicit conflict is only a warning
    // Simplified Assertion: Check if the log contains the specific warning
    expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Constraint check warning: Food item \'Beef Steak\' seems incompatible with vegan preference.')
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should pass dietary constraint check if compatible', () => {
    const data = { ...baseNutritionData, foodItem: 'Tofu Scramble', benefits: 'Plant-based protein' };
    const userParams = { ...baseUserParams, preferences: { dietary: 'vegan' } };
    const result = validateResearchResults(data, userParams, 'nutrition');
    expect(result).toBe(true);
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Constraint check failed'));
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Constraint check warning'));
  });

  // Restrictions
  it('should log warning if user has restrictions and exercise lacks modification info', () => {
    const userParams = { ...baseUserParams, restrictions: ['knee_pain'] };
    const data = { ...baseExerciseData, instructions: 'Just do the exercise.' }; // No modification keywords
    const result = validateResearchResults(data, userParams, 'exercise');
    expect(result).toBe(true); // Only a warning
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Constraint check warning: User has restrictions (knee_pain), but exercise description/instructions don\'t mention modifications'));
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should pass restriction check if user has restrictions and exercise mentions modifications', () => {
    const userParams = { ...baseUserParams, restrictions: ['knee_pain'] };
    const data = { ...baseExerciseData, instructions: 'Standard form. Alternative: use lighter weight if you have knee issues.' };
    const result = validateResearchResults(data, userParams, 'exercise');
    expect(result).toBe(true);
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Constraint check warning: User has restrictions'));
  });

  it('should pass restriction check if user has no restrictions', () => {
    const userParams = { ...baseUserParams, restrictions: [] }; // No restrictions
    const data = { ...baseExerciseData, instructions: 'Just do the exercise.' };
    const result = validateResearchResults(data, userParams, 'exercise');
    expect(result).toBe(true);
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Constraint check warning: User has restrictions'));
  });

  // --- Success Path Test ---
  it('should return true and log success if all checks pass', () => {
      const apiResponse = mockApiResponseWithSources([{ url: 'https://www.acefitness.org/page' }]);
      const result = validateResearchResults(baseExerciseData, baseUserParams, 'exercise', apiResponse);
      expect(result).toBe(true);
      expect(warnSpy).not.toHaveBeenCalled(); // No fatal warnings
      // Check that no warning messages were logged via info
      const allInfoCalls = consoleSpy.mock.calls.flat();
      expect(allInfoCalls.join('; ')).not.toMatch(/warning/i); 
      // Check the final success message
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Research results validated successfully'));
  });

});

describe('formatExerciseData', () => {
  it('should apply defaults for missing optional fields', () => {
    const input = { name: 'Test Exercise' }; // Missing description, difficulty, etc.
    const result = formatExerciseData(input);
    expect(result).toEqual({
      name: 'Test Exercise',
      description: 'No description available.',
      difficulty: 'Intermediate',
      equipmentNeeded: ['Bodyweight'],
      musclesTargeted: [],
      instructions: 'No instructions provided.',
    });
  });

  it('should format and clean equipmentNeeded array', () => {
    const input1 = { equipmentNeeded: [' Dumbbell ', '', 'Kettlebell'] };
    expect(formatExerciseData(input1).equipmentNeeded).toEqual(['Dumbbell', 'Kettlebell']);

    const input2 = { equipmentNeeded: ' Barbell ' }; // String input
    expect(formatExerciseData(input2).equipmentNeeded).toEqual(['Barbell']);

    const input3 = { equipmentNeeded: [123, '  Cable  '] }; // Number input
    expect(formatExerciseData(input3).equipmentNeeded).toEqual(['123', 'Cable']);

    const input4 = {}; // Missing
    expect(formatExerciseData(input4).equipmentNeeded).toEqual(['Bodyweight']);
  });

  it('should format and clean musclesTargeted array', () => {
    const input1 = { musclesTargeted: [' Chest ', '', 'Triceps'] };
    expect(formatExerciseData(input1).musclesTargeted).toEqual(['Chest', 'Triceps']);

    const input2 = { musclesTargeted: ' Back ' }; // String input
    expect(formatExerciseData(input2).musclesTargeted).toEqual(['Back']);

    const input3 = { musclesTargeted: ['Legs', null] }; // Null input
    expect(formatExerciseData(input3).musclesTargeted).toEqual(['Legs', 'null']); // String(null) = 'null'
    const input4 = {}; // Missing
    expect(formatExerciseData(input4).musclesTargeted).toEqual([]);
  });

  it('should trim string fields', () => {
    const input = { 
      name: ' Trimmed Name  ', 
      description: '  Desc\n  ', 
      difficulty: ' Advanced  ', 
      instructions: '  Instr ' 
    };
    const result = formatExerciseData(input);
    expect(result.name).toBe('Trimmed Name');
    expect(result.description).toBe('Desc');
    expect(result.difficulty).toBe('Advanced');
    expect(result.instructions).toBe('Instr');
  });
});

describe('formatNutritionData', () => {
  it('should apply defaults for missing optional fields', () => {
    const input = { foodItem: 'Test Food' };
    const result = formatNutritionData(input);
    expect(result).toEqual({
      foodItem: 'Test Food',
      calories: 0,
      macronutrients: { protein: '0g', carbs: '0g', fat: '0g' },
      benefits: 'No benefits listed.',
      servingSize: 'Not specified',
    });
  });

  it('should handle calories type correctly', () => {
    const input1 = { calories: '150' }; // String calories
    expect(formatNutritionData(input1).calories).toBe(0); // Expect default 0 if not number

    const input2 = { calories: 250.7 };
    expect(formatNutritionData(input2).calories).toBe(250.7);

    const input3 = { calories: NaN };
    expect(formatNutritionData(input3).calories).toBe(0); // Expect default 0
  });

  it('should handle macronutrients correctly', () => {
    const input1 = { macronutrients: { protein: ' 30g ', carbs: null, fat: ' 10g ' } };
    const result1 = formatNutritionData(input1);
    expect(result1.macronutrients).toEqual({ protein: '30g', carbs: '0g', fat: '10g' });

    const input2 = { macronutrients: { protein: 20 } }; // Number input
    const result2 = formatNutritionData(input2);
    expect(result2.macronutrients).toEqual({ protein: '20', carbs: '0g', fat: '0g' });
  });

  it('should trim string fields', () => {
    const input = { 
      foodItem: ' Trimmed Food  ', 
      benefits: ' Trimmed Benefits  ', 
      servingSize: '  1 cup  ' 
    };
    const result = formatNutritionData(input);
    expect(result.foodItem).toBe('Trimmed Food');
    expect(result.benefits).toBe('Trimmed Benefits');
    expect(result.servingSize).toBe('1 cup');
  });
}); 