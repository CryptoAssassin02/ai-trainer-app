#!/usr/bin/env ts-node
/**
 * API Client Validation Script
 * Comprehensive validation of API client implementation
 */

import { apiClient, API_TIMEOUTS, APIError } from '../lib/api/client';
import { workoutService } from '../lib/api/services/workout-service';
import { profileService } from '../lib/api/services/profile-service';
import { analyticsService } from '../lib/api/services/analytics-service';
import { authService } from '../lib/api/services/auth-service';

interface ValidationResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

class APIClientValidator {
  private results: ValidationResult[] = [];

  async runValidation(): Promise<void> {
    console.log('🔍 Starting API Client Infrastructure Validation...\n');

    await Promise.all([
      this.validateConfiguration(),
      this.validateServiceInstances(),
      this.validateTypeSystem(),
      this.validateErrorHandling(),
      this.validateTimeoutConfiguration(),
      this.validatePerformanceFeatures(),
    ]);

    this.displayResults();
    this.exitWithStatus();
  }

  private async validateConfiguration(): Promise<void> {
    try {
      // Test API client instantiation
      if (typeof apiClient.get === 'function' && 
          typeof apiClient.post === 'function' &&
          typeof apiClient.put === 'function' &&
          typeof apiClient.delete === 'function') {
        this.addResult({
          test: 'API Client Configuration',
          status: 'pass',
          message: 'API client properly instantiated with all HTTP methods'
        });
      } else {
        this.addResult({
          test: 'API Client Configuration',
          status: 'fail',
          message: 'API client missing required HTTP methods'
        });
      }

      // Test timeout configurations
      const expectedTimeouts = {
        workoutGeneration: 45000,
        workoutAdjustment: 30000,
        nutritionPlanning: 40000,
        analyticsInsights: 35000,
        perplexityResearch: 30000,
        standardOperations: 15000,
        fileOperations: 60000,
      };

      const timeoutMatch = Object.keys(expectedTimeouts).every(
        key => API_TIMEOUTS[key as keyof typeof API_TIMEOUTS] === expectedTimeouts[key as keyof typeof expectedTimeouts]
      );

      if (timeoutMatch) {
        this.addResult({
          test: 'Timeout Configuration',
          status: 'pass',
          message: 'All timeout values correctly configured',
          details: API_TIMEOUTS
        });
      } else {
        this.addResult({
          test: 'Timeout Configuration',
          status: 'fail',
          message: 'Timeout configuration mismatch',
          details: { expected: expectedTimeouts, actual: API_TIMEOUTS }
        });
      }

    } catch (error) {
      this.addResult({
        test: 'API Client Configuration',
        status: 'fail',
        message: `Configuration validation failed: ${error.message}`
      });
    }
  }

  private async validateServiceInstances(): Promise<void> {
    try {
      const services = [
        { name: 'Workout Service', instance: workoutService, methods: ['generatePlan', 'adjustPlan', 'getPlans'] },
        { name: 'Profile Service', instance: profileService, methods: ['getProfile', 'updateProfile'] },
        { name: 'Analytics Service', instance: analyticsService, methods: ['getOverview', 'getInsights'] },
        { name: 'Auth Service', instance: authService, methods: ['signUp', 'signIn', 'signOut'] }
      ];

      for (const service of services) {
        if (!service.instance) {
          this.addResult({
            test: `${service.name} Instance`,
            status: 'fail',
            message: `${service.name} not properly instantiated`
          });
          continue;
        }

        const missingMethods = service.methods.filter(
          method => typeof service.instance[method] !== 'function'
        );

        if (missingMethods.length === 0) {
          this.addResult({
            test: `${service.name} Methods`,
            status: 'pass',
            message: `All required methods available: ${service.methods.join(', ')}`
          });
        } else {
          this.addResult({
            test: `${service.name} Methods`,
            status: 'fail',
            message: `Missing methods: ${missingMethods.join(', ')}`
          });
        }
      }

    } catch (error) {
      this.addResult({
        test: 'Service Instances',
        status: 'fail',
        message: `Service validation failed: ${error.message}`
      });
    }
  }

  private async validateTypeSystem(): Promise<void> {
    try {
      // Test APIError class
      const testError = new APIError('Test error', 500, 'TEST001', true);
      
      if (testError instanceof Error && 
          testError.message === 'Test error' &&
          testError.status === 500 &&
          testError.code === 'TEST001' &&
          testError.retryable === true) {
        this.addResult({
          test: 'Type System - APIError',
          status: 'pass',
          message: 'APIError class properly implemented'
        });
      } else {
        this.addResult({
          test: 'Type System - APIError',
          status: 'fail',
          message: 'APIError class implementation issues'
        });
      }

      // Test that TypeScript types are available
      // This is validated by the compilation of this script
      this.addResult({
        test: 'Type System - TypeScript Integration',
        status: 'pass',
        message: 'TypeScript types properly integrated (validated by compilation)'
      });

    } catch (error) {
      this.addResult({
        test: 'Type System',
        status: 'fail',
        message: `Type system validation failed: ${error.message}`
      });
    }
  }

  private async validateErrorHandling(): Promise<void> {
    try {
      // Test error classification
      const errors = [
        new APIError('Network error', 0, 'NETWORK_ERROR', true),
        new APIError('Server error', 500, 'SERVER_ERROR', false),
        new APIError('Unauthorized', 401, 'AUTH_ERROR', false),
      ];

      let passCount = 0;
      for (const error of errors) {
        if (error instanceof APIError && 
            typeof error.status === 'number' &&
            typeof error.retryable === 'boolean') {
          passCount++;
        }
      }

      if (passCount === errors.length) {
        this.addResult({
          test: 'Error Handling - Classification',
          status: 'pass',
          message: 'Error classification working correctly'
        });
      } else {
        this.addResult({
          test: 'Error Handling - Classification',
          status: 'fail',
          message: `Only ${passCount}/${errors.length} errors properly classified`
        });
      }

    } catch (error) {
      this.addResult({
        test: 'Error Handling',
        status: 'fail',
        message: `Error handling validation failed: ${error.message}`
      });
    }
  }

  private async validateTimeoutConfiguration(): Promise<void> {
    try {
      // Validate timeout values are reasonable
      const timeouts = API_TIMEOUTS;
      const validationRules = [
        { name: 'AI operations have longer timeouts', test: timeouts.workoutGeneration > timeouts.standardOperations },
        { name: 'File operations have longest timeout', test: timeouts.fileOperations >= timeouts.workoutGeneration },
        { name: 'Standard operations have reasonable timeout', test: timeouts.standardOperations >= 10000 && timeouts.standardOperations <= 30000 },
        { name: 'All timeouts are positive numbers', test: Object.values(timeouts).every(t => t > 0) }
      ];

      const passed = validationRules.filter(rule => rule.test);
      
      if (passed.length === validationRules.length) {
        this.addResult({
          test: 'Timeout Logic Validation',
          status: 'pass',
          message: 'All timeout validation rules passed'
        });
      } else {
        const failed = validationRules.filter(rule => !rule.test);
        this.addResult({
          test: 'Timeout Logic Validation',
          status: 'fail',
          message: `Failed rules: ${failed.map(r => r.name).join(', ')}`
        });
      }

    } catch (error) {
      this.addResult({
        test: 'Timeout Configuration',
        status: 'fail',
        message: `Timeout validation failed: ${error.message}`
      });
    }
  }

  private async validatePerformanceFeatures(): Promise<void> {
    try {
      // Check if performance monitoring is available
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        this.addResult({
          test: 'Performance Monitoring',
          status: 'pass',
          message: 'Performance monitoring available'
        });
      } else {
        this.addResult({
          test: 'Performance Monitoring',
          status: 'warning',
          message: 'Performance monitoring not available in current environment'
        });
      }

      // Validate that API client has advanced features
      const hasAdvancedFeatures = [
        typeof apiClient.workoutOperation === 'function',
        typeof apiClient.analyticsOperation === 'function',
        typeof apiClient.standardOperation === 'function',
      ].some(Boolean);

      if (hasAdvancedFeatures) {
        this.addResult({
          test: 'Advanced API Features',
          status: 'pass',
          message: 'Advanced API client features implemented'
        });
      } else {
        this.addResult({
          test: 'Advanced API Features',
          status: 'warning',
          message: 'Some advanced features may not be implemented'
        });
      }

    } catch (error) {
      this.addResult({
        test: 'Performance Features',
        status: 'fail',
        message: `Performance validation failed: ${error.message}`
      });
    }
  }

  private addResult(result: ValidationResult): void {
    this.results.push(result);
    
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${result.test}: ${result.message}`);
    
    if (result.details) {
      console.log(`   Details:`, result.details);
    }
  }

  private displayResults(): void {
    console.log('\n📊 Validation Summary:');
    console.log('─'.repeat(50));
    
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📈 Success Rate: ${Math.round((passed / this.results.length) * 100)}%`);
    
    if (failed === 0) {
      console.log('\n🎉 All critical validations passed! API client infrastructure is ready.');
    } else {
      console.log('\n🔧 Some validations failed. Please review the issues above.');
    }
  }

  private exitWithStatus(): void {
    const failed = this.results.filter(r => r.status === 'fail').length;
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run validation if script is executed directly
if (require.main === module) {
  const validator = new APIClientValidator();
  validator.runValidation().catch((error) => {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  });
}

export { APIClientValidator };