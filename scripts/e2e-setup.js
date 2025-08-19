#!/usr/bin/env node

/**
 * E2E Test Setup Script
 * Starts all required services for E2E testing:
 * 1. Supabase local instance
 * 2. Backend server
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting E2E test environment setup...');

let supabaseReady = false;
let backendReady = false;
const services = [];

// Function to check if all services are ready
function checkAllServicesReady() {
  if (supabaseReady && backendReady) {
    console.log('✅ All services are ready for E2E testing!');
    console.log('📝 You can now run: npm run e2e:quick');
  }
}

// Start Supabase
console.log('📡 Starting Supabase local instance...');
const supabaseProcess = spawn('npx', ['supabase', 'start'], {
  cwd: path.join(__dirname, '..', 'backend'),
  stdio: ['inherit', 'pipe', 'pipe']
});

services.push(supabaseProcess);

supabaseProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[SUPABASE] ${output.trim()}`);
  
  // Check if Supabase is ready
  if (output.includes('Started supabase local development setup') || 
      output.includes('Local development setup is running') ||
      output.includes('API URL:')) {
    console.log('✅ Supabase is ready');
    supabaseReady = true;
    checkAllServicesReady();
  }
});

supabaseProcess.stderr.on('data', (data) => {
  const output = data.toString();
  console.error(`[SUPABASE ERROR] ${output.trim()}`);
});

supabaseProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Supabase process exited with code ${code}`);
  }
});

// Wait a moment for Supabase to start, then start backend
setTimeout(() => {
  console.log('🖥️ Starting backend server...');
  
  // Check if backend directory exists
  const backendDir = path.join(__dirname, '..', 'backend');
  if (!fs.existsSync(backendDir)) {
    console.error('❌ Backend directory not found:', backendDir);
    process.exit(1);
  }

  const backendProcess = spawn('npm', ['run', 'dev'], {
    cwd: backendDir,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: process.env.BACKEND_PORT || '8000'
    }
  });

  services.push(backendProcess);

  backendProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[BACKEND] ${output.trim()}`);
    
    // Check if backend is ready
    if (output.includes('Server running on port') || 
        output.includes('listening on') ||
        output.includes('server started')) {
      console.log('✅ Backend server is ready');
      backendReady = true;
      checkAllServicesReady();
    }
  });

  backendProcess.stderr.on('data', (data) => {
    const output = data.toString();
    console.error(`[BACKEND ERROR] ${output.trim()}`);
  });

  backendProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Backend process exited with code ${code}`);
    }
  });
}, 3000); // Wait 3 seconds for Supabase to start

// Handle script termination
function cleanup() {
  console.log('\n🛑 Cleaning up services...');
  services.forEach(service => {
    if (service && !service.killed) {
      service.kill('SIGINT');
    }
  });
  
  // Also stop Supabase explicitly
  exec('npx supabase stop', { cwd: path.join(__dirname, '..', 'backend') }, (error) => {
    if (error) {
      console.error('Error stopping Supabase:', error.message);
    } else {
      console.log('✅ Supabase stopped');
    }
    process.exit(0);
  });
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Keep the script running
process.stdin.resume();
