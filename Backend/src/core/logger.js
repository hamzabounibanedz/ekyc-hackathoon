const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, errors, colorize, json } = format;
const DailyRotateFile = require('winston-daily-rotate-file');
const fs = require('fs');
const path = require('path');

const logDir = path.resolve('logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'warn');
const maxFiles = process.env.LOG_RETENTION_DAYS || '30d';

const devFormat = combine(
  colorize(),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) => `${timestamp} [${level}] ${stack || message}`)
);

const prodFormat = combine(
  errors({ stack: true }),
  json()
);

const baseTransports = process.env.NODE_ENV === 'test' ? [] : [
  new DailyRotateFile({
    filename: `${logDir}/error-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles,
    zippedArchive: true,
  }),
  new DailyRotateFile({
    filename: `${logDir}/combined-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles,
    zippedArchive: true,
  })
];

const exceptionHandlers = process.env.NODE_ENV === 'test' ? [] : [
  new DailyRotateFile({
    filename: `${logDir}/exceptions-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles,
    zippedArchive: true,
  })
];
const rejectionHandlers = process.env.NODE_ENV === 'test' ? [] : [...exceptionHandlers];

const logger = createLogger({
  level: logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    process.env.NODE_ENV === 'production' ? prodFormat : devFormat
  ),
  transports: process.env.NODE_ENV === 'development'
    ? [
        new transports.Console({
          handleExceptions: false,
          handleRejections: false,
        }),
        ...baseTransports
      ]
    : baseTransports,
  exceptionHandlers,
  rejectionHandlers,
  silent: process.env.NODE_ENV === 'test',
});

// Attach exception and rejection handlers to the logger instance for testing inspection.
logger.exceptionHandlers = exceptionHandlers;
logger.rejectionHandlers = rejectionHandlers;

// Attach the DailyRotateFile constructor so that tests can reliably use instanceof checks.
logger.DailyRotateFile = DailyRotateFile;

logger.morganStream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;
