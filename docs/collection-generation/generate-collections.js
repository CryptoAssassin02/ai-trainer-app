#!/usr/bin/env node

/**
 * Collection Generation Script for trAIner API
 * Generates Postman and Insomnia collections from OpenAPI specification
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

// Configuration
const OPENAPI_SPEC_PATH = path.join(__dirname, '../../openapi.yaml');
const OUTPUT_DIR = path.join(__dirname, './generated-collections');
const API_BASE_URL = 'https://api.trainer-app.com/v1';
const API_KEY_PLACEHOLDER = '{{api_key}}';

/**
 * Load and parse OpenAPI specification
 */
async function loadOpenAPISpec() {
  try {
    const specContent = await fs.readFile(OPENAPI_SPEC_PATH, 'utf8');
    return yaml.load(specContent);
  } catch (error) {
    console.error('Error loading OpenAPI spec:', error);
    process.exit(1);
  }
}

/**
 * Generate Postman Collection v2.1
 */
async function generatePostmanCollection(spec) {
  const collection = {
    info: {
      name: spec.info.title,
      description: spec.info.description,
      version: spec.info.version,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    auth: {
      type: 'bearer',
      bearer: [{
        key: 'token',
        value: API_KEY_PLACEHOLDER,
        type: 'string'
      }]
    },
    variable: [
      {
        key: 'baseUrl',
        value: API_BASE_URL,
        type: 'string'
      },
      {
        key: 'api_key',
        value: '',
        type: 'string',
        description: 'Your trAIner API authentication token'
      }
    ],
    item: []
  };

  // Group endpoints by tags
  const folders = {};

  // Process paths
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (method === 'parameters') continue;

      const tags = operation.tags || ['Other'];
      const tag = tags[0];

      if (!folders[tag]) {
        folders[tag] = {
          name: tag,
          description: `${tag} endpoints`,
          item: []
        };
      }

      // Build request
      const request = {
        name: operation.summary || `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: [
            {
              key: 'Content-Type',
              value: 'application/json'
            }
          ],
          url: {
            raw: `{{baseUrl}}${path}`,
            host: ['{{baseUrl}}'],
            path: path.split('/').filter(Boolean)
          },
          description: operation.description
        }
      };

      // Add path parameters
      if (operation.parameters) {
        request.request.url.variable = [];
        
        operation.parameters.forEach(param => {
          if (param.in === 'path') {
            request.request.url.variable.push({
              key: param.name,
              value: param.example || '',
              description: param.description
            });
          } else if (param.in === 'query') {
            if (!request.request.url.query) {
              request.request.url.query = [];
            }
            request.request.url.query.push({
              key: param.name,
              value: param.example || '',
              description: param.description,
              disabled: !param.required
            });
          }
        });
      }

      // Add request body
      if (operation.requestBody) {
        const content = operation.requestBody.content;
        if (content && content['application/json']) {
          const schema = content['application/json'].schema;
          const example = content['application/json'].example || 
                         generateExampleFromSchema(schema, spec);
          
          request.request.body = {
            mode: 'raw',
            raw: JSON.stringify(example, null, 2),
            options: {
              raw: {
                language: 'json'
              }
            }
          };
        }
      }

      // Add example responses
      if (operation.responses) {
        request.response = [];
        
        for (const [statusCode, response] of Object.entries(operation.responses)) {
          if (response.content && response.content['application/json']) {
            const example = response.content['application/json'].example ||
                          generateExampleFromSchema(response.content['application/json'].schema, spec);
            
            request.response.push({
              name: `${statusCode} - ${response.description}`,
              originalRequest: request.request,
              status: response.description,
              code: parseInt(statusCode),
              _postman_previewlanguage: 'json',
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json'
                }
              ],
              body: JSON.stringify(example, null, 2)
            });
          }
        }
      }

      folders[tag].item.push(request);
    }
  }

  // Add folders to collection
  collection.item = Object.values(folders);

  // Add pre-request script for authentication
  collection.event = [
    {
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: [
          '// Ensure authentication token is set',
          'if (!pm.variables.get("api_key")) {',
          '    console.log("Please set your API key in the collection variables");',
          '}'
        ]
      }
    }
  ];

  return collection;
}

/**
 * Generate Insomnia Collection v4
 */
async function generateInsomniaCollection(spec) {
  const collection = {
    _type: 'export',
    __export_format: 4,
    __export_date: new Date().toISOString(),
    __export_source: 'trainerapp.openapi.generator',
    resources: []
  };

  // Create workspace
  const workspace = {
    _id: 'wrk_' + generateId(),
    parentId: null,
    modified: Date.now(),
    created: Date.now(),
    name: spec.info.title,
    description: spec.info.description,
    _type: 'workspace'
  };
  collection.resources.push(workspace);

  // Create base environment
  const environment = {
    _id: 'env_' + generateId(),
    parentId: workspace._id,
    modified: Date.now(),
    created: Date.now(),
    name: 'Base Environment',
    data: {
      base_url: API_BASE_URL,
      api_key: API_KEY_PLACEHOLDER
    },
    _type: 'environment'
  };
  collection.resources.push(environment);

  // Create folders for each tag
  const folders = {};
  
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (method === 'parameters') continue;

      const tags = operation.tags || ['Other'];
      const tag = tags[0];

      if (!folders[tag]) {
        const folder = {
          _id: 'fld_' + generateId(),
          parentId: workspace._id,
          modified: Date.now(),
          created: Date.now(),
          name: tag,
          description: `${tag} endpoints`,
          _type: 'request_group'
        };
        folders[tag] = folder;
        collection.resources.push(folder);
      }

      // Create request
      const request = {
        _id: 'req_' + generateId(),
        parentId: folders[tag]._id,
        modified: Date.now(),
        created: Date.now(),
        url: `{{ base_url }}${path}`,
        name: operation.summary || `${method.toUpperCase()} ${path}`,
        description: operation.description,
        method: method.toUpperCase(),
        body: {},
        parameters: [],
        headers: [
          {
            name: 'Content-Type',
            value: 'application/json'
          }
        ],
        authentication: {
          type: 'bearer',
          token: '{{ api_key }}'
        },
        _type: 'request'
      };

      // Add query parameters
      if (operation.parameters) {
        operation.parameters.forEach(param => {
          if (param.in === 'query') {
            request.parameters.push({
              name: param.name,
              value: param.example || '',
              description: param.description,
              disabled: !param.required
            });
          }
        });
      }

      // Add request body
      if (operation.requestBody) {
        const content = operation.requestBody.content;
        if (content && content['application/json']) {
          const schema = content['application/json'].schema;
          const example = content['application/json'].example || 
                         generateExampleFromSchema(schema, spec);
          
          request.body = {
            mimeType: 'application/json',
            text: JSON.stringify(example, null, 2)
          };
        }
      }

      collection.resources.push(request);
    }
  }

  return collection;
}

/**
 * Generate example from schema
 */
function generateExampleFromSchema(schema, spec) {
  if (!schema) return {};
  
  if (schema.$ref) {
    const refPath = schema.$ref.split('/').slice(1);
    let refSchema = spec;
    for (const part of refPath) {
      refSchema = refSchema[part];
    }
    return generateExampleFromSchema(refSchema, spec);
  }

  if (schema.example) return schema.example;

  switch (schema.type) {
    case 'object':
      const obj = {};
      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
          obj[key] = generateExampleFromSchema(prop, spec);
        }
      }
      return obj;
    
    case 'array':
      return [generateExampleFromSchema(schema.items, spec)];
    
    case 'string':
      if (schema.enum) return schema.enum[0];
      if (schema.format === 'date-time') return new Date().toISOString();
      if (schema.format === 'date') return new Date().toISOString().split('T')[0];
      if (schema.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
      return schema.description || 'string';
    
    case 'number':
    case 'integer':
      if (schema.minimum) return schema.minimum;
      if (schema.maximum) return schema.maximum;
      return 0;
    
    case 'boolean':
      return true;
    
    default:
      return null;
  }
}

/**
 * Generate random ID
 */
function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting collection generation...\n');

  // Create output directory
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Load OpenAPI spec
  console.log('📄 Loading OpenAPI specification...');
  const spec = await loadOpenAPISpec();
  console.log(`✅ Loaded ${spec.info.title} v${spec.info.version}\n`);

  // Generate Postman collection
  console.log('📮 Generating Postman collection...');
  const postmanCollection = await generatePostmanCollection(spec);
  const postmanPath = path.join(OUTPUT_DIR, 'trainerapp-postman-collection.json');
  await fs.writeFile(postmanPath, JSON.stringify(postmanCollection, null, 2));
  console.log(`✅ Postman collection saved to: ${postmanPath}\n`);

  // Generate Insomnia collection
  console.log('🦟 Generating Insomnia collection...');
  const insomniaCollection = await generateInsomniaCollection(spec);
  const insomniaPath = path.join(OUTPUT_DIR, 'trainerapp-insomnia-collection.json');
  await fs.writeFile(insomniaPath, JSON.stringify(insomniaCollection, null, 2));
  console.log(`✅ Insomnia collection saved to: ${insomniaPath}\n`);

  // Generate collection documentation
  const docPath = path.join(OUTPUT_DIR, 'README.md');
  const documentation = `# trAIner API Collections

This directory contains pre-configured API collections for testing the trAIner API.

## Available Collections

### Postman Collection
- File: \`trainerapp-postman-collection.json\`
- Version: Collection v2.1
- Features:
  - Pre-configured authentication
  - Environment variables
  - Example requests and responses
  - Organized by API categories

### Insomnia Collection
- File: \`trainerapp-insomnia-collection.json\`
- Version: Insomnia v4
- Features:
  - Environment configuration
  - Bearer token authentication
  - Request organization by folders
  - JSON request/response examples

## Import Instructions

### Postman
1. Open Postman
2. Click "Import" button
3. Select \`trainerapp-postman-collection.json\`
4. Set your API key in collection variables

### Insomnia
1. Open Insomnia
2. Click "Create" → "Import"
3. Select \`trainerapp-insomnia-collection.json\`
4. Update the \`api_key\` environment variable

## Authentication

Both collections are pre-configured with Bearer token authentication. You'll need to:
1. Obtain an API key from your trAIner account
2. Set the \`api_key\` variable in the collection/environment
3. The token will be automatically included in all requests

## Testing Workflow

1. Start with Authentication endpoints to obtain a token
2. Test Profile endpoints to set up user data
3. Explore Workout Management for AI-powered features
4. Try Analytics endpoints for insights
5. Test Data Transfer for import/export functionality

## Support

For API documentation: https://docs.trainer-app.com/api
For support: api-support@trainer-app.com
`;

  await fs.writeFile(docPath, documentation);
  console.log(`📚 Documentation saved to: ${docPath}\n`);

  console.log('✨ Collection generation completed successfully!');
}

// Run the script
main().catch(console.error); 