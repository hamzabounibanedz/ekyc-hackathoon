const { promisify } = require("util");
const { verifyToken } = require("../core/JWT");
const User = require("../user/userModel");
const catchAsync = require("../middlewares/catchAsync");
const AppError = require("../core/AppErrors");
const { config } = require("../config/env");
const logger = require('../core/logger');

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  // 1) Get the token from headers or cookies
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1]; // Extract token after 'Bearer'

    // If token is "null", fallback to cookies
    if (!token || token === 'null') {
      token = req.cookies.jwt; // Fallback to token from cookies
    }
  } else if (req.cookies.jwt){
    // Get the token from the cookie if no valid header token is provided
    token = req.cookies.jwt;
  }

  if (!token || token === "null") {
    logger.warn('Attempt to access protected route without token');
    return next(new AppError("You are not logged in! Please log in to get access.", 401));
  }

  try {
    const decoded = await verifyToken(token, config.jwt.access.secret);
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      logger.warn(`Token valid but user missing: ${decoded.id}`);
      return next(new AppError("The user belonging to this token no longer exists.", 401));
    }

    if (currentUser.tokenVersion !== decoded.tokenVersion) {
      logger.warn(`Token version mismatch for user ${currentUser.id}`);
      return next(new AppError("Token is invalid or has expired", 401));
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      logger.warn(`Password changed after token issuance for ${currentUser.id}`);
      return next(new AppError("User recently changed password! Please log in again.", 401));
    }

    req.user = currentUser;
    logger.info(`User ${currentUser.id} (${currentUser.role}) granted access`);
    next();
  } catch (err) {
    logger.error(`Token verification failed: ${err.message}`);
    return next(new AppError("Token is invalid or has expired", 401));
  }
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by ${req.user.id} (role: ${req.user.role})`);
      return next(new AppError("You do not have permission to perform this action", 403));
    }
    logger.debug(`Role check passed for ${req.user.id} (required roles: ${roles.join(', ')})`);
    next();
  };
};