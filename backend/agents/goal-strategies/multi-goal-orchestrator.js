/**
 * Multi-Goal Orchestrator - Coordinates multiple fitness goals into cohesive programs
 * Integrates with existing goal strategies to create balanced, effective workout plans
 */
class MultiGoalOrchestrator {
    constructor() {
        this.goalStrategies = new Map();
        this.maxGoals = 3; // Maximum goals allowed per user
        this.compatibilityMatrix = this.buildCompatibilityMatrix();
        this.supportedGoals = [
            'strength', 'hypertrophy', 'muscle_gain', 'weight_loss', 'sports_performance', 
            'flexibility', 'general_fitness', 'endurance', 'body_recomposition'
        ];
    }

    registerStrategy(goalName, strategy) {
        this.goalStrategies.set(goalName, strategy);
    }

    /**
     * Orchestrate multiple goals (up to 3) into cohesive program
     * @param {string[]} selectedGoals - User's selected goals
     * @param {Object} userProfile - User profile data
     * @param {number} totalWeeks - Program duration
     * @returns {Object} Orchestrated program structure
     */
    orchestrateGoals(selectedGoals, userProfile, totalWeeks) {
        // Validate goal count
        if (selectedGoals.length > this.maxGoals) {
            throw new Error(`Maximum ${this.maxGoals} goals allowed, received ${selectedGoals.length}`);
        }
        
        // Step 1: Validate and prioritize goals
        const { primaryGoal, secondaryGoals, compatibility } = this.prioritizeGoals(selectedGoals);
        
        // Step 2: Determine optimal program duration based on goal combination
        const optimalDuration = this.determineOptimalDuration(selectedGoals, userProfile, totalWeeks);
        
        // Step 3: Get base structure from primary goal
        const primaryStrategy = this.goalStrategies.get(primaryGoal);
        const baseStructure = primaryStrategy.getMesocycleStructure(userProfile, optimalDuration, true);
        
        // Step 4: Integrate secondary goals
        const integratedStructure = this.integrateSecondaryGoals(
            baseStructure, 
            secondaryGoals, 
            userProfile, 
            optimalDuration
        );
        
        // Step 5: Create hybrid training parameters
        const hybridParameters = this.createHybridParameters(
            selectedGoals, 
            integratedStructure
        );
        
        // Step 6: Calculate weighted exercise priorities
        const exercisePriorities = this.calculateWeightedExercisePriorities(selectedGoals);
        
        // Step 7: Determine progression strategy
        const progressionStrategy = this.determineProgressionStrategy(selectedGoals);
        
        // Step 8: Calculate recovery requirements
        const recoveryRequirements = this.calculateRecoveryRequirements(selectedGoals);
        
        // Step 9: Generate combined prompt instructions
        const combinedInstructions = this.generateCombinedInstructions(selectedGoals);
        
        return {
            programStructure: integratedStructure,
            trainingParameters: hybridParameters,
            exercisePriorities: exercisePriorities,
            progressionStrategy: progressionStrategy,
            recoveryRequirements: recoveryRequirements,
            goalPriority: { primary: primaryGoal, secondary: secondaryGoals },
            compatibility: compatibility,
            promptInstructions: combinedInstructions,
            recommendations: this.generateRecommendations(selectedGoals, compatibility),
            programDuration: optimalDuration
        };
    }

    prioritizeGoals(selectedGoals) {
        // Validate all goals are supported
        const validGoals = selectedGoals.filter(goal => this.supportedGoals.includes(goal));
        if (validGoals.length !== selectedGoals.length) {
            throw new Error(`Unsupported goals: ${selectedGoals.filter(g => !this.supportedGoals.includes(g))}`);
        }
        
        // First goal is primary, rest are secondary (max 2 secondary)
        const primaryGoal = validGoals[0];
        const secondaryGoals = validGoals.slice(1, 3); // Limit to 2 secondary goals (3 total max)
        
        // Validate compatibility using each strategy's detailed analysis
        const compatibility = this.validateGoalCompatibility(validGoals);
        
        return { primaryGoal, secondaryGoals, compatibility };
    }

    validateGoalCompatibility(selectedGoals) {
        const allConflicts = [];
        const allRecommendations = [];
        const allSynergies = [];
        let overallCompatible = true;
        
        // Check each goal against others using strategy's validateCompatibility method
        for (let i = 0; i < selectedGoals.length; i++) {
            const currentGoal = selectedGoals[i];
            const otherGoals = selectedGoals.filter((_, index) => index !== i);
            const strategy = this.goalStrategies.get(currentGoal);
            
            if (strategy) {
                const validation = strategy.validateCompatibility(otherGoals);
                
                // Collect detailed compatibility data
                if (validation.conflicts && validation.conflicts.length > 0) {
                    allConflicts.push(...validation.conflicts.map(c => `${currentGoal}: ${c}`));
                    overallCompatible = false;
                }
                
                if (validation.recommendations) {
                    allRecommendations.push(...validation.recommendations.map(r => `${currentGoal}: ${r}`));
                }
                
                if (validation.synergies) {
                    allSynergies.push(...validation.synergies.map(s => `${currentGoal}: ${s}`));
                }
                
                // Update overall compatibility
                if (validation.compatible === false) {
                    overallCompatible = false;
                }
            }
        }
        
        return {
            compatible: overallCompatible,
            conflicts: [...new Set(allConflicts)],
            recommendations: [...new Set(allRecommendations)],
            synergies: [...new Set(allSynergies)],
            compatibilityScore: this.calculateCompatibilityScore(selectedGoals)
        };
    }

    calculateCompatibilityScore(selectedGoals) {
        let totalScore = 0;
        let pairCount = 0;
        
        for (let i = 0; i < selectedGoals.length; i++) {
            for (let j = i + 1; j < selectedGoals.length; j++) {
                const goal1 = selectedGoals[i];
                const goal2 = selectedGoals[j];
                
                if (this.compatibilityMatrix[goal1] && this.compatibilityMatrix[goal1][goal2]) {
                    totalScore += this.compatibilityMatrix[goal1][goal2];
                    pairCount++;
                }
            }
        }
        
        return pairCount > 0 ? Math.round((totalScore / pairCount) * 10) / 10 : 5;
    }

    determineOptimalDuration(selectedGoals, userProfile, requestedWeeks) {
        // Get recommended duration from each strategy
        const durations = selectedGoals.map(goalName => {
            const strategy = this.goalStrategies.get(goalName);
            return strategy ? strategy.getRecommendedDuration(userProfile) : 12;
        });
        
        // Use the longest recommended duration for multi-goal programs
        const optimalDuration = Math.max(...durations);
        
        // Respect user's requested duration if reasonable
        if (requestedWeeks && requestedWeeks >= 8 && requestedWeeks <= 16) {
            return Math.max(requestedWeeks, Math.min(optimalDuration, requestedWeeks + 4));
        }
        
        return optimalDuration;
    }

    calculateWeightedExercisePriorities(selectedGoals) {
        const priorities = {
            compound: 0, isolation: 0, functional: 0, 
            unilateral: 0, plyometric: 0, cardio: 0
        };
        
        // Weight: Primary goal 60%, secondary goals split remaining 40%
        const primaryWeight = 0.6;
        const secondaryWeight = selectedGoals.length > 1 ? 0.4 / (selectedGoals.length - 1) : 0;
        
        selectedGoals.forEach((goalName, index) => {
            const strategy = this.goalStrategies.get(goalName);
            if (strategy) {
                const goalPriorities = strategy.getExercisePriorities();
                const weight = index === 0 ? primaryWeight : secondaryWeight;
                
                Object.keys(priorities).forEach(key => {
                    priorities[key] += (goalPriorities[key] || 0) * weight;
                });
            }
        });
        
        // Round to nearest integer
        Object.keys(priorities).forEach(key => {
            priorities[key] = Math.round(priorities[key]);
        });
        
        return priorities;
    }

    determineProgressionStrategy(selectedGoals) {
        const primaryGoal = selectedGoals[0];
        const primaryStrategy = this.goalStrategies.get(primaryGoal);
        
        if (!primaryStrategy) {
            return {
                primary: 'linear',
                volumeEmphasis: 'moderate',
                intensityEmphasis: 'moderate',
                frequencyRange: [4, 5],
                deloadFrequency: 4
            };
        }
        
        const baseProgression = primaryStrategy.getProgressionStrategy();
        
        // Adjust for multi-goal complexity
        if (selectedGoals.length > 1) {
            return {
                ...baseProgression,
                primary: 'undulating', // More variety for multi-goal
                deloadFrequency: Math.max(3, baseProgression.deloadFrequency - 1) // More frequent deloads
            };
        }
        
        return baseProgression;
    }

    calculateRecoveryRequirements(selectedGoals) {
        const primaryGoal = selectedGoals[0];
        const primaryStrategy = this.goalStrategies.get(primaryGoal);
        
        if (!primaryStrategy) {
            return {
                restBetweenSets: '60-120 seconds',
                restBetweenSessions: '24-48 hours',
                sleepRecommendation: '7-9 hours',
                activeRecoveryDays: 2,
                deloadWeekFrequency: 4
            };
        }
        
        const baseRecovery = primaryStrategy.getRecoveryRequirements();
        
        // Adjust for multi-goal demands
        if (selectedGoals.length > 1) {
            return {
                ...baseRecovery,
                sleepRecommendation: '8-9 hours (increased for multi-goal demands)',
                activeRecoveryDays: Math.min(3, baseRecovery.activeRecoveryDays + 1),
                additionalNote: 'Multi-goal training requires enhanced recovery protocols'
            };
        }
        
        return baseRecovery;
    }

    integrateSecondaryGoals(baseStructure, secondaryGoals, userProfile, totalWeeks) {
        let integratedStructure = JSON.parse(JSON.stringify(baseStructure));
        
        // Add secondary goal components to each mesocycle
        secondaryGoals.forEach(goalName => {
            const strategy = this.goalStrategies.get(goalName);
            if (strategy) {
                integratedStructure = this.blendGoalIntoStructure(
                    integratedStructure, 
                    goalName, 
                    strategy,
                    userProfile,
                    totalWeeks
                );
            }
        });
        
        return integratedStructure;
    }

    blendGoalIntoStructure(structure, goalName, strategy, userProfile, totalWeeks) {
        const blendingRules = {
            strength: (mesocycle) => ({
                ...mesocycle,
                strengthComponent: true,
                compoundEmphasis: 'high',
                intensityFocus: 'moderate-high',
                powerDevelopment: true,
                restPeriods: 'extended_for_strength'
            }),
            hypertrophy: (mesocycle) => ({
                ...mesocycle,
                hypertrophyComponent: true,
                volumeEmphasis: 'high',
                timeUnderTension: 'emphasized',
                isolationWork: 'increased',
                mechanicalTension: true
            }),
            weight_loss: (mesocycle) => ({
                ...mesocycle,
                metabolicComponent: true,
                cardioIntegration: 'high',
                restPeriods: 'shortened',
                circuitTraining: true,
                calorieExpenditure: 'maximized'
            }),
            sports_performance: (mesocycle) => ({
                ...mesocycle,
                functionalComponent: true,
                unilateralTraining: true,
                plyometricIntegration: 'moderate',
                movementQuality: 'high',
                sportSpecific: true
            }),
            flexibility: (mesocycle) => ({
                ...mesocycle,
                mobilityComponent: true,
                dailyMobility: true,
                dynamicWarmup: 'extended',
                staticCooldown: 'comprehensive',
                rangeOfMotion: 'emphasized'
            }),
            endurance: (mesocycle) => ({
                ...mesocycle,
                cardiovascularComponent: true,
                aerobicBase: true,
                higherRepRanges: true,
                activeRecovery: 'emphasized',
                heartRateZones: 'integrated'
            }),
            general_fitness: (mesocycle) => ({
                ...mesocycle,
                varietyComponent: true,
                balancedApproach: true,
                functionalMovements: true,
                lifestyleIntegration: true,
                enjoymentFocus: true
            }),
            body_recomposition: (mesocycle) => ({
                ...mesocycle,
                recompositionComponent: true,
                hybridTraining: true,
                metabolicConditioning: 'integrated',
                musclePreservation: 'critical',
                preciseNutritionTiming: true
            })
        };

        const blendingRule = blendingRules[goalName];
        if (blendingRule) {
            return structure.map(blendingRule);
        }
        
        return structure;
    }

    createHybridParameters(selectedGoals, integratedStructure) {
        // Create training parameters that blend all goals
        const hybridParams = {};
        
        integratedStructure.forEach((mesocycle, index) => {
            const focusKey = mesocycle.focus;
            
            // Get parameters from primary goal strategy
            const primaryGoal = selectedGoals[0];
            const primaryStrategy = this.goalStrategies.get(primaryGoal);
            
            if (primaryStrategy) {
                const baseParams = primaryStrategy.getTrainingParameters(focusKey, 1);
                
                // Modify based on integrated components
                hybridParams[focusKey] = {
                    ...baseParams,
                    multiGoalAdjustments: this.calculateMultiGoalAdjustments(mesocycle, selectedGoals),
                    integrationNotes: this.generateIntegrationNotes(mesocycle, selectedGoals)
                };
            }
        });
        
        return hybridParams;
    }

    calculateMultiGoalAdjustments(mesocycle, selectedGoals) {
        const adjustments = {};
        
        // Adjust frequency for multi-goal demands
        if (selectedGoals.length > 2) {
            adjustments.frequency = 'increased_for_multi_goal';
        }
        
        // Adjust rest periods based on goal combination
        if (selectedGoals.includes('weight_loss') && selectedGoals.includes('strength')) {
            adjustments.restPeriods = 'varied_by_exercise_type';
        }
        
        // Add cardio integration for metabolic goals
        if (selectedGoals.includes('weight_loss') || selectedGoals.includes('endurance')) {
            adjustments.cardioIntegration = 'enhanced';
        }
        
        return adjustments;
    }

    generateIntegrationNotes(mesocycle, selectedGoals) {
        const notes = [];
        
        selectedGoals.forEach(goal => {
            switch (goal) {
                case 'weight_loss':
                    notes.push('Maintain elevated heart rate between exercises when possible');
                    break;
                case 'flexibility':
                    notes.push('Include mobility work in warm-up and cool-down');
                    break;
                case 'sports_performance':
                    notes.push('Emphasize movement quality and sport-specific patterns');
                    break;
                case 'body_recomposition':
                    notes.push('Balance muscle-building and fat-loss components within sessions');
                    break;
            }
        });
        
        return notes;
    }

    generateCombinedInstructions(selectedGoals) {
        let combinedInstructions = `
## MULTI-GOAL PROGRAM INSTRUCTIONS:
### Primary Goal: ${selectedGoals[0].toUpperCase().replace('_', ' ')}
### Secondary Goals: ${selectedGoals.slice(1).map(g => g.replace('_', ' ')).join(', ')}

### GOAL PRIORITIZATION:
- Primary Goal Focus: 60% of training emphasis
- Secondary Goals Focus: 40% of training emphasis (distributed equally)

`;

        selectedGoals.forEach((goalName, index) => {
            const strategy = this.goalStrategies.get(goalName);
            if (strategy) {
                const priority = index === 0 ? 'PRIMARY' : 'SECONDARY';
                const focusPercentage = index === 0 ? '60%' : `${Math.round(40 / (selectedGoals.length - 1))}%`;
                
                combinedInstructions += `
### ${priority} GOAL (${focusPercentage} FOCUS) - ${goalName.toUpperCase().replace('_', ' ')}:
${strategy.getPromptInstructions({})}
`;
            }
        });

        combinedInstructions += `
## MULTI-GOAL INTEGRATION GUIDELINES:
- **Session Structure**: Begin with primary goal exercises when energy is highest
- **Exercise Selection**: Prioritize compound movements that serve multiple goals
- **Volume Management**: Distribute training volume based on goal prioritization
- **Intensity Variation**: Use undulating periodization to accommodate multiple adaptations
- **Recovery Protocols**: Enhanced recovery due to increased training complexity
- **Progress Monitoring**: Track metrics relevant to all selected goals
- **Flexibility**: Adjust emphasis based on progress and individual response
- **Conflict Resolution**: When goals conflict, prioritize primary goal while maintaining secondary goal benefits

### WEEKLY STRUCTURE RECOMMENDATIONS:
- Days 1-2: Primary goal emphasis with secondary goal integration
- Days 3-4: Balanced approach incorporating all goals
- Days 5-6: Secondary goal emphasis with primary goal maintenance
- Day 7: Active recovery focusing on flexibility and general fitness components
        `;

        return combinedInstructions;
    }

    generateRecommendations(selectedGoals, compatibility) {
        const recommendations = [...compatibility.recommendations];
        
        // Add multi-goal specific recommendations
        if (selectedGoals.length > 3) {
            recommendations.push('Consider reducing to 3 goals maximum for optimal results');
        }
        
        if (compatibility.compatibilityScore < 3) {
            recommendations.push('Goal combination has low compatibility - expect slower progress');
        }
        
        if (selectedGoals.includes('weight_loss') && selectedGoals.includes('hypertrophy')) {
            recommendations.push('Consider body recomposition approach instead of separate weight loss and muscle gain');
        }
        
        return recommendations;
    }

    buildCompatibilityMatrix() {
        // Updated compatibility matrix including body_recomposition and refined scores
        // Based on detailed analysis from our implemented strategies
        return {
            strength: { 
                hypertrophy: 5, sports_performance: 4, general_fitness: 4, 
                body_recomposition: 4, flexibility: 3, endurance: 2, weight_loss: 2 
            },
            hypertrophy: { 
                strength: 5, body_recomposition: 5, general_fitness: 4, 
                sports_performance: 3, flexibility: 3, endurance: 2, weight_loss: 2 
            },
            weight_loss: { 
                endurance: 5, general_fitness: 4, flexibility: 4, 
                body_recomposition: 4, sports_performance: 3, strength: 2, hypertrophy: 2 
            },
            sports_performance: { 
                flexibility: 5, strength: 4, general_fitness: 4, 
                body_recomposition: 3, endurance: 3, weight_loss: 3, hypertrophy: 3 
            },
            flexibility: { 
                sports_performance: 5, general_fitness: 5, weight_loss: 4, 
                endurance: 4, body_recomposition: 3, strength: 3, hypertrophy: 3 
            },
            general_fitness: { 
                flexibility: 5, weight_loss: 4, sports_performance: 4, 
                strength: 4, hypertrophy: 4, endurance: 4, body_recomposition: 4 
            },
            endurance: { 
                weight_loss: 5, general_fitness: 4, flexibility: 4, 
                sports_performance: 3, body_recomposition: 3, strength: 2, hypertrophy: 2 
            },
            body_recomposition: {
                hypertrophy: 5, strength: 4, weight_loss: 4, general_fitness: 4,
                sports_performance: 3, endurance: 3, flexibility: 3
            }
        };
    }
}

module.exports = MultiGoalOrchestrator;
