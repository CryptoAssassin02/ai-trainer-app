/**
 * Mock server configuration for tests
 */

module.exports = {
  server: {
    maxRequestBodySize: '50mb',
    requestTimeout: 30000, // 30 seconds
    compressionLevel: 6,
    trustProxy: true
  }
}; 