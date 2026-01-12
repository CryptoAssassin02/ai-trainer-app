const BaseGoalStrategy = require('./base-goal-strategy');

/**
 * Sports Performance Strategy - Focus on athletic performance enhancement
 * Emphasizes sport-specific training, power development, and injury prevention
 * Based on 2025 NSCA/ACSM guidelines and sport-specific research
 */
class SportsPerformanceStrategy extends BaseGoalStrategy {
    constructor() {
        super('sports_performance');
        this.category = 'performance';
    }

    getMesocycleStructure(userProfile, totalWeeks, isPrimary = true) {
        // Sport-specific periodization based on off-season training model
        const structures = {
            8: [
                { 
                    mesocycleNumber: 1,
                    name: "General Physical Preparation", 
                    weeks: 3, 
                    focus: "movement_foundation",
                    volumeProgression: "moderate",
                    intensityProgression: "linear",
                    emphasis: "movement_quality",
                    sportComponents: ["mobility", "stability", "basic_strength"]
                },
                { 
                    mesocycleNumber: 2,
                    name: "Specific Physical Preparation", 
                    weeks: 4, 
                    focus: "sport_specific_strength",
                    volumeProgression: "moderate",
                    intensityProgression: "step",
                    emphasis: "strength_power",
                    sportComponents: ["sport_movements", "unilateral_strength", "power_endurance"]
                },
                { 
                    mesocycleNumber: 3,
                    name: "Competition Preparation", 
                    weeks: 1, 
                    focus: "power_development",
                    volumeProgression: "low",
                    intensityProgression: "high",
                    emphasis: "peak_power",
                    sportComponents: ["explosive_power", "sport_specificity", "competition_simulation"]
                }
            ],
            12: [
                { 
                    mesocycleNumber: 1,
                    name: "General Physical Preparation", 
                    weeks: 4, 
                    focus: "movement_foundation",
                    volumeProgression: "progressive",
                    intensityProgression: "linear",
                    emphasis: "movement_quality",
                    sportComponents: ["mobility", "stability", "aerobic_base", "movement_patterns"]
                },
                { 
                    mesocycleNumber: 2,
                    name: "Specific Physical Preparation", 
                    weeks: 4, 
                    focus: "sport_specific_strength",
                    volumeProgression: "moderate",
                    intensityProgression: "step",
                    emphasis: "strength_power",
                    sportComponents: ["sport_movements", "unilateral_training", "power_endurance"]
                },
                { 
                    mesocycleNumber: 3,
                    name: "Competition Preparation", 
                    weeks: 3, 
                    focus: "power_development",
                    volumeProgression: "low",
                    intensityProgression: "high",
                    emphasis: "peak_power",
                    sportComponents: ["explosive_power", "rate_of_force_development", "sport_specificity"]
                },
                { 
                    mesocycleNumber: 4,
                    name: "Active Recovery", 
                    weeks: 1, 
                    focus: "deload",
                    volumeProgression: "very_low",
                    intensityProgression: "recovery",
                    emphasis: "recovery",
                    sportComponents: ["active_recovery", "skill_maintenance", "injury_prevention"]
                }
            ],
            16: [
                { 
                    mesocycleNumber: 1,
                    name: "General Physical Preparation", 
                    weeks: 5, 
                    focus: "movement_foundation",
                    emphasis: "aerobic_base",
                    sportComponents: ["movement_literacy", "aerobic_capacity", "injury_prevention"]
                },
                { 
                    mesocycleNumber: 2,
                    name: "Hypertrophy Phase", 
                    weeks: 4, 
                    focus: "muscle_building",
                    emphasis: "structural_strength",
                    sportComponents: ["muscle_balance", "joint_stability", "work_capacity"]
                },
                { 
                    mesocycleNumber: 3,
                    name: "Specific Strength", 
                    weeks: 4, 
                    focus: "sport_specific_strength",
                    emphasis: "functional_strength",
                    sportComponents: ["sport_movements", "unilateral_strength", "core_stability"]
                },
                { 
                    mesocycleNumber: 4,
                    name: "Power & Speed Development", 
                    weeks: 2, 
                    focus: "power_development",
                    emphasis: "explosive_power",
                    sportComponents: ["plyometrics", "olympic_lifts", "speed_development"]
                },
                { 
                    mesocycleNumber: 5,
                    name: "Competition Taper", 
                    weeks: 1, 
                    focus: "peak",
                    emphasis: "competition_readiness",
                    sportComponents: ["skill_refinement", "tactical_preparation", "mental_preparation"]
                }
            ]
        };

        return structures[totalWeeks] || structures[12];
    }

    getTrainingParameters(mesocycleFocus, weekNumber) {
        const parameters = {
            movement_foundation: {
                frequency: 4,
                intensity: "low-moderate (50-70% 1RM)",
                volume: "moderate (10-14 sets per movement pattern/week)",
                restPeriods: "60-90 seconds",
                repRange: "8-15 reps",
                setRange: "3-4 sets",
                movementQuality: "high priority",
                functionalMovements: true,
                mobilityWork: "daily (15-20 min)",
                unilateralTraining: true,
                tempoEmphasis: "controlled",
                exerciseSelection: "movement_patterns",
                sportSpecific: {
                    football: ["linear_acceleration", "change_of_direction", "collision_preparation"],
                    wrestling: ["hip_mobility", "grip_strength", "neck_strengthening", "full_body_flexibility"],
                    baseball: ["rotational_mobility", "shoulder_stability", "hip_flexibility", "core_rotation"],
                    basketball: ["single_leg_squats", "lateral_lunges", "rotational_core"],
                    soccer: ["single_leg_rdl", "lateral_bounds", "deceleration_training"],
                    track_field: ["running_mechanics", "hip_mobility", "ankle_flexibility", "dynamic_warm_up"],
                    tennis: ["rotational_power", "shoulder_stability", "lateral_movement"],
                    swimming: ["shoulder_mobility", "core_stability", "hip_flexibility"],
                    volleyball: ["ankle_mobility", "shoulder_stability", "lateral_movement", "jump_preparation"]
                }
            },
            sport_specific_strength: {
                frequency: 4,
                intensity: "moderate-high (70-85% 1RM)",
                volume: "moderate (8-12 sets per movement pattern/week)",
                restPeriods: "90-120 seconds",
                repRange: "4-8 reps",
                setRange: "3-5 sets",
                sportSpecificMovements: true,
                unilateralTraining: true,
                stabilityTraining: true,
                functionalPatterns: true,
                tempoEmphasis: "explosive_concentric",
                exerciseSelection: "sport_specific",
                sportSpecific: {
                    football: ["acceleration_mechanics", "tackling_preparation", "multi_directional_power"],
                    wrestling: ["takedown_drills", "grip_strength_training", "explosive_hip_drive", "mat_conditioning"],
                    baseball: ["rotational_power_throws", "batting_mechanics", "fielding_agility", "base_running_speed"],
                    basketball: ["single_leg_bounds", "rotational_med_ball", "vertical_jump_training"],
                    soccer: ["single_leg_power", "cutting_mechanics", "sprint_mechanics"],
                    track_field: ["sprint_mechanics", "jumping_technique", "throwing_power", "event_specific_drills"],
                    tennis: ["rotational_throws", "overhead_stability", "lateral_power"],
                    swimming: ["pull_strength", "core_rotation", "streamline_position"],
                    volleyball: ["approach_jump_training", "lateral_shuffle_drills", "spike_mechanics", "blocking_footwork"]
                }
            },
            power_development: {
                frequency: 4,
                intensity: "high (80-95% 1RM for strength, 30-60% for power)",
                volume: "low-moderate (6-10 sets per session)",
                restPeriods: "120-180 seconds (full recovery)",
                repRange: "1-5 reps (strength), 3-6 reps (power)",
                setRange: "3-6 sets",
                plyometrics: true,
                explosiveMovements: true,
                sportSpecificPower: true,
                rateOfForceDevelopment: true,
                contrastTraining: true,
                tempoEmphasis: "maximal_intent",
                exerciseSelection: "power_development",
                sportSpecific: {
                    football: ["40_yard_dash", "position_drills", "contact_preparation"],
                    wrestling: ["explosive_takedowns", "sprawl_mechanics", "bridge_power", "scramble_training"],
                    baseball: ["explosive_batting", "throwing_velocity", "base_stealing", "fielding_reactions"],
                    basketball: ["depth_jumps", "reactive_jumps", "game_simulation"],
                    soccer: ["sprint_starts", "cutting_drills", "heading_power"],
                    track_field: ["block_starts", "explosive_jumps", "throwing_power", "race_simulation"],
                    tennis: ["serve_mechanics", "explosive_rotation", "court_movement"],
                    swimming: ["start_mechanics", "turn_power", "stroke_power"],
                    volleyball: ["spike_approach", "block_jump_timing", "serve_power", "quick_set_reactions"]
                }
            },
            muscle_building: {
                frequency: 4,
                intensity: "moderate (70-80% 1RM)",
                volume: "high (14-18 sets per muscle group/week)",
                restPeriods: "90-120 seconds",
                repRange: "8-12 reps",
                setRange: "3-4 sets",
                tempoEmphasis: "controlled",
                exerciseSelection: "structural_strength",
                sportSpecific: {
                    football: ["total_body_strength", "collision_resistance", "power_base"],
                    wrestling: ["grip_strength", "neck_strength", "hip_power", "core_stability"],
                    baseball: ["rotator_cuff_strength", "core_rotation", "leg_drive", "shoulder_stability"],
                    basketball: ["posterior_chain", "single_leg_strength", "core_endurance"],
                    soccer: ["hamstring_strength", "hip_stability", "ankle_stability"],
                    track_field: ["event_specific_strength", "core_power", "leg_strength", "posterior_chain"],
                    tennis: ["rotator_cuff", "core_strength", "leg_power"],
                    swimming: ["lat_strength", "shoulder_stability", "core_rotation"],
                    volleyball: ["shoulder_strength", "leg_power", "core_stability", "ankle_strength"]
                }
            },
            deload: {
                frequency: 3,
                intensity: "low-moderate (50-70% 1RM)",
                volume: "low (6-8 sets per movement pattern/week)",
                restPeriods: "90-120 seconds",
                repRange: "6-10 reps",
                setRange: "2-3 sets",
                tempoEmphasis: "controlled",
                exerciseSelection: "movement_maintenance",
                activeRecovery: true,
                skillWork: true,
                mobilityEmphasis: true
            }
        };

        return parameters[mesocycleFocus] || parameters.movement_foundation;
    }

    getPromptInstructions(context) {
        return `
## SPORTS PERFORMANCE FOCUS:
• Primary: Sport-specific physical qualities & movement patterns for athletic excellence
• Frequency: 4-5 days/week (coordinate with sport practice)
• Exercises: Multi-planar movements, unilateral work, compound transfers, plyometrics
• Methods: Contrast training, complex training, cluster sets, rate of force development
• Periodization: Off-season preparation, in-season maintenance, post-season recovery
• Movement: Dynamic warm-up 15-20 min, landing mechanics, injury prevention
• Monitoring: Sport metrics (jump, sprint, power), training load, competition schedule
• Recovery: Sleep 8-9h, active recovery, stress management, nutrition timing
        `;
    }

    validateCompatibility(otherGoals) {
        const conflicts = [];
        const recommendations = [];
        const synergies = [];

        if (otherGoals.includes('flexibility')) {
            synergies.push('Excellent combination - flexibility supports injury prevention and performance');
            recommendations.push('Integrate mobility work into daily training routine');
            recommendations.push('Use sport-specific flexibility protocols');
        }

        if (otherGoals.includes('strength')) {
            synergies.push('Strength training supports power development for sports');
            recommendations.push('Emphasize compound movements and functional strength patterns');
            recommendations.push('Use periodized approach: strength → power → sport-specific');
        }

        if (otherGoals.includes('weight_loss')) {
            recommendations.push('Ensure adequate nutrition for performance and recovery');
            recommendations.push('Time fat loss phases during off-season when possible');
            recommendations.push('Maintain power output during caloric restriction');
        }

        if (otherGoals.includes('hypertrophy')) {
            recommendations.push('Focus on sport-specific muscle groups and movement patterns');
            recommendations.push('Balance muscle building with functional movement quality');
            recommendations.push('Use hypertrophy phases during off-season preparation');
        }

        if (otherGoals.includes('endurance')) {
            recommendations.push('Coordinate aerobic and anaerobic training based on sport demands');
            recommendations.push('Separate endurance and power sessions by 6+ hours when possible');
            recommendations.push('Emphasize sport-specific energy system development');
        }

        return {
            compatible: true, // Sports performance can integrate with most goals
            conflicts,
            recommendations,
            synergies
        };
    }

    getRecommendedDuration(userProfile) {
        const fitnessLevel = userProfile.fitnessLevel || 'intermediate';
        const sportExperience = userProfile.sportExperience || 'intermediate';
        
        // Sports performance benefits from longer preparation periods
        if (fitnessLevel === 'beginner' || sportExperience === 'beginner') return 16; // Longer for movement learning
        if (fitnessLevel === 'intermediate') return 12; // Standard off-season preparation
        if (fitnessLevel === 'advanced') return 12; // Focused preparation cycles
        
        return 12; // Default
    }

    getExercisePriorities() {
        return {
            compound: 70,    // High emphasis on compound movements
            isolation: 30,   // Targeted isolation for weak links
            functional: 90,  // Very high functional movement emphasis
            unilateral: 40,  // High unilateral work for sport specificity
            plyometric: 30,  // Significant explosive work
            cardio: 25       // Sport-specific conditioning
        };
    }

    getProgressionStrategy() {
        return {
            primary: 'block',            // Block periodization for sport preparation
            volumeEmphasis: 'moderate',  // Moderate volume to allow skill practice
            intensityEmphasis: 'high',   // High intensity for power development
            frequencyRange: [4, 5],      // 4-5 days per week
            deloadFrequency: 3           // Every 3 weeks due to high intensity
        };
    }

    getRecoveryRequirements() {
        return {
            restBetweenSets: '120-180 seconds (full recovery for power)',
            restBetweenSessions: '24-48 hours (coordinate with sport practice)',
            sleepRecommendation: '8-9 hours (athlete recovery needs)',
            activeRecoveryDays: 2,
            deloadWeekFrequency: 3
        };
    }

    /**
     * Get sport-specific training modifications
     * @param {string} sport - Specific sport (basketball, soccer, tennis, etc.)
     * @returns {Object} Sport-specific parameters
     */
    getSportSpecificModifications(sport) {
        const sportModifications = {
            football: {
                primaryMovements: ['linear_acceleration', 'multi_directional_power', 'collision_preparation', 'contact_readiness'],
                energySystems: ['alactic_power', 'lactic_capacity', 'aerobic_capacity'],
                injuryPrevention: ['concussion_prevention', 'knee_stability', 'shoulder_strength', 'core_stability'],
                seasonalFocus: {
                    offSeason: 'strength_power_size_development',
                    preSeason: 'position_specific_conditioning',
                    inSeason: 'maintenance_injury_prevention'
                }
            },
            basketball: {
                primaryMovements: ['vertical_jump', 'lateral_shuffle', 'deceleration'],
                energySystems: ['alactic_power', 'lactic_capacity'],
                injuryPrevention: ['ankle_stability', 'knee_control', 'shoulder_health'],
                seasonalFocus: {
                    offSeason: 'strength_power_development',
                    preSeason: 'sport_specific_conditioning',
                    inSeason: 'maintenance_injury_prevention'
                }
            },
            soccer: {
                primaryMovements: ['linear_sprint', 'cutting', 'jumping'],
                energySystems: ['aerobic_power', 'repeated_sprint_ability'],
                injuryPrevention: ['hamstring_strength', 'ankle_stability', 'groin_flexibility'],
                seasonalFocus: {
                    offSeason: 'strength_endurance_development',
                    preSeason: 'match_specific_conditioning',
                    inSeason: 'recovery_maintenance'
                }
            },
            tennis: {
                primaryMovements: ['rotational_power', 'lateral_movement', 'overhead_reach'],
                energySystems: ['alactic_power', 'aerobic_capacity'],
                injuryPrevention: ['shoulder_stability', 'core_strength', 'hip_mobility'],
                seasonalFocus: {
                    offSeason: 'strength_power_development',
                    preSeason: 'match_simulation',
                    inSeason: 'maintenance_recovery'
                }
            },
            swimming: {
                primaryMovements: ['pull_strength', 'core_rotation', 'streamline'],
                energySystems: ['aerobic_power', 'lactate_threshold'],
                injuryPrevention: ['shoulder_health', 'core_stability', 'hip_flexibility'],
                seasonalFocus: {
                    offSeason: 'strength_technique_development',
                    preSeason: 'race_pace_training',
                    inSeason: 'taper_maintenance'
                }
            },
            wrestling: {
                primaryMovements: ['takedown_power', 'sprawl_defense', 'bridge_escape', 'scramble_recovery'],
                energySystems: ['anaerobic_power', 'lactic_capacity', 'alactic_power'],
                injuryPrevention: ['neck_strength', 'shoulder_stability', 'knee_health', 'grip_endurance'],
                seasonalFocus: {
                    offSeason: 'strength_power_flexibility_development',
                    preSeason: 'wrestling_specific_conditioning',
                    inSeason: 'weight_management_maintenance'
                }
            },
            baseball: {
                primaryMovements: ['rotational_power', 'throwing_mechanics', 'batting_swing', 'base_running'],
                energySystems: ['alactic_power', 'aerobic_capacity', 'neuromuscular_coordination'],
                injuryPrevention: ['shoulder_health', 'elbow_stability', 'hip_mobility', 'core_strength'],
                seasonalFocus: {
                    offSeason: 'strength_power_mobility_development',
                    preSeason: 'sport_specific_skill_conditioning',
                    inSeason: 'maintenance_injury_prevention'
                }
            },
            track_field: {
                primaryMovements: ['sprint_mechanics', 'jumping_technique', 'throwing_power', 'event_specific'],
                energySystems: ['alactic_power', 'lactic_capacity', 'aerobic_power'],
                injuryPrevention: ['hamstring_health', 'achilles_strength', 'hip_stability', 'core_control'],
                seasonalFocus: {
                    offSeason: 'general_strength_power_development',
                    preSeason: 'event_specific_preparation',
                    inSeason: 'peak_performance_maintenance'
                }
            },
            volleyball: {
                primaryMovements: ['vertical_jump', 'lateral_movement', 'overhead_reach', 'quick_reactions'],
                energySystems: ['alactic_power', 'aerobic_capacity', 'neuromuscular_power'],
                injuryPrevention: ['shoulder_stability', 'ankle_strength', 'knee_control', 'finger_health'],
                seasonalFocus: {
                    offSeason: 'power_agility_development',
                    preSeason: 'court_specific_conditioning',
                    inSeason: 'skill_maintenance_recovery'
                }
            }
        };

        return sportModifications[sport.toLowerCase()] || sportModifications.football; // Default to American football
    }
}

module.exports = SportsPerformanceStrategy;