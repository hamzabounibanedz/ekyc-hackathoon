const APIFeatures = require('./apiFeatures');
const AppError = require('./AppErrors');
const logger = require('./logger');

class BaseRepository {
  constructor(Model) {
    this.Model = Model;
  }

  // In BaseRepository.js
  async getAll(filter = {}, options = {}, populateOptions = []) { // Split into filter/options
    try {
      // 1. Data Query Setup
      let query = this.Model.find(filter); // Apply filter directly

      // 2. Use APIFeatures ONLY for options (sort, limit, pagination)
      const apiFeatures = new APIFeatures(query, options)
        .sort()
        .limitFields()
        .paginate();

      query = apiFeatures.query;

      // Apply population
      if (populateOptions.length > 0) {
        query = populateOptions.reduce((q, populate) => 
          q.populate(populate), query);
      }

      // 3. Execute Data Query
      const data = await query;

      // 4. Count Total Documents (using original filter)
      const total = await this.Model.countDocuments(filter);

      // 5. Pagination Metadata
      const page = parseInt(options.page, 10) || 1;
      const limit = parseInt(options.limit, 10) || 10;
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        pagination: { total, page, limit, totalPages }
      };
    } catch (error) {
      logger.error(`Failed to fetch data: ${error.message}`, { error });
      throw error;
    }
  }
  async findOne(filter, populateOptions = []) {
    try {
      let query = this.Model.findOne(filter);
      
      populateOptions.forEach(populate => {
        query = query.populate(populate);
      });
  
      const doc = await query;
      if (!doc) {
        logger.debug(`No document found in ${this.Model.modelName} with filter`, { filter });
        return null;
      }
  
      logger.debug(`Retrieved ${this.Model.modelName} document with filter`, { filter });
      return doc;
    } catch (error) {
      logger.error(`Failed to retrieve ${this.Model.modelName} document`, {
        filter,
        error: error.message
      });
      throw error;
    }
  }
  async createMany(data) {
    try {
      // Use insertMany to create multiple documents in one call
      const docs = await this.Model.insertMany(data);
      logger.info(`Created ${docs.length} new ${this.Model.modelName} documents`);
      return docs;
    } catch (error) {
      logger.error(`Failed to create many ${this.Model.modelName} documents: ${error.message}`, { error });
      throw error;
    }
  }
  async getOne(id, populateOptions = []) {
    try {
      let query = this.Model.findById(id);
      
      populateOptions.forEach(populate => {
        query = query.populate(populate);
      });

      const doc = await query;
      if (!doc) {
        logger.warn(`Document not found in ${this.Model.modelName}`, { documentId: id });
        throw new AppError(`Document not found with id ${id}`, 404);
      }

      logger.debug(`Retrieved ${this.Model.modelName} document`, { documentId: id });
      return doc;
    } catch (error) {
      logger.error(`Failed to retrieve ${this.Model.modelName} document`, {
        documentId: id,
        error: error.message
      });
      throw error;
    }
  }

  async create(data) {
    try {
      const doc = await this.Model.create(data);
      logger.info(`New ${this.Model.modelName} document created`, {
        documentId: doc._id,
        operation: 'create'
      });
      return doc;
    } catch (error) {
      logger.error(`Failed to create ${this.Model.modelName} document`, {
        error: error.message,
        data: this._sanitizeData(data)
      });
      throw error;
    }
  }
  async findOne(filter, populateOptions = []) {
    try {
      let query = this.Model.findOne(filter);
      
      populateOptions.forEach(populate => {
        query = query.populate(populate);
      });

      const doc = await query;
      if (!doc) {
        logger.debug(`No document found in ${this.Model.modelName} with filter`, { filter });
        return null;
      }

      logger.debug(`Retrieved ${this.Model.modelName} document with filter`, { filter });
      return doc;
    } catch (error) {
      logger.error(`Failed to retrieve ${this.Model.modelName} document`, {
        filter,
        error: error.message
      });
      throw error;
    }
  }
  async updateMany(filter, data) {
    try {
      const result = await this.Model.updateMany(filter, data);
      logger.info(`Updated multiple ${this.Model.modelName} documents`, {
        filter: this._sanitizeQuery(filter),
        modifiedCount: result.modifiedCount,
        operation: 'updateMany'
      });
      return result;
    } catch (error) {
      logger.error(`Failed to update multiple ${this.Model.modelName} documents`, {
        filter: this._sanitizeQuery(filter),
        error: error.message,
        data: this._sanitizeData(data)
      });
      throw error;
    }
  }
    async update(id, data) {
    try {
      const doc = await this.Model.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true
      });
      
      if (!doc) {
        logger.warn(`Update failed - document not found in ${this.Model.modelName}`, { documentId: id });
        throw new AppError('Document not found', 404);
      }

      logger.info(`Updated ${this.Model.modelName} document`, {
        documentId: id,
        operation: 'update',
        updatedFields: Object.keys(data)
      });
      return doc;
    } catch (error) {
      logger.error(`Failed to update ${this.Model.modelName} document`, {
        documentId: id,
        error: error.message,
        data: this._sanitizeData(data)
      });
      throw error;
    }
  }

  async delete(id) {
    try {
      const doc = await this.Model.findByIdAndDelete(id);
      if (!doc) {
        logger.warn(`Delete failed - document not found in ${this.Model.modelName}`, { documentId: id });
        throw new AppError('Document not found', 404);
      }

      logger.warn(`Deleted ${this.Model.modelName} document`, { // Warning level for delete operations
        documentId: id,
        operation: 'delete'
      });
      return doc;
    } catch (error) {
      logger.error(`Failed to delete ${this.Model.modelName} document`, {
        documentId: id,
        error: error.message
      });
      throw error;
    }
  }
  async count(queryParams = {}) {
    try {
      const features = new APIFeatures(this.Model.find(), queryParams)
        .filter();
  
      const count = await this.Model.countDocuments(features.query.getFilter());
      logger.debug(`Count operation on ${this.Model.modelName}`, {
        operation: 'count',
        query: this._sanitizeQuery(queryParams),
        result: count
      });
      return count;
    } catch (error) {
      logger.error(`Failed to count ${this.Model.modelName} documents`, {
        error: error.message,
        query: this._sanitizeQuery(queryParams)
      });
      throw error;
    }
  }
  async distinct(field, query = {}) {
    try {
      const results = await this.Model.distinct(field, query);
      logger.debug(`Distinct operation on ${this.Model.modelName}`, {
        operation: 'distinct',
        field,
        query: this._sanitizeQuery(query),
        resultCount: results.length
      });
      return results;
    } catch (error) {
      logger.error(`Failed to get distinct values in ${this.Model.modelName}`, {
        field,
        error: error.message,
        query: this._sanitizeQuery(query)
      });
      throw error;
    }
  }

  // Enhanced sanitization methods
  _sanitizeData(data) {
    const sensitiveFields = ['password', 'token', 'creditCard', 'refreshToken'];
    return this._redactSensitiveFields({ ...data }, sensitiveFields);
  }

  _sanitizeQuery(query) {
    const sensitiveFields = ['password', 'token', 'apiKey'];
    return this._redactSensitiveFields({ ...query }, sensitiveFields);
  }

  _redactSensitiveFields(obj, fields) {
    fields.forEach(field => {
      if (obj[field]) obj[field] = '***REDACTED***';
    });
    return obj;
  }
}

module.exports = BaseRepository;