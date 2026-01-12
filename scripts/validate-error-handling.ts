#!/usr/bin/env node

/**
 * Error Handling Infrastructure Validation Script
 * Validates the complete error handling system is properly implemented
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: string[];
}

interface ValidationSuite {
  name: string;
  validations: ValidationResult[];
  passed: boolean;
  score: number;
}

class ErrorHandlingValidator {
  private projectRoot: string;
  private results: ValidationSuite[] = [];

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async validate(): Promise<void> {
    console.log('🔍 Validating Error Handling Infrastructure...\n');

    // Run all validation suites
    await this.validateFileStructure();
    await this.validateDependencies();
    await this.validateTypeDefinitions();
    await this.validateIntegration();
    await this.validateTests();
    await this.validateDocumentation();

    // Display results
    this.displayResults();
  }

  private async validateFileStructure(): Promise<void> {
    const suite: ValidationSuite = {
      name: 'File Structure',
      validations: [],
      passed: false,
      score: 0
    };

    const requiredFiles = [
      'components/error/error-provider.tsx',
      'components/error/api-error-display.tsx',
      'components/error/error-boundary.tsx',
      'components/error/fallback-ui.tsx',
      'components/ui/toast-provider.tsx',
      'utils/error/global-error-handler.ts',
      'utils/error/network-detector.ts',
      'hooks/use-error-recovery.ts',
      'app/api/errors/report/route.ts'
    ];

    for (const file of requiredFiles) {
      const filePath = join(this.projectRoot, file);
      const exists = existsSync(filePath);
      
      suite.validations.push({
        passed: exists,
        message: `${file} ${exists ? '✅' : '❌'}`,
        details: exists ? undefined : [`File not found: ${filePath}`]
      });
    }

    // Validate component exports
    const componentFiles = [
      'components/error/error-provider.tsx',
      'components/error/api-error-display.tsx',
      'components/error/fallback-ui.tsx'
    ];

    for (const file of componentFiles) {
      const content = this.readFileContent(file);
      if (content) {
        const hasExport = content.includes('export') && 
                         (content.includes('function') || content.includes('const'));
        
        suite.validations.push({
          passed: hasExport,
          message: `${file} has proper exports ${hasExport ? '✅' : '❌'}`,
          details: hasExport ? undefined : ['File missing proper component exports']
        });
      }
    }

    suite.passed = suite.validations.every(v => v.passed);
    suite.score = (suite.validations.filter(v => v.passed).length / suite.validations.length) * 100;
    this.results.push(suite);
  }

  private async validateDependencies(): Promise<void> {
    const suite: ValidationSuite = {
      name: 'Dependencies',
      validations: [],
      passed: false,
      score: 0
    };

    try {
      const packageJsonPath = join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      const requiredDeps = [
        'sonner',
        'lucide-react',
        '@tanstack/react-query'
      ];

      for (const dep of requiredDeps) {
        const hasDependendy = dependencies[dep] !== undefined;
        suite.validations.push({
          passed: hasDependendy,
          message: `${dep} dependency ${hasDependendy ? '✅' : '❌'}`,
          details: hasDependendy ? undefined : [`Missing dependency: ${dep}`]
        });
      }

      // Check for conflicting error handling libraries
      const conflictingDeps = ['react-error-boundary', 'react-toast-notifications'];
      for (const dep of conflictingDeps) {
        const hasConflict = dependencies[dep] !== undefined;
        suite.validations.push({
          passed: !hasConflict,
          message: `No conflicting ${dep} ${!hasConflict ? '✅' : '⚠️'}`,
          details: hasConflict ? [`Consider removing ${dep} to avoid conflicts`] : undefined
        });
      }

    } catch (error) {
      suite.validations.push({
        passed: false,
        message: 'package.json validation ❌',
        details: [`Error reading package.json: ${error}`]
      });
    }

    suite.passed = suite.validations.every(v => v.passed);
    suite.score = (suite.validations.filter(v => v.passed).length / suite.validations.length) * 100;
    this.results.push(suite);
  }

  private async validateTypeDefinitions(): Promise<void> {
    const suite: ValidationSuite = {
      name: 'Type Definitions',
      validations: [],
      passed: false,
      score: 0
    };

    const typeFiles = [
      'utils/error/global-error-handler.ts',
      'utils/error/network-detector.ts',
      'hooks/use-error-recovery.ts'
    ];

    for (const file of typeFiles) {
      const content = this.readFileContent(file);
      if (content) {
        // Check for proper TypeScript interfaces
        const hasInterfaces = content.includes('interface') || content.includes('type');
        const hasExports = content.includes('export interface') || content.includes('export type');
        
        suite.validations.push({
          passed: hasInterfaces && hasExports,
          message: `${file} has proper type definitions ${hasInterfaces && hasExports ? '✅' : '❌'}`,
          details: (!hasInterfaces || !hasExports) ? ['Missing or incomplete type definitions'] : undefined
        });

        // Check for error-specific types
        const hasErrorTypes = content.includes('Error') && 
                             (content.includes('AppError') || 
                              content.includes('ApiError') || 
                              content.includes('NetworkError'));
        
        suite.validations.push({
          passed: hasErrorTypes,
          message: `${file} defines error types ${hasErrorTypes ? '✅' : '❌'}`,
          details: hasErrorTypes ? undefined : ['Missing error-specific type definitions']
        });
      }
    }

    suite.passed = suite.validations.every(v => v.passed);
    suite.score = (suite.validations.filter(v => v.passed).length / suite.validations.length) * 100;
    this.results.push(suite);
  }

  private async validateIntegration(): Promise<void> {
    const suite: ValidationSuite = {
      name: 'Integration',
      validations: [],
      passed: false,
      score: 0
    };

    // Check providers integration
    const providersFile = 'components/providers/index.tsx';
    const providersContent = this.readFileContent(providersFile);
    
    if (providersContent) {
      const hasErrorProvider = providersContent.includes('ErrorProvider');
      const hasToastProvider = providersContent.includes('ToastProvider');
      
      suite.validations.push({
        passed: hasErrorProvider,
        message: `ErrorProvider integrated ${hasErrorProvider ? '✅' : '❌'}`,
        details: hasErrorProvider ? undefined : ['ErrorProvider not found in providers']
      });

      suite.validations.push({
        passed: hasToastProvider,
        message: `ToastProvider integrated ${hasToastProvider ? '✅' : '❌'}`,
        details: hasToastProvider ? undefined : ['ToastProvider not found in providers']
      });
    }

    // Check API error reporting endpoint
    const errorReportFile = 'app/api/errors/report/route.ts';
    const errorReportContent = this.readFileContent(errorReportFile);
    
    if (errorReportContent) {
      const hasPostHandler = errorReportContent.includes('export async function POST');
      const hasRateLimit = errorReportContent.includes('rate') && errorReportContent.includes('limit');
      
      suite.validations.push({
        passed: hasPostHandler,
        message: `Error reporting endpoint ${hasPostHandler ? '✅' : '❌'}`,
        details: hasPostHandler ? undefined : ['Missing POST handler for error reporting']
      });

      suite.validations.push({
        passed: hasRateLimit,
        message: `Rate limiting implemented ${hasRateLimit ? '✅' : '❌'}`,
        details: hasRateLimit ? undefined : ['Missing rate limiting for error reports']
      });
    }

    // Check hook integration
    const hooks = ['use-error-recovery.ts'];
    for (const hook of hooks) {
      const content = this.readFileContent(`hooks/${hook}`);
      if (content) {
        const hasHookPattern = content.includes('use') && content.includes('export function');
        
        suite.validations.push({
          passed: hasHookPattern,
          message: `${hook} follows hook patterns ${hasHookPattern ? '✅' : '❌'}`,
          details: hasHookPattern ? undefined : ['Hook does not follow React hook patterns']
        });
      }
    }

    suite.passed = suite.validations.every(v => v.passed);
    suite.score = (suite.validations.filter(v => v.passed).length / suite.validations.length) * 100;
    this.results.push(suite);
  }

  private async validateTests(): Promise<void> {
    const suite: ValidationSuite = {
      name: 'Test Coverage',
      validations: [],
      passed: false,
      score: 0
    };

    const testFiles = [
      '__tests__/error-handling/error-boundary.test.tsx',
      '__tests__/error-handling/api-error-display.test.tsx',
      '__tests__/error-handling/global-error-handler.test.ts',
      '__tests__/error-handling/network-detector.test.ts',
      '__tests__/error-handling/error-recovery.test.ts',
      '__tests__/error-handling/error-handling-integration.test.tsx'
    ];

    for (const testFile of testFiles) {
      const exists = existsSync(join(this.projectRoot, testFile));
      
      suite.validations.push({
        passed: exists,
        message: `${testFile} ${exists ? '✅' : '❌'}`,
        details: exists ? undefined : [`Test file not found: ${testFile}`]
      });

      if (exists) {
        const content = this.readFileContent(testFile);
        if (content) {
          const hasDescribe = content.includes('describe(');
          const hasTest = content.includes('test(') || content.includes('it(');
          
          suite.validations.push({
            passed: hasDescribe && hasTest,
            message: `${testFile} has proper test structure ${hasDescribe && hasTest ? '✅' : '❌'}`,
            details: (!hasDescribe || !hasTest) ? ['Missing describe blocks or test cases'] : undefined
          });
        }
      }
    }

    // Try to run tests if Jest is available
    try {
      execSync('npm test -- --testPathPattern=error-handling --passWithNoTests --silent', { 
        cwd: this.projectRoot,
        stdio: 'pipe'
      });
      
      suite.validations.push({
        passed: true,
        message: 'Error handling tests pass ✅'
      });
    } catch (error) {
      suite.validations.push({
        passed: false,
        message: 'Error handling tests ❌',
        details: [`Test execution failed: ${error}`]
      });
    }

    suite.passed = suite.validations.every(v => v.passed);
    suite.score = (suite.validations.filter(v => v.passed).length / suite.validations.length) * 100;
    this.results.push(suite);
  }

  private async validateDocumentation(): Promise<void> {
    const suite: ValidationSuite = {
      name: 'Documentation',
      validations: [],
      passed: false,
      score: 0
    };

    const docFile = 'docs/frontend-integration/01-core-concepts/error-handling-patterns.md';
    const docExists = existsSync(join(this.projectRoot, docFile));
    
    suite.validations.push({
      passed: docExists,
      message: `Error handling documentation ${docExists ? '✅' : '❌'}`,
      details: docExists ? undefined : [`Documentation not found: ${docFile}`]
    });

    if (docExists) {
      const content = this.readFileContent(docFile);
      if (content) {
        const sections = [
          'Error Boundary',
          'Global Error Handler',
          'Network Detection',
          'Error Recovery',
          'Toast Notifications'
        ];

        for (const section of sections) {
          const hasSection = content.toLowerCase().includes(section.toLowerCase());
          
          suite.validations.push({
            passed: hasSection,
            message: `Documentation covers ${section} ${hasSection ? '✅' : '❌'}`,
            details: hasSection ? undefined : [`Missing documentation for ${section}`]
          });
        }
      }
    }

    // Check for inline documentation in components
    const componentFiles = [
      'components/error/error-provider.tsx',
      'utils/error/global-error-handler.ts'
    ];

    for (const file of componentFiles) {
      const content = this.readFileContent(file);
      if (content) {
        const hasJSDoc = content.includes('/**') && content.includes('*/');
        
        suite.validations.push({
          passed: hasJSDoc,
          message: `${file} has JSDoc comments ${hasJSDoc ? '✅' : '❌'}`,
          details: hasJSDoc ? undefined : ['Missing JSDoc documentation']
        });
      }
    }

    suite.passed = suite.validations.every(v => v.passed);
    suite.score = (suite.validations.filter(v => v.passed).length / suite.validations.length) * 100;
    this.results.push(suite);
  }

  private readFileContent(relativePath: string): string | null {
    try {
      const filePath = join(this.projectRoot, relativePath);
      return readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  private displayResults(): void {
    console.log('📊 Error Handling Validation Results\n');
    console.log('=' .repeat(60));

    let overallScore = 0;
    let totalValidations = 0;
    let totalPassed = 0;

    for (const suite of this.results) {
      console.log(`\n${suite.name}: ${suite.passed ? '✅' : '❌'} (${suite.score.toFixed(1)}%)`);
      console.log('-'.repeat(40));

      for (const validation of suite.validations) {
        console.log(`  ${validation.message}`);
        
        if (validation.details) {
          for (const detail of validation.details) {
            console.log(`    ↳ ${detail}`);
          }
        }
      }

      overallScore += suite.score;
      totalValidations += suite.validations.length;
      totalPassed += suite.validations.filter(v => v.passed).length;
    }

    const averageScore = overallScore / this.results.length;
    const passRate = (totalPassed / totalValidations) * 100;

    console.log('\n' + '='.repeat(60));
    console.log(`Overall Score: ${averageScore.toFixed(1)}%`);
    console.log(`Tests Passed: ${totalPassed}/${totalValidations} (${passRate.toFixed(1)}%)`);

    if (averageScore >= 90) {
      console.log('🎉 Excellent! Error handling infrastructure is well implemented.');
    } else if (averageScore >= 75) {
      console.log('👍 Good! Minor improvements needed.');
    } else if (averageScore >= 60) {
      console.log('⚠️  Warning! Significant improvements required.');
    } else {
      console.log('❌ Critical! Error handling infrastructure needs major work.');
    }

    // Exit with appropriate code
    process.exit(averageScore >= 75 ? 0 : 1);
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ErrorHandlingValidator();
  validator.validate().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

export { ErrorHandlingValidator };