const basicAuth = require('express-basic-auth');
const { env } = require('../config');

const swaggerBasicAuth = () => {
  if (!env.isProduction) {
    return (req, res, next) => next();
  }

  return basicAuth({
    users: { 
      [env.API_DOCS_USERNAME || 'admin']: env.API_DOCS_PASSWORD || 'change_me'
    },
    challenge: true,
    realm: 'trAIner API Documentation'
  });
};

module.exports = { swaggerBasicAuth }; 