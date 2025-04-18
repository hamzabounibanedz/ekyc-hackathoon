const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  
  db: {
    uri: process.env.DATABASE,
    password: process.env.DATABASE_PASSWORD
  },

  jwt: {
    access: {
      secret: process.env.JWT_ACCESS,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
      cookieExpires: parseInt(process.env.JWT_ACCESS_COOKIE_EXPIRES_IN, 10)
    },
    refresh: {
      secret: process.env.JWT_REFRESH,
      expiresIn: process.env.JWT_REFRESH_EXPIRES,
      cookieExpires: parseInt(process.env.JWT_REFRESH_COOKIE_EXPIRES_IN, 10)
    }
  },

  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') || [ 
      'http://localhost:3001',
      'http://127.0.0.1:3000',]
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY
  },

  email: {
    service: process.env.EMAIL_SERVICE || 'mailtrap',
    mailtrap: {
      username: process.env.EMAIL_USERNAME,
      password: process.env.EMAIL_PASSWORD,
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT
    },
    mailjet: {
      apiKey: process.env.MAILJET_API_KEY,
      secretKey: process.env.MAILJET_SECRET_KEY
    }
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    defaultExpiration: parseInt(process.env.REDIS_DEFAULT_EXPIRATION, 10) || 3600, // Add this line
  },
};

// Validate required environment variables
const requiredVariables = [
  'DATABASE',
  'DATABASE_PASSWORD',
  'JWT_ACCESS',
  'JWT_REFRESH'
];

requiredVariables.forEach(variable => {
  if (!process.env[variable]) {
    throw new Error(`❌ Environment variable ${variable} is required`);
  }
});

module.exports = { config };