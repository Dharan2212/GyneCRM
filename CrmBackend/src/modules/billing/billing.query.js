const Invoice = require('../../models/Invoice');
const AppError = require('../../utils/app-error');
const HTTP_STATUS = require('../../constants/http-status');
const { assertObjectId, isValidObjectId } = require('../../utils/object-id');

const LIST_POPULATE = [
  { path: 'patient_id', select: '_id full_name patient_code phone category' },
  { path: 'doctor_id', select: '_id full_name speciality qualification' },
];

const DETAIL_POPULATE = [
  ...LIST_POPULATE,
  { path: 'appointment_id', select: '_id scheduled_at status visit_type' },
  { path: 'consultation_id', select: '_id status chief_complaint diagnosis' },
  { path: 'prescription_id', select: '_id prescription_date issue_status void_status send_status' },
  { path: 'test_order_id', select: '_id status priority abnormal_flag ordered_at' },
  { path: 'patient_document_id', select: '_id title document_type category upload_status send_status' },
  { path: 'payments.collected_by', select: '_id full_name role' },
];

function resolveHospitalId(inputHospitalId, currentUser = {}) {
  const hospitalId = inputHospitalId || currentUser.hospital_id || currentUser.raw?.hospital_id;

  if (!hospitalId || !isValidObjectId(hospitalId)) {
    throw new AppError('Valid hospital_id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  return hospitalId;
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

function buildInvoiceListFilter(query = {}, hospitalId) {
  const filter = {
    hospital_id: hospitalId,
  };

  if (query.patient_id) {
    assertObjectId(query.patient_id, 'patient_id');
    filter.patient_id = query.patient_id;
  }

  if (query.doctor_id) {
    assertObjectId(query.doctor_id, 'doctor_id');
    filter.doctor_id = query.doctor_id;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.invoice_date_from || query.invoice_date_to) {
    filter.invoice_date = {};

    if (query.invoice_date_from) {
      filter.invoice_date.$gte = new Date(query.invoice_date_from);
    }

    if (query.invoice_date_to) {
      filter.invoice_date.$lte = new Date(query.invoice_date_to);
    }
  }

  if (query.due_date_from || query.due_date_to) {
    filter.due_date = {};

    if (query.due_date_from) {
      filter.due_date.$gte = new Date(query.due_date_from);
    }

    if (query.due_date_to) {
      filter.due_date.$lte = new Date(query.due_date_to);
    }
  }

  if (query.search) {
    filter.invoice_number = {
      $regex: String(query.search).trim(),
      $options: 'i',
    };
  }

  return filter;
}

function buildInvoiceResponse(invoice) {
  if (!invoice) {
    return null;
  }

  const patientSummary = invoice.patient_id && typeof invoice.patient_id === 'object'
    ? {
        _id: invoice.patient_id._id,
        full_name: invoice.patient_id.full_name,
        patient_code: invoice.patient_id.patient_code,
        phone: invoice.patient_id.phone,
        category: invoice.patient_id.category,
      }
    : null;

  const doctorSummary = invoice.doctor_id && typeof invoice.doctor_id === 'object'
    ? {
        _id: invoice.doctor_id._id,
        full_name: invoice.doctor_id.full_name,
        speciality: invoice.doctor_id.speciality,
        qualification: invoice.doctor_id.qualification,
      }
    : null;

  const linkedSummary = {
    appointment: invoice.appointment_id && typeof invoice.appointment_id === 'object'
      ? {
          _id: invoice.appointment_id._id,
          scheduled_at: invoice.appointment_id.scheduled_at,
          status: invoice.appointment_id.status,
          visit_type: invoice.appointment_id.visit_type,
        }
      : null,
    consultation: invoice.consultation_id && typeof invoice.consultation_id === 'object'
      ? {
          _id: invoice.consultation_id._id,
          status: invoice.consultation_id.status,
          chief_complaint: invoice.consultation_id.chief_complaint,
        }
      : null,
    prescription: invoice.prescription_id && typeof invoice.prescription_id === 'object'
      ? {
          _id: invoice.prescription_id._id,
          prescription_date: invoice.prescription_id.prescription_date,
          issue_status: invoice.prescription_id.issue_status,
        }
      : null,
    test_order: invoice.test_order_id && typeof invoice.test_order_id === 'object'
      ? {
          _id: invoice.test_order_id._id,
          status: invoice.test_order_id.status,
          priority: invoice.test_order_id.priority,
          abnormal_flag: invoice.test_order_id.abnormal_flag,
        }
      : null,
    patient_document: invoice.patient_document_id && typeof invoice.patient_document_id === 'object'
      ? {
          _id: invoice.patient_document_id._id,
          title: invoice.patient_document_id.title,
          document_type: invoice.patient_document_id.document_type,
          upload_status: invoice.patient_document_id.upload_status,
        }
      : null,
  };

  return {
    ...invoice,
    item_count: Array.isArray(invoice.items) ? invoice.items.length : 0,
    patient_summary: patientSummary,
    doctor_summary: doctorSummary,
    linked_summary: linkedSummary,
  };
}

async function getScopedInvoiceById(id, hospitalId) {
  assertObjectId(id, 'invoice id');

  const invoice = await Invoice.findOne({
    _id: id,
    hospital_id: hospitalId,
  }).populate(DETAIL_POPULATE);

  if (!invoice) {
    throw new AppError('Invoice not found.', HTTP_STATUS.NOT_FOUND);
  }

  return invoice;
}

module.exports = {
  LIST_POPULATE,
  DETAIL_POPULATE,
  resolveHospitalId,
  normalizePagination,
  buildInvoiceListFilter,
  buildInvoiceResponse,
  getScopedInvoiceById,
};
