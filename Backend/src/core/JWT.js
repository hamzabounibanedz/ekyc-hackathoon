const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const { config } = require("../config/env");
const AppError = require('./AppErrors');
const logger = require('./logger');

const signToken = (id, tokenVersion) => {
  try {
    const token = jwt.sign(
      { id, tokenVersion }, 
      config.jwt.access.secret, 
      { expiresIn: config.jwt.access.expiresIn }
    );
    
    logger.debug('Access token generated successfully', {
      userId: id,
      tokenVersion,
      expiresIn: config.jwt.access.expiresIn
    });
    
    return token;
  } catch (error) {
    logger.error('Failed to generate access token', {
      error: error.message,
      stack: error.stack,
      userId: id
    });
    throw new AppError('Failed to generate access token', 500);
  }
};

const signRefreshToken = (id, tokenVersion) => {
  try {
    const refreshToken = jwt.sign(
      { id, tokenVersion }, 
      config.jwt.refresh.secret, 
      { expiresIn: config.jwt.refresh.expiresIn }
    );
    
    logger.debug('Refresh token generated successfully', {
      userId: id,
      tokenVersion,
      expiresIn: config.jwt.refresh.expiresIn
    });
    
    return refreshToken;
  } catch (error) {
    logger.error('Failed to generate refresh token', {
      error: error.message,
      stack: error.stack,
      userId: id
    });
    throw new AppError('Failed to generate refresh token', 500);
  }
};

const verifyToken = async (token, secret) => {
  try {
    logger.debug('Verifying JWT token', {
      token: config.env === 'development' ? token : '***REDACTED***'
    });
    
    const decoded = await promisify(jwt.verify)(token, secret);
    
    logger.debug('Token verified successfully', {
      userId: decoded.id,
      tokenVersion: decoded.tokenVersion
    });
    
    return decoded;
  } catch (error) {
    logger.error('Token verification failed', {
      error: error.message,
      stack: error.stack,
      tokenType: secret === config.jwt.access.secret ? 'access' : 'refresh'
    });
    throw new AppError('Invalid or expired token', 401);
  }
};

const daysToMs = (days) => {
  if (typeof days !== 'number' || days <= 0) {
    logger.warn('Invalid days value provided for cookie expiration', {
      receivedValue: days,
      expectedType: 'positive number'
    });
    throw new AppError('Invalid days value for cookie expiration', 500);
  }
  return days * 24 * 60 * 60 * 1000;
};

const getUserIdFromToken = (req) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1]; // Extract token after 'Bearer'
    // If token is "null", fallback to cookies
    if (!token || token === 'null') {
      token = req.cookies && req.cookies.jwt;
    }
  } else if (req.cookies && req.cookies.jwt) {
    // Get the token from the cookie if no valid header token is provided
    token = req.cookies.jwt;
  }
  
  let userId = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.access.secret);
      userId = decoded.id;
      logger.debug(`Optional token decoded successfully. userId: ${userId}`);
    } catch (err) {
      logger.error('Optional token verification failed', { error: err.message });
    }
  }
  return userId;
};


module.exports = {
  signToken,
  signRefreshToken,
  verifyToken,
  daysToMs,
  getUserIdFromToken
};