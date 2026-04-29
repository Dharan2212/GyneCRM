import { formatDate, formatDateTime } from '../shared/formatters/dateTime.js'
import { formatStatusLabel } from '../shared/formatters/status.formatters.js'

function getSafeFileMetadata(file) {
  if (!file) {
    return {
      original_file_name: '',
      mime_type: '',
      file_size_bytes: 0,
    }
  }

  return {
    original_file_name: file.name || '',
    mime_type: file.type || 'application/octet-stream',
    file_size_bytes: Number(file.size || 0),
  }
}

export function mapUploadUrlPayload({ file, testOrderId, documentType = 'test_result' } = {}) {
  const fileMeta = getSafeFileMetadata(file)

  return {
    document_type: documentType,
    test_order_id: testOrderId || null,
    ...fileMeta,
  }
}

export function adaptUploadUrlFoundation(payload = {}) {
  return {
    mode: payload.mode || 'foundation_only',
    uploadMethod: payload.upload_method || 'direct_upload_placeholder',
    storageProvider: payload.storage_provider || 'local',
    storageBucket: payload.storage_bucket || 'pending-config',
    storageKey: payload.storage_key || '',
    expiresInSeconds: payload.expires_in_seconds || null,
    headers: payload.headers || {},
    metadata: payload.metadata || {},
    constraints: payload.constraints || {},
    finalizeRequired: Boolean(payload.finalize_required),
    raw: payload,
  }
}

export function adaptDocumentItem(document = {}) {
  const patientSummary = document.patient_summary || {}
  const testOrderSummary = document.test_order_summary || {}
  const doctorReview = document.doctor_review || {}

  return {
    id: document._id || document.id || null,
    patientId: patientSummary._id || document.patient_id || null,
    testOrderId: testOrderSummary._id || document.test_order_id || null,
    title: document.title || document.file_name || 'Untitled Document',
    documentType: document.document_type || 'other',
    documentTypeLabel: formatStatusLabel(document.document_type || 'other'),
    reviewStatus: doctorReview.review_status || document.review_status || 'not_required',
    reviewStatusLabel: formatStatusLabel(doctorReview.review_status || document.review_status || 'not_required'),
    uploadStatus: document.upload_status || 'uploaded',
    uploadStatusLabel: formatStatusLabel(document.upload_status || 'uploaded'),
    abnormalFlag: Boolean(doctorReview.abnormal_flag),
    findingsSummary: doctorReview.findings_summary || '',
    remarks: doctorReview.remarks || '',
    actionRequired: Boolean(doctorReview.action_required),
    testDateLabel: formatDate(document.test_date),
    reviewedAtLabel: formatDateTime(doctorReview.reviewed_at || document.reviewed_at),
    uploadedAtLabel: formatDateTime(document.uploaded_at),
    raw: document,
  }
}

export function mapDocumentCreatePayload(values = {}) {
  return {
    patient_id: values.patient_id || null,
    doctor_id: values.doctor_id || null,
    consultation_id: values.consultation_id || null,
    test_order_id: values.test_order_id || null,
    document_type: values.document_type || 'report',
    category: values.category || 'other',
    title: values.title || '',
    file_name: values.file_name || values.original_file_name || '',
    mime_type: values.mime_type || '',
    file_size_bytes: values.file_size_bytes || null,
    s3_key: values.s3_key || null,
    storage_provider: values.storage_provider || 's3',
    upload_status: values.upload_status || 'uploaded',
  }
}

export function mapReceptionDocumentCreatePayload({ order, foundation, values = {}, file } = {}) {
  const fileMeta = getSafeFileMetadata(file)
  const metadata = foundation?.metadata || {}

  return {
    patient_id: order?.patientId || order?.raw?.patient_id || null,
    doctor_id: order?.doctorId || order?.raw?.doctor_id || null,
    consultation_id: order?.consultationId || order?.raw?.consultation_id || null,
    appointment_id: order?.appointmentId || order?.raw?.appointment_id || null,
    test_order_id: order?.id || order?.raw?._id || null,
    document_type: metadata.document_type || 'test_result',
    category: values.category || 'lab',
    title: values.title || `${order?.testName || 'Test'} Result`,
    description: values.description || '',
    clinical_summary: values.clinical_summary || '',
    original_file_name: fileMeta.original_file_name,
    file_name: fileMeta.original_file_name,
    mime_type: fileMeta.mime_type,
    file_size_bytes: fileMeta.file_size_bytes,
    s3_key: foundation?.storageKey || foundation?.storage_key || null,
    storage_provider: foundation?.storageProvider || foundation?.storage_provider || 'local',
    storage_bucket: foundation?.storageBucket || foundation?.storage_bucket || null,
    upload_status: values.upload_status || 'pending',
    foundation_mode: foundation?.mode || foundation?.raw?.mode || 'foundation_only',
  }
}
