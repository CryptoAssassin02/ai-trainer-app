# 🎯 **PHASE 1: GOAL STRATEGIES PART 3 - GENERAL FITNESS, ENDURANCE & BODY RECOMPOSITION**

This document completes the systematic implementation of fitness goal strategies, focusing on **General Fitness**, **Endurance**, and **Body Recomposition** strategies. These strategies are built using the same detailed template structure established in previous documents and incorporate 2025 industry best practices from fitness experts and researchers.

---

## 🏃 **GENERAL FITNESS STRATEGY**

### **File: `backend/agents/goal-strategies/general-fitness-strategy.js`**

```javascript
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
## GENERAL FITNESS SPECIALIZATION INSTRUCTIONS:
- **PRIMARY FOCUS**: Develop well-rounded fitness for improved health, daily function, and quality of life
- **TRAINING FREQUENCY**: 4-5 days per week with emphasis on consistency and enjoyment
- **FUNCTIONAL FITNESS EMPHASIS**:
  * Prioritize movements that improve daily life activities (squats, lunges, pushing, pulling, carrying)
  * Include multi-planar movements (forward/back, side-to-side, rotational)
  * Focus on compound exercises that work multiple muscle groups simultaneously
  * Emphasize proper movement patterns over heavy loads
- **EXERCISE SELECTION HIERARCHY**: 
  * **Foundation**: Bodyweight movements, basic strength patterns, mobility work
  * **Development**: Progressive resistance training, cardiovascular conditioning, balance training
  * **Integration**: Sport activities, group fitness, outdoor activities, skill development
  * **Maintenance**: Sustainable activities, preferred exercises, lifestyle integration
- **CARDIOVASCULAR HEALTH**:
  * Include 150+ minutes of moderate-intensity aerobic activity per week (ACSM guidelines)
  * Incorporate variety: walking, cycling, swimming, dancing, hiking, sports
  * Emphasize activities that can be sustained long-term and enjoyed
  * Include both steady-state and interval training (1-2 HIIT sessions per week)
- **STRENGTH & MUSCULAR ENDURANCE**:
  * Target all major muscle groups 2-3 times per week
  * Use rep ranges of 8-20 for functional strength and endurance
  * Progress through bodyweight → resistance bands → free weights → advanced variations
  * Include unilateral training for balance and stability
- **FLEXIBILITY & MOBILITY**:
  * Daily mobility work (10-15 minutes minimum)
  * Include both dynamic (pre-workout) and static (post-workout) stretching
  * Address common problem areas: hips, shoulders, thoracic spine, ankles
  * Integrate yoga or Pilates-style movements for mind-body connection
- **BALANCE & COORDINATION**:
  * Include single-leg exercises and unstable surface training
  * Incorporate agility drills and coordination challenges
  * Progress from static balance to dynamic balance challenges
  * Include activities that challenge proprioception and reaction time
- **LIFESTYLE INTEGRATION**:
  * Emphasize activities that can be maintained long-term
  * Include social fitness opportunities (group classes, sports, partner workouts)
  * Incorporate seasonal activities and outdoor exercise when possible
  * Focus on building sustainable habits rather than short-term intensity
- **PROGRESSION STRATEGY**:
  * Week 1-4: Establish routine, learn movement patterns, build aerobic base
  * Week 5-8: Increase intensity and complexity, add resistance training
  * Week 9-12: Integrate varied activities, challenge different fitness components
  * Week 13+: Maintain variety, focus on activities that bring joy and satisfaction
- **HEALTH & WELLNESS INTEGRATION**: 
  * Include stress-reduction activities (yoga, tai chi, nature walks)
  * Emphasize sleep hygiene and recovery practices
  * Promote active lifestyle choices (stairs vs elevators, walking meetings)
  * Address posture and ergonomics for desk workers
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
```

---

## 🏃‍♂️ **ENDURANCE STRATEGY**

### **File: `backend/agents/goal-strategies/endurance-strategy.js`**

```javascript
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
## ENDURANCE SPECIALIZATION INSTRUCTIONS:
- **PRIMARY FOCUS**: Develop aerobic capacity, cardiovascular efficiency, and endurance performance
- **TRAINING FREQUENCY**: 5-6 days per week with emphasis on aerobic base development
- **PERIODIZATION PRINCIPLES**:
  * 80/20 Rule: 80% low-intensity (Zone 1-2), 20% moderate-high intensity (Zone 3-5)
  * Base Building: 60-70% of annual training volume in aerobic base development
  * Progressive Overload: Gradual increase in training volume (10% rule)
  * Recovery Integration: Hard days hard, easy days easy principle
- **TRAINING ZONES & INTENSITIES**:
  * **Zone 1 (50-65% HRmax)**: Active recovery, very easy pace, conversational
  * **Zone 2 (65-75% HRmax)**: Aerobic base, comfortable pace, nasal breathing possible
  * **Zone 3 (75-85% HRmax)**: Tempo/threshold, comfortably hard, sustainable effort
  * **Zone 4 (85-95% HRmax)**: Lactate threshold, hard effort, race pace intervals
  * **Zone 5 (95-100% HRmax)**: VO2max, very hard, maximal sustainable power
- **AEROBIC BASE DEVELOPMENT**:
  * Prioritize Zone 2 training for mitochondrial adaptation and fat oxidation
  * Long, steady-state sessions to build aerobic enzyme systems
  * Cross-training to reduce injury risk and maintain motivation
  * Gradual volume progression with emphasis on time rather than pace
- **LACTATE THRESHOLD TRAINING**:
  * Tempo runs at comfortably hard effort (Zone 3-4)
  * Threshold intervals: 3-8 min efforts with short recovery
  * Cruise intervals: Slightly below threshold with minimal recovery
  * Focus on metabolic efficiency and lactate buffering capacity
- **VO2MAX & NEUROMUSCULAR DEVELOPMENT**:
  * High-intensity intervals: 3-8 min at 90-100% effort
  * Hill repeats for neuromuscular power and running economy
  * Track intervals for speed and anaerobic contribution
  * Limited volume (10-15% of total training) due to high stress
- **STRENGTH TRAINING INTEGRATION**:
  * 2x per week during base phase, 1x per week during intensity phase
  * Focus on functional strength, core stability, and injury prevention
  * Compound movements: squats, deadlifts, single-leg exercises
  * Plyometrics for power development and running economy
- **CROSS-TRAINING RECOMMENDATIONS**:
  * Swimming: Full-body, low-impact, excellent for recovery
  * Cycling: Leg strength, different movement pattern, weather alternative
  * Elliptical: Similar to running but reduced impact stress
  * Rowing: Upper body integration, power development
- **RECOVERY & REGENERATION**:
  * Easy days truly easy (Zone 1 only, conversational pace)
  * Include complete rest days or active recovery sessions
  * Sleep optimization (8-9 hours for endurance athletes)
  * Nutrition timing for glycogen replenishment and adaptation
  * Stress management to optimize training adaptations
- **PROGRESSION GUIDELINES**:
  * Week 1-4: Establish aerobic base with 80% easy training
  * Week 5-8: Add tempo/threshold work (1-2 sessions per week)
  * Week 9-12: Include VO2max intervals while maintaining base
  * Week 13+: Periodize intensity based on goals and competition schedule
- **INJURY PREVENTION**:
  * Gradual progression in training load (10% rule)
  * Address muscle imbalances through strength training
  * Include mobility and flexibility work daily
  * Monitor training stress and adjust based on recovery markers
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
```

---

## 🔄 **BODY RECOMPOSITION STRATEGY**

### **File: `backend/agents/goal-strategies/body-recomposition-strategy.js`**

```javascript
const BaseGoalStrategy = require('./base-goal-strategy');

/**
 * Body Recomposition Strategy - Focus on simultaneous muscle gain and fat loss
 * Emphasizes resistance training, metabolic conditioning, and precise nutrition timing
 * Based on 2025 body recomposition research and expert protocols
 */
class BodyRecompositionStrategy extends BaseGoalStrategy {
    constructor() {
        super('body_recomposition');
        this.category = 'hybrid';
    }

    getMesocycleStructure(userProfile, totalWeeks, isPrimary = true) {
        const structures = {
            8: [
                { 
                    mesocycleNumber: 1,
                    name: "Recomposition Foundation", 
                    weeks: 3, 
                    focus: "muscle_preservation",
                    volumeProgression: "progressive",
                    intensityProgression: "linear",
                    emphasis: "strength_maintenance",
                    recompComponents: ["muscle_preservation", "metabolic_flexibility", "training_adaptation"]
                },
                { 
                    mesocycleNumber: 2,
                    name: "Intensive Recomposition", 
                    weeks: 4, 
                    focus: "simultaneous_goals",
                    volumeProgression: "high",
                    intensityProgression: "undulating",
                    emphasis: "body_composition_change",
                    recompComponents: ["muscle_protein_synthesis", "fat_oxidation", "metabolic_stress"]
                },
                { 
                    mesocycleNumber: 3,
                    name: "Consolidation Phase", 
                    weeks: 1, 
                    focus: "adaptation",
                    volumeProgression: "low",
                    intensityProgression: "recovery",
                    emphasis: "metabolic_recovery",
                    recompComponents: ["hormonal_recovery", "glycogen_restoration", "adaptation_consolidation"]
                }
            ],
            12: [
                { 
                    mesocycleNumber: 1,
                    name: "Recomposition Foundation", 
                    weeks: 4, 
                    focus: "muscle_preservation",
                    volumeProgression: "progressive",
                    intensityProgression: "linear",
                    emphasis: "strength_base",
                    recompComponents: ["neuromuscular_adaptation", "metabolic_flexibility", "work_capacity"]
                },
                { 
                    mesocycleNumber: 2,
                    name: "Muscle Building Emphasis", 
                    weeks: 4, 
                    focus: "hypertrophy_priority",
                    volumeProgression: "high",
                    intensityProgression: "moderate",
                    emphasis: "muscle_growth",
                    recompComponents: ["muscle_protein_synthesis", "anabolic_signaling", "volume_accumulation"]
                },
                { 
                    mesocycleNumber: 3,
                    name: "Fat Loss Emphasis", 
                    weeks: 3, 
                    focus: "fat_loss_priority",
                    volumeProgression: "moderate",
                    intensityProgression: "high",
                    emphasis: "metabolic_conditioning",
                    recompComponents: ["fat_oxidation", "metabolic_rate", "caloric_expenditure"]
                },
                { 
                    mesocycleNumber: 4,
                    name: "Integration & Recovery", 
                    weeks: 1, 
                    focus: "integration",
                    volumeProgression: "low",
                    intensityProgression: "recovery",
                    emphasis: "adaptation_integration",
                    recompComponents: ["hormonal_balance", "metabolic_recovery", "progress_assessment"]
                }
            ],
            16: [
                { 
                    mesocycleNumber: 1,
                    name: "Metabolic Preparation", 
                    weeks: 4, 
                    focus: "metabolic_flexibility",
                    emphasis: "baseline_establishment",
                    recompComponents: ["insulin_sensitivity", "metabolic_adaptation", "training_capacity"]
                },
                { 
                    mesocycleNumber: 2,
                    name: "Muscle Building Phase", 
                    weeks: 5, 
                    focus: "hypertrophy_focus",
                    emphasis: "anabolic_emphasis",
                    recompComponents: ["muscle_protein_synthesis", "strength_gains", "lean_mass_accrual"]
                },
                { 
                    mesocycleNumber: 3,
                    name: "Recomposition Intensification", 
                    weeks: 4, 
                    focus: "simultaneous_goals",
                    emphasis: "body_composition_optimization",
                    recompComponents: ["concurrent_adaptations", "metabolic_efficiency", "body_composition"]
                },
                { 
                    mesocycleNumber: 4,
                    name: "Fat Loss Finalization", 
                    weeks: 2, 
                    focus: "fat_loss_priority",
                    emphasis: "final_cut",
                    recompComponents: ["stubborn_fat_loss", "muscle_preservation", "metabolic_rate"]
                },
                { 
                    mesocycleNumber: 5,
                    name: "Maintenance Integration", 
                    weeks: 1, 
                    focus: "maintenance",
                    emphasis: "sustainable_habits",
                    recompComponents: ["metabolic_restoration", "habit_formation", "long_term_success"]
                }
            ]
        };

        return structures[totalWeeks] || structures[12];
    }

    getTrainingParameters(mesocycleFocus, weekNumber) {
        const parameters = {
            muscle_preservation: {
                frequency: 4,
                intensity: "moderate-high (70-85% 1RM)",
                volume: "moderate (10-14 sets per muscle group/week)",
                restPeriods: "90-120 seconds",
                repRange: "6-12 reps",
                setRange: "3-4 sets",
                strengthEmphasis: true,
                compoundMovements: true,
                progressiveOverload: true,
                tempoEmphasis: "controlled",
                exerciseSelection: "strength_focused",
                cardioIntegration: "2-3x/week moderate",
                metabolicWork: "minimal",
                nutritionTiming: "protein_emphasis"
            },
            metabolic_flexibility: {
                frequency: 5,
                intensity: "moderate (65-80% 1RM)",
                volume: "moderate-high (12-16 sets per muscle group/week)",
                restPeriods: "60-90 seconds",
                repRange: "8-15 reps",
                setRange: "3-4 sets",
                metabolicEmphasis: true,
                circuitTraining: true,
                supersets: true,
                tempoEmphasis: "moderate",
                exerciseSelection: "hybrid_training",
                cardioIntegration: "3-4x/week varied",
                hiitIntegration: "2x/week",
                nutritionTiming: "carb_cycling"
            },
            hypertrophy_priority: {
                frequency: 5,
                intensity: "moderate (70-80% 1RM)",
                volume: "high (16-20 sets per muscle group/week)",
                restPeriods: "90-120 seconds",
                repRange: "8-15 reps",
                setRange: "4-5 sets",
                hypertrophyEmphasis: true,
                volumeAccumulation: true,
                mechanicalTension: true,
                tempoEmphasis: "controlled_eccentric",
                exerciseSelection: "hypertrophy_focused",
                cardioIntegration: "2-3x/week low-moderate",
                metabolicWork: "moderate",
                nutritionTiming: "anabolic_windows"
            },
            hypertrophy_focus: {
                frequency: 5,
                intensity: "moderate-high (75-85% 1RM)",
                volume: "very_high (18-22 sets per muscle group/week)",
                restPeriods: "90-150 seconds",
                repRange: "6-12 reps",
                setRange: "4-6 sets",
                hypertrophyMaximization: true,
                intensityTechniques: ["drop_sets", "rest_pause", "cluster_sets"],
                timeUnderTension: "emphasized",
                tempoEmphasis: "slow_eccentric",
                exerciseSelection: "muscle_building",
                cardioIntegration: "2x/week recovery_pace",
                metabolicWork: "minimal",
                nutritionTiming: "surplus_periods"
            },
            simultaneous_goals: {
                frequency: 6,
                intensity: "moderate-high (70-85% 1RM)",
                volume: "high (14-18 sets per muscle group/week)",
                restPeriods: "60-90 seconds",
                repRange: "8-15 reps",
                setRange: "3-5 sets",
                hybridApproach: true,
                strengthAndConditioningBalance: true,
                metabolicStress: true,
                tempoEmphasis: "varied",
                exerciseSelection: "recomposition_optimal",
                cardioIntegration: "4x/week mixed_intensity",
                hiitIntegration: "3x/week",
                nutritionTiming: "precise_timing"
            },
            fat_loss_priority: {
                frequency: 6,
                intensity: "moderate-high (70-85% 1RM)",
                volume: "moderate-high (12-16 sets per muscle group/week)",
                restPeriods: "45-75 seconds",
                repRange: "10-20 reps",
                setRange: "3-5 sets",
                metabolicEmphasis: true,
                calorieExpenditure: "maximized",
                musclePreservation: "critical",
                tempoEmphasis: "fast_transitions",
                exerciseSelection: "metabolic_circuits",
                cardioIntegration: "5-6x/week high_intensity",
                hiitIntegration: "4x/week",
                nutritionTiming: "deficit_management"
            },
            integration: {
                frequency: 4,
                intensity: "moderate (65-75% 1RM)",
                volume: "moderate (10-14 sets per muscle group/week)",
                restPeriods: "90-120 seconds",
                repRange: "8-12 reps",
                setRange: "3-4 sets",
                balancedApproach: true,
                sustainabilityFocus: true,
                habitFormation: true,
                tempoEmphasis: "natural",
                exerciseSelection: "sustainable_methods",
                cardioIntegration: "3-4x/week enjoyable",
                metabolicWork: "moderate",
                nutritionTiming: "flexible_adherence"
            },
            maintenance: {
                frequency: 4,
                intensity: "moderate (65-80% 1RM)",
                volume: "moderate (10-12 sets per muscle group/week)",
                restPeriods: "90-120 seconds",
                repRange: "8-15 reps",
                setRange: "3 sets",
                maintenanceMode: true,
                lifestyleFocus: true,
                longTermAdherence: true,
                tempoEmphasis: "comfortable",
                exerciseSelection: "preferred_exercises",
                cardioIntegration: "3x/week preferred_activities",
                metabolicWork: "lifestyle_based",
                nutritionTiming: "intuitive_eating"
            }
        };

        return parameters[mesocycleFocus] || parameters.muscle_preservation;
    }

    getPromptInstructions(context) {
        return `
## BODY RECOMPOSITION SPECIALIZATION INSTRUCTIONS:
- **PRIMARY FOCUS**: Simultaneously build muscle and lose fat through strategic training and nutrition timing
- **TRAINING FREQUENCY**: 5-6 days per week with balanced resistance and metabolic training
- **RECOMPOSITION PRINCIPLES**:
  * Maintain strength training as foundation for muscle preservation and growth
  * Integrate metabolic conditioning to enhance fat oxidation and caloric expenditure
  * Use periodized approach alternating between muscle-building and fat-loss emphasis
  * Precise nutrition timing to support both anabolic and catabolic processes
- **RESISTANCE TRAINING EMPHASIS**:
  * Prioritize compound movements for maximum muscle recruitment and metabolic impact
  * Use moderate to high intensity (70-85% 1RM) to maintain strength and muscle mass
  * Employ various rep ranges: 6-8 (strength), 8-12 (hypertrophy), 12-20 (metabolic)
  * Include intensity techniques: supersets, drop sets, rest-pause, circuits
- **METABOLIC CONDITIONING INTEGRATION**:
  * High-Intensity Interval Training (HIIT) 3-4x per week for fat oxidation
  * Circuit training combining resistance and cardiovascular elements
  * Metabolic finishers to increase post-exercise oxygen consumption (EPOC)
  * Varied cardio modalities to prevent adaptation and maintain motivation
- **PERIODIZATION STRATEGY**:
  * **Phase 1**: Muscle preservation with moderate caloric deficit
  * **Phase 2**: Hypertrophy emphasis with controlled caloric intake
  * **Phase 3**: Fat loss priority with aggressive metabolic training
  * **Phase 4**: Integration phase balancing both goals simultaneously
- **TRAINING METHODS FOR RECOMPOSITION**:
  * **Concurrent Training**: Resistance + cardio in same session (strength first)
  * **Contrast Training**: Alternate between strength and metabolic blocks
  * **Circuit Training**: Resistance exercises with minimal rest for metabolic stress
  * **Density Training**: Increase work capacity by reducing rest periods progressively
- **EXERCISE SELECTION PRIORITIES**:
  * **Compound Movements (70%)**: Squats, deadlifts, presses, rows, pull-ups
  * **Isolation Work (30%)**: Target specific muscles and address imbalances
  * **Functional Patterns**: Movements that enhance daily life and athletic performance
  * **Metabolic Exercises**: Burpees, thrusters, kettlebell swings, battle ropes
- **INTENSITY TECHNIQUES FOR RECOMPOSITION**:
  * **Supersets**: Opposing muscle groups or upper/lower body combinations
  * **Drop Sets**: Extend sets beyond failure for metabolic stress
  * **Rest-Pause**: Brief rest to extend sets and increase volume
  * **Cluster Sets**: Break heavy sets into mini-sets with short rests
  * **Mechanical Drop Sets**: Change exercise angle/grip to continue set
- **CARDIOVASCULAR INTEGRATION**:
  * **HIIT Sessions**: 15-25 minutes, 3-4x per week for fat oxidation
  * **LISS Cardio**: 20-40 minutes, 2-3x per week for recovery and base fitness
  * **Metabolic Circuits**: Resistance exercises performed circuit-style
  * **Active Recovery**: Light cardio on rest days to enhance recovery
- **PROGRESSION STRATEGIES**:
  * **Volume Progression**: Gradually increase sets, reps, or training frequency
  * **Intensity Progression**: Increase weight, reduce rest, or add intensity techniques
  * **Density Progression**: More work in same time or same work in less time
  * **Complexity Progression**: Add unstable surfaces, unilateral work, or skill components
- **MUSCLE PRESERVATION PROTOCOLS**:
  * Maintain strength training intensity even in caloric deficit
  * Adequate protein intake (1.6-2.2g per kg bodyweight)
  * Strategic refeed days to support hormonal health
  * Sufficient sleep (7-9 hours) for recovery and hormone optimization
- **FAT LOSS OPTIMIZATION**:
  * Create moderate caloric deficit (300-500 calories) through training and nutrition
  * Emphasize post-exercise oxygen consumption (EPOC) through intense training
  * Include fasted cardio strategically for enhanced fat oxidation
  * Monitor body composition changes rather than just scale weight
- **RECOVERY & ADAPTATION**:
  * Include deload weeks every 3-4 weeks due to high training stress
  * Monitor recovery markers: sleep quality, resting heart rate, subjective wellness
  * Adjust training volume and intensity based on progress and recovery
  * Include stress management techniques for optimal hormonal environment
        `;
    }

    validateCompatibility(otherGoals) {
        const conflicts = [];
        const recommendations = [];
        const synergies = [];

        if (otherGoals.includes('strength')) {
            synergies.push('Strength training is fundamental component of body recomposition');
            recommendations.push('Use strength training as foundation with added metabolic work');
            recommendations.push('Maintain heavy compound movements throughout all phases');
        }

        if (otherGoals.includes('hypertrophy')) {
            synergies.push('Muscle building supports body recomposition goals');
            recommendations.push('Alternate between hypertrophy and fat loss emphasis phases');
            recommendations.push('Use higher volume during muscle-building phases');
        }

        if (otherGoals.includes('weight_loss')) {
            synergies.push('Fat loss is integral part of body recomposition');
            recommendations.push('Focus on preserving muscle mass during fat loss phases');
            recommendations.push('Use resistance training to maintain metabolic rate');
        }

        if (otherGoals.includes('endurance')) {
            recommendations.push('Use endurance training strategically for fat loss phases');
            recommendations.push('Balance endurance volume with muscle preservation needs');
            recommendations.push('Separate endurance and strength training when possible');
        }

        if (otherGoals.includes('general_fitness')) {
            synergies.push('Body recomposition improves overall fitness and health markers');
            recommendations.push('Use varied training methods to maintain motivation');
            recommendations.push('Include functional movements for daily life improvement');
        }

        return {
            compatible: true, // Body recomposition can integrate with most goals
            conflicts,
            recommendations,
            synergies
        };
    }

    getRecommendedDuration(userProfile) {
        const bodyFat = userProfile.bodyFatPercentage || 20;
        const fitnessLevel = userProfile.fitnessLevel || 'intermediate';
        const goals = userProfile.goals || [];
        
        // Body recomposition requires longer programs for significant changes
        if (bodyFat > 25 || fitnessLevel === 'beginner') return 16; // Longer for significant changes
        if (bodyFat > 15 && bodyFat <= 25) return 12; // Standard recomposition duration
        if (bodyFat <= 15) return 8; // Shorter for fine-tuning body composition
        
        return 12; // Default
    }

    getExercisePriorities() {
        return {
            compound: 70,    // High emphasis on compound movements
            isolation: 30,   // Moderate isolation work for muscle development
            functional: 75,  // High functional movement emphasis
            unilateral: 30,  // Moderate unilateral work for balance
            plyometric: 20,  // Moderate explosive work for metabolic benefit
            cardio: 60       // High cardio integration for fat loss
        };
    }

    getProgressionStrategy() {
        return {
            primary: 'undulating',       // Undulating periodization for varied stimulus
            volumeEmphasis: 'high',      // High volume for both muscle and metabolic stress
            intensityEmphasis: 'moderate', // Moderate intensity for sustainability
            frequencyRange: [5, 6],      // 5-6 days per week
            deloadFrequency: 3           // Every 3 weeks due to high training stress
        };
    }

    getRecoveryRequirements() {
        return {
            restBetweenSets: '45-120 seconds (exercise and phase dependent)',
            restBetweenSessions: '24-48 hours (muscle group dependent)',
            sleepRecommendation: '7-9 hours (critical for body composition changes)',
            activeRecoveryDays: 1,
            deloadWeekFrequency: 3
        };
    }

    /**
     * Get nutrition timing recommendations for body recomposition
     * @param {string} phase - Current training phase
     * @returns {Object} Nutrition timing strategies
     */
    getNutritionTiming(phase = 'simultaneous_goals') {
        const nutritionStrategies = {
            muscle_preservation: {
                approach: 'moderate_deficit',
                calorieAdjustment: '-300 to -500 calories',
                proteinTiming: 'every_3_4_hours',
                preWorkout: 'protein + small_carbs',
                postWorkout: 'protein + carbs_within_30min',
                carbCycling: false,
                refeedFrequency: 'weekly'
            },
            hypertrophy_priority: {
                approach: 'slight_surplus_or_maintenance',
                calorieAdjustment: '0 to +200 calories',
                proteinTiming: 'every_3_hours',
                preWorkout: 'carbs + protein_1_2hrs_before',
                postWorkout: 'protein + carbs_immediately',
                carbCycling: false,
                refeedFrequency: 'not_needed'
            },
            fat_loss_priority: {
                approach: 'aggressive_deficit',
                calorieAdjustment: '-500 to -750 calories',
                proteinTiming: 'every_meal_high_protein',
                preWorkout: 'fasted_or_minimal_carbs',
                postWorkout: 'protein_priority_delayed_carbs',
                carbCycling: true,
                refeedFrequency: 'bi_weekly'
            },
            simultaneous_goals: {
                approach: 'calorie_and_carb_cycling',
                calorieAdjustment: 'varies_by_day',
                proteinTiming: 'consistent_high_intake',
                preWorkout: 'depends_on_training_type',
                postWorkout: 'protein_always_carbs_if_strength',
                carbCycling: true,
                refeedFrequency: 'weekly'
            }
        };

        return nutritionStrategies[phase] || nutritionStrategies.simultaneous_goals;
    }

    /**
     * Get body composition monitoring recommendations
     * @returns {Object} Monitoring strategies and metrics
     */
    getProgressMonitoring() {
        return {
            primaryMetrics: {
                bodyComposition: {
                    method: 'DEXA_scan_or_BodPod',
                    frequency: 'every_4_6_weeks',
                    importance: 'primary_indicator'
                },
                circumferenceMeasurements: {
                    locations: ['waist', 'hips', 'chest', 'arms', 'thighs'],
                    frequency: 'bi_weekly',
                    importance: 'progress_tracking'
                },
                progressPhotos: {
                    angles: ['front', 'side', 'back'],
                    frequency: 'weekly',
                    importance: 'visual_progress'
                },
                performanceMetrics: {
                    measurements: ['strength_levels', 'endurance_capacity', 'recovery_rate'],
                    frequency: 'weekly',
                    importance: 'functional_improvement'
                }
            },
            secondaryMetrics: {
                scaleWeight: {
                    frequency: 'daily_same_conditions',
                    importance: 'trend_monitoring',
                    note: 'less_important_than_composition'
                },
                biomarkers: {
                    tests: ['metabolic_panel', 'hormone_levels', 'inflammation_markers'],
                    frequency: 'every_8_12_weeks',
                    importance: 'health_optimization'
                }
            },
            adjustmentTriggers: {
                plateau: 'no_change_for_3_weeks',
                excessiveFatigue: 'decrease_volume_or_deficit',
                rapidMuscleGain: 'continue_current_approach',
                rapidFatLoss: 'may_need_diet_break'
            }
        };
    }
}

module.exports = BodyRecompositionStrategy;
```

---

## 📊 **STRATEGY COMPARISON SUMMARY**

| Strategy | Primary Focus | Frequency | Duration | Key Methods |
|----------|---------------|-----------|----------|-------------|
| **General Fitness** | Overall health, balanced fitness | 4-5 days/week | 12-16 weeks | Functional training, variety, lifestyle integration |
| **Endurance** | Cardiovascular fitness, aerobic capacity | 5-6 days/week | 12-16 weeks | Zone training, base building, lactate threshold |
| **Body Recomposition** | Simultaneous muscle gain & fat loss | 5-6 days/week | 12-16 weeks | Hybrid training, metabolic conditioning, precise timing |

---

## 🎯 **INTEGRATION NOTES**

All three strategies are designed to:
- **Complement existing strategies** from previous documents
- **Follow the established template** with all required methods implemented
- **Incorporate 2025 industry best practices** from fitness experts and researchers
- **Support multi-goal orchestration** through comprehensive compatibility validation
- **Provide specialized approaches** for unique fitness goals

### 🏃 **COMPLETE STRATEGY COVERAGE (100% Complete)**
**All 8 Fitness Goal Strategies Now Implemented:**
- ✅ **Base Goal Strategy Class** (Foundation)
- ✅ **Strength Strategy** (Maximal strength development)
- ✅ **Hypertrophy Strategy** (Muscle building focus)
- ✅ **Weight Loss Strategy** (Fat loss and metabolic conditioning)
- ✅ **Sports Performance Strategy** (Athletic excellence with 9 sports covered)
- ✅ **Flexibility Strategy** (Mobility and movement quality)
- ✅ **General Fitness Strategy** (Overall health and balanced fitness)
- ✅ **Endurance Strategy** (Cardiovascular fitness and aerobic capacity)
- ✅ **Body Recomposition Strategy** (Simultaneous muscle gain and fat loss)

### 📚 **2025 EXPERT RESEARCH INTEGRATION**
**Each strategy incorporates:**
- **General Fitness**: ACSM guidelines, functional fitness trends, HIIT integration
- **Endurance**: 80/20 training principle, zone-based periodization, concurrent training research
- **Body Recomposition**: Simultaneous adaptation protocols, metabolic flexibility, precision nutrition timing

### 🔄 **MULTI-GOAL ORCHESTRATION READY**
**All strategies include:**
- Comprehensive compatibility validation with synergies and conflicts identified
- Detailed recommendations for goal combinations
- Flexible periodization that adapts to multi-goal scenarios
- Recovery and progression strategies that account for training complexity

**The complete 8-strategy implementation is now ready for integration into the WorkoutGenerationAgent and multi-goal orchestrator system.**
