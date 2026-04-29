const HTTP_STATUS = require('../constants/http-status');
const AppError = require('../utils/app-error');
const config = require('../config/env');

const stores = new Map();

function pruneStore(store, now) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

function createRateLimit(options = {}) {
  const {
    name = 'default',
    windowMs = 60_000,
    max = 100,
    message = 'Too many requests. Please try again later.',
    skip,
    keyGenerator,
  } = options;

  const store = stores.get(name) || new Map();
  stores.set(name, store);

  return function rateLimitMiddleware(req, res, next) {
    if (typeof skip === 'function' && skip(req)) {
      return next();
    }

    const now = Date.now();
    pruneStore(store, now);

    const key = typeof keyGenerator === 'function'
      ? keyGenerator(req)
      : req.ip;

    const current = store.get(key);

    if (!current || current.resetAt <= now) {
      store.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });

      return next();
    }

    current.count += 1;

    const remaining = Math.max(0, max - current.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));

    res.setHeader('Retry-After', retryAfterSeconds);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (current.count > max) {
      return next(new AppError(message, HTTP_STATUS.TOO_MANY_REQUESTS, {
        details: [
          {
            message,
            path: ['rate_limit'],
            type: 'rate_limit',
            retry_after_seconds: retryAfterSeconds,
          },
        ],
      }));
    }

    return next();
  };
}

const authRateLimit = createRateLimit({
  name: 'auth',
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.max,
  message: 'Too many authentication requests. Please try again later.',
});

const generalApiRateLimit = createRateLimit({
  name: 'api',
  windowMs: config.rateLimit.api.windowMs,
  max: config.rateLimit.api.max,
  message: 'Too many API requests. Please try again later.',
  skip: (req) => req.originalUrl.startsWith(`${config.api.basePath}/auth`),
});

module.exports = {
  createRateLimit,
  authRateLimit,
  generalApiRateLimit,
};
