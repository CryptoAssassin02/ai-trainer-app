// /Users/dylanloberg/ai-trainer-app/backend/diagnostics/auth-test.js
const { env } = require('../config');
const { Client } = require('pg');
const querystring = require('querystring');

// Verify environment variables are loaded
console.log('=== Environment Variables Check ===');
console.log('SUPABASE_URL:', env.supabase.url ? 'Loaded' : 'Missing');
console.log('SUPABASE_PROJECT_REF:', env.supabase.projectRef ? 'Loaded' : 'Missing');
console.log('DATABASE_URL:', env.supabase.databaseUrl ? 'Loaded' : 'Missing');
console.log('DATABASE_URL_SERVICE_ROLE:', env.supabase.databaseUrlServiceRole ? 'Loaded' : 'Missing');
console.log('DATABASE_URL_POOLER_SESSION:', env.supabase.databaseUrlPoolerSession ? 'Loaded' : 'Missing');
console.log('DATABASE_URL_POOLER_TRANSACTION:', env.supabase.databaseUrlPoolerTransaction ? 'Loaded' : 'Missing');

// Get project reference - use the one directly from env
const projectRef = env.supabase.projectRef;
console.log('Project Reference:', projectRef);

// URL encode the keys for testing
const encodedServiceKey = querystring.escape(env.supabase.serviceRoleKey);
const encodedAnonKey = querystring.escape(env.supabase.anonKey);
const dbPassword = env.supabase.databasePassword;

console.log('Service Key (first 10 chars):', env.supabase.serviceRoleKey.substring(0, 10) + '...');
console.log('URL-encoded Service Key (first 10 chars):', encodedServiceKey.substring(0, 10) + '...');

// Connection string formats to test
const connectionStrings = [
  // Format 1: Using DATABASE_URL from env directly
  env.supabase.databaseUrl,
  
  // Format 2: Using DATABASE_URL_SERVICE_ROLE from env directly
  env.supabase.databaseUrlServiceRole,
  
  // Format 3: Pooler Session from env directly
  env.supabase.databaseUrlPoolerSession,
  
  // Format 4: Pooler Transaction from env directly 
  env.supabase.databaseUrlPoolerTransaction,
  
  // Format 5: Standard with URL-encoded service role
  `postgresql://postgres:${encodedServiceKey}@db.${projectRef}.supabase.co:5432/postgres`,
  
  // Format 6: Alternative with URL-encoded service role
  `postgresql://postgres.${projectRef}:${encodedServiceKey}@db.${projectRef}.supabase.co:5432/postgres`,
  
  // Format 7: Pooler with URL-encoded service role
  `postgresql://postgres.${projectRef}:${encodedServiceKey}@${env.supabase.poolerHost}:${env.supabase.poolerSessionPort}/postgres`,
  
  // Format 8: Alternative pooler format
  `postgresql://postgres:${env.supabase.databasePassword}@${env.supabase.poolerHost}:${env.supabase.poolerSessionPort}/postgres?user=${env.supabase.poolerUser}`,

  // Format 9: Direct with database password
  `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`,
];

// SSL config variations to test
const sslConfigs = [
  { rejectUnauthorized: false },
  { rejectUnauthorized: true },
  { rejectUnauthorized: false, ca: null },
  { ca: null },
  true,
  null,
  undefined,
];

async function testConnection(name, connectionString, sslConfig) {
  console.log(`\n===== Testing ${name} =====`);
  console.log('Connection string (masked):', connectionString.replace(/:[^:@]+@/, ':******@'));
  console.log('SSL config:', JSON.stringify(sslConfig));
  
  const client = new Client({
    connectionString,
    ssl: sslConfig,
    connectionTimeoutMillis: env.supabase.connectionTimeout || 30000
  });
  
  try {
    console.log('Connecting...');
    await client.connect();
    console.log('✅ CONNECTION SUCCESSFUL!');
    
    // Try a simple query
    const res = await client.query('SELECT NOW()');
    console.log('Query successful! Database time:', res.rows[0].now);
    
    await client.end();
    return true;
  } catch (err) {
    console.error('❌ Connection failed:');
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    
    try { await client.end(); } catch(e) {}
    return false;
  }
}

async function runTests() {
  let successfulConnections = 0;
  
  // Test first with default SSL config
  console.log('\n🔍 TESTING WITH DEFAULT SSL CONFIG\n');
  for (let i = 0; i < connectionStrings.length; i++) {
    const success = await testConnection(
      `Connection String Format ${i+1}`,
      connectionStrings[i],
      { rejectUnauthorized: false }
    );
    if (success) successfulConnections++;
  }
  
  // If no success, test with different SSL configs on the first few connection strings
  if (successfulConnections === 0) {
    console.log('\n🔍 TESTING WITH DIFFERENT SSL CONFIGS\n');
    for (let i = 0; i < 4; i++) { // Test with the env-defined connection strings
      for (let j = 0; j < sslConfigs.length; j++) {
        const success = await testConnection(
          `Connection String ${i+1} with SSL Config ${j+1}`,
          connectionStrings[i],
          sslConfigs[j]
        );
        if (success) successfulConnections++;
      }
    }
  }
  
  // Summary
  console.log('\n===== TEST SUMMARY =====');
  console.log(`Total successful connections: ${successfulConnections}`);
  
  if (successfulConnections > 0) {
    console.log('✅ At least one connection method worked! Use the successful format for your migrations.');
  } else {
    console.log('❌ All connection attempts failed. Additional troubleshooting needed:');
    console.log('1. Verify your Supabase database password and service role key are correct');
    console.log('2. Check if your IP address is whitelisted in Supabase');
    console.log('3. Try accessing your Supabase dashboard to confirm your project is active');
    console.log('4. Check if DNS resolution is working properly for the Supabase hostnames');
    console.log('5. If all else fails, contact Supabase support for assistance');
  }
}

console.log('=== Supabase Connection Testing ===');
console.log('Testing multiple connection string formats with different SSL configurations');

runTests().catch(console.error);