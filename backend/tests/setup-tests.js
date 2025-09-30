// Backend Jest setup for agents/controllers tests
jest.setTimeout(30000);
try { require('dotenv').config({ path: '.env.test' }); } catch {}
