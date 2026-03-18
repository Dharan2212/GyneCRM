'use strict';

const { S3Client } = require('@aws-sdk/client-s3');
const config = require('./env');

/**
 * Singleton S3Client instance.
 *
 * S3_ENDPOINT may be set to a local MinIO or S3-compatible endpoint.
 * When endpoint is set, forcePathStyle is required for path-style bucket addressing.
 *
 * Upload pre-signed URL TTL  : config.s3.uploadUrlExpirySeconds  (default 900s  / 15 min)
 * Download pre-signed URL TTL: config.s3.downloadUrlExpirySeconds (default 1800s / 30 min)
 */
const s3ClientConfig = {
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
};

if (config.s3.endpoint) {
  s3ClientConfig.endpoint = config.s3.endpoint;
  s3ClientConfig.forcePathStyle = true;
}

const s3Client = new S3Client(s3ClientConfig);

module.exports = { s3Client };
