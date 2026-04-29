const mongoose = require('mongoose');
const AppError = require('./app-error');

function isValidObjectId(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim();

  if (!/^[a-fA-F0-9]{24}$/.test(normalized)) {
    return false;
  }

  try {
    return new mongoose.Types.ObjectId(normalized).toHexString() === normalized.toLowerCase();
  } catch (error) {
    return false;
  }
}

function assertObjectId(value, label = 'id') {
  if (!isValidObjectId(value)) {
    throw new AppError(`Invalid ${label}.`, 400, {
      details: [
        {
          message: `"${label}" must be a valid ObjectId.`,
          path: [label],
          type: 'objectId.base',
        },
      ],
    });
  }

  return value;
}

module.exports = {
  isValidObjectId,
  assertObjectId,
};
