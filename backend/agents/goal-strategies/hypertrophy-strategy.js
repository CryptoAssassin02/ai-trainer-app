const BaseGoalStrategy = require('./base-goal-strategy');

/**
 * Hypertrophy Strategy - Focus on muscle building and size gains
 * Emphasizes volume accumulation, time under tension, and metabolic stress
 */
class HypertrophyStrategy extends BaseGoalStrategy {
    constructor() {
        super('hypertrophy');
        this.category = 'hypertrophy';
    }

    getMesocycleStructure(userProfile, totalWeeks, isPrimary = true) {
        const structures = {
            8: [
                { 
                    mesocycleNumber: 1,
                    name: "Hypertrophy Foundation", 
                    weeks: 3, 
                    focus: "volume_accumulation",
                    volumeProgression: "progressive",
                    intensityProgression: "linear",
                    emphasis: "movement_quality"
                },
                { 
                    mesocycleNumber: 2,
                    name: "Hypertrophy Intensification", 
                    weeks: 4, 
                    focus: "volume_peak",
                    volumeProgression: "high",
                    intensityProgression: "undulating",
                    emphasis: "metabolic_stress"
                },
                { 
                    mesocycleNumber: 3,
                    name: "Recovery Phase", 
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
                    name: "Anatomical Adaptation", 
                    weeks: 3, 
                    focus: "foundation",
                    volumeProgression: "progressive",
                    intensityProgression: "linear",
                    emphasis: "movement_patterns"
                },
                { 
                    mesocycleNumber: 2,
                    name: "Volume Accumulation", 
                    weeks: 4, 
                    focus: "volume_build",
                    volumeProgression: "high",
                    intensityProgression: "moderate",
                    emphasis: "mechanical_tension"
                },
                { 
                    mesocycleNumber: 3,
                    name: "Intensification Phase", 
                    weeks: 4, 
                    focus: "intensity_focus",
                    volumeProgression: "moderate",
                    intensityProgression: "high",
                    emphasis: "progressive_overload"
                },
                { 
                    mesocycleNumber: 4,
                    name: "Deload & Recovery", 
                    weeks: 1, 
                    focus: "deload",
                    volumeProgression: "low",
                    intensityProgression: "recovery",
                    emphasis: "supercompensation"
                }
            ],
            16: [
                { 
                    mesocycleNumber: 1,
                    name: "Anatomical Adaptation", 
                    weeks: 4, 
                    focus: "foundation",
                    emphasis: "movement_quality"
                },
                { 
                    mesocycleNumber: 2,
                    name: "Volume Accumulation I", 
                    weeks: 4, 
                    focus: "volume_build_1",
                    emphasis: "mechanical_tension"
                },
                { 
                    mesocycleNumber: 3,
                    name: "Volume Accumulation II", 
                    weeks: 4, 
                    focus: "volume_build_2",
                    emphasis: "metabolic_stress"
                },
                { 
                    mesocycleNumber: 4,
                    name: "Intensification", 
                    weeks: 3, 
                    focus: "intensity_focus",
                    emphasis: "progressive_overload"
                },
                { 
                    mesocycleNumber: 5,
                    name: "Deload & Assessment", 
                    weeks: 1, 
                    focus: "deload",
                    emphasis: "recovery"
                }
            ]
        };

        return structures[totalWeeks] || structures[12];
    }

    getTrainingParameters(mesocycleFocus, weekNumber) {
        const parameters = {
            foundation: {
                frequency: 4,
                intensity: "moderate (65-75% 1RM)",
                volume: "moderate (12-16 sets per muscle group/week)",
                restPeriods: "60-90 seconds",
                repRange: "8-12 reps",
                setRange: "3-4 sets",
                tempoEmphasis: "controlled (3-1-2-1)",
                exerciseSelection: "compound_and_isolation"
            },
            volume_build: {
                frequency: 5,
                intensity: "moderate (70-80% 1RM)", 
                volume: "high (16-20 sets per muscle group/week)",
                restPeriods: "60-90 seconds",
                repRange: "8-15 reps",
                setRange: "3-5 sets",
                tempoEmphasis: "controlled_eccentric (3-1-1-1)",
                exerciseSelection: "high_variety"
            },
            volume_build_1: {
                frequency: 4,
                intensity: "moderate (70-80% 1RM)",
                volume: "high (14-18 sets per muscle group/week)",
                restPeriods: "60-90 seconds",
                repRange: "8-12 reps",
                setRange: "3-4 sets",
                tempoEmphasis: "controlled (3-1-2-1)",
                exerciseSelection: "compound_primary"
            },
            volume_build_2: {
                frequency: 5,
                intensity: "moderate-high (75-85% 1RM)",
                volume: "very_high (18-22 sets per muscle group/week)",
                restPeriods: "45-75 seconds",
                repRange: "10-15 reps",
                setRange: "4-5 sets",
                tempoEmphasis: "slow_eccentric (4-1-2-1)",
                exerciseSelection: "isolation_emphasis"
            },
            volume_accumulation: {
                frequency: 4,
                intensity: "moderate (70-80% 1RM)",
                volume: "high (16-20 sets per muscle group/week)",
                restPeriods: "60-90 seconds",
                repRange: "8-12 reps",
                setRange: "4 sets",
                tempoEmphasis: "controlled",
                exerciseSelection: "balanced"
            },
            volume_peak: {
                frequency: 5,
                intensity: "moderate-high (75-85% 1RM)",
                volume: "very_high (20-24 sets per muscle group/week)",
                restPeriods: "45-75 seconds",
                repRange: "10-15 reps",
                setRange: "4-5 sets",
                tempoEmphasis: "slow_eccentric",
                exerciseSelection: "high_variety",
                intensityTechniques: ["drop_sets", "rest_pause", "supersets"]
            },
            intensity_focus: {
                frequency: 4,
                intensity: "high (80-90% 1RM)",
                volume: "moderate (12-16 sets per muscle group/week)",
                restPeriods: "90-120 seconds",
                repRange: "6-10 reps",
                setRange: "3-4 sets",
                tempoEmphasis: "explosive_concentric",
                exerciseSelection: "compound_focus"
            },
            deload: {
                frequency: 3,
                intensity: "low-moderate (60-70% 1RM)",
                volume: "low (8-10 sets per muscle group/week)",
                restPeriods: "90-120 seconds",
                repRange: "8-12 reps",
                setRange: "2-3 sets",
                tempoEmphasis: "controlled",
                exerciseSelection: "movement_practice"
            }
        };

        return parameters[mesocycleFocus] || parameters.foundation;
    }

    getPromptInstructions(context) {
        return `
## HYPERTROPHY FOCUS:
• Primary: Muscle protein synthesis via volume, mechanical tension & metabolic stress
• Frequency: 4-5 days/week, higher volume
• Exercises: 60% compound, 40% isolation, full ROM, multiple angles
• Methods: Volume overload, intensity techniques (drop sets, supersets), tempo manipulation
• Reps: 8-15 primary, 6-8 strength, 15-20 metabolic
• Rest: 60-120s (longer for compounds)
• Volume: 12-22 sets/muscle group, progressive weekly increases
• Tempo: 2-4s eccentric, 1s pause, explosive concentric
• Recovery: 24-48h between muscle groups, protein 1.6-2.2g/kg, sleep 7-9h
        `;
    }

    validateCompatibility(otherGoals) {
        const conflicts = [];
        const recommendations = [];
        const synergies = [];

        if (otherGoals.includes('weight_loss')) {
            conflicts.push('Muscle building requires caloric surplus while fat loss requires deficit');
            recommendations.push('Consider body recomposition approach with slight caloric deficit');
            recommendations.push('Prioritize protein intake and resistance training');
            recommendations.push('Accept slower muscle gain during fat loss phases');
        }

        if (otherGoals.includes('strength')) {
            synergies.push('Hypertrophy provides foundation for strength development');
            recommendations.push('Use block periodization: hypertrophy phases followed by strength phases');
            recommendations.push('Maintain some heavy lifting (6-8 reps) during hypertrophy phases');
        }

        if (otherGoals.includes('sports_performance')) {
            recommendations.push('Focus on sport-specific muscle groups and movement patterns');
            recommendations.push('Balance muscle building with functional movement quality');
        }

        if (otherGoals.includes('endurance')) {
            conflicts.push('High-volume resistance training may interfere with endurance adaptations');
            recommendations.push('Separate resistance and endurance training sessions');
            recommendations.push('Focus on muscular endurance (15-20 rep range) for compatibility');
        }

        return {
            compatible: conflicts.length <= 1,
            conflicts,
            recommendations,
            synergies
        };
    }

    getRecommendedDuration(userProfile) {
        const fitnessLevel = userProfile.fitnessLevel || 'intermediate';
        
        // Hypertrophy requires longer programs for visible results
        if (fitnessLevel === 'beginner') return 12; // Longer for beginners to see results
        if (fitnessLevel === 'intermediate') return 12; // Standard duration
        if (fitnessLevel === 'advanced') return 16; // Longer for advanced trainees
        
        return 12; // Default
    }

    getExercisePriorities() {
        return {
            compound: 60,    // Moderate emphasis on compound movements
            isolation: 40,   // High emphasis on isolation exercises
            functional: 40,  // Moderate functional movement emphasis
            unilateral: 30,  // Significant unilateral work for balance
            plyometric: 5,   // Minimal explosive work
            cardio: 15       // Light cardio for recovery
        };
    }

    getProgressionStrategy() {
        return {
            primary: 'undulating',       // Undulating periodization for variety
            volumeEmphasis: 'high',      // High volume focus
            intensityEmphasis: 'moderate', // Moderate intensity focus
            frequencyRange: [4, 5],      // 4-5 days per week
            deloadFrequency: 4           // Every 4 weeks
        };
    }

    getRecoveryRequirements() {
        return {
            restBetweenSets: '60-120 seconds (exercise dependent)',
            restBetweenSessions: '48-72 hours (same muscle groups)',
            sleepRecommendation: '7-9 hours (growth hormone optimization)',
            activeRecoveryDays: 1,
            deloadWeekFrequency: 4
        };
    }
}

module.exports = HypertrophyStrategy;