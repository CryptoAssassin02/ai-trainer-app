// Mock implementation for error handler middleware
const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = null;

  // Determine status code and message based on error type
  if (err.statusCode) {
    statusCode = err.statusCode;
  }
  
  if (err.message) {
    message = err.message;
  }
  
  if (err.details) {
    details = err.details;
  }

  // Send formatted error response
  res.status(statusCode).json({
    status: 'error',
    message: message,
    details: details || undefined
  });
};

module.exports = errorHandler; 