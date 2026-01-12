#!/usr/bin/env ts-node
/**
 * Health Check Script for trAIner App
 * Verifies backend connectivity and environment configuration
 */

import { environmentConfig, env } from '../lib/config/environment';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'warning';
  message: string;
  responseTime?: number;
  details?: any;
}

class HealthChecker {
  private results: HealthCheckResult[] = [];

  async performHealthChecks(): Promise<void> {
    console.log('🏥 Starting environment health checks...\n');
    
    await Promise.all([
      this.checkSupabaseConnection(),
      this.checkBackendAPI(),
      this.checkEnvironmentVariables(),
      this.checkVercelConfiguration(),
    ]);

    this.displayResults();
    this.exitWithStatus();
  }

  private async checkSupabaseConnection(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        this.results.push({
          service: 'Supabase',
          status: 'healthy',
          message: 'Successfully connected to Supabase',
          responseTime,
        });
      } else {
        this.results.push({
          service: 'Supabase',
          status: 'unhealthy',
          message: `HTTP ${response.status}: ${response.statusText}`,
          responseTime,
        });
      }
    } catch (error) {
      this.results.push({
        service: 'Supabase',
        status: 'unhealthy',
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  private async checkBackendAPI(): Promise<void> {
    const startTime = Date.now();
    const backendUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1';
    
    try {
      // Try to connect to backend health endpoint
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        this.results.push({
          service: 'Backend API',
          status: 'healthy',
          message: 'Backend API is responding',
          responseTime,
          details: data,
        });
      } else {
        this.results.push({
          service: 'Backend API',
          status: 'warning',
          message: `HTTP ${response.status}: Backend may not be running`,
          responseTime,
        });
      }
    } catch (error) {
      this.results.push({
        service: 'Backend API',
        status: 'warning',
        message: `Cannot connect to backend at ${backendUrl}`,
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async checkEnvironmentVariables(): Promise<void> {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_SITE_URL',
      'NEXT_PUBLIC_APP_ENV',
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    const warningVars = [];

    // Check for optional but recommended variables
    if (!process.env.SENTRY_DSN && env.NEXT_PUBLIC_APP_ENV === 'production') {
      warningVars.push('SENTRY_DSN (recommended for production)');
    }

    if (!process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID && env.NEXT_PUBLIC_APP_ENV === 'production') {
      warningVars.push('NEXT_PUBLIC_VERCEL_ANALYTICS_ID (recommended for production)');
    }

    if (missingVars.length === 0) {
      this.results.push({
        service: 'Environment Variables',
        status: warningVars.length > 0 ? 'warning' : 'healthy',
        message: missingVars.length === 0 
          ? `All required variables present${warningVars.length > 0 ? ' (some optional vars missing)' : ''}`
          : `Missing variables: ${missingVars.join(', ')}`,
        details: warningVars.length > 0 ? { missingOptional: warningVars } : undefined,
      });
    } else {
      this.results.push({
        service: 'Environment Variables',
        status: 'unhealthy',
        message: `Missing required variables: ${missingVars.join(', ')}`,
        details: { missing: missingVars, optional: warningVars },
      });
    }
  }

  private async checkVercelConfiguration(): Promise<void> {
    const vercelVars = [
      'NEXT_PUBLIC_VERCEL_ENV',
      'NEXT_PUBLIC_VERCEL_URL',
    ];

    const presentVars = vercelVars.filter(varName => process.env[varName]);
    
    if (presentVars.length > 0) {
      this.results.push({
        service: 'Vercel Configuration',
        status: 'healthy',
        message: 'Running on Vercel platform',
        details: {
          environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
          url: process.env.NEXT_PUBLIC_VERCEL_URL,
        },
      });
    } else {
      this.results.push({
        service: 'Vercel Configuration',
        status: 'warning',
        message: 'Running outside Vercel (local development)',
        details: { note: 'This is normal for local development' },
      });
    }
  }

  private displayResults(): void {
    console.log('📊 Health Check Results:\n');
    
    this.results.forEach(result => {
      const icon = result.status === 'healthy' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      console.log(`${icon} ${result.service}: ${result.message}`);
      
      if (result.responseTime) {
        console.log(`   Response time: ${result.responseTime}ms`);
      }
      
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      
      console.log('');
    });
  }

  private exitWithStatus(): void {
    const healthyCount = this.results.filter(r => r.status === 'healthy').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    const unhealthyCount = this.results.filter(r => r.status === 'unhealthy').length;

    console.log(`📈 Summary: ${healthyCount} healthy, ${warningCount} warnings, ${unhealthyCount} unhealthy\n`);

    if (unhealthyCount > 0) {
      console.log('❌ Health check failed. Please resolve the issues above.');
      process.exit(1);
    } else if (warningCount > 0) {
      console.log('⚠️ Health check passed with warnings. Review the warnings above.');
      process.exit(0);
    } else {
      console.log('✅ All health checks passed successfully!');
      process.exit(0);
    }
  }
}

// Run health checks if this script is executed directly
if (require.main === module) {
  const checker = new HealthChecker();
  checker.performHealthChecks().catch(error => {
    console.error('💥 Health check script failed:', error);
    process.exit(1);
  });
}

export { HealthChecker };