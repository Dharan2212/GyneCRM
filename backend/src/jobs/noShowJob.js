'use strict';

const { db }            = require('../db/connection');
const logger            = require('../utils/logger');
const { dispatchEvent } = require('../events/dispatch-event');
const EVENT_TYPES       = require('../events/event-types');

/**
 * noShowJob
 *
 * Architecture 23.2 / Roadmap Workflow 4:
 *   Cron every 30 minutes.
 *   Queries appointments where:
 *     status IN ('confirmed', 'scheduled')
 *     AND (appointment_date + appointment_time) + late_threshold_minutes < NOW()
 *   Updates each qualifying appointment: status → 'no_show'.
 *   Dispatches APPOINTMENT_MISSED per appointment.
 *
 * late_threshold_minutes is read from hospital_settings per hospital.
 * Default: 30 minutes (arch Section 8.4).
 *
 * Phase 6 Batch 2 fixes applied:
 *   - Column name: patients.name (not full_name) per migration 013
 *   - Column name: u.name as doctor_name (not full_name) per migration 009
 *   - Status filter: IN ('confirmed', 'scheduled') to match real booking flow
 *   - Payload now includes hospital_name and hospital_phone (required by template)
 *   - Joins hospitals table per hospital to fetch hospital info
 *
 * Safety rules:
 *   - Only transitions rows IN ('confirmed', 'scheduled') → 'no_show'.
 *   - Update performed BEFORE dispatch — status reflects final state in payload.
 *   - Idempotent: once status = 'no_show', row no longer matches WHERE clause.
 *   - Concurrent safety: UPDATE WHERE status IN (...) is a strict guard.
 */

const DEFAULT_LATE_THRESHOLD_MINUTES = 30;

async function getLateThreshold(hospitalId) {
  try {
    const row = await db('hospital_settings')
      .where('hospital_id', hospitalId)
      .where('key',         'late_threshold_minutes')
      .select('value')
      .first();

    if (row && row.value) {
      const parsed = parseInt(row.value, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch (err) {
    logger.warn(`[noShowJob] Failed to fetch late_threshold for hospital ${hospitalId}, using default`, {
      message: err.message,
    });
  }
  return DEFAULT_LATE_THRESHOLD_MINUTES;
}

async function runNoShowJob() {
  const now = new Date();

  logger.info('[noShowJob] Running.', { now: now.toISOString() });

  // Fetch unique hospital_ids that have overdue active appointments.
  // Process per-hospital to apply per-hospital late threshold.
  const hospitalRows = await db('appointments')
    .distinct('hospital_id')
    .whereIn('status', ['confirmed', 'scheduled'])
    .where('is_deleted', false)
    .whereRaw(`(appointment_date + appointment_time::interval) < ?`, [now.toISOString()]);

  if (hospitalRows.length === 0) {
    logger.info('[noShowJob] No overdue active appointments found. Exiting.');
    return;
  }

  logger.info(`[noShowJob] Processing ${hospitalRows.length} hospital(s).`);

  let totalMarked = 0;
  let totalFailed = 0;

  for (const { hospital_id } of hospitalRows) {
    const threshold = await getLateThreshold(hospital_id);
    const cutoff    = new Date(now.getTime() - threshold * 60 * 1000);

    // Fetch overdue appointments with all required template fields.
    const overdue = await db('appointments as a')
      .join('patients as p',   'p.id',  'a.patient_id')
      .join('doctors as d',    'd.id',  'a.doctor_id')
      .join('users as u',      'u.id',  'd.user_id')
      .join('hospitals as h',  'h.id',  'a.hospital_id')
      .select(
        'a.id as appointment_id',
        'a.hospital_id',
        'a.branch_id',
        'a.patient_id',
        'a.doctor_id',
        'a.appointment_date',
        'a.appointment_time',
        'p.name as patient_name',         // patients.name per migration 013
        'p.phone as patient_phone',
        'p.whatsapp_number as patient_whatsapp',
        'u.name as doctor_name',          // users.name per migration 009
        'h.name as hospital_name',        // required by missed_appointment_recovery template
        'h.phone as hospital_phone',
      )
      .where('a.hospital_id', hospital_id)
      .whereIn('a.status',    ['confirmed', 'scheduled'])
      .where('a.is_deleted',  false)
      .whereRaw(`(a.appointment_date + a.appointment_time::interval) <= ?`, [cutoff.toISOString()]);

    if (overdue.length === 0) continue;

    logger.info(`[noShowJob] Hospital ${hospital_id}: ${overdue.length} appointment(s) to mark no_show.`);

    for (const appt of overdue) {
      try {
        // Update status BEFORE dispatch so event payload reflects final state.
        const updatedRows = await db('appointments')
          .where('id', appt.appointment_id)
          .whereIn('status', ['confirmed', 'scheduled']) // strict concurrent guard
          .update({
            status:     'no_show',
            updated_at: db.fn.now(),
          });

        if (updatedRows === 0) {
          // Status changed by concurrent process — skip.
          logger.debug(`[noShowJob] Appointment ${appt.appointment_id} status changed concurrently, skipping.`);
          continue;
        }

        await dispatchEvent(
          EVENT_TYPES.APPOINTMENT_MISSED,
          {
            patientId:       appt.patient_id,
            entityType:      'appointment',
            entityId:        appt.appointment_id,
            branchId:        appt.branch_id,
            // Template variables (arch Workflow 4)
            patientName:     appt.patient_name,
            patientPhone:    appt.patient_whatsapp || appt.patient_phone,
            doctorName:      appt.doctor_name,
            appointmentDate: appt.appointment_date,
            appointmentTime: appt.appointment_time,
            hospitalName:    appt.hospital_name,
            hospitalPhone:   appt.hospital_phone,
          },
          appt.hospital_id,
        );

        totalMarked++;
        logger.debug(`[noShowJob] Marked no_show + dispatched: appointment ${appt.appointment_id}`);
      } catch (err) {
        totalFailed++;
        logger.error(`[noShowJob] Failed for appointment ${appt.appointment_id}`, {
          message: err.message,
        });
      }
    }
  }

  logger.info(`[noShowJob] Done. Marked: ${totalMarked} | Failed: ${totalFailed}`);
}

module.exports = { runNoShowJob };
