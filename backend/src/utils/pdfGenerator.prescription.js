'use strict';

/**
 * Prescription PDF Generator
 *
 * Generates a formatted, production-grade prescription document using PDFKit.
 * Matches style conventions from pdfGenerator.consultation.js (Batch 1).
 *
 * Architecture reference: Part 5.2 (PDF content requirements)
 * - Hospital header (logo/name/address)
 * - Patient details
 * - Doctor name + registration number
 * - Issue date
 * - Medicine table (medicine name, dosage, frequency, duration, route, instructions)
 * - Doctor signature placeholder
 */

const PDFDocument = require('pdfkit');

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

function val(v) {
  return v != null && v !== '' ? String(v) : '—';
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const COLOR_PRIMARY = '#1a6b4a';
const COLOR_HEADER_BG = '#f0f7f4';
const COLOR_TABLE_HEADER_BG = '#1a6b4a';
const COLOR_TABLE_ROW_ALT = '#f5fbf8';
const COLOR_BORDER = '#c0d8cc';
const COLOR_TEXT = '#222222';
const COLOR_MUTED = '#666666';

const PAGE_MARGINS = { top: 50, bottom: 60, left: 55, right: 55 };

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawHRule(doc, yOverride) {
  const y = yOverride !== undefined ? yOverride : doc.y;
  doc
    .moveTo(PAGE_MARGINS.left, y)
    .lineTo(doc.page.width - PAGE_MARGINS.right, y)
    .strokeColor(COLOR_BORDER)
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(0.4);
}

function sectionHeader(doc, title) {
  doc.moveDown(0.5);
  doc
    .fillColor(COLOR_PRIMARY)
    .font('Helvetica-Bold')
    .fontSize(9.5)
    .text(title.toUpperCase());
  doc.fillColor(COLOR_TEXT);
  const lineY = doc.y + 2;
  doc
    .moveTo(PAGE_MARGINS.left, lineY)
    .lineTo(doc.page.width - PAGE_MARGINS.right, lineY)
    .strokeColor(COLOR_PRIMARY)
    .lineWidth(0.75)
    .stroke();
  doc.moveDown(0.5);
}

function labelValue(doc, label, value) {
  doc
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .fillColor(COLOR_TEXT)
    .text(`${label}: `, { continued: true })
    .font('Helvetica')
    .text(val(value));
}

// ─── Medicine table ───────────────────────────────────────────────────────────

/**
 * Draw the medicines table.
 * Columns: #, Medicine, Dosage, Frequency, Duration, Route
 * Instructions appear as a sub-row if present.
 */
function drawMedicinesTable(doc, items) {
  const usableWidth = doc.page.width - PAGE_MARGINS.left - PAGE_MARGINS.right;

  // Column widths (proportional)
  const cols = {
    num: 24,
    name: usableWidth * 0.30,
    dosage: usableWidth * 0.13,
    freq: usableWidth * 0.16,
    duration: usableWidth * 0.14,
    route: usableWidth * 0.12,
  };
  // Allocate remaining width to name
  const totalFixed =
    cols.num + cols.dosage + cols.freq + cols.duration + cols.route;
  cols.name = usableWidth - totalFixed;

  const ROW_HEIGHT = 22;
  const INSTR_ROW_HEIGHT = 14;
  const FONT_SIZE = 8;
  const HEADER_FONT_SIZE = 8;

  // ── Table header ──
  let x = PAGE_MARGINS.left;
  const headerY = doc.y;

  // Header background
  doc
    .rect(PAGE_MARGINS.left, headerY, usableWidth, ROW_HEIGHT)
    .fillColor(COLOR_TABLE_HEADER_BG)
    .fill();

  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(HEADER_FONT_SIZE);

  const headers = ['#', 'Medicine', 'Dosage', 'Frequency', 'Duration', 'Route'];
  const colWidths = [
    cols.num,
    cols.name,
    cols.dosage,
    cols.freq,
    cols.duration,
    cols.route,
  ];

  let xPos = PAGE_MARGINS.left;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], xPos + 4, headerY + 7, {
      width: colWidths[i] - 8,
      lineBreak: false,
    });
    xPos += colWidths[i];
  }

  let rowY = headerY + ROW_HEIGHT;

  // ── Data rows ──
  items.forEach((item, idx) => {
    const isAlt = idx % 2 !== 0;
    const bgColor = isAlt ? COLOR_TABLE_ROW_ALT : '#ffffff';

    // Estimate if instructions row is needed
    const hasInstructions = item.instructions && item.instructions.trim().length > 0;
    const totalRowH = ROW_HEIGHT + (hasInstructions ? INSTR_ROW_HEIGHT : 0);

    // Row background
    doc.rect(PAGE_MARGINS.left, rowY, usableWidth, totalRowH).fillColor(bgColor).fill();

    // Row border
    doc
      .rect(PAGE_MARGINS.left, rowY, usableWidth, totalRowH)
      .strokeColor(COLOR_BORDER)
      .lineWidth(0.3)
      .stroke();

    doc.fillColor(COLOR_TEXT).font('Helvetica').fontSize(FONT_SIZE);

    const cells = [
      String(idx + 1),
      item.medicine_name,
      item.dosage,
      item.frequency,
      item.duration,
      item.route || '—',
    ];

    xPos = PAGE_MARGINS.left;
    for (let i = 0; i < cells.length; i++) {
      doc.text(cells[i], xPos + 4, rowY + 7, {
        width: colWidths[i] - 8,
        lineBreak: false,
      });
      xPos += colWidths[i];
    }

    // Instructions sub-row
    if (hasInstructions) {
      doc
        .fillColor(COLOR_MUTED)
        .font('Helvetica-Oblique')
        .fontSize(7.5)
        .text(`   ↳ ${item.instructions}`, PAGE_MARGINS.left + 4, rowY + ROW_HEIGHT + 2, {
          width: usableWidth - 10,
          lineBreak: false,
        });
    }

    rowY += totalRowH;
  });

  // Move doc cursor to after table
  doc.moveDown(0.2);
  doc.y = rowY + 8;
}

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * Generate a prescription PDF as a Buffer.
 *
 * @param {object} params
 * @param {object} params.prescription  - Prescription row from DB
 * @param {object} params.patient       - Patient row from DB
 * @param {object} params.doctor        - doctor + user joined row
 * @param {object} params.hospital      - Hospital row from DB
 * @param {Array}  params.items         - Prescription items array
 * @returns {Promise<Buffer>}
 */
async function generatePrescriptionPdf({ prescription, patient, doctor, hospital, items = [] }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: PAGE_MARGINS,
      info: {
        Title: `Prescription — ${patient?.full_name || 'Patient'}`,
        Author: hospital?.name || 'GyneCRM',
        Subject: 'Medical Prescription',
        Creator: 'GyneCRM System',
      },
    });

    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const usableW = pageW - PAGE_MARGINS.left - PAGE_MARGINS.right;

    // ── Hospital header block ─────────────────────────────────────────────────
    const headerBlockY = PAGE_MARGINS.top;
    const headerBlockH = 80;

    doc
      .rect(PAGE_MARGINS.left, headerBlockY, usableW, headerBlockH)
      .fillColor(COLOR_HEADER_BG)
      .fill();

    // Hospital name
    doc
      .fillColor(COLOR_PRIMARY)
      .font('Helvetica-Bold')
      .fontSize(17)
      .text(hospital?.name || 'Gynecology Hospital', PAGE_MARGINS.left + 12, headerBlockY + 12, {
        width: usableW - 24,
        align: 'left',
      });

    doc
      .fillColor(COLOR_MUTED)
      .font('Helvetica')
      .fontSize(8)
      .text(hospital?.address || '', PAGE_MARGINS.left + 12, doc.y, {
        width: usableW - 24,
        lineBreak: false,
      });
    doc.moveDown(0.15);
    doc
      .text(
        `Phone: ${hospital?.phone || '—'}  |  Email: ${hospital?.email || '—'}`,
        PAGE_MARGINS.left + 12,
        doc.y,
        { width: usableW - 24, lineBreak: false }
      );

    // PRESCRIPTION label (right-aligned in header)
    doc
      .fillColor(COLOR_PRIMARY)
      .font('Helvetica-Bold')
      .fontSize(13)
      .text('PRESCRIPTION', PAGE_MARGINS.left, headerBlockY + 20, {
        width: usableW - 12,
        align: 'right',
      });

    doc
      .fillColor(COLOR_MUTED)
      .font('Helvetica')
      .fontSize(8)
      .text(`Date: ${formatDate(prescription.issued_at || prescription.created_at)}`, PAGE_MARGINS.left, headerBlockY + 38, {
        width: usableW - 12,
        align: 'right',
      });

    // Bottom border of header
    doc
      .moveTo(PAGE_MARGINS.left, headerBlockY + headerBlockH)
      .lineTo(pageW - PAGE_MARGINS.right, headerBlockY + headerBlockH)
      .strokeColor(COLOR_PRIMARY)
      .lineWidth(1.5)
      .stroke();

    doc.y = headerBlockY + headerBlockH + 14;

    // ── Patient + Doctor two-column block ─────────────────────────────────────
    const colW = (usableW - 16) / 2;
    const blockStartY = doc.y;

    // Patient column
    doc
      .fillColor(COLOR_PRIMARY)
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text('PATIENT DETAILS', PAGE_MARGINS.left, blockStartY, { width: colW });

    doc.fillColor(COLOR_TEXT).font('Helvetica').fontSize(8.5);
    const patientLines = [
      ['Name', patient?.full_name],
      ['DOB', formatDate(patient?.dob)],
      ['Phone', patient?.phone],
      ['Blood Group', patient?.blood_group],
    ];

    let leftY = doc.y + 2;
    for (const [label, value] of patientLines) {
      doc
        .font('Helvetica-Bold')
        .text(`${label}: `, PAGE_MARGINS.left, leftY, { continued: true, width: colW })
        .font('Helvetica')
        .text(val(value), { width: colW });
      leftY = doc.y;
    }

    // Doctor column (right)
    const rightColX = PAGE_MARGINS.left + colW + 16;
    doc
      .fillColor(COLOR_PRIMARY)
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text('PRESCRIBING DOCTOR', rightColX, blockStartY, { width: colW });

    doc.fillColor(COLOR_TEXT).fontSize(8.5);
    const doctorLines = [
      ['Name', doctor?.doctor_name ? `Dr. ${doctor.doctor_name}` : '—'],
      ['Specialisation', doctor?.specialisation],
      ['Reg. No.', doctor?.registration_number],
      ['Qualification', doctor?.qualification],
    ];

    let rightY = blockStartY + 12;
    for (const [label, value] of doctorLines) {
      doc
        .font('Helvetica-Bold')
        .text(`${label}: `, rightColX, rightY, { continued: true, width: colW })
        .font('Helvetica')
        .text(val(value), { width: colW });
      rightY = doc.y;
    }

    // Sync cursor to whichever column is lower
    doc.y = Math.max(leftY, rightY) + 10;

    drawHRule(doc);

    // ── Prescription notes (if any) ───────────────────────────────────────────
    if (prescription.notes && prescription.notes.trim()) {
      sectionHeader(doc, 'Clinical Notes');
      doc.font('Helvetica').fontSize(8.5).fillColor(COLOR_TEXT).text(prescription.notes);
      doc.moveDown(0.5);
    }

    // ── Medicines table ───────────────────────────────────────────────────────
    sectionHeader(doc, 'Prescribed Medicines');

    if (items.length === 0) {
      doc
        .fillColor(COLOR_MUTED)
        .font('Helvetica-Oblique')
        .fontSize(8.5)
        .text('No medicines prescribed.')
        .moveDown(0.5);
    } else {
      drawMedicinesTable(doc, items);
    }

    doc.moveDown(1);

    // ── Void notice (if prescription is voided) ───────────────────────────────
    if (prescription.status === 'void') {
      const voidY = doc.y;
      doc
        .rect(PAGE_MARGINS.left, voidY, usableW, 36)
        .fillColor('#fff3f3')
        .fill();
      doc
        .fillColor('#cc2222')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('⚠ VOIDED PRESCRIPTION', PAGE_MARGINS.left + 10, voidY + 6)
        .font('Helvetica')
        .fontSize(8)
        .text(`Reason: ${prescription.void_reason || '—'}`, PAGE_MARGINS.left + 10, voidY + 20)
        .fillColor(COLOR_TEXT);
      doc.y = voidY + 44;
    }

    // ── Reissue trace (if this is a reissued prescription) ───────────────────
    if (prescription.reissued_from_id) {
      doc
        .fillColor(COLOR_MUTED)
        .font('Helvetica-Oblique')
        .fontSize(7.5)
        .text(
          `This prescription was issued as a correction to: ${prescription.reissued_from_id}`,
          PAGE_MARGINS.left
        )
        .moveDown(0.5);
    }

    // ── Doctor signature block ────────────────────────────────────────────────
    doc.moveDown(1.5);
    const sigBlockY = doc.y;

    // Right-aligned signature area
    const sigAreaX = pageW - PAGE_MARGINS.right - 180;

    doc
      .moveTo(sigAreaX, sigBlockY + 40)
      .lineTo(sigAreaX + 170, sigBlockY + 40)
      .strokeColor('#888888')
      .lineWidth(0.5)
      .stroke();

    doc
      .fillColor(COLOR_MUTED)
      .font('Helvetica')
      .fontSize(8)
      .text(`Dr. ${doctor?.doctor_name || ''}`, sigAreaX, sigBlockY + 44, {
        width: 170,
        align: 'center',
      })
      .text(doctor?.qualification || '', sigAreaX, doc.y, { width: 170, align: 'center' })
      .text(`Reg. No: ${doctor?.registration_number || '—'}`, sigAreaX, doc.y, {
        width: 170,
        align: 'center',
      })
      .text('Authorised Signature', sigAreaX, doc.y, { width: 170, align: 'center' });

    // ── Page footer ───────────────────────────────────────────────────────────
    const footerY = doc.page.height - PAGE_MARGINS.bottom + 10;
    doc
      .fillColor('#aaaaaa')
      .font('Helvetica')
      .fontSize(7)
      .text(
        `This is a computer-generated prescription from ${hospital?.name || 'GyneCRM'}. ` +
          `Prescription ID: ${prescription.id}. ` +
          `Generated: ${formatDateTime(new Date())}. ` +
          `This document is valid only if issued by a registered medical practitioner.`,
        PAGE_MARGINS.left,
        footerY,
        {
          width: usableW,
          align: 'center',
        }
      );

    doc.end();
  });
}

module.exports = { generatePrescriptionPdf };
