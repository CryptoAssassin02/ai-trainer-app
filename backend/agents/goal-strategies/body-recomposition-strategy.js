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
## BODY RECOMPOSITION FOCUS:
• Primary: Simultaneously build muscle & lose fat via strategic training
• Frequency: 5-6 days/week, balanced resistance & metabolic training
• Methods: Concurrent training (resistance + cardio), supersets, circuits, HIIT 3-4x/week
• Exercises: 70% compound movements, 30% isolation, metabolic exercises
• Reps: 6-8 strength, 8-12 hypertrophy, 12-20 metabolic
• Techniques: Drop sets, rest-pause, density training, metabolic finishers
• Periodization: Phase 1 muscle preservation, Phase 2 hypertrophy, Phase 3 fat loss, Phase 4 integration
• Cardio: HIIT 15-25 min, LISS 20-40 min, metabolic circuits
• Recovery: Deload every 3-4 weeks, protein 1.6-2.2g/kg, sleep 7-9h, stress management
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