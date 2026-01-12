#!/usr/bin/env node
/**
 * API Client Validation Script
 * Comprehensive validation of API client implementation
 */

const path = require('path');
const fs = require('fs');

class APIClientValidator {
  constructor() {
    this.results = [];
  }

  async runValidation() {
    console.log('🔍 Starting API Client Infrastructure Validation...\n');
    console.log('Current working directory:', process.cwd());

    await Promise.all([
      this.validateFileStructure(),
      this.validatePackageDependencies(),
      this.validateTypeScriptFiles(),
      this.validateTestFiles(),
      this.validateConfiguration(),
    ]);

    this.displayResults();
    this.exitWithStatus();
  }

  async validateFileStructure() {
    try {
      const requiredFiles = [
        'lib/api/client.ts',
        'lib/api/types.ts',
        'lib/api/services/workout-service.ts',
        'lib/api/services/analytics-service.ts',
        'lib/api/services/profile-service.ts',
        'lib/api/services/auth-service.ts',
        'lib/api/services/index.ts',
        'lib/api/react-query.tsx',
        'components/error/error-boundary.tsx',
        'components/error/api-error-display.tsx',
      ];

      const missingFiles = [];
      const existingFiles = [];

      for (const file of requiredFiles) {
        if (fs.existsSync(path.join(process.cwd(), file))) {
          existingFiles.push(file);
        } else {
          missingFiles.push(file);
        }
      }

      if (missingFiles.length === 0) {
        this.addResult({
          test: 'File Structure',
          status: 'pass',
          message: `All ${requiredFiles.length} required files present`,
          details: existingFiles.length
        });
      } else {
        this.addResult({
          test: 'File Structure',
          status: 'fail',
          message: `Missing files: ${missingFiles.join(', ')}`,
          details: { existing: existingFiles.length, missing: missingFiles.length }
        });
      }

    } catch (error) {
      this.addResult({
        test: 'File Structure',
        status: 'fail',
        message: `File structure validation failed: ${error.message}`
      });
    }
  }

  async validatePackageDependencies() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const requiredDeps = [
        'axios',
        '@tanstack/react-query',
        'zustand',
        '@supabase/supabase-js',
        '@types/axios'
      ];

      const missingDeps = requiredDeps.filter(dep => !dependencies[dep]);
      
      if (missingDeps.length === 0) {
        this.addResult({
          test: 'Package Dependencies',
          status: 'pass',
          message: 'All required dependencies installed',
          details: requiredDeps.map(dep => `${dep}: ${dependencies[dep]}`)
        });
      } else {
        this.addResult({
          test: 'Package Dependencies',
          status: 'fail',
          message: `Missing dependencies: ${missingDeps.join(', ')}`
        });
      }

    } catch (error) {
      this.addResult({
        test: 'Package Dependencies',
        status: 'fail',
        message: `Dependency validation failed: ${error.message}`
      });
    }
  }

  async validateTypeScriptFiles() {
    try {
      // Check if TypeScript files can be read and have expected content
      const apiClientPath = path.join(process.cwd(), 'lib/api/client.ts');
      const apiClientContent = fs.readFileSync(apiClientPath, 'utf8');
      
      const expectedFeatures = [
        'API_TIMEOUTS',
        'APIError',
        'AxiosInstance',
        'workoutGeneration: 45000',
        'standardOperations: 15000',
        'interceptors.request.use',
        'interceptors.response.use'
      ];
      
      const foundFeatures = expectedFeatures.filter(feature => 
        apiClientContent.includes(feature)
      );
      
      if (foundFeatures.length === expectedFeatures.length) {
        this.addResult({
          test: 'API Client Implementation',
          status: 'pass',
          message: 'All expected features found in API client',
          details: foundFeatures
        });
      } else {
        const missingFeatures = expectedFeatures.filter(feature => 
          !apiClientContent.includes(feature)
        );
        this.addResult({
          test: 'API Client Implementation',
          status: 'fail',
          message: `Missing features: ${missingFeatures.join(', ')}`
        });
      }

    } catch (error) {
      this.addResult({
        test: 'TypeScript Files',
        status: 'fail',
        message: `TypeScript validation failed: ${error.message}`
      });
    }
  }

  async validateTestFiles() {
    try {
      const testFiles = [
        '__tests__/api/api-client.test.ts',
        '__tests__/api/react-query-integration.test.tsx',
        '__tests__/components/error-boundary.test.tsx',
        '__tests__/integration/api-integration.test.ts'
      ];

      const existingTestFiles = testFiles.filter(file => 
        fs.existsSync(path.join(process.cwd(), file))
      );

      if (existingTestFiles.length === testFiles.length) {
        this.addResult({
          test: 'Test Infrastructure',
          status: 'pass',
          message: 'All test files created',
          details: existingTestFiles
        });
      } else {
        const missingTestFiles = testFiles.filter(file => 
          !fs.existsSync(path.join(process.cwd(), file))
        );
        this.addResult({
          test: 'Test Infrastructure',
          status: 'warning',
          message: `Missing test files: ${missingTestFiles.join(', ')}`
        });
      }

    } catch (error) {
      this.addResult({
        test: 'Test Files',
        status: 'fail',
        message: `Test validation failed: ${error.message}`
      });
    }
  }

  async validateConfiguration() {
    try {
      // Check timeout configuration values
      const apiClientPath = path.join(process.cwd(), 'lib/api/client.ts');
      const content = fs.readFileSync(apiClientPath, 'utf8');
      
      // Extract timeout values using regex
      const timeoutRegex = /(\w+):\s*(\d+)/g;
      const timeouts = {};
      let match;
      
      while ((match = timeoutRegex.exec(content)) !== null) {
        timeouts[match[1]] = parseInt(match[2]);
      }
      
      const expectedTimeouts = {
        workoutGeneration: 45000,
        workoutAdjustment: 30000,
        nutritionPlanning: 40000,
        analyticsInsights: 35000,
        perplexityResearch: 30000,
        standardOperations: 15000
      };
      
      let configValid = true;
      const issues = [];
      
      for (const [key, expectedValue] of Object.entries(expectedTimeouts)) {
        if (timeouts[key] !== expectedValue) {
          configValid = false;
          issues.push(`${key}: expected ${expectedValue}, found ${timeouts[key]}`);
        }
      }
      
      if (configValid) {
        this.addResult({
          test: 'Timeout Configuration',
          status: 'pass',
          message: 'All timeout values correctly configured',
          details: timeouts
        });
      } else {
        this.addResult({
          test: 'Timeout Configuration',
          status: 'fail',
          message: `Configuration issues: ${issues.join(', ')}`
        });
      }

    } catch (error) {
      this.addResult({
        test: 'Configuration',
        status: 'fail',
        message: `Configuration validation failed: ${error.message}`
      });
    }
  }

  addResult(result) {
    this.results.push(result);
    
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${result.test}: ${result.message}`);
    
    if (result.details && Array.isArray(result.details)) {
      console.log(`   Found: ${result.details.length} items`);
    } else if (result.details && typeof result.details === 'object') {
      console.log(`   Details:`, result.details);
    }
  }

  displayResults() {
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
    
    if (warnings > 0) {
      console.log('⚠️  Some warnings detected. These may not affect functionality but should be reviewed.');
    }
  }

  exitWithStatus() {
    const failed = this.results.filter(r => r.status === 'fail').length;
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run validation if script is executed directly
if (require.main === module) {
  console.log('🚀 Starting API Client Infrastructure Validation...');
  const validator = new APIClientValidator();
  validator.runValidation().catch((error) => {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  });
}

module.exports = { APIClientValidator };