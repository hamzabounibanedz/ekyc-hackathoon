// Import feature routes
const authRouter = require('../Auth/authRoutes');
const kycRouter = require('../kyc/kycRoutes');
// Export a function that sets all routes
module.exports = (app) => {
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/kyc',kycRouter)
};
