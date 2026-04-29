function applyInvoiceSendState(invoice, payload = {}, actorId = null) {
  const nextChannels = Array.from(new Set([...(invoice.send_channels || []), ...(payload.send_channels || [])]));

  invoice.send_status = 'sent';
  invoice.send_channels = nextChannels;
  invoice.sent_at = new Date();
  invoice.sent_by = actorId || null;
  invoice.send_notes = payload.send_notes || null;

  return invoice;
}

module.exports = {
  applyInvoiceSendState,
};
