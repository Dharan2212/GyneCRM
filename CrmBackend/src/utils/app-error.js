class AppError extends Error {
  constructor(message, statusCode = 500, options = {}) {
    super(message);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = options.isOperational !== undefined ? options.isOperational : true;
    this.details = options.details;

    Error.captureStackTrace?.(this, this.constructor);
  }
}

module.exports = AppError;
