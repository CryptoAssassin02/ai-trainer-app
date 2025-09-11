/**
 * @fileoverview Mocked config barrel file for tests
 */

const env = require('./env');
const logger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  requestFormat: jest.fn(() => ({}))
};

module.exports = {
  env,
  logger
}; 