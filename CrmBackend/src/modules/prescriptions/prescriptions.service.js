const Prescription = require('../../models/Prescription');
const Consultation = require('../../models/Consultation');
const Patient = require('../../models/Patient');
const Doctor = require('../../models/Doctor');
const Appointment = require('../../models/Appointment');
const HTTP_STATUS = require('../../constants/http-status');
const AppError = require('../../utils/app-error');
const { assertObjectId } = require('../../utils/object-id');
const {
  DETAIL_POPULATE,
  normalizePrescriptionPayload,
  buildPrescriptionResponse,
  resolveHospitalId,
} = require('./prescriptions.query');
const { buildPrescriptionPdfPayload } = require('./prescriptions.pdf');
const { applySendState } = require('./prescriptions.send');
const { createSendHistoryEntries } = require('../send-history/send-history.logging');

async function ensureScopedReference(Model, id, hospitalId, label) {
  assertObjectId(id, label);

  const filter = {
    _id: id,
    hospital_id: hospitalId,
  };

  if (Model === Patient) {
    filter.is_deleted = false;
  }

  const record = await Model.findOne(filter)
    .select('_id hospital_id patient_id doctor_id consultation_id appointment_id')
    .lean();

  if (!record) {
    throw new AppError(`${label} not found.`, HTTP_STATUS.NOT_FOUND);
  }

  return record;
}

function hasIssuableItems(items = []) {
  return Array.isArray(items) && items.some((item) => item && item.medicine_name && String(item.medicine_name).trim().length > 0);
}

async function getPrescriptionDetailById(id, hospitalId) {
  assertObjectId(id, 'prescription id');

  const prescription = await Prescription.findOne({
    _id: id,
    hospital_id: hospitalId,
  })
    .populate(DETAIL_POPULATE)
    .lean();

  if (!prescription) {
    throw new AppError('Prescription not found.', HTTP_STATUS.NOT_FOUND);
  }

  return buildPrescriptionResponse(prescription);
}

async function createPrescription(payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(payload.hospital_id, currentUser);
  const actorId = currentUser.id;

  if (!actorId) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(actorId, 'created_by');

  const [patient, doctor, consultation] = await Promise.all([
    ensureScopedReference(Patient, payload.patient_id, hospitalId, 'patient_id'),
    ensureScopedReference(Doctor, payload.doctor_id, hospitalId, 'doctor_id'),
    ensureScopedReference(Consultation, payload.consultation_id, hospitalId, 'consultation_id'),
  ]);

  if (String(consultation.patient_id) !== String(patient._id)) {
    throw new AppError('consultation_id does not belong to the provided patient_id.', HTTP_STATUS.CONFLICT);
  }

  if (String(consultation.doctor_id) !== String(doctor._id)) {
    throw new AppError('consultation_id does not belong to the provided doctor_id.', HTTP_STATUS.CONFLICT);
  }

  if (payload.appointment_id) {
    const appointment = await ensureScopedReference(Appointment, payload.appointment_id, hospitalId, 'appointment_id');

    if (String(appointment.patient_id) !== String(patient._id)) {
      throw new AppError('appointment_id does not belong to the provided patient_id.', HTTP_STATUS.CONFLICT);
    }

    if (String(appointment.doctor_id) !== String(doctor._id)) {
      throw new AppError('appointment_id does not belong to the provided doctor_id.', HTTP_STATUS.CONFLICT);
    }
  }

  const normalized = normalizePrescriptionPayload(payload);

  const prescription = await Prescription.create({
    hospital_id: hospitalId,
    patient_id: normalized.patient_id,
    doctor_id: normalized.doctor_id,
    consultation_id: normalized.consultation_id,
    appointment_id: normalized.appointment_id || consultation.appointment_id || null,
    prescription_date: normalized.prescription_date || new Date(),
    diagnosis_summary: normalized.diagnosis_summary || null,
    advice_notes: normalized.advice_notes || null,
    general_instructions: normalized.general_instructions || null,
    items: normalized.items || [],
    issue_status: 'draft',
    void_status: false,
    send_status: 'not_sent',
    send_channels: [],
    created_by: actorId,
    updated_by: actorId,
    is_active: true,
  });

 return getPrescriptionDetailById(String(prescription._id), hospitalId);
}

async function getPrescriptionDetail(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  return getPrescriptionDetailById(id, hospitalId);
}

async function issuePrescription(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;

  if (!actorId) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(actorId, 'issued_by');

  const prescription = await Prescription.findOne({
    _id: id,
    hospital_id: hospitalId,
  });

  if (!prescription) {
    throw new AppError('Prescription not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (prescription.void_status) {
    throw new AppError('Voided prescriptions cannot be issued.', HTTP_STATUS.CONFLICT);
  }

  if (prescription.issue_status === 'issued') {
    throw new AppError('Prescription is already issued.', HTTP_STATUS.CONFLICT);
  }

  if (!hasIssuableItems(prescription.items)) {
    throw new AppError('At least one valid prescription item is required before issue.', HTTP_STATUS.BAD_REQUEST);
  }

  prescription.issue_status = 'issued';
  prescription.issued_at = new Date();
  prescription.issued_by = actorId;
  prescription.updated_by = actorId;

  await prescription.save();
  return getPrescriptionDetailById(String(prescription._id), hospitalId);
}

async function voidPrescription(id, payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;

  if (!actorId) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(actorId, 'voided_by');

  const prescription = await Prescription.findOne({
    _id: id,
    hospital_id: hospitalId,
  });

  if (!prescription) {
    throw new AppError('Prescription not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (prescription.void_status) {
    throw new AppError('Prescription is already voided.', HTTP_STATUS.CONFLICT);
  }

  prescription.void_status = true;
  prescription.voided_at = new Date();
  prescription.voided_by = actorId;
  prescription.void_reason = String(payload.void_reason).trim();
  prescription.updated_by = actorId;
  prescription.is_active = false;

  await prescription.save();
  return getPrescriptionDetailById(String(prescription._id), hospitalId);
}

async function getPrescriptionPdf(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const prescription = await Prescription.findOne({
    _id: id,
    hospital_id: hospitalId,
  })
    .populate(DETAIL_POPULATE)
    .lean();

  if (!prescription) {
    throw new AppError('Prescription not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (prescription.void_status) {
    throw new AppError('Voided prescriptions do not have PDF output.', HTTP_STATUS.CONFLICT);
  }

  if (prescription.issue_status !== 'issued') {
    throw new AppError('Only issued prescriptions can be viewed in the PDF endpoint.', HTTP_STATUS.CONFLICT);
  }

  return buildPrescriptionPdfPayload(buildPrescriptionResponse(prescription));
}

async function sendPrescription(id, payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;

  if (!actorId) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(actorId, 'sent_by');

  const prescription = await Prescription.findOne({
    _id: id,
    hospital_id: hospitalId,
  });

  if (!prescription) {
    throw new AppError('Prescription not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (prescription.void_status) {
    throw new AppError('Voided prescriptions cannot be sent.', HTTP_STATUS.CONFLICT);
  }

  if (prescription.issue_status !== 'issued') {
    throw new AppError('Only issued prescriptions can be sent.', HTTP_STATUS.CONFLICT);
  }

  applySendState(prescription, payload, actorId);
  prescription.updated_by = actorId;
  await prescription.save();

  await createSendHistoryEntries({
    hospital_id: prescription.hospital_id,
    patient_id: prescription.patient_id,
    doctor_id: prescription.doctor_id,
    source_type: 'prescription',
    source_id: prescription._id,
    source_number: prescription.prescription_number || null,
    channels: payload.send_channels || [],
    subject: 'Prescription shared',
    message_summary: payload.send_notes || 'Prescription send action completed.',
    payload_snapshot: {
      send_channels: payload.send_channels || [],
      send_status: prescription.send_status,
    },
    status: 'sent',
    initiated_by: actorId,
    metadata: {
      issue_status: prescription.issue_status,
      void_status: prescription.void_status,
    },
  });

  return getPrescriptionDetailById(String(prescription._id), hospitalId);
}

module.exports = {
  createPrescription,
  getPrescriptionDetail,
  issuePrescription,
  voidPrescription,
  getPrescriptionPdf,
  sendPrescription,
};
