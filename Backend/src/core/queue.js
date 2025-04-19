const Queue = require('bull');
const { config } = require('../config/env');

const kycQueue = new Queue('kyc', {
  redis: { host: config.redisHost, port: config.redisPort }
});

module.exports = { kycQueue };
