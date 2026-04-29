const config = require('../../config/env');
const { allowedMimeTypes, maxFileSizeBytes } = require('../../middleware/upload-config');

function sanitizeName(value = '') {
  return String(value)
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 120);
}

function buildUploadUrlFoundation(payload = {}, hospitalId) {
  const now = new Date();
  const safeName = sanitizeName(payload.original_file_name || 'upload.bin');
  const storageProvider = payload.storage_provider || 'local';
  const objectKey = `${hospitalId}/${now.getUTCFullYear()}/${Date.now()}_${safeName}`;

  return {
    mode: 'foundation_only',
    upload_method: 'direct_upload_placeholder',
    storage_provider: storageProvider,
    storage_bucket: payload.storage_bucket || config.aws.bucket || 'pending-config',
    storage_key: objectKey,
    expires_in_seconds: 900,
    headers: {},
    metadata: {
      document_type: payload.document_type,
      original_file_name: payload.original_file_name,
      mime_type: payload.mime_type,
      file_size_bytes: payload.file_size_bytes,
      test_order_id: payload.test_order_id || null,
    },
    constraints: {
      max_file_size_bytes: maxFileSizeBytes,
      allowed_mime_types: allowedMimeTypes,
    },
    finalize_required: true,
  };
}

module.exports = {
  buildUploadUrlFoundation,
};
