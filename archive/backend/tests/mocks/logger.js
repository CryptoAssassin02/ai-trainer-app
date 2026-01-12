// backend/tests/mocks/logger.js

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  requestFormat: jest.fn(() => ({
    method: 'mockMethod',
    url: 'mockUrl',
    ip: 'mockIp',
    status: 'mockStatus',
    userAgent: 'mockUserAgent',
    responseTime: 'mockTime',
    userId: 'mockUserId'
  }))
};

module.exports = logger; 