import { formatDateTime, formatStatusLabel } from './formatters/index.js'

const CHANNEL_LABELS = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  sms: 'SMS',
  print: 'Print',
  manual: 'Manual',
}

const SOURCE_LABELS = {
  prescription: 'Prescription',
  test_order: 'Test Result',
  patient_document: 'Document',
  invoice: 'Invoice',
}

export function adaptSendHistoryItem(item = {}) {
  const patientSummary = item.patient_summary || {}
  const sourceSummary = item.source_summary || {}

  return {
    id: item._id || item.id || null,
    patientId: patientSummary._id || item.patient_id || null,
    patientName: patientSummary.full_name || 'Patient',
    sourceType: item.source_type || item.entity_type || sourceSummary.source_type || 'custom',
    sourceTypeLabel: SOURCE_LABELS[item.source_type || sourceSummary.source_type] || formatStatusLabel(item.source_type || sourceSummary.source_type || 'custom'),
    sourceNumber: item.source_number || sourceSummary.source_number || null,
    channel: item.channel || 'manual',
    channelLabel: CHANNEL_LABELS[item.channel] || formatStatusLabel(item.channel || 'manual'),
    status: item.status || 'requested',
    statusLabel: formatStatusLabel(item.status || 'requested'),
    requestedAt: item.requested_at || item.sent_at || item.sentAt || null,
    requestedAtLabel: formatDateTime(item.requested_at || item.sent_at || item.sentAt),
    sentAt: item.sent_at || item.sentAt || null,
    sentAtLabel: formatDateTime(item.sent_at || item.sentAt),
    messageSummary: item.message_summary || item.meta?.message_summary || '',
    meta: item.meta || item.metadata || {},
    raw: item,
  }
}
