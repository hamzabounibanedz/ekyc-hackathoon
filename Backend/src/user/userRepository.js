  // repositories/userRepository.js
  const BaseRepository = require('../core/baseRepository');
  const User = require('./userModel');
  const AppError = require('../core/AppErrors');
  const logger = require('../core/logger');

  class UserRepository {
    constructor() {
      this.baseRepo = new BaseRepository(User);
      logger.debug('UserRepository initialized');
    }

    async getById(userId) {
      logger.debug(`Fetching user by ID: ${userId}`);
      try {
        const user = await this.baseRepo.getOne(userId);
        if (!user) {
          logger.error(`User not found - ID: ${userId}`);
          throw new AppError('User not found', 404);
        }
        logger.debug(`Successfully retrieved user ${userId}`);
        return user;
      } catch (error) {
        logger.error(`Failed to fetch user ${userId}: ${error.message}`, { error });
        throw error;
      }
    }
    
    async getByIdWithProfile(userId) {
      logger.debug(`Fetching full profile for user ${userId}`);
      try {
        const user = await User.findById(userId)
          .select('+active +role +email +city +photo')
        
        if (!user) {
          logger.error(`Profile not found for user: ${userId}`);
          throw new AppError('User not found', 404);
        }
        logger.info(`Retrieved full profile for user ${userId}`);
        return user;
      } catch (error) {
        logger.error(`Profile fetch failed for ${userId}: ${error.message}`, { error });
        throw error;
      }
    }

    async updateProfile(userId, updateData) {
      logger.info(`Updating profile for user ${userId}`, {
        updatedFields: Object.keys(updateData)
      });
      try {
        const user = await User.findByIdAndUpdate(userId, updateData, {
          new: true,
          runValidators: true
        }).select('-password -passwordChangedAt');
        
        if (!user) {
          logger.error(`Update failed - user not found: ${userId}`);
          throw new AppError('User not found', 404);
        }
        logger.info(`Profile updated for user ${userId}`);
        return user;
      } catch (error) {
        logger.error(`Profile update failed for ${userId}: ${error.message}`, { error });
        throw error;
      }
    }

    async deactivateUser(userId) {
      logger.warn(`Initiating account deactivation for user ${userId}`);
      try {
        const user = await User.findByIdAndUpdate(userId, { active: false });
        if (!user) {
          logger.error(`Deactivation failed - user not found: ${userId}`);
          throw new AppError('User not found', 404);
        }
        logger.warn(`User account deactivated: ${userId}`);
        return user;
      } catch (error) {
        logger.error(`Deactivation failed for ${userId}: ${error.message}`, { error });
        throw error;
      }
    }

    async updatePassword(userId, newPassword, passwordConfirm) {
      logger.info(`Initiating password update for user ${userId}`);
      try {
        if (newPassword !== passwordConfirm) {
          logger.warn('Password mismatch during update attempt', { userId });
          throw new AppError('Passwords do not match', 400);
        }

        const user = await User.findById(userId);
        if (!user) {
          logger.error(`Password update failed - user not found: ${userId}`);
          throw new AppError('User not found', 404);
        }

        user.password = newPassword;
        user.passwordConfirm = passwordConfirm;
        await user.save();
        
        logger.info(`Password successfully updated for user ${userId}`);
        return user;
      } catch (error) {
        logger.error(`Password update failed for ${userId}: ${error.message}`, { error });
        throw error;
      }
    }

    async getTeachersWithCategory() {
      logger.debug('Fetching teachers with category information');
      try {
        const teachers = await User.aggregate([
          { $match: { role: 'teacher' } },
          {
            $lookup: {
              from: 'categories',
              localField: 'teachingCategories',
              foreignField: '_id',
              as: 'categories'
            }
          }
        ]);
        logger.info(`Retrieved ${teachers.length} teachers with categories`);
        return teachers;
      } catch (error) {
        logger.error('Failed to fetch teachers with categories', { error });
        throw error;
      }
    }

  async getAll(filter = {}) {
      logger.debug('Fetching all users', { filter });
      try {
        const users = await this.baseRepo.getAll(filter);
        logger.info(`Retrieved ${users.length} users from database`);
        return users;
      } catch (error) {
        logger.error('Failed to fetch users', { error });
        throw error;
      }
    }

    async update(id, data) {
      logger.debug(`Updating user ${id}`, { updateData: data });
      try {
        const result = await this.baseRepo.update(id, data);
        logger.info(`User ${id} updated successfully`);
        return result;
      } catch (error) {
        logger.error(`Failed to update user ${id}: ${error.message}`, { error });
        throw error;
      }
    }

    async delete(id) {
      logger.warn(`Initiating deletion for user ${id}`);
      try {
        const result = await this.baseRepo.delete(id);
        logger.warn(`User ${id} permanently deleted`);
        return result;
      } catch (error) {
        logger.error(`Failed to delete user ${id}: ${error.message}`, { error });
        throw error;
      }
    }

    async distinct(field, query = {}) {
      logger.debug('Fetching distinct values', { field, query });
      try {
        const result = await this.baseRepo.distinct(field, query);
        logger.info(`Found ${result.length} distinct ${field} values`);
        return result;
      } catch (error) {
        logger.error(`Distinct query failed for field ${field}`, { error });
        throw error;
      }
    }

    async count(query = {}) {
      logger.debug('Counting users', { query });
      try {
        const count = await this.baseRepo.count(query);
        logger.info(`User count: ${count}`, { query });
        return count;
      } catch (error) {
        logger.error('Failed to count users', { error });
        throw error;
      }
    }
  }

  module.exports = new UserRepository();