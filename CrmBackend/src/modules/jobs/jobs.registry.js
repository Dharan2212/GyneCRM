const { JOB_TYPES } = require('./jobs.types');
const handlers = require('./jobs.handlers');

const JOB_REGISTRY = Object.freeze({
  [JOB_TYPES.APPOINTMENT_REMINDERS]: {
    job_type: JOB_TYPES.APPOINTMENT_REMINDERS,
    label: 'Appointment reminders',
    description: 'Queues reminder events for eligible scheduled appointments.',
    handler: handlers.runAppointmentReminders,
  },
  [JOB_TYPES.DAY_CLOSE]: {
    job_type: JOB_TYPES.DAY_CLOSE,
    label: 'Day close',
    description: 'Builds a non-destructive operational closeout summary.',
    handler: handlers.runDayClose,
  },
  [JOB_TYPES.PREGNANCY_WEEK_UPDATE]: {
    job_type: JOB_TYPES.PREGNANCY_WEEK_UPDATE,
    label: 'Pregnancy week update',
    description: 'Recalculates stored gestational age data where needed.',
    handler: handlers.runPregnancyWeekUpdate,
  },
  [JOB_TYPES.FOLLOW_UP_DUE]: {
    job_type: JOB_TYPES.FOLLOW_UP_DUE,
    label: 'Follow-up due',
    description: 'Queues due follow-up reminder events.',
    handler: handlers.runFollowUpDue,
  },
  [JOB_TYPES.WAITLIST_EXPIRY]: {
    job_type: JOB_TYPES.WAITLIST_EXPIRY,
    label: 'Waitlist expiry',
    description: 'Expires stale waiting waitlist entries.',
    handler: handlers.runWaitlistExpiry,
  },
  [JOB_TYPES.RETRY_NOTIFICATIONS]: {
    job_type: JOB_TYPES.RETRY_NOTIFICATIONS,
    label: 'Retry notifications',
    description: 'Requeues retryable failed notifications and dead-letters exhausted ones.',
    handler: handlers.runRetryNotifications,
  },
});

function getJobDefinition(jobType) {
  return JOB_REGISTRY[jobType] || null;
}

module.exports = {
  JOB_REGISTRY,
  getJobDefinition,
};
