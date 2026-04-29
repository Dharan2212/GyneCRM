const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const apiRouter = require('./routes');
const { sendSuccess } = require('./utils/api-response');
const requestLogger = require('./middleware/request-logger');
const securityHeaders = require('./middleware/security-headers');
const { authRateLimit, generalApiRateLimit } = require('./middleware/rate-limit');
const notFound = require('./middleware/not-found');
const errorHandler = require('./middleware/error-handler');

const app = express();

app.disable('x-powered-by');

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

app.use(requestLogger);
app.use(securityHeaders);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const publicDirectory = path.resolve(process.cwd(), 'public');
if (fs.existsSync(publicDirectory)) {
  app.use(express.static(publicDirectory));
}

const imagesDirectory = path.resolve(process.cwd(), 'images');
if (fs.existsSync(imagesDirectory)) {
  app.use('/images', express.static(imagesDirectory));
}

app.get('/health', (req, res) => {
  return sendSuccess(res, {
    message: 'GyneCRM src runtime is healthy.',
    data: {
      environment: config.env,
      timestamp: new Date().toISOString(),
    },
  });
});

app.use(`${config.api.basePath}/auth`, authRateLimit);
app.use(config.api.basePath, generalApiRateLimit, apiRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
