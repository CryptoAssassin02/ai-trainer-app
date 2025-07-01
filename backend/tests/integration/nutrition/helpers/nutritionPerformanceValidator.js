// Nutrition Performance Validator for Real AI Integration Testing
// Tracks performance metrics, response times, and intelligence scores for optimization analysis

class NutritionPerformanceValidator {
  constructor() {
    this.performanceMetrics = [];
    this.intelligenceScores = [];
    this.responseTimeTargets = {
      simple: 60000,    // 1 minute for simple nutrition requests
      complex: 120000,  // 2 minutes for complex dietary scenarios
      concurrent: 180000 // 3 minutes for concurrent operations
    };
    this.callTracker = new Map(); // Track API calls by operation type
  }
  
  trackPerformance(responseTime, intelligenceScore, operation, context = {}) {
    const metric = {
      timestamp: new Date().toISOString(),
      responseTime: responseTime,
      intelligenceScore: intelligenceScore,
      operation: operation,
      context: context,
      meetsTarget: this.evaluatePerformanceTarget(responseTime, operation),
      complexityLevel: this.assessComplexityLevel(context)
    };
    
    this.performanceMetrics.push(metric);
    this.intelligenceScores.push(intelligenceScore);
    
    // Track call count by operation
    const currentCount = this.callTracker.get(operation) || 0;
    this.callTracker.set(operation, currentCount + 1);
    
    // Check performance targets and warn if exceeded
    const target = this.getTargetForOperation(operation);
    if (responseTime > target) {
      console.warn('[NUTRITION PERFORMANCE] Response time exceeded target:', {
        responseTime: `${responseTime}ms`,
        target: `${target}ms`,
        operation: operation,
        complexityLevel: metric.complexityLevel
      });
    }
    
    return metric;
  }
  
  evaluatePerformanceTarget(responseTime, operation) {
    const target = this.getTargetForOperation(operation);
    return responseTime <= target;
  }
  
  getTargetForOperation(operation) {
    if (operation.includes('concurrent') || operation.includes('load')) {
      return this.responseTimeTargets.concurrent;
    } else if (operation.includes('complex') || operation.includes('advanced')) {
      return this.responseTimeTargets.complex;
    } else {
      return this.responseTimeTargets.simple;
    }
  }
  
  assessComplexityLevel(context) {
    let complexity = 0;
    
    // Medical conditions add significant complexity
    if (context.medicalConditions?.length > 0) {
      complexity += context.medicalConditions.length * 2;
    }
    
    // Multiple goals add complexity
    if (context.goals?.length > 1) {
      complexity += context.goals.length;
    }
    
    // Dietary restrictions add complexity
    if (context.dietaryRestrictions?.length > 0) {
      complexity += context.dietaryRestrictions.length;
    }
    
    // Conflicting goals (weight_loss + muscle_gain) add extra complexity
    if (context.goals?.includes('weight_loss') && context.goals?.includes('muscle_gain')) {
      complexity += 3;
    }
    
    // Multiple preferences add complexity
    if (context.preferences && Object.keys(context.preferences).length > 0) {
      complexity += Object.keys(context.preferences).length;
    }
    
    // Return complexity level
    if (complexity >= 8) return 'extreme';
    if (complexity >= 5) return 'high';
    if (complexity >= 3) return 'moderate';
    return 'simple';
  }
  
  generatePerformanceReport() {
    if (this.performanceMetrics.length === 0) {
      return {
        summary: {
          totalOperations: 0,
          avgResponseTime: 0,
          avgIntelligenceScore: 0,
          targetsMetPercentage: 0
        },
        message: 'No performance metrics collected yet'
      };
    }
    
    const avgResponseTime = this.performanceMetrics.reduce((sum, m) => sum + m.responseTime, 0) / this.performanceMetrics.length;
    const avgIntelligenceScore = this.intelligenceScores.reduce((sum, score) => sum + score, 0) / this.intelligenceScores.length;
    const targetsMetCount = this.performanceMetrics.filter(m => m.meetsTarget).length;
    
    return {
      summary: {
        totalOperations: this.performanceMetrics.length,
        avgResponseTime: Math.round(avgResponseTime),
        avgIntelligenceScore: Math.round(avgIntelligenceScore * 100) / 100,
        targetsMetPercentage: Math.round((targetsMetCount / this.performanceMetrics.length) * 100)
      },
      performance: {
        avgResponseTimeMs: avgResponseTime,
        avgIntelligenceScore: avgIntelligenceScore,
        targetsMetCount: targetsMetCount,
        totalMeasurements: this.performanceMetrics.length,
        performanceEfficiency: (targetsMetCount / this.performanceMetrics.length) * 100
      },
      operations: this.groupByOperation(),
      complexity: this.groupByComplexity(),
      recommendations: this.generatePerformanceRecommendations(),
      callTracker: Object.fromEntries(this.callTracker)
    };
  }
  
  groupByOperation() {
    const operations = {};
    this.performanceMetrics.forEach(metric => {
      if (!operations[metric.operation]) {
        operations[metric.operation] = {
          count: 0,
          totalResponseTime: 0,
          totalIntelligenceScore: 0,
          avgResponseTime: 0,
          avgIntelligenceScore: 0,
          targetsMet: 0,
          complexityLevels: {}
        };
      }
      
      const op = operations[metric.operation];
      op.count++;
      op.totalResponseTime += metric.responseTime;
      op.totalIntelligenceScore += metric.intelligenceScore;
      op.avgResponseTime = Math.round(op.totalResponseTime / op.count);
      op.avgIntelligenceScore = Math.round((op.totalIntelligenceScore / op.count) * 100) / 100;
      
      if (metric.meetsTarget) {
        op.targetsMet++;
      }
      
      // Track complexity distribution
      const complexity = metric.complexityLevel;
      op.complexityLevels[complexity] = (op.complexityLevels[complexity] || 0) + 1;
    });
    
    return operations;
  }
  
  groupByComplexity() {
    const complexity = {};
    this.performanceMetrics.forEach(metric => {
      const level = metric.complexityLevel;
      if (!complexity[level]) {
        complexity[level] = {
          count: 0,
          avgResponseTime: 0,
          avgIntelligenceScore: 0,
          targetsMet: 0
        };
      }
      
      complexity[level].count++;
      complexity[level].avgResponseTime += metric.responseTime;
      complexity[level].avgIntelligenceScore += metric.intelligenceScore;
      if (metric.meetsTarget) {
        complexity[level].targetsMet++;
      }
    });
    
    // Calculate averages
    Object.keys(complexity).forEach(level => {
      const comp = complexity[level];
      comp.avgResponseTime = Math.round(comp.avgResponseTime / comp.count);
      comp.avgIntelligenceScore = Math.round((comp.avgIntelligenceScore / comp.count) * 100) / 100;
      comp.targetMetPercentage = Math.round((comp.targetsMet / comp.count) * 100);
    });
    
    return complexity;
  }
  
  generatePerformanceRecommendations() {
    const recommendations = [];
    const operations = this.groupByOperation();
    
    // Performance optimization recommendations
    Object.entries(operations).forEach(([op, stats]) => {
      if (stats.avgResponseTime > 90000) { // 1.5 minutes
        recommendations.push({
          type: 'response_time_optimization',
          operation: op,
          issue: `High average response time: ${(stats.avgResponseTime/1000).toFixed(1)}s`,
          suggestion: 'Consider prompt optimization or concurrent processing',
          priority: 'high'
        });
      }
      
      if (stats.avgIntelligenceScore < 7) { // Intelligence threshold
        recommendations.push({
          type: 'intelligence_optimization',
          operation: op,
          issue: `Low average intelligence score: ${stats.avgIntelligenceScore.toFixed(1)}`,
          suggestion: 'Review prompt engineering for better AI reasoning',
          priority: 'medium'
        });
      }
      
      const targetMetPercentage = (stats.targetsMet / stats.count) * 100;
      if (targetMetPercentage < 80) {
        recommendations.push({
          type: 'target_performance',
          operation: op,
          issue: `Low target achievement: ${targetMetPercentage.toFixed(1)}%`,
          suggestion: 'Adjust performance targets or optimize operation efficiency',
          priority: 'medium'
        });
      }
    });
    
    // Global recommendations
    const avgResponseTime = this.performanceMetrics.reduce((sum, m) => sum + m.responseTime, 0) / this.performanceMetrics.length;
    const avgIntelligenceScore = this.intelligenceScores.reduce((sum, score) => sum + score, 0) / this.intelligenceScores.length;
    
    if (avgResponseTime > 60000) { // Overall slow performance
      recommendations.push({
        type: 'system_optimization',
        operation: 'global',
        issue: `Overall slow performance: ${(avgResponseTime/1000).toFixed(1)}s average`,
        suggestion: 'Consider system-wide optimization or infrastructure scaling',
        priority: 'high'
      });
    }
    
    if (avgIntelligenceScore >= 8) { // High intelligence achievement
      recommendations.push({
        type: 'excellence_recognition',
        operation: 'global',
        issue: `Excellent AI intelligence: ${avgIntelligenceScore.toFixed(1)} average`,
        suggestion: 'Current AI integration demonstrates high quality - maintain approach',
        priority: 'low'
      });
    }
    
    return recommendations;
  }
  
  // Utility methods for real-time monitoring
  getCurrentPerformanceStatus() {
    if (this.performanceMetrics.length === 0) {
      return { status: 'no_data', message: 'No performance data collected yet' };
    }
    
    const recentMetrics = this.performanceMetrics.slice(-5); // Last 5 operations
    const avgRecentResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
    const avgRecentIntelligence = recentMetrics.reduce((sum, m) => sum + m.intelligenceScore, 0) / recentMetrics.length;
    
    let status = 'good';
    if (avgRecentResponseTime > 120000) status = 'slow';
    if (avgRecentIntelligence < 6) status = 'poor_quality';
    if (avgRecentResponseTime > 120000 && avgRecentIntelligence < 6) status = 'critical';
    
    return {
      status: status,
      recentAvgResponseTime: Math.round(avgRecentResponseTime),
      recentAvgIntelligence: Math.round(avgRecentIntelligence * 100) / 100,
      operationsTracked: this.performanceMetrics.length
    };
  }
  
  // Reset all metrics (useful for clean testing sessions)
  reset() {
    this.performanceMetrics = [];
    this.intelligenceScores = [];
    this.callTracker.clear();
    console.log('[NUTRITION PERFORMANCE] Performance validator reset');
  }
}

module.exports = { NutritionPerformanceValidator }; 