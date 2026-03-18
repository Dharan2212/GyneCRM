'use strict';

const { db } = require('../../db/connection');
const prescriptionRepo = require('./prescription.repository');
const { dispatchEvent } = require('../../events/dispatch-event');
const EVENT_TYPES = require('../../events/event-types');
const { generatePrescriptionPdf } = require('../../utils/pdfGenerator.prescription');
const { uploadBufferToS3, generateDownloadUrl } = require('../../utils/s3-helper');
const { auditLog } = require('../../middleware/audit-logger.middleware');
const logger = require('../../utils/logger');
const { PRESCRIPTION_STATUS } = require('../../validators/prescription.validator');

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Ensure the prescription exists and belongs to the actor's hospital.
 * Returns the prescription row or throws a scoped 404.
 */
async function assertPrescriptionExists(id, hospitalId) {
  const prescription = await prescriptionRepo.findById(id, hospitalId);
  if (!prescription) {
    const err = new Error('Prescription not found.');
    err.statusCode = 404;
    err.code = 'PRESCRIPTION_NOT_FOUND';
    throw err;
  }
  return prescription;
}

/**
 * Ensure the prescription is in DRAFT state.
 * Throws 422 if it has been issued or voided.
 */
function assertDraftState(prescription) {
  if (prescription.status !== PRESCRIPTION_STATUS.DRAFT) {
    const err = new Error(
      `Prescription is '${prescription.status}'. Only draft prescriptions can be modified.`
    );
    err.statusCode = 422;
    err.code = 'PRESCRIPTION_NOT_DRAFT';
    throw err;
  }
}

/**
 * Ensure the prescription is in ISSUED state.
 * Used for void operation.
 */
function assertIssuedState(prescription) {
  if (prescription.status !== PRESCRIPTION_STATUS.ISSUED) {
    const err = new Error(
      `Prescription is '${prescription.status}'. Only issued prescriptions can be voided.`
    );
    err.statusCode = 422;
    err.code = 'PRESCRIPTION_NOT_ISSUED';
    throw err;
  }
}

/**
 * Ensure the prescription is VOIDED.
 * Used to enforce: only voided prescriptions can be reissued.
 */
function assertVoidedState(prescription) {
  if (prescription.status !== PRESCRIPTION_STATUS.VOID) {
    const err = new Error(
      `Only voided prescriptions can be reissued. Current status: '${prescription.status}'.`
    );
    err.statusCode = 422;
    err.code = 'PRESCRIPTION_NOT_VOID';
    throw err;
  }
}

/**
 * Build the S3 key for a prescription PDF.
 */
function buildPrescriptionS3Key(hospitalId, patientId, prescriptionId) {
  return `prescriptions/${hospitalId}/${patientId}/${prescriptionId}/prescription.pdf`;
}

/**
 * Generate, upload prescription PDF to S3, store the S3 key on the
 * prescription record, and insert a patient_documents entry for audit trail.
 *
 * Returns the updated prescription row with pdf_url populated.
 */
async function generateAndStorePdf(prescription, actor, trx) {
  const { hospitalId, userId } = actor;

  // Gather all related data for PDF generation
  const [patient, doctor, hospital, items] = await Promise.all([
    prescriptionRepo.findPatientById(prescription.patient_id, hospitalId),
    prescriptionRepo.findDoctorWithUser(prescription.doctor_id),
    db('hospitals').where({ id: hospitalId }).first(),
    prescriptionRepo.findItemsByPrescriptionId(prescription.id),
  ]);

  const pdfBuffer = await generatePrescriptionPdf({
    prescription,
    patient,
    doctor,
    hospital,
    items,
  });

  const s3Key = buildPrescriptionS3Key(hospitalId, prescription.patient_id, prescription.id);

  await uploadBufferToS3(s3Key, pdfBuffer, 'application/pdf');

  // Persist pdf_url (S3 key) on the prescription record
  const updated = await prescriptionRepo.update(
    prescription.id,
    hospitalId,
    { pdf_url: s3Key },
    trx
  );

  // Insert patient_documents record for document traceability (Part 10.4)
  await prescriptionRepo.insertPatientDocument(
    {
      patient_id: prescription.patient_id,
      hospital_id: hospitalId,
      uploaded_by: userId,
      file_name: `prescription_${prescription.id}.pdf`,
      s3_key: s3Key,
      mime_type: 'application/pdf',
      file_size_bytes: pdfBuffer.length,
      document_type: 'prescription_pdf',
      linked_test_order_id: null,
      extracted_key_values: null,
    },
    trx
  );

  return updated;
}

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Create a new prescription draft linked to a consultation.
 *
 * Rules:
 * - consultation must exist and belong to the hospital
 * - consultation.patient_id becomes the prescription's patient_id
 * - consultation.doctor_id becomes the prescription's doctor_id
 * - only one active (draft/issued) prescription per consultation allowed
 */
async function createPrescription(data, actor) {
  const { consultation_id, notes } = data;
  const { userId, hospitalId } = actor;

  // 1. Validate consultation belongs to this hospital
  const consultation = await prescriptionRepo.findConsultationById(consultation_id, hospitalId);
  if (!consultation) {
    const err = new Error('Consultation not found.');
    err.statusCode = 404;
    err.code = 'CONSULTATION_NOT_FOUND';
    throw err;
  }

  // 2. Guard: only one active prescription per consultation
  const existingActive = await prescriptionRepo.findActiveByConsultationId(
    consultation_id,
    hospitalId
  );
  if (existingActive) {
    const err = new Error(
      `An active prescription (status: ${existingActive.status}) already exists for this consultation. ` +
        'Void the existing prescription before creating a new one.'
    );
    err.statusCode = 409;
    err.code = 'PRESCRIPTION_ALREADY_EXISTS';
    throw err;
  }

  const prescription = await prescriptionRepo.create({
    consultation_id,
    patient_id: consultation.patient_id,
    doctor_id: consultation.doctor_id,
    hospital_id: hospitalId,
    status: PRESCRIPTION_STATUS.DRAFT,
    notes: notes || null,
    pdf_url: null,
    issued_at: null,
    voided_at: null,
    void_reason: null,
    reissued_from_id: null,
    created_by: userId,
  });

  await auditLog({
    hospitalId,
    userId,
    action: 'PRESCRIPTION_CREATED',
    entityType: 'prescription',
    entityId: prescription.id,
    meta: { consultation_id, patient_id: consultation.patient_id },
  });

  logger.info(`Prescription draft created: ${prescription.id}`);
  return prescriptionRepo.findByIdWithItems(prescription.id, hospitalId);
}

/**
 * Get a prescription with all its items.
 */
async function getPrescriptionById(id, actor) {
  const { hospitalId } = actor;

  const prescription = await prescriptionRepo.findByIdWithItems(id, hospitalId);
  if (!prescription) {
    const err = new Error('Prescription not found.');
    err.statusCode = 404;
    err.code = 'PRESCRIPTION_NOT_FOUND';
    throw err;
  }
  return prescription;
}

/**
 * Update prescription-level fields (notes) while in draft state.
 */
async function updatePrescription(id, data, actor) {
  const { userId, hospitalId } = actor;

  const prescription = await assertPrescriptionExists(id, hospitalId);
  assertDraftState(prescription);

  const updated = await prescriptionRepo.update(id, hospitalId, data);

  await auditLog({
    hospitalId,
    userId,
    action: 'PRESCRIPTION_UPDATED',
    entityType: 'prescription',
    entityId: id,
    meta: { updated_fields: Object.keys(data) },
  });

  return prescriptionRepo.findByIdWithItems(id, hospitalId);
}

/**
 * Add a medicine line item to a draft prescription.
 */
async function addItem(prescriptionId, data, actor) {
  const { userId, hospitalId } = actor;

  const prescription = await assertPrescriptionExists(prescriptionId, hospitalId);
  assertDraftState(prescription);

  const item = await prescriptionRepo.createItem({
    prescription_id: prescriptionId,
    ...data,
  });

  await auditLog({
    hospitalId,
    userId,
    action: 'PRESCRIPTION_UPDATED',
    entityType: 'prescription',
    entityId: prescriptionId,
    meta: { action: 'item_added', item_id: item.id, medicine_name: data.medicine_name },
  });

  return item;
}

/**
 * Update an existing item on a draft prescription.
 */
async function updateItem(prescriptionId, itemId, data, actor) {
  const { userId, hospitalId } = actor;

  const prescription = await assertPrescriptionExists(prescriptionId, hospitalId);
  assertDraftState(prescription);

  const item = await prescriptionRepo.findItemById(itemId, prescriptionId);
  if (!item) {
    const err = new Error('Prescription item not found.');
    err.statusCode = 404;
    err.code = 'PRESCRIPTION_ITEM_NOT_FOUND';
    throw err;
  }

  const updated = await prescriptionRepo.updateItem(itemId, prescriptionId, data);

  await auditLog({
    hospitalId,
    userId,
    action: 'PRESCRIPTION_UPDATED',
    entityType: 'prescription',
    entityId: prescriptionId,
    meta: { action: 'item_updated', item_id: itemId },
  });

  return updated;
}

/**
 * Remove an item from a draft prescription.
 * Only allowed in draft state — items become immutable once prescription is issued.
 */
async function deleteItem(prescriptionId, itemId, actor) {
  const { userId, hospitalId } = actor;

  const prescription = await assertPrescriptionExists(prescriptionId, hospitalId);
  assertDraftState(prescription);

  const item = await prescriptionRepo.findItemById(itemId, prescriptionId);
  if (!item) {
    const err = new Error('Prescription item not found.');
    err.statusCode = 404;
    err.code = 'PRESCRIPTION_ITEM_NOT_FOUND';
    throw err;
  }

  await prescriptionRepo.deleteItem(itemId, prescriptionId);

  await auditLog({
    hospitalId,
    userId,
    action: 'PRESCRIPTION_UPDATED',
    entityType: 'prescription',
    entityId: prescriptionId,
    meta: { action: 'item_deleted', item_id: itemId, medicine_name: item.medicine_name },
  });

  return { deleted: true, item_id: itemId };
}

/**
 * Issue a prescription:
 * - Validates draft state
 * - Validates at least one item exists
 * - Generates PDF and uploads to S3
 * - Sets status = issued, issued_at = NOW()
 * - Dispatches PRESCRIPTION_ISSUED event
 * - All in one transaction
 */
async function issuePrescription(id, actor) {
  const { userId, hospitalId } = actor;

  const prescription = await assertPrescriptionExists(id, hospitalId);
  assertDraftState(prescription);

  // Guard: prescription must have at least one item before issuing
  const itemCount = await prescriptionRepo.countItems(id);
  if (itemCount === 0) {
    const err = new Error(
      'Cannot issue a prescription with no medicine items. Add at least one item first.'
    );
    err.statusCode = 422;
    err.code = 'PRESCRIPTION_NO_ITEMS';
    throw err;
  }

  const issuedAt = new Date();

  // Run issue state transition + PDF upload + patient_documents insert in one transaction
  const issued = await db.transaction(async (trx) => {
    // First set status to issued
    const updated = await prescriptionRepo.update(
      id,
      hospitalId,
      {
        status: PRESCRIPTION_STATUS.ISSUED,
        issued_at: issuedAt,
      },
      trx
    );

    // Generate PDF and store S3 key (also updates prescription.pdf_url within trx)
    await generateAndStorePdf(updated, actor, trx);

    return updated;
  });

  // Re-fetch to return complete record with pdf_url populated
  const finalRecord = await prescriptionRepo.findByIdWithItems(id, hospitalId);

  await auditLog({
    hospitalId,
    userId,
    action: 'PRESCRIPTION_ISSUED',
    entityType: 'prescription',
    entityId: id,
    meta: { issued_at: issuedAt.toISOString(), item_count: itemCount },
  });

  // Dispatch PRESCRIPTION_ISSUED event to N8N — fire and forget
  dispatchEvent(
    EVENT_TYPES.PRESCRIPTION_ISSUED,
    {
      event_version: 1,
      prescription_id: id,
      consultation_id: prescription.consultation_id,
      patient_id: prescription.patient_id,
      doctor_id: prescription.doctor_id,
      issued_at: issuedAt.toISOString(),
    },
    hospitalId
  ).catch((err) => {
    logger.error(`Failed to dispatch PRESCRIPTION_ISSUED event for ${id}: ${err.message}`);
  });

  logger.info(`Prescription issued: ${id} with ${itemCount} items`);
  return finalRecord;
}

/**
 * Void an issued prescription with a mandatory reason.
 *
 * Rules:
 * - Only issued prescriptions can be voided
 * - void_reason is required (validated by Joi before this function)
 * - Record is preserved — no hard delete
 * - Sets status = void, voided_at = NOW(), void_reason stored
 */
async function voidPrescription(id, data, actor) {
  const { userId, hospitalId } = actor;
  const { void_reason } = data;

  const prescription = await assertPrescriptionExists(id, hospitalId);
  assertIssuedState(prescription);

  const voidedAt = new Date();

  const updated = await prescriptionRepo.update(id, hospitalId, {
    status: PRESCRIPTION_STATUS.VOID,
    voided_at: voidedAt,
    void_reason,
    voided_by: userId,
  });

  await auditLog({
    hospitalId,
    userId,
    action: 'PRESCRIPTION_VOIDED',
    entityType: 'prescription',
    entityId: id,
    meta: { void_reason, voided_at: voidedAt.toISOString() },
  });

  logger.info(`Prescription voided: ${id} by user ${userId}`);
  return prescriptionRepo.findByIdWithItems(id, hospitalId);
}

/**
 * Reissue a voided prescription — creates a new draft prescription that
 * references the voided original via reissued_from_id.
 *
 * Rules:
 * - Only voided prescriptions can be reissued
 * - New prescription is created in DRAFT state (items added separately)
 * - reissued_from_id links back to the original voided prescription
 * - Original prescription record is fully preserved
 * - Same consultation, patient, doctor linkage is inherited
 */
async function reissuePrescription(id, data, actor) {
  const { userId, hospitalId } = actor;
  const { notes } = data;

  const original = await assertPrescriptionExists(id, hospitalId);
  assertVoidedState(original);

  // Create the new replacement prescription in draft state
  const reissued = await prescriptionRepo.create({
    consultation_id: original.consultation_id,
    patient_id: original.patient_id,
    doctor_id: original.doctor_id,
    hospital_id: hospitalId,
    status: PRESCRIPTION_STATUS.DRAFT,
    notes: notes !== undefined ? notes : original.notes,
    pdf_url: null,
    issued_at: null,
    voided_at: null,
    void_reason: null,
    reissued_from_id: id, // Links to the original voided prescription
    created_by: userId,
  });

  await auditLog({
    hospitalId,
    userId,
    action: 'PRESCRIPTION_REISSUED',
    entityType: 'prescription',
    entityId: reissued.id,
    meta: {
      original_prescription_id: id,
      consultation_id: original.consultation_id,
      patient_id: original.patient_id,
    },
  });

  logger.info(`Prescription reissued: new=${reissued.id}, original=${id}`);
  return prescriptionRepo.findByIdWithItems(reissued.id, hospitalId);
}

/**
 * Generate a pre-signed download URL for a prescription PDF.
 *
 * Rules (Part 10.3):
 * - Doctor and admin: full access
 * - Receptionist: can view/download (confirmed by Part 10.3)
 * - If PDF not yet generated (prescription not issued), return 422
 * - Every access is audit logged
 */
async function getPrescriptionPdf(id, actor) {
  const { hospitalId, userId } = actor;

  const prescription = await assertPrescriptionExists(id, hospitalId);

  if (!prescription.pdf_url) {
    const err = new Error(
      'PDF is not available. The prescription must be issued before a PDF can be downloaded.'
    );
    err.statusCode = 422;
    err.code = 'PRESCRIPTION_PDF_NOT_READY';
    throw err;
  }

  const { downloadUrl: presignedUrl } = await generateDownloadUrl(prescription.pdf_url, hospitalId, id, userId, 'prescriptions', 'prescription');

  await auditLog({
    hospitalId,
    userId,
    action: 'PRESCRIPTION_PDF_ACCESSED',
    entityType: 'prescription',
    entityId: id,
    meta: { s3_key: prescription.pdf_url },
  });

  return {
    prescription_id: id,
    pdf_url: presignedUrl,
    print_token: null, // Future scope: print token generation
    expires_in_seconds: 1800,
    expires_at: new Date(Date.now() + 1800 * 1000).toISOString(),
  };
}

/**
 * Paginated list of prescriptions for a patient.
 */
async function listPatientPrescriptions(patientId, queryParams, actor) {
  const { hospitalId } = actor;

  const patient = await prescriptionRepo.findPatientById(patientId, hospitalId);
  if (!patient) {
    const err = new Error('Patient not found.');
    err.statusCode = 404;
    err.code = 'PATIENT_NOT_FOUND';
    throw err;
  }

  const { page, limit, sort_by: sortBy, sort_dir: sortDir, status } = queryParams;

  return prescriptionRepo.findAllByPatient(patientId, hospitalId, {
    page,
    limit,
    sortBy,
    sortDir,
    status,
  });
}

module.exports = {
  createPrescription,
  getPrescriptionById,
  updatePrescription,
  addItem,
  updateItem,
  deleteItem,
  issuePrescription,
  voidPrescription,
  reissuePrescription,
  getPrescriptionPdf,
  listPatientPrescriptions,
};
