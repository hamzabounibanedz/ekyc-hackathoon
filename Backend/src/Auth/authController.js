const crypto = require("crypto");
const {verifyToken} = require('../core/JWT')
const authRepository = require("./authRepository");
const catchAsync = require("../middlewares/catchAsync");
const AppError = require("../core/AppErrors");
const ApiResponse = require('../core/ApiResponse');
const Email = require("../core/Email");
const { createSendToken, createSendAccessToken } = require("./authUtil");
const { config } = require("../config/env");
const logger = require('../core/logger');

exports.refreshToken = catchAsync(async (req, res, next) => {
  const token = req.cookies.refreshJwt || req.headers.authorization?.split(' ')[1];
  if (!token) {
    logger.warn('Refresh token attempt without token');
    return next(new AppError("Authentication required", 401));
  }

  const decoded = await verifyToken(token, config.jwt.refresh.secret);
  const user = await authRepository.findUserById(decoded.id);
  
  if (!user || user.tokenVersion !== decoded.tokenVersion) {
    logger.warn(`Invalid refresh token for user ${decoded.id}`);
    return next(new AppError("Token validation failed", 401));
  }

  user.tokenVersion += 1;
  await user.save({ validateBeforeSave: false });
  logger.info(`Token refreshed for user ${user.email}`);

  createSendAccessToken(user, 200, res);
});

  exports.signup = catchAsync(async (req, res, next) => {
    // 1. Create user record with inactive status
    const newUser = await authRepository.createUser({ ...req.body, active: false });
  
    // 2. Generate OTP & save
    const otp = newUser.createOTP();
    await authRepository.saveUser(newUser);
  
    // 3. Send OTP via email
    await new Email(newUser, null, otp).sendPasswordReset(); // reuse passwordReset template or create new one
  
    logger.info(`OTP sent to ${newUser.email}`);
    new ApiResponse(201, null, 'OTP sent to email').send(res);
  });

  exports.verifyOTP = catchAsync(async (req, res, next) => {
    const { email, otp } = req.body;
    if (!email || (otp === undefined || otp === null)) {
      return next(new AppError('Email and OTP are required', 400));
    }
  
    // load even inactive users
    const user = await authRepository
      .findUserByEmail(email, { includeInactive: true })
      .catch(() => { throw new AppError('Invalid or expired code', 400); });
  
    // 1) Check expiry
    if (!user.otpExpires || user.otpExpires < Date.now()) {
      throw new AppError('Invalid or expired code', 400);
    }
  
    // 2) Timing‑safe compare — coerce otp to string
    const otpString = String(otp).trim();
    const providedHash = crypto
      .createHash('sha256')
      .update(otpString)
      .digest();
    const storedHash   = Buffer.from(user.otpCode, 'hex');
  
    if (
      providedHash.length !== storedHash.length ||
      !crypto.timingSafeEqual(providedHash, storedHash)
    ) {
      throw new AppError('Invalid or expired code', 400);
    }
  
    // 3) Activate & clear
    user.active = true;
    user.clearOTP();
    await user.save({ validateBeforeSave: false });
  
    // 4) Send welcome + JWT
    await new Email(user).sendWelcome();
    logger.info(`User ${user.email} verified via OTP`);
  
    createSendToken(user, 200, res);
  });
  

  exports.resendOTP = catchAsync(async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
      return next(new AppError('Email is required', 400));
    }
  
    // 1) Try to load even inactive users
    let user;
    try {
      user = await authRepository.findUserByEmail(email, { includeInactive: true });
    } catch (err) {
      // mask non‑existence
      logger.warn(`Resend OTP requested for unknown email`);
      return new ApiResponse(200, null, 'If your email exists, a verification code has been sent').send(res);
    }
  
    // 2) If already active, respond exactly the same
    if (user.active) {
      logger.warn(`Resend OTP attempted on active account ${email}`);
      return new ApiResponse(200, null, 'If your email exists, a verification code has been sent').send(res);
    }
  
    // 3) Generate, save, and send the new OTP
    const otp = await authRepository.generateOTP(user);
    await new Email(user, null, otp).sendOTP();
    logger.info(`Resent OTP to ${user.email}`);
  
    // 4) Always give a 200 (so callers can’t enumerate users)
    new ApiResponse(200, null, 'If your email exists, a verification code has been sent').send(res);
  });
  
  

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. Retrieve the user by email
  const user = await authRepository.findUserByEmail(req.body.email);
  if (!user) {
    logger.warn(`Password reset request for non-existent email: ${req.body.email}`);
    return next(new AppError("No account found with this email", 404));
  }

  // 2. Generate a random 6-digit reset code (as a string)
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

  // 3. Hash the reset code before storing it in the database
  user.passwordResetToken = crypto.createHash("sha256").update(resetCode).digest("hex");
  // Set the token to expire in 5 minutes
  user.passwordResetExpires = Date.now() + 5 * 60 * 1000;

  // 4. Save the updated user document without running full validations
  await authRepository.saveUser(user);

  // 5. Send the plain reset code via email (Email utility should handle formatting and sending)
  await new Email(user, null, resetCode).sendPasswordReset();

  logger.info(`Password reset code sent to ${user.email}`);
  new ApiResponse(200, null, "Password reset code sent to email").send(res);
});


exports.verifyResetCode = catchAsync(async (req, res, next) => {
  // 1. Hash the reset code received in the URL parameter
  const hashedCode = crypto.createHash("sha256").update(req.params.token).digest("hex");

  // 2. Look for a user with the matching hashed reset token and valid expiry date
  const user = await authRepository.findUserByResetToken(hashedCode);

  // 3. If no user is found or the reset token has expired, return an error
  if (!user || user.passwordResetExpires < Date.now()) {
    logger.warn(`Invalid reset code verification attempt`);
    return next(new AppError("Invalid or expired reset code", 400));
  }

  logger.info(`Reset code verified for ${user.email}`);
  new ApiResponse(200, null, "Reset code verified successfully").send(res);
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Ensure the resetCode is provided in the request body
  if (!req.body.resetCode) {
    logger.warn("No reset code provided in request body");
    return next(new AppError("Reset code is required", 400));
  }

  // 2. Hash the reset code from the request body
    const hashedCode = crypto.createHash("sha256").update(req.body.resetCode).digest("hex");

  // 3. Find the user using the hashed reset token
  const user = await authRepository.findUserByResetToken(hashedCode);
  
  // 4. Verify that the user exists and the reset token has not expired
  if (!user || user.passwordResetExpires < Date.now()) {
    logger.warn(`Invalid password reset attempt for user ${user?._id || 'unknown'}`);
    return next(new AppError("Invalid or expired reset code", 400));
  }

  // 5. Update the user's password and password confirmation fields
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  // 6. Clear the reset token and expiry fields
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  
  // 7. Save the updated user document (validations related to password will run)
  await authRepository.saveUser(user);
  logger.info(`Password reset successful for ${user.email}`);

  // 8. Optionally log the user in immediately by creating and sending a JWT
  createSendToken(user, 200, res);
});



exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    logger.warn('Login attempt without credentials');
    return next(new AppError("Credentials required", 400));
  }

  const user = await authRepository.findUserByEmail(email);
  if (!user || !(await user.correctPassword(password))) {
    logger.warn(`Failed login attempt for ${email}`);
    return next(new AppError("Invalid credentials", 401));
  }

  if (user.active === false) {
    logger.warn(`Login attempt for disabled account: ${email}`);
    return next(new AppError("Account disabled", 403));
  }

  if (user.emailConfirmationToken) {
    logger.warn(`Login attempt before email confirmation: ${email}`);
    return next(new AppError("Confirm email first", 403));
  }

  user.logInDate = Date.now();
  await authRepository.saveUser(user);

  logger.info(`Successful login for ${email}`);
  createSendToken(user, 200, res);
});

exports.logout = catchAsync(async (req, res) => {
  await authRepository.updateUserTokenVersion(req.user);
  
  logger.info(`User ${req.user.email} logged out`);
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  });
  
  res.cookie("refreshJwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  });

  new ApiResponse(200).send(res);
});