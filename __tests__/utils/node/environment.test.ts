import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as versionUtils from '../../../utils/node/version';
import { 
  checkEnvironment, 
  getEnvironmentStatusMessage, 
  EnvironmentStatus 
} from '../../../utils/node/environment';

// Mock the version utility functions
vi.mock('../../../utils/node/version', () => ({
  checkNodeVersion: vi.fn(),
  MIN_NODE_VERSION: '18.17.0'
}));

describe('Node.js Environment Utility', () => {
  // Get the mocked function
  const mockCheckNodeVersion = versionUtils.checkNodeVersion as ReturnType<typeof vi.fn>;
  
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('checkEnvironment', () => {
    it('should return COMPATIBLE status when Node.js version meets requirements', async () => {
      // Mock compatible version
      mockCheckNodeVersion.mockResolvedValue({
        installed: true,
        version: '20.0.0',
        meetsRequirement: true,
        requiredVersion: '18.17.0'
      });

      const result = await checkEnvironment();
      
      expect(result.status).toBe(EnvironmentStatus.COMPATIBLE);
      expect(result.version).toBe('20.0.0');
      expect(result.message).toContain('compatible');
    });

    it('should return NODE_NOT_INSTALLED status when Node.js is not installed', async () => {
      // Mock Node.js not installed
      mockCheckNodeVersion.mockResolvedValue({
        installed: false,
        version: null,
        meetsRequirement: false,
        requiredVersion: '18.17.0'
      });

      const result = await checkEnvironment();
      
      expect(result.status).toBe(EnvironmentStatus.NODE_NOT_INSTALLED);
      expect(result.version).toBeNull();
      expect(result.message).toContain('not installed');
    });

    it('should return VERSION_TOO_LOW status when Node.js version is below required', async () => {
      // Mock older version
      mockCheckNodeVersion.mockResolvedValue({
        installed: true,
        version: '16.0.0',
        meetsRequirement: false,
        requiredVersion: '18.17.0'
      });

      const result = await checkEnvironment();
      
      expect(result.status).toBe(EnvironmentStatus.VERSION_TOO_LOW);
      expect(result.version).toBe('16.0.0');
      expect(result.message).toContain('below the required minimum');
    });

    it('should return UNKNOWN status when an error occurs', async () => {
      // Mock function throwing an error
      mockCheckNodeVersion.mockRejectedValue(new Error('Test error'));

      const result = await checkEnvironment();
      
      expect(result.status).toBe(EnvironmentStatus.UNKNOWN);
      expect(result.version).toBeNull();
      expect(result.message).toContain('Test error');
    });
  });

  describe('getEnvironmentStatusMessage', () => {
    it('should return successful message with checkmark when compatible', async () => {
      // Mock compatible version
      mockCheckNodeVersion.mockResolvedValue({
        installed: true,
        version: '20.0.0',
        meetsRequirement: true,
        requiredVersion: '18.17.0'
      });

      const message = await getEnvironmentStatusMessage();
      
      expect(message).toMatch(/^✅/);
      expect(message).toContain('compatible');
    });

    it('should return error message with X when Node.js is not installed', async () => {
      // Mock Node.js not installed
      mockCheckNodeVersion.mockResolvedValue({
        installed: false,
        version: null,
        meetsRequirement: false,
        requiredVersion: '18.17.0'
      });

      const message = await getEnvironmentStatusMessage();
      
      expect(message).toMatch(/^❌/);
      expect(message).toContain('not installed');
      expect(message).toContain('Please install');
    });

    it('should return warning message with warning sign when version is too low', async () => {
      // Mock older version
      mockCheckNodeVersion.mockResolvedValue({
        installed: true,
        version: '16.0.0',
        meetsRequirement: false,
        requiredVersion: '18.17.0'
      });

      const message = await getEnvironmentStatusMessage();
      
      expect(message).toMatch(/^⚠️/);
      expect(message).toContain('below the required minimum');
      expect(message).toContain('Please upgrade');
    });

    it('should return unknown message with question mark when status is unknown', async () => {
      // Mock function throwing an error
      mockCheckNodeVersion.mockRejectedValue(new Error('Test error'));

      const message = await getEnvironmentStatusMessage();
      
      expect(message).toMatch(/^❓/);
      expect(message).toContain('Test error');
    });
  });
}); 