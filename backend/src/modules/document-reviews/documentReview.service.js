'use strict';

const { db } = require('../../db/connection');
const docReviewRepo = require('./documentReview.repository');
const { generateDownloadUrl } = require('../../utils/s3-helper');
const { auditLog } = require('../../middleware/audit-logger.middleware');
const logger = require('../../utils/logger');
const { REVIEW_STATUS, FLAG_LEVEL } = require('../../validators/documentReview.validator');
const { TEST_ORDER_STATUS } = require('../../validators/testOrder.validator');

// ─── Reference range engine ───────────────────────────────────────────────────

/**
 * Architecture Part 20 — Reference range comparison.
 *
 * Rules:
 * - Compare each extracted key value against lab_reference_ranges for same test_code
 * - Hospital-specific range preferred over system default (handled in repo)
 * - applicable_to filter: use pregnancy trimester context if available
 * - Assign flag: normal | low | high | critical
 * - Never generate diagnosis
 * - Critical values: return list for admin alert trigger
 *
 * @param {string} testCode
 * @param {object} extractedKeyValues - { Haemoglobin: { value: 9.2, unit: 'g/dL' }, ... }
 * @param {string} hospitalId
 * @param {object} context - { isPregnant, trimester } for applicable_to filter
 * @returns {{ annotated: object, criticalParameters: string[], abnormalParameters: string[] }}
 */
async function compareWithReferenceRanges(testCode, extractedKeyValues, hospitalId, context = {}) {
  if (!testCode || !extractedKeyValues) {
    return { annotated: extractedKeyValues || {}, criticalParameters: [], abnormalParameters: [] };
  }

  const ranges = await docReviewRepo.findReferenceRanges(testCode, hospitalId);

  const { isPregnant = false, trimester = null } = context;

  // Filter ranges by applicable_to for this patient context
  const applicableRanges = ranges.filter((r) => {
    switch (r.applicable_to) {
      case 'all': return true;
      case 'pregnant_only': return isPregnant;
      case 'trimester_1': return isPregnant && trimester === 'first';
      case 'trimester_2': return isPregnant && trimester === 'second';
      case 'trimester_3': return isPregnant && trimester === 'third';
      default: return true;
    }
  });

  // Build lookup by parameter_name (case-insensitive)
  const rangeByParam = {};
  for (const r of applicableRanges) {
    rangeByParam[r.parameter_name.toLowerCase()] = r;
  }

  const annotated = {};
  const criticalParameters = [];
  const abnormalParameters = [];

  for (const [paramName, entry] of Object.entries(extractedKeyValues)) {
    const numericValue = parseFloat(entry.value);
    const range = rangeByParam[paramName.toLowerCase()];

    let flag = 'manual'; // default if no range found

    if (range && !isNaN(numericValue)) {
      const { normal_min, normal_max, critical_low, critical_high } = range;

      // Critical check first (higher priority than low/high)
      const isCriticalLow = critical_low != null && numericValue < parseFloat(critical_low);
      const isCriticalHigh = critical_high != null && numericValue > parseFloat(critical_high);

      if (isCriticalLow || isCriticalHigh) {
        flag = 'critical';
        criticalParameters.push(paramName);
        abnormalParameters.push(paramName);
      } else if (normal_min != null && numericValue < parseFloat(normal_min)) {
        flag = 'low';
        abnormalParameters.push(paramName);
      } else if (normal_max != null && numericValue > parseFloat(normal_max)) {
        flag = 'high';
        abnormalParameters.push(paramName);
      } else {
        flag = 'normal';
      }
    }

    annotated[paramName] = {
      ...entry,
      flag,
      reference_range: range
        ? {
            normal_min: range.normal_min,
            normal_max: range.normal_max,
            critical_low: range.critical_low,
            critical_high: range.critical_high,
            unit: range.unit,
            applicable_to: range.applicable_to,
          }
        : null,
    };
  }

  return { annotated, criticalParameters, abnormalParameters };
}

// ─── Document access guard ────────────────────────────────────────────────────

async function assertDocumentAccess(id, hospitalId) {
  const doc = await docReviewRepo.findDocumentById(id, hospitalId);
  if (!doc) {
    const err = new Error('Document not found.');
    err.statusCode = 404;
    err.code = 'DOCUMENT_NOT_FOUND';
    throw err;
  }
  return doc;
}

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Review inbox — pending documents awaiting doctor review.
 */
async function getReviewInbox(queryParams, actor) {
  const { hospitalId } = actor;
  const { page, limit, sort_by: sortBy, sort_dir: sortDir, patient_id: patientId, document_type: documentType } = queryParams;
  return docReviewRepo.findReviewInbox(hospitalId, { page, limit, sortBy, sortDir, patientId, documentType });
}

/**
 * Get document metadata + generate pre-signed download URL.
 * Logs every access per architecture Part 10.1.
 */
async function getDocumentById(id, actor) {
  const { hospitalId, userId } = actor;
  const doc = await assertDocumentAccess(id, hospitalId);

  // Generate pre-signed URL (30-min TTL per architecture)
  const { downloadUrl: presignedUrl } = await generateDownloadUrl(doc.s3_key, hospitalId, id, userId, 'documents', 'patient_document');

  await auditLog({
    hospitalId,
    userId,
    action: 'DOCUMENT_ACCESSED',
    entityType: 'patient_documents',
    entityId: id,
    meta: { s3_key: doc.s3_key, document_type: doc.document_type },
  });

  return { ...doc, presigned_url: presignedUrl };
}

/**
 * Review a document.
 *
 * Workflow (architecture Part 20):
 * 1. Set review_status → reviewed
 * 2. Save review_notes and extracted_key_values
 * 3. Run reference range comparison on extracted values → annotate with flags
 * 4. Create test_result_reviews row
 * 5. If linked_test_order_id → mark order as reviewed
 * 6. Write activity_log
 */
async function reviewDocument(id, data, actor) {
  const { userId, hospitalId } = actor;
  const {
    review_summary,
    extracted_key_values,
    linked_test_order_id,
    linked_consultation_id,
    action_required,
    action_description,
  } = data;

  const doc = await assertDocumentAccess(id, hospitalId);

  // Fetch test_order to get test_code for reference range comparison
  let testCode = null;
  let pregnancyContext = {};

  const linkedOrderId = linked_test_order_id || doc.linked_test_order_id;

  if (linkedOrderId) {
    const testOrder = await docReviewRepo.findTestOrderById(linkedOrderId);
    if (testOrder) {
      const catalog = await db('test_catalog').where({ id: testOrder.test_catalog_id }).first();
      testCode = catalog?.test_code || null;

      // Fetch pregnancy context for applicable_to filter
      if (testOrder.pregnancy_id) {
        const pregnancy = await db('pregnancies').where({ id: testOrder.pregnancy_id }).first();
        if (pregnancy) {
          const { computePregnancyWeek, deriveTrimester } = require('../pregnancies/pregnancy.service');
          const week = computePregnancyWeek(pregnancy.lmp);
          pregnancyContext = { isPregnant: true, trimester: deriveTrimester(week) };
        }
      }
    }
  }

  // Run reference range comparison
  const { annotated, criticalParameters, abnormalParameters } = await compareWithReferenceRanges(
    testCode,
    extracted_key_values,
    hospitalId,
    pregnancyContext
  );

  const reviewedAt = new Date();

  await db.transaction(async (trx) => {
    // 1. Update patient_document
    await docReviewRepo.updateDocument(
      id,
      hospitalId,
      {
        review_status: REVIEW_STATUS.REVIEWED,
        reviewed_by: userId,
        reviewed_at: reviewedAt,
        review_notes: review_summary || null,
        extracted_key_values: annotated ? JSON.stringify(annotated) : null,
        abnormal_flag: abnormalParameters.length > 0,
      },
      trx
    );

    // 2. Create test_result_reviews row (architecture Part 20.5)
    await docReviewRepo.createTestResultReview(
      {
        document_id: id,
        test_order_id: linkedOrderId || null,
        patient_id: doc.patient_id,
        reviewed_by: userId,
        review_summary: review_summary || null,
        action_required: action_required || false,
        action_description: action_description || null,
        linked_consultation_id: linked_consultation_id || null,
        abnormal_parameters: abnormalParameters.length > 0
          ? JSON.stringify(abnormalParameters)
          : JSON.stringify([]),
      },
      trx
    );

    // 3. Mark linked test order as reviewed
    if (linkedOrderId) {
      await docReviewRepo.updateTestOrderStatus(
        linkedOrderId,
        TEST_ORDER_STATUS.REVIEWED,
        { reviewed_at: reviewedAt, reviewed_by: userId },
        trx
      );
    }
  });

  await auditLog({
    hospitalId,
    userId,
    action: 'DOCUMENT_REVIEWED',
    entityType: 'patient_documents',
    entityId: id,
    meta: {
      test_order_id: linkedOrderId,
      abnormal_parameters: abnormalParameters,
      critical_parameters: criticalParameters,
      action_required,
    },
  });

  logger.info(`Document reviewed: ${id}. Abnormal params: ${abnormalParameters.length}. Critical: ${criticalParameters.length}`);
  return docReviewRepo.findDocumentById(id, hospitalId);
}

/**
 * Flag a document as abnormal/urgent.
 *
 * Abnormal chain (architecture Part 20.4 and Part 5.4):
 * activity_log → notification (admin in-app alert) → override_log
 *
 * Critical flag → immediate admin notification.
 */
async function flagDocument(id, data, actor) {
  const { userId, hospitalId } = actor;
  const { flag_level, flag_reason, override_note } = data;

  const doc = await assertDocumentAccess(id, hospitalId);

  const flaggedAt = new Date();

  await db.transaction(async (trx) => {
    // 1. Update document with flag
    await docReviewRepo.updateDocument(
      id,
      hospitalId,
      {
        review_status: REVIEW_STATUS.FLAGGED,
        flagged_level: flag_level,
        flag_reason,
        abnormal_flag: true,
        reviewed_by: userId,
        reviewed_at: flaggedAt,
      },
      trx
    );

    // 2. Insert admin notification (in-app alert)
    await docReviewRepo.insertNotification(
      {
        hospital_id: hospitalId,
        patient_id: doc.patient_id,
        event_type: flag_level === FLAG_LEVEL.CRITICAL
          ? 'DOCUMENT_CRITICAL_FLAG'
          : 'DOCUMENT_ABNORMAL_FLAG',
        meta: JSON.stringify({
          document_id: id,
          document_type: doc.document_type,
          patient_id: doc.patient_id,
          flag_level,
          flag_reason,
          flagged_by: userId,
        }),
        error_message: null,
      },
      trx
    );

    // 3. Override log (architecture Part 11.1 — abnormal escalation)
    await docReviewRepo.insertOverrideLog(
      {
        hospital_id: hospitalId,
        user_id: userId,
        entity_type: 'patient_documents',
        entity_id: id,
        field_changed: 'flag_level',
        old_value: doc.flagged_level || 'none',
        new_value: flag_level,
        override_reason: flag_reason,
        override_note: override_note || null,
      },
      trx
    );
  });

  await auditLog({
    hospitalId,
    userId,
    action: 'DOCUMENT_FLAGGED',
    entityType: 'patient_documents',
    entityId: id,
    meta: { flag_level, flag_reason, patient_id: doc.patient_id },
  });

  logger.info(`Document flagged: ${id} as ${flag_level} by user ${userId}`);
  return docReviewRepo.findDocumentById(id, hospitalId);
}

/**
 * Soft delete a document (admin only).
 * S3 object is NEVER deleted in MVP.
 * Sets is_deleted = true, stores deleted_by, deleted_reason, deleted_at.
 */
async function softDeleteDocument(id, data, actor) {
  const { userId, hospitalId } = actor;
  const { delete_reason } = data;

  const doc = await assertDocumentAccess(id, hospitalId);

  await docReviewRepo.updateDocument(id, hospitalId, {
    is_deleted: true,
    deleted_by: userId,
    deleted_reason: delete_reason,
    deleted_at: new Date(),
  });

  await auditLog({
    hospitalId,
    userId,
    action: 'DOCUMENT_SOFT_DELETED',
    entityType: 'patient_documents',
    entityId: id,
    meta: { delete_reason, patient_id: doc.patient_id, document_type: doc.document_type },
  });

  logger.info(`Document soft deleted: ${id} by user ${userId}`);
  return { id, is_deleted: true };
}

module.exports = {
  getReviewInbox,
  getDocumentById,
  reviewDocument,
  flagDocument,
  softDeleteDocument,
  compareWithReferenceRanges, // exported for protocol-driven test rules in Batch 5+
};
