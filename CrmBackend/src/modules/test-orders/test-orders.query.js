const TestOrder = require('../../models/TestOrder');
const AppError = require('../../utils/app-error');
const HTTP_STATUS = require('../../constants/http-status');
const { assertObjectId, isValidObjectId } = require('../../utils/object-id');

const DETAIL_POPULATE = [
  { path: 'patient_id', select: '_id full_name patient_code phone category is_active' },
  { path: 'doctor_id', select: '_id full_name speciality qualification' },
  { path: 'consultation_id', select: '_id status chief_complaint diagnosis appointment_id' },
  { path: 'prescription_id', select: '_id prescription_date issue_status void_status send_status' },
  { path: 'appointment_id', select: '_id scheduled_at status visit_type appointment_type_id' },
  { path: 'test_catalog_id', select: '_id name code category reference_unit' },
];

function resolveHospitalId(inputHospitalId, currentUser = {}) {
  const hospitalId = inputHospitalId || currentUser.hospital_id || currentUser.raw?.hospital_id;

  if (!hospitalId || !isValidObjectId(hospitalId)) {
    throw new AppError('Valid hospital_id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  return hospitalId;
}

function normalizeBooleanQuery(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return undefined;
}

function normalizePagination(query = {}) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}


function buildListTestOrdersFilter(query = {}, hospitalId, defaultStatuses = null) {
  const filter = {
    hospital_id: hospitalId,
    is_active: true,
  };

  if (query.status) {
    filter.status = query.status;
  } else if (Array.isArray(defaultStatuses) && defaultStatuses.length > 0) {
    filter.status = { $in: defaultStatuses };
  }

  if (query.doctor_id) {
    assertObjectId(query.doctor_id, 'doctor_id');
    filter.doctor_id = query.doctor_id;
  }

  if (query.patient_id) {
    assertObjectId(query.patient_id, 'patient_id');
    filter.patient_id = query.patient_id;
  }

  if (query.consultation_id) {
    assertObjectId(query.consultation_id, 'consultation_id');
    filter.consultation_id = query.consultation_id;
  }

  if (query.priority) {
    filter.priority = query.priority;
  }

  if (query.ordered_from || query.ordered_to) {
    const orderedAt = {};
    if (query.ordered_from) orderedAt.$gte = new Date(query.ordered_from);
    if (query.ordered_to) orderedAt.$lte = new Date(query.ordered_to);
    filter.ordered_at = orderedAt;
  }

  if (normalizeBooleanQuery(query.abnormal_flag) !== undefined) {
    filter.abnormal_flag = normalizeBooleanQuery(query.abnormal_flag);
  }

  return filter;
}

function buildReviewInboxFilter(query = {}, hospitalId) {
  const filter = {
    hospital_id: hospitalId,
    is_active: true,
  };

  if (query.status) {
    filter.status = query.status;
  } else {
    filter.status = 'pending_review';
  }

  if (query.doctor_id) {
    assertObjectId(query.doctor_id, 'doctor_id');
    filter.doctor_id = query.doctor_id;
  }

  if (query.patient_id) {
    assertObjectId(query.patient_id, 'patient_id');
    filter.patient_id = query.patient_id;
  }

  if (query.due_from || query.due_to) {
    const orderedAt = {};

    if (query.due_from) {
      orderedAt.$gte = new Date(query.due_from);
    }

    if (query.due_to) {
      orderedAt.$lte = new Date(query.due_to);
    }

    filter.ordered_at = orderedAt;
  }

  if (normalizeBooleanQuery(query.abnormal_flag) !== undefined) {
    filter.abnormal_flag = normalizeBooleanQuery(query.abnormal_flag);
  }

  return filter;
}

function buildTestOrderResponse(order, linkedDocument = null) {
  if (!order) {
    return null;
  }

  const patient = order.patient_id && typeof order.patient_id === 'object'
    ? {
        _id: order.patient_id._id,
        full_name: order.patient_id.full_name,
        patient_code: order.patient_id.patient_code,
        phone: order.patient_id.phone,
        category: order.patient_id.category,
        is_active: order.patient_id.is_active,
      }
    : null;

  const doctor = order.doctor_id && typeof order.doctor_id === 'object'
    ? {
        _id: order.doctor_id._id,
        full_name: order.doctor_id.full_name,
        speciality: order.doctor_id.speciality,
        qualification: order.doctor_id.qualification,
      }
    : null;

  const consultation = order.consultation_id && typeof order.consultation_id === 'object'
    ? {
        _id: order.consultation_id._id,
        status: order.consultation_id.status,
        chief_complaint: order.consultation_id.chief_complaint,
        diagnosis: order.consultation_id.diagnosis,
        appointment_id: order.consultation_id.appointment_id,
      }
    : null;

  const testCatalog = order.test_catalog_id && typeof order.test_catalog_id === 'object'
    ? {
        _id: order.test_catalog_id._id,
        name: order.test_catalog_id.name,
        code: order.test_catalog_id.code,
        category: order.test_catalog_id.category,
        reference_unit: order.test_catalog_id.reference_unit,
      }
    : null;

  const linkedDocumentSummary = linkedDocument
    ? {
        _id: linkedDocument._id,
        title: linkedDocument.title,
        document_type: linkedDocument.document_type,
        category: linkedDocument.category,
        upload_status: linkedDocument.upload_status,
        send_status: linkedDocument.send_status,
        doctor_review: linkedDocument.doctor_review
          ? {
              review_required: linkedDocument.doctor_review.review_required,
              review_status: linkedDocument.doctor_review.review_status,
              abnormal_flag: linkedDocument.doctor_review.abnormal_flag,
            }
          : null,
      }
    : null;

  return {
    ...order,
    patient_summary: patient,
    doctor_summary: doctor,
    consultation_summary: consultation,
    test_catalog_summary: testCatalog,
    linked_document_summary: linkedDocumentSummary,
  };
}

async function getScopedTestOrderById(id, hospitalId) {
  assertObjectId(id, 'test_order id');

  const order = await TestOrder.findOne({
    _id: id,
    hospital_id: hospitalId,
  }).populate(DETAIL_POPULATE);

  if (!order) {
    throw new AppError('Test order not found.', HTTP_STATUS.NOT_FOUND);
  }

  return order;
}

module.exports = {
  DETAIL_POPULATE,
  resolveHospitalId,
  normalizePagination,
  buildReviewInboxFilter,
  buildListTestOrdersFilter,
  buildTestOrderResponse,
  getScopedTestOrderById,
};
