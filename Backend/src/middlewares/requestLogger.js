const morgan = require('morgan');
const logger = require('../core/logger');

// Colorization helper
const colorizeStatus = (status) => {
  if (!status) return '\x1b[0m'; // No color if unknown
  
  const statusCode = parseInt(status, 10);
  const colorCodes = {
    success: '\x1b[32m',  // Green
    red: '\x1b[31m',      // Red
    yellow: '\x1b[33m',   // Yellow
    cyan: '\x1b[36m',     // Cyan
    reset: '\x1b[0m'      // Reset
  };

  if (statusCode >= 500) return `${colorCodes.red}${status}${colorCodes.reset}`;
  if (statusCode >= 400) return `${colorCodes.yellow}${status}${colorCodes.reset}`;
  if (statusCode >= 200 && statusCode < 300) return `${colorCodes.success}${status}${colorCodes.reset}`;
  return `${colorCodes.cyan}${status}${colorCodes.reset}`;
};

// Custom token for Express route path
morgan.token('route', (req) => {
  return req.route?.path || req.originalUrl.split('?')[0];
});

// Custom token for colored status
morgan.token('colored_status', (req, res) => {
  const status = res.statusCode;
  return colorizeStatus(status);
});

// Existing body token
morgan.token('body', (req) => {
  if (req.body && req.method !== 'GET') {
    const sanitized = { ...req.body };
    if (sanitized.password) sanitized.password = '***REDACTED***';
    if (sanitized.token) sanitized.token = '***REDACTED***';
    return JSON.stringify(sanitized);
  }
  return '';
});

const requestLogger = morgan((tokens, req, res) => {
  const status = tokens.status(req, res);
  const method = tokens.method(req, res);
  const route = tokens.route(req, res);
  
  // Colored status prefix
  const coloredStatus = colorizeStatus(status);
  const statusPrefix = `${coloredStatus} ${method} ${route}`;

  const logObject = {
    method: method,
    url: tokens.url(req, res),
    route: route,
    status: status,
    response_time: `${tokens['response-time'](req, res)} ms`,
    content_length: tokens.res(req, res, 'content-length'),
    ip: tokens['remote-addr'](req, res),
    user_agent: tokens['user-agent'](req, res),
    body: tokens.body(req, res)
  };

  logger.info(statusPrefix, logObject);
  return null;
}, {
  stream: logger.morganStream,
  skip: (req) => req.originalUrl === '/healthcheck'
});

module.exports = requestLogger;