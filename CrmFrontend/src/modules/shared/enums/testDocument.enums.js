export const TEST_ORDER_STATUS_LABELS = Object.freeze({
  ordered: 'Ordered',
  pending_upload: 'Pending Upload',
  uploaded: 'Uploaded',
  pending_review: 'Pending Review',
  reviewed: 'Reviewed',
  sent: 'Sent',
  cancelled: 'Cancelled',
})

export const DOCUMENT_REVIEW_STATUS_LABELS = Object.freeze({
  not_required: 'Not Required',
  pending: 'Pending Review',
  reviewed: 'Reviewed',
})

export const DOCUMENT_UPLOAD_STATUS_LABELS = Object.freeze({
  pending: 'Pending Upload',
  uploaded: 'Uploaded',
  failed: 'Upload Failed',
})

export const SEND_HISTORY_STATUS_LABELS = Object.freeze({
  requested: 'Requested',
  queued: 'Queued',
  sent: 'Sent',
  delivered: 'Delivered',
  failed: 'Failed',
  cancelled: 'Cancelled',
  suppressed: 'Suppressed',
})
