'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const morgan = require('morgan');

const { globalRateLimiter } = require('./middleware/rate-limiter.middleware');
const errorHandler = require('./middleware/error-handler.middleware');
const routes = require('./routes/index');
const logger = require('./utils/logger');

/**
 * Application Factory
 * Builds and configures the Express application.
 * Does NOT call app.listen() — that is server.js responsibility.
 */
function createApp() {
  const app = express();

  // ─── Trust Proxy (required behind Nginx / AWS ALB) ───────────────────────
  app.set('trust proxy', 1);

  // ─── Security Headers ─────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // ─── CORS ─────────────────────────────────────────────────────────────────
  const env = require('./config/env');
  const allowedOrigins = env.CORS_ORIGIN_LIST || [];

  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser clients (Postman, N8N webhooks) with no origin
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        logger.warn(`CORS blocked origin: ${origin}`);
        return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Secret'],
    })
  );

  // ─── Body Parsing ─────────────────────────────────────────────────────────
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // ─── Cookie Parser ────────────────────────────────────────────────────────
  // Required to read httpOnly refresh token cookie
  app.use(cookieParser());

  // ─── Response Compression ─────────────────────────────────────────────────
  app.use(compression());

  // ─── HTTP Request Logger ──────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'test') {
    app.use(
      morgan('combined', {
        stream: {
          write: (message) => logger.http(message.trim()),
        },
        skip: (req) => req.url === '/api/v1/health',
      })
    );
  }

  // ─── Global Rate Limiter ──────────────────────────────────────────────────
  // 100 req / 15 min per IP globally
  app.use(globalRateLimiter);

  // ─── Mount All Routes ─────────────────────────────────────────────────────
  app.use('/api/v1', routes);

  // ─── 404 Handler ──────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.originalUrl} not found`,
      errors: [],
    });
  });

  // ─── Global Error Handler ─────────────────────────────────────────────────
  // Must be last middleware
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
