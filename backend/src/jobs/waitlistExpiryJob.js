'use strict';

const { db }   = require('../db/connection');
const logger   = require('../utils/logger');

/**
 * waitlistExpiryJob — Cron every hour.
 *
 * Finds waitlist rows WHERE:
 *   status = 'offered'
 *   AND expires_at < NOW()
 * Updates status → 'expired'.
 *
 * Phase 6 Batch 4 fix:
 *   - Column: expires_at (not offered_at — that column does not exist in migration 020)
 *   - Migration 020 columns: id, hospital_id, patient_id, doctor_id, preferred_date,
 *     status, position, notes, offered_appointment_id, expires_at, created_at, updated_at
 *   - waitlist_status_enum: waiting | offered | accepted | expired | bypassed | removed
 *
 * No patient-facing WAITLIST_SLOT_AVAILABLE dispatch here.
 * That event fires when a slot is OFFERED to a patient (status waiting → offered),
 * which is triggered from the appointments service cancellation/reschedule path.
 * This job only handles expiry of previously offered (but not accepted) slots.
 */
async function runWaitlistExpiryJob() {
  const now = new Date();

  logger.info('[waitlistExpiryJob] Running.', { now: now.toISOString() });

  // Fetch rows where status = 'offered' AND expires_at is in the past.
  // expires_at: actual column name in migration 020 (NOT offered_at).
  const expiring = await db('waitlist')
    .where('status', 'offered')
    .whereRaw('expires_at IS NOT NULL AND expires_at <= ?', [now.toISOString()])
    .select('id', 'hospital_id', 'patient_id', 'doctor_id', 'expires_at');

  if (expiring.length === 0) {
    logger.info('[waitlistExpiryJob] No waitlist offers to expire. Exiting.');
    return;
  }

  logger.info(`[waitlistExpiryJob] Expiring ${expiring.length} waitlist offer(s).`);

  const ids = expiring.map((row) => row.id);

  // Bulk update — WHERE guard prevents touching non-offered rows concurrently.
  const updatedCount = await db('waitlist')
    .whereIn('id', ids)
    .where('status', 'offered')
    .update({ status: 'expired', updated_at: db.fn.now() });

  logger.info(`[waitlistExpiryJob] Done. Rows marked expired: ${updatedCount}`);

  for (const row of expiring) {
    logger.debug('[waitlistExpiryJob] Expired waitlist entry', {
      waitlistId: row.id,
      hospitalId: row.hospital_id,
      patientId:  row.patient_id,
      doctorId:   row.doctor_id,
      expiresAt:  row.expires_at,
    });
  }
}

module.exports = { runWaitlistExpiryJob };
