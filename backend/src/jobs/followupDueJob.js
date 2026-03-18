'use strict';

const { db }            = require('../db/connection');
const logger            = require('../utils/logger');
const { dispatchEvent } = require('../events/dispatch-event');
const EVENT_TYPES       = require('../events/event-types');

/**
 * followupDueJob — Cron daily at 03:00 IST.
 *
 * Queries follow_ups WHERE:
 *   due_date - 2 days = TODAY (i.e., due in exactly 2 days)
 *   AND status = 'scheduled'
 * Fires FOLLOWUP_DUE per qualifying follow-up.
 * No status change — dispatch only.
 *
 * This handles CLINICAL follow-ups from the follow_ups table (migration 027).
 * These are set by doctors after consultations: "come back in X weeks".
 * This is DISTINCT from postpartum follow-ups (postpartum_followups table)
 * which are handled by postpartumDueJob.js.
 *
 * Deduplication:
 *   Checked via notifications table (entity_id = followup UUID + event_type).
 *   One FOLLOWUP_DUE notification per follow-up record per due-date cycle.
 *
 * Schema (Phase 2 locked):
 *   follow_ups: id, patient_id, doctor_id, hospital_id, consultation_id,
 *               due_date, status, reason, appointment_id
 *   patients: id, name, phone, whatsapp_number
 *   users: id, name (for doctor lookup via doctors.user_id)
 *   hospitals: id, name, phone
 *   followup_status_enum: scheduled | completed
 */
async function runFollowupDueJob() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Target: follow-ups due exactly 2 calendar days from today.
  const targetDate    = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
  const targetDateStr = targetDate.toISOString().split('T')[0];

  logger.info('[followupDueJob] Running.', { targetDueDate: targetDateStr });

  // follow_ups has hospital_id directly — no join through patient needed for scoping.
  // p.name: correct per migration 013.
  // u.name: correct per migration 009.
  const followups = await db('follow_ups as fu')
    .join('patients as p',    'p.id',  'fu.patient_id')
    .join('doctors as d',     'd.id',  'fu.doctor_id')
    .join('users as u',       'u.id',  'd.user_id')
    .join('hospitals as h',   'h.id',  'fu.hospital_id')
    .select(
      'fu.id as followup_id',
      'fu.hospital_id',
      'fu.patient_id',
      'fu.doctor_id',
      'fu.consultation_id',
      'fu.due_date',
      'fu.reason',
      'fu.appointment_id',
      'p.name as patient_name',          // patients.name — migration 013
      'p.phone as patient_phone',
      'p.whatsapp_number as patient_whatsapp',
      'u.name as doctor_name',           // users.name — migration 009
      'h.name as hospital_name',         // required by followup_reminder template
      'h.phone as hospital_phone',
    )
    .where('fu.status', 'scheduled')
    .whereRaw('fu.due_date::date = ?', [targetDateStr]);

  logger.info(`[followupDueJob] Found ${followups.length} follow-up(s) due in 2 days.`);

  if (followups.length === 0) return;

  let dispatched = 0;
  let skipped    = 0;
  let failed     = 0;

  for (const fu of followups) {
    try {
      // Deduplication: one FOLLOWUP_DUE notification per follow-up per due-date cycle.
      // Check if already dispatched for this followup_id today.
      const alreadyDispatched = await db('notifications')
        .where('event_type', EVENT_TYPES.FOLLOWUP_DUE)
        .where('entity_id',  fu.followup_id)
        .whereRaw(`meta->>'dueDate' = ?`, [String(fu.due_date)])
        .first();

      if (alreadyDispatched) {
        skipped++;
        logger.debug(`[followupDueJob] Already dispatched for followup ${fu.followup_id} on ${fu.due_date}. Skipping.`);
        continue;
      }

      await dispatchEvent(
        EVENT_TYPES.FOLLOWUP_DUE,
        {
          patientId:       fu.patient_id,
          entityType:      'follow_ups',
          entityId:        fu.followup_id,
          branchId:        null,
          actorUserId:     null,
          // Template variables (arch Workflow 6: followup_reminder template)
          patientName:     fu.patient_name,
          patientPhone:    fu.patient_whatsapp || fu.patient_phone,
          doctorName:      fu.doctor_name,
          dueDate:         fu.due_date,
          hospitalName:    fu.hospital_name,
          hospitalPhone:   fu.hospital_phone || '',
          consultationId:  fu.consultation_id,
          appointmentId:   fu.appointment_id,
          reason:          fu.reason || '',
        },
        fu.hospital_id,
      );

      dispatched++;
      logger.debug(`[followupDueJob] Dispatched for followup ${fu.followup_id}`);
    } catch (err) {
      failed++;
      logger.error(`[followupDueJob] Failed for followup ${fu.followup_id}`, { message: err.message });
    }
  }

  logger.info(`[followupDueJob] Done. Dispatched: ${dispatched} | Skipped: ${skipped} | Failed: ${failed}`);
}

module.exports = { runFollowupDueJob };
