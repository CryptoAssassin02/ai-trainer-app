const BaseGoalStrategy = require('./base-goal-strategy');

/**
 * Strength Strategy - Focus on maximal strength development
 * Emphasizes progressive overload, compound movements, and neural adaptations
 */
class StrengthStrategy extends BaseGoalStrategy {
    constructor() {
        super('strength');
        this.category = 'strength';
    }

    getMesocycleStructure(userProfile, totalWeeks, isPrimary = true) {
        const structures = {
            8: [
                { 
                    mesocycleNumber: 1,
                    name: "Strength Foundation", 
                    weeks: 3, 
                    focus: "strength_base",
                    volumeProgression: "moderate",
                    intensityProgression: "linear",
                    emphasis: "movement_patterns"
                },
                { 
                    mesocycleNumber: 2,
                    name: "Strength Development", 
                    weeks: 4, 
                    focus: "strength_build",
                    volumeProgression: "moderate",
                    intensityProgression: "step",
                    emphasis: "load_progression"
                },
                { 
                    mesocycleNumber: 3,
                    name: "Strength Deload", 
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
                    focus: "strength_foundation",
                    volumeProgression: "progressive",
                    intensityProgression: "linear",
                    emphasis: "movement_quality"
                },
                { 
                    mesocycleNumber: 2,
                    name: "Strength Development", 
                    weeks: 4, 
                    focus: "strength_build",
                    volumeProgression: "moderate",
                    intensityProgression: "step",
                    emphasis: "progressive_overload"
                },
                { 
                    mesocycleNumber: 3,
                    name: "Strength Intensification", 
                    weeks: 4, 
                    focus: "strength_peak",
                    volumeProgression: "low",
                    intensityProgression: "high",
                    emphasis: "maximal_strength"
                },
                { 
                    mesocycleNumber: 4,
                    name: "Recovery & Test", 
                    weeks: 1, 
                    focus: "deload",
                    volumeProgression: "very_low",
                    intensityProgression: "recovery",
                    emphasis: "testing"
                }
            ],
            16: [
                { 
                    mesocycleNumber: 1,
                    name: "Anatomical Adaptation", 
                    weeks: 4, 
                    focus: "strength_foundation",
                    emphasis: "movement_patterns"
                },
                { 
                    mesocycleNumber: 2,
                    name: "Hypertrophy Phase", 
                    weeks: 4, 
                    focus: "muscle_building",
                    emphasis: "volume_accumulation"
                },
                { 
                    mesocycleNumber: 3,
                    name: "Strength Development", 
                    weeks: 4, 
                    focus: "strength_build",
                    emphasis: "progressive_overload"
                },
                { 
                    mesocycleNumber: 4,
                    name: "Strength Intensification", 
                    weeks: 3, 
                    focus: "strength_peak",
                    emphasis: "maximal_strength"
                },
                { 
                    mesocycleNumber: 5,
                    name: "Peak & Recovery", 
                    weeks: 1, 
                    focus: "peak",
                    emphasis: "testing"
                }
            ]
        };

        return structures[totalWeeks] || structures[12];
    }

    getTrainingParameters(mesocycleFocus, weekNumber) {
        const parameters = {
            strength_foundation: {
                frequency: 3,
                intensity: "moderate (65-80% 1RM)",
                volume: "moderate (10-14 sets per muscle group/week)",
                restPeriods: "90-120 seconds",
                repRange: "6-10 reps",
                setRange: "3-4 sets",
                tempoEmphasis: "controlled",
                exerciseSelection: "compound_focus"
            },
            strength_build: {
                frequency: 4,
                intensity: "moderate-high (75-85% 1RM)", 
                volume: "moderate (8-12 sets per muscle group/week)",
                restPeriods: "120-180 seconds",
                repRange: "3-6 reps",
                setRange: "4-5 sets",
                tempoEmphasis: "explosive_concentric",
                exerciseSelection: "compound_primary"
            },
            strength_peak: {
                frequency: 4,
                intensity: "high (85-95% 1RM)",
                volume: "low (6-10 sets per muscle group/week)",
                restPeriods: "180-300 seconds",
                repRange: "1-3 reps",
                setRange: "5-6 sets",
                tempoEmphasis: "maximal_intent",
                exerciseSelection: "competition_lifts"
            },
            muscle_building: {
                frequency: 4,
                intensity: "moderate (70-80% 1RM)",
                volume: "high (14-18 sets per muscle group/week)",
                restPeriods: "90-120 seconds",
                repRange: "8-12 reps",
                setRange: "3-4 sets",
                tempoEmphasis: "controlled_eccentric",
                exerciseSelection: "compound_and_isolation"
            },
            deload: {
                frequency: 3,
                intensity: "low-moderate (50-70% 1RM)",
                volume: "low (6-8 sets per muscle group/week)",
                restPeriods: "90-120 seconds",
                repRange: "6-8 reps",
                setRange: "2-3 sets",
                tempoEmphasis: "controlled",
                exerciseSelection: "movement_practice"
            }
        };

        return parameters[mesocycleFocus] || parameters.strength_foundation;
    }

    getPromptInstructions(context) {
        return `
## STRENGTH FOCUS:
• Primary: Maximal strength via progressive overload & neural adaptations
• Frequency: 3-4 days/week, adequate recovery
• Exercises: Compound movements priority (squat, deadlift, bench, press, row), 20-30% isolation
• Methods: Progressive overload, linear periodization, cluster sets for heavy loads
• Reps: 1-10 range (1-3 intensification, 3-6 development, 6-10 foundation)
• Rest: 90-300s (longer for heavier loads)
• Progression: 2.5-5% weekly increases, deload week 4
• Recovery: 48-72h between patterns, sleep 8+ hours
        `;
    }

    validateCompatibility(otherGoals) {
        const conflicts = [];
        const recommendations = [];
        const synergies = [];

        if (otherGoals.includes('weight_loss')) {
            conflicts.push('Strength gains may be limited in caloric deficit');
            recommendations.push('Maintain strength with lower volume during fat loss phases');
            recommendations.push('Prioritize protein intake (1.6-2.2g per kg bodyweight)');
        }

        if (otherGoals.includes('hypertrophy') || otherGoals.includes('muscle_gain')) {
            synergies.push('Strength and hypertrophy are highly complementary');
            recommendations.push('Use periodized approach: hypertrophy blocks followed by strength blocks');
        }

        if (otherGoals.includes('sports_performance')) {
            synergies.push('Strength is foundational for most athletic performance');
            recommendations.push('Focus on movement patterns specific to sport demands');
        }

        if (otherGoals.includes('endurance')) {
            conflicts.push('High-volume endurance training may interfere with strength adaptations');
            recommendations.push('Separate strength and endurance sessions by 6+ hours when possible');
            recommendations.push('Prioritize strength training when both are scheduled same day');
        }

        return {
            compatible: conflicts.length <= 1, // Allow minor conflicts
            conflicts,
            recommendations,
            synergies
        };
    }

    getRecommendedDuration(userProfile) {
        const fitnessLevel = userProfile.fitnessLevel || 'intermediate';
        
        if (fitnessLevel === 'beginner') return 8;  // Shorter for movement learning
        if (fitnessLevel === 'intermediate') return 12; // Standard progression
        if (fitnessLevel === 'advanced') return 16; // Longer for advanced adaptations
        
        return 12; // Default
    }

    getExercisePriorities() {
        return {
            compound: 80,    // Heavy emphasis on compound movements
            isolation: 20,   // Minimal isolation work
            functional: 70,  // High functional movement emphasis
            unilateral: 15,  // Some unilateral work for balance
            plyometric: 5,   // Minimal explosive work
            cardio: 10       // Minimal cardio integration
        };
    }

    getProgressionStrategy() {
        return {
            primary: 'linear',           // Linear progression with step loading
            volumeEmphasis: 'moderate',  // Moderate volume focus
            intensityEmphasis: 'high',   // High intensity focus
            frequencyRange: [3, 4],      // 3-4 days per week
            deloadFrequency: 4           // Every 4 weeks
        };
    }

    getRecoveryRequirements() {
        return {
            restBetweenSets: '120-300 seconds (load dependent)',
            restBetweenSessions: '48-72 hours (same movement patterns)',
            sleepRecommendation: '8+ hours (neural recovery critical)',
            activeRecoveryDays: 1,
            deloadWeekFrequency: 4
        };
    }
}

module.exports = StrengthStrategy;