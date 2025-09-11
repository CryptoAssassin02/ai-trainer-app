const BaseGoalStrategy = require('./base-goal-strategy');

/**
 * Weight Loss Strategy - Focus on fat loss and metabolic conditioning
 * Emphasizes caloric expenditure, metabolic stress, and muscle preservation
 */
class WeightLossStrategy extends BaseGoalStrategy {
    constructor() {
        super('weight_loss');
        this.category = 'metabolic';
    }

    getMesocycleStructure(userProfile, totalWeeks, isPrimary = true) {
        const structures = {
            8: [
                { 
                    mesocycleNumber: 1,
                    name: "Metabolic Foundation", 
                    weeks: 3, 
                    focus: "fat_loss_base",
                    volumeProgression: "moderate",
                    intensityProgression: "linear",
                    emphasis: "movement_adaptation"
                },
                { 
                    mesocycleNumber: 2,
                    name: "Fat Loss Intensification", 
                    weeks: 4, 
                    focus: "metabolic_boost",
                    volumeProgression: "high",
                    intensityProgression: "undulating",
                    emphasis: "caloric_expenditure"
                },
                { 
                    mesocycleNumber: 3,
                    name: "Metabolic Maintenance", 
                    weeks: 1, 
                    focus: "deload",
                    volumeProgression: "low",
                    intensityProgression: "recovery",
                    emphasis: "recovery"
                }
            ],
            12: [
                { 
                    mesocycleNumber: 1,
                    name: "Metabolic Foundation", 
                    weeks: 4, 
                    focus: "fat_loss_base",
                    volumeProgression: "progressive",
                    intensityProgression: "linear",
                    emphasis: "aerobic_base"
                },
                { 
                    mesocycleNumber: 2,
                    name: "Fat Loss Intensification", 
                    weeks: 4, 
                    focus: "metabolic_boost",
                    volumeProgression: "high",
                    intensityProgression: "undulating",
                    emphasis: "metabolic_stress"
                },
                { 
                    mesocycleNumber: 3,
                    name: "Peak Fat Loss", 
                    weeks: 3, 
                    focus: "peak_conditioning",
                    volumeProgression: "very_high",
                    intensityProgression: "high",
                    emphasis: "maximal_expenditure"
                },
                { 
                    mesocycleNumber: 4,
                    name: "Metabolic Recovery", 
                    weeks: 1, 
                    focus: "deload",
                    volumeProgression: "low",
                    intensityProgression: "recovery",
                    emphasis: "metabolic_restoration"
                }
            ],
            16: [
                { 
                    mesocycleNumber: 1,
                    name: "Metabolic Foundation", 
                    weeks: 4, 
                    focus: "fat_loss_base",
                    emphasis: "aerobic_development"
                },
                { 
                    mesocycleNumber: 2,
                    name: "Progressive Fat Loss", 
                    weeks: 5, 
                    focus: "metabolic_boost",
                    emphasis: "progressive_conditioning"
                },
                { 
                    mesocycleNumber: 3,
                    name: "Peak Conditioning", 
                    weeks: 4, 
                    focus: "peak_conditioning",
                    emphasis: "maximal_fat_loss"
                },
                { 
                    mesocycleNumber: 4,
                    name: "Metabolic Maintenance", 
                    weeks: 3, 
                    focus: "maintenance",
                    emphasis: "sustainable_habits"
                }
            ]
        };

        return structures[totalWeeks] || structures[12];
    }

    getTrainingParameters(mesocycleFocus, weekNumber) {
        const parameters = {
            fat_loss_base: {
                frequency: 5,
                intensity: "moderate (65-75% 1RM)",
                volume: "moderate-high (12-16 sets per muscle group/week)",
                restPeriods: "45-60 seconds",
                repRange: "12-20 reps",
                setRange: "3-4 sets",
                cardioIntegration: "3x/week moderate intensity (20-30 min)",
                circuitTraining: true,
                supersets: true,
                tempoEmphasis: "controlled eccentric",
                exerciseSelection: "compound_emphasis"
            },
            metabolic_boost: {
                frequency: 6,
                intensity: "moderate-high (70-80% 1RM)", 
                volume: "high (16-20 sets per muscle group/week)",
                restPeriods: "30-45 seconds",
                repRange: "15-25 reps",
                setRange: "3-5 sets",
                cardioIntegration: "4x/week mixed intensity (HIIT + steady state)",
                circuitTraining: true,
                hiitIntegration: true,
                supersets: true,
                dropSets: true,
                tempoEmphasis: "fast_transitions",
                exerciseSelection: "full_body_circuits"
            },
            peak_conditioning: {
                frequency: 6,
                intensity: "high (75-85% 1RM)",
                volume: "very-high (20-24 sets per muscle group/week)",
                restPeriods: "30 seconds",
                repRange: "20-30 reps",
                setRange: "4-6 sets",
                cardioIntegration: "5x/week high intensity",
                circuitTraining: true,
                hiitIntegration: true,
                metabolicFinishers: true,
                complexTraining: true,
                tempoEmphasis: "explosive_movements",
                exerciseSelection: "metabolic_circuits",
                intensityTechniques: ["tabata", "emom", "amrap"]
            },
            maintenance: {
                frequency: 4,
                intensity: "moderate (60-70% 1RM)",
                volume: "moderate (10-12 sets per muscle group/week)",
                restPeriods: "60-90 seconds",
                repRange: "12-15 reps",
                setRange: "3 sets",
                cardioIntegration: "3x/week low-moderate intensity",
                activeRecovery: true,
                tempoEmphasis: "controlled",
                exerciseSelection: "sustainable_movements"
            },
            deload: {
                frequency: 3,
                intensity: "low-moderate (50-65% 1RM)",
                volume: "low (6-8 sets per muscle group/week)",
                restPeriods: "60-90 seconds",
                repRange: "10-15 reps",
                setRange: "2-3 sets",
                cardioIntegration: "2x/week light intensity",
                activeRecovery: true,
                tempoEmphasis: "relaxed",
                exerciseSelection: "movement_restoration"
            }
        };

        return parameters[mesocycleFocus] || parameters.fat_loss_base;
    }

    getPromptInstructions(context) {
        return `
## WEIGHT LOSS FOCUS:
• Primary: Maximize caloric expenditure while preserving lean muscle mass
• Frequency: 5-6 days/week, varied intensities & modalities
• Exercises: Compound movements, full-body exercises, functional patterns
• Methods: Circuit training, supersets, HIIT cardio 3-5x/week, metabolic finishers
• Reps: 12-20 primary (metabolic), 8-12 strength maintenance, 20-30 high intensity
• Rest: 30-60s (maintain elevated heart rate), active rest preferred
• Cardio: Progressive integration - Week 1-4: 3x moderate, 5-8: 4x mixed, 9-12: 5x HIIT focus
• Techniques: Drop sets, rest-pause, density training, EMOM, AMRAP circuits
• Recovery: 1-2 active recovery days, sleep 7-9h, stress management, hydration
        `;
    }

    validateCompatibility(otherGoals) {
        const conflicts = [];
        const recommendations = [];
        const synergies = [];

        if (otherGoals.includes('muscle_gain') || otherGoals.includes('hypertrophy')) {
            conflicts.push('Weight loss and muscle gain have conflicting nutritional requirements');
            recommendations.push('Consider body recomposition approach with moderate caloric deficit');
            recommendations.push('Prioritize protein intake (1.2-1.6g per kg bodyweight)');
            recommendations.push('Maintain resistance training to preserve muscle mass');
        }

        if (otherGoals.includes('strength')) {
            recommendations.push('Accept slower strength gains during fat loss phases');
            recommendations.push('Maintain strength with lower volume, higher intensity work');
            recommendations.push('Include heavy compound movements 2x per week');
        }

        if (otherGoals.includes('endurance')) {
            synergies.push('Excellent combination - both benefit from cardiovascular conditioning');
            recommendations.push('Integrate endurance training as primary cardio method');
        }

        if (otherGoals.includes('sports_performance')) {
            recommendations.push('Ensure adequate nutrition for performance and recovery');
            recommendations.push('Time fat loss phases during off-season when possible');
        }

        if (otherGoals.includes('general_fitness')) {
            synergies.push('Weight loss supports overall health and fitness goals');
            recommendations.push('Focus on sustainable lifestyle changes');
        }

        return {
            compatible: conflicts.length === 0,
            conflicts,
            recommendations,
            synergies
        };
    }

    getRecommendedDuration(userProfile) {
        // Weight loss typically requires longer programs for sustainable results
        const bmi = userProfile.weight / Math.pow(userProfile.height / 100, 2);
        const fitnessLevel = userProfile.fitnessLevel || 'intermediate';
        
        if (bmi > 30) return 16; // Longer program for significant weight loss
        if (bmi > 25) return 12; // Standard program for moderate weight loss
        if (fitnessLevel === 'beginner') return 12; // Longer for habit formation
        return 8; // Shorter program for minor fat loss or advanced trainees
    }

    getExercisePriorities() {
        return {
            compound: 70,    // High emphasis on compound movements
            isolation: 30,   // Moderate isolation work for muscle preservation
            functional: 80,  // Very high functional movement emphasis
            unilateral: 25,  // Moderate unilateral work
            plyometric: 20,  // Moderate explosive work for conditioning
            cardio: 60       // High cardio integration
        };
    }

    getProgressionStrategy() {
        return {
            primary: 'undulating',       // Varied training for adherence
            volumeEmphasis: 'high',      // High volume for caloric expenditure
            intensityEmphasis: 'moderate', // Moderate intensity for sustainability
            frequencyRange: [5, 6],      // 5-6 days per week
            deloadFrequency: 4           // Every 4 weeks
        };
    }

    getRecoveryRequirements() {
        return {
            restBetweenSets: '30-60 seconds (maintain heart rate elevation)',
            restBetweenSessions: '24-48 hours (higher frequency possible)',
            sleepRecommendation: '7-9 hours (metabolic health critical)',
            activeRecoveryDays: 2,
            deloadWeekFrequency: 4
        };
    }
}

module.exports = WeightLossStrategy;