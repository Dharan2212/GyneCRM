export const APPOINTMENT_STATUS_VALUES = Object.freeze([
  'scheduled',
  'checked_in',
  'in_consultation',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
])

export const APPOINTMENT_STATUS_LABELS = Object.freeze({
  scheduled: 'Scheduled',
  checked_in: 'Checked In',
  in_consultation: 'In Consultation',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
  rescheduled: 'Rescheduled',
})

export const APPOINTMENT_VISIT_TYPE_LABELS = Object.freeze({
  new: 'New',
  follow_up: 'Follow-up',
  review: 'Review',
  procedure: 'Procedure',
  other: 'Other',
})
