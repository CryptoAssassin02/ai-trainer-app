import { checkNodeVersion, MIN_NODE_VERSION } from './version';

/**
 * Enum representing different environment status values
 */
export enum EnvironmentStatus {
  COMPATIBLE = 'compatible',
  NODE_NOT_INSTALLED = 'node-not-installed',
  VERSION_TOO_LOW = 'version-too-low',
  UNKNOWN = 'unknown',
}

/**
 * Interface for environment check result
 */
export interface EnvironmentCheckResult {
  status: EnvironmentStatus;
  version: string | null;
  minVersion: string;
  message: string;
}

/**
 * Checks if the current Node.js environment is compatible with the application
 * @returns A promise that resolves to an EnvironmentCheckResult
 */
export async function checkEnvironment(): Promise<EnvironmentCheckResult> {
  try {
    const nodeCheck = await checkNodeVersion();
    
    if (!nodeCheck.installed) {
      return {
        status: EnvironmentStatus.NODE_NOT_INSTALLED,
        version: null,
        minVersion: MIN_NODE_VERSION,
        message: 'Node.js is not installed on this system.'
      };
    }
    
    if (!nodeCheck.meetsRequirement) {
      return {
        status: EnvironmentStatus.VERSION_TOO_LOW,
        version: nodeCheck.version,
        minVersion: MIN_NODE_VERSION,
        message: `Node.js version ${nodeCheck.version} is below the required minimum version ${MIN_NODE_VERSION}.`
      };
    }
    
    return {
      status: EnvironmentStatus.COMPATIBLE,
      version: nodeCheck.version,
      minVersion: MIN_NODE_VERSION,
      message: `Node.js version ${nodeCheck.version} is compatible with this application.`
    };
  } catch (error) {
    return {
      status: EnvironmentStatus.UNKNOWN,
      version: null,
      minVersion: MIN_NODE_VERSION,
      message: `Unable to determine Node.js environment status: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Checks if the current Node.js environment is compatible and provides a formatted message
 * @returns A promise that resolves to a formatted message string
 */
export async function getEnvironmentStatusMessage(): Promise<string> {
  const check = await checkEnvironment();
  
  switch (check.status) {
    case EnvironmentStatus.COMPATIBLE:
      return `✅ ${check.message}`;
    case EnvironmentStatus.NODE_NOT_INSTALLED:
      return `❌ ${check.message} Please install Node.js version ${check.minVersion} or higher.`;
    case EnvironmentStatus.VERSION_TOO_LOW:
      return `⚠️ ${check.message} Please upgrade to Node.js version ${check.minVersion} or higher.`;
    case EnvironmentStatus.UNKNOWN:
    default:
      return `❓ ${check.message}`;
  }
} 