const http = require('http');
const socketIo = require('socket.io');
const { config } = require('./src/config/env');
const connectDB = require('./src/config/db');
const app = require('./app');

// Declare io and activeUsers in the outer scope so they can be exported
let io;
let activeUsers;

(async () => {
  try {
    // Initialize database connection
    await connectDB();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize WebSocket server and assign to outer scoped variable
    io = socketIo(server, {
      cors: {
        origin: config.cors.allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Initialize the activeUsers Map and assign to outer scoped variable
    activeUsers = new Map();

    // Load kycWorker after activeUsers is initialized
    require('./src/core/kycWorker');

    // Set up WebSocket connection logic
    io.on('connection', (socket) => {
      // Retrieve userId from the handshake query and ensure it's a string
      const userId = socket.handshake.query.userId;
      if (userId) {
        activeUsers.set(userId, socket.id);
        console.log(`⚡ User ${userId} connected (${socket.id})`);
    
        socket.emit('notification', {
          type: 'welcome',
          message: 'Connected to real-time server'
        });
      }
    
      socket.on('disconnect', () => {
        // Remove user by checking against socket.id
        activeUsers.forEach((value, key) => {
          if (value === socket.id) {
            activeUsers.delete(key);
            console.log(`⚠️ User ${key} disconnected`);
          }
        });
      });
    });

    // Attach real-time instances to the Express app for later usage
    app.set('io', io);
    app.set('activeUsers', activeUsers);

    // Start the server
    server.listen(config.port, () => {
      console.log(`🚀 Server running in ${config.env} mode on port ${config.port}`);
    });

    // Graceful shutdown handling
    const shutdown = (signal) => {
      console.log(`\n${signal} received: Closing server...`);
      server.close(() => {
        console.log('🔌 Server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Global error handling
    process.on('unhandledRejection', (err) => {
      console.error('❌ Unhandled Rejection:', err);
      server.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
      console.error('❌ Uncaught Exception:', err);
      server.close(() => process.exit(1));
    });

  } catch (error) {
    console.error('🔥 Failed to start server:', error);
    process.exit(1);
  }
})();

// Export app, io, and activeUsers for use in other parts of the application
module.exports = { app, io, activeUsers };