// /Users/dylanloberg/ai-trainer-app/backend/diagnostics/ip-check.js
require('dotenv').config({ path: '/Users/dylanloberg/ai-trainer-app/backend/.env' });
const https = require('https');
const dns = require('dns').promises;

function getPublicIP() {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org', (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data.trim());
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function testSupabaseAPI() {
  return new Promise((resolve, reject) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !anonKey) {
      return reject(new Error('SUPABASE_URL or SUPABASE_ANON_KEY not found in environment variables'));
    }
    
    const options = {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    };
    
    const url = `${supabaseUrl}/rest/v1/`;
    console.log(`Testing API connection to: ${url}`);
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function testDNS() {
  console.log('\n=== Testing DNS Resolution ===');
  
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const dbHost = process.env.DB_HOST;
  const poolerHost = process.env.POOLER_HOST;
  
  // List of hosts to test
  const hosts = [
    dbHost,
    poolerHost,
    `${projectRef}.supabase.co`,
    'google.com' // Control test
  ];
  
  for (const host of hosts) {
    console.log(`\nResolving hostname: ${host}`);
    try {
      // Try IPv4 resolution
      const ipv4Result = await dns.resolve4(host);
      console.log(`✅ IPv4 resolution successful: ${ipv4Result.join(', ')}`);
    } catch (err) {
      console.log(`❌ IPv4 resolution failed: ${err.message}`);
    }
    
    try {
      // Try IPv6 resolution
      const ipv6Result = await dns.resolve6(host);
      console.log(`✅ IPv6 resolution successful: ${ipv6Result.join(', ')}`);
    } catch (err) {
      console.log(`❌ IPv6 resolution failed: ${err.message}`);
    }
  }
}

async function testPorts() {
  const net = require('net');
  
  async function testPort(host, port, description) {
    return new Promise((resolve) => {
      console.log(`Testing connection to ${host}:${port} (${description})...`);
      const socket = new net.Socket();
      let resolved = false;
      
      socket.setTimeout(5000);
      
      socket.on('connect', () => {
        console.log(`✅ Successfully connected to ${host}:${port}`);
        socket.destroy();
        resolved = true;
        resolve(true);
      });
      
      socket.on('timeout', () => {
        console.log(`❌ Connection timeout to ${host}:${port}`);
        socket.destroy();
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      });
      
      socket.on('error', (err) => {
        console.log(`❌ Error connecting to ${host}:${port}: ${err.message}`);
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      });
      
      socket.connect(port, host);
    });
  }
  
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const dbHost = process.env.DB_HOST;
  const poolerHost = process.env.POOLER_HOST;
  const poolerSessionPort = process.env.POOLER_SESSION_PORT || 5432;
  const poolerTransactionPort = process.env.POOLER_TRANSACTION_PORT || 6543;
  
  console.log('\n=== Testing direct port connections ===');
  
  await testPort(dbHost, 5432, 'Direct DB Connection');
  await testPort(poolerHost, poolerSessionPort, 'Session Pooler');
  await testPort(poolerHost, poolerTransactionPort, 'Transaction Pooler');
}

async function main() {
  console.log('=== Supabase IP Access Check ===');
  
  try {
    // Get public IP
    const publicIP = await getPublicIP();
    console.log('Your public IP address:', publicIP);
    
    // Test DNS resolution
    await testDNS();
    
    // Test ports
    await testPorts();
    
    // Test Supabase API
    console.log('\nTesting Supabase API access...');
    const apiResult = await testSupabaseAPI();
    
    if (apiResult.statusCode === 200) {
      console.log('✅ API connection successful!');
      console.log('This confirms your IP has access to the Supabase API.');
      console.log('\nIf database connections are still failing but API is working:');
      console.log('1. Your IP may have API access but not database access');
      console.log('2. The database credentials might be incorrect');
      console.log('3. Database access restrictions may be in place');
      console.log('4. DNS resolution might be failing for database hostnames');
    } else {
      console.log(`❌ API connection failed with status code: ${apiResult.statusCode}`);
      console.log('Response:', apiResult.data);
      console.log('\nThis suggests your IP might be blocked from accessing Supabase.');
      console.log('Check Supabase dashboard > Project Settings > API and ensure IP restrictions are disabled or your IP is whitelisted.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();