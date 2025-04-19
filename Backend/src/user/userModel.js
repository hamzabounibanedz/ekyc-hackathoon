const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const logger = require('../core/logger');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 8, select: false },
  passwordConfirm: { type: String, required: true, validate: {
      validator: function(el){ return el === this.password; },
      message: 'Passwords do not match'
  }},

  // --- OTP fields ---
  otpCode: String,
  otpExpires: Date,
  kycStatus: {
        type: String,
        enum: ['not_started','pending','needs_review','approved'],
        default: 'not_started'
      },
  kycJob: { type: mongoose.Schema.Types.ObjectId, ref: 'KycJob' },
  kycCid: String,
  kycTxHash: String,
  // existing fields:
  tokenVersion: { type: Number, default: 0 },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: { type: Boolean, default: false, select: false },
  registerDate: { type: Date, default: Date.now },
  city: { type: String, required: true },
  logInDate: Date
});

// Password Hashing Middleware
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) {
    logger.debug(`Password not modified for user ${this._id}`);
    return next();
  }

  try {
    logger.info(`Hashing password for user ${this._id}`);
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    logger.debug(`Password hashed successfully for user ${this._id}`);
    next();
  } catch (error) {
    logger.error(`Password hashing failed for user ${this._id}`, {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
});

// Password Change Timestamp Middleware
userSchema.pre("save", function(next) {
  if (!this.isModified("password") || this.isNew) {
    logger.debug(`No password change detected for user ${this._id}`);
    return next();
  }

  logger.info(`Updating password timestamp for user ${this._id}`);
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function(next) {
  // only filter out inactive when someone DOESN'T explicitly ask for them
  if (this.getOptions().includeInactive) {
    return next();
  }
  this.find({ active: true });
  next();
});

// Updated Password Validation Method: now using this.password directly
userSchema.methods.correctPassword = async function(candidatePassword) {
  logger.debug(`Initiating password validation for user ${this._id}`);
  try {
    // Make sure this.password is available; it should be if the query explicitly selected it.
    if (!this.password) {
      throw new Error("User password not selected from DB");
    }
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    logger.debug(`Password validation result for user ${this._id}: ${isMatch}`);
    return isMatch;
  } catch (error) {
    logger.error(`Password validation failed for user ${this._id}`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Password Change Check Method
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  logger.debug(`Checking password change status for user ${this._id}`);
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    const isChanged = JWTTimestamp < changedTimestamp;
    logger.info(`Password change check result for user ${this._id}: ${isChanged}`);
    return isChanged;
  }
  return false;
};

// Password Reset Token Generation
userSchema.methods.createPasswordResetToken = function() {
  logger.info(`Generating password reset token for user ${this._id}`);
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  logger.debug(`Password reset token metadata for user ${this._id}`, {
    expires: new Date(this.passwordResetExpires),
    tokenVersion: this.tokenVersion
  });

  return resetToken;
};

// Email Confirmation Token Generation
userSchema.methods.createEmailConfirmationToken = function() {
  logger.info(`Generating email confirmation token for user ${this._id}`);
  const confirmToken = crypto.randomBytes(32).toString("hex");

  this.emailConfirmationToken = crypto
    .createHash("sha256")
    .update(confirmToken)
    .digest("hex");

  this.emailConfirmationExpires = Date.now() + 10 * 60 * 1000;

  logger.debug(`Email confirmation token metadata for user ${this._id}`, {
    expires: new Date(this.emailConfirmationExpires)
  });

  return confirmToken;
};

// User Lifecycle Hooks
userSchema.post('save', function(doc) {
  if (doc.isNew) {
    logger.info(`New user created: ${doc._id}`, {
      name: doc.name,
      email: doc.email,
      role: doc.role,
      city: doc.city
    });
  } else {
    const modifiedFields = Object.keys(doc.modifiedPaths());
    logger.debug(`User updated: ${doc._id}`, {
      modifiedFields,
      updatedAt: doc.updatedAt
    });
  }
});
// OTP generation method:
userSchema.methods.createOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otpCode = crypto.createHash('sha256').update(otp).digest('hex');
  this.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return otp;
};

// Clean OTP after verification:
userSchema.methods.clearOTP = function() {
  this.otpCode = undefined;
  this.otpExpires = undefined;
};

userSchema.post('remove', function(doc) {
  logger.warn(`User account deleted: ${doc._id}`, {
    email: doc.email,
    role: doc.role
  });
});

const User = mongoose.model("User", userSchema);
logger.info('User model initialized with authentication and logging hooks');

module.exports = User;