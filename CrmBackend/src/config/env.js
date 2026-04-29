const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const ALLOWED_ENVIRONMENTS = {
  development: 'Development',
  dev: 'Development',
  production: 'Production',
  prod: 'Production',
  staging: 'Staging',
  stage: 'Staging',
};

function normalizeEnvironment(value) {
  const input = String(value || 'Development').trim();
  const normalized = ALLOWED_ENVIRONMENTS[input.toLowerCase()];
  return normalized || 'Development';
}

function pickEnvironmentValue(environment, mapping) {
  if (!mapping || typeof mapping !== 'object') {
    return undefined;
  }

  switch (environment) {
    case 'Production':
      return mapping.production;
    case 'Staging':
      return mapping.staging;
    case 'Development':
    default:
      return mapping.development;
  }
}

function cleanValue(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false;
  }

  return fallback;
}


function toStringArray(value, fallback = []) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const environment = normalizeEnvironment(process.env.ENVIRONMENT);

const selectedPort = cleanValue(
  pickEnvironmentValue(environment, {
    development: process.env.PORT_DEV,
    production: process.env.PORT_PROD,
    staging: process.env.PORT_STAGE,
  }) || process.env.PORT,
);

const selectedDatabaseUri = cleanValue(
  pickEnvironmentValue(environment, {
    development: process.env.DB_CON_STRING_DEV,
    production: process.env.DB_CON_STRING_PROD,
    staging: process.env.DB_CON_STRING_STAGE,
  }) || process.env.MONGODB_URL,
);

const selectedDatabaseName = cleanValue(
  pickEnvironmentValue(environment, {
    development: process.env.DB_NAME_DEV,
    production: process.env.DB_NAME_PROD,
    staging: process.env.DB_NAME_STAGE,
  }),
);

const accessTokenSecret = cleanValue(
  process.env.JWT_ACCESS_SECRET
    || process.env.ACCESS_TOKEN_SECRET
    || process.env.SECRET_KEY
    || process.env.JWT_SECRET,
);

const refreshTokenSecret = cleanValue(
  process.env.JWT_REFRESH_SECRET
    || process.env.REFRESH_TOKEN_SECRET
    || process.env.SECRET_KEY
    || process.env.JWT_SECRET,
);

const secretKey = cleanValue(process.env.SECRET_KEY || process.env.JWT_SECRET);

const config = {
  env: environment,
  isDevelopment: environment === 'Development',
  isProduction: environment === 'Production',
  isStaging: environment === 'Staging',
  api: {
    basePath: '/api/v1',
  },
  server: {
    port: toNumber(selectedPort),
  },
  database: {
    uri: selectedDatabaseUri,
    dbName: selectedDatabaseName,
    replicaSet: cleanValue(process.env.MONGODB_REPLICA_SET),
  },
  auth: {
    secretKey,
    accessTokenSecret,
    refreshTokenSecret,
    accessTokenExpiresIn: cleanValue(process.env.JWT_ACCESS_EXPIRES_IN || process.env.ACCESS_TOKEN_EXPIRES_IN) || '15m',
    refreshTokenExpiresIn: cleanValue(process.env.JWT_REFRESH_EXPIRES_IN || process.env.REFRESH_TOKEN_EXPIRES_IN) || '7d',
    cookieName: cleanValue(process.env.REFRESH_TOKEN_COOKIE_NAME) || 'gynecrm_refresh_token',
    cookieSecure: toBoolean(process.env.COOKIE_SECURE, environment === 'Production'),
    cookieSameSite: cleanValue(process.env.COOKIE_SAME_SITE) || 'lax',
    cookieDomain: cleanValue(process.env.COOKIE_DOMAIN),
    apiKey: cleanValue(process.env.API_KEY1),
  },
  aws: {
    region: cleanValue(process.env.AWS_REGION),
    bucket: cleanValue(process.env.AWS_REGION_S3_BUCKET),
    accessKeyId: cleanValue(process.env.AWS_S3_USER_ACCESS_KEY),
    secretAccessKey: cleanValue(process.env.AWS_S3_USER_SECRET_ACCESS_KEY),
  },
  razorpay: {
    key: cleanValue(process.env.RAZORPAY_KEY),
    secret: cleanValue(process.env.RAZORPAY_SECRET),
  },
  geocoder: {
    provider: cleanValue(process.env.GEOCODER_PROVIDER),
    apiKey: cleanValue(process.env.GEOCODER_API_KEY),
  },
  uploads: {
    imageUploadPath: cleanValue(process.env.IMAGE_UPLOAD_PATH),
    fileUploadPath: cleanValue(process.env.FILE_UPLOAD_PATH),
    folderName: cleanValue(process.env.FOLDER_NAME),
    maxFileSizeMb: toNumber(process.env.MAX_UPLOAD_FILE_SIZE_MB) || 15,
    maxFileSizeBytes: (toNumber(process.env.MAX_UPLOAD_FILE_SIZE_MB) || 15) * 1024 * 1024,
    allowedMimeTypes: toStringArray(process.env.UPLOAD_ALLOWED_MIME_TYPES, []),
  },
  logging: {
    level: cleanValue(process.env.LOG_LEVEL) || (environment === 'Production' ? 'info' : 'debug'),
  },
  rateLimit: {
    auth: {
      windowMs: toNumber(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 15 * 60 * 1000,
      max: toNumber(process.env.RATE_LIMIT_AUTH_MAX) || (environment === 'Production' ? 20 : 100),
    },
    api: {
      windowMs: toNumber(process.env.RATE_LIMIT_API_WINDOW_MS) || 15 * 60 * 1000,
      max: toNumber(process.env.RATE_LIMIT_API_MAX) || (environment === 'Production' ? 200 : 1000),
    },
  },
};

function validateConfig() {
  const missing = [];

  if (!config.server.port) {
    missing.push('PORT_DEV / PORT_PROD / PORT_STAGE or PORT');
  }

  if (!config.database.uri) {
    missing.push('DB_CON_STRING_DEV / DB_CON_STRING_PROD / DB_CON_STRING_STAGE or MONGODB_URL');
  }

  if (!config.auth.accessTokenSecret) {
    missing.push('JWT_ACCESS_SECRET / ACCESS_TOKEN_SECRET / SECRET_KEY / JWT_SECRET');
  }

  if (!config.auth.refreshTokenSecret) {
    missing.push('JWT_REFRESH_SECRET / REFRESH_TOKEN_SECRET / SECRET_KEY / JWT_SECRET');
  }

  if (missing.length > 0) {
    const error = new Error(
      `Missing required runtime environment configuration: ${missing.join(', ')}`,
    );
    error.code = 'ENV_CONFIG_ERROR';
    error.details = missing;
    throw error;
  }
}

validateConfig();

module.exports = config;
