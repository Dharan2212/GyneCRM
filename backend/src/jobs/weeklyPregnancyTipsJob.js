'use strict';

const { db }            = require('../db/connection');
const logger            = require('../utils/logger');
const { dispatchEvent } = require('../events/dispatch-event');
const EVENT_TYPES       = require('../events/event-types');

/**
 * weeklyPregnancyTipsJob — Cron every Monday at 08:00 IST.
 *
 * Finds all active pregnancies and dispatches PREGNANCY_WEEKLY_TIPS per
 * patient so they receive week-specific health guidance.
 *
 * Phase 6 Batch 3 fixes applied:
 *   - Column: p.name (not p.full_name) — patients migration 013
 *   - Column: lmp_date (not lmp) — pregnancies migration 016
 *   - Removed: pr.protocol_id (does not exist in pregnancies migration 016)
 *   - Added: joins hospitals for hospital_name (required by weekly_pregnancy_tip template)
 *   - Added: joins doctors/users for doctor_name in payload
 *   - Dedup guard: uses entity_id + meta->>'isoYear' + meta->>'isoWeek'
 *     (already fixed in Batch 1)
 *   - Payload: includes patient_name, patientPhone, hospitalName
 *     for WhatsApp template rendering (arch Workflow 8)
 */
async function runWeeklyPregnancyTipsJob() {
  logger.info('[weeklyPregnancyTipsJob] Running.');

  // Join patients for name/phone, hospitals for hospital_name.
  // p.name: correct per migration 013 (not full_name)
  const activePregnancies = await db('pregnancies as pr')
    .join('patients as p',    'p.id', 'pr.patient_id')
    .join('hospitals as h',   'h.id', 'pr.hospital_id')
    .leftJoin('doctors as d', 'd.id', 'pr.doctor_id')
    .leftJoin('users as u',   'u.id', 'd.user_id')
    .select(
      'pr.id as pregnancy_id',
      'pr.hospital_id',
      'pr.patient_id',
      'pr.pregnancy_week',
      'pr.lmp_date',                          // actual column name — migration 016
      'p.name as patient_name',              // patients.name — migration 013
      'p.phone as patient_phone',
      'p.whatsapp_number as patient_whatsapp',
      'h.name as hospital_name',             // required by weekly_pregnancy_tip template
      'h.phone as hospital_phone',
      'u.name as doctor_name',               // users.name — migration 009
    )
    .where('pr.status', 'active');

  logger.info(`[weeklyPregnancyTipsJob] Found ${activePregnancies.length} active pregnancy/pregnancies.`);

  if (activePregnancies.length === 0) return;

  let dispatched = 0;
  let skipped    = 0;
  let failed     = 0;

  // ISO week + year for deduplication
  const now     = new Date();
  const isoWeek = getISOWeek(now);
  const isoYear = getISOYear(now);

  for (const preg of activePregnancies) {
    try {
      const currentWeek = preg.pregnancy_week || 0;

      if (currentWeek <= 0) {
        skipped++;
        logger.debug(`[weeklyPregnancyTipsJob] Skipping pregnancy ${preg.pregnancy_id}: invalid week ${currentWeek}`);
        continue;
      }

      // Idempotency guard: one tip per pregnancy per ISO calendar week.
      // entity_id = pregnancy UUID per Phase 2 spec.
      // meta column (fixed in Batch 1) — correct column name.
      const alreadySent = await db('notifications')
        .where('event_type', EVENT_TYPES.PREGNANCY_WEEKLY_TIPS)
        .where('entity_id',  preg.pregnancy_id)
        .whereRaw(`meta->>'isoYear' = ?`, [String(isoYear)])
        .whereRaw(`meta->>'isoWeek' = ?`, [String(isoWeek)])
        .first();

      if (alreadySent) {
        skipped++;
        logger.debug(`[weeklyPregnancyTipsJob] Already dispatched this week for pregnancy ${preg.pregnancy_id}. Skipping.`);
        continue;
      }

      await dispatchEvent(
        EVENT_TYPES.PREGNANCY_WEEKLY_TIPS,
        {
          patientId:       preg.patient_id,
          entityType:      'pregnancy',
          entityId:        preg.pregnancy_id,
          branchId:        null,
          actorUserId:     null,
          // Template variables (arch Workflow 8)
          patientName:     preg.patient_name,
          patientPhone:    preg.patient_whatsapp || preg.patient_phone,
          doctorName:      preg.doctor_name || '',
          pregnancyWeek:   currentWeek,
          hospitalName:    preg.hospital_name,
          hospitalPhone:   preg.hospital_phone || '',
          isoYear,
          isoWeek,
        },
        preg.hospital_id,
      );

      dispatched++;
      logger.debug(`[weeklyPregnancyTipsJob] Dispatched week ${currentWeek} tips for pregnancy ${preg.pregnancy_id}`);
    } catch (err) {
      failed++;
      logger.error(`[weeklyPregnancyTipsJob] Failed for pregnancy ${preg.pregnancy_id}`, { message: err.message });
    }
  }

  logger.info(`[weeklyPregnancyTipsJob] Done. Dispatched: ${dispatched} | Skipped: ${skipped} | Failed: ${failed}`);
}

function getISOWeek(date) {
  const d      = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getISOYear(date) {
  const d      = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

module.exports = { runWeeklyPregnancyTipsJob };
