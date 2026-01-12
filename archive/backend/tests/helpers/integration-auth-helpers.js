const supertest = require('supertest');
// const app = require('../../server').app; // Import your Express app instance

/**
 * Creates a test user via API signup and then logs them in to get a JWT.
 * Ensures each call uses a unique email to avoid conflicts.
 * @param {object} app - The Express app instance.
 * @param {object} [userData] - Optional user data (name, email, password).
 * @returns {Promise<string>} The JWT token.
 */
async function getTestUserToken(app, userData = {}) {
  const uniqueEmail = userData.email || `testuser_${Date.now()}@example.com`;
  const password = userData.password || 'PasswordForTest123!';
  const name = userData.name || 'Test User';

  // 1. Sign up the user (Supabase Auth via your API endpoint)
  try {
    await supertest(app)
      .post('/v1/auth/signup')
      .send({ name, email: uniqueEmail, password })
      .expect(200); // Or 201, adjust to your API's success code for signup
  } catch (signupError) {
    // If signup fails (e.g. user already exists, though uniqueEmail should prevent this),
    // we might still try to login if the error indicates that.
    // For now, let's assume signup is for a new user.
    console.error(`Signup failed for ${uniqueEmail}:`, signupError.response ? signupError.response.body : signupError);
    throw signupError;
  }


  // 2. Log in the user to get the token
  const loginResponse = await supertest(app)
    .post('/v1/auth/login')
    .send({ email: uniqueEmail, password })
    .expect(200);

  if (!loginResponse.body.jwtToken) {
    throw new Error('Login did not return a jwtToken.');
  }
  return loginResponse.body.jwtToken;
}

module.exports = { getTestUserToken }; 