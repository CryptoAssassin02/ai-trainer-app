const winston = require('winston'); // Assuming Winston is used for logging elsewhere

// Configure a default logger if none is provided externally
const defaultLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
});

// Constants for conversions
const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 1 / KG_TO_LBS;
const CM_TO_IN = 0.393701;
const IN_TO_CM = 1 / CM_TO_IN;

// TDEE Multipliers based on activity level descriptions
const TDEE_MULTIPLIERS = {
    sedentary: 1.2,         // Little to no exercise
    lightly_active: 1.375, // Light exercise/sports 1-3 days/week
    moderately_active: 1.55,// Moderate exercise/sports 3-5 days/week
    very_active: 1.725,    // Hard exercise/sports 6-7 days a week
    extra_active: 1.9,     // Very hard exercise/sports & physical job or 2x training
    // Alias for common terms
    light: 1.375,
    moderate: 1.55,
    active: 1.725, // Often used for 'very_active'
    extreme: 1.9,
    // Ensure consistency with API docs or frontend values
    '1-3': 1.375,
    '3-5': 1.55,
    '6-7': 1.725,
    'daily': 1.725, // Map 'daily' to a reasonable level like very_active
};

// AMDR (Acceptable Macronutrient Distribution Ranges) - General Guidelines
const AMDR_DEFAULTS = {
    protein: { min: 0.10, max: 0.35 }, // 10-35%
    carbs:   { min: 0.45, max: 0.65 }, // 45-65%
    fat:     { min: 0.20, max: 0.35 }, // 20-35%
};

// Calories per gram for macronutrients
const CALORIES_PER_GRAM = {
    protein: 4,
    carbs: 4,
    fat: 9,
};

/**
 * Validates essential user input data for BMR calculation.
 * Handles both metric numbers and imperial height objects.
 * @param {object} userData - User data object.
 * @param {number} userData.age - Age in years.
 * @param {number} userData.weight - Weight.
 * @param {number|object} userData.height - Height (number for metric cm, object {feet, inches} or number for imperial inches).
 * @param {string} userData.gender - 'male' or 'female'.
 * @param {string} userData.units - 'metric' or 'imperial'.
 * @param {object} [logger=defaultLogger] - Optional logger instance.
 * @returns {boolean} True if valid, throws error otherwise.
 * @throws {Error} If any input is invalid or missing.
 */
function validateBMRInputs(userData, logger = defaultLogger) {
    const requiredFields = ['age', 'weight', 'height', 'gender', 'units'];
    for (const field of requiredFields) {
        if (userData[field] == null) {
            logger.error(`Validation Error: Missing required field '${field}' for BMR calculation.`);
            throw new Error(`Missing required field '${field}' for BMR calculation.`);
        }
    }

    if (typeof userData.age !== 'number' || isNaN(userData.age) || userData.age <= 0 || userData.age > 120) {
        logger.error(`Validation Error: Invalid age '${userData.age}'. Must be a number between 1 and 120.`);
        throw new Error("Invalid age provided. Age must be between 1 and 120.");
    }
    if (typeof userData.weight !== 'number' || isNaN(userData.weight) || userData.weight <= 0) {
        logger.error(`Validation Error: Invalid weight '${userData.weight}'. Must be a positive number.`);
        throw new Error("Invalid weight provided. Weight must be positive.");
    }

    // Validate height based on units
    const units = userData.units.toLowerCase();
    // Explicitly validate units first
    if (units !== 'metric' && units !== 'imperial') {
        logger.error(`Validation Error: Invalid units '${userData.units}'. Must be 'metric' or 'imperial'.`);
        throw new Error("Invalid units provided. Units must be 'metric' or 'imperial'.");
    }

    // Now validate height based on the confirmed valid unit type
    if (units === 'metric') {
        if (typeof userData.height !== 'number' || isNaN(userData.height) || userData.height <= 0) {
            logger.error(`Validation Error: Invalid metric height '${userData.height}'. Must be a positive number.`);
            throw new Error("Invalid metric height provided. Height must be positive.");
        }
    } else { // units === 'imperial'
        if (typeof userData.height === 'number') {
            if (isNaN(userData.height) || userData.height <= 0) {
                logger.error(`Validation Error: Invalid imperial height (total inches) '${userData.height}'. Must be positive.`);
                throw new Error("Invalid imperial height (total inches) provided. Height must be positive.");
            }
        } else if (typeof userData.height === 'object' && userData.height.feet != null && userData.height.inches != null) {
            if (typeof userData.height.feet !== 'number' || isNaN(userData.height.feet) ||
                typeof userData.height.inches !== 'number' || isNaN(userData.height.inches) ||
                userData.height.feet < 0 || userData.height.inches < 0 || 
                (userData.height.feet === 0 && userData.height.inches === 0) || 
                userData.height.inches >= 12) {
                logger.error(`Validation Error: Invalid imperial height object {feet: ${userData.height.feet}, inches: ${userData.height.inches}}. Feet/inches must be non-negative numbers, inches < 12.`);
                throw new Error("Invalid imperial height object provided. Check feet/inches values.");
            }
        } else {
            logger.error(`Validation Error: Invalid imperial height format. Expected positive number (total inches) or {feet, inches} object.`);
            throw new Error("Invalid imperial height format provided.");
        }
    }

    // Validate gender
    if (typeof userData.gender !== 'string') {
         logger.error(`Validation Error: Invalid gender type '${typeof userData.gender}'. Must be a string.`);
         throw new Error("Invalid gender provided. Gender must be 'male' or 'female'.");
    }
    const gender = userData.gender.toLowerCase();
    if (gender !== 'male' && gender !== 'female') {
        logger.error(`Validation Error: Invalid gender '${userData.gender}'. Must be 'male' or 'female'.`);
        throw new Error("Invalid gender provided. Gender must be 'male' or 'female'.");
    }

    return true;
}

/**
 * Converts weight between kilograms (kg) and pounds (lbs).
 * @param {number} value - The weight value to convert.
 * @param {'kg'|'lbs'} fromUnit - The unit to convert from.
 * @param {'kg'|'lbs'} toUnit - The unit to convert to.
 * @returns {number} The converted weight value.
 * @throws {Error} If units are invalid.
 */
function convertWeight(value, fromUnit, toUnit) {
    if (fromUnit === toUnit) return value;
    if (fromUnit === 'kg' && toUnit === 'lbs') return value * KG_TO_LBS;
    if (fromUnit === 'lbs' && toUnit === 'kg') return value * LBS_TO_KG;
    throw new Error(`Invalid weight conversion: ${fromUnit} to ${toUnit}`);
}

/**
 * Converts height between centimeters (cm) and inches (in).
 * Handles potential feet/inches object for imperial input.
 * @param {number|object} value - The height value (number for cm, object { feet, inches } or number for inches).
 * @param {'cm'|'in'|'ft_in'} fromUnit - The unit to convert from.
 * @param {'cm'|'in'} toUnit - The unit to convert to.
 * @param {object} [logger=defaultLogger] - Optional logger instance.
 * @returns {number} The converted height value in the target unit (cm or in).
 * @throws {Error} If units are invalid or input format is wrong.
 */
function convertHeight(value, fromUnit, toUnit, logger = defaultLogger) {
    let heightInCm;

    // Step 1: Convert input to a consistent base unit (cm)
    if (fromUnit === 'cm') {
        if (typeof value !== 'number') throw new Error('Invalid height value for cm unit.');
        heightInCm = value;
    } else if (fromUnit === 'in') {
        if (typeof value !== 'number') throw new Error('Invalid height value for inches unit.');
        heightInCm = value * IN_TO_CM;
    } else if (fromUnit === 'ft_in') {
        if (typeof value === 'object' && value.feet != null && value.inches != null) {
            // Assume validation already happened
            const totalInches = (value.feet * 12) + value.inches;
            heightInCm = totalInches * IN_TO_CM;
        } else if (typeof value === 'number') { // Assume value is total inches if ft_in specified but number given
             logger.warn('Height provided as number with ft_in unit, assuming total inches.'); // Use logger
             heightInCm = value * IN_TO_CM;
        } else {
            throw new Error('Invalid height value for ft_in unit. Expected { feet, inches } or total inches.');
        }
    } else {
        throw new Error(`Invalid source height unit: ${fromUnit}`);
    }

    // Step 2: Convert from base unit (cm) to target unit
    if (toUnit === 'cm') {
        return heightInCm;
    } else if (toUnit === 'in') {
        return heightInCm * CM_TO_IN;
    } else {
        throw new Error(`Invalid target height unit: ${toUnit}`);
    }
}


/**
 * Calculates Basal Metabolic Rate (BMR) using the Mifflin-St Jeor equation.
 * Handles unit conversion internally based on userData.units.
 * @param {object} userData - User data containing age, weight, height, gender, and units.
 * @param {number} userData.age - Age in years.
 * @param {number} userData.weight - Weight (value depends on units).
 * @param {number|object} userData.height - Height (value depends on units; object {feet, inches} for imperial).
 * @param {string} userData.gender - 'male' or 'female'.
 * @param {string} userData.units - 'metric' or 'imperial'.
 * @param {object} [logger=defaultLogger] - Optional logger instance.
 * @returns {number} BMR in calories, rounded to the nearest whole number.
 * @throws {Error} If input validation fails.
 */
function calculateBMR(userData, logger = defaultLogger) {
    validateBMRInputs(userData, logger);

    const gender = userData.gender.toLowerCase();
    const units = userData.units.toLowerCase();

    const weightInKg = units === 'metric' ? userData.weight : convertWeight(userData.weight, 'lbs', 'kg');
    // Use the correct unit ('ft_in' or 'in') based on how imperial height is stored/passed
    const heightSourceUnit = units === 'imperial' ? (typeof userData.height === 'object' ? 'ft_in' : 'in') : 'cm';
    const heightInCm = units === 'metric' ? userData.height : convertHeight(userData.height, heightSourceUnit , 'cm', logger); // Pass logger

    let bmr;
    if (gender === 'male') {
        bmr = (10 * weightInKg) + (6.25 * heightInCm) - (5 * userData.age) + 5;
    } else { // female
        bmr = (10 * weightInKg) + (6.25 * heightInCm) - (5 * userData.age) - 161;
    }

    logger.info({ ...userData, calculatedBMR: Math.round(bmr) }, 'BMR calculated');
    return Math.round(bmr);
}

/**
 * Calculates Total Daily Energy Expenditure (TDEE).
 * @param {number} bmr - Basal Metabolic Rate (in calories).
 * @param {string} activityLevel - User's activity level key (e.g., 'sedentary', 'moderately_active').
 * @param {object} [logger=defaultLogger] - Optional logger instance.
 * @returns {number} TDEE in calories, rounded to the nearest whole number.
 * @throws {Error} If BMR is invalid or activity level is not recognized.
 */
function calculateTDEE(bmr, activityLevel, logger = defaultLogger) {
    if (typeof bmr !== 'number' || isNaN(bmr) || bmr <= 0) {
        logger.error(`Validation Error: Invalid BMR value '${bmr}' for TDEE calculation.`);
        throw new Error("Invalid BMR value provided for TDEE calculation.");
    }
    if (!activityLevel || typeof activityLevel !== 'string') {
         logger.error(`Validation Error: Activity level must be provided as a string.`);
         throw new Error("Activity level must be provided as a string.");
    }

    const levelKey = activityLevel.toLowerCase().replace(/\s+/g, ''); // Normalize key
    const multiplier = TDEE_MULTIPLIERS[levelKey];

    if (!multiplier) {
        logger.error(`Validation Error: Unrecognized activity level '${activityLevel}'. Cannot calculate TDEE.`);
        // Consider falling back to a default (e.g., sedentary) or throwing
        throw new Error(`Unrecognized activity level: ${activityLevel}. Valid levels: ${Object.keys(TDEE_MULTIPLIERS).join(', ')}`);
    }

    const tdee = bmr * multiplier;
    logger.info({ bmr, activityLevel, multiplier, calculatedTDEE: Math.round(tdee) }, 'TDEE calculated');
    return Math.round(tdee);
}

/**
 * Calculates macronutrient distribution (protein, carbs, fat) in grams and total calories.
 * Adjusts percentages based on goals (weight loss, muscle gain, maintenance).
 * @param {number} tdee - Total Daily Energy Expenditure (in calories).
 * @param {Array<string>} goals - Array of user goals (e.g., ['weight_loss'], ['muscle_gain']).
 * @param {object} [logger=defaultLogger] - Optional logger instance.
 * @returns {object} Object containing { protein_g, carbs_g, fat_g, calories } rounded to nearest whole number.
 * @throws {Error} If TDEE is invalid or goals array is empty/invalid.
 */
function calculateMacros(tdee, goals, logger = defaultLogger) {
    if (typeof tdee !== 'number' || isNaN(tdee) || tdee <= 0) {
        logger.error(`Validation Error: Invalid TDEE value '${tdee}' for macro calculation.`);
        throw new Error("Invalid TDEE value provided for macro calculation.");
    }
    if (!Array.isArray(goals) || goals.length === 0) {
        logger.warn("No goals provided for macro calculation. Using maintenance defaults.");
        goals = ['maintenance']; // Default to maintenance if no goals specified
    }

    // Determine primary goal for macro adjustment (simplified: takes the first recognized goal)
    const primaryGoal = goals.map(g => g.toLowerCase()).find(g => ['weight_loss', 'muscle_gain', 'maintenance', 'endurance'].includes(g)) || 'maintenance';

    let proteinPercent = 0.25; // Default percentage
    let carbsPercent = 0.50;
    let fatPercent = 0.25;

    // Adjust percentages based on the primary goal
    switch (primaryGoal) {
        case 'weight_loss':
            proteinPercent = 0.30; // Higher protein for satiety and muscle preservation
            fatPercent = 0.25;
            carbsPercent = 1.0 - proteinPercent - fatPercent; // Carbs make up the remainder
            // Apply deficit implicitly via TDEE calculation passed in, or adjust TDEE here if needed.
            // Example: tdee = tdee - 500; // Apply deficit directly - REQUIRES TDEE to be adjustable or pre-adjusted.
            // For simplicity, assume TDEE passed already reflects deficit/surplus if needed.
            break;
        case 'muscle_gain':
            proteinPercent = 0.30; // Higher protein for muscle synthesis
            carbsPercent = 0.45;
            fatPercent = 1.0 - proteinPercent - carbsPercent;
            // Assume TDEE includes surplus.
            break;
        case 'endurance':
             proteinPercent = 0.20; // Moderate protein
             carbsPercent = 0.55; // Higher carbs for fuel
             fatPercent = 1.0 - proteinPercent - carbsPercent;
             break;
        case 'maintenance':
        default:
            // Use balanced AMDR mid-points or provided defaults
            proteinPercent = 0.20;
            carbsPercent = 0.50;
            fatPercent = 0.30;
            break;
    }

    // Ensure percentages sum roughly to 1 (allow for minor floating point issues)
    if (Math.abs(proteinPercent + carbsPercent + fatPercent - 1.0) > 0.01) {
        logger.error({ primaryGoal, proteinPercent, carbsPercent, fatPercent }, "Macro percentages do not sum to 1. Check goal logic.");
        // Fallback to safe defaults
        proteinPercent = 0.20; carbsPercent = 0.50; fatPercent = 0.30;
        // Potentially throw an error if this indicates a critical logic flaw
        // throw new Error("Internal error: Macro percentage calculation failed.");
    }

    // Calculate grams based on percentages and calories per gram
    const proteinCalories = tdee * proteinPercent;
    const carbsCalories = tdee * carbsPercent;
    const fatCalories = tdee * fatPercent;

    const proteinGrams = Math.round(proteinCalories / CALORIES_PER_GRAM.protein);
    const carbsGrams = Math.round(carbsCalories / CALORIES_PER_GRAM.carbs);
    const fatGrams = Math.round(fatCalories / CALORIES_PER_GRAM.fat);

    // Recalculate total calories from grams for accuracy
    const totalCalculatedCalories = (proteinGrams * CALORIES_PER_GRAM.protein) +
                                    (carbsGrams * CALORIES_PER_GRAM.carbs) +
                                    (fatGrams * CALORIES_PER_GRAM.fat);

    const results = {
        protein_g: proteinGrams,
        carbs_g: carbsGrams,
        fat_g: fatGrams,
        calories: Math.round(totalCalculatedCalories) // Return the calorie total derived from calculated grams
    };

    logger.info({ tdee, goals, primaryGoal, percentages: { proteinPercent, carbsPercent, fatPercent }, calculatedMacros: results }, 'Macros calculated');
    return results;
}

/**
 * Formats the calculation results into a standard object.
 * Currently integrated into the calculation functions themselves, but could be separate.
 * @param {number} bmr
 * @param {number} tdee
 * @param {object} macros - Object with { protein_g, carbs_g, fat_g, calories }
 * @returns {object} Formatted results object.
 */
// function formatResults(bmr, tdee, macros) {
//     return {
//         bmr,
//         tdee,
//         macros
//     };
// }

module.exports = {
    calculateBMR,
    calculateTDEE,
    calculateMacros,
    convertWeight,
    convertHeight,
    validateBMRInputs, // Export validation if needed elsewhere
    TDEE_MULTIPLIERS, // Export constants if useful
    AMDR_DEFAULTS,
    CALORIES_PER_GRAM
}; 