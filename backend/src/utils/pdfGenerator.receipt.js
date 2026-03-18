'use strict';

const PDFDocument = require('pdfkit');

const COLOR_PRIMARY = '#1a6b4a';
const COLOR_MUTED = '#666666';
const COLOR_TEXT = '#222222';
const PAGE_MARGINS = { top: 50, bottom: 60, left: 55, right: 55 };

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

function currency(val) { return `₹${parseFloat(val || 0).toFixed(2)}`; }

function labelValue(doc, label, value, opts = {}) {
  doc.font('Helvetica-Bold').fontSize(9).text(`${label}:  `, { continued: true, ...opts }).font('Helvetica').text(value || '—', opts);
}

/**
 * Generate a payment receipt PDF.
 *
 * @param {object} params
 * @param {object} params.invoice  - Full invoice with items, payments, computed fields
 * @param {object} params.hospital
 * @param {object} params.patient
 */
async function generateReceiptPdf({ invoice, hospital, patient }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margins: PAGE_MARGINS, info: { Title: `Receipt — ${invoice.invoice_number || ''}`, Author: hospital?.name || 'GyneCRM' } });
    const buffers = [];
    doc.on('data', (c) => buffers.push(c));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const usableW = doc.page.width - PAGE_MARGINS.left - PAGE_MARGINS.right;

    // ── Header ─────────────────────────────────────────────────────────────────
    doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(14)
      .text(hospital?.name || 'GyneCRM', { align: 'center' });
    doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(7.5)
      .text(hospital?.address || '', { align: 'center' })
      .text(`Phone: ${hospital?.phone || '—'}`, { align: 'center' }).moveDown(0.4);

    doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(13).text('PAYMENT RECEIPT', { align: 'center' });
    doc.moveTo(PAGE_MARGINS.left, doc.y + 4).lineTo(doc.page.width - PAGE_MARGINS.right, doc.y + 4).strokeColor(COLOR_PRIMARY).lineWidth(1.5).stroke().moveDown(0.8);

    // ── Receipt details ────────────────────────────────────────────────────────
    doc.fillColor(COLOR_TEXT);
    labelValue(doc, 'Invoice No.', invoice.invoice_number || '—');
    labelValue(doc, 'Patient', patient?.full_name);
    labelValue(doc, 'Receipt Date', fmt(new Date()));
    doc.moveDown(0.6);

    // ── Payment rows ───────────────────────────────────────────────────────────
    const positivePayments = (invoice.payments || []).filter((p) => parseFloat(p.amount) > 0);
    if (positivePayments.length > 0) {
      doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(8.5).text('PAYMENT DETAILS').fillColor(COLOR_TEXT).moveDown(0.3);

      positivePayments.forEach((p) => {
        doc.font('Helvetica').fontSize(8.5)
          .text(`${fmt(p.payment_date)}  |  ${(p.payment_mode || '').toUpperCase()}${p.reference_number ? '  |  Ref: ' + p.reference_number : ''}`)
          .font('Helvetica-Bold').text(currency(p.amount), { align: 'right' })
          .moveDown(0.2);
      });
    }

    doc.moveDown(0.5);

    // ── Totals ─────────────────────────────────────────────────────────────────
    doc.moveTo(PAGE_MARGINS.left, doc.y).lineTo(doc.page.width - PAGE_MARGINS.right, doc.y).strokeColor(COLOR_PRIMARY).lineWidth(0.5).stroke().moveDown(0.4);

    function totalLine(label, val, bold = false) {
      const fnt = bold ? 'Helvetica-Bold' : 'Helvetica';
      doc.font(fnt).fontSize(9)
        .text(label, PAGE_MARGINS.left, doc.y, { width: usableW * 0.6, lineBreak: false })
        .text(val, PAGE_MARGINS.left + usableW * 0.6, doc.y - doc.currentLineHeight(), { width: usableW * 0.4, align: 'right' })
        .moveDown(0.25);
    }

    totalLine('Invoice Total', currency(invoice.total_amount));
    totalLine('Amount Paid', currency(invoice.paid_amount), true);

    const balance = parseFloat(invoice.total_amount || 0) - parseFloat(invoice.paid_amount || 0);
    if (balance > 0.005) {
      totalLine('Balance Remaining', currency(balance.toFixed(2)));
    }

    const comp = invoice.computed;
    if (comp?.total_refunded > 0) {
      totalLine('Total Refunded', `- ${currency(comp.total_refunded)}`);
    }

    // ── Status ─────────────────────────────────────────────────────────────────
    doc.moveDown(0.5);
    const statusColor = invoice.status === 'paid' ? COLOR_PRIMARY : '#b07800';
    doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(10).text(`INVOICE STATUS: ${invoice.status.toUpperCase()}`, { align: 'center' }).fillColor(COLOR_TEXT);

    // ── Footer ─────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - PAGE_MARGINS.bottom + 10;
    doc.fillColor('#aaaaaa').font('Helvetica').fontSize(6.5)
      .text(`Thank you for choosing ${hospital?.name || 'us'}. This is a computer-generated receipt. | Invoice ID: ${invoice.id}`, PAGE_MARGINS.left, footerY, { width: usableW, align: 'center' });

    doc.end();
  });
}

module.exports = { generateReceiptPdf };
