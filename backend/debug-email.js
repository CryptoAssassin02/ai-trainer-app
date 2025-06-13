const { app } = require('./server');
const supertest = require('supertest');

async function testSeedEmailFormat() {
  console.log('Testing seed data email format...');
  
  // Test the exact format from seed data
  const emailFormats = [
    'testuser@example.com',           // Simple format like seed data
    'newuser@example.com',            // Another simple format
    `test${Math.floor(Math.random()*1000)}@example.com`, // Random number instead of timestamp
  ];

  for (const email of emailFormats) {
    console.log(`\nTesting email: ${email}`);
    
    const userData = {
      name: 'Test User',
      email: email,
      password: 'Password123!'
    };

    try {
      const response = await supertest(app)
        .post('/v1/auth/signup')
        .send(userData);

      console.log(`Status: ${response.status}`);
      if (response.status === 201) {
        console.log('✅ SUCCESS!');
        break; // Found a working format
      } else {
        console.log(`❌ Failed: ${response.body.details || response.body.message}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
  
  process.exit(0);
}

testSeedEmailFormat(); 