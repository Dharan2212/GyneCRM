'use strict';

const { db }            = require('../db/connection');
const logger            = require('../utils/logger');
const { dispatchEvent } = require('../events/dispatch-event');
const EVENT_TYPES       = require('../events/event-types');

/**
 * testOverdueJob — Cron daily at 01:00 IST.
 *
 * Queries patient_test_orders WHERE:
 *   due_date < TODAY
 *   AND status IN ('ordered', 'pending')
 * Updates status → 'overdue'.
 * Fires TEST_OVERDUE event per affected order.
 *
 * Phase 6 Batch 4 fixes:
 *   - Column: p.name (not p.full_name) — patients migration 013
 *   - Uses pto.hospital_id directly (patient_test_orders has its own hospital_id — migration 029)
 *   - Joins hospitals for hospital_name (required by test_reminder template)
 *   - Payload includes patientName, patientPhone, hospitalName, testName, dueDate
 *   - Deduplication: once status = 'overdue', row no longer matches query — idempotent
 *
 * Schema (Phase 2 locked):
 *   patient_test_orders: id, patient_id, hospital_id, test_catalog_id, ordered_by,
 *                        test_name, test_code, status, due_date, notes
 *   patients: id, name, phone, whatsapp_number
 */
async function runTestOverdueJob() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  logger.info('[testOverdueJob] Running.', { today: today.toISOString() });

  // patient_test_orders has hospital_id directly (migration 029).
  // p.name: correct per migration 013 (not full_name).
  const overdueOrders = await db('patient_test_orders as pto')
    .join('patients as p',    'p.id', 'pto.patient_id')
    .join('hospitals as h',   'h.id', 'pto.hospital_id')
    .select(
      'pto.id as order_id',
      'pto.hospital_id',
      'pto.patient_id',
      'pto.consultation_id',
      'pto.test_catalog_id',
      'pto.test_name',                    // column exists directly on patient_test_orders
      'pto.test_code',
      'pto.due_date',
      'p.name as patient_name',           // patients.name — migration 013
      'p.phone as patient_phone',
      'p.whatsapp_number as patient_whatsapp',
      'h.name as hospital_name',
      'h.phone as hospital_phone',
    )
    .whereIn('pto.status', ['ordered', 'pending'])
    .whereRaw('pto.due_date < ?', [today.toISOString().split('T')[0]]);

  logger.info(`[testOverdueJob] Found ${overdueOrders.length} overdue test order(s).`);

  if (overdueOrders.length === 0) return;

  let markedCount = 0;
  let failCount   = 0;

  for (const order of overdueOrders) {
    try {
      // Update status BEFORE dispatch — guard prevents double-update (idempotent).
      const updatedRows = await db('patient_test_orders')
        .where('id',     order.order_id)
        .whereIn('status', ['ordered', 'pending'])
        .update({ status: 'overdue', updated_at: db.fn.now() });

      if (updatedRows === 0) {
        logger.debug(`[testOverdueJob] Order ${order.order_id} not updated (concurrent change). Skipping.`);
        continue;
      }

      // Dispatch TEST_OVERDUE — patient-facing via dispatchEvent consent gate.
      await dispatchEvent(
        EVENT_TYPES.TEST_OVERDUE,
        {
          patientId:       order.patient_id,
          entityType:      'patient_test_orders',
          entityId:        order.order_id,
          // Template variables (arch Workflow 7)
          patientName:     order.patient_name,
          patientPhone:    order.patient_whatsapp || order.patient_phone,
          testName:        order.test_name,
          testCode:        order.test_code || '',
          dueDate:         order.due_date,
          hospitalName:    order.hospital_name,
          hospitalPhone:   order.hospital_phone || '',
          consultationId:  order.consultation_id,
          testCatalogId:   order.test_catalog_id,
        },
        order.hospital_id,
      );

      markedCount++;
      logger.debug(`[testOverdueJob] Marked overdue + dispatched: order ${order.order_id}`);
    } catch (err) {
      failCount++;
      logger.error(`[testOverdueJob] Failed for order ${order.order_id}`, { message: err.message });
    }
  }

  logger.info(`[testOverdueJob] Done. Marked overdue: ${markedCount} | Failed: ${failCount}`);
}

module.exports = { runTestOverdueJob };
