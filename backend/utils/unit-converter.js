/**
 * @fileoverview Class-based unit conversion utilities for handling metric and imperial measurements
 * This enhances the existing unit-conversion.js functionality with a more structured,
 * object-oriented approach and additional validation features.
 */

const winston = require('winston');

// Configure a default logger if none is provided externally
const defaultLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
});

// Constants for conversions (exposed for external usage if needed)
const CONVERSION_CONSTANTS = {
    KG_TO_LBS: 2.20462,
    LBS_TO_KG: 0.45359237,
    CM_TO_IN: 0.393701,
    IN_TO_CM: 2.54,
    ROUNDING_PRECISION: 1 // Default decimal places for rounding
};

/**
 * UnitConverter class provides comprehensive unit conversion functionality
 * with validation, error handling, and consistent behavior across the application.
 */
class UnitConverter {
    /**
     * Initialize the UnitConverter with optional logger
     * @param {Object} options - Configuration options
     * @param {Object} [options.logger] - Logger instance with info, warn, error methods
     */
    constructor(options = {}) {
        this.logger = options.logger || defaultLogger;
        
        // Bind methods to ensure 'this' context is maintained
        this.validateNumericValue = this.validateNumericValue.bind(this);
        this.validateUnitType = this.validateUnitType.bind(this);
        this.convertWeight = this.convertWeight.bind(this);
        this.convertHeight = this.convertHeight.bind(this);
        this.convertHeightToMetric = this.convertHeightToMetric.bind(this);
        this.convertHeightToImperial = this.convertHeightToImperial.bind(this);
        this.formatHeight = this.formatHeight.bind(this);
        this.formatWeight = this.formatWeight.bind(this);
    }

    /**
     * Validates that input is a numeric value
     * 
     * @param {any} value - Value to validate
     * @param {string} name - Name of the parameter for error messages
     * @param {boolean} [allowZero=true] - Whether zero is allowed
     * @param {boolean} [allowNegative=false] - Whether negative values are allowed
     * @throws {Error} If validation fails
     */
    validateNumericValue(value, name, allowZero = true, allowNegative = false) {
        if (typeof value !== 'number' || isNaN(value)) {
            const message = `${name} must be a valid number`;
            this.logger.error(`Validation Error: ${message}`);
            throw new Error(message);
        }
        
        if (!allowZero && value === 0) {
            const message = `${name} cannot be zero`;
            this.logger.error(`Validation Error: ${message}`);
            throw new Error(message);
        }
        
        if (!allowNegative && value < 0) {
            const message = `${name} cannot be negative`;
            this.logger.error(`Validation Error: ${message}`);
            throw new Error(message);
        }
    }

    /**
     * Validates that the unit type is supported
     * 
     * @param {string} unitType - Unit type to validate ('metric' or 'imperial')
     * @param {string} [paramName='Unit type'] - Name of the parameter for error messages
     * @throws {Error} If unit type is invalid
     */
    validateUnitType(unitType, paramName = 'Unit type') {
        const validUnitTypes = ['metric', 'imperial'];
        
        if (!unitType || typeof unitType !== 'string' || !validUnitTypes.includes(unitType.toLowerCase())) {
            const message = `${paramName} must be one of: ${validUnitTypes.join(', ')}`;
            this.logger.error(`Validation Error: ${message}, received: ${unitType}`);
            throw new Error(message);
        }
    }

    /**
     * Converts height from feet/inches to centimeters
     * 
     * @param {number} feet - Height in feet
     * @param {number} [inches=0] - Height in inches
     * @returns {number} Height in centimeters
     * @throws {Error} If inputs are invalid
     */
    convertHeightToMetric(feet, inches = 0) {
        // First check for negative values specifically
        if (feet < 0 || inches < 0) {
            const message = 'Height measurements cannot be negative';
            this.logger.error(`Validation Error: ${message}`);
            throw new Error(message);
        }
        
        // Then validate other numeric requirements
        this.validateNumericValue(feet, 'Feet', true, true); // Allow negatives since we already checked
        this.validateNumericValue(inches, 'Inches', true, true); // Allow negatives since we already checked
        
        // Convert feet and inches to total inches
        const totalInches = (feet * 12) + inches;
        
        // Convert inches to centimeters (1 inch = 2.54 cm) and round to 1 decimal place
        return Math.round(totalInches * CONVERSION_CONSTANTS.IN_TO_CM * 10) / 10;
    }

    /**
     * Converts height from centimeters to feet and inches
     * 
     * @param {number} centimeters - Height in centimeters
     * @returns {Object} Object with feet and inches properties
     * @throws {Error} If input is invalid
     */
    convertHeightToImperial(centimeters) {
        // Validate input
        this.validateNumericValue(centimeters, 'Centimeters');
        
        // Convert centimeters to total inches
        const totalInches = centimeters / CONVERSION_CONSTANTS.IN_TO_CM;
        
        // Calculate feet and remaining inches
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        
        // Handle case where inches rounds up to 12
        if (inches === 12) {
            return { feet: feet + 1, inches: 0 };
        }
        
        return { feet, inches };
    }

    /**
     * Converts weight from pounds to kilograms
     * 
     * @param {number} pounds - Weight in pounds
     * @returns {number} Weight in kilograms (rounded to 1 decimal place)
     * @throws {Error} If input is invalid
     */
    convertWeightToMetric(pounds) {
        // Validate input
        this.validateNumericValue(pounds, 'Pounds');
        
        // Convert pounds to kilograms and round to 1 decimal place
        return Math.round(pounds * CONVERSION_CONSTANTS.LBS_TO_KG * 10) / 10;
    }

    /**
     * Converts weight from kilograms to pounds
     * 
     * @param {number} kilograms - Weight in kilograms
     * @returns {number} Weight in pounds (rounded to 1 decimal place)
     * @throws {Error} If input is invalid
     */
    convertWeightToImperial(kilograms) {
        // Validate input
        this.validateNumericValue(kilograms, 'Kilograms');
        
        // Convert kilograms to pounds and round to 1 decimal place
        return Math.round(kilograms * CONVERSION_CONSTANTS.KG_TO_LBS * 10) / 10;
    }

    /**
     * Converts height between unit systems with enhanced validation and flexibility
     * 
     * @param {number|object} height - Height value to convert (number for metric, object {feet, inches} or number for imperial)
     * @param {string} fromUnit - Unit system converting from ('metric' or 'imperial')
     * @param {string} toUnit - Unit system converting to ('metric' or 'imperial')
     * @returns {number|object} Converted height value
     * @throws {Error} If inputs are invalid
     */
    convertHeight(height, fromUnit, toUnit) {
        try {
            // Validate unit types
            this.validateUnitType(fromUnit, 'From unit');
            this.validateUnitType(toUnit, 'To unit');
            
            // Standardize to lowercase
            const fromUnitLower = fromUnit.toLowerCase();
            const toUnitLower = toUnit.toLowerCase();
            
            // If units are the same, return original value
            if (fromUnitLower === toUnitLower) {
                return height;
            }

            // Converting from metric (cm) to imperial (ft/in)
            if (fromUnitLower === 'metric' && toUnitLower === 'imperial') {
                this.validateNumericValue(height, 'Height');
                return this.convertHeightToImperial(height);
            }
            
            // Converting from imperial (ft/in) to metric (cm)
            if (fromUnitLower === 'imperial' && toUnitLower === 'metric') {
                // Handle two different imperial input formats
                if (typeof height === 'number') {
                    // If a number is provided for imperial, assume it's total inches
                    this.validateNumericValue(height, 'Height (inches)');
                    return Math.round(height * CONVERSION_CONSTANTS.IN_TO_CM * 10) / 10;
                } else if (height && typeof height === 'object' && 'feet' in height) {
                    const { feet = 0, inches = 0 } = height;
                    return this.convertHeightToMetric(feet, inches);
                } else {
                    const message = 'Imperial height must be a number (total inches) or an object with feet and inches properties';
                    this.logger.error(`Validation Error: ${message}`);
                    throw new Error(message);
                }
            }
            
            const message = `Invalid unit conversion from ${fromUnit} to ${toUnit}`;
            this.logger.error(`Validation Error: ${message}`);
            throw new Error(message);
            
        } catch (error) {
            // If the error already contains our expectedmessage format, rethrow it
            if (error.message.includes('Invalid unit conversion from')) {
                throw error;
            }
            // Otherwise, wrap as a validation error unless it's already a specific imperial height error
            if (error.message.includes('Imperial height must be')) {
                throw error;
            }
            throw new Error(`Invalid unit conversion from ${fromUnit} to ${toUnit}: ${error.message}`);
        }
    }

    /**
     * Converts weight between unit systems with enhanced validation
     * 
     * @param {number} weight - Weight value to convert
     * @param {string} fromUnit - Unit system converting from ('metric' or 'imperial')
     * @param {string} toUnit - Unit system converting to ('metric' or 'imperial')
     * @returns {number} Converted weight value
     * @throws {Error} If inputs are invalid
     */
    convertWeight(weight, fromUnit, toUnit) {
        try {
            // Validate inputs
            this.validateNumericValue(weight, 'Weight');
            this.validateUnitType(fromUnit, 'From unit');
            this.validateUnitType(toUnit, 'To unit');
            
            // Standardize to lowercase
            const fromUnitLower = fromUnit.toLowerCase();
            const toUnitLower = toUnit.toLowerCase();
            
            // If units are the same, return original value
            if (fromUnitLower === toUnitLower) {
                return weight;
            }

            // Converting from metric (kg) to imperial (lbs)
            if (fromUnitLower === 'metric' && toUnitLower === 'imperial') {
                return this.convertWeightToImperial(weight);
            }
            
            // Converting from imperial (lbs) to metric (kg)
            if (fromUnitLower === 'imperial' && toUnitLower === 'metric') {
                return this.convertWeightToMetric(weight);
            }
            
            const message = `Invalid unit conversion from ${fromUnit} to ${toUnit}`;
            this.logger.error(`Validation Error: ${message}`);
            throw new Error(message);
            
        } catch (error) {
            // If the error already contains our expected message format, rethrow it
            if (error.message.includes('Invalid unit conversion from')) {
                throw error;
            }
            throw new Error(`Invalid unit conversion from ${fromUnit} to ${toUnit}: ${error.message}`);
        }
    }

    /**
     * Format height for display based on unit system
     * 
     * @param {number} value - Height value (cm for metric, or cm to be converted for imperial)
     * @param {string} unitSystem - Unit system ('metric' or 'imperial')
     * @returns {string} Formatted height
     * @throws {Error} If inputs are invalid
     */
    formatHeight(value, unitSystem) {
        // Validate inputs
        this.validateNumericValue(value, 'Height value');
        this.validateUnitType(unitSystem, 'Unit system');
        
        const unitSystemLower = unitSystem.toLowerCase();
        
        if (unitSystemLower === 'metric') {
            // For metric, just format with cm
            return `${value} cm`;
        } else if (unitSystemLower === 'imperial') {
            // For imperial, convert from cm to feet/inches first
            const { feet, inches } = this.convertHeightToImperial(value);
            return `${feet}'${inches}"`;
        }
        
        // This should never be reached due to validateUnitType, but keeping for robustness
        const message = `Invalid unit system: ${unitSystem}`;
        this.logger.error(`Validation Error: ${message}`);
        throw new Error(message);
    }

    /**
     * Format weight for display based on unit system
     * 
     * @param {number} value - Weight value (in the corresponding unit system)
     * @param {string} unitSystem - Unit system ('metric' or 'imperial')
     * @returns {string} Formatted weight
     * @throws {Error} If inputs are invalid
     */
    formatWeight(value, unitSystem) {
        // Validate inputs
        this.validateNumericValue(value, 'Weight value');
        this.validateUnitType(unitSystem, 'Unit system');
        
        const unitSystemLower = unitSystem.toLowerCase();
        
        if (unitSystemLower === 'metric') {
            return `${value} kg`;
        } else if (unitSystemLower === 'imperial') {
            return `${value} lbs`;
        }
        
        // This should never be reached due to validateUnitType, but keeping for robustness
        const message = `Invalid unit system: ${unitSystem}`;
        this.logger.error(`Validation Error: ${message}`);
        throw new Error(message);
    }
    
    /**
     * Converts user profile data between unit systems
     * Handles multiple properties including height, weight, and other measurement data
     * 
     * @param {Object} profileData - User profile data object
     * @param {string} fromUnit - Unit system converting from ('metric' or 'imperial')
     * @param {string} toUnit - Unit system converting to ('metric' or 'imperial')
     * @returns {Object} Converted profile data object
     * @throws {Error} If unit conversion fails
     */
    convertUserProfile(profileData, fromUnit, toUnit) {
        // Validate unit types
        this.validateUnitType(fromUnit, 'From unit');
        this.validateUnitType(toUnit, 'To unit');
        
        // If units are the same, return copy of original data
        if (fromUnit.toLowerCase() === toUnit.toLowerCase()) {
            return { ...profileData };
        }
        
        try {
            const convertedProfile = { ...profileData };
            
            // Convert height
            if (profileData.height !== undefined) {
                convertedProfile.height = this.convertHeight(profileData.height, fromUnit, toUnit);
            }
            
            // Convert weight
            if (profileData.weight !== undefined) {
                convertedProfile.weight = this.convertWeight(profileData.weight, fromUnit, toUnit);
            }
            
            // If there are other measurements in the profile, convert them based on their type
            // This can be expanded based on the specific profile structure
            
            // Update the unit preference if it exists in preferences object
            if (convertedProfile.preferences && typeof convertedProfile.preferences === 'object') {
                convertedProfile.preferences = {
                    ...convertedProfile.preferences,
                    units: toUnit.toLowerCase()
                };
            }
            
            this.logger.info(`Converted user profile from ${fromUnit} to ${toUnit}`);
            return convertedProfile;
            
        } catch (error) {
            // Extract the original error message if it's nested in a unit conversion error
            let errorMessage = error.message;
            const conversionPrefix = `Invalid unit conversion from ${fromUnit} to ${toUnit}: `;
            if (errorMessage.startsWith(conversionPrefix)) {
                errorMessage = errorMessage.substring(conversionPrefix.length);
            }
            
            this.logger.error(`Failed to convert user profile: ${errorMessage}`);
            throw new Error(`Profile conversion failed: ${errorMessage}`);
        }
    }
}

// Export both the class and constants for flexibility
module.exports = {
    UnitConverter,
    CONVERSION_CONSTANTS
}; 