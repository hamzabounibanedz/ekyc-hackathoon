const { signToken, signRefreshToken, daysToMs } = require("../core/JWT");
const ApiResponse = require('../core/ApiResponse');
const logger = require('../core/logger');
const { config } = require("../config/env");

const createSendToken = (user, statusCode, res) => {
  try {
    const token = signToken(user._id, user.tokenVersion);
    const refreshToken = signRefreshToken(user._id, user.tokenVersion);

    const cookieOptions = {
      expires: new Date(
        Date.now() + daysToMs(parseInt(config.jwt.access.cookieExpires, 10))
      ),
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production"
    };

    const refreshCookieOptions = {
      ...cookieOptions,
      expires: new Date(
        Date.now() + daysToMs(parseInt(config.jwt.refresh.cookieExpires, 10))
      )
    };

    res.cookie("jwt", token, cookieOptions);
    res.cookie("refreshJwt", refreshToken, refreshCookieOptions);
    res.cookie("userRole", user.role, { 
      httpOnly: true, 
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production"
    });

    user.password = undefined;

    logger.info(`Authentication tokens generated for ${user._id} (${user.role})`);
    new ApiResponse(statusCode, {
      user,
      token,
      refreshToken,
      userRole: user.role
    }).send(res);

  } catch (error) {
    logger.error(`Token creation error for ${user?._id || 'unknown'}: ${error.message}`);
    new ApiResponse(500, null, "Authentication system error").send(res);
  }
};

const createSendAccessToken = (user, statusCode, res) => {
  try {
    const token = signToken(user._id, user.tokenVersion);
    
    const cookieOptions = {
      expires: new Date(
        Date.now() + daysToMs(parseInt(config.jwt.access.cookieExpires, 10))
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict"
    };

    res.cookie("jwt", token, cookieOptions);
    res.cookie("userRole", user.role, {
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production"
    });

    logger.info(`Access token refreshed for ${user._id} (${user.role})`);
    new ApiResponse(statusCode, {
      user,
      token,
      userRole: user.role
    }).send(res);

  } catch (error) {
    logger.error(`Access token creation error for ${user?._id || 'unknown'}: ${error.message}`);
    new ApiResponse(500, null, "Authentication system error").send(res);
  }
};

module.exports = { createSendToken, createSendAccessToken };