export function formatCurrency(amount, currency = 'INR') {
  const numericValue = Number(amount)
  if (!Number.isFinite(numericValue)) return '--'

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(numericValue)
}

export function formatInvoiceNumber(invoice) {
  return invoice?.invoice_number || invoice?.invoiceNumber || invoice?._id || '--'
}
