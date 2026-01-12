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
## FLEXIBILITY FOCUS:
• Primary: Range of motion, movement quality & injury prevention via systematic mobility
• Frequency: 5-6 days/week (daily practice optimal)
• Methods: Static stretching (30-120s), dynamic stretching, PNF techniques, myofascial release
• Breathing: Diaphragmatic breathing, coordinated movement, stress reduction
• Progression: Weeks 1-3 routine building, 4-8 ROM increase, 9-12 strength integration
• Priority Areas: Hip flexors, thoracic spine, shoulders, hamstrings
• Daily Structure: Morning 5-10 min, pre-workout 10-15 min dynamic, post-workout 10-20 min static
• Lifestyle: Desk mobility, travel stretches, hourly movement breaks
• Recovery: Sleep quality, stress management, pain reduction
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