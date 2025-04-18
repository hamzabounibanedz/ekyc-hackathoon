const mongoose = require('mongoose');
const { config } = require('./env');

const connectDB = async () => {
  try {
    const DB = config.db.uri.replace('<PASSWORD>', config.db.password);
    await mongoose.connect(DB, {

      autoIndex: config.env === 'development'
    });
    console.log('📦 MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;