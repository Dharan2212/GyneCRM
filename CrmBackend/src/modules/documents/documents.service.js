const PatientDocument = require('../../models/PatientDocument');
const TestOrder = require('../../models/TestOrder');
const Patient = require('../../models/Patient');
const Doctor = require('../../models/Doctor');
const Consultation = require('../../models/Consultation');
const Prescription = require('../../models/Prescription');
const Appointment = require('../../models/Appointment');
const HTTP_STATUS = require('../../constants/http-status');
const AppError = require('../../utils/app-error');
const { assertObjectId } = require('../../utils/object-id');
const { resolveHospitalId, buildDocumentResponse } = require('./documents.query');
const { buildUploadUrlFoundation } = require('./documents.upload');
const { validateUploadDescriptor } = require('../../middleware/upload-config');

const DETAIL_POPULATE = [
  { path: 'patient_id', select: '_id full_name patient_code category' },
  { path: 'doctor_id', select: '_id full_name speciality' },
  { path: 'consultation_id', select: '_id status chief_complaint' },
  { path: 'prescription_id', select: '_id prescription_date issue_status void_status' },
  { path: 'appointment_id', select: '_id scheduled_at status visit_type' },
  { path: 'test_order_id', select: '_id status priority abnormal_flag review_requested_at reviewed_at sent_at' },
];

async function ensureScopedReference(Model, id, hospitalId, label) {
  if (!id) {
    return null;
  }

  assertObjectId(id, label);

  const filter = {
    _id: id,
    hospital_id: hospitalId,
  };

  if (Model === Patient) {
    filter.is_deleted = false;
  }

  const record = await Model.findOne(filter)
    .select('_id hospital_id patient_id doctor_id consultation_id appointment_id status')
    .lean();

  if (!record) {
    throw new AppError(`${label} not found.`, HTTP_STATUS.NOT_FOUND);
  }

  return record;
}

async function getDocumentDetailById(id, hospitalId) {
  assertObjectId(id, 'document id');

  const document = await PatientDocument.findOne({ _id: id, hospital_id: hospitalId })
    .populate(DETAIL_POPULATE)
    .lean();

  if (!document) {
    throw new AppError('Patient document not found.', HTTP_STATUS.NOT_FOUND);
  }

  return buildDocumentResponse(document);
}

async function getUploadUrlFoundation(payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(payload.hospital_id, currentUser);

  validateUploadDescriptor(payload);

  if (payload.test_order_id) {
    await ensureScopedReference(TestOrder, payload.test_order_id, hospitalId, 'test_order_id');
  }

  return buildUploadUrlFoundation(payload, hospitalId);
}

async function createDocument(payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(payload.hospital_id, currentUser);
  const actorId = currentUser.id;

  if (!actorId) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(actorId, 'created_by');

  if (payload.mime_type || payload.file_size_bytes !== undefined) {
    validateUploadDescriptor({
      mime_type: payload.mime_type || 'application/pdf',
      file_size_bytes: payload.file_size_bytes ?? 0,
    });
  }

  const [patient, doctor, consultation, prescription, appointment, testOrder] = await Promise.all([
    ensureScopedReference(Patient, payload.patient_id, hospitalId, 'patient_id'),
    ensureScopedReference(Doctor, payload.doctor_id, hospitalId, 'doctor_id'),
    ensureScopedReference(Consultation, payload.consultation_id, hospitalId, 'consultation_id'),
    ensureScopedReference(Prescription, payload.prescription_id, hospitalId, 'prescription_id'),
    ensureScopedReference(Appointment, payload.appointment_id, hospitalId, 'appointment_id'),
    ensureScopedReference(TestOrder, payload.test_order_id, hospitalId, 'test_order_id'),
  ]);

  if (doctor && testOrder && String(testOrder.doctor_id) !== String(doctor._id)) {
    throw new AppError('test_order_id does not belong to the provided doctor_id.', HTTP_STATUS.CONFLICT);
  }

  if (consultation && String(consultation.patient_id) !== String(patient._id)) {
    throw new AppError('consultation_id does not belong to the provided patient_id.', HTTP_STATUS.CONFLICT);
  }

  if (testOrder && String(testOrder.patient_id) !== String(patient._id)) {
    throw new AppError('test_order_id does not belong to the provided patient_id.', HTTP_STATUS.CONFLICT);
  }

  const isTestResult = payload.document_type === 'test_result' || Boolean(payload.test_order_id);
  const uploadStatus = payload.upload_status || (payload.storage_key || payload.uploaded_at ? 'uploaded' : 'pending');
  const sendStatus = payload.send_status || 'not_sent';

  const document = await PatientDocument.create({
    hospital_id: hospitalId,
    patient_id: payload.patient_id,
    doctor_id: payload.doctor_id || (testOrder ? testOrder.doctor_id : null) || null,
    consultation_id: payload.consultation_id || (testOrder ? testOrder.consultation_id : null) || null,
    prescription_id: payload.prescription_id || null,
    appointment_id: payload.appointment_id || (testOrder ? testOrder.appointment_id : null) || null,
    test_order_id: payload.test_order_id || null,
    document_type: payload.document_type,
    category: payload.category,
    title: payload.title,
    description: payload.description || null,
    tags: payload.tags || [],
    status: payload.status || 'active',
    upload_status: uploadStatus,
    send_status: sendStatus,
    storage_provider: payload.storage_provider || null,
    storage_bucket: payload.storage_bucket || null,
    storage_key: payload.storage_key || null,
    original_file_name: payload.original_file_name || null,
    stored_file_name: payload.stored_file_name || null,
    mime_type: payload.mime_type || null,
    file_extension: payload.file_extension || null,
    file_size_bytes: payload.file_size_bytes ?? null,
    checksum: payload.checksum || null,
    uploaded_at: payload.uploaded_at || (uploadStatus === 'uploaded' ? new Date() : null),
    uploaded_by: uploadStatus === 'uploaded' ? actorId : null,
    clinical_summary: payload.clinical_summary || null,
    doctor_review: {
      review_required: isTestResult,
      review_status: isTestResult ? 'pending' : 'not_required',
      review_requested_at: isTestResult ? new Date() : null,
      review_requested_by: isTestResult ? actorId : null,
      abnormal_flag: false,
      findings_summary: null,
      remarks: null,
      action_required: false,
    },
    created_by: actorId,
    updated_by: actorId,
    is_active: true,
  });

  return getDocumentDetailById(String(document._id), hospitalId);
}



async function listReviewInbox(query = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const filter = { hospital_id: hospitalId, is_active: true, 'doctor_review.review_required': true };
  filter['doctor_review.review_status'] = query.review_status || 'pending';
  if (query.doctor_id) filter.doctor_id = query.doctor_id;
  if (query.patient_id) filter.patient_id = query.patient_id;
  if (query.abnormal_flag !== undefined) filter['doctor_review.abnormal_flag'] = query.abnormal_flag;

  const [docs, total] = await Promise.all([
    PatientDocument.find(filter).populate(DETAIL_POPULATE).sort({ uploaded_at: -1, createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    PatientDocument.countDocuments(filter),
  ]);

  return {
    items: docs.map(buildDocumentResponse),
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) || 1 },
  };
}

async function reviewDocument(id, payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;
  const document = await PatientDocument.findOne({ _id: id, hospital_id: hospitalId, is_active: true });
  if (!document) throw new AppError('Patient document not found.', HTTP_STATUS.NOT_FOUND);

  document.doctor_review = {
    ...(document.doctor_review?.toObject ? document.doctor_review.toObject() : document.doctor_review || {}),
    review_required: true,
    review_status: 'reviewed',
    reviewed_at: new Date(),
    reviewed_by: actorId || null,
    abnormal_flag: payload.abnormal_flag ?? document.doctor_review?.abnormal_flag ?? false,
    findings_summary: payload.findings_summary || null,
    remarks: payload.remarks || null,
    action_required: payload.action_required ?? false,
  };
  document.updated_by = actorId || null;
  await document.save();

  return getDocumentDetailById(String(document._id), hospitalId);
}

async function flagDocument(id, payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;
  const document = await PatientDocument.findOne({ _id: id, hospital_id: hospitalId, is_active: true });
  if (!document) throw new AppError('Patient document not found.', HTTP_STATUS.NOT_FOUND);

  document.doctor_review = {
    ...(document.doctor_review?.toObject ? document.doctor_review.toObject() : document.doctor_review || {}),
    review_required: true,
    abnormal_flag: payload.abnormal_flag,
    remarks: payload.remarks || document.doctor_review?.remarks || null,
    action_required: payload.action_required ?? document.doctor_review?.action_required ?? false,
  };
  document.updated_by = actorId || null;
  await document.save();

  return getDocumentDetailById(String(document._id), hospitalId);
}

async function getDocumentAccessUrl(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const document = await getDocumentDetailById(id, hospitalId);

  return {
    mode: 'read_url_foundation_only',
    access_url: null,
    storage_provider: document.storage_provider || 'local',
    storage_bucket: document.storage_bucket || null,
    storage_key: document.storage_key || null,
    mime_type: document.mime_type || null,
    original_file_name: document.original_file_name || null,
    expires_in_seconds: 900,
    notes: document.storage_key ? 'Signed-read URL generation is a future/provider-specific step. Current runtime returns document access foundation only.' : 'Document has no stored object reference yet.',
  };
}

async function findLatestLinkedDocument(testOrderId, hospitalId) {
  return PatientDocument.findOne({
    hospital_id: hospitalId,
    test_order_id: testOrderId,
    is_active: true,
  })
    .sort({ uploaded_at: -1, createdAt: -1, _id: -1 })
    .populate(DETAIL_POPULATE)
    .lean();
}

module.exports = {
  getUploadUrlFoundation,
  createDocument,
  getDocumentDetailById,
  listReviewInbox,
  reviewDocument,
  flagDocument,
  getDocumentAccessUrl,
  findLatestLinkedDocument,
};
