function buildInvoicePdfPayload(invoice) {
  const patient = invoice.patient_summary || (invoice.patient_id && typeof invoice.patient_id === 'object'
    ? {
        _id: invoice.patient_id._id,
        full_name: invoice.patient_id.full_name,
        patient_code: invoice.patient_id.patient_code,
      }
    : null);

  const doctor = invoice.doctor_summary || (invoice.doctor_id && typeof invoice.doctor_id === 'object'
    ? {
        _id: invoice.doctor_id._id,
        full_name: invoice.doctor_id.full_name,
        speciality: invoice.doctor_id.speciality,
      }
    : null);

  const invoiceLabel = invoice.invoice_number || `DRAFT-${String(invoice._id).slice(-6).toUpperCase()}`;

  return {
    mode: 'pdf_foundation_payload',
    filename: `${invoiceLabel}.pdf`,
    content_type: 'application/json',
    invoice: {
      _id: invoice._id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      status: invoice.status,
      currency: invoice.currency,
      subtotal_amount: invoice.subtotal_amount,
      discount_amount: invoice.discount_amount,
      tax_amount: invoice.tax_amount,
      total_amount: invoice.total_amount,
      amount_paid: invoice.amount_paid,
      amount_due: invoice.amount_due,
      notes: invoice.notes,
      total_items: invoice.total_items || (Array.isArray(invoice.items) ? invoice.items.length : 0),
    },
    patient,
    doctor,
    linked_summary: invoice.linked_summary || null,
    items: Array.isArray(invoice.items) ? invoice.items : [],
    payments: Array.isArray(invoice.payments) ? invoice.payments : [],
  };
}

module.exports = {
  buildInvoicePdfPayload,
};
