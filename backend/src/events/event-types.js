'use strict';

/**
 * Locked event catalogue for GyneCRM automation system.
 *
 * Exactly 20 events. This list is LOCKED in Phase 3.
 * Do NOT add, rename, or remove any constant without a formal Phase revision note.
 *
 * Used by:
 *   - src/events/dispatch-event.js  (validation + N8N routing)
 *   - src/jobs/*                    (cron job dispatch calls)
 *   - All Phase 4–6 service modules (event emission points)
 *
 * Authority: GyneCRM Master Development Roadmap Section 3.4
 */
const EVENT_TYPES = Object.freeze({
  // ── Appointment lifecycle ─────────────────────────────────────────────────
  APPOINTMENT_CREATED:           'APPOINTMENT_CREATED',
  APPOINTMENT_RESCHEDULED:       'APPOINTMENT_RESCHEDULED',
  APPOINTMENT_CANCELLED:         'APPOINTMENT_CANCELLED',
  APPOINTMENT_REMINDER_24H:      'APPOINTMENT_REMINDER_24H',
  APPOINTMENT_REMINDER_2H:       'APPOINTMENT_REMINDER_2H',
  APPOINTMENT_MISSED:            'APPOINTMENT_MISSED',
  APPOINTMENT_CHECKED_IN:        'APPOINTMENT_CHECKED_IN',

  // ── Doctor schedule ───────────────────────────────────────────────────────
  DOCTOR_UNAVAILABILITY_APPLIED: 'DOCTOR_UNAVAILABILITY_APPLIED',

  // ── Clinical ──────────────────────────────────────────────────────────────
  CONSULTATION_COMPLETED:        'CONSULTATION_COMPLETED',
  PRESCRIPTION_ISSUED:           'PRESCRIPTION_ISSUED',
  TEST_ORDER_CREATED:            'TEST_ORDER_CREATED',
  TEST_OVERDUE:                  'TEST_OVERDUE',
  FOLLOWUP_DUE:                  'FOLLOWUP_DUE',

  // ── Pregnancy ─────────────────────────────────────────────────────────────
  PREGNANCY_MILESTONE_REACHED:   'PREGNANCY_MILESTONE_REACHED',
  PREGNANCY_WEEKLY_TIPS:         'PREGNANCY_WEEKLY_TIPS',
  PREGNANCY_HIGH_RISK_FLAGGED:   'PREGNANCY_HIGH_RISK_FLAGGED',

  // ── Delivery & postpartum ─────────────────────────────────────────────────
  DELIVERY_RECORDED:             'DELIVERY_RECORDED',
  POSTPARTUM_FOLLOWUP_DUE:       'POSTPARTUM_FOLLOWUP_DUE',

  // ── Waitlist & feedback ───────────────────────────────────────────────────
  WAITLIST_SLOT_AVAILABLE:       'WAITLIST_SLOT_AVAILABLE',
  FEEDBACK_REQUESTED:            'FEEDBACK_REQUESTED',
});

module.exports = EVENT_TYPES;
