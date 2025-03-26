const jwt = require('jsonwebtoken');
const { config, logger } = require('../config/config');

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        status: 'error',
        message: 'No authorization token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Add user data to request object
    req.user = decoded;
    
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
};

module.exports = { verifyToken }; 