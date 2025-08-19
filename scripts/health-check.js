#!/usr/bin/env node
/**
 * Health Check Script for trAIner App
 * Verifies backend connectivity and environment configuration
 */

// Load environment variables from the appropriate .env file
const fs = require('fs');
const path = require('path');

// Function to load environment variables
function loadEnvFile() {
  const envFiles = ['.env.local', '.env.development', '.env'];
  
  for (const envFile of envFiles) {
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      console.log(`📄 Loading environment from: ${envFile}`);
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      // Parse and set environment variables
      envContent.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
            if (!process.env[key]) { // Only set if not already set
              process.env[key] = value;
            }
          }
        }
      });
      break; // Use the first file found
    }
  }
}

// Load environment variables before proceeding
loadEnvFile();

const https = require('https');
const http = require('http');

class HealthChecker {
  constructor() {
    this.results = [];
  }

  async performHealthChecks() {
    console.log('🏥 Starting environment health checks...\n');
    
    await Promise.all([
      this.checkSupabaseConnection(),
      this.checkBackendAPI(),
      this.checkEnvironmentVariables(),
      this.checkNextJSConfiguration(),
    ]);

    this.displayResults();
    this.exitWithStatus();
  }

  async checkSupabaseConnection() {
    const startTime = Date.now();
    
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !anonKey) {
        this.addResult({
          service: 'Supabase',
          status: 'unhealthy',
          message: 'Missing Supabase environment variables',
          responseTime: Date.now() - startTime
        });
        return;
      }

      // Test Supabase connectivity
      const response = await this.makeRequest(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        }
      });

      if (response.status >= 200 && response.status < 400) {
        this.addResult({
          service: 'Supabase',
          status: 'healthy',
          message: 'Connection successful',
          responseTime: Date.now() - startTime
        });
      } else {
        this.addResult({
          service: 'Supabase',
          status: 'warning',
          message: `HTTP ${response.status} - Check configuration`,
          responseTime: Date.now() - startTime
        });
      }
    } catch (error) {
      this.addResult({
        service: 'Supabase',
        status: 'unhealthy',
        message: `Connection failed: ${error.message}`,
        responseTime: Date.now() - startTime
      });
    }
  }

  async checkBackendAPI() {
    const startTime = Date.now();
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await this.makeRequest(`${apiUrl}/health`);
      
      if (response.status >= 200 && response.status < 400) {
        this.addResult({
          service: 'Backend API',
          status: 'healthy',
          message: 'API server is responding',
          responseTime: Date.now() - startTime
        });
      } else {
        this.addResult({
          service: 'Backend API',
          status: 'warning',
          message: `HTTP ${response.status} - Backend may be down`,
          responseTime: Date.now() - startTime
        });
      }
    } catch (error) {
      this.addResult({
        service: 'Backend API',
        status: 'warning',
        message: `Backend not responding (expected in development): ${error.message}`,
        responseTime: Date.now() - startTime
      });
    }
  }

  async checkEnvironmentVariables() {
    const startTime = Date.now();
    
    const requiredVars = {
      'NEXT_PUBLIC_APP_ENV': process.env.NEXT_PUBLIC_APP_ENV,
      'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'NEXT_PUBLIC_SITE_URL': process.env.NEXT_PUBLIC_SITE_URL,
      'NODE_ENV': process.env.NODE_ENV,
    };

    const missing = [];
    const present = [];

    for (const [key, value] of Object.entries(requiredVars)) {
      if (!value) {
        missing.push(key);
      } else {
        present.push(key);
      }
    }

    if (missing.length === 0) {
      this.addResult({
        service: 'Environment Variables',
        status: 'healthy',
        message: `All ${present.length} required variables present`,
        responseTime: Date.now() - startTime,
        details: { present: present.length, missing: 0 }
      });
    } else {
      this.addResult({
        service: 'Environment Variables',
        status: 'unhealthy',
        message: `Missing ${missing.length} required variables: ${missing.join(', ')}`,
        responseTime: Date.now() - startTime,
        details: { present: present.length, missing: missing.length, missingVars: missing }
      });
    }
  }

  async checkNextJSConfiguration() {
    const startTime = Date.now();
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Check if next.config.mjs exists
      const configPath = path.join(process.cwd(), 'next.config.mjs');
      if (fs.existsSync(configPath)) {
        this.addResult({
          service: 'Next.js Config',
          status: 'healthy',
          message: 'next.config.mjs found and configured',
          responseTime: Date.now() - startTime
        });
      } else {
        this.addResult({
          service: 'Next.js Config',
          status: 'warning',
          message: 'next.config.mjs not found',
          responseTime: Date.now() - startTime
        });
      }
    } catch (error) {
      this.addResult({
        service: 'Next.js Config',
        status: 'unhealthy',
        message: `Configuration check failed: ${error.message}`,
        responseTime: Date.now() - startTime
      });
    }
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: 5000
      };

      const req = httpModule.request(requestOptions, (res) => {
        resolve({
          status: res.statusCode,
          headers: res.headers
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.setTimeout(5000);
      req.end();
    });
  }

  addResult(result) {
    this.results.push(result);
  }

  displayResults() {
    console.log('📊 Health Check Results:\n');
    console.log('═'.repeat(80));
    
    this.results.forEach(result => {
      const statusIcon = result.status === 'healthy' ? '✅' : 
                        result.status === 'warning' ? '⚠️' : '❌';
      
      console.log(`${statusIcon} ${result.service.padEnd(20)} | ${result.status.toUpperCase().padEnd(10)} | ${result.message}`);
      
      if (result.responseTime) {
        console.log(`   Response Time: ${result.responseTime}ms`);
      }
      
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details)}`);
      }
      
      console.log('─'.repeat(80));
    });
  }

  exitWithStatus() {
    const healthy = this.results.filter(r => r.status === 'healthy').length;
    const total = this.results.length;
    const hasUnhealthy = this.results.some(r => r.status === 'unhealthy');
    
    console.log(`\n🏥 Health Check Summary: ${healthy}/${total} services healthy`);
    
    if (hasUnhealthy) {
      console.log('❌ Some critical issues found. Please address them before proceeding.');
      process.exit(1);
    } else {
      console.log('✅ Environment setup verification complete!');
      process.exit(0);
    }
  }
}

// Run health checks
const checker = new HealthChecker();
checker.performHealthChecks().catch(error => {
  console.error('❌ Health check failed:', error);
  process.exit(1);
});