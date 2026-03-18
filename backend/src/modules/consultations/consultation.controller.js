'use strict';

const consultationService = require('./consultation.service');
const {
  createConsultationSchema,
  updateConsultationSchema,
  finalizeConsultationSchema,
  overrideConsultationSchema,
  listPatientConsultationsSchema,
} = require('../../validators/consultation.validator');
const { successResponse, errorResponse } = require('../../utils/response-helper');
const logger = require('../../utils/logger');

// ─── POST /api/v1/consultations ───────────────────────────────────────────────

/**
 * Create a new consultation linked to an appointment.
 * Roles: doctor, admin
 */
async function createConsultation(req, res, next) {
  try {
    const { error, value } = createConsultationSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json(
        errorResponse('Validation failed.', error.details.map((d) => ({
          code: 'VALIDATION_ERROR',
          field: d.context?.label || d.path?.join('.'),
          detail: d.message,
        })))
      );
    }

    const actor = {
      userId: req.user.userId,
      hospitalId: req.user.hospitalId,
      role: req.user.role,
    };

    const consultation = await consultationService.createConsultation(value, actor);

    return res.status(201).json(
      successResponse('Consultation created successfully.', consultation)
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/consultations/:id ───────────────────────────────────────────

/**
 * Fetch a single consultation by ID.
 * doctor_notes is masked for non-doctor/admin roles in service layer.
 */
async function getConsultation(req, res, next) {
  try {
    const actor = {
      userId: req.user.userId,
      hospitalId: req.user.hospitalId,
      role: req.user.role,
    };

    const consultation = await consultationService.getConsultationById(req.params.id, actor);

    return res.status(200).json(
      successResponse('Consultation retrieved.', consultation)
    );
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/v1/consultations/:id ───────────────────────────────────────────

/**
 * Update a draft (non-finalised) consultation.
 * Returns 422 with OVERRIDE_REASON_REQUIRED code if consultation is finalised.
 */
async function updateConsultation(req, res, next) {
  try {
    const { error, value } = updateConsultationSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json(
        errorResponse('Validation failed.', error.details.map((d) => ({
          code: 'VALIDATION_ERROR',
          field: d.context?.label || d.path?.join('.'),
          detail: d.message,
        })))
      );
    }

    const actor = {
      userId: req.user.userId,
      hospitalId: req.user.hospitalId,
      role: req.user.role,
    };

    const updated = await consultationService.updateConsultation(req.params.id, value, actor);

    return res.status(200).json(
      successResponse('Consultation updated.', updated)
    );
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/consultations/:id/finalize ─────────────────────────────────

/**
 * Finalise a consultation.
 * Sets is_finalized = true, marks appointment completed, fires N8N event.
 */
async function finalizeConsultation(req, res, next) {
  try {
    const { error, value } = finalizeConsultationSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json(
        errorResponse('Validation failed.', error.details.map((d) => ({
          code: 'VALIDATION_ERROR',
          field: d.context?.label || d.path?.join('.'),
          detail: d.message,
        })))
      );
    }

    const actor = {
      userId: req.user.userId,
      hospitalId: req.user.hospitalId,
      role: req.user.role,
    };

    const updated = await consultationService.finalizeConsultation(req.params.id, value, actor);

    return res.status(200).json(
      successResponse('Consultation finalised. Appointment marked completed.', updated)
    );
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/consultations/:id/override ─────────────────────────────────

/**
 * Override a finalised consultation.
 * Requires override_reason. Writes override_logs for each changed field.
 */
async function overrideConsultation(req, res, next) {
  try {
    const { error, value } = overrideConsultationSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json(
        errorResponse('Validation failed.', error.details.map((d) => ({
          code: error.details[0]?.type === 'any.custom' ? 'OVERRIDE_REASON_REQUIRED' : 'VALIDATION_ERROR',
          field: d.context?.label || d.path?.join('.'),
          detail: d.message,
        })))
      );
    }

    const actor = {
      userId: req.user.userId,
      hospitalId: req.user.hospitalId,
      role: req.user.role,
    };

    const result = await consultationService.overrideConsultation(req.params.id, value, actor);

    return res.status(200).json(
      successResponse('Consultation override applied.', result)
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/consultations/:id/pdf ───────────────────────────────────────

/**
 * Generate consultation summary PDF and return a pre-signed S3 download URL.
 */
async function getConsultationPdf(req, res, next) {
  try {
    const actor = {
      userId: req.user.userId,
      hospitalId: req.user.hospitalId,
      role: req.user.role,
    };

    const result = await consultationService.getConsultationPdf(req.params.id, actor);

    return res.status(200).json(
      successResponse('PDF URL generated.', result)
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/patients/:patientId/consultations ───────────────────────────

/**
 * List all consultations for a given patient with pagination.
 * Mounted on patient routes but handled here for co-location.
 */
async function listPatientConsultations(req, res, next) {
  try {
    const { error, value } = listPatientConsultationsSchema.validate(req.query, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json(
        errorResponse('Invalid query parameters.', error.details.map((d) => ({
          code: 'VALIDATION_ERROR',
          field: d.context?.label || d.path?.join('.'),
          detail: d.message,
        })))
      );
    }

    const actor = {
      userId: req.user.userId,
      hospitalId: req.user.hospitalId,
      role: req.user.role,
    };

    const result = await consultationService.listPatientConsultations(
      req.params.patientId,
      value,
      actor
    );

    return res.status(200).json(
      successResponse('Patient consultations retrieved.', result.rows, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: result.total_pages,
      })
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createConsultation,
  getConsultation,
  updateConsultation,
  finalizeConsultation,
  overrideConsultation,
  getConsultationPdf,
  listPatientConsultations,
};
