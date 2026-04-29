const roundMoney = (value) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round((parsed + Number.EPSILON) * 100) / 100;
};

function isEffectivePaymentStatus(status) {
  return status !== 'failed' && status !== 'reversed';
}

function getEffectivePaymentAmount(payment = {}) {
  if (!isEffectivePaymentStatus(payment.status || 'recorded')) {
    return 0;
  }

  return roundMoney(payment.amount);
}

function deriveInvoiceStatus(invoice = {}, projectedAmountPaid = null) {
  if (invoice.void_status || invoice.status === 'void') {
    return 'void';
  }

  const totalAmount = roundMoney(invoice.total_amount);
  const amountPaid = projectedAmountPaid === null ? roundMoney(invoice.amount_paid) : roundMoney(projectedAmountPaid);

  if (amountPaid <= 0) {
    return 'issued';
  }

  if (amountPaid >= totalAmount && totalAmount > 0) {
    return 'paid';
  }

  if (amountPaid > 0 && amountPaid < totalAmount) {
    return 'partially_paid';
  }

  return invoice.status || 'draft';
}

module.exports = {
  roundMoney,
  isEffectivePaymentStatus,
  getEffectivePaymentAmount,
  deriveInvoiceStatus,
};
