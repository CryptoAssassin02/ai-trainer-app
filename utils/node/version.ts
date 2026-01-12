import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Minimum required Node.js version for the application
 */
export const MIN_NODE_VERSION = '18.17.0';

/**
 * Checks if Node.js is installed on the system
 * @returns A promise that resolves to true if Node.js is installed, false otherwise
 */
export async function isNodeInstalled(): Promise<boolean> {
  try {
    await execAsync('node --version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Gets the current Node.js version
 * @returns A promise that resolves to the current Node.js version or null if not installed
 */
export async function getNodeVersion(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('node --version');
    // Node version output is typically in the format 'v18.17.0'
    // Remove the leading 'v' and trim whitespace
    return stdout.replace(/^v/, '').trim();
  } catch (error) {
    return null;
  }
}

/**
 * Compares two semantic version strings
 * @param version1 - First version string (e.g., '18.17.0')
 * @param version2 - Second version string (e.g., '18.17.0')
 * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
export function compareVersions(v1: string, v2: string): number {
  const segments1 = v1.split('.').map(Number);
  const segments2 = v2.split('.').map(Number);

  // Check for NaN which indicates a parsing failure (invalid segment)
  if (segments1.some(isNaN) || segments2.some(isNaN)) {
    throw new Error('Invalid version string');
  }

  const len = Math.max(segments1.length, segments2.length);
  for (let i = 0; i < len; i++) {
    const s1 = segments1[i] || 0;
    const s2 = segments2[i] || 0;
    if (s1 < s2) return -1;
    if (s1 > s2) return 1;
  }
  return 0;
}

/**
 * Checks if the installed Node.js version meets the minimum required version
 * @param minVersion - Minimum required version (defaults to MIN_NODE_VERSION)
 * @returns A promise that resolves to true if the installed version meets requirements, false otherwise
 */
export async function meetsVersionRequirement(minVersion = MIN_NODE_VERSION): Promise<boolean> {
  const currentVersion = await getNodeVersion();
  
  if (!currentVersion) {
    return false; // Node.js is not installed
  }
  
  return compareVersions(currentVersion, minVersion) >= 0;
}

/**
 * Comprehensive Node.js version check that returns detailed status
 * @returns A promise that resolves to an object with the check status and details
 */
export async function checkNodeVersion(): Promise<{
  installed: boolean;
  version: string | null;
  meetsRequirement: boolean;
  requiredVersion: string;
}> {
  const installed = await isNodeInstalled();
  const version = await getNodeVersion();
  const meetsRequirement = await meetsVersionRequirement();
  
  return {
    installed,
    version,
    meetsRequirement,
    requiredVersion: MIN_NODE_VERSION
  };
} 