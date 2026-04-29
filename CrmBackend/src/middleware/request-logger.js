const logger = require('../utils/logger');
const { getRequestId } = require('../utils/request-id');

function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  const requestId = getRequestId(req);

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const finishedAt = process.hrtime.bigint();
    const durationMs = Number(finishedAt - startedAt) / 1_000_000;

    logger.info('HTTP request completed.', {
      request_id: requestId,
      method: req.method,
      path: req.originalUrl,
      status_code: res.statusCode,
      duration_ms: Number(durationMs.toFixed(2)),
      ip: req.ip,
      user_id: req.user?.id || null,
      role: req.user?.role || null,
    });
  });

  next();
}

module.exports = requestLogger;
