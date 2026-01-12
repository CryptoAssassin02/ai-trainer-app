/**
 * @fileoverview Mock logger for tests
 */

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  http: jest.fn()
};

module.exports = mockLogger; 