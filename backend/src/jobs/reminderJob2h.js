'use strict';

const { db }            = require('../db/connection');
const logger            = require('../utils/logger');
const { dispatchEvent } = require('../events/dispatch-event');
const EVENT_TYPES       = require('../events/event-types');

/**
 * reminderJob2h
 *
 * Architecture 23.2 / Roadmap Workflow 3:
 *   Cron every 15 minutes.
 *   Queries appointments where (appointment_date + appointment_time) is within
 *   the next 2 hours AND > NOW() (not already past) AND reminder_2h_sent = false
 *   AND status is active.
 *   Dispatches APPOINTMENT_REMINDER_2H per appointment.
 *   Marks reminder_2h_sent = true AFTER successful dispatch.
 *
 * Phase 6 Batch 2 fixes applied:
 *   - Column name: patients.name (not full_name) per migration 013
 *   - Column name: u.name as doctor_name (not full_name) per migration 009
 *   - Status filter: IN ('confirmed', 'scheduled') to match real booking flow
 *   - Payload now includes hospital_name (required by reminder_2h template)
 *   - Joins hospitals table to fetch hospital_name per appointment
 *
 * Deduplication: reminder_2h_sent = true flag prevents re-send on every cron tick.
 */
async function runReminderJob2h() {
  const now       = new Date();
  const windowEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2h

  logger.info('[reminderJob2h] Running.', { windowEnd: windowEnd.toISOString() });

  const appointments = await db('appointments as a')
    .join('patients as p',     'p.id',  'a.patient_id')
    .join('doctors as d',      'd.id',  'a.doctor_id')
    .join('users as u',        'u.id',  'd.user_id')
    .join('hospitals as h',    'h.id',  'a.hospital_id')
    .select(
      'a.id as appointment_id',
      'a.hospital_id',
      'a.branch_id',
      'a.patient_id',
      'a.doctor_id',
      'a.appointment_date',
      'a.appointment_time',
      'p.name as patient_name',           // patients.name per migration 013
      'p.phone as patient_phone',
      'p.whatsapp_number as patient_whatsapp',
      'u.name as doctor_name',            // users.name per migration 009
      'h.name as hospital_name',          // required by reminder_2h template
      'h.phone as hospital_phone',
    )
    .whereRaw(`
      (a.appointment_date + a.appointment_time::interval) > ?
      AND (a.appointment_date + a.appointment_time::interval) <= ?
    `, [now.toISOString(), windowEnd.toISOString()])
    .whereIn('a.status', ['confirmed', 'scheduled'])
    .where('a.reminder_2h_sent', false)
    .where('a.is_deleted', false);

  logger.info(`[reminderJob2h] Found ${appointments.length} appointment(s) to remind.`);

  if (appointments.length === 0) return;

  let successCount = 0;
  let failCount    = 0;

  for (const appt of appointments) {
    try {
      await dispatchEvent(
        EVENT_TYPES.APPOINTMENT_REMINDER_2H,
        {
          patientId:       appt.patient_id,
          entityType:      'appointment',
          entityId:        appt.appointment_id,
          branchId:        appt.branch_id,
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

      await db('appointments')
        .where('id',              appt.appointment_id)
        .whereIn('status',        ['confirmed', 'scheduled'])
        .where('reminder_2h_sent', false)
        .update({
          reminder_2h_sent: true,
          updated_at:       db.fn.now(),
        });

      successCount++;
      logger.debug(`[reminderJob2h] Dispatched for appointment ${appt.appointment_id}`);
    } catch (err) {
      failCount++;
      logger.error(`[reminderJob2h] Failed for appointment ${appt.appointment_id}`, {
        message: err.message,
      });
    }
  }

  logger.info(`[reminderJob2h] Done. Success: ${successCount} | Failed: ${failCount}`);
}

module.exports = { runReminderJob2h };
