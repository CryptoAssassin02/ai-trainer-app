#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class OpenAPIAnalyzer {
  constructor() {
    this.docsPath = path.join(__dirname, '../docs');
    this.results = {
      parameters: [],
      responses: [],
      schemas: [],
      errors: []
    };
    this.stats = {
      totalFiles: 0,
      categoriesAnalyzed: 0,
      parametersFound: 0,
      responsesFound: 0,
      schemasFound: 0,
      errorsFound: 0
    };
  }

  // Recursively find all YAML files, excluding openapi-backup.yaml
  findYamlFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.findYamlFiles(fullPath));
      } else if (item.endsWith('.yaml') && item !== 'openapi-backup.yaml') {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  // Parse YAML file safely
  parseYamlFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return yaml.load(content);
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error.message);
      return null;
    }
  }

  // Get relative path from docs directory for reporting
  getRelativePath(filePath) {
    return path.relative(this.docsPath, filePath);
  }

  async run() {
    console.log('🔍 Starting OpenAPI Analysis...');
    console.log(`📁 Analyzing directory: ${this.docsPath}`);
    
    // Find all YAML files
    const yamlFiles = this.findYamlFiles(this.docsPath);
    this.stats.totalFiles = yamlFiles.length;
    
    console.log(`📄 Found ${yamlFiles.length} YAML files to analyze\n`);
    
    // Analyze each file
    for (const filePath of yamlFiles) {
      await this.analyzeFile(filePath);
    }
    
    console.log('✅ Analysis complete!');
    console.log('📊 Statistics:', this.stats);
    
    // Generate output matrices
    await this.generateMatrices();
  }

  async analyzeFile(filePath) {
    const relativePath = this.getRelativePath(filePath);
    console.log(`🔍 Analyzing: ${relativePath}`);
    
    const content = this.parseYamlFile(filePath);
    if (!content) {
      console.log(`⚠️  Skipped: ${relativePath} (parse error)`);
      return;
    }
    
    // Determine file type and analyze accordingly
    if (relativePath.startsWith('paths/')) {
      await this.analyzePathFile(filePath, content);
    } else if (relativePath.startsWith('components/schemas/')) {
      await this.analyzeSchemaFile(filePath, content);
    } else if (relativePath.startsWith('components/responses/')) {
      await this.analyzeResponseFile(filePath, content);
    } else {
      console.log(`ℹ️  Skipped: ${relativePath} (not a target file type)`);
    }
  }

  // Analyze path files for parameters, responses, and schemas
  async analyzePathFile(filePath, content) {
    const relativePath = this.getRelativePath(filePath);
    const category = this.extractCategory(relativePath);
    const endpoint = this.extractEndpoint(relativePath);
    
    // Extract HTTP methods and their definitions
    const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
    
    for (const method of httpMethods) {
      if (content[method]) {
        await this.analyzePathMethod(filePath, method, content[method], category, endpoint);
      }
    }
  }

  async analyzePathMethod(filePath, method, methodContent, category, endpoint) {
    const relativePath = this.getRelativePath(filePath);
    
    // Extract parameters
    if (methodContent.parameters) {
      for (const param of methodContent.parameters) {
        this.extractParameter(param, {
          file: relativePath,
          category,
          endpoint,
          method: method.toUpperCase()
        });
      }
    }
    
    // Extract responses for response pattern analysis
    if (methodContent.responses) {
      for (const [statusCode, response] of Object.entries(methodContent.responses)) {
        this.extractResponse(statusCode, response, {
          file: relativePath,
          category,
          endpoint,
          method: method.toUpperCase()
        });
      }
    }
    
    // Extract request body schema references
    if (methodContent.requestBody && methodContent.requestBody.content) {
      for (const [contentType, content] of Object.entries(methodContent.requestBody.content)) {
        if (content.schema && content.schema.$ref) {
          this.extractSchemaReference(content.schema.$ref, {
            file: relativePath,
            category,
            endpoint,
            method: method.toUpperCase(),
            context: 'requestBody'
          });
        }
      }
    }
  }

  extractParameter(param, context) {
    const paramData = {
      name: param.name,
      in: param.in, // query, path, header, cookie
      required: param.required || false,
      type: param.schema?.type,
      format: param.schema?.format,
      enum: param.schema?.enum,
      default: param.schema?.default,
      example: param.schema?.example,
      description: param.description,
      minimum: param.schema?.minimum,
      maximum: param.schema?.maximum,
      minLength: param.schema?.minLength,
      maxLength: param.schema?.maxLength,
      pattern: param.schema?.pattern,
      ...context
    };
    
    this.results.parameters.push(paramData);
    this.stats.parametersFound++;
  }

  extractResponse(statusCode, response, context) {
    const responseData = {
      statusCode: statusCode,
      ref: response.$ref || null,
      description: response.description || null,
      isReference: !!response.$ref,
      ...context
    };
    
    this.results.responses.push(responseData);
    this.stats.responsesFound++;
  }

  extractSchemaReference(schemaRef, context) {
    const schemaData = {
      ref: schemaRef,
      schemaFile: this.extractSchemaFileName(schemaRef),
      ...context
    };
    
    this.results.schemas.push(schemaData);
    this.stats.schemasFound++;
  }

  // Helper methods
  extractCategory(relativePath) {
    // Extract category from paths like "paths/auth/login.yaml"
    const parts = relativePath.split('/');
    if (parts[0] === 'paths' && parts[1]) {
      return parts[1];
    }
    return 'unknown';
  }

  extractEndpoint(relativePath) {
    // Extract endpoint name from file path
    const parts = relativePath.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace('.yaml', '');
  }

  extractSchemaFileName(schemaRef) {
    // Extract schema file name from reference like '../../components/schemas/auth/LoginRequest.yaml'
    const parts = schemaRef.split('/');
    return parts[parts.length - 1];
  }

  async analyzeSchemaFile(filePath, content) {
    const relativePath = this.getRelativePath(filePath);
    const category = this.extractSchemaCategory(relativePath);
    const schemaName = this.extractSchemaName(relativePath);
    
    // Analyze schema properties and structure
    this.analyzeSchemaStructure(content, {
      file: relativePath,
      category,
      schemaName,
      type: 'schema'
    });
  }

  async analyzeResponseFile(filePath, content) {
    const relativePath = this.getRelativePath(filePath);
    const category = this.extractResponseCategory(relativePath);
    const responseName = this.extractResponseName(relativePath);
    
    // Analyze response structure
    this.analyzeResponseStructure(content, {
      file: relativePath,
      category,
      responseName,
      type: 'response'
    });
  }

  analyzeSchemaStructure(schema, context) {
    // Track schema usage patterns
    const schemaInfo = {
      type: schema.type,
      format: schema.format,
      required: schema.required || [],
      properties: schema.properties ? Object.keys(schema.properties) : [],
      hasEnum: !!schema.enum,
      hasItems: !!schema.items,
      hasOneOf: !!schema.oneOf,
      hasAnyOf: !!schema.anyOf,
      hasAllOf: !!schema.allOf,
      hasRefs: this.findRefsInSchema(schema),
      ...context
    };
    
    this.results.schemas.push(schemaInfo);
    this.stats.schemasFound++;
  }

  analyzeResponseStructure(response, context) {
    const responseInfo = {
      description: response.description,
      hasContent: !!response.content,
      contentTypes: response.content ? Object.keys(response.content) : [],
      hasHeaders: !!response.headers,
      headers: response.headers ? Object.keys(response.headers) : [],
      schemaRefs: this.findRefsInResponse(response),
      ...context
    };
    
    this.results.responses.push(responseInfo);
    this.stats.responsesFound++;
  }

  // Additional helper methods
  extractSchemaCategory(relativePath) {
    // Extract from "components/schemas/auth/LoginRequest.yaml"
    const parts = relativePath.split('/');
    if (parts[0] === 'components' && parts[1] === 'schemas' && parts[2]) {
      return parts[2];
    }
    return 'unknown';
  }

  extractSchemaName(relativePath) {
    const parts = relativePath.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace('.yaml', '');
  }

  extractResponseCategory(relativePath) {
    // Extract from "components/responses/auth/LoginSuccess.yaml"
    const parts = relativePath.split('/');
    if (parts[0] === 'components' && parts[1] === 'responses' && parts[2]) {
      return parts[2];
    }
    return 'unknown';
  }

  extractResponseName(relativePath) {
    const parts = relativePath.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace('.yaml', '');
  }

  findRefsInSchema(obj) {
    const refs = [];
    const findRefs = (current) => {
      if (typeof current === 'object' && current !== null) {
        if (current.$ref) {
          refs.push(current.$ref);
        }
        Object.values(current).forEach(findRefs);
      }
    };
    findRefs(obj);
    return refs;
  }

  findRefsInResponse(obj) {
    const refs = [];
    const findRefs = (current) => {
      if (typeof current === 'object' && current !== null) {
        if (current.$ref) {
          refs.push(current.$ref);
        }
        Object.values(current).forEach(findRefs);
      }
    };
    findRefs(obj);
    return refs;
  }

  async generateMatrices() {
    console.log('\n📊 Generating analysis matrices...');
    
    // Create output directory
    const outputDir = path.join(__dirname, '../docs/analysis');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate Parameter Matrix
    await this.generateParameterMatrix(outputDir);
    
    // Generate Response Pattern Matrix
    await this.generateResponseMatrix(outputDir);
    
    // Generate Schema Usage Matrix
    await this.generateSchemaMatrix(outputDir);
    
    // Generate Summary Report
    await this.generateSummaryReport(outputDir);
    
    console.log(`✅ All matrices generated in: ${outputDir}`);
  }

  async generateParameterMatrix(outputDir) {
    console.log('📋 Generating parameter matrix...');
    
    // Create parameter occurrence matrix
    const paramMatrix = [];
    const header = [
      'Parameter Name',
      'Type (in)',
      'Data Type',
      'Required',
      'Default',
      'Description',
      'Usage Count',
      'Categories Used',
      'Endpoints Used'
    ];
    
    paramMatrix.push(header);
    
    // Group parameters by name and analyze patterns
    const paramGroups = {};
    this.results.parameters.forEach(param => {
      const key = `${param.name}_${param.in}`;
      if (!paramGroups[key]) {
        paramGroups[key] = {
          name: param.name,
          in: param.in,
          type: param.type,
          required: param.required,
          default: param.default,
          descriptions: new Set(),
          categories: new Set(),
          endpoints: new Set(),
          usageCount: 0
        };
      }
      
      paramGroups[key].descriptions.add(param.description || 'No description');
      paramGroups[key].categories.add(param.category);
      paramGroups[key].endpoints.add(`${param.method} ${param.endpoint}`);
      paramGroups[key].usageCount++;
    });
    
    // Convert to matrix rows
    Object.values(paramGroups).forEach(group => {
      const row = [
        group.name,
        group.in,
        group.type || 'unknown',
        group.required ? 'Yes' : 'No',
        group.default || 'None',
        Array.from(group.descriptions).join(' | '),
        group.usageCount,
        Array.from(group.categories).join(', '),
        Array.from(group.endpoints).join('; ')
      ];
      paramMatrix.push(row);
    });
    
    // Write to CSV
    const paramCsv = paramMatrix.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    fs.writeFileSync(path.join(outputDir, 'parameter-matrix.csv'), paramCsv);
    console.log(`   📄 parameter-matrix.csv (${Object.keys(paramGroups).length} unique parameters)`);
  }

  async generateResponseMatrix(outputDir) {
    console.log('📋 Generating response pattern matrix...');
    
    const responseMatrix = [];
    const header = [
      'Status Code',
      'Response Reference',
      'Category',
      'Usage Count',
      'Endpoints Used'
    ];
    
    responseMatrix.push(header);
    
    // Group responses by status code and reference
    const responseGroups = {};
    this.results.responses.forEach(resp => {
      const key = `${resp.statusCode}_${resp.ref || 'inline'}`;
      if (!responseGroups[key]) {
        responseGroups[key] = {
          statusCode: resp.statusCode,
          ref: resp.ref,
          categories: new Set(),
          endpoints: new Set(),
          usageCount: 0
        };
      }
      
      responseGroups[key].categories.add(resp.category);
      responseGroups[key].endpoints.add(`${resp.method} ${resp.endpoint}`);
      responseGroups[key].usageCount++;
    });
    
    // Convert to matrix rows
    Object.values(responseGroups)
      .sort((a, b) => parseInt(a.statusCode) - parseInt(b.statusCode))
      .forEach(group => {
        const row = [
          group.statusCode,
          group.ref || 'Inline response',
          Array.from(group.categories).join(', '),
          group.usageCount,
          Array.from(group.endpoints).join('; ')
        ];
        responseMatrix.push(row);
      });
    
    // Write to CSV
    const responseCsv = responseMatrix.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    fs.writeFileSync(path.join(outputDir, 'response-matrix.csv'), responseCsv);
    console.log(`   📄 response-matrix.csv (${Object.keys(responseGroups).length} response patterns)`);
  }

  async generateSchemaMatrix(outputDir) {
    console.log('📋 Generating schema usage matrix...');
    
    const schemaMatrix = [];
    const header = [
      'Schema Reference',
      'Schema File',
      'Category',
      'Usage Count',
      'Used In Context',
      'Endpoints Used'
    ];
    
    schemaMatrix.push(header);
    
    // Group schemas by reference
    const schemaGroups = {};
    this.results.schemas.forEach(schema => {
      if (schema.ref) {
        const key = schema.ref;
        if (!schemaGroups[key]) {
          schemaGroups[key] = {
            ref: schema.ref,
            schemaFile: schema.schemaFile,
            categories: new Set(),
            contexts: new Set(),
            endpoints: new Set(),
            usageCount: 0
          };
        }
        
        schemaGroups[key].categories.add(schema.category);
        schemaGroups[key].contexts.add(schema.context || 'unknown');
        schemaGroups[key].endpoints.add(`${schema.method || 'N/A'} ${schema.endpoint || 'N/A'}`);
        schemaGroups[key].usageCount++;
      }
    });
    
    // Convert to matrix rows
    Object.values(schemaGroups)
      .sort((a, b) => b.usageCount - a.usageCount)
      .forEach(group => {
        const row = [
          group.ref,
          group.schemaFile || 'Unknown',
          Array.from(group.categories).join(', '),
          group.usageCount,
          Array.from(group.contexts).join(', '),
          Array.from(group.endpoints).join('; ')
        ];
        schemaMatrix.push(row);
      });
    
    // Write to CSV
    const schemaCsv = schemaMatrix.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    fs.writeFileSync(path.join(outputDir, 'schema-usage-matrix.csv'), schemaCsv);
    console.log(`   📄 schema-usage-matrix.csv (${Object.keys(schemaGroups).length} schema references)`);
  }

  async generateSummaryReport(outputDir) {
    console.log('📋 Generating summary report...');
    
    const report = {
      analysisDate: new Date().toISOString(),
      statistics: this.stats,
      summary: {
        categoriesAnalyzed: [...new Set(this.results.parameters.map(p => p.category))],
        totalUniqueParameters: new Set(this.results.parameters.map(p => `${p.name}_${p.in}`)).size,
        totalUniqueResponses: new Set(this.results.responses.map(r => `${r.statusCode}_${r.ref}`)).size,
        totalSchemaReferences: new Set(this.results.schemas.map(s => s.ref)).size,
        mostUsedParameters: this.getMostUsedParameters(),
        mostUsedResponses: this.getMostUsedResponses(),
        mostUsedSchemas: this.getMostUsedSchemas()
      }
    };
    
    fs.writeFileSync(
      path.join(outputDir, 'analysis-summary.json'), 
      JSON.stringify(report, null, 2)
    );
    
    console.log(`   📄 analysis-summary.json`);
    console.log('\n🎯 Top patterns found:');
    console.log('   Parameters:', report.summary.mostUsedParameters.slice(0, 3).map(p => p.name).join(', '));
    console.log('   Responses:', report.summary.mostUsedResponses.slice(0, 3).map(r => r.statusCode).join(', '));
    console.log('   Schemas:', report.summary.mostUsedSchemas.slice(0, 3).map(s => s.file).join(', '));
  }

  getMostUsedParameters() {
    const paramCounts = {};
    this.results.parameters.forEach(param => {
      const key = `${param.name}_${param.in}`;
      paramCounts[key] = (paramCounts[key] || 0) + 1;
    });
    
    return Object.entries(paramCounts)
      .map(([key, count]) => ({ name: key, count }))
      .sort((a, b) => b.count - a.count);
  }

  getMostUsedResponses() {
    const responseCounts = {};
    this.results.responses.forEach(resp => {
      const key = resp.statusCode;
      responseCounts[key] = (responseCounts[key] || 0) + 1;
    });
    
    return Object.entries(responseCounts)
      .map(([statusCode, count]) => ({ statusCode, count }))
      .sort((a, b) => b.count - a.count);
  }

  getMostUsedSchemas() {
    const schemaCounts = {};
    this.results.schemas.forEach(schema => {
      if (schema.schemaFile) {
        schemaCounts[schema.schemaFile] = (schemaCounts[schema.schemaFile] || 0) + 1;
      }
    });
    
    return Object.entries(schemaCounts)
      .map(([file, count]) => ({ file, count }))
      .sort((a, b) => b.count - a.count);
  }
}

// Execute the analyzer if run directly
if (require.main === module) {
  const analyzer = new OpenAPIAnalyzer();
  analyzer.run().catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });
}

module.exports = OpenAPIAnalyzer; 