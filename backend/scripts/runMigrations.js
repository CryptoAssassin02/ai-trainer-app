#!/usr/bin/env node

/**
 * @fileoverview Migration Runner CLI
 * 
 * This script provides a command-line interface for running database migrations.
 * It allows listing, applying, and checking the status of migrations.
 * 
 * Usage examples:
 *   node runMigrations.js                      # Run all pending migrations
 *   node runMigrations.js --dry-run            # Show what would be executed without actually running
 *   node runMigrations.js --list               # List all available migrations
 *   node runMigrations.js --status             # Show status of all migrations
 *   node runMigrations.js --file filename      # Run a specific migration file
 *   node runMigrations.js --diagnostic         # Run in diagnostic mode with detailed connection info
 *   node runMigrations.js --connection-test    # Test database connectivity
 *   node runMigrations.js --single             # Run one migration at a time with confirmation
 */

// Disable SSL certificate validation for development environments
// WARNING: This should not be used in production as it reduces security
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Load environment variables first
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const { runMigrations, getMigrationFiles, getMigrationStatus, createConnectionPool } = require('../utils/migrations');
const { logger } = require('../config');
const chalk = require('chalk');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  list: args.includes('--list'),
  status: args.includes('--status'),
  diagnostic: args.includes('--diagnostic'),
  connectionTest: args.includes('--connection-test'),
  single: args.includes('--single'),
  file: null
};

// Check for file argument
const fileIndex = args.indexOf('--file');
if (fileIndex !== -1 && args.length > fileIndex + 1) {
  options.file = args[fileIndex + 1];
}

/**
 * Create readline interface for user input
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompt for user confirmation
 * @param {string} message - Message to display
 * @returns {Promise<boolean>} User's response
 */
function confirm(message) {
  return new Promise(resolve => {
    rl.question(`${message} (y/N) `, answer => {
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Test database connectivity with all available methods
 * @returns {Promise<Object>} Connection test results
 */
async function testConnections() {
  console.log(chalk.cyan('\nTesting database connections...\n'));
  
  const results = {
    direct: null,
    sessionPooler: null,
    transactionPooler: null
  };
  
  for (const type of ['direct', 'sessionPooler', 'transactionPooler']) {
    try {
      console.log(chalk.yellow(`Testing ${type} connection...`));
      const connection = await createConnectionPool({
        type,
        useServiceRole: true
      });
      
      const client = await connection.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      await connection.pool.end();
      
      results[type] = {
        success: true,
        connectionType: connection.connectionType
      };
      
      console.log(chalk.green(`✓ ${type} connection successful`));
    } catch (error) {
      results[type] = {
        success: false,
        error: error.message
      };
      console.log(chalk.red(`✗ ${type} connection failed: ${error.message}`));
    }
  }
  
  return results;
}

/**
 * Display a formatted list of migrations
 * @param {Array<string>} files - List of migration file names
 */
function displayMigrationsList(files) {
  console.log(chalk.cyan('\nAvailable migrations:'));
  console.log(chalk.cyan('====================='));
  
  if (files.length === 0) {
    console.log(chalk.yellow('No migration files found.'));
    return;
  }
  
  files.forEach((file, index) => {
    console.log(chalk.white(`${index + 1}. ${file}`));
  });
  
  console.log(chalk.cyan(`\nTotal: ${files.length} migration(s)\n`));
}

/**
 * Display the status of all migrations
 * @param {Object} status - Migration status object
 */
function displayMigrationStatus(status) {
  console.log(chalk.cyan('\nMigration status:'));
  console.log(chalk.cyan('================='));
  console.log(`Total migrations: ${chalk.white(status.total)}`);
  console.log(`Applied: ${chalk.green(status.applied)}`);
  console.log(`Failed: ${chalk.red(status.failed)}`);
  console.log(`Pending: ${chalk.yellow(status.pending)}`);
  console.log(`Connection type: ${chalk.blue(status.connectionType)}`);
  
  console.log(chalk.cyan('\nIndividual migrations:'));
  console.log(chalk.cyan('---------------------'));
  
  if (status.migrations.length === 0) {
    console.log(chalk.yellow('No migrations found.'));
    return;
  }
  
  status.migrations.forEach((migration, index) => {
    const statusColor = {
      success: chalk.green,
      failed: chalk.red,
      pending: chalk.yellow
    }[migration.status];
    
    console.log(`${index + 1}. ${chalk.bold(migration.name)}`);
    console.log(`   Status: ${statusColor(migration.status)}`);
    
    if (migration.appliedAt) {
      console.log(`   Applied: ${chalk.blue(new Date(migration.appliedAt).toLocaleString())}`);
    }
    
    if (migration.executionTime) {
      console.log(`   Duration: ${chalk.blue(migration.executionTime + 'ms')}`);
    }
    
    if (migration.error) {
      console.log(`   Error: ${chalk.red(migration.error)}`);
    }
    
    if (migration.connectionType) {
      console.log(`   Connection: ${chalk.blue(migration.connectionType)}`);
    }
    
    console.log('');
  });
}

/**
 * Display the result of migration execution
 * @param {Object} result - Migration result object
 */
function displayMigrationResult(result) {
  if (!result.success) {
    console.error(chalk.red('\nMigration failed!'));
    console.error(chalk.red(`Error: ${result.error}`));
    
    if (result.connectionType) {
      console.error(chalk.yellow(`Connection type used: ${result.connectionType}`));
    }
    
    console.log(chalk.yellow('\nThe following migrations were executed successfully before the failure:'));
    
    if (!result.executed || result.executed.length === 0) {
      console.log(chalk.yellow('None'));
    } else {
      result.executed.forEach((migration, index) => {
        console.log(chalk.white(`${index + 1}. ${migration.name}`));
      });
    }
    
    process.exit(1);
  }
  
  console.log(chalk.green('\nMigrations completed successfully!'));
  console.log(chalk.blue(`Connection type used: ${result.connectionType}`));
  
  if (!result.executed || result.executed.length === 0) {
    console.log(chalk.yellow('No migrations were applied.'));
  } else {
    console.log(chalk.white('\nThe following migrations were applied:'));
    result.executed.forEach((migration, index) => {
      console.log(chalk.white(`${index + 1}. ${migration.name} (${migration.executionTime}ms)`));
    });
  }
}

/**
 * Run migrations in single mode
 * @param {Object} options - Migration options
 * @returns {Promise<Object>} Migration results
 */
async function runSingleMigrations(options) {
  const files = await getMigrationFiles();
  const status = await getMigrationStatus();
  const pendingMigrations = files.filter(file => 
    !status.migrations.find(m => m.name === file && m.status === 'success')
  );
  
  if (pendingMigrations.length === 0) {
    console.log(chalk.yellow('\nNo pending migrations to apply.'));
    return { success: true, executed: [] };
  }
  
  console.log(chalk.cyan('\nPending migrations:'));
  pendingMigrations.forEach((file, index) => {
    console.log(chalk.white(`${index + 1}. ${file}`));
  });
  
  let results = { success: true, executed: [] };
  
  for (const file of pendingMigrations) {
    const shouldRun = await confirm(`\nRun migration ${chalk.cyan(file)}?`);
    if (!shouldRun) {
      console.log(chalk.yellow('Skipping migration.'));
      continue;
    }
    
    const result = await runMigrations({
      ...options,
      file
    });
    
    if (!result.success) {
      return result;
    }
    
    results.executed.push(...result.executed);
    results.connectionType = result.connectionType;
  }
  
  return results;
}

/**
 * Main function
 */
async function main() {
  try {
    // If --connection-test flag is provided, just test connections and exit
    if (options.connectionTest) {
      await testConnections();
      return;
    }
    
    // If --diagnostic flag is provided, run in diagnostic mode
    if (options.diagnostic) {
      console.log(chalk.cyan('\nRunning in diagnostic mode...'));
      console.log(chalk.cyan('Testing database connections first...\n'));
      
      const connectionResults = await testConnections();
      const anySuccess = Object.values(connectionResults).some(r => r.success);
      
      if (!anySuccess) {
        throw new Error('No database connections available. Please check your configuration.');
      }
    }
    
    // If --list flag is provided, just list migrations and exit
    if (options.list) {
      const files = await getMigrationFiles();
      displayMigrationsList(files);
      return;
    }
    
    // If --status flag is provided, show migration status and exit
    if (options.status) {
      const status = await getMigrationStatus();
      displayMigrationStatus(status);
      return;
    }
    
    // Run migrations
    console.log(chalk.cyan(`\nRunning migrations${options.dryRun ? ' (dry run)' : ''}...`));
    
    if (options.file) {
      console.log(chalk.yellow(`Running specific migration: ${options.file}`));
    }
    
    let result;
    if (options.single && !options.file) {
      result = await runSingleMigrations(options);
    } else {
      result = await runMigrations({
        dryRun: options.dryRun,
        file: options.file,
        diagnostic: options.diagnostic
      });
    }
    
    displayMigrationResult(result);
  } catch (error) {
    console.error(chalk.red('\nError running migrations:'), error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the main function
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(chalk.red('Unhandled error:'), error);
    process.exit(1);
  });