const config = require('../config/env');
const HTTP_STATUS = require('../constants/http-status');
const AppError = require('../utils/app-error');

const DEFAULT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const allowedMimeTypes = new Set(
  Array.isArray(config.uploads.allowedMimeTypes) && config.uploads.allowedMimeTypes.length > 0
    ? config.uploads.allowedMimeTypes.map((value) => String(value).trim().toLowerCase()).filter(Boolean)
    : DEFAULT_ALLOWED_MIME_TYPES,
);

const maxFileSizeBytes = config.uploads.maxFileSizeBytes || 15 * 1024 * 1024;

function normalizeMimeType(value) {
  return String(value || '').trim().toLowerCase();
}

function isAllowedMimeType(value) {
  return allowedMimeTypes.has(normalizeMimeType(value));
}

function buildUploadValidationDetails(payload = {}) {
  const details = [];

  if (!isAllowedMimeType(payload.mime_type)) {
    details.push({
      message: `mime_type must be one of: ${Array.from(allowedMimeTypes).join(', ')}`,
      path: ['mime_type'],
      type: 'upload.mime_type',
    });
  }

  if (payload.file_size_bytes !== undefined && payload.file_size_bytes !== null) {
    const size = Number(payload.file_size_bytes);

    if (!Number.isFinite(size) || size < 0 || size > maxFileSizeBytes) {
      details.push({
        message: `file_size_bytes must be between 0 and ${maxFileSizeBytes}.`,
        path: ['file_size_bytes'],
        type: 'upload.file_size_bytes',
      });
    }
  }

  return details;
}

function validateUploadDescriptor(payload = {}) {
  const details = buildUploadValidationDetails(payload);

  if (details.length > 0) {
    throw new AppError('Upload configuration validation failed.', HTTP_STATUS.BAD_REQUEST, {
      details,
    });
  }
}

module.exports = {
  allowedMimeTypes: Array.from(allowedMimeTypes),
  maxFileSizeBytes,
  isAllowedMimeType,
  validateUploadDescriptor,
};
