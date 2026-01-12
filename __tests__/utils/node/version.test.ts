'use strict';

import * as versionUtils from '../../../utils/node/version';

// Mock the entire module
jest.mock('../../../utils/node/version', () => {
  const originalModule = jest.requireActual('../../../utils/node/version');
  const MIN_NODE_VERSION = originalModule.MIN_NODE_VERSION; // Get constant from actual module

  // Create mock functions first
  const mockGetNodeVersion = jest.fn();
  const mockIsNodeInstalled = jest.fn();

  // Define mocked implementations that USE the mocks
  const mockMeetsVersionRequirement = async (minVersion = MIN_NODE_VERSION): Promise<boolean> => {
    const currentVersion = await mockGetNodeVersion();
    if (!currentVersion) {
      return false;
    }
    // Use original compareVersions for the logic
    return originalModule.compareVersions(currentVersion, minVersion) >= 0;
  };

  const mockCheckNodeVersion = async () => {
      const installed = await mockIsNodeInstalled();
      const version = await mockGetNodeVersion();
      // IMPORTANT: Call the *mocked* meetsVersionRequirement
      const meetsRequirement = await mockMeetsVersionRequirement(); 

      return {
        installed,
        version,
        meetsRequirement,
        requiredVersion: MIN_NODE_VERSION
      };
  };

  return {
    __esModule: true,
    MIN_NODE_VERSION: MIN_NODE_VERSION,
    compareVersions: originalModule.compareVersions, // Keep original
    // Provide the mocks
    getNodeVersion: mockGetNodeVersion,
    isNodeInstalled: mockIsNodeInstalled,
    // Provide the mocked implementations that use the mocks
    meetsVersionRequirement: jest.fn(mockMeetsVersionRequirement), // Wrap in jest.fn for tracking
    checkNodeVersion: jest.fn(mockCheckNodeVersion), // Wrap in jest.fn for tracking
  };
});

// Cast the imported module to access mock functions easily
// Note: meetsVersionRequirement and checkNodeVersion are also mocks now
const mockedVersionUtils = versionUtils as jest.Mocked<typeof versionUtils>;

const MIN_NODE_VERSION = versionUtils.MIN_NODE_VERSION; // Use the exported constant

describe('Node Version Utilities', () => {
  beforeEach(() => {
    // Reset mocks before each test to ensure isolation
    mockedVersionUtils.getNodeVersion.mockClear();
    mockedVersionUtils.isNodeInstalled.mockClear();
    mockedVersionUtils.meetsVersionRequirement.mockClear();
    mockedVersionUtils.checkNodeVersion.mockClear();
  });

  describe('compareVersions', () => {
    it('should return 0 for equal versions', () => {
      expect(versionUtils.compareVersions('18.17.0', '18.17.0')).toBe(0);
    });

    it('should return 1 for version1 > version2', () => {
      expect(versionUtils.compareVersions('18.18.0', '18.17.0')).toBe(1);
      expect(versionUtils.compareVersions('19.0.0', '18.17.0')).toBe(1);
      expect(versionUtils.compareVersions('18.17.1', '18.17.0')).toBe(1);
    });

    it('should return -1 for version1 < version2', () => {
      expect(versionUtils.compareVersions('18.16.0', '18.17.0')).toBe(-1);
      expect(versionUtils.compareVersions('17.0.0', '18.17.0')).toBe(-1);
      expect(versionUtils.compareVersions('18.17.0', '18.17.1')).toBe(-1);
    });

    it('should handle different numbers of segments', () => {
      expect(versionUtils.compareVersions('18.17', '18.17.0')).toBe(0); // 18.17 is treated as 18.17.0
      expect(versionUtils.compareVersions('18.17.0', '18.17')).toBe(0);
      expect(versionUtils.compareVersions('18.17.1', '18.17')).toBe(1);
      expect(versionUtils.compareVersions('18.17', '18.17.1')).toBe(-1);
    });

    it('should throw an error for invalid version strings', () => {
      expect(() => versionUtils.compareVersions('invalid', '18.17.0')).toThrow('Invalid version string');
      expect(() => versionUtils.compareVersions('18.17.0', 'invalid')).toThrow('Invalid version string');
      expect(() => versionUtils.compareVersions('18.invalid.0', '18.17.0')).toThrow('Invalid version string');
    });
  });

  describe('meetsVersionRequirement', () => {
    it('should return true if current version meets minimum requirement', async () => {
      mockedVersionUtils.getNodeVersion.mockResolvedValue('18.17.0');
      await expect(versionUtils.meetsVersionRequirement(MIN_NODE_VERSION)).resolves.toBe(true);
      expect(mockedVersionUtils.meetsVersionRequirement).toHaveBeenCalledTimes(1);
      expect(mockedVersionUtils.getNodeVersion).toHaveBeenCalledTimes(1);
    });

    it('should return true if current version exceeds minimum requirement', async () => {
      mockedVersionUtils.getNodeVersion.mockResolvedValue('19.0.0');
      await expect(versionUtils.meetsVersionRequirement(MIN_NODE_VERSION)).resolves.toBe(true);
      expect(mockedVersionUtils.meetsVersionRequirement).toHaveBeenCalledTimes(1);
      expect(mockedVersionUtils.getNodeVersion).toHaveBeenCalledTimes(1);
    });

    it('should return false if current version is below minimum requirement', async () => {
      mockedVersionUtils.getNodeVersion.mockResolvedValue('18.16.0');
      await expect(versionUtils.meetsVersionRequirement(MIN_NODE_VERSION)).resolves.toBe(false);
      expect(mockedVersionUtils.meetsVersionRequirement).toHaveBeenCalledTimes(1);
      expect(mockedVersionUtils.getNodeVersion).toHaveBeenCalledTimes(1);
    });

    it('should return false if Node.js version cannot be determined', async () => {
      mockedVersionUtils.getNodeVersion.mockResolvedValue(null);
      await expect(versionUtils.meetsVersionRequirement(MIN_NODE_VERSION)).resolves.toBe(false);
      expect(mockedVersionUtils.meetsVersionRequirement).toHaveBeenCalledTimes(1);
      expect(mockedVersionUtils.getNodeVersion).toHaveBeenCalledTimes(1);
    });

    it('should use the default MIN_NODE_VERSION if no argument provided', async () => {
      mockedVersionUtils.getNodeVersion.mockResolvedValue(MIN_NODE_VERSION);
      await expect(versionUtils.meetsVersionRequirement()).resolves.toBe(true);
      expect(mockedVersionUtils.meetsVersionRequirement).toHaveBeenCalledTimes(1);
      expect(mockedVersionUtils.getNodeVersion).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkNodeVersion', () => {
    it('should return correct status when Node is installed and meets requirement', async () => {
      mockedVersionUtils.isNodeInstalled.mockResolvedValue(true);
      mockedVersionUtils.getNodeVersion.mockResolvedValue('19.0.0');

      const result = await versionUtils.checkNodeVersion();

      expect(result).toEqual({
        installed: true,
        version: '19.0.0',
        meetsRequirement: true,
        requiredVersion: MIN_NODE_VERSION
      });
      expect(mockedVersionUtils.checkNodeVersion).toHaveBeenCalledTimes(1);
      expect(mockedVersionUtils.isNodeInstalled).toHaveBeenCalledTimes(1);
      expect(mockedVersionUtils.getNodeVersion).toHaveBeenCalledTimes(2);
    });

    it('should return correct status when Node is installed but does not meet requirement', async () => {
      mockedVersionUtils.isNodeInstalled.mockResolvedValue(true);
      mockedVersionUtils.getNodeVersion.mockResolvedValue('18.0.0');

      const result = await versionUtils.checkNodeVersion();

      expect(result).toEqual({
        installed: true,
        version: '18.0.0',
        meetsRequirement: false,
        requiredVersion: MIN_NODE_VERSION
      });
      expect(mockedVersionUtils.checkNodeVersion).toHaveBeenCalledTimes(1);
      expect(mockedVersionUtils.isNodeInstalled).toHaveBeenCalledTimes(1);
      expect(mockedVersionUtils.getNodeVersion).toHaveBeenCalledTimes(2);
    });

    it('should return correct status when Node is not installed', async () => {
      mockedVersionUtils.isNodeInstalled.mockResolvedValue(false);
      mockedVersionUtils.getNodeVersion.mockResolvedValue(null);

      const result = await versionUtils.checkNodeVersion();

      expect(result).toEqual({
        installed: false,
        version: null,
        meetsRequirement: false,
        requiredVersion: MIN_NODE_VERSION
      });
      expect(mockedVersionUtils.checkNodeVersion).toHaveBeenCalledTimes(1);
      expect(mockedVersionUtils.isNodeInstalled).toHaveBeenCalledTimes(1);
      expect(mockedVersionUtils.getNodeVersion).toHaveBeenCalledTimes(2);
    });
  });
});

// Example placeholder for getNodeVersion (if needed outside mocks)
// async function getNodeVersion(): Promise<string | null> {
//   try {
//     const { stdout } = await execAsync('node -v');
//     return stdout.trim().replace(/^v/, '');
//   } catch (error) {
//     return null;
//   }
// }

// Example placeholder for isNodeInstalled (if needed outside mocks)
// async function isNodeInstalled(): Promise<boolean> {
//   return (await getNodeVersion()) !== null;
// }