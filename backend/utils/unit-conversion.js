/**
 * @fileoverview Unit conversion utilities for handling metric and imperial measurements
 */

/**
 * Converts height from feet/inches to centimeters
 * 
 * @param {number} feet - Height in feet
 * @param {number} [inches=0] - Height in inches
 * @returns {number} Height in centimeters
 * @throws {Error} If inputs are invalid
 */
function convertHeightToMetric(feet, inches = 0) {
  // Validate inputs
  if (typeof feet !== 'number' || isNaN(feet)) {
    throw new Error('Feet must be a valid number');
  }
  
  if (typeof inches !== 'number' || isNaN(inches)) {
    throw new Error('Inches must be a valid number');
  }
  
  if (feet < 0 || inches < 0) {
    throw new Error('Height measurements cannot be negative');
  }
  
  // Convert feet and inches to total inches
  const totalInches = (feet * 12) + inches;
  
  // Convert inches to centimeters (1 inch = 2.54 cm)
  return Math.round(totalInches * 2.54 * 10) / 10;
}

/**
 * Converts height from centimeters to feet and inches
 * 
 * @param {number} centimeters - Height in centimeters
 * @returns {Object} Object with feet and inches properties
 * @throws {Error} If input is invalid
 */
function convertHeightToImperial(centimeters) {
  // Validate input
  if (typeof centimeters !== 'number' || isNaN(centimeters)) {
    throw new Error('Centimeters must be a valid number');
  }
  
  if (centimeters < 0) {
    throw new Error('Height cannot be negative');
  }
  
  // Convert centimeters to total inches
  const totalInches = centimeters / 2.54;
  
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
function convertWeightToMetric(pounds) {
  // Validate input
  if (typeof pounds !== 'number' || isNaN(pounds)) {
    throw new Error('Pounds must be a valid number');
  }
  
  if (pounds < 0) {
    throw new Error('Weight cannot be negative');
  }
  
  // Convert pounds to kilograms (1 lb = 0.45359237 kg) and round to 1 decimal place
  return Math.round(pounds * 0.45359237 * 10) / 10;
}

/**
 * Converts weight from kilograms to pounds
 * 
 * @param {number} kilograms - Weight in kilograms
 * @returns {number} Weight in pounds (rounded to 1 decimal place)
 * @throws {Error} If input is invalid
 */
function convertWeightToImperial(kilograms) {
  // Validate input
  if (typeof kilograms !== 'number' || isNaN(kilograms)) {
    throw new Error('Kilograms must be a valid number');
  }
  
  if (kilograms < 0) {
    throw new Error('Weight cannot be negative');
  }
  
  // Convert kilograms to pounds (1 kg = 2.20462 pounds) and round to 1 decimal place
  return Math.round(kilograms * 2.20462 * 10) / 10;
}

/**
 * Converts height between metric (cm) and imperial (ft/in) systems
 * 
 * @param {number|object} height - Height value to convert
 * @param {string} fromUnit - Unit system converting from ('metric' or 'imperial')
 * @param {string} toUnit - Unit system converting to ('metric' or 'imperial')
 * @returns {number|object} Converted height value
 * @throws {Error} If inputs are invalid
 */
function convertHeight(height, fromUnit, toUnit) {
  // If units are the same, return original value
  if (fromUnit === toUnit) {
    return height;
  }

  // Converting from metric (cm) to imperial (ft/in)
  if (fromUnit === 'metric' && toUnit === 'imperial') {
    return convertHeightToImperial(height);
  }
  
  // Converting from imperial (ft/in) to metric (cm)
  if (fromUnit === 'imperial' && toUnit === 'metric') {
    if (!height || typeof height !== 'object') {
      throw new Error('Imperial height must be an object with feet and inches properties');
    }
    
    const { feet = 0, inches = 0 } = height;
    return convertHeightToMetric(feet, inches);
  }
  
  throw new Error(`Invalid unit conversion from ${fromUnit} to ${toUnit}`);
}

/**
 * Converts weight between metric (kg) and imperial (lbs) systems
 * 
 * @param {number} weight - Weight value to convert
 * @param {string} fromUnit - Unit system converting from ('metric' or 'imperial')
 * @param {string} toUnit - Unit system converting to ('metric' or 'imperial')
 * @returns {number} Converted weight value
 * @throws {Error} If inputs are invalid
 */
function convertWeight(weight, fromUnit, toUnit) {
  // If units are the same, return original value
  if (fromUnit === toUnit) {
    return weight;
  }

  // Converting from metric (kg) to imperial (lbs)
  if (fromUnit === 'metric' && toUnit === 'imperial') {
    return convertWeightToImperial(weight);
  }
  
  // Converting from imperial (lbs) to metric (kg)
  if (fromUnit === 'imperial' && toUnit === 'metric') {
    return convertWeightToMetric(weight);
  }
  
  throw new Error(`Invalid unit conversion from ${fromUnit} to ${toUnit}`);
}

/**
 * Format height for display based on unit system
 * 
 * @param {number} value - Height value (cm for metric, or cm to be converted for imperial)
 * @param {string} unitSystem - Unit system ('metric' or 'imperial')
 * @returns {string} Formatted height
 * @throws {Error} If inputs are invalid
 */
function formatHeight(value, unitSystem) {
  // Validate input
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Height value must be a valid number');
  }
  
  if (value < 0) {
    throw new Error('Height cannot be negative');
  }
  
  if (unitSystem === 'metric') {
    // For metric, just format with cm
    return `${value} cm`;
  } else if (unitSystem === 'imperial') {
    // For imperial, convert from cm to feet/inches first
    const { feet, inches } = convertHeightToImperial(value);
    return `${feet}'${inches}"`;
  }
  
  throw new Error(`Invalid unit system: ${unitSystem}`);
}

/**
 * Format weight for display based on unit system
 * 
 * @param {number} value - Weight value (in the corresponding unit system)
 * @param {string} unitSystem - Unit system ('metric' or 'imperial')
 * @returns {string} Formatted weight
 * @throws {Error} If inputs are invalid
 */
function formatWeight(value, unitSystem) {
  // Validate input
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Weight value must be a valid number');
  }
  
  if (value < 0) {
    throw new Error('Weight cannot be negative');
  }
  
  if (unitSystem === 'metric') {
    return `${value} kg`;
  } else if (unitSystem === 'imperial') {
    return `${value} lbs`;
  }
  
  throw new Error(`Invalid unit system: ${unitSystem}`);
}

module.exports = {
  convertHeightToMetric,
  convertHeightToImperial,
  convertWeightToMetric,
  convertWeightToImperial,
  convertHeight,
  convertWeight,
  formatHeight,
  formatWeight
}; 