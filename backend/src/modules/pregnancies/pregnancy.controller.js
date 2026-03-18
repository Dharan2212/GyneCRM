'use strict';

const pregnancyService = require('./pregnancy.service');
const {
  createPregnancySchema,
  updatePregnancySchema,
  highRiskToggleSchema,
  closePregnancySchema,
  listPatientPregnanciesSchema,
} = require('../../validators/pregnancy.validator');
const { successResponse, errorResponse } = require('../../utils/response-helper');

// ─── Shared helpers ───────────────────────────────────────────────────────────

function validate(schema, data, res) {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    res.status(400).json(
      errorResponse(
        'Validation failed.',
        error.details.map((d) => ({
          code: 'VALIDATION_ERROR',
          field: d.context?.label || d.path?.join('.'),
          detail: d.message,
        }))
      )
    );
    return { valid: false, value: null };
  }
  return { valid: true, value };
}

function actorFromReq(req) {
  return {
    userId: req.user.userId,
    hospitalId: req.user.hospitalId,
    role: req.user.role,
  };
}

// ─── POST /api/v1/pregnancies ─────────────────────────────────────────────────

async function createPregnancy(req, res, next) {
  try {
    const { valid, value } = validate(createPregnancySchema, req.body, res);
    if (!valid) return;

    const pregnancy = await pregnancyService.createPregnancy(value, actorFromReq(req));
    return res.status(201).json(successResponse('Pregnancy record created.', pregnancy));
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/pregnancies/:id ─────────────────────────────────────────────

async function getPregnancy(req, res, next) {
  try {
    const pregnancy = await pregnancyService.getPregnancyById(
      req.params.id,
      actorFromReq(req)
    );
    return res.status(200).json(successResponse('Pregnancy record retrieved.', pregnancy));
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/v1/pregnancies/:id ─────────────────────────────────────────────

async function updatePregnancy(req, res, next) {
  try {
    const { valid, value } = validate(updatePregnancySchema, req.body, res);
    if (!valid) return;

    const updated = await pregnancyService.updatePregnancy(
      req.params.id,
      value,
      actorFromReq(req)
    );
    return res.status(200).json(successResponse('Pregnancy record updated.', updated));
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/v1/pregnancies/:id/high-risk ─────────────────────────────────

async function toggleHighRisk(req, res, next) {
  try {
    const { valid, value } = validate(highRiskToggleSchema, req.body, res);
    if (!valid) return;

    const updated = await pregnancyService.toggleHighRisk(
      req.params.id,
      value,
      actorFromReq(req)
    );
    return res
      .status(200)
      .json(
        successResponse(
          `Pregnancy high-risk flag set to ${value.is_high_risk}. Override logged.`,
          updated
        )
      );
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/pregnancies/:id/close ──────────────────────────────────────

async function closePregnancy(req, res, next) {
  try {
    const { valid, value } = validate(closePregnancySchema, req.body, res);
    if (!valid) return;

    const updated = await pregnancyService.closePregnancy(
      req.params.id,
      value,
      actorFromReq(req)
    );
    return res.status(200).json(successResponse('Pregnancy closed successfully.', updated));
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/patients/:patientId/pregnancies ─────────────────────────────

async function listPatientPregnancies(req, res, next) {
  try {
    const { valid, value } = validate(listPatientPregnanciesSchema, req.query, res);
    if (!valid) return;

    const result = await pregnancyService.listPatientPregnancies(
      req.params.patientId,
      value,
      actorFromReq(req)
    );

    return res.status(200).json(
      successResponse('Patient pregnancies retrieved.', result.rows, {
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

// ─── GET /api/v1/pregnancies/:id/milestones ───────────────────────────────────

async function getMilestones(req, res, next) {
  try {
    const result = await pregnancyService.getMilestones(req.params.id, actorFromReq(req));
    return res.status(200).json(successResponse('Pregnancy milestones retrieved.', result));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPregnancy,
  getPregnancy,
  updatePregnancy,
  toggleHighRisk,
  closePregnancy,
  listPatientPregnancies,
  getMilestones,
};
