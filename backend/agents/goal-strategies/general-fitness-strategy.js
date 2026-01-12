const BaseGoalStrategy = require('./base-goal-strategy');

/**
 * General Fitness Strategy - Focus on overall health and balanced fitness
 * Emphasizes functional movements, cardiovascular health, and sustainable lifestyle integration
 * Based on 2025 ACSM guidelines and functional fitness expert recommendations
 */
class GeneralFitnessStrategy extends BaseGoalStrategy {
    constructor() {
        super('general_fitness');
        this.category = 'general';
    }

    getMesocycleStructure(userProfile, totalWeeks, isPrimary = true) {
        const structures = {
            8: [
                { 
                    mesocycleNumber: 1,
                    name: "Fitness Foundation", 
                    weeks: 3, 
                    focus: "movement_literacy",
                    volumeProgression: "progressive",
                    intensityProgression: "linear",
                    emphasis: "habit_formation",
                    fitnessComponents: ["cardiovascular_base", "movement_patterns", "flexibility"]
                },
                { 
                    mesocycleNumber: 2,
                    name: "Balanced Development", 
                    weeks: 4, 
                    focus: "comprehensive_fitness",
                    volumeProgression: "moderate",
                    intensityProgression: "undulating",
                    emphasis: "well_rounded_improvement",
                    fitnessComponents: ["strength_endurance", "functional_movement", "cardiovascular_fitness"]
                },
                { 
                    mesocycleNumber: 3,
                    name: "Lifestyle Integration", 
                    weeks: 1, 
                    focus: "maintenance",
                    volumeProgression: "low",
                    intensityProgression: "recovery",
                    emphasis: "sustainable_habits",
                    fitnessComponents: ["active_recovery", "habit_reinforcement", "enjoyment"]
                }
            ],
            12: [
                { 
                    mesocycleNumber: 1,
                    name: "Fitness Foundation", 
                    weeks: 4, 
                    focus: "movement_literacy",
                    volumeProgression: "progressive",
                    intensityProgression: "linear",
                    emphasis: "habit_formation",
                    fitnessComponents: ["cardiovascular_base", "basic_strength", "mobility", "coordination"]
                },
                { 
                    mesocycleNumber: 2,
                    name: "Strength & Endurance Development", 
                    weeks: 4, 
                    focus: "strength_endurance",
                    volumeProgression: "moderate",
                    intensityProgression: "progressive",
                    emphasis: "functional_capacity",
                    fitnessComponents: ["muscular_endurance", "cardiovascular_fitness", "functional_strength"]
                },
                { 
                    mesocycleNumber: 3,
                    name: "Comprehensive Fitness", 
                    weeks: 3, 
                    focus: "well_rounded_fitness",
                    volumeProgression: "moderate",
                    intensityProgression: "undulating",
                    emphasis: "balanced_improvement",
                    fitnessComponents: ["power_endurance", "agility", "balance", "coordination"]
                },
                { 
                    mesocycleNumber: 4,
                    name: "Lifestyle Integration", 
                    weeks: 1, 
                    focus: "maintenance",
                    volumeProgression: "low",
                    intensityProgression: "recovery",
                    emphasis: "sustainable_habits",
                    fitnessComponents: ["active_lifestyle", "habit_reinforcement", "long_term_adherence"]
                }
            ],
            16: [
                { 
                    mesocycleNumber: 1,
                    name: "Fitness Foundation", 
                    weeks: 4, 
                    focus: "movement_literacy",
                    emphasis: "basic_fitness_development",
                    fitnessComponents: ["cardiovascular_base", "movement_competency", "postural_health"]
                },
                { 
                    mesocycleNumber: 2,
                    name: "Cardiovascular Development", 
                    weeks: 4, 
                    focus: "aerobic_fitness",
                    emphasis: "heart_health",
                    fitnessComponents: ["aerobic_capacity", "cardiovascular_endurance", "metabolic_health"]
                },
                { 
                    mesocycleNumber: 3,
                    name: "Strength & Power Development", 
                    weeks: 4, 
                    focus: "functional_strength",
                    emphasis: "daily_life_capacity",
                    fitnessComponents: ["functional_strength", "muscular_endurance", "bone_health"]
                },
                { 
                    mesocycleNumber: 4,
                    name: "Comprehensive Integration", 
                    weeks: 3, 
                    focus: "well_rounded_fitness",
                    emphasis: "balanced_fitness",
                    fitnessComponents: ["agility", "balance", "coordination", "flexibility"]
                },
                { 
                    mesocycleNumber: 5,
                    name: "Lifestyle Maintenance", 
                    weeks: 1, 
                    focus: "maintenance",
                    emphasis: "sustainable_lifestyle",
                    fitnessComponents: ["habit_integration", "enjoyment", "long_term_adherence"]
                }
            ]
        };

        return structures[totalWeeks] || structures[12];
    }

    getTrainingParameters(mesocycleFocus, weekNumber) {
        const parameters = {
            movement_literacy: {
                frequency: 4,
                intensity: "low-moderate (50-70% effort)",
                volume: "moderate (30-45 min sessions)",
                restPeriods: "60-90 seconds",
                repRange: "12-20 reps",
                setRange: "2-3 sets",
                functionalMovements: true,
                bodyweightEmphasis: true,
                movementQuality: "high priority",
                tempoEmphasis: "controlled",
                exerciseSelection: "basic_patterns",
                cardiovascularIntegration: "light (walking, easy cycling)",
                mobilityWork: "daily (10-15 min)",
                balanceTraining: true,
                coordinationDrills: true
            },
            aerobic_fitness: {
                frequency: 5,
                intensity: "moderate (60-75% HRmax)",
                volume: "moderate-high (35-50 min sessions)",
                restPeriods: "active recovery",
                cardioTypes: ["walking", "cycling", "swimming", "dancing"],
                heartRateZones: "Zone 2-3 emphasis",
                varietyEmphasis: true,
                enjoymentFocus: true,
                tempoEmphasis: "steady_state",
                exerciseSelection: "low_impact_preferred",
                socialActivity: "encouraged",
                outdoorActivity: "preferred",
                progressionMethod: "time_based"
            },
            strength_endurance: {
                frequency: 4,
                intensity: "moderate (65-75% 1RM)",
                volume: "moderate (12-16 sets per muscle group/week)",
                restPeriods: "60-90 seconds",
                repRange: "12-20 reps",
                setRange: "2-4 sets",
                functionalMovements: true,
                compoundEmphasis: true,
                circuitTraining: true,
                tempoEmphasis: "controlled",
                exerciseSelection: "functional_patterns",
                bodyweightProgression: true,
                resistanceBandIntegration: true,
                coreIntegration: "every_session"
            },
            functional_strength: {
                frequency: 4,
                intensity: "moderate-high (70-80% 1RM)",
                volume: "moderate (10-14 sets per muscle group/week)",
                restPeriods: "90-120 seconds",
                repRange: "8-15 reps",
                setRange: "3-4 sets",
                functionalMovements: true,
                dailyLifeMovements: true,
                unilateralTraining: true,
                tempoEmphasis: "natural",
                exerciseSelection: "life_applicable",
                stabilityTraining: true,
                balanceIntegration: true,
                carryingMovements: true
            },
            comprehensive_fitness: {
                frequency: 5,
                intensity: "varied (50-80% effort)",
                volume: "moderate (35-50 min sessions)",
                restPeriods: "varied by activity",
                repRange: "varied by exercise type",
                setRange: "2-4 sets",
                varietyEmphasis: true,
                crossTraining: true,
                hiitIntegration: "1-2x/week",
                tempoEmphasis: "varied",
                exerciseSelection: "diverse_modalities",
                sportActivities: "encouraged",
                groupFitness: "encouraged",
                seasonalActivities: true
            },
            well_rounded_fitness: {
                frequency: 5,
                intensity: "moderate-high (65-80% effort)",
                volume: "moderate-high (40-60 min sessions)",
                restPeriods: "60-120 seconds",
                repRange: "8-20 reps (varied)",
                setRange: "3-5 sets",
                balancedApproach: true,
                strengthComponent: "40%",
                cardioComponent: "40%",
                flexibilityComponent: "20%",
                tempoEmphasis: "varied",
                exerciseSelection: "comprehensive",
                skillDevelopment: true,
                challengeProgression: true,
                enjoymentMaintenance: true
            },
            maintenance: {
                frequency: 3,
                intensity: "low-moderate (50-70% effort)",
                volume: "low-moderate (25-40 min sessions)",
                restPeriods: "comfortable",
                repRange: "10-15 reps",
                setRange: "2-3 sets",
                habitReinforcement: true,
                enjoymentFocus: true,
                flexibilityEmphasis: true,
                tempoEmphasis: "comfortable",
                exerciseSelection: "preferred_activities",
                socialIntegration: true,
                lifestyleFocus: true,
                stressReduction: true
            }
        };

        return parameters[mesocycleFocus] || parameters.movement_literacy;
    }

    getPromptInstructions(context) {
        return `
## GENERAL FITNESS FOCUS:
• Primary: Well-rounded fitness for health, daily function & quality of life
• Frequency: 4-5 days/week, emphasize consistency & enjoyment
• Exercises: Functional movements (squats, lunges, push/pull), multi-planar, compound focus
• Cardio: 150+ min/week moderate intensity, variety (walking, cycling, swimming), 1-2 HIIT sessions
• Strength: All muscle groups 2-3x/week, 8-20 reps, bodyweight → resistance progression
• Mobility: Daily 10-15 min, dynamic pre-workout, static post-workout
• Balance: Single-leg exercises, agility drills, proprioception challenges
• Lifestyle: Sustainable activities, social fitness, seasonal variety
• Progression: Weeks 1-4 routine building, 5-8 intensity increase, 9-12 varied challenges
• Wellness: Stress reduction, sleep hygiene, active lifestyle choices
        `;
    }

    validateCompatibility(otherGoals) {
        const conflicts = [];
        const recommendations = [];
        const synergies = [];

        if (otherGoals.includes('weight_loss')) {
            synergies.push('General fitness supports sustainable weight management through lifestyle changes');
            recommendations.push('Emphasize enjoyable activities that increase daily caloric expenditure');
            recommendations.push('Focus on building habits that support long-term weight maintenance');
        }

        if (otherGoals.includes('strength')) {
            synergies.push('General fitness provides excellent foundation for strength development');
            recommendations.push('Use functional strength training as bridge to more specialized strength work');
            recommendations.push('Maintain focus on movement quality and injury prevention');
        }

        if (otherGoals.includes('flexibility')) {
            synergies.push('Flexibility is integral component of general fitness and health');
            recommendations.push('Integrate mobility work into every training session');
            recommendations.push('Use yoga and Pilates as cross-training activities');
        }

        if (otherGoals.includes('sports_performance')) {
            synergies.push('General fitness provides excellent base for sport-specific training');
            recommendations.push('Use general fitness as off-season or recovery training');
            recommendations.push('Maintain well-rounded fitness to support sport performance');
        }

        if (otherGoals.includes('endurance')) {
            synergies.push('Cardiovascular fitness is key component of general fitness');
            recommendations.push('Use endurance activities as primary cardio method');
            recommendations.push('Balance endurance training with strength and flexibility work');
        }

        return {
            compatible: true, // General fitness is compatible with all goals
            conflicts,
            recommendations,
            synergies
        };
    }

    getRecommendedDuration(userProfile) {
        const age = userProfile.age || 30;
        const fitnessLevel = userProfile.fitnessLevel || 'beginner';
        const goals = userProfile.goals || [];
        
        // General fitness benefits from longer programs for habit formation
        if (fitnessLevel === 'beginner') return 16; // Longer for habit formation and skill development
        if (age > 50) return 12; // Standard duration with focus on health
        if (goals.length > 2) return 12; // Standard for multi-goal approach
        return 8; // Shorter for maintenance or specific focus
    }

    getExercisePriorities() {
        return {
            compound: 70,    // High emphasis on compound movements
            isolation: 30,   // Moderate isolation work for balance
            functional: 85,  // Very high functional movement emphasis
            unilateral: 35,  // Moderate unilateral work for balance
            plyometric: 15,  // Light explosive work for power
            cardio: 50       // High cardio integration for health
        };
    }

    getProgressionStrategy() {
        return {
            primary: 'linear',           // Linear progression for consistency
            volumeEmphasis: 'moderate',  // Moderate volume for sustainability
            intensityEmphasis: 'moderate', // Moderate intensity for adherence
            frequencyRange: [4, 5],      // 4-5 days per week
            deloadFrequency: 6           // Every 6 weeks (less frequent due to moderate intensity)
        };
    }

    getRecoveryRequirements() {
        return {
            restBetweenSets: '60-120 seconds (comfortable recovery)',
            restBetweenSessions: '24-48 hours (allow for daily activity)',
            sleepRecommendation: '7-9 hours (essential for health and recovery)',
            activeRecoveryDays: 2,
            deloadWeekFrequency: 6
        };
    }

    /**
     * Get lifestyle integration recommendations
     * @param {Object} userProfile - User profile data
     * @returns {Object} Lifestyle integration strategies
     */
    getLifestyleIntegration(userProfile) {
        const age = userProfile.age || 30;
        const lifestyle = userProfile.lifestyle || 'general';
        
        const integrationStrategies = {
            office_worker: {
                dailyMovement: ['desk_stretches', 'walking_meetings', 'stair_climbing'],
                workoutTiming: 'morning_or_lunch_preferred',
                weekendActivities: ['hiking', 'cycling', 'sports', 'outdoor_activities'],
                stressManagement: ['yoga', 'meditation', 'nature_walks']
            },
            parent: {
                familyActivities: ['playground_workouts', 'family_bike_rides', 'active_games'],
                timeEfficient: ['home_workouts', 'bodyweight_circuits', 'short_hiit'],
                childInvolvement: ['dancing', 'martial_arts', 'swimming'],
                stressRelief: ['early_morning_walks', 'evening_yoga']
            },
            senior: {
                lowImpact: ['water_aerobics', 'tai_chi', 'gentle_yoga', 'walking'],
                balanceEmphasis: ['balance_training', 'fall_prevention', 'stability_work'],
                socialActivities: ['group_classes', 'walking_groups', 'dance_classes'],
                healthFocus: ['bone_health', 'cardiovascular_health', 'cognitive_function']
            },
            student: {
                campusActivities: ['intramural_sports', 'campus_gym', 'walking_to_class'],
                stressManagement: ['yoga', 'running', 'team_sports'],
                socialFitness: ['group_classes', 'workout_partners', 'sports_clubs'],
                budgetFriendly: ['bodyweight_workouts', 'running', 'campus_facilities']
            }
        };

        return integrationStrategies[lifestyle] || integrationStrategies.office_worker;
    }
}

module.exports = GeneralFitnessStrategy;