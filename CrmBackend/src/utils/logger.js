const DEFAULT_REDACTED_KEYS = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'cookie',
  'set-cookie',
  'secret',
  'api_key',
  'apikey',
  'client_secret',
]);

const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function resolveLevel() {
  const configured = String(process.env.LOG_LEVEL || '').trim().toLowerCase();

  if (LEVELS[configured] !== undefined) {
    return configured;
  }

  const environment = String(process.env.ENVIRONMENT || process.env.NODE_ENV || 'Development').trim().toLowerCase();
  return environment === 'production' ? 'info' : 'debug';
}

function shouldLog(level) {
  const currentLevel = resolveLevel();
  return LEVELS[level] <= LEVELS[currentLevel];
}

function sanitizeValue(value, depth = 0) {
  if (value === null || value === undefined) {
    return value;
  }

  if (depth > 4) {
    return '[truncated]';
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.ENVIRONMENT === 'Development' || process.env.NODE_ENV === 'test' ? value.stack : undefined,
    };
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
      const normalizedKey = String(key).trim().toLowerCase();
      accumulator[key] = DEFAULT_REDACTED_KEYS.has(normalizedKey)
        ? '[redacted]'
        : sanitizeValue(nestedValue, depth + 1);
      return accumulator;
    }, {});
  }

  if (typeof value === 'string' && value.length > 4000) {
    return `${value.slice(0, 4000)}…`;
  }

  return value;
}

function write(level, message, context) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
  };

  if (context !== undefined) {
    payload.context = sanitizeValue(context);
  }

  const output = JSON.stringify(payload);

  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    default:
      console.info(output);
      break;
  }
}

const logger = {
  debug(message, context) {
    write('debug', message, context);
  },
  info(message, context) {
    write('info', message, context);
  },
  warn(message, context) {
    write('warn', message, context);
  },
  error(message, context) {
    write('error', message, context);
  },
};

module.exports = logger;
