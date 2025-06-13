/**
 * @fileoverview Security Middleware
 * Implements defense-in-depth security measures for the API
 */

const helmet = require('helmet');
const cors = require('cors');
const { randomBytes } = require('crypto');
const { env, logger } = require('../config');

/**
 * Configure Helmet with appropriate security headers
 * 
 * @returns {Function} Express middleware
 */
const configureHelmet = () => {
  // Default Helmet configuration
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
        connectSrc: ["'self'", env.supabase && env.supabase.url, "https://api.openai.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    // Setting custom headers to enhance security
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
    crossOriginResourcePolicy: { policy: "same-origin" },
    crossOriginEmbedderPolicy: false, // May need to be false if you use third-party resources
    crossOriginOpenerPolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hidePoweredBy: true,
    xssFilter: true,
    noSniff: true,
    frameguard: { action: 'deny' }
  });
};

/**
 * Configure CORS with environment-aware settings
 * 
 * @returns {Function} Express middleware
 */
const configureCors = () => {
  // Parse allowed origins from environment variable
  const allowedOrigins = env.cors && env.cors.origin 
    ? Array.isArray(env.cors.origin) 
      ? env.cors.origin 
      : env.cors.origin.split(',').map(origin => origin.trim())
    : [];

  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl requests)
      if (!origin) {
        return callback(null, true);
      }
      
      // Allow whitelisted origins OR allow any origin in development for ease of use
      if ((allowedOrigins.indexOf(origin) !== -1) || env.env === 'development') {
        return callback(null, true);
      }
      
      // Block origins not in the allowlist (including in test environment)
      logger.warn('CORS blocked request from origin:', origin);
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
    maxAge: 86400 // 24 hours
  };

  return cors(corsOptions);
};

/**
 * CSRF Protection middleware
 * Implements token-based CSRF protection
 * Only needed for cookie-based authentication
 * 
 * @returns {Object} CSRF middleware functions
 */
const csrfProtection = () => {
  // Only use CSRF protection if enabled in config
  if (!env.security || !env.security.csrfProtection) {
    return {
      // Return dummy middlewares if CSRF is disabled
      generateToken: (req, res, next) => next(),
      verifyToken: (req, res, next) => next()
    };
  }

  // Generate a random token with adequate entropy
  const generateCsrfToken = (req, res, next) => {
    const token = randomBytes(32).toString('hex');
    
    // Store token in the session (if using sessions) or in a secure cookie
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false, // Needs to be accessible from JavaScript
      secure: env.env === 'production', // Only use secure cookies in production
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Store in request for potential use in the same request cycle
    req.csrfToken = token;
    
    next();
  };

  // Verify the CSRF token
  const verifyCsrfToken = (req, res, next) => {
    // Skip CSRF check for GET, HEAD, OPTIONS requests (they should be safe)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    // Get token from request header
    const token = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
    
    // Get the token value from the cookie
    const cookieToken = req.cookies && req.cookies['XSRF-TOKEN'];
    
    // If either token is missing or they don't match
    if (!token || !cookieToken || token !== cookieToken) {
      logger.warn('CSRF validation failed', {
        ip: req.ip,
        path: req.originalUrl,
        method: req.method,
        hasToken: !!token,
        hasCookieToken: !!cookieToken
      });
      
      return res.status(403).json({
        status: 'error',
        message: 'CSRF validation failed',
        code: 'CSRF_VALIDATION_FAILED'
      });
    }
    
    next();
  };

  return {
    generateToken: generateCsrfToken,
    verifyToken: verifyCsrfToken
  };
};

/**
 * SQL Injection prevention middleware
 * This provides an additional layer of protection
 * beyond parameterized queries in the database layer
 * 
 * @returns {Function} Express middleware
 */
const sqlInjectionProtection = () => {
  return (req, res, next) => {
    // Function to check a value for potential SQL injection patterns
    const checkForSqlInjection = (value) => {
      if (typeof value !== 'string') return false;
      
      // Common SQL injection patterns to check for
      const sqlPatterns = [
        /('|%27|--|\(|\)|;|=|%3D)/i, // Basic SQL injection characters
        /(union|select|insert|update|delete|drop|alter|truncate|declare)/i, // SQL commands
        /(exec\s+xp_|exec\s+sp_)/i // SQL stored procedures
      ];
      
      // Check value against each pattern
      return sqlPatterns.some(pattern => pattern.test(value));
    };
    
    // Recursively check objects for SQL injection patterns
    const checkObject = (obj) => {
      if (!obj) return false;
      
      if (typeof obj === 'string' && checkForSqlInjection(obj)) {
        return true;
      }
      
      if (typeof obj === 'object') {
        // Check all values in the object
        return Object.values(obj).some(value => {
          if (typeof value === 'string') {
            return checkForSqlInjection(value);
          } else if (typeof value === 'object' && value !== null) {
            return checkObject(value);
          }
          return false;
        });
      }
      
      return false;
    };
    
    // Check request parameters, query, and body
    const hasSuspiciousParams = checkObject(req.params);
    const hasSuspiciousQuery = checkObject(req.query);
    const hasSuspiciousBody = checkObject(req.body);
    
    if (hasSuspiciousParams || hasSuspiciousQuery || hasSuspiciousBody) {
      logger.warn('Potential SQL injection detected', {
        ip: req.ip,
        path: req.originalUrl,
        method: req.method,
        params: req.params,
        query: req.query
        // Don't log req.body to avoid logging sensitive data
      });
      
      return res.status(403).json({
        status: 'error',
        message: 'Request contains disallowed characters or patterns',
        code: 'INVALID_INPUT'
      });
    }
    
    next();
  };
};

/**
 * Setup all security middleware for Express app
 * 
 * @param {Object} app - Express app instance
 */
const setupSecurityMiddleware = (app) => {
  // Apply Helmet with appropriate security headers
  app.use(configureHelmet());
  
  // Configure CORS with environment-aware settings
  app.use(configureCors());
  
  // CSRF protection is generally not needed for stateless APIs authenticated with Bearer tokens.
  // If cookie-based sessions were used for any part of the app, this might be relevant there.
  // const csrf = csrfProtection();
  // if (env.security && env.security.csrfProtection) {
  //   // Generate CSRF token for all routes
  //   logger.debug('[TEST_DEBUG] Applying csrf.generateToken middleware');
  //   app.use(csrf.generateToken);
  //   
  //   // Verify CSRF token for state-changing routes (POST, PUT, DELETE, PATCH)
  //   logger.debug('[TEST_DEBUG] Applying csrf.verifyToken middleware');
  //   app.use(csrf.verifyToken);
  // }
  
  // Apply SQL injection protection as an additional defense layer
  app.use(sqlInjectionProtection());
  
  // Add secure Cache-Control headers
  app.use((req, res, next) => {
    // Add Cache-Control header to protect against caching sensitive information
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  // Log security middleware setup
  logger.info('Security middleware configured', { 
    environment: env.env,
    // csrfEnabled: !!(env.security && env.security.csrfProtection) // CSRF is no longer applied by default here
    csrfProtectionStatus: (env.security && env.security.csrfProtection) ? 'Configured but not applied to API routes' : 'Not configured'
  });
};

module.exports = {
  setupSecurityMiddleware,
  configureHelmet,
  configureCors,
  csrfProtection,
  sqlInjectionProtection
}; 