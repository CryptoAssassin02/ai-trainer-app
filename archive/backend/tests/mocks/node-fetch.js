// backend/tests/mocks/node-fetch.js

// Export a Jest mock function for node-fetch
module.exports = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({ mockData: 'mock response' }),
  status: 200,
}); 