const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const { env, logger } = require('../config');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// Load OpenAPI specification
const openapiSpecPath = path.join(__dirname, '../../docs/openapi.yaml');
const swaggerDocument = YAML.load(openapiSpecPath);

// Custom Swagger UI options for trAIner branding
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { 
      background-color: #121212; 
      border-bottom: 2px solid #3E9EFF;
    }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
    .swagger-ui .info .title { color: #3E9EFF; }
    .swagger-ui .scheme-container { background: #1a1a1a; }
    .swagger-ui .btn.authorize { background-color: #3E9EFF; border-color: #3E9EFF; }
    .swagger-ui .btn.authorize:hover { background-color: #2d7bc7; }
  `,
  customSiteTitle: "trAIner API Documentation",
  customfavIcon: "/favicon.ico",
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    deepLinking: true
  }
};

// Development-only authentication middleware
const devOnlyAuth = (req, res, next) => {
  if (env.isProduction) {
    // In production, require JWT authentication
    return authenticateJWT(req, res, next);
  }
  // In development, allow access without authentication
  next();
};

// Serve Swagger UI
router.use('/', devOnlyAuth, swaggerUi.serve);
router.get('/', devOnlyAuth, swaggerUi.setup(swaggerDocument, swaggerUiOptions));

// API version endpoint that includes documentation link
router.get('/version', (req, res) => {
  res.json({
    api: {
      version: 'v1',
      documentation: `${req.protocol}://${req.get('host')}/v1/api-docs`,
      openapi: '3.0.0'
    }
  });
});

module.exports = router; 