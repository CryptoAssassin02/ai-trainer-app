// migrate-robust.js
const fs = require('fs').promises;
const path = require('path');
const { Client } = require('pg');
const { env } = require('../config');

// Configuration
const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Connection options to try in order of preference
const connectionOptions = [
  // Option 1: Session pooler with explicit user parameter (confirmed working format)
  {
    name: 'Session pooler with explicit user',
    connectionString: `postgresql://postgres:${env.supabase.databasePassword}@${env.supabase.poolerHost}:${env.supabase.poolerSessionPort}/postgres?user=${env.supabase.poolerUser}`,
    ssl: {
      rejectUnauthorized: env.supabase.sslRejectUnauthorized,
      checkServerIdentity: () => undefined // Bypass hostname checks
    },
    application_name: 'supabase-migrations-session-pooler',
    keepAlive: true
  },
  
  // Option 2: Transaction pooler with explicit user parameter
  {
    name: 'Transaction pooler with explicit user',
    connectionString: `postgresql://postgres:${env.supabase.databasePassword}@${env.supabase.poolerHost}:${env.supabase.poolerTransactionPort}/postgres?user=${env.supabase.poolerUser}`,
    ssl: {
      rejectUnauthorized: env.supabase.sslRejectUnauthorized,
      checkServerIdentity: () => undefined // Bypass hostname checks
    },
    application_name: 'supabase-migrations-transaction-pooler',
    keepAlive: true
  }
];

// Find a working connection
async function findWorkingConnection() {
  console.log('Finding a working connection method...');
  console.log(`SSL Mode: ${env.supabase.sslMode}`);
  console.log(`SSL Reject Unauthorized: ${env.supabase.sslRejectUnauthorized}`);
  
  for (const option of connectionOptions) {
    console.log(`\nTrying ${option.name}...`);
    
    if (VERBOSE) {
      console.log('Connection string (masked):',
        option.connectionString.replace(/:[^:@]+@/, ':******@'));
    }
    
    const client = new Client({
      ...option,
      connectionTimeoutMillis: env.supabase.connectionTimeout
    });
    
    try {
      await client.connect();
      console.log(`✅ ${option.name} successful!`);
      
      // Verify with a simple query
      const res = await client.query('SELECT NOW() as time, current_user as user, current_database() as database, version() as version');
      console.log(`Database time: ${res.rows[0].time}`);
      console.log(`Connected as user: ${res.rows[0].user}`);
      console.log(`Database: ${res.rows[0].database}`);
      console.log(`PostgreSQL version: ${res.rows[0].version}`);
      
      await client.end();
      return option;
    } catch (err) {
      console.log(`❌ ${option.name} failed: ${err.message}`);
      if (err.code) {
        console.log(`Error code: ${err.code}`);
        if (err.code === '28P01') {
          console.log('Authentication failed. Please check your credentials.');
        } else if (err.code === '28000') {
          console.log('Invalid authorization specification.');
        } else if (err.code === 'ECONNREFUSED') {
          console.log('Connection refused. The database server may be down or blocking your IP.');
        } else if (err.code === 'ETIMEDOUT') {
          console.log('Connection timed out. This could be due to network issues or firewall restrictions.');
        }
      }
      try { await client.end(); } catch(e) {}
    }
  }
  
  throw new Error('All connection methods failed. Please ensure you have the correct credentials and network access to the database.');
}

// Migration Functions
async function ensureMigrationsTable(client) {
  try {
    console.log('Creating migrations table if it doesn\'t exist...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        hash VARCHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT now(),
        success BOOLEAN NOT NULL,
        error_message TEXT,
        execution_time INTEGER
      );
    `);
    
    console.log('Migrations table ready');
  } catch (error) {
    console.error('Error ensuring migrations table exists:', error);
    throw error;
  }
}

async function getAppliedMigrations(client) {
  try {
    const result = await client.query(`
      SELECT name 
      FROM migrations 
      WHERE success = true
      ORDER BY name;
    `);
    
    return result.rows.map(row => row.name);
  } catch (error) {
    console.error('Error getting applied migrations:', error);
    throw error;
  }
}

async function getMigrationFiles() {
  try {
    const files = await fs.readdir(MIGRATIONS_DIR);
    return files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort alphabetically to ensure correct order
  } catch (error) {
    console.error('Error reading migration files:', error);
    throw error;
  }
}

async function readMigrationFile(filename) {
  try {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading migration file ${filename}:`, error);
    throw error;
  }
}

async function executeMigration(client, filename) {
  try {
    console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Executing migration: ${filename}`);
    
    // Read the migration file
    const sql = await readMigrationFile(filename);
    const hash = filename; // Use filename as hash for simplicity
    
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would execute SQL from ${filename} (first 500 chars):`);
      console.log('----------------------');
      console.log(sql.slice(0, 500) + (sql.length > 500 ? '...' : ''));
      console.log('----------------------');
      return true;
    }
    
    const startTime = Date.now();
    
    // Execute the migration within a transaction
    await client.query('BEGIN');
    
    try {
      await client.query(sql);
      
      // Record the migration
      await client.query(`
        INSERT INTO migrations (name, hash, success, execution_time)
        VALUES ($1, $2, true, $3)
        ON CONFLICT (name)
        DO UPDATE SET
          success = true,
          applied_at = now(),
          execution_time = $3,
          error_message = NULL;
      `, [filename, hash, Date.now() - startTime]);
      
      await client.query('COMMIT');
      
      console.log(`✅ Migration ${filename} completed successfully (${Date.now() - startTime}ms)`);
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Enhanced error handling with more context
      const errorContext = {
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        internalQuery: error.internalQuery,
        where: error.where,
        schema: error.schema,
        table: error.table,
        column: error.column,
        dataType: error.dataType,
        constraint: error.constraint
      };
      
      console.error(`❌ Migration ${filename} failed:`, error.message);
      console.error('Error Context:', JSON.stringify(errorContext, null, 2));
      
      // Additional error context for common migration issues
      if (error.code === '42501') {
        console.error('This appears to be a permission issue. Make sure your connection uses the service role key.');
        console.error('Current connection type:', client.connectionParameters?.application_name || 'unknown');
      } else if (error.code === '23505') {
        console.error('This appears to be a duplicate key violation. The object may already exist.');
        console.error('Constraint:', error.constraint);
      } else if (error.code === '42P01') {
        console.error('Relation does not exist. Check if referenced tables exist.');
        console.error('Referenced relation:', error.table || 'unknown');
      } else if (error.code === '23503') {
        console.error('Foreign key violation. Referenced record does not exist.');
        console.error('Constraint:', error.constraint);
      } else if (error.code === '42P07') {
        console.error('Duplicate relation. An object with this name already exists.');
        console.error('Object name:', error.table || 'unknown');
      }
      
      // Record failed migration
      try {
        await client.query(`
          INSERT INTO migrations (name, hash, success, execution_time, error_message)
          VALUES ($1, $2, false, $3, $4)
          ON CONFLICT (name)
          DO UPDATE SET
            success = false,
            applied_at = now(),
            execution_time = $3,
            error_message = $4;
        `, [filename, hash, Date.now() - startTime, error.message]);
      } catch (recordError) {
        console.error('Failed to record migration failure:', recordError.message);
      }
      
      return false;
    }
  } catch (error) {
    console.error(`❌ Migration ${filename} failed:`, error);
    return false;
  }
}

// Main function
async function main() {
  console.log('=== Supabase Robust Migration Tool ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE RUN'}`);
  console.log(`Environment: ${env.env}`);
  
  try {
    // Find a working connection
    const connectionOption = await findWorkingConnection();
    console.log(`\nUsing connection method: ${connectionOption.name}`);
    
    // Get list of migration files
    const files = await getMigrationFiles();
    console.log(`\nFound ${files.length} migration files in ${MIGRATIONS_DIR}`);
    
    if (files.length === 0) {
      console.log('No migration files to apply.');
      return;
    }
    
    // Connect to database with the working connection
    console.log('\nConnecting to database for migrations...');
    const client = new Client({
      connectionString: connectionOption.connectionString,
      ssl: connectionOption.ssl,
      connectionTimeoutMillis: env.supabase.connectionTimeout,
      application_name: 'supabase-migrations'
    });
    
    await client.connect();
    console.log('Connected successfully!');
    
    try {
      // Create migrations table if it doesn't exist
      if (!DRY_RUN) {
        await ensureMigrationsTable(client);
      }
      
      // Get list of already applied migrations
      let appliedMigrations = [];
      if (!DRY_RUN) {
        appliedMigrations = await getAppliedMigrations(client);
        console.log(`${appliedMigrations.length} migrations already applied`);
      }
      
      // Filter out already applied migrations
      const pendingMigrations = files.filter(f => !appliedMigrations.includes(f));
      
      if (pendingMigrations.length === 0) {
        console.log('No pending migrations to apply.');
        return;
      }
      
      console.log(`Will apply ${pendingMigrations.length} migrations`);
      
      // Execute migrations
      let successCount = 0;
      let failureCount = 0;
      
      for (const migration of pendingMigrations) {
        const success = await executeMigration(client, migration);
        if (success) {
          successCount++;
        } else {
          failureCount++;
          if (!DRY_RUN) {
            console.error('\nStopping due to migration failure');
            break;
          }
        }
      }
      
      // Summary
      console.log('\n===== Migration Summary =====');
      console.log(`Total migrations processed: ${successCount + failureCount}`);
      console.log(`Successful: ${successCount}`);
      console.log(`Failed: ${failureCount}`);
      
      if (DRY_RUN) {
        console.log('\nThis was a dry run. No changes were made to the database.');
        console.log('Run without --dry-run to apply these migrations.');
      }
      
      // Save the working connection info for future reference
      if (successCount > 0) {
        console.log(`\nNOTE: The ${connectionOption.name} connection method works well.`);
        console.log(`Consider updating your application to use this method by default.`);
      }
    } finally {
      await client.end();
      console.log('Database connection closed.');
    }
  } catch (error) {
    console.error('\nMigration process error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  if (error.stack) {
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
});