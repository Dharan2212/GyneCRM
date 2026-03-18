'use strict';

const { db }            = require('../db/connection');
const logger            = require('../utils/logger');
const { dispatchEvent } = require('../events/dispatch-event');
const EVENT_TYPES       = require('../events/event-types');

/**
 * pregnancyWeekJob — Cron daily at midnight (Asia/Kolkata).
 *
 * Responsibilities:
 *   1. Recalculates pregnancy_week for all active pregnancies from lmp_date.
 *   2. If week changed → checks protocol_milestones for a match.
 *   3. If milestone matched and not already dispatched → fires PREGNANCY_MILESTONE_REACHED.
 *
 * Phase 6 Batch 3 fixes applied:
 *   - Column: lmp_date (not lmp_date was correct here; but NOW also joining hospitals/patients)
 *   - Column: p.name (not p.full_name) — patients migration 013
 *   - Column: u.name (not u.full_name) — users migration 009
 *   - Column: week_number (not milestone_week) — protocol_milestones migration 038
 *   - Removed: pr.protocol_id query (column does not exist in pregnancies migration 016)
 *     → Protocol is looked up per hospital from hospital_protocols table
 *   - Dedup guard: uses entity_id + meta->>'milestoneWeek' + meta->>'milestoneId'
 *     (already fixed in Batch 1)
 *   - Payload: includes patient_name, patientPhone, hospitalName, doctorName
 *     for WhatsApp template rendering (arch Workflow 5)
 */

function computePregnancyWeek(lmpDate) {
  if (!lmpDate) return 0;
  const lmp = new Date(lmpDate);
  const now = new Date();
  const diffMs = now.getTime() - lmp.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
}

function deriveTrimester(week) {
  if (week <= 12) return 'first';
  if (week <= 27) return 'second';
  return 'third';
}

async function runPregnancyWeekJob() {
  logger.info('[pregnancyWeekJob] Running.');

  // Fetch all active pregnancies with patient, hospital, and doctor info.
  // Phase 6 Batch 3: joins hospitals + patients + users for dispatch payload fields.
  // Column lmp_date: correct per migration 016 (pregnancies table).
  // Column p.name: correct per migration 013 (patients table, not full_name).
  // Column u.name: correct per migration 009 (users table, not full_name).
  const pregnancies = await db('pregnancies as pr')
    .join('patients as p',   'p.id',  'pr.patient_id')
    .join('hospitals as h',  'h.id',  'pr.hospital_id')
    .leftJoin('doctors as d', 'd.id', 'pr.doctor_id')
    .leftJoin('users as u',   'u.id', 'd.user_id')
    .select(
      'pr.id as pregnancy_id',
      'pr.hospital_id',
      'pr.patient_id',
      'pr.doctor_id',
      'pr.lmp_date',                         // actual column name — migration 016
      'pr.pregnancy_week as current_db_week',
      'p.name as patient_name',              // patients.name — migration 013
      'p.phone as patient_phone',
      'p.whatsapp_number as patient_whatsapp',
      'h.name as hospital_name',             // hospitals.name — migration 001
      'h.phone as hospital_phone',
      'u.name as doctor_name',               // users.name — migration 009
    )
    .where('pr.status', 'active');

  logger.info(`[pregnancyWeekJob] Found ${pregnancies.length} active pregnancy/pregnancies.`);

  if (pregnancies.length === 0) return;

  let weekUpdated        = 0;
  let milestonesTriggered = 0;
  let failed             = 0;

  // Cache per-hospital protocol to avoid repeat DB lookups per pregnancy
  const protocolCache    = new Map();
  const milestonesCache  = new Map();

  for (const preg of pregnancies) {
    try {
      const newWeek = computePregnancyWeek(preg.lmp_date);

      // ── Step 1: Update pregnancy_week if it has changed ─────────────────
      if (newWeek !== preg.current_db_week) {
        await db('pregnancies')
          .where('id',    preg.pregnancy_id)
          .where('status', 'active')
          .update({ pregnancy_week: newWeek, updated_at: db.fn.now() });

        weekUpdated++;
        logger.debug(`[pregnancyWeekJob] Week updated: pregnancy ${preg.pregnancy_id} ${preg.current_db_week} → ${newWeek}`);
      }

      // ── Step 2: Check for milestone triggers (only when week > 0) ────────
      if (newWeek <= 0) continue;

      // Fetch protocol for this hospital (cached)
      if (!protocolCache.has(preg.hospital_id)) {
        const protocol = await db('hospital_protocols')
          .where({ hospital_id: preg.hospital_id, is_active: true })
          .orderBy('created_at', 'desc')
          .first('id', 'name');
        protocolCache.set(preg.hospital_id, protocol || null);
      }

      const protocol = protocolCache.get(preg.hospital_id);
      if (!protocol) continue;

      // Fetch milestones for this protocol (cached)
      if (!milestonesCache.has(protocol.id)) {
        // week_number: actual column in protocol_milestones migration 038
        // No hospital_id or is_active columns on this table
        const milestones = await db('protocol_milestones')
          .where({ protocol_id: protocol.id })
          .select('id', 'week_number', 'milestone_name', 'description', 'is_critical');
        milestonesCache.set(protocol.id, milestones);
      }

      const milestones     = milestonesCache.get(protocol.id);
      const matchedMilestones = milestones.filter((m) => m.week_number === newWeek);

      if (matchedMilestones.length === 0) continue;

      for (const milestone of matchedMilestones) {
        // Deduplication: check notifications table for prior dispatch
        // (entity_id = pregnancy UUID, meta stores payload keys — fixed in Batch 1)
        const alreadyDispatched = await db('notifications')
          .where('event_type', EVENT_TYPES.PREGNANCY_MILESTONE_REACHED)
          .where('entity_id',  preg.pregnancy_id)
          .whereRaw(`meta->>'milestoneWeek' = ?`, [String(milestone.week_number)])
          .whereRaw(`meta->>'milestoneId'   = ?`, [String(milestone.id)])
          .first();

        if (alreadyDispatched) {
          logger.debug(`[pregnancyWeekJob] Milestone ${milestone.id} week ${newWeek} already dispatched for pregnancy ${preg.pregnancy_id}. Skipping.`);
          continue;
        }

        await dispatchEvent(
          EVENT_TYPES.PREGNANCY_MILESTONE_REACHED,
          {
            patientId:            preg.patient_id,
            entityType:           'pregnancy',
            entityId:             preg.pregnancy_id,
            branchId:             null,
            actorUserId:          null,
            // Template variables (arch Workflow 5)
            patientName:          preg.patient_name,
            patientPhone:         preg.patient_whatsapp || preg.patient_phone,
            doctorName:           preg.doctor_name || '',
            pregnancyWeek:        newWeek,
            trimester:            deriveTrimester(newWeek),
            milestoneId:          milestone.id,
            milestoneName:        milestone.milestone_name,
            milestoneWeek:        milestone.week_number,   // key matches dedup guard above
            milestoneDescription: milestone.description || '',
            isCritical:           milestone.is_critical,
            hospitalName:         preg.hospital_name,
            hospitalPhone:        preg.hospital_phone || '',
          },
          preg.hospital_id,
        );

        milestonesTriggered++;
        logger.debug(`[pregnancyWeekJob] Dispatched milestone "${milestone.milestone_name}" (week ${newWeek}) for pregnancy ${preg.pregnancy_id}`);
      }
    } catch (err) {
      failed++;
      logger.error(`[pregnancyWeekJob] Failed for pregnancy ${preg.pregnancy_id}`, { message: err.message });
    }
  }

  logger.info(`[pregnancyWeekJob] Done. Weeks updated: ${weekUpdated} | Milestones triggered: ${milestonesTriggered} | Failed: ${failed}`);
}

module.exports = { runPregnancyWeekJob };
