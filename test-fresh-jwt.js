const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ncfsrtcvxqrbcadhznzo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnNydGN2eHFyYmNhZGh6bnpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMjc5NDYsImV4cCI6MjA1ODcwMzk0Nn0.VNkr2RYquHprAm1SD9jFsLANB1FyCky8s5s2lnP3Jzs';

async function testWithFreshToken() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Create a test user and get a fresh token
  const email = `test-${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  
  console.log('Creating test user:', email);
  
  // Sign up
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (signUpError) {
    console.error('Sign up error:', signUpError);
    return;
  }
  
  console.log('User created successfully');
  
  // Sign in to get a fresh token
  const { data: signInData, error: signInError } = await supabase.auth.signIn({
    email,
    password,
  });
  
  if (signInError) {
    console.error('Sign in error:', signInError);
    return;
  }
  
  const session = signInData.session;
  if (!session) {
    console.error('No session returned');
    return;
  }
  
  console.log('\n=== Fresh JWT Token ===');
  console.log('Access Token:', session.access_token);
  console.log('Token expires in:', session.expires_in, 'seconds');
  console.log('Expires at:', new Date(session.expires_at * 1000).toISOString());
  
  // Now test the backend with this fresh token
  const fetch = require('node-fetch');
  
  console.log('\n=== Testing Backend with Fresh Token ===');
  try {
    const response = await fetch('http://localhost:8000/v1/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        height: 180,
        weight: 75,
      })
    });
    
    const result = await response.text();
    console.log('Backend Response Status:', response.status);
    console.log('Backend Response:', result);
  } catch (error) {
    console.error('Backend request error:', error.message);
  }
}

testWithFreshToken();
