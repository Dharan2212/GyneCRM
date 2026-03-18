'use strict';

const { db }            = require('../db/connection');
const logger            = require('../utils/logger');
const { dispatchEvent } = require('../events/dispatch-event');
const EVENT_TYPES       = require('../events/event-types');

/**
 * postpartumDueJob — Cron daily at 02:00 IST.
 *
 * Queries postpartum_followups WHERE:
 *   due_date - 2 days = TODAY (i.e., due in exactly 2 days)
 *   AND status = 'scheduled'
 * Fires POSTPARTUM_FOLLOWUP_DUE per qualifying followup.
 * No status change — dispatch only.
 *
 * Phase 6 Batch 4 fixes:
 *   - Column: p.name (not p.full_name) — patients migration 013
 *   - Column: u.name (not du.full_name) — users migration 009
 *   - Joins hospitals for hospital_name (required by postpartum_followup_due template)
 *   - Payload includes patientName, doctorName, hospitalName, dueDate, visitType
 *
 * Schema (Phase 2 locked):
 *   postpartum_followups: id, delivery_id, patient_id, doctor_id, due_date, visit_type,
 *                         status, appointment_id, notes
 *   deliveries: id, pregnancy_id, hospital_id
 *   patients: id, name, phone, whatsapp_number
 *   users: id, name
 */
async function runPostpartumDueJob() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate    = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
  const targetDateStr = targetDate.toISOString().split('T')[0];

  logger.info('[postpartumDueJob] Running.', { targetDueDate: targetDateStr });

  const followups = await db('postpartum_followups as pf')
    .join('patients as p',    'p.id',  'pf.patient_id')
    .join('doctors as d',     'd.id',  'pf.doctor_id')
    .join('users as u',       'u.id',  'd.user_id')        // users.name — migration 009
    .join('deliveries as dl', 'dl.id', 'pf.delivery_id')
    .join('hospitals as h',   'h.id',  'dl.hospital_id')
    .select(
      'pf.id as followup_id',
      'pf.patient_id',
      'pf.doctor_id',
      'pf.delivery_id',
      'pf.due_date',
      'pf.visit_type',
      'pf.appointment_id',
      'dl.pregnancy_id',
      'dl.hospital_id',
      'p.name as patient_name',          // patients.name — migration 013
      'p.phone as patient_phone',
      'p.whatsapp_number as patient_whatsapp',
      'u.name as doctor_name',           // users.name — migration 009
      'h.name as hospital_name',
      'h.phone as hospital_phone',
    )
    .where('pf.status', 'scheduled')
    .whereRaw('pf.due_date::date = ?', [targetDateStr]);

  logger.info(`[postpartumDueJob] Found ${followups.length} postpartum followup(s) due in 2 days.`);

  if (followups.length === 0) return;

  let dispatched = 0;
  let failed     = 0;

  for (const fu of followups) {
    try {
      await dispatchEvent(
        EVENT_TYPES.POSTPARTUM_FOLLOWUP_DUE,
        {
          patientId:       fu.patient_id,
          entityType:      'postpartum_followups',
          entityId:        fu.followup_id,
          branchId:        null,
          // Template variables (postpartum_followup_due template)
          patientName:     fu.patient_name,
          patientPhone:    fu.patient_whatsapp || fu.patient_phone,
          doctorName:      fu.doctor_name,
          dueDate:         fu.due_date,
          visitType:       fu.visit_type,
          hospitalName:    fu.hospital_name,
          hospitalPhone:   fu.hospital_phone || '',
          deliveryId:      fu.delivery_id,
          pregnancyId:     fu.pregnancy_id,
          appointmentId:   fu.appointment_id,
        },
        fu.hospital_id,
      );

      dispatched++;
      logger.debug(`[postpartumDueJob] Dispatched for followup ${fu.followup_id}`);
    } catch (err) {
      failed++;
      logger.error(`[postpartumDueJob] Failed for followup ${fu.followup_id}`, { message: err.message });
    }
  }

  logger.info(`[postpartumDueJob] Done. Dispatched: ${dispatched} | Failed: ${failed}`);
}

module.exports = { runPostpartumDueJob };
