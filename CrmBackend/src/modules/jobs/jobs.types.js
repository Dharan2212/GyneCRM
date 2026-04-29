const JOB_TYPES = Object.freeze({
  APPOINTMENT_REMINDERS: 'appointment_reminders',
  DAY_CLOSE: 'day_close',
  PREGNANCY_WEEK_UPDATE: 'pregnancy_week_update',
  FOLLOW_UP_DUE: 'follow_up_due',
  WAITLIST_EXPIRY: 'waitlist_expiry',
  RETRY_NOTIFICATIONS: 'retry_notifications',
});

const JOB_TYPE_VALUES = Object.freeze(Object.values(JOB_TYPES));
const JOB_STATUS_VALUES = Object.freeze(['queued', 'scheduled', 'running', 'completed', 'failed', 'cancelled', 'skipped']);
const RUN_MODE_VALUES = Object.freeze(['manual', 'scheduled']);

module.exports = {
  JOB_TYPES,
  JOB_TYPE_VALUES,
  JOB_STATUS_VALUES,
  RUN_MODE_VALUES,
};
