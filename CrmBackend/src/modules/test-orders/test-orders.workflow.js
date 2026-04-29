const HTTP_STATUS = require('../../constants/http-status');
const AppError = require('../../utils/app-error');

const STATUS = Object.freeze({
  ORDERED: 'ordered',
  PENDING_UPLOAD: 'pending_upload',
  UPLOADED: 'uploaded',
  PENDING_REVIEW: 'pending_review',
  REVIEWED: 'reviewed',
  SENT: 'sent',
});

function assertTransition(currentStatus, nextStatus, allowedMap) {
  const allowedNext = allowedMap[currentStatus] || [];

  if (!allowedNext.includes(nextStatus)) {
    throw new AppError(
      `Invalid test order status transition from ${currentStatus} to ${nextStatus}.`,
      HTTP_STATUS.CONFLICT,
    );
  }
}

module.exports = {
  STATUS,
  assertTransition,
};
