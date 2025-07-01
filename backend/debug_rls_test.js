const { getSupabaseClient, getSupabaseClientWithToken } = require('./services/supabase');
const workoutLogService = require('./services/workout-log-service');
const supertest = require('supertest');
const { app } = require('./server');
const { createValidTestWorkoutLog } = require('./tests/integration/workoutLogs/helpers/schemaValidation');

// Import admin client for user creation (following successful analytics pattern)
const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugRLSIssue() {
  console.log('🔍 DEBUGGING RLS SECURITY ISSUE');
  console.log('=====================================');
  
  try {
    // Step 1: Create two test users using admin client to bypass email confirmation
    console.log('\n1. Creating test users using admin client...');
    
    const timestamp = Date.now();
    const user1Email = `rls-debug-user1-${timestamp}@example.com`;
    const user2Email = `rls-debug-user2-${timestamp}@example.com`;
    const password = 'TestPassword123!';
    
    // Create User 1 via admin API
    console.log('Creating User 1 via admin API...');
    const { data: user1Data, error: user1Error } = await adminSupabase.auth.admin.createUser({
      email: user1Email,
      password: password,
      email_confirm: true // Bypass email confirmation
    });
    
    if (user1Error) {
      console.error('User 1 creation error:', user1Error);
      throw new Error('Failed to create User 1 via admin API');
    }
    
    console.log('User 1 created successfully:', user1Data.user.id);
    
    // Create User 2 via admin API
    console.log('Creating User 2 via admin API...');
    const { data: user2Data, error: user2Error } = await adminSupabase.auth.admin.createUser({
      email: user2Email,
      password: password,
      email_confirm: true // Bypass email confirmation
    });
    
    if (user2Error) {
      console.error('User 2 creation error:', user2Error);
      throw new Error('Failed to create User 2 via admin API');
    }
    
    console.log('User 2 created successfully:', user2Data.user.id);
    
    const user1Id = user1Data.user.id;
    const user2Id = user2Data.user.id;
    
    // Step 2: Get JWT tokens by signing in
    console.log('\n2. Getting JWT tokens via sign-in...');
    
    const { data: user1Session, error: user1LoginError } = await adminSupabase.auth.signInWithPassword({
      email: user1Email,
      password: password
    });
    
    if (user1LoginError) {
      console.error('User 1 login error:', user1LoginError);
      throw new Error('Failed to login User 1');
    }
    
    const { data: user2Session, error: user2LoginError } = await adminSupabase.auth.signInWithPassword({
      email: user2Email,
      password: password
    });
    
    if (user2LoginError) {
      console.error('User 2 login error:', user2LoginError);
      throw new Error('Failed to login User 2');
    }
    
    const user1Token = user1Session.session.access_token;
    const user2Token = user2Session.session.access_token;
    
    console.log('\n2. JWT Token Analysis...');
    console.log('User 1 ID:', user1Id);
    console.log('User 1 Token (first 50 chars):', user1Token && user1Token.substring(0, 50) + '...');
    console.log('User 2 ID:', user2Id);
    console.log('User 2 Token (first 50 chars):', user2Token && user2Token.substring(0, 50) + '...');
    
    // Step 2: Decode JWT tokens to examine structure
    const jwt = require('jsonwebtoken');
    
    if (user1Token) {
      const decoded1 = jwt.decode(user1Token, { complete: true });
      console.log('\nUser 1 JWT payload:', JSON.stringify(decoded1 && decoded1.payload, null, 2));
    }
    
    if (user2Token) {
      const decoded2 = jwt.decode(user2Token, { complete: true });
      console.log('\nUser 2 JWT payload:', JSON.stringify(decoded2 && decoded2.payload, null, 2));
    }
    
    // Step 3: Test using the same service layer as the failing test
    console.log('\n3. Testing Service Layer RLS...');
    
    // Create workout log for User 1 using the exact same service method
    const firstUserData = createValidTestWorkoutLog(user1Id);
    console.log('Creating workout log as User 1 via service...');
    
    const firstUserLogResult = await workoutLogService.storeWorkoutLog(user1Id, firstUserData, user1Token);
    console.log('User 1 log creation result:', firstUserLogResult);
    
    const firstUserLogId = firstUserLogResult.id;
    console.log('User 1 log ID:', firstUserLogId);
    
    // Step 4: Test User 2 trying to access User 1's data (THE CRITICAL TEST)
    console.log('\n4. TESTING CRITICAL RLS VIOLATION...');
    console.log('User 2 attempting to access User 1 workout log via service...');
    
    try {
      const unauthorizedServiceAccess = await workoutLogService.retrieveWorkoutLog(firstUserLogId, user2Id, user2Token);
      
      console.log('\n❌ CRITICAL SECURITY VULNERABILITY CONFIRMED!');
      console.log('User 2 SUCCESSFULLY accessed User 1 data:');
      console.log('Retrieved data:', JSON.stringify(unauthorizedServiceAccess, null, 2));
      console.log('Retrieved user_id:', unauthorizedServiceAccess.user_id);
      console.log('Expected user_id (User 2):', user2Id);
      console.log('Actual user_id (User 1):', user1Id);
      
      if (unauthorizedServiceAccess.user_id === user1Id) {
        console.log('\n🚨 CONFIRMED: User 2 can see User 1 private data!');
        console.log('🚨 RLS POLICIES ARE NOT WORKING!');
      }
      
    } catch (error) {
      console.log('\n✅ RLS working correctly - User 2 access denied');
      console.log('Error:', error.message);
    }
    
    // Step 5: Test direct Supabase client behavior
    console.log('\n5. Testing Direct Supabase Client RLS...');
    
    const user1Client = getSupabaseClientWithToken(user1Token);
    const user2Client = getSupabaseClientWithToken(user2Token);
    
    console.log('User 2 attempting direct database access...');
    const { data: directAccessData, error: directAccessError } = await user2Client
      .from('workout_logs')
      .select('*')
      .eq('id', firstUserLogId)
      .single();
    
    console.log('Direct access result:');
    console.log('Data:', directAccessData);
    console.log('Error:', directAccessError);
    
    if (directAccessData && !directAccessError) {
      console.log('\n❌ CRITICAL: Direct database access also bypassed RLS!');
    } else {
      console.log('\n✅ Direct database access properly blocked by RLS');
    }
    
    // Step 6: Examine JWT token setup in Supabase client
    console.log('\n6. Testing JWT Token Setup...');
    
    console.log('Testing auth.uid() with User 1 token...');
    try {
      const { data: user1AuthTest } = await user1Client.rpc('auth.uid');
      console.log('User 1 auth.uid():', user1AuthTest);
    } catch (err) {
      console.log('User 1 auth.uid() error:', err.message);
    }
    
    console.log('Testing auth.uid() with User 2 token...');
    try {
      const { data: user2AuthTest } = await user2Client.rpc('auth.uid');
      console.log('User 2 auth.uid():', user2AuthTest);
    } catch (err) {
      console.log('User 2 auth.uid() error:', err.message);
    }
    
    // Step 7: Check RLS configuration
    console.log('\n7. Checking RLS Configuration...');
    
    // Check if RLS is enabled
    const { data: rlsStatus } = await adminSupabase
      .from('pg_tables')
      .select('schemaname, tablename, rowsecurity')
      .eq('tablename', 'workout_logs');
    
    console.log('RLS Status for workout_logs:', rlsStatus);
    
    // Check policies
    const { data: policies } = await adminSupabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'workout_logs');
    
    console.log('RLS Policies for workout_logs:', policies);
    
    // Step 8: Test environment variables
    console.log('\n8. Environment Check...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
    console.log('SUPABASE_ANON_KEY set:', !!process.env.SUPABASE_ANON_KEY);
    console.log('SUPABASE_SERVICE_ROLE_KEY set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Cleanup
    console.log('\n9. Cleanup...');
    await adminSupabase.from('workout_logs').delete().eq('id', firstUserLogId);
    
    try {
      await adminSupabase.auth.admin.deleteUser(user1Id);
      await adminSupabase.auth.admin.deleteUser(user2Id);
    } catch (cleanupError) {
      console.log('Cleanup error:', cleanupError.message);
    }
    
    console.log('\n🏁 RLS Debug Complete');
    
  } catch (error) {
    console.error('\n💥 Debug Error:', error);
    throw error;
  }
}

// Run the debug if called directly
if (require.main === module) {
  debugRLSIssue()
    .then(() => {
      console.log('Debug completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Debug failed:', error);
      process.exit(1);
    });
}

module.exports = { debugRLSIssue }; 