/**
 * @fileoverview Logger configuration
 * Configures Winston logger with appropriate transports and formats
 */

const winston = require('winston');
const { format, transports } = winston;
const path = require('path');

// Determine environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

// Custom format for console output
const consoleFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.colorize(),
  format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let logMessage = `${timestamp} ${level}: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
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
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

// Define logger configuration
const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  // silent: isTest, // <<< Temporarily disable silencing for debugging tests
  format: fileFormat,
  transports: [
    // Console transport for development AND test (for debugging)
    new transports.Console({
      format: consoleFormat
    }),
    
    // File transports for production
    ...(process.env.NODE_ENV === 'production' ? [
      // Error logs
      new transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5
      }),
      
      // Combined logs
      new transports.File({
        filename: path.join('logs', 'combined.log'),
        maxsize: 10485760, // 10MB
        maxFiles: 5
      })
    ] : [])
  ]
});

// Add request logger format
logger.requestFormat = (req, res) => ({
  method: req.method,
  url: req.originalUrl || req.url,
  ip: req.ip || req.connection.remoteAddress,
  status: res.statusCode,
  userAgent: req.headers['user-agent'],
  responseTime: res.responseTime
});

module.exports = logger; 