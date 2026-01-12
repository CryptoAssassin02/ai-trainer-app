# 🎯 **PHASE 1: GOAL STRATEGIES PART 2 - SPORTS PERFORMANCE & FLEXIBILITY**

This document continues the systematic implementation of fitness goal strategies, focusing on **Sports Performance** and **Flexibility** strategies. These strategies are built using the same detailed template structure established in `phase1-goal-strategy-foundation.md` and incorporate 2025 industry best practices from sports science experts.

---

## 🏆 **SPORTS PERFORMANCE STRATEGY**

### **File: `backend/agents/goal-strategies/sports-performance-strategy.js`**

```javascript
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
## SPORTS PERFORMANCE SPECIALIZATION INSTRUCTIONS:
- **PRIMARY FOCUS**: Develop sport-specific physical qualities and movement patterns for athletic excellence
- **TRAINING FREQUENCY**: 4-5 days per week (coordinate with sport practice schedule)
- **SPORT-SPECIFIC CONSIDERATIONS**:
  * **American Football**: Multi-directional power, collision preparation, acceleration mechanics, contact readiness
  * **Wrestling**: Explosive takedown power, grip strength, full-body flexibility, anaerobic power endurance
  * **Baseball**: Rotational power, shoulder health, hip mobility, reactive movements, throwing velocity
  * **Basketball**: Vertical jump power, lateral quickness, single-leg stability, rotational core strength
  * **Soccer/Football**: Linear speed, cutting mechanics, single-leg power, deceleration control
  * **Track & Field**: Event-specific power, running mechanics, explosive strength, speed development
  * **Tennis**: Rotational power, shoulder stability, lateral movement, reactive agility
  * **Swimming**: Pull strength, core rotation, shoulder mobility, streamline position
  * **Volleyball**: Vertical jump power, lateral agility, shoulder stability, reactive court movement
- **EXERCISE SELECTION**: 
  * Multi-planar movements (sagittal, frontal, transverse planes)
  * Unilateral exercises for balance, stability, and sport specificity
  * Compound movements that transfer to sport performance
  * Plyometric and ballistic exercises for power development
  * Sport-specific movement patterns and positions
- **TRAINING METHODS**:
  * Contrast training (heavy strength + explosive power)
  * Complex training (strength + power + speed + skill)
  * Cluster sets for power development
  * Rate of force development emphasis
  * Accommodating resistance (bands, chains) for power curves
  * Competition simulation and game-like scenarios
- **PERIODIZATION PRINCIPLES**:
  * Plan around competition schedule and season demands
  * Off-season: General preparation → Specific preparation → Power development
  * In-season: Maintenance with reduced volume, skill emphasis
  * Post-season: Active recovery and injury rehabilitation
- **MOVEMENT QUALITY EMPHASIS**:
  * Comprehensive warm-up protocols (dynamic prep 15-20 min)
  * Movement screening and corrective exercises
  * Mobility and stability work integrated daily
  * Proper landing mechanics and deceleration training
  * Injury prevention through balanced development
- **PERFORMANCE MONITORING**:
  * Track sport-specific metrics (jump height, sprint times, power output)
  * Monitor training load and recovery status
  * Adjust intensity based on competition schedule
  * Use technology for movement analysis and feedback
- **RECOVERY & REGENERATION**: 
  * Emphasize sleep optimization (8-9 hours for athletes)
  * Active recovery sessions (light movement, skill work)
  * Stress management and mental preparation
  * Nutrition timing for performance and recovery
  * Injury prevention and early intervention protocols
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
```

---

## 🧘 **FLEXIBILITY STRATEGY**

### **File: `backend/agents/goal-strategies/flexibility-strategy.js`**

```javascript
const BaseGoalStrategy = require('./base-goal-strategy');

/**
 * Flexibility Strategy - Focus on mobility, movement quality, and injury prevention
 * Emphasizes range of motion, joint health, and functional movement patterns
 * Based on 2025 movement science and mobility expert recommendations
 */
class FlexibilityStrategy extends BaseGoalStrategy {
    constructor() {
        super('flexibility');
        this.category = 'mobility';
    }

    getMesocycleStructure(userProfile, totalWeeks, isPrimary = true) {
        const structures = {
            8: [
                { 
                    mesocycleNumber: 1,
                    name: "Movement Assessment & Foundation", 
                    weeks: 3, 
                    focus: "mobility_foundation",
                    volumeProgression: "progressive",
                    intensityProgression: "linear",
                    emphasis: "movement_quality",
                    mobilityComponents: ["basic_rom", "postural_awareness", "breathing_patterns"]
                },
                { 
                    mesocycleNumber: 2,
                    name: "Active Flexibility Development", 
                    weeks: 4, 
                    focus: "active_mobility",
                    volumeProgression: "moderate",
                    intensityProgression: "undulating",
                    emphasis: "functional_range",
                    mobilityComponents: ["dynamic_stretching", "strength_through_range", "movement_integration"]
                },
                { 
                    mesocycleNumber: 3,
                    name: "Maintenance & Integration", 
                    weeks: 1, 
                    focus: "mobility_maintenance",
                    volumeProgression: "low",
                    intensityProgression: "recovery",
                    emphasis: "lifestyle_integration",
                    mobilityComponents: ["daily_routines", "habit_formation", "self_assessment"]
                }
            ],
            12: [
                { 
                    mesocycleNumber: 1,
                    name: "Movement Assessment & Foundation", 
                    weeks: 3, 
                    focus: "mobility_foundation",
                    volumeProgression: "progressive",
                    intensityProgression: "linear",
                    emphasis: "postural_restoration",
                    mobilityComponents: ["movement_screen", "postural_correction", "basic_mobility"]
                },
                { 
                    mesocycleNumber: 2,
                    name: "Active Flexibility Development", 
                    weeks: 4, 
                    focus: "active_mobility",
                    volumeProgression: "moderate",
                    intensityProgression: "progressive",
                    emphasis: "strength_through_range",
                    mobilityComponents: ["dynamic_mobility", "controlled_articular_rotations", "pnf_stretching"]
                },
                { 
                    mesocycleNumber: 3,
                    name: "Advanced Mobility & Stability", 
                    weeks: 4, 
                    focus: "mobility_stability",
                    volumeProgression: "moderate",
                    intensityProgression: "high",
                    emphasis: "movement_mastery",
                    mobilityComponents: ["advanced_patterns", "stability_integration", "flow_sequences"]
                },
                { 
                    mesocycleNumber: 4,
                    name: "Lifestyle Integration", 
                    weeks: 1, 
                    focus: "maintenance",
                    volumeProgression: "low",
                    intensityProgression: "recovery",
                    emphasis: "sustainable_practice",
                    mobilityComponents: ["daily_routines", "workplace_mobility", "long_term_habits"]
                }
            ],
            16: [
                { 
                    mesocycleNumber: 1,
                    name: "Movement Assessment & Restoration", 
                    weeks: 4, 
                    focus: "mobility_foundation",
                    emphasis: "postural_restoration",
                    mobilityComponents: ["comprehensive_assessment", "corrective_exercises", "breathing_restoration"]
                },
                { 
                    mesocycleNumber: 2,
                    name: "Passive Flexibility Development", 
                    weeks: 4, 
                    focus: "passive_mobility",
                    emphasis: "range_of_motion",
                    mobilityComponents: ["static_stretching", "myofascial_release", "joint_mobilization"]
                },
                { 
                    mesocycleNumber: 3,
                    name: "Active Flexibility & Strength", 
                    weeks: 4, 
                    focus: "active_mobility",
                    emphasis: "strength_through_range",
                    mobilityComponents: ["dynamic_stretching", "end_range_strength", "movement_control"]
                },
                { 
                    mesocycleNumber: 4,
                    name: "Advanced Movement Integration", 
                    weeks: 3, 
                    focus: "movement_mastery",
                    emphasis: "complex_patterns",
                    mobilityComponents: ["flow_sequences", "multi_planar_movement", "advanced_yoga"]
                },
                { 
                    mesocycleNumber: 5,
                    name: "Lifestyle Maintenance", 
                    weeks: 1, 
                    focus: "maintenance",
                    emphasis: "sustainable_practice",
                    mobilityComponents: ["habit_integration", "self_maintenance", "progress_assessment"]
                }
            ]
        };

        return structures[totalWeeks] || structures[12];
    }

    getTrainingParameters(mesocycleFocus, weekNumber) {
        const parameters = {
            mobility_foundation: {
                frequency: 6, // Daily practice recommended
                intensity: "low-moderate (gentle to moderate stretch)",
                volume: "moderate (20-30 min sessions)",
                restPeriods: "30-60 seconds between stretches",
                holdTime: "30-60 seconds per stretch",
                setRange: "2-3 sets per stretch",
                breathingEmphasis: "diaphragmatic breathing",
                exerciseSelection: "basic_mobility",
                dailyRoutine: true,
                postureWork: true,
                tempoEmphasis: "slow_controlled",
                mobilityTypes: ["static_stretching", "gentle_movement", "postural_exercises"],
                targetAreas: ["hip_flexors", "thoracic_spine", "shoulders", "hamstrings", "calves"]
            },
            passive_mobility: {
                frequency: 5,
                intensity: "moderate (comfortable stretch sensation)",
                volume: "moderate-high (30-45 min sessions)",
                restPeriods: "60-90 seconds between stretches",
                holdTime: "60-120 seconds per stretch",
                setRange: "3-4 sets per stretch",
                breathingEmphasis: "relaxation_breathing",
                exerciseSelection: "passive_stretching",
                myofascialRelease: true,
                jointMobilization: true,
                tempoEmphasis: "sustained_holds",
                mobilityTypes: ["static_stretching", "pnf_stretching", "assisted_stretching"],
                targetAreas: ["full_body_systematic", "problem_areas", "compensation_patterns"]
            },
            active_mobility: {
                frequency: 5,
                intensity: "moderate-high (active stretch with resistance)",
                volume: "moderate (25-35 min sessions)",
                restPeriods: "45-60 seconds between exercises",
                holdTime: "15-30 seconds per position",
                setRange: "2-4 sets per exercise",
                breathingEmphasis: "coordinated_breathing",
                exerciseSelection: "dynamic_mobility",
                strengthThroughRange: true,
                movementControl: true,
                tempoEmphasis: "controlled_dynamic",
                mobilityTypes: ["dynamic_stretching", "cars", "end_range_strengthening"],
                targetAreas: ["functional_patterns", "sport_specific", "daily_movements"]
            },
            mobility_stability: {
                frequency: 4,
                intensity: "high (challenging positions and control)",
                volume: "moderate (30-40 min sessions)",
                restPeriods: "60-90 seconds between exercises",
                holdTime: "10-30 seconds per position",
                setRange: "3-5 sets per exercise",
                breathingEmphasis: "stability_breathing",
                exerciseSelection: "advanced_mobility",
                stabilityIntegration: true,
                balanceChallenge: true,
                tempoEmphasis: "precise_control",
                mobilityTypes: ["flow_sequences", "stability_holds", "complex_patterns"],
                targetAreas: ["integrated_chains", "weak_links", "advanced_patterns"]
            },
            movement_mastery: {
                frequency: 4,
                intensity: "high (complex movement patterns)",
                volume: "moderate-high (35-50 min sessions)",
                restPeriods: "90-120 seconds between sequences",
                holdTime: "Variable based on flow",
                setRange: "3-6 sets per sequence",
                breathingEmphasis: "flow_breathing",
                exerciseSelection: "movement_flows",
                complexPatterns: true,
                creativityEncouraged: true,
                tempoEmphasis: "fluid_transitions",
                mobilityTypes: ["yoga_flows", "movement_chains", "dance_patterns"],
                targetAreas: ["full_body_integration", "artistic_expression", "movement_mastery"]
            },
            maintenance: {
                frequency: 3,
                intensity: "low-moderate (maintenance level)",
                volume: "low-moderate (15-25 min sessions)",
                restPeriods: "30-60 seconds between stretches",
                holdTime: "30-45 seconds per stretch",
                setRange: "2-3 sets per stretch",
                breathingEmphasis: "relaxation",
                exerciseSelection: "maintenance_routine",
                dailyHabits: true,
                selfAssessment: true,
                tempoEmphasis: "relaxed",
                mobilityTypes: ["gentle_stretching", "maintenance_flows", "desk_breaks"],
                targetAreas: ["problem_areas", "daily_maintenance", "stress_relief"]
            }
        };

        return parameters[mesocycleFocus] || parameters.mobility_foundation;
    }

    getPromptInstructions(context) {
        return `
## FLEXIBILITY SPECIALIZATION INSTRUCTIONS:
- **PRIMARY FOCUS**: Improve range of motion, movement quality, and injury prevention through systematic mobility training
- **TRAINING FREQUENCY**: 5-6 days per week (daily practice recommended for optimal results)
- **MOBILITY ASSESSMENT PRIORITIES**:
  * Identify movement restrictions and compensation patterns
  * Address postural imbalances from daily activities
  * Screen for injury risk factors and movement dysfunction
  * Establish baseline measurements for progress tracking
- **EXERCISE SELECTION HIERARCHY**: 
  * **Foundation Phase**: Basic static stretches, postural exercises, breathing patterns
  * **Development Phase**: Dynamic stretching, PNF techniques, controlled articular rotations (CARs)
  * **Advanced Phase**: Flow sequences, complex movement patterns, stability integration
  * **Maintenance Phase**: Daily routines, workplace mobility, lifestyle integration
- **STRETCHING METHODOLOGIES**:
  * **Static Stretching**: 30-120 second holds for passive range improvement
  * **Dynamic Stretching**: Movement-based stretches for functional flexibility
  * **PNF Stretching**: Contract-relax techniques for advanced flexibility gains
  * **Myofascial Release**: Foam rolling and self-massage for tissue quality
  * **Joint Mobilization**: Gentle movements to improve joint health
- **BREATHING INTEGRATION**:
  * Diaphragmatic breathing for relaxation and nervous system regulation
  * Coordinated breathing with movement for enhanced mobility
  * Breath awareness for stress reduction and mindfulness
  * Specific breathing patterns for different stretch types
- **PROGRESSION STRATEGIES**:
  * Week 1-3: Establish daily routine and basic mobility
  * Week 4-8: Increase range of motion and add dynamic elements
  * Week 9-12: Integrate strength through range and complex patterns
  * Week 13+: Advanced flows and lifestyle integration
- **TARGET AREAS BY PRIORITY**:
  * **High Priority**: Hip flexors, thoracic spine, shoulders, hamstrings
  * **Moderate Priority**: Calves, glutes, neck, wrists, ankles
  * **Specialized**: Sport-specific or occupation-specific areas
- **DAILY ROUTINE STRUCTURE**:
  * **Morning**: 5-10 min gentle awakening sequence
  * **Pre-Workout**: 10-15 min dynamic warm-up mobility
  * **Post-Workout**: 10-20 min static stretching and recovery
  * **Evening**: 15-30 min relaxation and restoration sequence
  * **Workplace**: 2-3 min hourly movement breaks
- **LIFESTYLE INTEGRATION**:
  * Desk-based mobility routines for office workers
  * Travel-friendly stretches for frequent travelers
  * Age-appropriate modifications for different life stages
  * Injury prevention protocols for high-risk activities
- **RECOVERY & RESTORATION**: 
  * Emphasize sleep quality through evening relaxation routines
  * Stress management through mindful movement practices
  * Pain reduction through targeted mobility work
  * Energy enhancement through morning activation sequences
        `;
    }

    validateCompatibility(otherGoals) {
        const conflicts = [];
        const recommendations = [];
        const synergies = [];

        if (otherGoals.includes('sports_performance')) {
            synergies.push('Excellent combination - flexibility supports injury prevention and performance');
            recommendations.push('Integrate sport-specific mobility protocols');
            recommendations.push('Use dynamic stretching as warm-up for training sessions');
        }

        if (otherGoals.includes('strength')) {
            synergies.push('Flexibility supports full range of motion in strength training');
            recommendations.push('Combine stretching with strength training for balanced development');
            recommendations.push('Use flexibility work as active recovery between strength sessions');
        }

        if (otherGoals.includes('weight_loss')) {
            synergies.push('Flexibility training supports active recovery and stress management');
            recommendations.push('Use gentle yoga flows as low-intensity cardio');
            recommendations.push('Incorporate flexibility work on rest days from intense training');
        }

        if (otherGoals.includes('hypertrophy')) {
            synergies.push('Flexibility prevents muscle tightness from high-volume training');
            recommendations.push('Emphasize stretching for muscles being heavily trained');
            recommendations.push('Use flexibility work to enhance recovery between sessions');
        }

        if (otherGoals.includes('general_fitness')) {
            synergies.push('Flexibility is a key component of overall fitness and health');
            recommendations.push('Integrate mobility work into daily fitness routine');
            recommendations.push('Focus on functional movement patterns for daily activities');
        }

        if (otherGoals.includes('endurance')) {
            synergies.push('Flexibility supports efficient movement patterns for endurance activities');
            recommendations.push('Use gentle stretching for active recovery from endurance training');
            recommendations.push('Focus on areas prone to tightness from repetitive movements');
        }

        return {
            compatible: true, // Flexibility is compatible with all goals
            conflicts,
            recommendations,
            synergies
        };
    }

    getRecommendedDuration(userProfile) {
        const age = userProfile.age || 30;
        const fitnessLevel = userProfile.fitnessLevel || 'intermediate';
        const sedentaryTime = userProfile.sedentaryHours || 8; // Hours per day sitting
        
        // Flexibility benefits from longer programs for lasting change
        if (age > 50 || sedentaryTime > 8) return 16; // Longer for older adults or sedentary individuals
        if (fitnessLevel === 'beginner') return 12; // Standard for beginners
        if (fitnessLevel === 'intermediate') return 12; // Standard duration
        if (fitnessLevel === 'advanced') return 8; // Shorter for maintenance
        
        return 12; // Default
    }

    getExercisePriorities() {
        return {
            compound: 30,    // Lower emphasis on compound movements
            isolation: 70,   // High emphasis on targeted stretches
            functional: 80,  // Very high functional movement emphasis
            unilateral: 40,  // Moderate unilateral work for balance
            plyometric: 5,   // Minimal explosive work
            cardio: 20       // Light cardio integration (yoga flows)
        };
    }

    getProgressionStrategy() {
        return {
            primary: 'linear',           // Linear progression in range of motion
            volumeEmphasis: 'moderate',  // Moderate volume with daily practice
            intensityEmphasis: 'low',    // Low intensity, high frequency
            frequencyRange: [5, 6],      // 5-6 days per week (daily preferred)
            deloadFrequency: 6           // Every 6 weeks (less frequent due to low intensity)
        };
    }

    getRecoveryRequirements() {
        return {
            restBetweenSets: '30-90 seconds (relaxation between stretches)',
            restBetweenSessions: '0-24 hours (daily practice possible)',
            sleepRecommendation: '7-9 hours (enhanced by evening flexibility routine)',
            activeRecoveryDays: 0, // Flexibility IS active recovery
            deloadWeekFrequency: 6
        };
    }

    /**
     * Get flexibility assessment areas and priorities
     * @returns {Object} Assessment areas and methods
     */
    getFlexibilityAssessment() {
        return {
            primaryAreas: {
                hipFlexors: {
                    tests: ['thomas_test', 'couch_stretch_assessment'],
                    targetROM: '15+ degrees hip extension',
                    commonIssues: ['anterior_pelvic_tilt', 'lower_back_pain']
                },
                thoracicSpine: {
                    tests: ['thoracic_rotation', 'wall_slide_test'],
                    targetROM: '45+ degrees rotation each direction',
                    commonIssues: ['rounded_shoulders', 'neck_pain']
                },
                shoulders: {
                    tests: ['overhead_reach', 'behind_back_reach'],
                    targetROM: '180 degrees overhead flexion',
                    commonIssues: ['impingement', 'frozen_shoulder']
                },
                hamstrings: {
                    tests: ['straight_leg_raise', 'sit_reach_test'],
                    targetROM: '80+ degrees hip flexion',
                    commonIssues: ['lower_back_compensation', 'knee_pain']
                },
                ankles: {
                    tests: ['dorsiflexion_test', 'calf_flexibility'],
                    targetROM: '20+ degrees dorsiflexion',
                    commonIssues: ['achilles_tightness', 'plantar_fasciitis']
                }
            },
            assessmentFrequency: 'every_4_weeks',
            progressTracking: ['rom_measurements', 'functional_tests', 'subjective_ratings']
        };
    }

    /**
     * Get daily routine templates for different lifestyles
     * @param {string} lifestyle - Lifestyle type (office_worker, athlete, senior, etc.)
     * @returns {Object} Daily routine structure
     */
    getDailyRoutineTemplate(lifestyle = 'general') {
        const routines = {
            office_worker: {
                morning: {
                    duration: '10 min',
                    focus: 'spinal_mobility',
                    exercises: ['cat_cow', 'thoracic_rotation', 'hip_flexor_stretch']
                },
                workBreaks: {
                    duration: '2-3 min every hour',
                    focus: 'posture_reset',
                    exercises: ['neck_rolls', 'shoulder_shrugs', 'seated_spinal_twist']
                },
                evening: {
                    duration: '20 min',
                    focus: 'stress_relief',
                    exercises: ['forward_fold', 'pigeon_pose', 'legs_up_wall']
                }
            },
            athlete: {
                preTraining: {
                    duration: '15 min',
                    focus: 'dynamic_preparation',
                    exercises: ['leg_swings', 'arm_circles', 'walking_lunges']
                },
                postTraining: {
                    duration: '20 min',
                    focus: 'recovery_stretching',
                    exercises: ['static_holds', 'pnf_stretching', 'foam_rolling']
                },
                restDays: {
                    duration: '30 min',
                    focus: 'maintenance_mobility',
                    exercises: ['yoga_flow', 'deep_stretching', 'meditation']
                }
            },
            senior: {
                morning: {
                    duration: '15 min',
                    focus: 'gentle_activation',
                    exercises: ['chair_stretches', 'gentle_twists', 'ankle_pumps']
                },
                afternoon: {
                    duration: '20 min',
                    focus: 'balance_mobility',
                    exercises: ['standing_stretches', 'balance_exercises', 'tai_chi_movements']
                },
                evening: {
                    duration: '15 min',
                    focus: 'relaxation',
                    exercises: ['gentle_yoga', 'breathing_exercises', 'meditation']
                }
            }
        };

        return routines[lifestyle] || routines.general;
    }
}

module.exports = FlexibilityStrategy;
```

---

## 📊 **STRATEGY COMPARISON SUMMARY**

| Strategy | Primary Focus | Frequency | Duration | Key Methods |
|----------|---------------|-----------|----------|-------------|
| **Sports Performance** | Athletic excellence, sport-specific power | 4-5 days/week | 12-16 weeks | Block periodization, plyometrics, sport-specific training |
| **Flexibility** | Range of motion, movement quality | 5-6 days/week | 12-16 weeks | Static/dynamic stretching, PNF, daily practice |

---

## 🎯 **INTEGRATION NOTES**

Both strategies are designed to:
- **Complement existing strategies** from `phase1-goal-strategy-foundation.md`
- **Follow the established template** with all required methods implemented
- **Incorporate 2025 industry best practices** from sports science and movement experts
- **Support multi-goal orchestration** through comprehensive compatibility validation
- **Provide sport-specific modifications** for personalized training approaches

### 🏈 **PRIORITY SPORTS COVERAGE (100% Complete)**
**Primary Target Sports for App Users:**
- ✅ **American Football** (Default) - Complete coverage with collision preparation and position-specific training
- ✅ **Wrestling** - Complete coverage with takedown power and weight management protocols  
- ✅ **Baseball** - Complete coverage with rotational power and throwing mechanics
- ✅ **Basketball** - Complete coverage with vertical jump and lateral movement training
- ✅ **Soccer** - Complete coverage with cutting mechanics and endurance protocols
- ✅ **Track & Field** - Complete coverage with event-specific power and speed development

**Additional Sports Supported:**
- ✅ Tennis, Swimming, Volleyball (comprehensive coverage maintained)

**Next Steps**: Continue with the remaining 3 strategies (General Fitness, Endurance, Body Recomposition) in a separate document to complete the full 8-strategy implementation.
