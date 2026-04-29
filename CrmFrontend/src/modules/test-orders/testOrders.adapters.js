import { formatDate, formatDateTime } from '../shared/formatters/dateTime.js'
import { formatStatusLabel } from '../shared/formatters/status.formatters.js'

function mapPriorityBadge(priority) {
  if (priority === 'urgent' || priority === 'stat') return 'high'
  return 'wait'
}

function adaptLinkedDocumentSummary(document = null) {
  if (!document) return null

  const doctorReview = document.doctor_review || {}

  return {
    id: document._id || document.id || null,
    title: document.title || 'Linked Result',
    documentType: document.document_type || 'report',
    documentTypeLabel: formatStatusLabel(document.document_type || 'report'),
    category: document.category || 'other',
    categoryLabel: formatStatusLabel(document.category || 'other'),
    uploadStatus: document.upload_status || 'uploaded',
    uploadStatusLabel: formatStatusLabel(document.upload_status || 'uploaded'),
    sendStatus: document.send_status || 'not_sent',
    sendStatusLabel: formatStatusLabel(document.send_status || 'not_sent'),
    reviewRequired: Boolean(doctorReview.review_required),
    reviewStatus: doctorReview.review_status || 'not_required',
    reviewStatusLabel: formatStatusLabel(doctorReview.review_status || 'not_required'),
    abnormalFlag: Boolean(doctorReview.abnormal_flag),
    findingsSummary: doctorReview.findings_summary || '',
    remarks: doctorReview.remarks || '',
    actionRequired: Boolean(doctorReview.action_required),
    raw: document,
  }
}

export function adaptTestOrderItem(order = {}) {
  const linkedDocumentSummary = adaptLinkedDocumentSummary(order.linked_document_summary)
  const patientSummary = order.patient_summary || {}

  return {
    id: order._id || order.id || null,
    patientId: patientSummary._id || order.patient_id || null,
    patientName: patientSummary.full_name || order.patient_name || 'Unknown Patient',
    patientCode: patientSummary.patient_code || '--',
    consultationId: order.consultation_id?._id || order.consultation_id || order.consultation_summary?._id || null,
    doctorId: order.doctor_summary?._id || order.doctor_id || null,
    appointmentId: order.appointment_id?._id || order.appointment_id || order.consultation_summary?.appointment_id || null,
    testName: order.test_name || '--',
    testCode: order.test_code || '--',
    status: order.status || 'ordered',
    statusLabel: formatStatusLabel(order.status || 'ordered'),
    priority: order.priority || 'routine',
    priorityLabel: formatStatusLabel(order.priority || 'routine'),
    priorityBadgeType: mapPriorityBadge(order.priority || 'routine'),
    orderedAt: order.ordered_at || null,
    orderedAtLabel: formatDateTime(order.ordered_at),
    dueDateLabel: formatDate(order.due_date),
    reviewedAtLabel: formatDateTime(order.reviewed_at),
    sentAtLabel: formatDateTime(order.sent_at),
    abnormalFlag: Boolean(order.abnormal_flag),
    resultSummary: order.result_summary || '',
    reviewRemarks: order.review_remarks || '',
    linkedDocumentSummary,
    raw: order,
  }
}

export function adaptTestOrderDetail(order = {}) {
  const base = adaptTestOrderItem(order)
  const consultationSummary = order.consultation_summary || {}
  const testCatalogSummary = order.test_catalog_summary || {}

  return {
    ...base,
    doctorId: order.doctor_summary?._id || order.doctor_id || null,
    consultationSummary: {
      id: consultationSummary._id || null,
      status: consultationSummary.status || null,
      statusLabel: formatStatusLabel(consultationSummary.status || 'draft'),
      chiefComplaint: consultationSummary.chief_complaint || '--',
      diagnosis: consultationSummary.diagnosis || null,
    },
    testCatalogSummary: {
      id: testCatalogSummary._id || null,
      name: testCatalogSummary.name || base.testName,
      code: testCatalogSummary.code || base.testCode,
      category: testCatalogSummary.category || null,
    },
    sendChannels: order.send_channels || [],
    reviewRequestedAtLabel: formatDateTime(order.review_requested_at),
    linkedDocumentId: base.linkedDocumentSummary?.id || null,
    raw: order,
  }
}

export function mapTestOrderFormToPayload(values = {}) {
  return {
    patient_id: values.patient_id || null,
    doctor_id: values.doctor_id || null,
    consultation_id: values.consultation_id || null,
    appointment_id: values.appointment_id || null,
    test_catalog_id: values.test_catalog_id || null,
    priority: values.priority || 'routine',
    clinical_notes: values.clinical_notes || '',
    indication: values.indication || '',
    specimen_type: values.specimen_type || '',
    expected_upload_at: values.expected_upload_at || null,
  }
}

export function mapTestOrderFiltersToQuery(filters = {}) {
  return {
    ...(filters.patientId ? { patient_id: filters.patientId } : {}),
    ...(filters.consultationId ? { consultation_id: filters.consultationId } : {}),
    ...(filters.status && filters.status !== 'all' ? { status: filters.status } : {}),
    ...(filters.page ? { page: filters.page } : {}),
    ...(filters.limit ? { limit: filters.limit } : {}),
  }
}

export function mapLinkResultPayload(documentId) {
  return {
    document_id: documentId || null,
  }
}

export function mapReviewResultPayload(values = {}) {
  return {
    abnormal_flag: Boolean(values.abnormal_flag),
    findings_summary: values.findings_summary || '',
    remarks: values.remarks || '',
    action_required: Boolean(values.action_required),
    result_summary: values.result_summary || '',
  }
}

export function mapSendResultPayload(values = {}) {
  return {
    send_channels: Array.isArray(values.send_channels) ? values.send_channels.filter(Boolean) : [],
    send_notes: values.send_notes || '',
  }
}
