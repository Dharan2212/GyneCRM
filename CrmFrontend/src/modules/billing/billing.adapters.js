import {
  INVOICE_ITEM_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  SEND_CHANNEL_LABELS,
} from '../shared/enums/billing.enums.js'
import { formatCurrency, formatInvoiceNumber } from '../shared/formatters/billing.formatters.js'
import { formatDate, formatDateTime } from '../shared/formatters/dateTime.js'
import { formatStatusLabel } from '../shared/formatters/status.formatters.js'

function formatNullableDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function toNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

export function calculateInvoiceLineTotal(item = {}) {
  const quantity = toNumber(item.quantity, 0)
  const unitPrice = toNumber(item.unit_price, 0)
  const discountAmount = toNumber(item.discount_amount, 0)
  const taxAmount = toNumber(item.tax_amount, 0)
  const base = quantity * unitPrice
  return Math.max(0, Number((base - discountAmount + taxAmount).toFixed(2)))
}

export function createInvoiceForm(values = {}) {
  return {
    patient_id: values.patient_id || '',
    doctor_id: values.doctor_id || '',
    appointment_id: values.appointment_id || '',
    consultation_id: values.consultation_id || '',
    prescription_id: values.prescription_id || '',
    test_order_id: values.test_order_id || '',
    patient_document_id: values.patient_document_id || '',
    invoice_date: values.invoice_date || formatNullableDate(new Date()),
    due_date: values.due_date || '',
    currency: values.currency || 'INR',
    notes: values.notes || '',
    internal_notes: values.internal_notes || '',
  }
}

export function createInvoiceItemForm(values = {}) {
  return {
    item_type: values.item_type || 'service',
    label: values.label || '',
    description: values.description || '',
    source_type: values.source_type || '',
    source_id: values.source_id || '',
    quantity: values.quantity ?? 1,
    unit_price: values.unit_price ?? '',
    discount_amount: values.discount_amount ?? 0,
    tax_amount: values.tax_amount ?? 0,
    notes: values.notes || '',
    status: values.status || 'active',
  }
}

export function createInvoicePaymentForm(values = {}) {
  return {
    payment_date: values.payment_date || formatNullableDate(new Date()),
    amount: values.amount ?? '',
    method: values.method || 'cash',
    reference_number: values.reference_number || '',
    status: values.status || 'recorded',
    notes: values.notes || '',
  }
}

export function createInvoiceSendForm(values = {}) {
  return {
    send_channels: Array.isArray(values.send_channels) ? values.send_channels : [],
    send_notes: values.send_notes || '',
  }
}

export function validateInvoiceForm(values = {}) {
  const errors = {}

  if (!String(values.patient_id || '').trim()) {
    errors.patient_id = 'Patient is required.'
  }

  if (values.invoice_date && Number.isNaN(new Date(values.invoice_date).getTime())) {
    errors.invoice_date = 'Invoice date is invalid.'
  }

  if (values.due_date && Number.isNaN(new Date(values.due_date).getTime())) {
    errors.due_date = 'Due date is invalid.'
  }

  return errors
}

export function validateInvoiceItemForm(values = {}) {
  const errors = {}
  if (!String(values.label || '').trim()) {
    errors.label = 'Item label is required.'
  }
  if (toNumber(values.quantity, NaN) < 0) {
    errors.quantity = 'Quantity cannot be negative.'
  }
  if (toNumber(values.unit_price, NaN) < 0) {
    errors.unit_price = 'Unit price cannot be negative.'
  }
  if (toNumber(values.discount_amount, NaN) < 0) {
    errors.discount_amount = 'Discount cannot be negative.'
  }
  if (toNumber(values.tax_amount, NaN) < 0) {
    errors.tax_amount = 'Tax cannot be negative.'
  }
  return errors
}

export function validateInvoicePaymentForm(values = {}) {
  const errors = {}
  if (!toNumber(values.amount, 0)) {
    errors.amount = 'Payment amount is required.'
  } else if (toNumber(values.amount, 0) <= 0) {
    errors.amount = 'Payment amount must be greater than 0.'
  }
  if (!String(values.method || '').trim()) {
    errors.method = 'Payment method is required.'
  }
  return errors
}

export function validateInvoiceSendForm(values = {}) {
  const errors = {}
  if (!Array.isArray(values.send_channels) || values.send_channels.length === 0) {
    errors.send_channels = 'Select at least one send channel.'
  }
  return errors
}

export function mapInvoiceFiltersToQuery(filters = {}) {
  return {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.page ? { page: filters.page } : {}),
    ...(filters.limit ? { limit: filters.limit } : {}),
    ...(filters.patient_id ? { patient_id: filters.patient_id } : {}),
  }
}

export function mapInvoiceFormToPayload(values = {}) {
  const payload = {
    patient_id: values.patient_id || null,
    invoice_date: values.invoice_date || null,
    due_date: values.due_date || null,
    currency: values.currency || 'INR',
    notes: values.notes || '',
    internal_notes: values.internal_notes || '',
    items: [],
  }

  ;['doctor_id', 'appointment_id', 'consultation_id', 'prescription_id', 'test_order_id', 'patient_document_id'].forEach((key) => {
    if (values[key]) payload[key] = values[key]
  })

  return payload
}

export function mapInvoiceItemFormToPayload(values = {}) {
  const quantity = toNumber(values.quantity, 1)
  const unit_price = toNumber(values.unit_price, 0)
  const discount_amount = toNumber(values.discount_amount, 0)
  const tax_amount = toNumber(values.tax_amount, 0)

  return {
    item_type: values.item_type || 'service',
    label: String(values.label || '').trim(),
    description: values.description || '',
    source_type: values.source_type || null,
    source_id: values.source_id || null,
    quantity,
    unit_price,
    discount_amount,
    tax_amount,
    line_total: calculateInvoiceLineTotal({ quantity, unit_price, discount_amount, tax_amount }),
    notes: values.notes || '',
    status: values.status || 'active',
  }
}

export function mapInvoicePaymentFormToPayload(values = {}) {
  return {
    payment_date: values.payment_date || null,
    amount: toNumber(values.amount, 0),
    method: values.method || 'cash',
    reference_number: values.reference_number || '',
    status: values.status || 'recorded',
    notes: values.notes || '',
  }
}

export function mapInvoiceSendFormToPayload(values = {}) {
  return {
    send_channels: Array.isArray(values.send_channels) ? values.send_channels : [],
    send_notes: values.send_notes || '',
  }
}

function adaptInvoiceItem(item = {}, currency = 'INR', index = 0) {
  const lineTotal = item.line_total ?? calculateInvoiceLineTotal(item)
  return {
    id: `${item.item_no || index}-${item.label || 'item'}`,
    itemNo: item.item_no || index + 1,
    itemType: item.item_type || 'other',
    itemTypeLabel: INVOICE_ITEM_TYPE_LABELS[item.item_type] || formatStatusLabel(item.item_type || 'other'),
    label: item.label || 'Untitled item',
    description: item.description || '',
    quantity: toNumber(item.quantity, 0),
    unitPrice: toNumber(item.unit_price, 0),
    unitPriceLabel: formatCurrency(item.unit_price || 0, currency),
    discountAmount: toNumber(item.discount_amount, 0),
    taxAmount: toNumber(item.tax_amount, 0),
    lineTotal,
    lineTotalLabel: formatCurrency(lineTotal, currency),
    status: item.status || 'active',
    statusLabel: formatStatusLabel(item.status || 'active'),
    notes: item.notes || '',
    raw: item,
  }
}

function adaptInvoicePayment(payment = {}, currency = 'INR', index = 0) {
  return {
    id: `${payment.payment_no || index}-${payment.reference_number || 'payment'}`,
    paymentNo: payment.payment_no || index + 1,
    paymentDateLabel: formatDate(payment.payment_date),
    amount: toNumber(payment.amount, 0),
    amountLabel: formatCurrency(payment.amount || 0, currency),
    method: payment.method || 'other',
    methodLabel: PAYMENT_METHOD_LABELS[payment.method] || formatStatusLabel(payment.method || 'other'),
    status: payment.status || 'recorded',
    statusLabel: PAYMENT_STATUS_LABELS[payment.status] || formatStatusLabel(payment.status || 'recorded'),
    referenceNumber: payment.reference_number || '--',
    notes: payment.notes || '',
    raw: payment,
  }
}

export function adaptInvoiceListItem(invoice = {}) {
  const patientSummary = invoice.patient_summary || invoice.patientSummary || {}
  const doctorSummary = invoice.doctor_summary || invoice.doctorSummary || {}
  const currency = invoice.currency || 'INR'

  return {
    id: invoice._id || invoice.id || null,
    invoiceNumber: formatInvoiceNumber(invoice),
    status: invoice.status || 'draft',
    statusLabel: formatStatusLabel(invoice.status || 'draft'),
    invoiceDateLabel: formatDate(invoice.invoice_date || invoice.invoiceDate || invoice.createdAt),
    dueDateLabel: formatDate(invoice.due_date || invoice.dueDate),
    totalAmount: toNumber(invoice.total_amount ?? invoice.totalAmount, 0),
    totalAmountLabel: formatCurrency(invoice.total_amount ?? invoice.totalAmount ?? 0, currency),
    paidAmount: toNumber(invoice.amount_paid ?? invoice.paid_amount ?? invoice.paidAmount, 0),
    paidAmountLabel: formatCurrency(invoice.amount_paid ?? invoice.paid_amount ?? invoice.paidAmount ?? 0, currency),
    dueAmount: toNumber(invoice.amount_due ?? invoice.dueAmount, 0),
    dueAmountLabel: formatCurrency(invoice.amount_due ?? invoice.dueAmount ?? 0, currency),
    sendStatus: invoice.send_status || invoice.sendStatus || 'not_sent',
    sendStatusLabel: formatStatusLabel(invoice.send_status || invoice.sendStatus || 'not_sent'),
    patientId: patientSummary._id || invoice.patient_id || null,
    patientName: patientSummary.full_name || invoice.patient_name || '--',
    patientCode: patientSummary.patient_code || '--',
    doctorName: doctorSummary.full_name || '--',
    itemCount: invoice.item_count || invoice.itemCount || (Array.isArray(invoice.items) ? invoice.items.length : 0),
    currency,
    raw: invoice,
  }
}

export function adaptInvoiceDetail(invoice = {}) {
  const linkedSummary = invoice.linked_summary || invoice.linkedSummary || {}
  const patientSummary = invoice.patient_summary || invoice.patientSummary || {}
  const doctorSummary = invoice.doctor_summary || invoice.doctorSummary || {}
  const currency = invoice.currency || 'INR'
  const items = Array.isArray(invoice.items) ? invoice.items : []
  const payments = Array.isArray(invoice.payments) ? invoice.payments : []

  return {
    ...adaptInvoiceListItem(invoice),
    notes: invoice.notes || '',
    internalNotes: invoice.internal_notes || '',
    sentAtLabel: formatDateTime(invoice.sent_at),
    sentChannels: Array.isArray(invoice.send_channels) ? invoice.send_channels : [],
    sentChannelsLabel: (invoice.send_channels || []).map((channel) => SEND_CHANNEL_LABELS[channel] || formatStatusLabel(channel)).join(', '),
    amountPaidLabel: formatCurrency(invoice.amount_paid ?? 0, currency),
    amountDueLabel: formatCurrency(invoice.amount_due ?? 0, currency),
    subtotalAmountLabel: formatCurrency(invoice.subtotal_amount ?? 0, currency),
    discountAmountLabel: formatCurrency(invoice.discount_amount ?? 0, currency),
    taxAmountLabel: formatCurrency(invoice.tax_amount ?? 0, currency),
    patientSummary: {
      id: patientSummary._id || null,
      fullName: patientSummary.full_name || '--',
      patientCode: patientSummary.patient_code || '--',
      phone: patientSummary.phone || '--',
      category: patientSummary.category || 'uncategorized',
      categoryLabel: formatStatusLabel(patientSummary.category || 'uncategorized'),
    },
    doctorSummary: {
      id: doctorSummary._id || null,
      fullName: doctorSummary.full_name || '--',
      speciality: doctorSummary.speciality || '--',
    },
    linkedSummary: {
      appointment: linkedSummary.appointment || null,
      consultation: linkedSummary.consultation || null,
      prescription: linkedSummary.prescription || null,
      testOrder: linkedSummary.test_order || null,
      patientDocument: linkedSummary.patient_document || null,
    },
    items: items.map((item, index) => adaptInvoiceItem(item, currency, index)),
    payments: payments.map((payment, index) => adaptInvoicePayment(payment, currency, index)),
    raw: invoice,
  }
}

export function adaptInvoicePdfFoundation(payload = {}) {
  return {
    mode: payload.mode || 'pdf_foundation_payload',
    filename: payload.filename || 'invoice.pdf',
    contentType: payload.content_type || 'application/json',
    invoiceNumber: payload.invoice?.invoice_number || '--',
    statusLabel: formatStatusLabel(payload.invoice?.status || 'draft'),
    raw: payload,
  }
}
