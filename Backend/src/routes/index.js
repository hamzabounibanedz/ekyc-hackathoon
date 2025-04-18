// Import feature routes
const authRouter = require('../Auth/authRoutes');

// Export a function that sets all routes
module.exports = (app) => {
  app.use('/api/v1/auth', authRouter);
};
