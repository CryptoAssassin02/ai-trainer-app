// /Users/dylanloberg/ai-trainer-app/backend/diagnostics/verify-credentials.js
const { env } = require('../config');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

function maskString(str) {
  if (!str) return 'undefined';
  if (str.length <= 10) return '*'.repeat(str.length);
  return str.substring(0, 5) + '...' + str.substring(str.length - 5);
}

async function testConnectionComponents() {
  console.log('\n=== Testing Connection Components ===');
  
  // Check connection components from env module
  const dbHost = env.supabase.dbHost;
  const dbPort = env.supabase.dbPort;
  const dbName = env.supabase.dbName;
  const dbUser = env.supabase.dbUser;
  const poolerHost = env.supabase.poolerHost;
  const poolerSessionPort = env.supabase.poolerSessionPort;
  const poolerTransactionPort = env.supabase.poolerTransactionPort;
  const poolerUser = env.supabase.poolerUser;
  
  console.log('DB_HOST:', dbHost ? `${dbHost} ✅` : 'missing ❌');
  console.log('DB_PORT:', dbPort ? `${dbPort} ✅` : 'missing ❌');
  console.log('DB_NAME:', dbName ? `${dbName} ✅` : 'missing ❌');
  console.log('DB_USER:', dbUser ? `${dbUser} ✅` : 'missing ❌');
  console.log('POOLER_HOST:', poolerHost ? `${poolerHost} ✅` : 'missing ❌');
  console.log('POOLER_SESSION_PORT:', poolerSessionPort ? `${poolerSessionPort} ✅` : 'missing ❌');
  console.log('POOLER_TRANSACTION_PORT:', poolerTransactionPort ? `${poolerTransactionPort} ✅` : 'missing ❌');
  console.log('POOLER_USER:', poolerUser ? `${poolerUser} ✅` : 'missing ❌');
}

async function testDatabaseUrls() {
  console.log('\n=== Testing Database URL Formats ===');
  
  // Check DATABASE_URL variables from env module
  const databaseUrl = env.supabase.databaseUrl;
  const databaseUrlServiceRole = env.supabase.databaseUrlServiceRole;
  const databaseUrlPoolerSession = env.supabase.databaseUrlPoolerSession;
  const databaseUrlPoolerTransaction = env.supabase.databaseUrlPoolerTransaction;
  
  console.log('DATABASE_URL:', databaseUrl ? 'defined ✅' : 'missing ❌');
  console.log('DATABASE_URL_SERVICE_ROLE:', databaseUrlServiceRole ? 'defined ✅' : 'missing ❌');
  console.log('DATABASE_URL_POOLER_SESSION:', databaseUrlPoolerSession ? 'defined ✅' : 'missing ❌');
  console.log('DATABASE_URL_POOLER_TRANSACTION:', databaseUrlPoolerTransaction ? 'defined ✅' : 'missing ❌');
  
  // Verify format of URLs
  function checkUrlFormat(name, url) {
    if (!url) return;
    
    try {
      // Try to parse components of the connection string
      // This regex matches: protocol://user:pass@host:port/database
      const regex = /^(postgresql):\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)(\?.*)?$/;
      const match = url.match(regex);
      
      if (match) {
        console.log(`\n${name} format check:`);
        console.log(` Protocol: ${match[1]} ✅`);
        console.log(` User: ${match[2]} ✅`);
        console.log(` Password: ${maskString(match[3])} ✅`);
        console.log(` Host: ${match[4]} ✅`);
        console.log(` Port: ${match[5]} ✅`);
        console.log(` Database: ${match[6]} ✅`);
        if (match[7]) console.log(` Query params: ${match[7]} ✅`);
      } else {
        console.log(`\n${name} format check: INVALID ❌`);
        console.log(' The connection string doesn\'t match the expected format.');
      }
    } catch (error) {
      console.log(`\n${name} format check: ERROR ❌`);
      console.log(` Error: ${error.message}`);
    }
  }
  
  checkUrlFormat('DATABASE_URL', databaseUrl);
  checkUrlFormat('DATABASE_URL_SERVICE_ROLE', databaseUrlServiceRole);
  checkUrlFormat('DATABASE_URL_POOLER_SESSION', databaseUrlPoolerSession);
  checkUrlFormat('DATABASE_URL_POOLER_TRANSACTION', databaseUrlPoolerTransaction);
}

async function testSSLConfiguration() {
  console.log('\n=== Testing SSL Configuration ===');
  
  const sslMode = env.supabase.sslMode;
  const tlsReject = env.supabase.sslRejectUnauthorized === false ? '0' : '1';
  
  console.log('SSL_MODE:', sslMode ? `${sslMode} ✅` : 'missing ❌');
  console.log('NODE_TLS_REJECT_UNAUTHORIZED:', tlsReject !== undefined ? `${tlsReject} ✅` : 'missing ❌');
  
  if (tlsReject === '0') {
    console.log('⚠️ Warning: NODE_TLS_REJECT_UNAUTHORIZED=0 disables SSL certificate validation');
    console.log('   This is okay for testing but should not be used in production!');
  }
}

async function main() {
  console.log('=== Supabase Credentials Verification ===');
  
  // Verify environment variables exist
  console.log('\nChecking environment variables:');
  const supabaseUrl = env.supabase.url;
  const serviceRoleKey = env.supabase.serviceRoleKey;
  const anonKey = env.supabase.anonKey;
  const dbPassword = env.supabase.databasePassword;
  const projectRef = env.supabase.projectRef;
  
  console.log('SUPABASE_URL:', supabaseUrl || 'missing ❌');
  console.log('SUPABASE_PROJECT_REF:', projectRef || 'missing ❌');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? maskString(serviceRoleKey) + ' ✅' : 'missing ❌');
  console.log('SUPABASE_ANON_KEY:', anonKey ? maskString(anonKey) + ' ✅' : 'missing ❌');
  console.log('DATABASE_PASSWORD:', dbPassword ? maskString(dbPassword) + ' ✅' : 'missing ❌');
  
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.log('\n❌ One or more required environment variables are missing');
    return;
  }
  
  // Check connection components
  await testConnectionComponents();
  
  // Check database URLs
  await testDatabaseUrls();
  
  // Check SSL configuration
  await testSSLConfiguration();
  
  // Test Supabase client with anon key
  console.log('\nTesting Supabase client with anon key...');
  const anonClient = createClient(supabaseUrl, anonKey);
  
  try {
    const { data: anonData, error: anonError } = await anonClient.auth.getSession();
    
    if (anonError) {
      console.log('❌ Anon key authentication failed:', anonError.message);
    } else {
      console.log('✅ Anon key authentication successful!');
    }
  } catch (error) {
    console.log('❌ Error testing anon key:', error.message);
  }
  
  // Test Supabase client with service role key
  console.log('\nTesting Supabase client with service role key...');
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    const { data: serviceData, error: serviceError } = await serviceClient.auth.getSession();
    
    if (serviceError) {
      console.log('❌ Service role key authentication failed:', serviceError.message);
    } else {
      console.log('✅ Service role key authentication successful!');
      
      // Try to list all users as additional verification
      try {
        const { data: users, error: usersError } = await serviceClient.auth.admin.listUsers();
        
        if (usersError) {
          console.log('❌ Failed to list users:', usersError.message);
        } else {
          console.log('✅ Successfully retrieved users list!');
          console.log(`Found ${users.users.length} users in your project`);
        }
      } catch (e) {
        console.log('❌ Error listing users:', e.message);
      }
    }
  } catch (error) {
    console.log('❌ Error testing service role key:', error.message);
  }
  
  console.log('\n=== Verification Summary ===');
  console.log(`1. Environment variables properly loaded from: ${path.resolve(__dirname, '../.env')}`);
  console.log('2. Connection component and string formats have been validated');
  console.log('3. SSL configuration has been checked');
  console.log('4. Supabase authentication checked with both keys');
  
  console.log('\nNext steps:');
  console.log('1. Run ip-check.js to verify network access and DNS resolution to Supabase');
  console.log('2. Run auth-test.js to test database connection string formats');
  console.log('3. If issues persist, check Supabase dashboard for project status and restrictions');
  console.log('4. Consider adding entries to your hosts file if DNS resolution is failing');
}

main().catch(error => {
  console.error('Unhandled error:', error);
});