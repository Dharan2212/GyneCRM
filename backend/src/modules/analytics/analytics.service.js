'use strict';

/**
 * Analytics Service — Phase 5 Batch 7
 *
 * Rules:
 * - hospitalId always from req.user.hospitalId (never from request)
 * - All operations read-only
 * - Audit log written via auditLogger for every analytics view
 * - Branch ownership validated in repository layer
 */

const analyticsRepository = require('./analytics.repository');
const { auditLog } = require('../../middleware/audit-logger.middleware');

// ─── 1. Overview KPIs ────────────────────────────────────────────────────────
async function getOverviewKPIs({ hospitalId, userId, branchId, ipAddress, userAgent }) {
  const data = await analyticsRepository.getOverviewKPIs(hospitalId, branchId || null);

  await logActivity({
    hospitalId,
    userId,
    action:     'ANALYTICS_VIEWED',
    module:     'analytics',
    entityType: 'analytics_overview',
    entityId:   null,
    meta:       { endpoint: 'overview', branch_id: branchId || null },
    ipAddress,
    userAgent,
  });

  return data;
}

// ─── 2. Revenue Summary ───────────────────────────────────────────────────────
async function getRevenueSummary({ hospitalId, userId, branchId, dateFrom, dateTo, ipAddress, userAgent }) {
  const data = await analyticsRepository.getRevenueSummary(
    hospitalId, branchId, dateFrom, dateTo
  );

  await logActivity({
    hospitalId,
    userId,
    action:     'ANALYTICS_VIEWED',
    module:     'analytics',
    entityType: 'analytics_revenue',
    entityId:   null,
    meta:       { endpoint: 'revenue', branch_id: branchId || null, date_from: dateFrom, date_to: dateTo },
    ipAddress,
    userAgent,
  });

  return data;
}

// ─── 3. Appointment Stats ─────────────────────────────────────────────────────
async function getAppointmentStats({ hospitalId, userId, branchId, dateFrom, dateTo, doctorId, ipAddress, userAgent }) {
  const data = await analyticsRepository.getAppointmentStats(
    hospitalId, branchId, dateFrom, dateTo, doctorId
  );

  await logActivity({
    hospitalId,
    userId,
    action:     'ANALYTICS_VIEWED',
    module:     'analytics',
    entityType: 'analytics_appointments',
    entityId:   null,
    meta:       { endpoint: 'appointments', branch_id: branchId, date_from: dateFrom, date_to: dateTo, doctor_id: doctorId },
    ipAddress,
    userAgent,
  });

  return data;
}

// ─── 4. Doctor Workload ───────────────────────────────────────────────────────
async function getDoctorWorkload({ hospitalId, userId, branchId, weeks, ipAddress, userAgent }) {
  const data = await analyticsRepository.getDoctorWorkload(hospitalId, branchId, weeks);

  await logActivity({
    hospitalId,
    userId,
    action:     'ANALYTICS_VIEWED',
    module:     'analytics',
    entityType: 'analytics_doctor_workload',
    entityId:   null,
    meta:       { endpoint: 'doctor-workload', branch_id: branchId, weeks },
    ipAddress,
    userAgent,
  });

  return data;
}

// ─── 5. Patient Retention ─────────────────────────────────────────────────────
async function getPatientRetention({ hospitalId, userId, branchId, ipAddress, userAgent }) {
  const data = await analyticsRepository.getPatientRetention(hospitalId, branchId);

  await logActivity({
    hospitalId,
    userId,
    action:     'ANALYTICS_VIEWED',
    module:     'analytics',
    entityType: 'analytics_patient_retention',
    entityId:   null,
    meta:       { endpoint: 'patient-retention', branch_id: branchId },
    ipAddress,
    userAgent,
  });

  return data;
}

// ─── 6. High-Risk Pregnancies ─────────────────────────────────────────────────
async function getHighRiskPregnancies({ hospitalId, userId, ipAddress, userAgent }) {
  const data = await analyticsRepository.getHighRiskPregnancies(hospitalId);

  await logActivity({
    hospitalId,
    userId,
    action:     'ANALYTICS_VIEWED',
    module:     'analytics',
    entityType: 'analytics_high_risk',
    entityId:   null,
    meta:       { endpoint: 'high-risk' },
    ipAddress,
    userAgent,
  });

  return data;
}

// ─── 7. Test Completion Rate ──────────────────────────────────────────────────
async function getTestCompletionRate({ hospitalId, userId, dateFrom, dateTo, ipAddress, userAgent }) {
  const data = await analyticsRepository.getTestCompletionRate(hospitalId, dateFrom, dateTo);

  await logActivity({
    hospitalId,
    userId,
    action:     'ANALYTICS_VIEWED',
    module:     'analytics',
    entityType: 'analytics_test_completion',
    entityId:   null,
    meta:       { endpoint: 'test-completion', date_from: dateFrom, date_to: dateTo },
    ipAddress,
    userAgent,
  });

  return data;
}

// ─── 8. Day Close Summaries ───────────────────────────────────────────────────
async function getDayCloseSummaries({ hospitalId, userId, branchId, dateFrom, dateTo, ipAddress, userAgent }) {
  const data = await analyticsRepository.getDayCloseSummaries(
    hospitalId, branchId, dateFrom, dateTo
  );

  await logActivity({
    hospitalId,
    userId,
    action:     'ANALYTICS_VIEWED',
    module:     'analytics',
    entityType: 'analytics_day_close',
    entityId:   null,
    meta:       { endpoint: 'day-close', branch_id: branchId, date_from: dateFrom, date_to: dateTo },
    ipAddress,
    userAgent,
  });

  return data;
}

// ─── 9. Delivery Stats ────────────────────────────────────────────────────────
async function getDeliveryStats({ hospitalId, userId, dateFrom, dateTo, ipAddress, userAgent }) {
  const data = await analyticsRepository.getDeliveryStats(hospitalId, dateFrom, dateTo);

  await logActivity({
    hospitalId,
    userId,
    action:     'ANALYTICS_VIEWED',
    module:     'analytics',
    entityType: 'analytics_deliveries',
    entityId:   null,
    meta:       { endpoint: 'deliveries', date_from: dateFrom, date_to: dateTo },
    ipAddress,
    userAgent,
  });

  return data;
}

// ─── 10. Branch Analytics ─────────────────────────────────────────────────────
async function getBranchAnalytics({ hospitalId, userId, branchId, ipAddress, userAgent }) {
  const data = await analyticsRepository.getBranchAnalytics(hospitalId, branchId);

  if (!data) {
    const err = new Error('Branch not found or does not belong to this hospital');
    err.statusCode = 404;
    throw err;
  }

  await logActivity({
    hospitalId,
    userId,
    action:     'ANALYTICS_VIEWED',
    module:     'analytics',
    entityType: 'analytics_branch',
    entityId:   branchId,
    meta:       { endpoint: 'branch', branch_id: branchId },
    ipAddress,
    userAgent,
  });

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  getOverviewKPIs,
  getRevenueSummary,
  getAppointmentStats,
  getDoctorWorkload,
  getPatientRetention,
  getHighRiskPregnancies,
  getTestCompletionRate,
  getDayCloseSummaries,
  getDeliveryStats,
  getBranchAnalytics,
};