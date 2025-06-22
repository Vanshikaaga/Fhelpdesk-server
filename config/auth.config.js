require('dotenv').config();

// Log warning for missing environment variables
const warnIfMissing = (envVar, defaultValue, critical = false) => {
  if (!process.env[envVar] && process.env.NODE_ENV !== 'test') {
    if (critical) {
      console.error(`Critical Error: Environment variable ${envVar} is not set. Application may not function correctly.`);
    } else {
      console.warn(`Warning: Environment variable ${envVar} is not set. Using default value.`);
    }
  }
  return process.env[envVar] || defaultValue;
};

// Validate configuration
const validateConfig = () => {
  const criticalVars = ['MONGODB_URI', 'JWT_SECRET', 'FB_APP_ID', 'FB_APP_SECRET'];
  let missingCriticalVars = false;
  
  criticalVars.forEach(varName => {
    if (!process.env[varName] && process.env.NODE_ENV !== 'test') {
      console.error(`Critical Error: Environment variable ${varName} is not set.`);
      missingCriticalVars = true;
    }
  });
  
  if (missingCriticalVars && process.env.NODE_ENV === 'production') {
    console.error('Missing critical environment variables in production mode. Please set these variables before running the application.');
  }
};

// Run validation on startup
validateConfig();

// Facebook configuration with defaults for development
const facebookConfig = {
  appId: warnIfMissing('FB_APP_ID', '12345678901234', true),
  appSecret: warnIfMissing('FB_APP_SECRET', 'fb_app_secret_placeholder', true),
  webhookVerifyToken: warnIfMissing('FB_WEBHOOK_VERIFY_TOKEN', 'my_webhook_verify_token'),
  graphApiVersion: process.env.FB_GRAPH_API_VERSION || 'v18.0'
};

// Auth configuration
module.exports = {
  jwtSecret: warnIfMissing('JWT_SECRET', 'fb-helpdesk-dev-secret-key', true),
  jwtExpiration: parseInt(process.env.JWT_EXPIRATION || 86400), // 24 hours in seconds
  
  // Facebook configuration
  facebook: facebookConfig
}; 