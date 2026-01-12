/**
 * Analytics Service
 * Specialized service for analytics and AI insights
 */

import { apiClient, API_ENDPOINTS, API_TIMEOUTS } from '../client';
import type { 
  AnalyticsOverview,
  ApiResponse,
  RequestOptions 
} from '../types';

export class AnalyticsService {
  /**
   * Get analytics overview
   */
  async getOverview(timeframe: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<AnalyticsOverview> {
    try {
      const result = await apiClient.analyticsOperation<ApiResponse<AnalyticsOverview>>(
        API_ENDPOINTS.ANALYTICS.OVERVIEW,
        { timeframe },
        'GET'
      );
      
      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to fetch analytics overview');
      }
      
      return result.data!;
    } catch (error) {
      console.error('Failed to fetch analytics overview:', error);
      throw error;
    }
  }

  /**
   * Get AI-powered insights
   */
  async getAIInsights(options?: {
    timeframe?: '7d' | '30d' | '90d' | '1y';
    focusAreas?: string[];
    includeRecommendations?: boolean;
  }): Promise<{
    insights: Array<{
      category: string;
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
      actionable: boolean;
      recommendations?: string[];
    }>;
    patterns: Array<{
      type: string;
      description: string;
      confidence: number;
      trend: 'improving' | 'declining' | 'stable';
    }>;
    predictions: Array<{
      metric: string;
      prediction: string;
      confidence: number;
      timeframe: string;
    }>;
  }> {
    try {
      const result = await apiClient.analyticsOperation<ApiResponse<any>>(
        API_ENDPOINTS.ANALYTICS.INSIGHTS,
        options,
        'POST'
      );
      
      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to generate AI insights');
      }
      
      return result.data!;
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      throw error;
    }
  }

  /**
   * Get pattern analysis
   */
  async getPatterns(analysisType: 'workout' | 'progress' | 'adherence' | 'performance'): Promise<{
    patterns: Array<{
      id: string;
      type: string;
      description: string;
      strength: number;
      detected_at: string;
      supporting_data: any[];
    }>;
    recommendations: Array<{
      based_on: string;
      recommendation: string;
      priority: 'low' | 'medium' | 'high';
      category: string;
    }>;
  }> {
    try {
      const result = await apiClient.analyticsOperation<ApiResponse<any>>(
        API_ENDPOINTS.ANALYTICS.PATTERNS,
        { analysisType },
        'POST'
      );
      
      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to analyze patterns');
      }
      
      return result.data!;
    } catch (error) {
      console.error('Failed to analyze patterns:', error);
      throw error;
    }
  }

  /**
   * Get fitness trends
   */
  async getTrends(metrics: string[], timeframe: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<{
    trends: Array<{
      metric: string;
      data: Array<{
        date: string;
        value: number;
      }>;
      trend: 'up' | 'down' | 'stable';
      change_percentage: number;
      period_comparison: {
        current: number;
        previous: number;
        change: number;
      };
    }>;
    correlations: Array<{
      metric1: string;
      metric2: string;
      correlation: number;
      significance: 'strong' | 'moderate' | 'weak';
    }>;
  }> {
    try {
      const result = await apiClient.get<ApiResponse<any>>(
        API_ENDPOINTS.ANALYTICS.TRENDS,
        {
          params: { metrics: metrics.join(','), timeframe },
          timeout: API_TIMEOUTS.analyticsInsights,
        }
      );
      
      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to fetch trends');
      }
      
      return result.data!;
    } catch (error) {
      console.error('Failed to fetch trends:', error);
      throw error;
    }
  }

  /**
   * Refresh analytics data
   */
  async refreshAnalytics(): Promise<{ refreshed: boolean; lastUpdate: string }> {
    try {
      const result = await apiClient.post<ApiResponse<any>>(
        API_ENDPOINTS.ANALYTICS.REFRESH,
        {},
        {
          timeout: API_TIMEOUTS.analyticsInsights,
        }
      );
      
      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to refresh analytics');
      }
      
      return result.data!;
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
      throw error;
    }
  }

  /**
   * Get comparative analytics (vs peers, previous periods)
   */
  async getComparativeAnalytics(comparisonType: 'peers' | 'previous_period', options?: {
    timeframe?: string;
    demographics?: {
      age_range?: [number, number];
      gender?: string;
      fitness_level?: string;
    };
  }): Promise<{
    comparisons: Array<{
      metric: string;
      user_value: number;
      comparison_value: number;
      percentile: number;
      performance: 'above_average' | 'average' | 'below_average';
    }>;
    insights: string[];
    recommendations: string[];
  }> {
    try {
      const result = await apiClient.post<ApiResponse<any>>(
        '/analytics/comparative',
        { comparisonType, ...options },
        {
          timeout: API_TIMEOUTS.analyticsInsights,
        }
      );
      
      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to get comparative analytics');
      }
      
      return result.data!;
    } catch (error) {
      console.error('Failed to get comparative analytics:', error);
      throw error;
    }
  }

  /**
   * Get goal progress analytics
   */
  async getGoalProgress(): Promise<{
    goals: Array<{
      id: string;
      name: string;
      target_value: number;
      current_value: number;
      progress_percentage: number;
      on_track: boolean;
      estimated_completion: string;
      milestones: Array<{
        name: string;
        target_date: string;
        completed: boolean;
        value?: number;
      }>;
    }>;
    overall_progress: number;
    recommendations: string[];
  }> {
    try {
      const result = await apiClient.get<ApiResponse<any>>(
        '/analytics/goals',
        {
          timeout: API_TIMEOUTS.analyticsInsights,
        }
      );
      
      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to fetch goal progress');
      }
      
      return result.data!;
    } catch (error) {
      console.error('Failed to fetch goal progress:', error);
      throw error;
    }
  }

  /**
   * Generate custom report
   */
  async generateReport(reportConfig: {
    title: string;
    metrics: string[];
    timeframe: string;
    format: 'summary' | 'detailed';
    include_charts: boolean;
    include_ai_insights: boolean;
  }): Promise<{
    report_id: string;
    status: 'generating' | 'ready';
    download_url?: string;
    estimated_completion?: string;
  }> {
    try {
      const result = await apiClient.post<ApiResponse<any>>(
        '/analytics/reports',
        reportConfig,
        {
          timeout: API_TIMEOUTS.analyticsInsights,
        }
      );
      
      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to generate report');
      }
      
      return result.data!;
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const analyticsService = new AnalyticsService();