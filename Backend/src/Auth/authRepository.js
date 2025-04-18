const BaseRepository = require('../core/baseRepository');
const User = require('../user/userModel');
const AppError = require('../core/AppErrors');
const logger = require('../core/logger');

class AuthRepository {
  constructor() {
    this.userBaseRepo = new BaseRepository(User);
  }

  async findUserById(id) {
    const user = await this.userBaseRepo.getOne(id);
    if (!user) {
      logger.warn(`User not found with ID: ${id}`);
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async findUserByEmail(email, { includeInactive = false } = {}) {
    const query = User.findOne({ email }).select('+password');
    if (includeInactive) query.setOptions({ includeInactive: true });
    const user = await query;
    if (!user) {
      logger.warn(`User not found with email: ${email}`);
      throw new AppError('User not found', 404);
    }
    return user;
  }

  /**
   * Generate a fresh OTP on the user, save it, and return the plain OTP.
   */
  async generateOTP(user) {
    const otp = user.createOTP();               // sets otpCode & otpExpires
    await user.save({ validateBeforeSave: false });
    logger.info(`Generated new OTP for ${user.email}`);
    return otp;
  }

  async findUserByEmailAndToken(email, token) {
    const user = await User.findOne({
      email,
      emailConfirmationToken: token,
      emailConfirmationExpires: { $gt: Date.now() },
    });
    
    if (!user) {
      logger.error(`Invalid email confirmation token for: ${email}`);
      throw new AppError('Invalid or expired token', 400);
    }
    return user;
  }

  async updateUserTokenVersion(user) {
    user.tokenVersion += 1;
    await user.save({ validateBeforeSave: false });
    logger.info(`Token version updated for user: ${user.email}`);
    return user;
  }

  async createUser(userData) {
    const user = await this.userBaseRepo.create(userData);
    logger.info(`New user created: ${user.email}`);
    return user;
  }

  async saveUser(user) {
    await user.save({ validateBeforeSave: false });
    logger.debug(`User saved: ${user.email}`);
    return user;
  }

  async findUserByResetToken(hashedToken) {
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
    
    if (!user) {
      logger.error(`Invalid password reset token`);
      throw new AppError('Invalid or expired reset token', 400);
    }
    return user;
  }
}

module.exports = new AuthRepository();