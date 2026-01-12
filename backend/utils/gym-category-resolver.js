/**
 * @fileoverview Gym Category Resolver
 * Maps gym categories to equipment constraints for workout generation
 * Part of Option 3 implementation: Replace equipment selections with gym categories
 */

/**
 * Comprehensive mapping of gym categories to available equipment
 * Based on research from use-gym-categories.md and 2025 gym equipment standards
 */
const GYM_CATEGORY_EQUIPMENT_MAP = {
  full_service_commercial: [
    'dumbbells', 'barbells', 'power_rack', 'cable_machine', 'leg_press',
    'lat_pulldown', 'treadmill', 'elliptical', 'rowing_machine', 'smith_machine',
    'plate_loaded_machines', 'pin_loaded_machines', 'specialty_machines'
  ],
  budget_friendly: [
    'light_dumbbells', 'machines', 'treadmill', 'elliptical'
    // NO barbells, NO power_rack - Planet Fitness model
  ],
  hardcore_strength: [
    'heavy_dumbbells', 'barbells', 'power_rack', 'plate_loaded_machines',
    'pin_loaded_machines', 'specialty_machines', 'competition_plates', 
    'chalk', 'deadlift_platform'
  ],
  luxury_athletic_club: [
    'premium_equipment', 'dumbbells', 'barbells', 'power_rack', 'pools',
    'tennis_courts', 'climbing_wall', 'spa_facilities', 'plate_loaded_machines',
    'pin_loaded_machines', 'specialty_machines'
  ],
  franchise_24_7: [
    'dumbbells', 'barbells', 'machines', 'cardio', 'basic_functional'
  ],
  community_recreation: [
    'basic_dumbbells', 'machines', 'cardio', 'pools', 'basketball_courts'
  ],
  crossfit_functional: [
    'barbells', 'bumper_plates', 'pull_up_rigs', 'kettlebells', 
    'wall_balls', 'battle_ropes', 'plyo_boxes'
  ],
  limited_residential: [
    'light_dumbbells', 'treadmill', 'bike', 'basic_bench'
  ],
  personal_home_setup: [
    'adjustable_dumbbells', 'bench', 'resistance_bands', 'pull_up_bar'
  ],
  minimal_home: [
    'bodyweight_only', 'yoga_mat'
  ]
};

/**
 * Resolve equipment array from gym category
 * @param {string} gymCategory - The gym category identifier
 * @returns {string[]} Array of available equipment for the gym category
 */
function resolveEquipmentFromGymCategory(gymCategory) {
  return GYM_CATEGORY_EQUIPMENT_MAP[gymCategory] || ['bodyweight_only'];
}

/**
 * Generate equipment constraints string for workout generation prompts
 * @param {string} gymCategory - The gym category identifier
 * @returns {string} Formatted equipment constraints for AI prompts
 */
function getEquipmentConstraintsForCategory(gymCategory) {
  const equipment = resolveEquipmentFromGymCategory(gymCategory);
  
  if (gymCategory === 'minimal_home') {
    return "Use only bodyweight exercises. No equipment available.";
  }
  
  if (gymCategory === 'budget_friendly') {
    return `Available: ${equipment.join(', ')}. NO free barbells or heavy lifting equipment.`;
  }
  
  return `Available equipment: ${equipment.join(', ')}. Match exercises to ${gymCategory.replace('_', ' ')} environment.`;
}

/**
 * Get gym category display name for UI
 * @param {string} gymCategory - The gym category identifier
 * @returns {string} Human-readable gym category name
 */
function getGymCategoryDisplayName(gymCategory) {
  const displayNames = {
    full_service_commercial: 'Full-Service Commercial Gym',
    budget_friendly: 'Budget-Friendly Gym',
    hardcore_strength: 'Hardcore Strength/Powerlifting Gym',
    luxury_athletic_club: 'Luxury Athletic Club',
    franchise_24_7: '24/7 Franchise Gym',
    community_recreation: 'Community Recreation Center',
    crossfit_functional: 'CrossFit/Functional Fitness Gym',
    limited_residential: 'Limited Residential Gym',
    personal_home_setup: 'Personal Home Setup',
    minimal_home: 'Minimal/No-Equipment Home Workout'
  };
  
  return displayNames[gymCategory] || 'Unknown Gym Type';
}

/**
 * Validate gym category against allowed values
 * @param {string} gymCategory - The gym category to validate
 * @returns {boolean} True if valid gym category
 */
function isValidGymCategory(gymCategory) {
  return Object.keys(GYM_CATEGORY_EQUIPMENT_MAP).includes(gymCategory);
}

module.exports = {
  GYM_CATEGORY_EQUIPMENT_MAP,
  resolveEquipmentFromGymCategory,
  getEquipmentConstraintsForCategory,
  getGymCategoryDisplayName,
  isValidGymCategory
};
