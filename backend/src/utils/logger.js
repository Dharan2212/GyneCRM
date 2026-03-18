'use strict';

const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Development formatter: colourised, human-readable with timestamp and metadata.
 */
const developmentFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `[${timestamp}] ${level}: ${message}`;
    if (stack) log += `\n${stack}`;
    const metaKeys = Object.keys(meta);
    const metaStr = metaKeys.length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return log + metaStr;
  }),
);

/**
 * Production formatter: structured JSON per line.
 * Consumed by log aggregators (CloudWatch, Datadog, Logtail).
 */
const productionFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json(),
);

const activeFormat = NODE_ENV === 'production' ? productionFormat : developmentFormat;

/**
 * Daily-rotate transport for production file logging.
 * Keeps 14 days of logs, compresses archived files.
 */
const dailyRotateTransport = new transports.DailyRotateFile({
  filename: 'logs/gynecrm-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '50m',
  maxFiles: '14d',
  level: LOG_LEVEL,
  format: productionFormat,
  silent: NODE_ENV !== 'production',
});

const logger = createLogger({
  level: LOG_LEVEL,
  format: activeFormat,
  defaultMeta: { service: process.env.APP_NAME || 'GyneCRM' },
  transports: [
    new transports.Console({
      silent: NODE_ENV === 'test',
      handleExceptions: true,
      handleRejections: true,
    }),
    dailyRotateTransport,
  ],
  exitOnError: false,
});

/**
 * Morgan-compatible stream. Writes HTTP access log lines at 'http' level.
 */
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = logger;
