import {
  getURL,
  toDateTime,
  calculateTrialEndUnixTimestamp,
  getStatusRedirect,
  getErrorRedirect
} from '@/utils/helpers';

// Store original process.env
const originalEnv = { ...process.env };

describe('utils/helpers', () => {
  beforeEach(() => {
    // Restore original env variables before each test
    process.env = { ...originalEnv };
    jest.useFakeTimers(); // Use fake timers for date-related tests
  });

  afterEach(() => {
    // Clean up timers
    jest.useRealTimers();
  });

  describe('getURL', () => {
    it('should return localhost URL when no env variables are set', () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.NEXT_PUBLIC_VERCEL_URL;
      expect(getURL()).toBe('http://localhost:3000');
    });

    it('should return localhost URL with path', () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.NEXT_PUBLIC_VERCEL_URL;
      expect(getURL('/test')).toBe('http://localhost:3000/test');
      expect(getURL('test')).toBe('http://localhost:3000/test'); // Handle missing leading slash
    });

    it('should use NEXT_PUBLIC_SITE_URL when set', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
      delete process.env.NEXT_PUBLIC_VERCEL_URL;
      expect(getURL()).toBe('https://example.com');
    });

     it('should use NEXT_PUBLIC_SITE_URL and remove trailing slash', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/';
      delete process.env.NEXT_PUBLIC_VERCEL_URL;
      expect(getURL()).toBe('https://example.com');
    });

    it('should use NEXT_PUBLIC_SITE_URL with path', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
      delete process.env.NEXT_PUBLIC_VERCEL_URL;
      expect(getURL('/path/to/page')).toBe('https://example.com/path/to/page');
      expect(getURL('path/to/page')).toBe('https://example.com/path/to/page'); // Handle missing leading slash
    });

     it('should prioritize NEXT_PUBLIC_SITE_URL over NEXT_PUBLIC_VERCEL_URL', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://site.com';
      process.env.NEXT_PUBLIC_VERCEL_URL = 'https://vercel.app';
      expect(getURL()).toBe('https://site.com');
    });

    it('should use NEXT_PUBLIC_VERCEL_URL when NEXT_PUBLIC_SITE_URL is not set', () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      process.env.NEXT_PUBLIC_VERCEL_URL = 'https://my-app.vercel.app';
      expect(getURL()).toBe('https://my-app.vercel.app');
    });

     it('should use NEXT_PUBLIC_VERCEL_URL and remove trailing slash', () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      process.env.NEXT_PUBLIC_VERCEL_URL = 'https://my-app.vercel.app/';
      expect(getURL()).toBe('https://my-app.vercel.app');
    });

    it('should use NEXT_PUBLIC_VERCEL_URL with path', () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      process.env.NEXT_PUBLIC_VERCEL_URL = 'https://my-app.vercel.app';
      expect(getURL('/api/data')).toBe('https://my-app.vercel.app/api/data');
      expect(getURL('api/data')).toBe('https://my-app.vercel.app/api/data'); // Handle missing leading slash
    });

     it('should add https:// if missing from NEXT_PUBLIC_SITE_URL (and not localhost)', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'example.com';
      delete process.env.NEXT_PUBLIC_VERCEL_URL;
      expect(getURL()).toBe('https://example.com');
    });

     it('should add https:// if missing from NEXT_PUBLIC_VERCEL_URL (and not localhost)', () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      process.env.NEXT_PUBLIC_VERCEL_URL = 'my-app.vercel.app';
      expect(getURL()).toBe('https://my-app.vercel.app');
    });

    it('should handle empty string path', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
      expect(getURL('')).toBe('https://example.com');
    });

    it('should handle double slashes in path correctly', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
      expect(getURL('//test')).toBe('https://example.com/test');
    });
  });

  describe('toDateTime', () => {
    it('should convert 0 seconds to the Unix epoch start date', () => {
      const epoch = new Date(0); // Directly create epoch date
      expect(toDateTime(0)).toEqual(epoch);
    });

    it('should convert positive seconds correctly', () => {
      const timestamp = 1678886400; // Example timestamp
      const expectedTimestampMillis = timestamp * 1000;
      expect(toDateTime(timestamp).getTime()).toEqual(expectedTimestampMillis);
    });

    it('should handle large numbers of seconds', () => {
      const largeTimestamp = 253402300799; // Near max date
      const expectedTimestampMillis = largeTimestamp * 1000;
      expect(toDateTime(largeTimestamp).getTime()).toEqual(expectedTimestampMillis);
    });
  });

  describe('calculateTrialEndUnixTimestamp', () => {
    const now = new Date('2024-01-01T12:00:00.000Z');
    const nowTimestampSeconds = Math.floor(now.getTime() / 1000);

    beforeEach(() => {
      jest.setSystemTime(now);
    });

    it('should return undefined if trialPeriodDays is null', () => {
      expect(calculateTrialEndUnixTimestamp(null)).toBeUndefined();
    });

    it('should return undefined if trialPeriodDays is undefined', () => {
      expect(calculateTrialEndUnixTimestamp(undefined)).toBeUndefined();
    });

    it('should return undefined if trialPeriodDays is less than 2', () => {
      expect(calculateTrialEndUnixTimestamp(1)).toBeUndefined();
      expect(calculateTrialEndUnixTimestamp(0)).toBeUndefined();
      expect(calculateTrialEndUnixTimestamp(-5)).toBeUndefined();
    });

    it('should calculate the correct end timestamp for 7 days', () => {
      const trialDays = 7;
      // Formula adds trialDays + 1
      const expectedEndSeconds = nowTimestampSeconds + (trialDays + 1) * 24 * 60 * 60;
      expect(calculateTrialEndUnixTimestamp(trialDays)).toBe(expectedEndSeconds);
    });

    it('should calculate the correct end timestamp for 30 days', () => {
      const trialDays = 30;
      const expectedEndSeconds = nowTimestampSeconds + (trialDays + 1) * 24 * 60 * 60;
      expect(calculateTrialEndUnixTimestamp(trialDays)).toBe(expectedEndSeconds);
    });

     it('should calculate the correct end timestamp for exactly 2 days', () => {
      const trialDays = 2;
      const expectedEndSeconds = nowTimestampSeconds + (trialDays + 1) * 24 * 60 * 60;
      expect(calculateTrialEndUnixTimestamp(trialDays)).toBe(expectedEndSeconds);
    });
  });

  describe('getStatusRedirect', () => {
    const path = '/account';
    const statusName = 'profile_updated';
    const statusDescription = 'Your profile was updated successfully.';

    it('should create redirect URL with status name only', () => {
      const expected = '/account?status=profile_updated';
      expect(getStatusRedirect(path, statusName)).toBe(expected);
    });

    it('should create redirect URL with status name and description', () => {
      const expected = `/account?status=profile_updated&status_description=${encodeURIComponent(statusDescription)}`;
      expect(getStatusRedirect(path, statusName, statusDescription)).toBe(expected);
    });

    it('should create redirect URL with disableButton true', () => {
      const expected = '/account?status=profile_updated&disable_button=true';
      expect(getStatusRedirect(path, statusName, '', true)).toBe(expected);
    });

    it('should create redirect URL with arbitrary parameters', () => {
      const arbitrary = 'utm_source=test&utm_medium=email';
      const expected = `/account?status=profile_updated&${arbitrary}`;
      expect(getStatusRedirect(path, statusName, '', false, arbitrary)).toBe(expected);
    });

    it('should create redirect URL with all parameters', () => {
      const arbitrary = 'foo=bar';
      const expected = `/account?status=profile_updated&status_description=${encodeURIComponent(statusDescription)}&disable_button=true&${arbitrary}`;
      expect(getStatusRedirect(path, statusName, statusDescription, true, arbitrary)).toBe(expected);
    });

     it('should handle special characters in names and descriptions', () => {
      const specialName = 'Update Complete!';
      const specialDesc = 'Data saved & processed.';
      const expected = `/account?status=${encodeURIComponent(specialName)}&status_description=${encodeURIComponent(specialDesc)}`;
      expect(getStatusRedirect(path, specialName, specialDesc)).toBe(expected);
    });
  });

  describe('getErrorRedirect', () => {
    const path = '/login';
    const errorName = 'invalid_credentials';
    const errorDescription = 'The email or password provided is incorrect.';

    it('should create redirect URL with error name only', () => {
      const expected = '/login?error=invalid_credentials';
      expect(getErrorRedirect(path, errorName)).toBe(expected);
    });

    it('should create redirect URL with error name and description', () => {
      const expected = `/login?error=invalid_credentials&error_description=${encodeURIComponent(errorDescription)}`;
      expect(getErrorRedirect(path, errorName, errorDescription)).toBe(expected);
    });

    it('should create redirect URL with disableButton true', () => {
      const expected = '/login?error=invalid_credentials&disable_button=true';
      expect(getErrorRedirect(path, errorName, '', true)).toBe(expected);
    });

    it('should create redirect URL with arbitrary parameters', () => {
      const arbitrary = 'attempt=3';
      const expected = `/login?error=invalid_credentials&${arbitrary}`;
      expect(getErrorRedirect(path, errorName, '', false, arbitrary)).toBe(expected);
    });

    it('should create redirect URL with all parameters', () => {
      const arbitrary = 'session_id=xyz';
      const expected = `/login?error=invalid_credentials&error_description=${encodeURIComponent(errorDescription)}&disable_button=true&${arbitrary}`;
      expect(getErrorRedirect(path, errorName, errorDescription, true, arbitrary)).toBe(expected);
    });

    it('should handle special characters in names and descriptions', () => {
      const specialName = 'Server Error!';
      const specialDesc = 'Code: 500 - Please retry later.';
      const expected = `/login?error=${encodeURIComponent(specialName)}&error_description=${encodeURIComponent(specialDesc)}`;
      expect(getErrorRedirect(path, specialName, specialDesc)).toBe(expected);
    });
  });
}); 