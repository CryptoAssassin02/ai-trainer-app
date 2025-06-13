const supertest = require('supertest');
const { app } = require('./server');

async function testIntegrationSignup() {
  console.log('Testing signup exactly like integration tests...');
  
  const userAName = 'User A';
  const userAEmail = `usera-${Date.now()}@example.com`;
  const userAPassword = 'password123';
  
  console.log('Attempting signup with:', { name: userAName, email: userAEmail, password: userAPassword });
  
  try {
    // This mimics exactly what the integration test does
    const signupAResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({ name: userAName, email: userAEmail, password: userAPassword });
    
    console.log('Response status:', signupAResponse.status);
    console.log('Response body:', JSON.stringify(signupAResponse.body, null, 2));
    
    if (signupAResponse.status !== 201) {
      console.error('Signup failed! Expected 201, got', signupAResponse.status);
      if (signupAResponse.body.details) {
        console.error('Error details:', signupAResponse.body.details);
      }
    } else {
      console.log('Signup successful!');
      console.log('User ID:', signupAResponse.body.userId);
      console.log('Access Token:', signupAResponse.body.accessToken ? 'Present' : 'Missing');
    }
  } catch (error) {
    console.error('Error during signup test:', error.message);
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response body:', error.response.body);
    }
  }
  
  process.exit(0);
}

testIntegrationSignup(); 