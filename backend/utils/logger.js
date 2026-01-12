/**
 * @fileoverview Enhanced logging utilities
 * Provides structured, secure logging with sensitive data redaction
 */

const winston = require('winston');
const { format, transports } = winston;
const path = require('path');

// Determine environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';

// List of sensitive fields to redact
const SENSITIVE_FIELDS = [
  'password', 
  'token', 
  'refreshToken', 
  'jwtToken', 
  'accessToken',
  'secret', 
  'apiKey', 
  'key',
  'jwt', 
  'authorization',
  'ssn', 
  'creditCard',
  'email'
];

/**
 * Custom format for redacting sensitive data
 * This prevents logging sensitive information
 */
const redactSensitive = format((info) => {
  // Create deep copy of info to avoid modifying original
  const sanitized = JSON.parse(JSON.stringify(info));
  
  // Function to recursively redact sensitive data
  const redactRecursive = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      // Check if field name contains sensitive terms (case insensitive)
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_FIELDS.some(field => 
        lowerKey.includes(field.toLowerCase())
      );
      
      if (isSensitive) {
        // Redact sensitive data
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        // Recursively process nested objects
        redactRecursive(obj[key]);
      }
    });
  };
  
  redactRecursive(sanitized);
  return sanitized;
});

// Custom format for console output
const consoleFormat = format.combine(
  redactSensitive(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.colorize(),
  format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let logMessage = `${timestamp} ${level}: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      // Format metadata for better readability
      const metaStr = JSON.stringify(meta, null, isDevelopment ? 2 : 0);
      logMessage += ` ${metaStr}`;
    }
    
    // Add stack trace for errors if available
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    return logMessage;
  })
);

// Custom format for file logs
const fileFormat = format.combine(
  redactSensitive(),
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

// Configure transports based on environment
const logTransports = [
  // Console transport for all environments (can be silent in tests)
  new transports.Console({
    format: consoleFormat,
    silent: isTest && !process.env.DEBUG_TESTS
  })
];

// Add file transports for production
if (isProduction) {
  // Ensure logs directory exists
  const logsDir = path.join(process.cwd(), 'logs');
  
  // Add error log transport
  logTransports.push(
    new transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  );
  
  // Add combined log transport
  logTransports.push(
    new transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  );
}

// Define logger configuration
const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : isTest ? 'error' : 'info',
  format: fileFormat,
  transports: logTransports,
  // Exit on error
  exitOnError: false
});

// Add request logger format helper
logger.requestFormat = (req, res) => ({
  method: req.method,
  url: req.originalUrl || req.url,
  ip: req.ip || req.connection.remoteAddress,
  status: res.statusCode,
  userAgent: req.headers['user-agent'],
  responseTime: res.responseTime,
  userId: req.user?.id || 'anonymous'
});

// Add helper for fatal errors (not provided by Winston by default)
logger.fatal = (message, meta) => {
  logger.error(`FATAL: ${message}`, meta);
};

module.exports = logger; 