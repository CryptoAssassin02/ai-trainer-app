const BaseGoalStrategy = require('./base-goal-strategy');

/**
 * Endurance Strategy - Focus on cardiovascular fitness and aerobic capacity
 * Emphasizes aerobic base building, lactate threshold, and endurance performance
 * Based on 2025 endurance coaching best practices and sports science research
 */
class EnduranceStrategy extends BaseGoalStrategy {
    constructor() {
        super('endurance');
        this.category = 'endurance';
    }

    getMesocycleStructure(userProfile, totalWeeks, isPrimary = true) {
        const structures = {
            8: [
                { 
                    mesocycleNumber: 1,
                    name: "Aerobic Base Building", 
                    weeks: 4, 
                    focus: "aerobic_base",
                    volumeProgression: "progressive",
                    intensityProgression: "linear",
                    emphasis: "volume_accumulation",
                    enduranceComponents: ["aerobic_capacity", "mitochondrial_density", "capillarization"]
                },
                { 
                    mesocycleNumber: 2,
                    name: "Lactate Threshold Development", 
                    weeks: 3, 
                    focus: "lactate_threshold",
                    volumeProgression: "moderate",
                    intensityProgression: "step",
                    emphasis: "metabolic_efficiency",
                    enduranceComponents: ["lactate_buffering", "fat_oxidation", "metabolic_flexibility"]
                },
                { 
                    mesocycleNumber: 3,
                    name: "Recovery & Integration", 
                    weeks: 1, 
                    focus: "recovery",
                    volumeProgression: "low",
                    intensityProgression: "recovery",
                    emphasis: "adaptation",
                    enduranceComponents: ["supercompensation", "glycogen_restoration", "tissue_repair"]
                }
            ],
            12: [
                { 
                    mesocycleNumber: 1,
                    name: "Aerobic Base Building", 
                    weeks: 5, 
                    focus: "aerobic_base",
                    volumeProgression: "progressive",
                    intensityProgression: "linear",
                    emphasis: "aerobic_development",
                    enduranceComponents: ["aerobic_capacity", "cardiac_output", "oxygen_delivery"]
                },
                { 
                    mesocycleNumber: 2,
                    name: "Lactate Threshold Development", 
                    weeks: 3, 
                    focus: "lactate_threshold",
                    volumeProgression: "moderate",
                    intensityProgression: "step",
                    emphasis: "threshold_power",
                    enduranceComponents: ["lactate_steady_state", "metabolic_efficiency", "fat_oxidation"]
                },
                { 
                    mesocycleNumber: 3,
                    name: "VO2max & Neuromuscular Power", 
                    weeks: 3, 
                    focus: "vo2max_development",
                    volumeProgression: "low",
                    intensityProgression: "high",
                    emphasis: "maximal_aerobic_power",
                    enduranceComponents: ["vo2max", "neuromuscular_power", "anaerobic_capacity"]
                },
                { 
                    mesocycleNumber: 4,
                    name: "Recovery & Maintenance", 
                    weeks: 1, 
                    focus: "recovery",
                    volumeProgression: "very_low",
                    intensityProgression: "recovery",
                    emphasis: "adaptation_consolidation",
                    enduranceComponents: ["recovery", "adaptation", "preparation"]
                }
            ],
            16: [
                { 
                    mesocycleNumber: 1,
                    name: "Aerobic Base Building I", 
                    weeks: 5, 
                    focus: "aerobic_base_1",
                    emphasis: "volume_foundation",
                    enduranceComponents: ["aerobic_enzyme_development", "capillary_density", "cardiac_adaptation"]
                },
                { 
                    mesocycleNumber: 2,
                    name: "Aerobic Base Building II", 
                    weeks: 4, 
                    focus: "aerobic_base_2",
                    emphasis: "aerobic_power",
                    enduranceComponents: ["mitochondrial_biogenesis", "fat_oxidation", "metabolic_flexibility"]
                },
                { 
                    mesocycleNumber: 3,
                    name: "Lactate Threshold Development", 
                    weeks: 4, 
                    focus: "lactate_threshold",
                    emphasis: "threshold_training",
                    enduranceComponents: ["lactate_buffering", "threshold_power", "tempo_endurance"]
                },
                { 
                    mesocycleNumber: 4,
                    name: "VO2max & Peak Power", 
                    weeks: 2, 
                    focus: "vo2max_development",
                    emphasis: "maximal_power",
                    enduranceComponents: ["vo2max", "peak_power", "anaerobic_contribution"]
                },
                { 
                    mesocycleNumber: 5,
                    name: "Recovery & Taper", 
                    weeks: 1, 
                    focus: "taper",
                    emphasis: "peak_performance",
                    enduranceComponents: ["freshness", "glycogen_supercompensation", "neural_readiness"]
                }
            ]
        };

        return structures[totalWeeks] || structures[12];
    }

    getTrainingParameters(mesocycleFocus, weekNumber) {
        const parameters = {
            aerobic_base: {
                frequency: 5,
                intensity: "low-moderate (65-75% HRmax, Zone 2)",
                volume: "high (60-120 min sessions)",
                restPeriods: "minimal (active recovery)",
                heartRateZones: "Zone 1-2 emphasis (80% of training)",
                paceGuidance: "conversational_pace",
                durationEmphasis: "time_based_progression",
                tempoEmphasis: "steady_state",
                exerciseSelection: "aerobic_activities",
                crossTraining: "encouraged",
                strengthTraining: "2x/week maintenance",
                recoveryEmphasis: "high",
                volumeProgression: "10% weekly increase"
            },
            aerobic_base_1: {
                frequency: 5,
                intensity: "low (60-70% HRmax, Zone 1-2)",
                volume: "moderate-high (45-90 min sessions)",
                heartRateZones: "Zone 1 (70%), Zone 2 (25%), Zone 3+ (5%)",
                paceGuidance: "easy_conversational",
                durationEmphasis: "gradual_progression",
                tempoEmphasis: "comfortable",
                exerciseSelection: "low_impact_preferred",
                crossTraining: "swimming_cycling_elliptical",
                strengthTraining: "2x/week foundational",
                recoveryEmphasis: "very_high",
                adaptationFocus: "aerobic_enzymes"
            },
            aerobic_base_2: {
                frequency: 6,
                intensity: "low-moderate (65-75% HRmax, Zone 2)",
                volume: "high (60-120 min sessions)",
                heartRateZones: "Zone 2 (60%), Zone 1 (30%), Zone 3+ (10%)",
                paceGuidance: "comfortable_effort",
                durationEmphasis: "sustained_efforts",
                tempoEmphasis: "steady_aerobic",
                exerciseSelection: "sport_specific_preferred",
                crossTraining: "complementary_activities",
                strengthTraining: "2x/week functional",
                recoveryEmphasis: "high",
                adaptationFocus: "fat_oxidation"
            },
            lactate_threshold: {
                frequency: 5,
                intensity: "moderate-high (80-90% HRmax, Zone 3-4)",
                volume: "moderate (45-75 min sessions)",
                restPeriods: "short (1-3 min between intervals)",
                heartRateZones: "Zone 3-4 emphasis (20-30% of training)",
                paceGuidance: "comfortably_hard_effort",
                intervalStructure: "tempo_intervals_threshold",
                tempoEmphasis: "sustained_threshold",
                exerciseSelection: "sport_specific",
                workoutTypes: ["tempo_runs", "threshold_intervals", "cruise_intervals"],
                strengthTraining: "2x/week power_endurance",
                recoveryEmphasis: "moderate",
                adaptationFocus: "lactate_buffering"
            },
            vo2max_development: {
                frequency: 4,
                intensity: "high (90-100% HRmax, Zone 5)",
                volume: "low-moderate (30-60 min sessions)",
                restPeriods: "equal_to_work_intervals",
                heartRateZones: "Zone 5 emphasis (10-15% of training)",
                paceGuidance: "hard_to_very_hard",
                intervalStructure: "vo2max_intervals",
                tempoEmphasis: "maximal_sustainable",
                exerciseSelection: "sport_specific_primary",
                workoutTypes: ["vo2max_intervals", "hill_repeats", "track_intervals"],
                strengthTraining: "1x/week maintenance",
                recoveryEmphasis: "very_high",
                adaptationFocus: "maximal_oxygen_uptake"
            },
            recovery: {
                frequency: 3,
                intensity: "very_low (50-65% HRmax, Zone 1)",
                volume: "low (20-45 min sessions)",
                restPeriods: "complete_between_sessions",
                heartRateZones: "Zone 1 only",
                paceGuidance: "very_easy",
                durationEmphasis: "feel_based",
                tempoEmphasis: "recovery_pace",
                exerciseSelection: "gentle_activities",
                crossTraining: "yoga_swimming_walking",
                strengthTraining: "optional_light",
                recoveryEmphasis: "maximum",
                adaptationFocus: "supercompensation"
            },
            taper: {
                frequency: 4,
                intensity: "moderate (70-85% HRmax, mixed zones)",
                volume: "very_low (20-40 min sessions)",
                restPeriods: "full_recovery",
                heartRateZones: "mixed_with_some_intensity",
                paceGuidance: "feel_good_efforts",
                intensityMaintenance: "short_sharp_efforts",
                tempoEmphasis: "quality_over_quantity",
                exerciseSelection: "race_specific",
                workoutTypes: ["openers", "strides", "short_intervals"],
                strengthTraining: "minimal_maintenance",
                recoveryEmphasis: "maximum",
                adaptationFocus: "freshness_and_speed"
            }
        };

        return parameters[mesocycleFocus] || parameters.aerobic_base;
    }

    getPromptInstructions(context) {
        return `
## ENDURANCE FOCUS:
• Primary: Aerobic capacity, cardiovascular efficiency & endurance performance
• Frequency: 5-6 days/week, aerobic base emphasis
• Zones: 80% low intensity (Zone 1-2), 20% moderate-high (Zone 3-5)
• Base: Zone 2 priority for mitochondrial adaptation, long steady sessions
• Threshold: Tempo runs, 3-8 min intervals, metabolic efficiency focus
• VO2max: High-intensity 3-8 min efforts, hill repeats, limited volume
• Strength: 2x/week base phase, 1x/week intensity phase, functional focus
• Cross-training: Swimming, cycling, rowing for variety & recovery
• Progression: Weeks 1-4 base building, 5-8 add tempo, 9-12 VO2max intervals
• Recovery: Easy days truly easy, sleep 8-9h, nutrition timing
        `;
    }

    validateCompatibility(otherGoals) {
        const conflicts = [];
        const recommendations = [];
        const synergies = [];

        if (otherGoals.includes('strength')) {
            conflicts.push('High-volume endurance training may interfere with strength gains');
            recommendations.push('Separate strength and endurance sessions by 6+ hours when possible');
            recommendations.push('Prioritize endurance training when both are scheduled same day');
            recommendations.push('Use periodized approach: strength emphasis in off-season');
        }

        if (otherGoals.includes('hypertrophy')) {
            conflicts.push('Endurance training may limit muscle growth due to competing adaptations');
            recommendations.push('Focus on lower-body hypertrophy which complements endurance');
            recommendations.push('Use concurrent training with careful volume management');
            recommendations.push('Prioritize protein intake and recovery between sessions');
        }

        if (otherGoals.includes('weight_loss')) {
            synergies.push('Excellent combination - endurance training is highly effective for fat loss');
            recommendations.push('Use Zone 2 training to maximize fat oxidation');
            recommendations.push('Combine with strength training to preserve muscle mass');
        }

        if (otherGoals.includes('general_fitness')) {
            synergies.push('Endurance training is fundamental component of general fitness');
            recommendations.push('Use endurance activities as primary cardiovascular training');
            recommendations.push('Include variety to maintain motivation and enjoyment');
        }

        if (otherGoals.includes('sports_performance')) {
            synergies.push('Aerobic base supports performance in most sports');
            recommendations.push('Tailor endurance training to sport-specific energy demands');
            recommendations.push('Use sport-specific movements when possible');
        }

        return {
            compatible: conflicts.length <= 2, // Allow some conflicts with proper management
            conflicts,
            recommendations,
            synergies
        };
    }

    getRecommendedDuration(userProfile) {
        const fitnessLevel = userProfile.fitnessLevel || 'intermediate';
        const enduranceExperience = userProfile.enduranceExperience || 'beginner';
        
        // Endurance adaptations require longer training periods
        if (fitnessLevel === 'beginner' || enduranceExperience === 'beginner') return 16; // Longer for base building
        if (fitnessLevel === 'intermediate') return 12; // Standard periodization cycle
        if (fitnessLevel === 'advanced') return 12; // Focused training blocks
        
        return 12; // Default
    }

    getExercisePriorities() {
        return {
            compound: 40,    // Moderate emphasis on compound movements
            isolation: 60,   // Higher emphasis on endurance-specific training
            functional: 60,  // Moderate functional movement emphasis
            unilateral: 25,  // Some unilateral work for balance
            plyometric: 10,  // Light explosive work for economy
            cardio: 90       // Very high cardio emphasis
        };
    }

    getProgressionStrategy() {
        return {
            primary: 'linear',           // Linear progression in volume
            volumeEmphasis: 'high',      // High volume focus for endurance
            intensityEmphasis: 'low',    // Low intensity emphasis (80/20 rule)
            frequencyRange: [5, 6],      // 5-6 days per week
            deloadFrequency: 3           // Every 3 weeks due to high volume
        };
    }

    getRecoveryRequirements() {
        return {
            restBetweenSets: '1-5 minutes (interval dependent)',
            restBetweenSessions: '24 hours minimum (easy days truly easy)',
            sleepRecommendation: '8-9 hours (critical for endurance adaptations)',
            activeRecoveryDays: 2,
            deloadWeekFrequency: 3
        };
    }

    /**
     * Get training zone calculations based on user's fitness metrics
     * @param {Object} userProfile - User profile with fitness data
     * @returns {Object} Heart rate and pace zones
     */
    getTrainingZones(userProfile) {
        const maxHR = userProfile.maxHeartRate || (220 - (userProfile.age || 30));
        const restingHR = userProfile.restingHeartRate || 60;
        const hrReserve = maxHR - restingHR;

        return {
            heartRateZones: {
                zone1: {
                    range: `${Math.round(restingHR + hrReserve * 0.50)}-${Math.round(restingHR + hrReserve * 0.65)}`,
                    description: 'Active Recovery - Very Easy',
                    purpose: 'Recovery, fat oxidation, aerobic base'
                },
                zone2: {
                    range: `${Math.round(restingHR + hrReserve * 0.65)}-${Math.round(restingHR + hrReserve * 0.75)}`,
                    description: 'Aerobic Base - Easy',
                    purpose: 'Aerobic development, mitochondrial adaptation'
                },
                zone3: {
                    range: `${Math.round(restingHR + hrReserve * 0.75)}-${Math.round(restingHR + hrReserve * 0.85)}`,
                    description: 'Tempo - Moderate',
                    purpose: 'Aerobic power, tempo endurance'
                },
                zone4: {
                    range: `${Math.round(restingHR + hrReserve * 0.85)}-${Math.round(restingHR + hrReserve * 0.95)}`,
                    description: 'Lactate Threshold - Hard',
                    purpose: 'Lactate buffering, threshold power'
                },
                zone5: {
                    range: `${Math.round(restingHR + hrReserve * 0.95)}-${maxHR}`,
                    description: 'VO2max - Very Hard',
                    purpose: 'Maximal oxygen uptake, anaerobic power'
                }
            },
            trainingDistribution: {
                zone1_2: '80%', // Easy training
                zone3_5: '20%'  // Moderate to hard training
            }
        };
    }

    /**
     * Get sport-specific endurance recommendations
     * @param {string} sport - Primary endurance sport
     * @returns {Object} Sport-specific training parameters
     */
    getSportSpecificEndurance(sport = 'running') {
        const sportRecommendations = {
            running: {
                primaryTraining: 'running',
                crossTraining: ['cycling', 'swimming', 'elliptical'],
                strengthFocus: ['single_leg_strength', 'core_stability', 'posterior_chain'],
                injuryPrevention: ['hip_stability', 'ankle_mobility', 'calf_strength'],
                keyWorkouts: ['long_runs', 'tempo_runs', 'interval_training']
            },
            cycling: {
                primaryTraining: 'cycling',
                crossTraining: ['running', 'swimming', 'rowing'],
                strengthFocus: ['leg_power', 'core_endurance', 'hip_flexibility'],
                injuryPrevention: ['bike_fit', 'hip_flexor_mobility', 'glute_activation'],
                keyWorkouts: ['long_rides', 'threshold_intervals', 'hill_repeats']
            },
            swimming: {
                primaryTraining: 'swimming',
                crossTraining: ['running', 'cycling', 'water_running'],
                strengthFocus: ['shoulder_stability', 'core_rotation', 'lat_strength'],
                injuryPrevention: ['shoulder_mobility', 'thoracic_rotation', 'hip_flexibility'],
                keyWorkouts: ['distance_sets', 'threshold_sets', 'sprint_intervals']
            },
            triathlon: {
                primaryTraining: 'swim_bike_run',
                crossTraining: ['strength_training', 'yoga', 'pilates'],
                strengthFocus: ['functional_strength', 'core_stability', 'injury_prevention'],
                injuryPrevention: ['transition_practice', 'brick_workouts', 'recovery_protocols'],
                keyWorkouts: ['brick_sessions', 'race_simulation', 'discipline_specific']
            }
        };

        return sportRecommendations[sport.toLowerCase()] || sportRecommendations.running;
    }
}

module.exports = EnduranceStrategy;