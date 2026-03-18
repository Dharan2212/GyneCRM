'use strict';

const { db }            = require('../../db/connection');
const testOrderRepo     = require('./testOrder.repository');
const { dispatchEvent } = require('../../events/dispatch-event');
const EVENT_TYPES       = require('../../events/event-types');
const { auditLog }      = require('../../middleware/audit-logger.middleware');
const logger            = require('../../utils/logger');
const { TEST_ORDER_STATUS } = require('../../validators/testOrder.validator');

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function assertOrderExists(id, hospitalId) {
  const order = await testOrderRepo.findById(id, hospitalId);
  if (!order) {
    const err = new Error('Test order not found.'); err.statusCode = 404; err.code = 'TEST_ORDER_NOT_FOUND'; throw err;
  }
  return order;
}

/**
 * Fetch hospital name and phone for automation payloads.
 * Never throws — returns empty strings on failure.
 */
async function fetchHospitalInfo(hospitalId) {
  try {
    const hospital = await db('hospitals').where('id', hospitalId).select('name', 'phone').first();
    return { hospitalName: hospital ? hospital.name : '', hospitalPhone: hospital ? hospital.phone : '' };
  } catch (err) {
    logger.warn('[testOrder.service] fetchHospitalInfo failed', { hospitalId, error: err.message });
    return { hospitalName: '', hospitalPhone: '' };
  }
}

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Create a test order from a consultation.
 *
 * Phase 6 Batch 4: TEST_ORDER_CREATED dispatch payload now includes
 * patientName, patientPhone, hospitalName — required by test_reminder template.
 *
 * patient_test_orders has its own hospital_id (migration 029) — used for scoping.
 * test_name and test_code are stored directly on patient_test_orders.
 */
async function createTestOrder(data, actor) {
  const { patient_id, consultation_id, pregnancy_id, test_catalog_id, due_date, notes } = data;
  const { userId, hospitalId } = actor;

  const patient = await testOrderRepo.findPatientById(patient_id, hospitalId);
  if (!patient) {
    const err = new Error('Patient not found.'); err.statusCode = 404; err.code = 'PATIENT_NOT_FOUND'; throw err;
  }

  const consultation = await testOrderRepo.findConsultationById(consultation_id, hospitalId);
  if (!consultation) {
    const err = new Error('Consultation not found.'); err.statusCode = 404; err.code = 'CONSULTATION_NOT_FOUND'; throw err;
  }
  if (consultation.patient_id !== patient_id) {
    const err = new Error('Consultation does not belong to the specified patient.'); err.statusCode = 422; err.code = 'PATIENT_CONSULTATION_MISMATCH'; throw err;
  }

  if (pregnancy_id) {
    const pregnancy = await testOrderRepo.findPregnancyById(pregnancy_id, hospitalId);
    if (!pregnancy) {
      const err = new Error('Pregnancy record not found.'); err.statusCode = 404; err.code = 'PREGNANCY_NOT_FOUND'; throw err;
    }
    if (pregnancy.patient_id !== patient_id) {
      const err = new Error('Pregnancy does not belong to the specified patient.'); err.statusCode = 422; err.code = 'PATIENT_PREGNANCY_MISMATCH'; throw err;
    }
  }

  const testCatalogEntry = await testOrderRepo.findTestCatalogById(test_catalog_id);
  if (!testCatalogEntry) {
    const err = new Error('Test catalog entry not found or inactive.'); err.statusCode = 404; err.code = 'TEST_CATALOG_NOT_FOUND'; throw err;
  }

  const doctor = await db('doctors').where({ user_id: userId, hospital_id: hospitalId }).first();
  if (!doctor) {
    const err = new Error('Only registered doctors can create test orders.'); err.statusCode = 403; err.code = 'DOCTOR_PROFILE_NOT_FOUND'; throw err;
  }

  // patient_test_orders stores test_name and test_code directly (migration 029)
  const order = await testOrderRepo.create({
    patient_id,
    hospital_id:     hospitalId,
    consultation_id,
    pregnancy_id:    pregnancy_id || null,
    test_catalog_id,
    ordered_by:      doctor.id,
    test_name:       testCatalogEntry.test_name,
    test_code:       testCatalogEntry.test_code || null,
    due_date,
    status:          TEST_ORDER_STATUS.ORDERED,
    skip_reason:     null,
    result_doc_id:   null,
    notes:           notes || null,
  });

  await auditLog({
    hospitalId,
    userId,
    action:     'TEST_ORDER_CREATED',
    entityType: 'patient_test_orders',
    entityId:   order.id,
    meta:       { patient_id, consultation_id, pregnancy_id, test_catalog_id, due_date },
  });

  // ── Phase 6 Batch 4: Dispatch TEST_ORDER_CREATED with full template payload ──
  // Template: test_reminder — requires patientName, testName, dueDate, hospitalName
  const { hospitalName, hospitalPhone } = await fetchHospitalInfo(hospitalId);

  dispatchEvent(
    EVENT_TYPES.TEST_ORDER_CREATED,
    {
      patientId:       patient_id,
      entityType:      'patient_test_orders',
      entityId:        order.id,
      actorUserId:     userId,
      // Template variables (arch Workflow 7 + template-map: test_reminder)
      patientName:     patient.name,                           // patients.name — migration 013
      patientPhone:    patient.whatsapp_number || patient.phone,
      testName:        testCatalogEntry.test_name,
      testCode:        testCatalogEntry.test_code || '',
      dueDate:         due_date,
      hospitalName,
      hospitalPhone,
      consultationId:  consultation_id,
      pregnancyId:     pregnancy_id || null,
      testCatalogId:   test_catalog_id,
    },
    hospitalId,
  ).catch((err) => {
    logger.error(`[testOrder.service] TEST_ORDER_CREATED dispatch error for ${order.id}: ${err.message}`);
  });

  logger.info(`Test order created: ${order.id} for patient ${patient_id}`);
  return testOrderRepo.findByIdWithDetails(order.id, hospitalId);
}

/**
 * List test orders with filters.
 */
async function listTestOrders(queryParams, actor) {
  const { hospitalId } = actor;
  const {
    page, limit, sort_by: sortBy, sort_dir: sortDir,
    patient_id: patientId, pregnancy_id: pregnancyId,
    status, ordered_by: orderedBy,
    due_date_from: dueDateFrom, due_date_to: dueDateTo,
  } = queryParams;

  return testOrderRepo.findAll(hospitalId, { page, limit, sortBy, sortDir, patientId, pregnancyId, status, orderedBy, dueDateFrom, dueDateTo });
}

/**
 * Skip a test order with mandatory reason.
 */
async function skipTestOrder(id, data, actor) {
  const { userId, hospitalId } = actor;
  const { skip_reason } = data;

  const order = await assertOrderExists(id, hospitalId);

  const SKIPPABLE = [TEST_ORDER_STATUS.ORDERED, TEST_ORDER_STATUS.PENDING, TEST_ORDER_STATUS.OVERDUE];
  if (!SKIPPABLE.includes(order.status)) {
    const err = new Error(`Cannot skip a test order in '${order.status}' status.`); err.statusCode = 422; err.code = 'TEST_ORDER_CANNOT_SKIP'; throw err;
  }

  const updated = await testOrderRepo.update(id, {
    status:     TEST_ORDER_STATUS.SKIPPED,
    skip_reason,
    skipped_by: userId,
    skipped_at: new Date(),
  });

  await auditLog({
    hospitalId, userId, action: 'TEST_ORDER_SKIPPED', entityType: 'patient_test_orders', entityId: id,
    meta: { skip_reason, previous_status: order.status },
  });

  logger.info(`Test order skipped: ${id}`);
  return updated;
}

/**
 * Link an uploaded document as the result for a test order.
 */
async function linkResult(id, data, actor) {
  const { userId, hospitalId } = actor;
  const { result_doc_id } = data;

  const order = await assertOrderExists(id, hospitalId);

  const BLOCKED = [TEST_ORDER_STATUS.REVIEWED, TEST_ORDER_STATUS.SKIPPED];
  if (BLOCKED.includes(order.status)) {
    const err = new Error(`Cannot link result to a test order in '${order.status}' status.`); err.statusCode = 422; err.code = 'TEST_ORDER_RESULT_LINK_BLOCKED'; throw err;
  }

  const document = await testOrderRepo.findDocumentById(result_doc_id, hospitalId);
  if (!document) {
    const err = new Error('Document not found or belongs to a different hospital.'); err.statusCode = 404; err.code = 'DOCUMENT_NOT_FOUND'; throw err;
  }
  if (document.patient_id !== order.patient_id) {
    const err = new Error('Document does not belong to the patient associated with this test order.'); err.statusCode = 422; err.code = 'DOCUMENT_PATIENT_MISMATCH'; throw err;
  }

  const updated = await db.transaction(async (trx) => {
    const result = await testOrderRepo.update(id, {
      result_doc_id,
      status: TEST_ORDER_STATUS.RESULT_UPLOADED,
    }, trx);

    await trx('patient_documents')
      .where({ id: result_doc_id })
      .update({ linked_test_order_id: id, updated_at: new Date() });

    return result;
  });

  await auditLog({
    hospitalId, userId, action: 'TEST_ORDER_RESULT_LINKED', entityType: 'patient_test_orders', entityId: id,
    meta: { result_doc_id, patient_id: order.patient_id },
  });

  return updated;
}

/**
 * List overdue test orders for the hospital.
 */
async function listOverdue(queryParams, actor) {
  const { hospitalId } = actor;
  const { page, limit, ordered_by: orderedBy } = queryParams;
  return testOrderRepo.findOverdue(hospitalId, { page, limit, orderedBy });
}

/**
 * Exported for testOverdueJob.js cron usage.
 */
async function batchMarkOverdue() {
  const count = await testOrderRepo.batchMarkOverdue();
  logger.info(`[testOverdueJob] Marked ${count} test orders as overdue.`);
  return count;
}

module.exports = {
  createTestOrder,
  listTestOrders,
  skipTestOrder,
  linkResult,
  listOverdue,
  batchMarkOverdue,
};
