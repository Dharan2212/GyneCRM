const TestOrder = require('../../models/TestOrder');
const TestCatalog = require('../../models/TestCatalog');
const Patient = require('../../models/Patient');
const Doctor = require('../../models/Doctor');
const Consultation = require('../../models/Consultation');
const Prescription = require('../../models/Prescription');
const Appointment = require('../../models/Appointment');
const HTTP_STATUS = require('../../constants/http-status');
const AppError = require('../../utils/app-error');
const { assertObjectId } = require('../../utils/object-id');
const {
  resolveHospitalId,
  normalizePagination,
  buildReviewInboxFilter,
  buildListTestOrdersFilter,
  buildTestOrderResponse,
  getScopedTestOrderById,
} = require('./test-orders.query');
const { STATUS, assertTransition } = require('./test-orders.workflow');
const documentsService = require('../documents/documents.service');
const { createSendHistoryEntries } = require('../send-history/send-history.logging');

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

async function getTestOrderResponse(order) {
  const linkedDocument = await documentsService.findLatestLinkedDocument(order._id, order.hospital_id);
  const populated = await TestOrder.findById(order._id).populate(require('./test-orders.query').DETAIL_POPULATE).lean();
  return buildTestOrderResponse(populated, linkedDocument);
}


async function listTestOrders(query = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const { page, limit, skip } = normalizePagination(query);
  const filter = buildListTestOrdersFilter(query, hospitalId);

  const [orders, total] = await Promise.all([
    TestOrder.find(filter)
      .sort({ ordered_at: -1, createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate(require('./test-orders.query').DETAIL_POPULATE)
      .lean(),
    TestOrder.countDocuments(filter),
  ]);

  const enriched = [];
  for (const order of orders) {
    const linkedDocument = await documentsService.findLatestLinkedDocument(order._id, hospitalId);
    enriched.push(buildTestOrderResponse(order, linkedDocument));
  }

  return {
    items: enriched,
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) || 1 },
  };
}

async function getTestOrderDetail(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const order = await getScopedTestOrderById(id, hospitalId);
  return getTestOrderResponse(order);
}

async function listPendingUpload(query = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const { page, limit, skip } = normalizePagination(query);
  const filter = buildListTestOrdersFilter(query, hospitalId, ['ordered', 'pending_upload']);

  const [orders, total] = await Promise.all([
    TestOrder.find(filter)
      .sort({ expected_upload_at: 1, ordered_at: -1, createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate(require('./test-orders.query').DETAIL_POPULATE)
      .lean(),
    TestOrder.countDocuments(filter),
  ]);

  const enriched = [];
  for (const order of orders) {
    const linkedDocument = await documentsService.findLatestLinkedDocument(order._id, hospitalId);
    enriched.push(buildTestOrderResponse(order, linkedDocument));
  }

  return {
    items: enriched,
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) || 1 },
  };
}

async function createTestOrder(payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(payload.hospital_id, currentUser);
  const actorId = currentUser.id;

  if (!actorId) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(actorId, 'created_by');

  const [patient, doctor, consultation, prescription, appointment, testCatalog] = await Promise.all([
    ensureScopedReference(Patient, payload.patient_id, hospitalId, 'patient_id'),
    ensureScopedReference(Doctor, payload.doctor_id, hospitalId, 'doctor_id'),
    ensureScopedReference(Consultation, payload.consultation_id, hospitalId, 'consultation_id'),
    ensureScopedReference(Prescription, payload.prescription_id, hospitalId, 'prescription_id'),
    ensureScopedReference(Appointment, payload.appointment_id, hospitalId, 'appointment_id'),
    ensureScopedReference(TestCatalog, payload.test_catalog_id, hospitalId, 'test_catalog_id'),
  ]);

  if (String(consultation.patient_id) !== String(patient._id)) {
    throw new AppError('consultation_id does not belong to the provided patient_id.', HTTP_STATUS.CONFLICT);
  }

  if (String(consultation.doctor_id) !== String(doctor._id)) {
    throw new AppError('consultation_id does not belong to the provided doctor_id.', HTTP_STATUS.CONFLICT);
  }

  if (prescription && String(prescription.consultation_id) !== String(consultation._id)) {
    throw new AppError('prescription_id does not belong to the provided consultation_id.', HTTP_STATUS.CONFLICT);
  }

  if (appointment && String(appointment.patient_id) !== String(patient._id)) {
    throw new AppError('appointment_id does not belong to the provided patient_id.', HTTP_STATUS.CONFLICT);
  }

  const order = await TestOrder.create({
    hospital_id: hospitalId,
    patient_id: payload.patient_id,
    doctor_id: payload.doctor_id,
    consultation_id: payload.consultation_id,
    prescription_id: payload.prescription_id || null,
    appointment_id: payload.appointment_id || consultation.appointment_id || null,
    test_catalog_id: payload.test_catalog_id,
    ordered_at: new Date(),
    ordered_by: actorId,
    status: STATUS.ORDERED,
    priority: payload.priority || 'routine',
    clinical_notes: payload.clinical_notes || null,
    indication: payload.indication || null,
    specimen_type: payload.specimen_type || null,
    expected_upload_at: payload.expected_upload_at || null,
    created_by: actorId,
    updated_by: actorId,
    is_active: true,
  });

  return getTestOrderResponse(order);
}

async function moveToPendingUpload(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;

  const order = await getScopedTestOrderById(id, hospitalId);
  assertTransition(order.status, STATUS.PENDING_UPLOAD, {
    [STATUS.ORDERED]: [STATUS.PENDING_UPLOAD],
  });

  order.status = STATUS.PENDING_UPLOAD;
  order.updated_by = actorId || null;
  await order.save();

  return getTestOrderResponse(order);
}

async function linkResult(id, payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;
  const order = await getScopedTestOrderById(id, hospitalId);

  assertTransition(order.status, STATUS.PENDING_REVIEW, {
    [STATUS.PENDING_UPLOAD]: [STATUS.PENDING_REVIEW],
    [STATUS.ORDERED]: [STATUS.PENDING_REVIEW],
  });

  const linkedDocument = await documentsService.getDocumentDetailById(payload.document_id, hospitalId);

  if (String(linkedDocument.patient_id._id || linkedDocument.patient_id) !== String(order.patient_id._id || order.patient_id)) {
    throw new AppError('document_id does not belong to the same patient as the test order.', HTTP_STATUS.CONFLICT);
  }

  if (!linkedDocument.test_order_id || String(linkedDocument.test_order_id._id || linkedDocument.test_order_id) !== String(order._id)) {
    throw new AppError('document_id is not linked to the provided test order.', HTTP_STATUS.CONFLICT);
  }

  order.uploaded_at = linkedDocument.uploaded_at || new Date();
  order.uploaded_by = linkedDocument.uploaded_by || actorId || null;
  order.review_requested_at = new Date();
  order.status = STATUS.PENDING_REVIEW;
  order.updated_by = actorId || null;
  await order.save();

  return getTestOrderResponse(order);
}

async function getReviewInbox(query = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const { page, limit, skip } = normalizePagination(query);
  const filter = buildReviewInboxFilter(query, hospitalId);

  const [orders, total] = await Promise.all([
    TestOrder.find(filter)
      .sort({ review_requested_at: -1, uploaded_at: -1, createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate(require('./test-orders.query').DETAIL_POPULATE)
      .lean(),
    TestOrder.countDocuments(filter),
  ]);

  const enriched = [];
  for (const order of orders) {
    const linkedDocument = await documentsService.findLatestLinkedDocument(order._id, hospitalId);
    enriched.push(buildTestOrderResponse(order, linkedDocument));
  }

  return {
    items: enriched,
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

async function reviewResult(id, payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;
  const order = await getScopedTestOrderById(id, hospitalId);

  assertTransition(order.status, STATUS.REVIEWED, {
    [STATUS.PENDING_REVIEW]: [STATUS.REVIEWED],
  });

  const linkedDocument = await require('../../models/PatientDocument').findOne({
    hospital_id: hospitalId,
    test_order_id: order._id,
    is_active: true,
  }).sort({ uploaded_at: -1, createdAt: -1, _id: -1 });

  if (!linkedDocument) {
    throw new AppError('A linked patient document is required before review.', HTTP_STATUS.CONFLICT);
  }

  linkedDocument.doctor_review = {
    ...(linkedDocument.doctor_review?.toObject ? linkedDocument.doctor_review.toObject() : linkedDocument.doctor_review || {}),
    review_required: true,
    review_status: 'reviewed',
    review_requested_at: linkedDocument.doctor_review?.review_requested_at || order.review_requested_at || new Date(),
    review_requested_by: linkedDocument.doctor_review?.review_requested_by || actorId || null,
    reviewed_at: new Date(),
    reviewed_by: actorId || null,
    abnormal_flag: payload.abnormal_flag ?? linkedDocument.doctor_review?.abnormal_flag ?? false,
    findings_summary: payload.findings_summary || null,
    remarks: payload.remarks || null,
    action_required: payload.action_required ?? false,
  };
  linkedDocument.updated_by = actorId || null;
  await linkedDocument.save();

  order.status = STATUS.REVIEWED;
  order.reviewed_at = new Date();
  order.reviewed_by = actorId || null;
  order.abnormal_flag = payload.abnormal_flag ?? false;
  order.result_summary = payload.result_summary || payload.findings_summary || null;
  order.updated_by = actorId || null;
  await order.save();

  return getTestOrderResponse(order);
}

async function sendResult(id, payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;
  const order = await getScopedTestOrderById(id, hospitalId);

  assertTransition(order.status, STATUS.SENT, {
    [STATUS.REVIEWED]: [STATUS.SENT],
  });

  order.status = STATUS.SENT;
  order.sent_at = new Date();
  order.sent_by = actorId || null;
  order.send_channels = Array.from(new Set([...(order.send_channels || []), ...(payload.send_channels || [])]));
  order.send_notes = payload.send_notes || null;
  order.updated_by = actorId || null;
  await order.save();

  const linkedDocument = await require('../../models/PatientDocument').findOne({
    hospital_id: hospitalId,
    test_order_id: order._id,
    is_active: true,
  }).sort({ uploaded_at: -1, createdAt: -1, _id: -1 });

  if (linkedDocument) {
    linkedDocument.send_status = 'sent';
    linkedDocument.sent_at = order.sent_at;
    linkedDocument.sent_by = actorId || null;
    linkedDocument.send_channels = Array.from(new Set([...(linkedDocument.send_channels || []), ...(payload.send_channels || [])]));
    linkedDocument.send_notes = payload.send_notes || null;
    linkedDocument.updated_by = actorId || null;
    await linkedDocument.save();
  }

  await createSendHistoryEntries({
    hospital_id: order.hospital_id,
    patient_id: order.patient_id,
    doctor_id: order.doctor_id,
    source_type: 'test_order',
    source_id: order._id,
    source_number: order.test_order_number || null,
    channels: payload.send_channels || [],
    subject: 'Test result shared',
    message_summary: payload.send_notes || order.result_summary || 'Test result send action completed.',
    payload_snapshot: {
      send_channels: payload.send_channels || [],
      status: order.status,
      linked_document_id: linkedDocument?._id || null,
    },
    status: 'sent',
    initiated_by: actorId || null,
    metadata: {
      abnormal_flag: order.abnormal_flag,
      linked_document_id: linkedDocument?._id || null,
    },
  });

  return getTestOrderResponse(order);
}

module.exports = {
  listTestOrders,
  getTestOrderDetail,
  listPendingUpload,
  createTestOrder,
  moveToPendingUpload,
  linkResult,
  getReviewInbox,
  reviewResult,
  sendResult,
};
