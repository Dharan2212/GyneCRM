'use strict';

/**
 * GyneCRM — WhatsApp Template Map
 *
 * Maps each automation event type to:
 *   - template_name : the Meta-approved WhatsApp template identifier
 *   - required_vars : list of payload data keys that must be present for
 *                     this template to render correctly in N8N
 *   - workflow_id   : human label matching the N8N workflow inventory
 *                     (Architecture Section 4.2) — informational only
 *   - n8n_workflow  : integer workflow number from Section 4.2 table (null if not a core workflow)
 *
 * This is the single source of truth for template names used by:
 *   1. The N8N callback validator — verifies the template_name N8N reports back
 *      is one we actually dispatched.
 *   2. The admin automation status endpoint — displays human-readable workflow labels.
 *   3. The webhook callback handler — records template_name on whatsapp_logs.
 *
 * Authority:
 *   hospital_crm_architecture_v4_complete.docx — Sections 4.2 and 4.3
 *
 * IMPORTANT:
 *   template_name values must match the Meta-approved template IDs registered
 *   in the hospital's WhatsApp Business Account. Any rename here requires a
 *   corresponding rename in the Meta Business Manager.
 *
 *   required_vars: the keys that must be present in the versioned envelope's
 *   data{} object for the N8N template to render. These map directly to payload
 *   fields after dispatchEvent() strips the standard envelope fields
 *   (patientId, entityType, entityId, branchId, actorUserId).
 *
 * Phase 6 Batch 6 additions:
 *   - APPOINTMENT_CANCELLED entry added (Batch 2 dispatches this event)
 *   - APPOINTMENT_CHECKED_IN entry added (Batch 2 dispatches this event)
 *   - Workflow 5 required_vars: 'currentWeek' corrected to 'pregnancyWeek'
 *     (payload sends pregnancyWeek — N8N must use data.pregnancyWeek)
 */

const EVENT_TYPES = require('./event-types');

/**
 * @typedef {Object} TemplateEntry
 * @property {string}   template_name  - Meta-approved template identifier
 * @property {string[]} required_vars  - payload data keys required for rendering
 * @property {string}   workflow_id    - N8N workflow label (Section 4.2)
 * @property {number|null} n8n_workflow - Workflow number (null if not a core 9-workflow)
 */

/** @type {Object.<string, TemplateEntry>} */
const TEMPLATE_MAP = Object.freeze({

  // ── Workflow 1: Appointment Confirmation ─────────────────────────────────
  // Trigger: APPOINTMENT_CREATED (on booking + on reschedule new slot)
  // Template: Hello {patient_name}, your appointment with Dr. {doctor_name}
  //           is confirmed for {appointment_date} at {appointment_time}.
  //           Please arrive 10 minutes early. — {hospital_name}
  [EVENT_TYPES.APPOINTMENT_CREATED]: {
    template_name:  'appointment_confirmation',
    required_vars:  ['patientName', 'doctorName', 'appointmentDate', 'appointmentTime'],
    workflow_id:    'appointment-confirmation',
    n8n_workflow:   1,
  },

  // ── Workflow 2: 24-Hour Reminder ──────────────────────────────────────────
  // Trigger: APPOINTMENT_REMINDER_24H (cron every 15 min)
  // Template: Reminder: You have an appointment tomorrow with Dr. {doctor_name}
  //           at {appointment_time}. Please be on time. — {hospital_name}
  [EVENT_TYPES.APPOINTMENT_REMINDER_24H]: {
    template_name:  'reminder_24h',
    required_vars:  ['doctorName', 'appointmentTime', 'appointmentDate'],
    workflow_id:    'reminder-24h',
    n8n_workflow:   2,
  },

  // ── Workflow 3: 2-Hour Reminder ───────────────────────────────────────────
  // Trigger: APPOINTMENT_REMINDER_2H (cron every 15 min)
  [EVENT_TYPES.APPOINTMENT_REMINDER_2H]: {
    template_name:  'reminder_2h',
    required_vars:  ['doctorName', 'appointmentTime'],
    workflow_id:    'reminder-2h',
    n8n_workflow:   3,
  },

  // ── Workflow 4: Missed Appointment Recovery ───────────────────────────────
  // Trigger: APPOINTMENT_MISSED (noShowJob cron every 30 min)
  // Template: Hello {patient_name}, we missed you today. Your appointment with
  //           Dr. {doctor_name} was scheduled at {appointment_time}.
  //           Please call us to reschedule. — {hospital_name}
  [EVENT_TYPES.APPOINTMENT_MISSED]: {
    template_name:  'missed_appointment_recovery',
    required_vars:  ['patientName', 'doctorName', 'appointmentTime', 'appointmentDate'],
    workflow_id:    'missed-appointment-recovery',
    n8n_workflow:   4,
  },

  // ── Workflow 5: Pregnancy Milestone ──────────────────────────────────────
  // Trigger: PREGNANCY_MILESTONE_REACHED (pregnancyWeekJob daily cron)
  // Template: Hello {patient_name}, you are now {pregnancy_week} weeks pregnant.
  //           This week your {milestone_name} is due. — {hospital_name}
  //
  // Phase 6 Batch 6 fix: required_var corrected from 'currentWeek' to 'pregnancyWeek'.
  // The dispatch payload sends key 'pregnancyWeek' — N8N must reference data.pregnancyWeek.
  [EVENT_TYPES.PREGNANCY_MILESTONE_REACHED]: {
    template_name:  'pregnancy_milestone',
    required_vars:  ['patientName', 'pregnancyWeek', 'milestoneName', 'milestoneDescription'],
    workflow_id:    'pregnancy-milestone',
    n8n_workflow:   5,
  },

  // ── Workflow 6: Follow-Up Reminder ───────────────────────────────────────
  // Trigger: FOLLOWUP_DUE (followupDueJob daily cron at 03:00)
  [EVENT_TYPES.FOLLOWUP_DUE]: {
    template_name:  'followup_reminder',
    required_vars:  ['patientName', 'doctorName', 'dueDate'],
    workflow_id:    'followup-reminder',
    n8n_workflow:   6,
  },

  // ── Workflow 7: Test Reminder ─────────────────────────────────────────────
  // Trigger: TEST_ORDER_CREATED (testOrder.service.js on order creation)
  [EVENT_TYPES.TEST_ORDER_CREATED]: {
    template_name:  'test_reminder',
    required_vars:  ['patientName', 'testName', 'dueDate'],
    workflow_id:    'test-reminder',
    n8n_workflow:   7,
  },

  // ── Workflow 8: Weekly Pregnancy Tips ────────────────────────────────────
  // Trigger: PREGNANCY_WEEKLY_TIPS (weeklyPregnancyTipsJob every Monday 08:00)
  [EVENT_TYPES.PREGNANCY_WEEKLY_TIPS]: {
    template_name:  'pregnancy_weekly_tips',
    required_vars:  ['patientName', 'pregnancyWeek'],
    workflow_id:    'pregnancy-weekly-tips',
    n8n_workflow:   8,
  },

  // ── Workflow 9: Feedback Collection ──────────────────────────────────────
  // Trigger: FEEDBACK_REQUESTED (fired by consultation.service.js on finalization)
  // Template: Hello {patient_name}, thank you for visiting us today. How was
  //           your experience with Dr. {doctor_name}?
  //           Reply: 1=Excellent, 2=Good, 3=Average, 4=Poor. — {hospital_name}
  [EVENT_TYPES.FEEDBACK_REQUESTED]: {
    template_name:  'feedback_collection',
    required_vars:  ['patientName', 'doctorName'],
    workflow_id:    'feedback-collection',
    n8n_workflow:   9,
  },

  // ── Appointment Cancelled ─────────────────────────────────────────────────
  // Trigger: APPOINTMENT_CANCELLED (appointments.service.js on cancellation)
  // Phase 6 Batch 6: Added — this event was dispatched in Batch 2 but had no entry.
  // Template: Hello {patient_name}, your appointment with Dr. {doctor_name} on
  //           {appointment_date} has been cancelled. Please call us to rebook.
  [EVENT_TYPES.APPOINTMENT_CANCELLED]: {
    template_name:  'appointment_cancelled',
    required_vars:  ['patientName', 'doctorName', 'appointmentDate'],
    workflow_id:    'appointment-cancelled',
    n8n_workflow:   null,
  },

  // ── Appointment Checked In ────────────────────────────────────────────────
  // Trigger: APPOINTMENT_CHECKED_IN (appointments.service.js on check-in)
  // Phase 6 Batch 6: Added — this event was dispatched in Batch 2 but had no entry.
  // Template: Hello {patient_name}, you have been checked in with Dr. {doctor_name}.
  //           Your queue token is {queue_token}. — {hospital_name}
  [EVENT_TYPES.APPOINTMENT_CHECKED_IN]: {
    template_name:  'appointment_checked_in',
    required_vars:  ['patientName', 'doctorName', 'queueToken'],
    workflow_id:    'appointment-checked-in',
    n8n_workflow:   null,
  },

  // ── Delivery Recorded ─────────────────────────────────────────────────────
  // Trigger: DELIVERY_RECORDED (delivery.service.js on delivery creation)
  [EVENT_TYPES.DELIVERY_RECORDED]: {
    template_name:  'delivery_recorded',
    required_vars:  ['patientName', 'deliveryDate'],
    workflow_id:    'delivery-recorded',
    n8n_workflow:   null,
  },

  // ── Postpartum Follow-Up Due ──────────────────────────────────────────────
  // Trigger: POSTPARTUM_FOLLOWUP_DUE (postpartumDueJob daily cron at 02:00)
  [EVENT_TYPES.POSTPARTUM_FOLLOWUP_DUE]: {
    template_name:  'postpartum_followup_due',
    required_vars:  ['patientName', 'doctorName', 'dueDate', 'visitType'],
    workflow_id:    'postpartum-followup-due',
    n8n_workflow:   null,
  },

  // ── Waitlist Slot Available ───────────────────────────────────────────────
  // Trigger: WAITLIST_SLOT_AVAILABLE (appointments.service.js on cancellation, if waitlist entry exists)
  [EVENT_TYPES.WAITLIST_SLOT_AVAILABLE]: {
    template_name:  'waitlist_slot_available',
    required_vars:  ['patientName', 'doctorName', 'slotDate', 'slotTime'],
    workflow_id:    'waitlist-slot-available',
    n8n_workflow:   null,
  },

  // ── High-Risk Pregnancy Flagged ───────────────────────────────────────────
  // Trigger: PREGNANCY_HIGH_RISK_FLAGGED (pregnancy.service.js on high-risk toggle)
  [EVENT_TYPES.PREGNANCY_HIGH_RISK_FLAGGED]: {
    template_name:  'pregnancy_high_risk_alert',
    required_vars:  ['patientName', 'doctorName'],
    workflow_id:    'pregnancy-high-risk-flagged',
    n8n_workflow:   null,
  },

  // ── Test Overdue ──────────────────────────────────────────────────────────
  // Trigger: TEST_OVERDUE (testOverdueJob daily cron at 01:00)
  [EVENT_TYPES.TEST_OVERDUE]: {
    template_name:  'test_overdue',
    required_vars:  ['patientName', 'testName', 'dueDate'],
    workflow_id:    'test-overdue',
    n8n_workflow:   null,
  },
});

/**
 * Looks up the template entry for a given event type.
 * Returns null for events that do not have a WhatsApp template
 * (i.e. system-only / staff-channel events).
 *
 * @param {string} eventType - One of the locked EVENT_TYPES constants
 * @returns {TemplateEntry|null}
 */
function getTemplateEntry(eventType) {
  return TEMPLATE_MAP[eventType] || null;
}

/**
 * Returns the Meta-approved template name for an event type.
 * Returns null if no template is mapped.
 *
 * @param {string} eventType
 * @returns {string|null}
 */
function getTemplateName(eventType) {
  const entry = TEMPLATE_MAP[eventType];
  return entry ? entry.template_name : null;
}

/**
 * Returns the set of all valid template_name values across all entries.
 * Used by the N8N callback validator to verify the callback's template_name.
 *
 * @returns {Set<string>}
 */
function getValidTemplateNames() {
  return new Set(Object.values(TEMPLATE_MAP).map((e) => e.template_name));
}

/**
 * Returns all template entries as an array with the event_type included.
 * Used by the automation status endpoint to render a readiness checklist.
 *
 * @returns {Array<{ event_type: string } & TemplateEntry>}
 */
function getAllTemplateEntries() {
  return Object.entries(TEMPLATE_MAP).map(([eventType, entry]) => ({
    event_type: eventType,
    ...entry,
  }));
}

module.exports = {
  TEMPLATE_MAP,
  getTemplateEntry,
  getTemplateName,
  getValidTemplateNames,
  getAllTemplateEntries,
};
