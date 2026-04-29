function sendSuccess(res, options = {}) {
  const {
    statusCode = 200,
    message = 'Request completed successfully.',
    data = null,
    meta,
  } = options;

  const payload = {
    success: true,
    message,
  };

  if (data !== null) {
    payload.data = data;
  }

  if (meta !== undefined) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  sendSuccess,
};
