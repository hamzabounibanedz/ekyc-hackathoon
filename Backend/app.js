const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const requestLogger = require('./src/middlewares/requestLogger');
const AppError = require('./src/core/AppErrors');
const globalErrorHandler = require('./src/middlewares/globalErrorHandler');
const registerRoutes = require('./src/routes/index');

const app = express();

// Middleware: Security, CORS, and Static Files
app.use(helmet());
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3001',
  'http://127.0.0.1:3000',
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.options('*', cors());

// Body parsers and cookie parser
app.use(express.json({ limit: '10kb', verify: rawBodySaver }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Static file serving
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads/videos', express.static(path.join(__dirname, 'uploads/videos')));
app.use('/uploads/hls', express.static(path.join(__dirname, 'uploads/hls')));

// Custom request logging (applies to all environments)
app.use(requestLogger);

// // Request Rate Limiting
// const limiter = rateLimit({
//   max: 100,
//   windowMs: 60 * 60 * 1000,
//   message: 'Too many requests from this IP, please try again in an hour!',
//   keyGenerator: (req) => req.ip,
// });
// app.use('/api', limiter);

// Data Sanitization
app.use(mongoSanitize());
app.use(xss());

// Add timestamp to requests
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Favicon Ignore
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Register routes
registerRoutes(app);

// Handle 404 for undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler
app.use(globalErrorHandler);

// Helper for raw body
function rawBodySaver(req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}

module.exports = app;