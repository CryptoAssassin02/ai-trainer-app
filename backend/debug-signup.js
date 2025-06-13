const supertest = require('supertest');
const { app } = require('./server');

async function testSignup() {
  console.log('Testing signup process...');
  
  // Test multiple signups to see if there's a pattern
  for (let i = 0; i < 3; i++) {
    const testUser = {
      name: 'Test User',
      email: `test-${Date.now()}-${i}@example.com`,
      password: 'testpassword123'
    };
    
    console.log(`\n--- Attempt ${i + 1} ---`);
    console.log('Attempting signup with:', testUser);
    
    try {
      const response = await supertest(app)
        .post('/v1/auth/signup')
        .send(testUser);
      
      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));
      
      if (response.status !== 201) {
        console.error('Signup failed!');
        if (response.body.details) {
          console.error('Error details:', response.body.details);
        }
      } else {
        console.log('Signup successful!');
      }
    } catch (error) {
      console.error('Error during signup test:', error.message);
      if (error.response) {
        console.error('Error response body:', error.response.body);
      }
    }
    
    // Wait a bit between attempts
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  process.exit(0);
}

testSignup(); 