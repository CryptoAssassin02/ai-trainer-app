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
export function compareVersions(version1: string, version2: string): number {
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