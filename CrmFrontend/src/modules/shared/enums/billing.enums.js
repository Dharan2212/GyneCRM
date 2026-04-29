export const INVOICE_STATUS_LABELS = Object.freeze({
  draft: 'Draft',
  issued: 'Issued',
  finalized: 'Issued',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  void: 'Voided',
  voided: 'Voided',
})

export const PAYMENT_METHOD_LABELS = Object.freeze({
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  insurance: 'Insurance',
  online: 'Online',
  other: 'Other',
})

export const PAYMENT_STATUS_LABELS = Object.freeze({
  recorded: 'Recorded',
  confirmed: 'Confirmed',
  failed: 'Failed',
  reversed: 'Reversed',
})

export const INVOICE_SEND_STATUS_LABELS = Object.freeze({
  not_sent: 'Not Sent',
  sent: 'Sent',
})

export const INVOICE_ITEM_TYPE_LABELS = Object.freeze({
  consultation: 'Consultation',
  procedure: 'Procedure',
  medicine: 'Medicine',
  lab_test: 'Lab Test',
  document: 'Document',
  service: 'Service',
  other: 'Other',
})

export const INVOICE_ITEM_STATUS_LABELS = Object.freeze({
  active: 'Active',
  cancelled: 'Cancelled',
  waived: 'Waived',
})

export const SEND_CHANNEL_LABELS = Object.freeze({
  print: 'Print',
  whatsapp: 'WhatsApp',
  email: 'Email',
  sms: 'SMS',
})
