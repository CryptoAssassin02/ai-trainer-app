#!/usr/bin/env node

/**
 * E2E Test Teardown Script
 * Stops all services used in E2E testing:
 * 1. Backend server (if running)
 * 2. Supabase local instance
 */

const { exec } = require('child_process');
const path = require('path');

console.log('🛑 Starting E2E test environment teardown...');

let completed = 0;
const totalTasks = 2;

function checkCompletion() {
  completed++;
  if (completed >= totalTasks) {
    console.log('✅ E2E environment teardown completed');
    process.exit(0);
  }
}

// Stop any running backend processes
console.log('🖥️ Stopping backend server...');
exec('pkill -f "nodemon server.js" || pkill -f "node server.js"', (error, stdout, stderr) => {
  if (error && !error.message.includes('No matching processes')) {
    console.error('Error stopping backend:', error.message);
  } else {
    console.log('✅ Backend server stopped (or was not running)');
  }
  checkCompletion();
});

// Stop Supabase
console.log('📡 Stopping Supabase local instance...');
exec('npx supabase stop', { 
  cwd: path.join(__dirname, '..', 'backend') 
}, (error, stdout, stderr) => {
  if (error) {
    console.error('Error stopping Supabase:', error.message);
  } else {
    console.log('✅ Supabase stopped');
  }
  checkCompletion();
});

// Set a timeout to ensure the script doesn't hang
setTimeout(() => {
  console.log('⏰ Teardown timeout reached, exiting...');
  process.exit(0);
}, 15000); // 15 second timeout
