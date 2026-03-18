'use strict';

/**
 * Consultation Summary PDF Generator
 *
 * Uses PDFKit to generate a formatted consultation summary document.
 * Called by consultation.service.js → getConsultationPdf().
 *
 * The generated buffer is uploaded to S3 by the service.
 * All date formatting is UTC-safe.
 */

const PDFDocument = require('pdfkit');

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
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

function safeJson(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

function labelValue(doc, label, value, { indent = 72, y = null } = {}) {
  const yPos = y !== null ? y : doc.y;
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(`${label}: `, { continued: true })
    .font('Helvetica')
    .text(value || '—');
}

function sectionHeader(doc, title) {
  doc
    .moveDown(0.5)
    .fillColor('#1a6b4a')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(title.toUpperCase(), { underline: false })
    .fillColor('#000000')
    .moveDown(0.25);

  // Horizontal rule
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor('#c0d8cc')
    .lineWidth(0.5)
    .stroke()
    .moveDown(0.4);
}

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * Generate a consultation summary PDF as a Buffer.
 *
 * @param {object} params
 * @param {object} params.consultation - Full consultation row from DB
 * @param {object} params.patient      - Patient row from DB
 * @param {object} params.doctor       - Joined doctor+user row
 * @param {object} params.hospital     - Hospital row from DB
 * @returns {Promise<Buffer>}
 */
async function generateConsultationPdf({ consultation, patient, doctor, hospital }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 55, right: 55 },
      info: {
        Title: `Consultation Summary — ${patient?.full_name || 'Patient'}`,
        Author: hospital?.name || 'GyneCRM',
        Subject: 'Consultation Summary',
        Creator: 'GyneCRM System',
      },
    });

    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // ── Header ────────────────────────────────────────────────────────────────
    doc
      .fillColor('#1a6b4a')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(hospital?.name || 'Gynecology Hospital', { align: 'center' })
      .fillColor('#444444')
      .font('Helvetica')
      .fontSize(9)
      .text(hospital?.address || '', { align: 'center' })
      .text(`Phone: ${hospital?.phone || '—'} | Email: ${hospital?.email || '—'}`, {
        align: 'center',
      })
      .moveDown(0.5);

    doc
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .fontSize(13)
      .text('CONSULTATION SUMMARY', { align: 'center' })
      .moveDown(0.4);

    // Finalized badge
    if (consultation.is_finalized) {
      doc
        .fillColor('#1a6b4a')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('✔ FINALISED', { align: 'center' })
        .fillColor('#000000')
        .moveDown(0.6);
    }

    // Divider
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor('#1a6b4a')
      .lineWidth(1.5)
      .stroke()
      .moveDown(0.6);

    // ── Patient & Doctor info ─────────────────────────────────────────────────
    sectionHeader(doc, 'Patient Information');

    labelValue(doc, 'Patient Name', patient?.full_name);
    labelValue(doc, 'Date of Birth', formatDate(patient?.dob));
    labelValue(doc, 'Phone', patient?.phone);
    labelValue(doc, 'Blood Group', patient?.blood_group);
    labelValue(doc, 'Consultation Date', formatDateTime(consultation.created_at));
    labelValue(doc, 'Consultation ID', consultation.id);

    sectionHeader(doc, 'Doctor Information');

    labelValue(doc, 'Doctor', doctor?.doctor_name || '—');
    labelValue(doc, 'Specialisation', doctor?.specialisation);
    labelValue(doc, 'Registration No.', doctor?.registration_number);

    // ── Vitals ────────────────────────────────────────────────────────────────
    const vitals = safeJson(consultation.vitals);
    if (vitals && Object.keys(vitals).length > 0) {
      sectionHeader(doc, 'Vitals');
      if (vitals.bp_systolic && vitals.bp_diastolic) {
        labelValue(doc, 'Blood Pressure', `${vitals.bp_systolic}/${vitals.bp_diastolic} mmHg`);
      }
      labelValue(doc, 'Pulse Rate', vitals.pulse_rate ? `${vitals.pulse_rate} bpm` : null);
      labelValue(doc, 'Temperature', vitals.temperature ? `${vitals.temperature} °C` : null);
      labelValue(doc, 'Weight', vitals.weight_kg ? `${vitals.weight_kg} kg` : null);
      labelValue(doc, 'Height', vitals.height_cm ? `${vitals.height_cm} cm` : null);
      labelValue(doc, 'BMI', vitals.bmi ? `${vitals.bmi} kg/m²` : null);
      labelValue(doc, 'Edema', vitals.edema);
      labelValue(doc, 'Urine Protein', vitals.urine_protein);
      labelValue(doc, 'Urine Sugar', vitals.urine_sugar);
    }

    // ── Obstetric Observations ────────────────────────────────────────────────
    const obs = safeJson(consultation.obstetric_obs);
    if (obs && Object.keys(obs).length > 0) {
      sectionHeader(doc, 'Obstetric Observations');
      labelValue(doc, 'Trimester', obs.trimester ? `Trimester ${obs.trimester}` : null);
      labelValue(doc, 'Fetal Heart Rate', obs.fetal_heart_rate ? `${obs.fetal_heart_rate} bpm` : null);
      labelValue(doc, 'Fetal Movement', obs.fetal_movement);
      labelValue(doc, 'Fundal Height', obs.fundal_height_cm ? `${obs.fundal_height_cm} cm` : null);
      labelValue(doc, 'Presentation', obs.presentation);
      labelValue(doc, 'Liquor', obs.liquor);
      labelValue(doc, 'Contractions', obs.contractions === true ? 'Yes' : obs.contractions === false ? 'No' : null);
      labelValue(doc, 'Vaginal Bleeding', obs.vaginal_bleeding === true ? 'Yes' : obs.vaginal_bleeding === false ? 'No' : null);
      labelValue(doc, 'Abdominal Pain', obs.abdominal_pain === true ? 'Yes' : obs.abdominal_pain === false ? 'No' : null);
      labelValue(doc, 'Previous Scan Reviewed', obs.previous_scan_reviewed === true ? 'Yes' : obs.previous_scan_reviewed === false ? 'No' : null);
      if (obs.vaginal_discharge) {
        labelValue(doc, 'Vaginal Discharge', obs.vaginal_discharge);
      }
    }

    // ── Clinical Notes ────────────────────────────────────────────────────────
    sectionHeader(doc, 'Clinical Assessment');

    if (consultation.symptoms) {
      doc.font('Helvetica-Bold').fontSize(9).text('Symptoms:');
      doc.font('Helvetica').fontSize(9).text(consultation.symptoms).moveDown(0.4);
    }

    const diagnosisTags = safeJson(consultation.diagnosis_tags);
    if (diagnosisTags && diagnosisTags.length > 0) {
      labelValue(doc, 'Diagnosis Tags', diagnosisTags.join(', '));
    }

    if (consultation.diagnosis_notes) {
      doc.font('Helvetica-Bold').fontSize(9).text('Diagnosis Notes:');
      doc.font('Helvetica').fontSize(9).text(consultation.diagnosis_notes).moveDown(0.4);
    }

    if (consultation.treatment_plan) {
      doc.font('Helvetica-Bold').fontSize(9).text('Treatment Plan:');
      doc.font('Helvetica').fontSize(9).text(consultation.treatment_plan).moveDown(0.4);
    }

    if (consultation.referred_to) {
      labelValue(doc, 'Referred To', consultation.referred_to);
    }

    if (consultation.consultation_outcome) {
      labelValue(
        doc,
        'Consultation Outcome',
        consultation.consultation_outcome.replace(/_/g, ' ').toUpperCase()
      );
    }

    labelValue(
      doc,
      'High Risk Flag Updated',
      consultation.high_risk_update === true
        ? 'YES — Risk flag updated this visit'
        : consultation.high_risk_update === false
        ? 'No change'
        : null
    );

    labelValue(
      doc,
      'Lab Reports Reviewed',
      consultation.report_reviewed === true ? 'Yes' : consultation.report_reviewed === false ? 'No' : null
    );

    // ── Finalization Footer ───────────────────────────────────────────────────
    if (consultation.is_finalized) {
      sectionHeader(doc, 'Finalization Record');
      labelValue(doc, 'Finalised At', formatDateTime(consultation.finalized_at));
      labelValue(doc, 'Finalised By (User ID)', consultation.finalized_by);
    }

    // ── Page footer ───────────────────────────────────────────────────────────
    const footerY = doc.page.height - doc.page.margins.bottom - 30;
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#888888')
      .text(
        `This document is a system-generated consultation summary from ${hospital?.name || 'GyneCRM'}. ` +
          `Generated on: ${formatDateTime(new Date())}. ` +
          `Document ID: ${consultation.id}`,
        doc.page.margins.left,
        footerY,
        { align: 'center', width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
      );

    doc.end();
  });
}

module.exports = { generateConsultationPdf };
