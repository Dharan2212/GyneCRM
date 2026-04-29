const Counter = require('../../models/Counter');
const Invoice = require('../../models/Invoice');
const Patient = require('../../models/Patient');
const Doctor = require('../../models/Doctor');
const Appointment = require('../../models/Appointment');
const Consultation = require('../../models/Consultation');
const Prescription = require('../../models/Prescription');
const TestOrder = require('../../models/TestOrder');
const PatientDocument = require('../../models/PatientDocument');
const HTTP_STATUS = require('../../constants/http-status');
const AppError = require('../../utils/app-error');
const { assertObjectId } = require('../../utils/object-id');
const {
  DETAIL_POPULATE,
  LIST_POPULATE,
  resolveHospitalId,
  normalizePagination,
  buildInvoiceListFilter,
  buildInvoiceResponse,
  getScopedInvoiceById,
} = require('./billing.query');
const { buildInvoicePdfPayload } = require('./billing.pdf');
const { applyInvoiceSendState } = require('./billing.send');
const {
  roundMoney,
  getEffectivePaymentAmount,
  deriveInvoiceStatus,
} = require('./billing.calculations');
const { createSendHistoryEntries } = require('../send-history/send-history.logging');

function normalizeInvoicePayload(payload = {}) {
  return {
    ...payload,
    notes: payload.notes || null,
    internal_notes: payload.internal_notes || null,
    items: Array.isArray(payload.items) ? payload.items : [],
  };
}

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

async function getInvoiceDetailById(id, hospitalId) {
  assertObjectId(id, 'invoice id');

  const invoice = await Invoice.findOne({
    _id: id,
    hospital_id: hospitalId,
  }).populate(DETAIL_POPULATE).lean();

  if (!invoice) {
    throw new AppError('Invoice not found.', HTTP_STATUS.NOT_FOUND);
  }

  return buildInvoiceResponse(invoice);
}

function assertEditableInvoice(invoice) {
  if (invoice.void_status || invoice.status === 'void') {
    throw new AppError('Voided invoices cannot be modified.', HTTP_STATUS.CONFLICT);
  }

  if (invoice.status !== 'draft') {
    throw new AppError('Only draft invoices are editable in this batch.', HTTP_STATUS.CONFLICT);
  }
}

function assertSendableInvoice(invoice) {
  if (invoice.void_status || invoice.status === 'void') {
    throw new AppError('Voided invoices cannot be sent.', HTTP_STATUS.CONFLICT);
  }

  if (!['issued', 'partially_paid', 'paid'].includes(invoice.status)) {
    throw new AppError('Only issued or paid invoices can be sent.', HTTP_STATUS.CONFLICT);
  }
}

async function getNextInvoiceNumber() {
  const counter = await Counter.findOneAndUpdate(
    { key: Invoice.getCounterKey() },
    { $inc: { value: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  return `INV${String(counter.value).padStart(6, '0')}`;
}

async function createInvoice(payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(payload.hospital_id, currentUser);
  const actorId = currentUser.id;

  if (!actorId) {
    throw new AppError('Authenticated user id is required.', HTTP_STATUS.BAD_REQUEST);
  }

  assertObjectId(actorId, 'created_by');

  const normalized = normalizeInvoicePayload(payload);

  const [patient, doctor, appointment, consultation, prescription, testOrder, patientDocument] = await Promise.all([
    ensureScopedReference(Patient, normalized.patient_id, hospitalId, 'patient_id'),
    ensureScopedReference(Doctor, normalized.doctor_id, hospitalId, 'doctor_id'),
    ensureScopedReference(Appointment, normalized.appointment_id, hospitalId, 'appointment_id'),
    ensureScopedReference(Consultation, normalized.consultation_id, hospitalId, 'consultation_id'),
    ensureScopedReference(Prescription, normalized.prescription_id, hospitalId, 'prescription_id'),
    ensureScopedReference(TestOrder, normalized.test_order_id, hospitalId, 'test_order_id'),
    ensureScopedReference(PatientDocument, normalized.patient_document_id, hospitalId, 'patient_document_id'),
  ]);

  if (consultation && String(consultation.patient_id) !== String(patient._id)) {
    throw new AppError('consultation_id does not belong to the provided patient_id.', HTTP_STATUS.CONFLICT);
  }

  if (doctor && consultation?.doctor_id && String(consultation.doctor_id) !== String(doctor._id)) {
    throw new AppError('consultation_id does not belong to the provided doctor_id.', HTTP_STATUS.CONFLICT);
  }

  if (appointment && String(appointment.patient_id) !== String(patient._id)) {
    throw new AppError('appointment_id does not belong to the provided patient_id.', HTTP_STATUS.CONFLICT);
  }

  if (doctor && appointment?.doctor_id && String(appointment.doctor_id) !== String(doctor._id)) {
    throw new AppError('appointment_id does not belong to the provided doctor_id.', HTTP_STATUS.CONFLICT);
  }

  if (prescription && String(prescription.patient_id) !== String(patient._id)) {
    throw new AppError('prescription_id does not belong to the provided patient_id.', HTTP_STATUS.CONFLICT);
  }

  if (doctor && prescription?.doctor_id && String(prescription.doctor_id) !== String(doctor._id)) {
    throw new AppError('prescription_id does not belong to the provided doctor_id.', HTTP_STATUS.CONFLICT);
  }

  if (testOrder && String(testOrder.patient_id) !== String(patient._id)) {
    throw new AppError('test_order_id does not belong to the provided patient_id.', HTTP_STATUS.CONFLICT);
  }

  if (doctor && testOrder?.doctor_id && String(testOrder.doctor_id) !== String(doctor._id)) {
    throw new AppError('test_order_id does not belong to the provided doctor_id.', HTTP_STATUS.CONFLICT);
  }

  if (patientDocument && String(patientDocument.patient_id) !== String(patient._id)) {
    throw new AppError('patient_document_id does not belong to the provided patient_id.', HTTP_STATUS.CONFLICT);
  }

  if (doctor && patientDocument?.doctor_id && String(patientDocument.doctor_id) !== String(doctor._id)) {
    throw new AppError('patient_document_id does not belong to the provided doctor_id.', HTTP_STATUS.CONFLICT);
  }

  const resolvedDoctorId = normalized.doctor_id
    || consultation?.doctor_id
    || appointment?.doctor_id
    || prescription?.doctor_id
    || testOrder?.doctor_id
    || patientDocument?.doctor_id
    || null;

  const invoice = await Invoice.create({
    hospital_id: hospitalId,
    patient_id: normalized.patient_id,
    doctor_id: resolvedDoctorId,
    appointment_id: normalized.appointment_id || consultation?.appointment_id || prescription?.appointment_id || null,
    consultation_id: normalized.consultation_id || null,
    prescription_id: normalized.prescription_id || null,
    test_order_id: normalized.test_order_id || null,
    patient_document_id: normalized.patient_document_id || null,
    invoice_date: normalized.invoice_date || new Date(),
    due_date: normalized.due_date || null,
    status: 'draft',
    currency: normalized.currency || 'INR',
    notes: normalized.notes,
    internal_notes: normalized.internal_notes,
    items: normalized.items,
    amount_paid: 0,
    void_status: false,
    send_status: 'not_sent',
    send_channels: [],
    created_by: actorId,
    updated_by: actorId,
    is_active: true,
  });

  return getInvoiceDetailById(String(invoice._id), hospitalId);
}

async function listInvoices(query = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const { page, limit, skip } = normalizePagination(query);
  const filter = buildInvoiceListFilter(query, hospitalId);

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .sort({ invoice_date: -1, createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate(LIST_POPULATE)
      .lean(),
    Invoice.countDocuments(filter),
  ]);

  return {
    items: invoices.map((invoice) => buildInvoiceResponse(invoice)),
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

async function getInvoiceDetail(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  return getInvoiceDetailById(id, hospitalId);
}

async function updateInvoice(id, payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;
  const invoice = await getScopedInvoiceById(id, hospitalId);

  assertEditableInvoice(invoice);

  if (payload.invoice_date !== undefined) {
    invoice.invoice_date = payload.invoice_date;
  }

  if (payload.due_date !== undefined) {
    invoice.due_date = payload.due_date;
  }

  if (payload.currency !== undefined) {
    invoice.currency = payload.currency;
  }

  if (payload.notes !== undefined) {
    invoice.notes = payload.notes;
  }

  if (payload.internal_notes !== undefined) {
    invoice.internal_notes = payload.internal_notes;
  }

  if (payload.items !== undefined) {
    invoice.items = payload.items;
  }

  invoice.updated_by = actorId || null;
  await invoice.save();

  return getInvoiceDetailById(String(invoice._id), hospitalId);
}

async function addInvoiceItems(id, payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;
  const invoice = await getScopedInvoiceById(id, hospitalId);

  assertEditableInvoice(invoice);

  invoice.items = [...(invoice.items || []), ...(payload.items || [])];
  invoice.updated_by = actorId || null;
  await invoice.save();

  return getInvoiceDetailById(String(invoice._id), hospitalId);
}

async function finalizeInvoice(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;
  const invoice = await getScopedInvoiceById(id, hospitalId);

  if (invoice.void_status || invoice.status === 'void') {
    throw new AppError('Voided invoices cannot be finalized.', HTTP_STATUS.CONFLICT);
  }

  if (invoice.status !== 'draft') {
    throw new AppError('Only draft invoices can be finalized.', HTTP_STATUS.CONFLICT);
  }

  if (!Array.isArray(invoice.items) || invoice.items.length === 0) {
    throw new AppError('At least one invoice item is required before finalize.', HTTP_STATUS.BAD_REQUEST);
  }

  if (!invoice.invoice_number) {
    invoice.invoice_number = await getNextInvoiceNumber();
  }

  invoice.status = 'issued';
  invoice.updated_by = actorId || null;
  await invoice.save();

  return getInvoiceDetailById(String(invoice._id), hospitalId);
}

async function recordPayment(id, payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;
  const invoice = await getScopedInvoiceById(id, hospitalId);

  if (invoice.void_status || invoice.status === 'void') {
    throw new AppError('Voided invoices cannot receive payments.', HTTP_STATUS.CONFLICT);
  }

  if (!['issued', 'partially_paid'].includes(invoice.status)) {
    throw new AppError('Payments can only be recorded on issued or partially paid invoices.', HTTP_STATUS.CONFLICT);
  }

  const effectiveAmount = getEffectivePaymentAmount(payload);
  const projectedAmountPaid = roundMoney(invoice.getRecordedPaymentsTotal() + effectiveAmount);

  if (effectiveAmount > 0 && projectedAmountPaid > roundMoney(invoice.total_amount)) {
    throw new AppError('Overpayment is not allowed in this batch.', HTTP_STATUS.CONFLICT);
  }

  invoice.payments.push({
    payment_date: payload.payment_date || new Date(),
    amount: payload.amount,
    method: payload.method,
    reference_number: payload.reference_number || null,
    status: payload.status || 'recorded',
    collected_by: actorId || null,
    notes: payload.notes || null,
  });

  invoice.updated_by = actorId || null;
  invoice.status = deriveInvoiceStatus(invoice, projectedAmountPaid);
  await invoice.save();

  return getInvoiceDetailById(String(invoice._id), hospitalId);
}

async function getInvoicePdf(id, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const detail = await getInvoiceDetailById(id, hospitalId);

  if (detail.void_status || detail.status === 'void') {
    throw new AppError('Voided invoices do not have PDF output.', HTTP_STATUS.CONFLICT);
  }

  if (!['issued', 'partially_paid', 'paid'].includes(detail.status)) {
    throw new AppError('Only issued or paid invoices can be viewed in the PDF endpoint.', HTTP_STATUS.CONFLICT);
  }

  return buildInvoicePdfPayload(detail);
}

async function sendInvoice(id, payload = {}, currentUser = {}) {
  const hospitalId = resolveHospitalId(null, currentUser);
  const actorId = currentUser.id;
  const invoice = await getScopedInvoiceById(id, hospitalId);

  assertSendableInvoice(invoice);
  applyInvoiceSendState(invoice, payload, actorId || null);
  invoice.updated_by = actorId || null;
  await invoice.save();

  await createSendHistoryEntries({
    hospital_id: invoice.hospital_id,
    patient_id: invoice.patient_id,
    doctor_id: invoice.doctor_id || null,
    source_type: 'invoice',
    source_id: invoice._id,
    source_number: invoice.invoice_number || null,
    channels: payload.send_channels || [],
    subject: 'Invoice shared',
    message_summary: payload.send_notes || 'Invoice send action completed.',
    payload_snapshot: {
      send_channels: payload.send_channels || [],
      status: invoice.status,
      total_amount: invoice.total_amount,
      amount_due: invoice.amount_due,
    },
    status: 'sent',
    initiated_by: actorId || null,
    metadata: {
      invoice_status: invoice.status,
      amount_due: invoice.amount_due,
    },
  });

  return getInvoiceDetailById(String(invoice._id), hospitalId);
}

module.exports = {
  createInvoice,
  listInvoices,
  getInvoiceDetail,
  updateInvoice,
  addInvoiceItems,
  finalizeInvoice,
  recordPayment,
  getInvoicePdf,
  sendInvoice,
};
