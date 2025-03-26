#!/usr/bin/env node

// This script checks if the installed Node.js version is compatible with the application
// It can be used as a pre-requisite check before running the application or during installation

const { execSync } = require('child_process');
const path = require('path');

const MIN_NODE_VERSION = '18.17.0';

// ANSI color codes for terminal output
const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

/**
 * Check if Node.js is installed
 * @returns {boolean} True if Node.js is installed, false otherwise
 */
function isNodeInstalled() {
  try {
    execSync('node --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the current Node.js version
 * @returns {string|null} The current Node.js version or null if not installed
 */
function getNodeVersion() {
  try {
    const stdout = execSync('node --version', { encoding: 'utf8', stdio: 'pipe' });
    // Node version output is typically in the format 'v18.17.0'
    // Remove the leading 'v' and trim whitespace
    return stdout.replace(/^v/, '').trim();
  } catch (error) {
    return null;
  }
}

/**
 * Compare two semantic version strings
 * @param {string} version1 - First version string (e.g., '18.17.0')
 * @param {string} version2 - Second version string (e.g., '18.17.0')
 * @returns {number} -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
function compareVersions(version1, version2) {
  const parts1 = version1.split('.').map(Number);
  const parts2 = version2.split('.').map(Number);
  
  // Compare major, minor, and patch versions
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }
  
  return 0; // Versions are equal
}

/**
 * Checks if the installed Node.js version meets the minimum required version
 * @param {string} minVersion - Minimum required version
 * @returns {boolean} True if the installed version meets requirements, false otherwise
 */
function meetsVersionRequirement(minVersion) {
  const currentVersion = getNodeVersion();
  
  if (!currentVersion) {
    return false; // Node.js is not installed
  }
  
  return compareVersions(currentVersion, minVersion) >= 0;
}

/**
 * Logs a colored message to the console
 * @param {string} message - The message to log
 * @param {string} color - The color to use (from COLORS)
 */
function logColored(message, color) {
  console.log(`${color}${message}${COLORS.reset}`);
}

/**
 * Main function to check Node.js compatibility
 */
function main() {
  console.log('\nChecking Node.js compatibility...\n');
  
  if (!isNodeInstalled()) {
    logColored(`❌ Node.js is not installed on this system.`, COLORS.red);
    logColored(`   Please install Node.js version ${MIN_NODE_VERSION} or higher.`, COLORS.yellow);
    process.exit(1);
  }
  
  const version = getNodeVersion();
  
  if (!meetsVersionRequirement(MIN_NODE_VERSION)) {
    logColored(`⚠️  Node.js version ${version} is below the required minimum version ${MIN_NODE_VERSION}.`, COLORS.yellow);
    logColored(`   Please upgrade to Node.js version ${MIN_NODE_VERSION} or higher.`, COLORS.yellow);
    process.exit(1);
  }
  
  logColored(`✅ Node.js version ${version} is compatible with this application.`, COLORS.green);
  process.exit(0);
}

// Run the script
main(); 