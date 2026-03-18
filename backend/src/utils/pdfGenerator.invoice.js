'use strict';

const PDFDocument = require('pdfkit');

const COLOR_PRIMARY = '#1a6b4a';
const COLOR_MUTED = '#666666';
const COLOR_TEXT = '#222222';
const COLOR_TABLE_HEADER = '#1a6b4a';
const COLOR_ALT_ROW = '#f5fbf8';
const COLOR_BORDER = '#c0d8cc';
const PAGE_MARGINS = { top: 50, bottom: 60, left: 55, right: 55 };

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function currency(val) {
  return `₹${parseFloat(val || 0).toFixed(2)}`;
}

function sectionHeader(doc, title) {
  doc.moveDown(0.5).fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(9).text(title.toUpperCase()).fillColor(COLOR_TEXT);
  const y = doc.y + 2;
  doc.moveTo(PAGE_MARGINS.left, y).lineTo(doc.page.width - PAGE_MARGINS.right, y).strokeColor(COLOR_PRIMARY).lineWidth(0.75).stroke().moveDown(0.4);
}

function labelValue(doc, label, value) {
  doc.font('Helvetica-Bold').fontSize(8.5).text(`${label}: `, { continued: true }).font('Helvetica').text(value || '—');
}

async function generateInvoicePdf({ invoice, hospital, patient }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: PAGE_MARGINS, info: { Title: `Invoice ${invoice.invoice_number || ''}`, Author: hospital?.name || 'GyneCRM' } });
    const buffers = [];
    doc.on('data', (c) => buffers.push(c));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const usableW = doc.page.width - PAGE_MARGINS.left - PAGE_MARGINS.right;

    // ── Hospital header ────────────────────────────────────────────────────────
    doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(16).text(hospital?.name || 'Gynecology Hospital', { align: 'center' });
    doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(8).text(hospital?.address || '', { align: 'center' });
    doc.text(`Phone: ${hospital?.phone || '—'} | Email: ${hospital?.email || '—'}`, { align: 'center' }).moveDown(0.4);

    doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(14)
      .text(invoice.invoice_number ? `TAX INVOICE  #${invoice.invoice_number}` : 'DRAFT INVOICE', { align: 'center' });
    doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(8).text(`Date: ${fmt(invoice.created_at)}`, { align: 'center' }).moveDown(0.6);

    // Divider
    doc.moveTo(PAGE_MARGINS.left, doc.y).lineTo(doc.page.width - PAGE_MARGINS.right, doc.y).strokeColor(COLOR_PRIMARY).lineWidth(1.5).stroke().moveDown(0.6);

    // ── Patient details ────────────────────────────────────────────────────────
    sectionHeader(doc, 'Bill To');
    labelValue(doc, 'Patient', patient?.full_name);
    labelValue(doc, 'Phone', patient?.phone);
    if (invoice.branch_name) labelValue(doc, 'Branch', invoice.branch_name);
    doc.moveDown(0.5);

    // ── Status badge ───────────────────────────────────────────────────────────
    const statusColor = invoice.status === 'paid' ? '#1a6b4a' : invoice.status === 'void' ? '#cc2222' : '#b07800';
    doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(9).text(`STATUS: ${invoice.status.toUpperCase()}`, { align: 'right' }).fillColor(COLOR_TEXT).moveDown(0.3);

    // ── Line items table ───────────────────────────────────────────────────────
    sectionHeader(doc, 'Invoice Items');

    const COL = { item: usableW * 0.45, qty: usableW * 0.08, price: usableW * 0.15, disc: usableW * 0.12, tax: usableW * 0.10, total: usableW * 0.10 };
    const HEADERS = ['Item / Service', 'Qty', 'Unit Price', 'Discount', 'Tax', 'Total'];
    const WIDTHS = Object.values(COL);
    const ROW_H = 20;
    let tableY = doc.y;

    // Header row
    doc.rect(PAGE_MARGINS.left, tableY, usableW, ROW_H).fillColor(COLOR_TABLE_HEADER).fill();
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7.5);
    let xPos = PAGE_MARGINS.left;
    HEADERS.forEach((h, i) => { doc.text(h, xPos + 3, tableY + 6, { width: WIDTHS[i] - 6, lineBreak: false }); xPos += WIDTHS[i]; });
    tableY += ROW_H;

    // Data rows
    const items = invoice.items || [];
    items.forEach((item, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : COLOR_ALT_ROW;
      doc.rect(PAGE_MARGINS.left, tableY, usableW, ROW_H).fillColor(bg).fill();
      doc.rect(PAGE_MARGINS.left, tableY, usableW, ROW_H).strokeColor(COLOR_BORDER).lineWidth(0.3).stroke();
      doc.fillColor(COLOR_TEXT).font('Helvetica').fontSize(7.5);

      const cells = [
        item.item_name,
        String(item.quantity || 1),
        currency(item.unit_price),
        currency(item.discount_amount),
        currency(item.tax_amount),
        currency(item.line_total || item.total_price),
      ];
      xPos = PAGE_MARGINS.left;
      cells.forEach((cell, i) => { doc.text(cell, xPos + 3, tableY + 6, { width: WIDTHS[i] - 6, lineBreak: false }); xPos += WIDTHS[i]; });
      tableY += ROW_H;
    });

    doc.y = tableY + 6;

    // ── Totals ─────────────────────────────────────────────────────────────────
    doc.moveDown(0.3);
    const totalsX = PAGE_MARGINS.left + usableW * 0.60;
    const totalsW = usableW * 0.40;

    function totalRow(label, val, bold = false) {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
        .text(label, totalsX, doc.y, { width: totalsW * 0.55, lineBreak: false })
        .text(val, totalsX + totalsW * 0.55, doc.y - doc.currentLineHeight(), { width: totalsW * 0.45, align: 'right' })
        .moveDown(0.2);
    }

    totalRow('Subtotal', currency(invoice.subtotal));
    totalRow('Discount', `- ${currency(invoice.discount_amount)}`);
    totalRow('Tax', currency(invoice.tax_amount));
    doc.moveTo(totalsX, doc.y).lineTo(totalsX + totalsW, doc.y).strokeColor(COLOR_PRIMARY).lineWidth(0.5).stroke().moveDown(0.2);
    totalRow('TOTAL', currency(invoice.total_amount), true);
    totalRow('Paid', currency(invoice.paid_amount));
    const remaining = parseFloat(invoice.total_amount || 0) - parseFloat(invoice.paid_amount || 0);
    if (remaining > 0) totalRow('Balance Due', currency(remaining.toFixed(2)));

    // ── Notes ──────────────────────────────────────────────────────────────────
    if (invoice.notes) {
      doc.moveDown(0.8);
      sectionHeader(doc, 'Notes');
      doc.font('Helvetica').fontSize(8).text(invoice.notes);
    }

    // ── Footer ─────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - PAGE_MARGINS.bottom + 10;
    doc.fillColor('#aaaaaa').font('Helvetica').fontSize(7)
      .text(`Invoice generated by ${hospital?.name || 'GyneCRM'} | ID: ${invoice.id} | Generated: ${fmt(new Date())}`, PAGE_MARGINS.left, footerY, { width: usableW, align: 'center' });

    doc.end();
  });
}

module.exports = { generateInvoicePdf };
