#!/usr/bin/env node

/**
 * Script to start the backend server for E2E testing
 * This ensures the backend is running with the correct test environment
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting backend server for E2E tests...');

// Check if backend directory exists
const backendDir = path.join(__dirname, '..', 'backend');
if (!fs.existsSync(backendDir)) {
  console.error('❌ Backend directory not found:', backendDir);
  process.exit(1);
}

// Check if backend package.json exists
const backendPackageJson = path.join(backendDir, 'package.json');
if (!fs.existsSync(backendPackageJson)) {
  console.error('❌ Backend package.json not found:', backendPackageJson);
  process.exit(1);
}

// Start the backend server
const backendProcess = spawn('npm', ['run', 'dev'], {
  cwd: backendDir,
  stdio: ['inherit', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_ENV: 'test',  // Use test mode for consistent E2E environment configuration
    PORT: process.env.BACKEND_PORT || '8000'
  }
});

// Handle backend stdout
backendProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[BACKEND] ${output.trim()}`);
  
  // Check if server is ready
  if (output.includes('Server running on port') || output.includes('listening on')) {
    console.log('✅ Backend server is ready for E2E tests');
  }
});

// Handle backend stderr
backendProcess.stderr.on('data', (data) => {
  const output = data.toString();
  console.error(`[BACKEND ERROR] ${output.trim()}`);
});

// Handle backend process exit
backendProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Backend process exited with code ${code}`);
    process.exit(1);
  }
  console.log('✅ Backend server stopped');
});

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping backend server...');
  backendProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping backend server...');
  backendProcess.kill('SIGTERM');
});

// Keep the script running
process.stdin.resume();
