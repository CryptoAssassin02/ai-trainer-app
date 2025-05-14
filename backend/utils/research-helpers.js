/**
 * @fileoverview Research helper utilities for formatting queries, extracting insights,
 * validating results, and formatting data from the Perplexity API.
 */

// For simplicity, using console.log for logging. Replace with Winston or another logger if available.
const logger = {
  info: (message) => console.log('INFO: ' + message),
  warn: (message) => console.warn('WARN: ' + message),
  error: (message, error) => console.error('ERROR: ' + message, error || ''),
};

const TRUSTED_DOMAINS = [
  'pubmed.ncbi.nlm.nih.gov',
  'webmd.com',
  'mayoclinic.org',
  'nutrition.gov',
  'nih.gov',
  'cdc.gov',
  'exrx.net', // Added for exercise specifics
  'acefitness.org', // Added for exercise specifics
];

/**
 * Validates the core user parameters required for research queries.
 * @param {object} userParams - The user parameters object.
 * @param {string[]} requiredFields - Array of required field names.
 * @returns {boolean} True if all required fields are present and valid, false otherwise.
 */
function validateUserParams(userParams, requiredFields) {
  if (!userParams) {
    logger.error('User parameters object is missing.');
    return false;
  }
  for (const field of requiredFields) {
    if (
      userParams[field] === undefined ||
      userParams[field] === null ||
      userParams[field] === ''
    ) {
      logger.warn('Missing or invalid required user parameter: ' + field);
      return false;
    }
  }
  return true;
}

/**
 * Formats a generic research query for the Perplexity API based on user parameters and research type.
 * Provides a base structure that specialized formatters can extend.
 *
 * @param {object} userParams - User profile data (e.g., goals, fitnessLevel, equipment, preferences).
 * @param {string} researchType - Type of research (e.g., 'exercise', 'nutrition', 'technique', 'progression').
 * @returns {string|null} An optimized query string for Perplexity, or null if validation fails.
 */
function formatResearchQuery(userParams, researchType) {
  const requiredFields = ['goals', 'fitnessLevel']; // Base required fields
  if (!validateUserParams(userParams, requiredFields)) {
    logger.error(
      'Base validation failed for formatResearchQuery. Missing required fields.'
    );
    return null;
  }

  const {
    goals = [],
    fitnessLevel = 'intermediate',
    equipment = [],
    preferences = {},
    restrictions = [],
  } = userParams;

  const goalStr = goals.join(', ');
  const equipmentStr =
    equipment.length > 0
      ? 'using ' + equipment.join(' or ')
      : 'using no equipment';
  const restrictionStr =
    restrictions.length > 0
      ? ' considering these restrictions: ' + restrictions.join(', ')
      : '';
  const preferenceStr = preferences.dietary
    ? ' suitable for a ' + preferences.dietary + ' diet'
    : '';

  let baseQuery = 'I am a ' + fitnessLevel + ' individual with goals of ' + goalStr;

  switch (researchType) {
    case 'exercise':
      baseQuery += '. What are some effective exercises ' + equipmentStr + restrictionStr + '?';
      break;
    case 'technique':
      // Technique query needs specific exercise, handled by specialized formatter
      baseQuery += '. How do I properly perform specific exercises?'; // Placeholder, needs exercise name
      break;
    case 'nutrition':
      baseQuery += '. What nutritional information is relevant ' + preferenceStr + restrictionStr + '?';
      break;
    case 'progression':
      baseQuery += '. How can I progress in my workouts ' + equipmentStr + restrictionStr + '?';
      break;
    default:
      logger.warn(
        'Unknown researchType ' + researchType + ' provided to formatResearchQuery.'
      );
      baseQuery += '. Provide relevant health and fitness information.';
  }

  // System message for context (optional, depending on how API client handles it)
  // logger.info("System Message: You are a fitness and health research assistant. Provide accurate and safe information based on reputable sources.");

  // Domain filtering (optional, depending on how API client handles it)
  // logger.info("Consider filtering to trusted domains for certain query types.");

  return baseQuery;
}

/**
 * Formats a query specifically for exercise research.
 *
 * @param {object} userParams - User profile data.
 * @returns {string|null} An optimized query string for exercise research, or null if validation fails.
 */
function formatExerciseQuery(userParams) {
  let baseQuery = formatResearchQuery(userParams, 'exercise');
  if (!baseQuery) return null;

  // Add exercise-specific refinements if needed
  // e.g., Focus on specific muscle groups if provided in preferences
  if (userParams.preferences?.targetMuscles) {
    baseQuery += ' Focus on targeting ' + userParams.preferences.targetMuscles.join(', ') + '.';
  }
  baseQuery += ' Include details like difficulty, muscles targeted, and safety precautions.';
  return baseQuery;
}

/**
 * Formats a query specifically for exercise technique research.
 * Requires an exerciseName within userParams.
 *
 * @param {object} userParams - User profile data, must include exerciseName.
 * @returns {string|null} An optimized query string for technique research, or null if validation fails.
 */
function formatTechniqueQuery(userParams) {
  if (!userParams || !userParams.exerciseName) {
    logger.error('Missing exerciseName parameter for formatTechniqueQuery.');
    return null;
  }
  // Use a simplified base query focusing on the technique
  const baseQuery = 'Provide detailed instructions on the proper form and technique for performing ' + userParams.exerciseName + '. Include common mistakes and safety tips.';
  // System message can be added here or handled by the caller
  return baseQuery;
}

/**
 * Formats a query specifically for nutrition research.
 *
 * @param {object} userParams - User profile data.
 * @returns {string|null} An optimized query string for nutrition research, or null if validation fails.
 */
function formatNutritionQuery(userParams) {
  let baseQuery = formatResearchQuery(userParams, 'nutrition');
  if (!baseQuery) return null;

  // Add nutrition-specific refinements
  baseQuery += ' Provide details on macronutrients, calories, benefits, and typical serving sizes.';

  // Suggest domain filtering for nutrition
  logger.info(
    'For nutrition queries, consider using search_domain_filter with domains like nutrition.gov, nih.gov.'
  );
  return baseQuery;
}

/**
 * Formats a query specifically for workout progression research.
 *
 * @param {object} userParams - User profile data.
 * @returns {string|null} An optimized query string for progression research, or null if validation fails.
 */
function formatProgressionQuery(userParams) {
  let baseQuery = formatResearchQuery(userParams, 'progression');
  if (!baseQuery) return null;

  // Add progression-specific refinements
  baseQuery += ' Explain principles like progressive overload, periodization, and modifying exercises to increase difficulty. Provide actionable strategies.';
  return baseQuery;
}

/**
 * Extracts and structures research insights from a raw Perplexity API response.
 *
 * @param {string} rawResponse - The raw response content (e.g., choices[0].message.content).
 * @param {string} researchType - The type of research ('exercise', 'nutrition').
 * @returns {object|null} A structured object with extracted insights, or null if extraction fails.
 */
function extractResearchInsights(rawResponse, researchType) {
  if (!rawResponse || typeof rawResponse !== 'string') {
    logger.error('Invalid or empty rawResponse provided to extractResearchInsights.');
    return null;
  }

  try {
    if (researchType === 'exercise') {
      // Simulate extraction - Use more robust regex
      const nameMatch = rawResponse.match(/Exercise:\s*([^\n]*)/i);
      const descMatch = rawResponse.match(/Description:\s*([^\n]*)/i);
      const diffMatch = rawResponse.match(/Difficulty:\s*([^\n]*)/i);
      const equipMatch = rawResponse.match(/Equipment:\s*([^\n]*)/i);
      const muscleMatch = rawResponse.match(/Muscles Targeted:\s*([^\n]*)/i);
      // Updated instruction regex: capture until next heading or end of string
      const instrMatch = rawResponse.match(/Instructions:\s*([\s\S]*?)(?:\n\n|\n[A-Z][a-zA-Z\s]+:|$)/i);

      const structuredData = {
        name: nameMatch ? nameMatch[1].trim() : 'Unknown Exercise',
        description: descMatch ? descMatch[1].trim() : 'No description available.', // Updated default
        difficulty: diffMatch ? diffMatch[1].trim() : 'Intermediate',
        equipmentNeeded: equipMatch ? equipMatch[1].trim().split(/,\s*/).map(e => e.trim()).filter(e => e) : [], // Split by comma + optional space
        musclesTargeted: muscleMatch ? muscleMatch[1].trim().split(/,\s*/).map(m => m.trim()).filter(m => m) : [], // Split by comma + optional space
        instructions: instrMatch ? instrMatch[1].trim() : 'No instructions provided.', // Updated default
      };
      return formatExerciseData(structuredData);

    } else if (researchType === 'nutrition') {
      // Simulate extraction - Use more robust regex
      const itemMatch = rawResponse.match(/Food Item:\s*([^\n]*)/i);
      const calMatch = rawResponse.match(/Calories:\s*(\d+(?:\.\d+)?)/i); // Allow decimals, non-capturing group
      const proteinMatch = rawResponse.match(/Protein:\s*([^\n]*)/i);
      const carbMatch = rawResponse.match(/Carbs:\s*([^\n]*)/i);
      const fatMatch = rawResponse.match(/Fat:\s*([^\n]*)/i);
      const benefitsMatch = rawResponse.match(/Benefits:\s*([^\n]*)/i);
      const servingMatch = rawResponse.match(/Serving Size:\s*([^\n]*)/i);

      const structuredData = {
        foodItem: itemMatch ? itemMatch[1].trim() : 'Unknown Food Item', // Updated default
        calories: calMatch ? parseFloat(calMatch[1]) : 0,
        macronutrients: {
          // Trim potential 'g' from macros if regex captured it
          protein: proteinMatch ? proteinMatch[1].replace(/g$/i, '').trim() + 'g' : '0g',
          carbs: carbMatch ? carbMatch[1].replace(/g$/i, '').trim() + 'g' : '0g',
          fat: fatMatch ? fatMatch[1].replace(/g$/i, '').trim() + 'g' : '0g',
        },
        benefits: benefitsMatch ? benefitsMatch[1].trim() : 'No benefits listed.', // Updated default
        servingSize: servingMatch ? servingMatch[1].trim() : 'Not specified', // Updated default
      };
      return formatNutritionData(structuredData);

    } else {
      logger.warn('Extraction logic not implemented for researchType: ' + researchType);
      // Return raw text if no specific structure known
      return { rawContent: rawResponse };
    }
  } catch (error) {
    logger.error('Failed to extract research insights from raw response.', error);
    return null; // Indicate failure
  }
}

/**
 * Validates the quality and relevance of structured research results.
 *
 * @param {object} structuredData - The structured data from extractResearchInsights.
 * @param {object} userParams - The original user parameters for the query.
 * @param {string} researchType - The type of research.
 * @param {object} [rawApiResponse={}] - The full raw API response containing citations if available.
 * @returns {boolean} True if the results meet quality standards, false otherwise.
 */
function validateResearchResults(
  structuredData,
  userParams,
  researchType,
  rawApiResponse = {}
) {
  if (!structuredData || typeof structuredData !== 'object') { // Check type too
    logger.warn('Validation failed: Structured data is missing or not an object.');
    return false;
  }
  // Handle the case where extraction returned only rawContent
  if (structuredData.rawContent && Object.keys(structuredData).length === 1) {
      logger.warn('Validation skipped: Structured data only contains rawContent.');
      return false; // Or treat as invalid based on requirements
  }


  let isValid = true;
  const validationMessages = [];

  // 1. Completeness Check
  const requiredFields =
    researchType === 'exercise'
      ? ['name', 'description', 'difficulty', 'instructions']
      : researchType === 'nutrition'
      ? ['foodItem', 'calories', 'macronutrients']
      : [];

  for (const field of requiredFields) {
    const value = structuredData[field];
    let isMissing = false;
    if (value === undefined || value === null || value === '') {
        isMissing = true;
    } else if (Array.isArray(value) && value.length === 0) { // Check for empty arrays
        // Consider if empty arrays are acceptable (e.g., equipmentNeeded: [])
        // isMissing = true; // Uncomment if empty arrays are invalid
    } else if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) { // Check for empty objects
        isMissing = true;
    } else if (field === 'macronutrients' && typeof value === 'object') { // Deeper check for macros
        if (!value.protein || !value.carbs || !value.fat) {
            isMissing = true;
        }
    }


    if (isMissing) {
      validationMessages.push('Missing or empty required field: ' + field);
      isValid = false;
    }
  }

  // 2. Relevance Check (Simple Keyword Check)
  const queryKeywords = [
    userParams.fitnessLevel,
    ...(userParams.goals || []),
    ...(userParams.equipment || []).map(e => e.toLowerCase()), // Ensure lowercase
  ].filter(Boolean);
  const responseText = JSON.stringify(structuredData).toLowerCase();

  let relevantKeywordsFound = queryKeywords.some(keyword =>
     responseText.includes(keyword.toLowerCase())
  );
  // Allow relevance if the query was very specific (e.g., technique for one exercise)
  if (researchType === 'technique' && structuredData.name?.toLowerCase() === userParams.exerciseName?.toLowerCase()) {
      relevantKeywordsFound = true;
  }
  // Allow relevance if no specific keywords were expected (e.g., very generic query)
  if (queryKeywords.length === 0) {
      relevantKeywordsFound = true;
  }


  if (!relevantKeywordsFound) {
    validationMessages.push(
      'Relevance check failed: Response (' + structuredData.name || structuredData.foodItem || 'Unknown' + ') does not seem relevant to query keywords: [' + queryKeywords.join(', ') + ']'
    );
     // Don't fail validation solely on this, but log it.
     // isValid = false; // Optional: make relevance mandatory
  }


  // 3. Trusted Sources Check (Requires citations in rawApiResponse)
  // Ensure rawApiResponse and sources exist and are arrays
  const citations = Array.isArray(rawApiResponse?.choices?.[0]?.sources) ? rawApiResponse.choices[0].sources : [];
  const hasTrustedSource = citations.some(source =>
    source && typeof source.url === 'string' && // Check source and url validity
    TRUSTED_DOMAINS.some(trustedDomain =>
      source.url.includes(trustedDomain)
    )
  );

  if (citations.length > 0 && !hasTrustedSource) {
    const sourceUrls = citations.map(s => s?.url).filter(Boolean).join(', ');
    validationMessages.push(
      'Source check warning: No citations found from predefined trusted domains. Found sources: [' + sourceUrls || 'None' + ']'
    );
    // Potentially don't fail validation, but flag it.
  } else if (citations.length === 0) {
     validationMessages.push('Source check info: No citations provided in the response.');
  }


  // 4. Safety Check (Basic checks for harmful advice or missing precautions)
  if (researchType === 'exercise') {
    const lowerCaseInstructions = (structuredData.instructions || '').toLowerCase();
    const hasSafetyNote = /caution|warning|safety|proper form|consult|doctor|professional|warm up|listen to your body|stop if pain|contraindication/.test(
      lowerCaseInstructions
    );
    if (!lowerCaseInstructions) {
         validationMessages.push('Safety check warning: Exercise instructions are missing.');
    } else if (!hasSafetyNote) {
      validationMessages.push(
        'Safety check warning: Exercise instructions lack common safety precautions or notes.'
      );
       // Don't necessarily fail, but flag strongly.
    }
    // Add checks for explicitly harmful advice if needed (e.g., promoting dangerous techniques)
  }
   // Add safety checks for nutrition if needed (e.g., very low calorie diets, risky supplements)
   if (researchType === 'nutrition') {
       if (structuredData.calories < 800 && structuredData.calories > 0) { // Example check for very low calories
            validationMessages.push(
              `Safety check warning: Very low calorie count (${structuredData.calories}) detected. Verify if appropriate.`
            );
       }
   }


  // 5. User Constraints Check
  if (researchType === 'exercise' && userParams.equipment) {
    const requiredEquipment = (structuredData.equipmentNeeded || [])
        .map(e => typeof e === 'string' ? e.toLowerCase().trim() : '') // Handle non-strings gracefully
        .filter(e => e && e !== 'none'); // Ignore 'none' for check
    const userHasEquipment = (userParams.equipment || [])
        .map(e => typeof e === 'string' ? e.toLowerCase().trim() : '')
        .filter(e => e);

    // If exercise requires equipment, user must have *some* equipment listed or 'various'
    if (requiredEquipment.length > 0 && userHasEquipment.length === 0 && !userHasEquipment.includes('various')) {
         validationMessages.push(
             'Constraint check failed: Exercise requires equipment (' + requiredEquipment.join(', ') + '), but user listed no equipment.'
         );
         isValid = false;
    }
    // If exercise requires specific equipment, check if user has it (unless user has 'various')
    else if (requiredEquipment.length > 0 && !userHasEquipment.includes('various')) {
        const hasAllRequired = requiredEquipment.every(req =>
            req === 'bodyweight' || userHasEquipment.includes(req)
        );
        if (!hasAllRequired) {
            validationMessages.push(
               'Constraint check failed: Exercise requires specific equipment (' + requiredEquipment.join(', ') + ') not listed by user (' + userHasEquipment.join(', ') + ').'
            );
            isValid = false;
        }
    }
  }

  if (researchType === 'nutrition' && userParams.preferences?.dietary) {
      // Basic check, real validation is complex
      const lowerBenefits = (structuredData.benefits || '').toLowerCase();
      const lowerFoodName = (structuredData.foodItem || '').toLowerCase();
      const dietaryPref = userParams.preferences.dietary.toLowerCase();

      // Example: Check if explicitly unsuitable
      if (lowerBenefits.includes('not suitable for ' + dietaryPref) || lowerBenefits.includes('avoid if ' + dietaryPref)) {
          validationMessages.push('Constraint check failed: Nutrition info explicitly unsuitable for user\'s ' + dietaryPref + ' preference.');
          isValid = false;
      }
      // Example: Check if food type obviously contradicts preference (simple cases)
      const commonMeatWords = ['beef', 'pork', 'chicken', 'lamb', 'turkey', 'fish', 'salmon', 'tuna', 'meat'];
      const commonDairyWords = ['milk', 'cheese', 'yogurt', 'dairy', 'whey'];
      const commonEggWords = ['egg'];

      if (dietaryPref === 'vegan' && 
          (commonMeatWords.some(word => lowerFoodName.includes(word)) || 
           commonDairyWords.some(word => lowerFoodName.includes(word)) ||
           commonEggWords.some(word => lowerFoodName.includes(word)))) 
      {
           validationMessages.push(`Constraint check warning: Food item '${structuredData.foodItem}' seems incompatible with vegan preference.`);
      } else if (dietaryPref === 'vegetarian' && 
                 commonMeatWords.some(word => lowerFoodName.includes(word)))
      {
          validationMessages.push(`Constraint check warning: Food item '${structuredData.foodItem}' seems incompatible with vegetarian preference.`);
      }
  }

   // Add checks for user restrictions (e.g., exercise modifications for knee pain)
   if (researchType === 'exercise' && Array.isArray(userParams.restrictions) && userParams.restrictions.length > 0) {
       const lowerInstructions = (structuredData.instructions || '').toLowerCase();
       const lowerDescription = (structuredData.description || '').toLowerCase();
       const mentionsModification = /modification|alternative|adjust|scale back|if you have/.test(lowerInstructions) || /modification|alternative|adjust|scale back|if you have/.test(lowerDescription);

       if (!mentionsModification) {
            const restrictionsStr = userParams.restrictions.join(', ');
            validationMessages.push(
                'Constraint check warning: User has restrictions (' + restrictionsStr + '), but exercise description/instructions don\'t mention modifications or alternatives.'
            );
            // Flag as warning, not necessarily invalid
       }
   }


  if (!isValid) {
    const finalMessage = `Research results validation failed for type '${researchType}' (Name: ${structuredData.name || structuredData.foodItem || 'N/A'}). Issues: ${validationMessages.join('; ')}`;
    logger.warn(finalMessage);
  } else if (validationMessages.length > 0) {
       logger.info(`Validation passed with warnings for type '${researchType}' (Name: ${structuredData.name || structuredData.foodItem || 'N/A'}): ${validationMessages.join('; ')}`);
  } else {
      logger.info(`Research results validated successfully for type '${researchType}' (Name: ${structuredData.name || structuredData.foodItem || 'N/A'}).`);
  }

  return isValid;
}

/**
 * Formats structured exercise data, ensuring consistency and adding defaults.
 *
 * @param {object} structuredData - Partially structured exercise data.
 * @returns {object} A consistently formatted exercise data object.
 */
function formatExerciseData(structuredData) {
  // Ensure equipmentNeeded is an array of strings
  let equipmentNeeded = structuredData.equipmentNeeded || [];
  if (!Array.isArray(equipmentNeeded)) {
      equipmentNeeded = typeof equipmentNeeded === 'string' ? [equipmentNeeded] : [];
  }
  equipmentNeeded = equipmentNeeded.map(e => String(e).trim()).filter(e => e); // Ensure strings, trim, filter empty
  if (equipmentNeeded.length === 0) {
      equipmentNeeded = ['Bodyweight']; // Default if empty after processing
  }


  // Ensure musclesTargeted is an array of strings
  let musclesTargeted = structuredData.musclesTargeted || [];
   if (!Array.isArray(musclesTargeted)) {
       musclesTargeted = typeof musclesTargeted === 'string' ? [musclesTargeted] : [];
   }
   musclesTargeted = musclesTargeted.map(m => String(m).trim()).filter(m => m); // Ensure strings, trim, filter empty


  return {
    name: String(structuredData.name || 'Unknown Exercise').trim(),
    description: String(structuredData.description || 'No description available.').trim(),
    difficulty: String(structuredData.difficulty || 'Intermediate').trim(),
    equipmentNeeded: equipmentNeeded,
    musclesTargeted: musclesTargeted,
    instructions: String(structuredData.instructions || 'No instructions provided.').trim(),
    // Add other fields or transformations as needed
  };
}

/**
 * Formats structured nutrition data, ensuring consistency and adding defaults.
 *
 * @param {object} structuredData - Partially structured nutrition data.
 * @returns {object} A consistently formatted nutrition data object.
 */
function formatNutritionData(structuredData) {
  const macronutrients = structuredData.macronutrients || {};
  return {
    foodItem: String(structuredData.foodItem || 'Unknown Food Item').trim(),
    calories: typeof structuredData.calories === 'number' && !isNaN(structuredData.calories) ? structuredData.calories : 0,
    macronutrients: {
      protein: String(macronutrients.protein || '0g').trim(),
      carbs: String(macronutrients.carbs || '0g').trim(),
      fat: String(macronutrients.fat || '0g').trim(),
    },
    benefits: String(structuredData.benefits || 'No benefits listed.').trim(),
    servingSize: String(structuredData.servingSize || 'Not specified').trim(),
    // Add other fields or transformations as needed
  };
}

// Export all functions
module.exports = {
  formatResearchQuery,
  formatExerciseQuery,
  formatTechniqueQuery,
  formatNutritionQuery,
  formatProgressionQuery,
  extractResearchInsights,
  validateResearchResults,
  formatExerciseData,
  formatNutritionData,
  validateUserParams, // Exporting validation helper might be useful externally
};
