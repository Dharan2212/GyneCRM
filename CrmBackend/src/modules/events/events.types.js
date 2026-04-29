const EVENT_TYPES = Object.freeze({
  PRESCRIPTION_ISSUED: 'prescription_issued',
  PRESCRIPTION_SENT: 'prescription_sent',
  TEST_ORDER_CREATED: 'test_order_created',
  TEST_RESULT_UPLOADED: 'test_result_uploaded',
  TEST_RESULT_REVIEWED: 'test_result_reviewed',
  TEST_RESULT_SENT: 'test_result_sent',
  INVOICE_ISSUED: 'invoice_issued',
  INVOICE_PAID: 'invoice_paid',
  INVOICE_SENT: 'invoice_sent',
  APPOINTMENT_CREATED: 'appointment_created',
  APPOINTMENT_RESCHEDULED: 'appointment_rescheduled',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  FOLLOW_UP_DUE: 'follow_up_due',
});

const EVENT_TYPE_DEFINITIONS = Object.freeze({
  [EVENT_TYPES.PRESCRIPTION_ISSUED]: {
    event_type: EVENT_TYPES.PRESCRIPTION_ISSUED,
    allowed_source_types: ['prescription'],
    label: 'Prescription issued',
  },
  [EVENT_TYPES.PRESCRIPTION_SENT]: {
    event_type: EVENT_TYPES.PRESCRIPTION_SENT,
    allowed_source_types: ['prescription'],
    label: 'Prescription sent',
  },
  [EVENT_TYPES.TEST_ORDER_CREATED]: {
    event_type: EVENT_TYPES.TEST_ORDER_CREATED,
    allowed_source_types: ['test_order'],
    label: 'Test order created',
  },
  [EVENT_TYPES.TEST_RESULT_UPLOADED]: {
    event_type: EVENT_TYPES.TEST_RESULT_UPLOADED,
    allowed_source_types: ['test_order', 'patient_document'],
    label: 'Test result uploaded',
  },
  [EVENT_TYPES.TEST_RESULT_REVIEWED]: {
    event_type: EVENT_TYPES.TEST_RESULT_REVIEWED,
    allowed_source_types: ['test_order'],
    label: 'Test result reviewed',
  },
  [EVENT_TYPES.TEST_RESULT_SENT]: {
    event_type: EVENT_TYPES.TEST_RESULT_SENT,
    allowed_source_types: ['test_order'],
    label: 'Test result sent',
  },
  [EVENT_TYPES.INVOICE_ISSUED]: {
    event_type: EVENT_TYPES.INVOICE_ISSUED,
    allowed_source_types: ['invoice'],
    label: 'Invoice issued',
  },
  [EVENT_TYPES.INVOICE_PAID]: {
    event_type: EVENT_TYPES.INVOICE_PAID,
    allowed_source_types: ['invoice'],
    label: 'Invoice paid',
  },
  [EVENT_TYPES.INVOICE_SENT]: {
    event_type: EVENT_TYPES.INVOICE_SENT,
    allowed_source_types: ['invoice'],
    label: 'Invoice sent',
  },
  [EVENT_TYPES.APPOINTMENT_CREATED]: {
    event_type: EVENT_TYPES.APPOINTMENT_CREATED,
    allowed_source_types: ['appointment'],
    label: 'Appointment created',
  },
  [EVENT_TYPES.APPOINTMENT_RESCHEDULED]: {
    event_type: EVENT_TYPES.APPOINTMENT_RESCHEDULED,
    allowed_source_types: ['appointment'],
    label: 'Appointment rescheduled',
  },
  [EVENT_TYPES.APPOINTMENT_REMINDER]: {
    event_type: EVENT_TYPES.APPOINTMENT_REMINDER,
    allowed_source_types: ['appointment'],
    label: 'Appointment reminder',
  },
  [EVENT_TYPES.FOLLOW_UP_DUE]: {
    event_type: EVENT_TYPES.FOLLOW_UP_DUE,
    allowed_source_types: ['follow_up'],
    label: 'Follow-up due',
  },
});

const EVENT_TYPE_VALUES = Object.freeze(Object.values(EVENT_TYPES));
const SOURCE_TYPE_VALUES = Object.freeze(
  Array.from(new Set(Object.values(EVENT_TYPE_DEFINITIONS).flatMap((item) => item.allowed_source_types))),
);

function getEventDefinition(eventType) {
  return EVENT_TYPE_DEFINITIONS[eventType] || null;
}

module.exports = {
  EVENT_TYPES,
  EVENT_TYPE_VALUES,
  SOURCE_TYPE_VALUES,
  EVENT_TYPE_DEFINITIONS,
  getEventDefinition,
};
