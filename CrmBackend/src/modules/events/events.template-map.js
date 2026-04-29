const { EVENT_TYPES } = require('./events.types');

const EVENT_TEMPLATE_MAP = Object.freeze({
  [EVENT_TYPES.PRESCRIPTION_ISSUED]: {
    event_type: EVENT_TYPES.PRESCRIPTION_ISSUED,
    template_key: 'prescription_issued_v1',
    default_channels: ['manual'],
    recipient_strategy: 'patient_primary',
    send_history_source_type: 'prescription',
    queue_enabled: false,
    notes: 'Clinical issuance audit only until a later automation batch queues it explicitly.',
  },
  [EVENT_TYPES.PRESCRIPTION_SENT]: {
    event_type: EVENT_TYPES.PRESCRIPTION_SENT,
    template_key: 'prescription_sent_v1',
    default_channels: ['whatsapp'],
    recipient_strategy: 'patient_primary',
    send_history_source_type: 'prescription',
    queue_enabled: true,
  },
  [EVENT_TYPES.TEST_ORDER_CREATED]: {
    event_type: EVENT_TYPES.TEST_ORDER_CREATED,
    template_key: 'test_order_created_v1',
    default_channels: ['manual'],
    recipient_strategy: 'patient_primary',
    send_history_source_type: 'test_order',
    queue_enabled: false,
  },
  [EVENT_TYPES.TEST_RESULT_UPLOADED]: {
    event_type: EVENT_TYPES.TEST_RESULT_UPLOADED,
    template_key: 'test_result_uploaded_v1',
    default_channels: ['manual'],
    recipient_strategy: 'doctor_only',
    send_history_source_type: 'test_order',
    queue_enabled: false,
  },
  [EVENT_TYPES.TEST_RESULT_REVIEWED]: {
    event_type: EVENT_TYPES.TEST_RESULT_REVIEWED,
    template_key: 'test_result_reviewed_v1',
    default_channels: ['manual'],
    recipient_strategy: 'patient_primary',
    send_history_source_type: 'test_order',
    queue_enabled: false,
  },
  [EVENT_TYPES.TEST_RESULT_SENT]: {
    event_type: EVENT_TYPES.TEST_RESULT_SENT,
    template_key: 'test_result_sent_v1',
    default_channels: ['whatsapp'],
    recipient_strategy: 'patient_primary',
    send_history_source_type: 'test_order',
    queue_enabled: true,
  },
  [EVENT_TYPES.INVOICE_ISSUED]: {
    event_type: EVENT_TYPES.INVOICE_ISSUED,
    template_key: 'invoice_issued_v1',
    default_channels: ['manual'],
    recipient_strategy: 'patient_primary',
    send_history_source_type: 'invoice',
    queue_enabled: false,
  },
  [EVENT_TYPES.INVOICE_PAID]: {
    event_type: EVENT_TYPES.INVOICE_PAID,
    template_key: 'invoice_paid_v1',
    default_channels: ['manual'],
    recipient_strategy: 'patient_primary',
    send_history_source_type: 'invoice',
    queue_enabled: false,
  },
  [EVENT_TYPES.INVOICE_SENT]: {
    event_type: EVENT_TYPES.INVOICE_SENT,
    template_key: 'invoice_sent_v1',
    default_channels: ['whatsapp'],
    recipient_strategy: 'patient_primary',
    send_history_source_type: 'invoice',
    queue_enabled: true,
  },
  [EVENT_TYPES.APPOINTMENT_CREATED]: {
    event_type: EVENT_TYPES.APPOINTMENT_CREATED,
    template_key: 'appointment_created_v1',
    default_channels: ['whatsapp'],
    recipient_strategy: 'patient_primary',
    send_history_source_type: 'appointment',
    queue_enabled: false,
    notes: 'Mapped only in Batch 12.1; notification queue source-type expansion remains later work.',
  },
  [EVENT_TYPES.APPOINTMENT_RESCHEDULED]: {
    event_type: EVENT_TYPES.APPOINTMENT_RESCHEDULED,
    template_key: 'appointment_rescheduled_v1',
    default_channels: ['whatsapp'],
    recipient_strategy: 'patient_primary',
    send_history_source_type: 'appointment',
    queue_enabled: false,
    notes: 'Mapped only in Batch 12.1; notification queue source-type expansion remains later work.',
  },
  [EVENT_TYPES.APPOINTMENT_REMINDER]: {
    event_type: EVENT_TYPES.APPOINTMENT_REMINDER,
    template_key: 'appointment_reminder_v1',
    default_channels: ['whatsapp'],
    recipient_strategy: 'patient_primary',
    send_history_source_type: 'appointment',
    queue_enabled: true,
  },
  [EVENT_TYPES.FOLLOW_UP_DUE]: {
    event_type: EVENT_TYPES.FOLLOW_UP_DUE,
    template_key: 'follow_up_due_v1',
    default_channels: ['sms'],
    recipient_strategy: 'patient_primary',
    send_history_source_type: 'follow_up',
    queue_enabled: true,
  },
});

function getTemplateMapEntry(eventType) {
  return EVENT_TEMPLATE_MAP[eventType] || null;
}

module.exports = {
  EVENT_TEMPLATE_MAP,
  getTemplateMapEntry,
};
