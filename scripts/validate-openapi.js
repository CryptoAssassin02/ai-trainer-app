#!/usr/bin/env node

/**
 * OpenAPI Document Validator
 * Validates the OpenAPI specification for syntax and semantic correctness
 */

const SwaggerParser = require('@apidevtools/swagger-parser');
const path = require('path');
const fs = require('fs');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

async function validateOpenAPI() {
  const openapiPath = path.join(__dirname, '..', 'docs', 'openapi.yaml');
  
  console.log(`${colors.blue}Validating OpenAPI document...${colors.reset}`);
  console.log(`${colors.gray}Path: ${openapiPath}${colors.reset}\n`);
  
  try {
    // Check if file exists
    if (!fs.existsSync(openapiPath)) {
      throw new Error(`OpenAPI document not found at ${openapiPath}`);
    }
    
    // Parse and validate the OpenAPI document
    const api = await SwaggerParser.validate(openapiPath);
    
    console.log(`${colors.green}✓ OpenAPI document is valid!${colors.reset}\n`);
    
    // Display basic information about the API
    console.log(`${colors.blue}API Information:${colors.reset}`);
    console.log(`  Title: ${api.info.title}`);
    console.log(`  Version: ${api.info.version}`);
    console.log(`  OpenAPI Version: ${api.openapi}`);
    
    // Display server information
    if (api.servers && api.servers.length > 0) {
      console.log(`\n${colors.blue}Servers:${colors.reset}`);
      api.servers.forEach((server, index) => {
        console.log(`  ${index + 1}. ${server.url} - ${server.description}`);
      });
    }
    
    // Display security schemes
    if (api.components && api.components.securitySchemes) {
      console.log(`\n${colors.blue}Security Schemes:${colors.reset}`);
      Object.keys(api.components.securitySchemes).forEach(scheme => {
        const security = api.components.securitySchemes[scheme];
        console.log(`  - ${scheme}: ${security.type} (${security.scheme || security.in || 'OAuth2'})`);
      });
    }
    
    // Display tags
    if (api.tags && api.tags.length > 0) {
      console.log(`\n${colors.blue}API Tags:${colors.reset}`);
      api.tags.forEach(tag => {
        console.log(`  - ${tag.name}: ${tag.description.split('\n')[0].trim()}`);
      });
    }
    
    // Count paths (for future phases)
    const pathCount = Object.keys(api.paths || {}).length;
    console.log(`\n${colors.blue}Statistics:${colors.reset}`);
    console.log(`  Total paths defined: ${pathCount}`);
    
    if (pathCount === 0) {
      console.log(`\n${colors.yellow}Note: No paths defined yet (Phase 1 - Foundation only)${colors.reset}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}✗ Validation failed!${colors.reset}\n`);
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    
    if (error.details) {
      console.error('\nDetails:');
      error.details.forEach(detail => {
        console.error(`  - ${detail}`);
      });
    }
    
    process.exit(1);
  }
}

// Run validation
validateOpenAPI().catch(error => {
  console.error(`${colors.red}Unexpected error: ${error}${colors.reset}`);
  process.exit(1);
}); 