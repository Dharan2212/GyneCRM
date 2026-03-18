'use strict';

/**
 * Analytics Controller — Phase 5 Batch 7
 *
 * - Thin controller: extracts params, calls service, returns response
 * - hospitalId always from req.user.hospitalId
 * - userId always from req.user.userId
 * - All routes GET / read-only
 * - Error propagated via next(err) to global errorHandler
 */

const analyticsService = require('./analytics.service');

// ─── Helper: extract common context from request ──────────────────────────────
function getRequestContext(req) {
  return {
    hospitalId: req.user.hospitalId,
    userId:     req.user.userId,
    ipAddress:  req.ip || req.connection?.remoteAddress || null,
    userAgent:  req.headers['user-agent'] || null,
  };
}

// ─── 1. GET /analytics/overview ──────────────────────────────────────────────
const getOverview = async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const { branch_id } = req.query;

    const data = await analyticsService.getOverviewKPIs({
      ...ctx,
      branchId: branch_id || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Overview KPIs retrieved successfully',
      data,
    });
  } catch (err) {
    return next(err);
  }
};

// ─── 2. GET /analytics/revenue ───────────────────────────────────────────────
const getRevenue = async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const { branch_id, date_from, date_to } = req.query;

    const data = await analyticsService.getRevenueSummary({
      ...ctx,
      branchId: branch_id || null,
      dateFrom: date_from || null,
      dateTo:   date_to   || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Revenue summary retrieved successfully',
      data,
    });
  } catch (err) {
    return next(err);
  }
};

// ─── 3. GET /analytics/appointments ──────────────────────────────────────────
const getAppointments = async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const { branch_id, date_from, date_to, doctor_id } = req.query;

    const data = await analyticsService.getAppointmentStats({
      ...ctx,
      branchId:  branch_id  || null,
      dateFrom:  date_from  || null,
      dateTo:    date_to    || null,
      doctorId:  doctor_id  || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Appointment stats retrieved successfully',
      data,
    });
  } catch (err) {
    return next(err);
  }
};

// ─── 4. GET /analytics/doctor-workload ───────────────────────────────────────
const getDoctorWorkload = async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const { branch_id, weeks } = req.query;

    const data = await analyticsService.getDoctorWorkload({
      ...ctx,
      branchId: branch_id || null,
      weeks:    weeks     || 4,
    });

    return res.status(200).json({
      success: true,
      message: 'Doctor workload retrieved successfully',
      data,
    });
  } catch (err) {
    return next(err);
  }
};

// ─── 5. GET /analytics/patient-retention ─────────────────────────────────────
const getPatientRetention = async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const { branch_id } = req.query;

    const data = await analyticsService.getPatientRetention({
      ...ctx,
      branchId: branch_id || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Patient retention stats retrieved successfully',
      data,
    });
  } catch (err) {
    return next(err);
  }
};

// ─── 6. GET /analytics/high-risk ─────────────────────────────────────────────
const getHighRisk = async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);

    const data = await analyticsService.getHighRiskPregnancies({ ...ctx });

    return res.status(200).json({
      success: true,
      message: 'High-risk pregnancies retrieved successfully',
      data,
    });
  } catch (err) {
    return next(err);
  }
};

// ─── 7. GET /analytics/test-completion ───────────────────────────────────────
const getTestCompletion = async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const { date_from, date_to } = req.query;

    const data = await analyticsService.getTestCompletionRate({
      ...ctx,
      dateFrom: date_from || null,
      dateTo:   date_to   || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Test completion rate retrieved successfully',
      data,
    });
  } catch (err) {
    return next(err);
  }
};

// ─── 8. GET /analytics/day-close ─────────────────────────────────────────────
const getDayClose = async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const { branch_id, date_from, date_to } = req.query;

    const data = await analyticsService.getDayCloseSummaries({
      ...ctx,
      branchId: branch_id || null,
      dateFrom: date_from || null,
      dateTo:   date_to   || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Day close summaries retrieved successfully',
      data,
    });
  } catch (err) {
    return next(err);
  }
};

// ─── 9. GET /analytics/deliveries ────────────────────────────────────────────
const getDeliveries = async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const { date_from, date_to } = req.query;

    const data = await analyticsService.getDeliveryStats({
      ...ctx,
      dateFrom: date_from || null,
      dateTo:   date_to   || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Delivery stats retrieved successfully',
      data,
    });
  } catch (err) {
    return next(err);
  }
};

// ─── 10. GET /analytics/branch/:branchId ─────────────────────────────────────
const getBranchAnalytics = async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const { branchId } = req.params;

    const data = await analyticsService.getBranchAnalytics({
      ...ctx,
      branchId,
    });

    return res.status(200).json({
      success: true,
      message: 'Branch analytics retrieved successfully',
      data,
    });
  } catch (err) {
    return next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  getOverview,
  getRevenue,
  getAppointments,
  getDoctorWorkload,
  getPatientRetention,
  getHighRisk,
  getTestCompletion,
  getDayClose,
  getDeliveries,
  getBranchAnalytics,
};