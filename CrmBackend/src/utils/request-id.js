const crypto = require('crypto');

function generateRequestId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(16).toString('hex');
}

function getRequestId(req) {
  const headerValue = req.headers['x-request-id'];
  if (headerValue && typeof headerValue === 'string' && headerValue.trim()) {
    return headerValue.trim();
  }

  return generateRequestId();
}

module.exports = {
  generateRequestId,
  getRequestId,
};
