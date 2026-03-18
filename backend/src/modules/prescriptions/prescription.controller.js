'use strict';

const prescriptionService = require('./prescription.service');
const {
  createPrescriptionSchema,
  updatePrescriptionSchema,
  addItemSchema,
  updateItemSchema,
  issuePrescriptionSchema,
  voidPrescriptionSchema,
  reissuePrescriptionSchema,
  listPatientPrescriptionsSchema,
} = require('../../validators/prescription.validator');
const { successResponse, errorResponse } = require('../../utils/response-helper');

// ─── Shared validation helper ─────────────────────────────────────────────────

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

// ─── POST /api/v1/prescriptions ───────────────────────────────────────────────

async function createPrescription(req, res, next) {
  try {
    const { valid, value } = validate(createPrescriptionSchema, req.body, res);
    if (!valid) return;

    const prescription = await prescriptionService.createPrescription(value, actorFromReq(req));
    return res.status(201).json(successResponse('Prescription draft created.', prescription));
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/prescriptions/:id ───────────────────────────────────────────

async function getPrescription(req, res, next) {
  try {
    const prescription = await prescriptionService.getPrescriptionById(
      req.params.id,
      actorFromReq(req)
    );
    return res.status(200).json(successResponse('Prescription retrieved.', prescription));
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/v1/prescriptions/:id ───────────────────────────────────────────

async function updatePrescription(req, res, next) {
  try {
    const { valid, value } = validate(updatePrescriptionSchema, req.body, res);
    if (!valid) return;

    const updated = await prescriptionService.updatePrescription(
      req.params.id,
      value,
      actorFromReq(req)
    );
    return res.status(200).json(successResponse('Prescription updated.', updated));
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/prescriptions/:id/items ────────────────────────────────────

async function addItem(req, res, next) {
  try {
    const { valid, value } = validate(addItemSchema, req.body, res);
    if (!valid) return;

    const item = await prescriptionService.addItem(
      req.params.id,
      value,
      actorFromReq(req)
    );
    return res.status(201).json(successResponse('Item added to prescription.', item));
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/v1/prescriptions/:id/items/:itemId ─────────────────────────────

async function updateItem(req, res, next) {
  try {
    const { valid, value } = validate(updateItemSchema, req.body, res);
    if (!valid) return;

    const item = await prescriptionService.updateItem(
      req.params.id,
      req.params.itemId,
      value,
      actorFromReq(req)
    );
    return res.status(200).json(successResponse('Item updated.', item));
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/v1/prescriptions/:id/items/:itemId ──────────────────────────

async function deleteItem(req, res, next) {
  try {
    const result = await prescriptionService.deleteItem(
      req.params.id,
      req.params.itemId,
      actorFromReq(req)
    );
    return res.status(200).json(successResponse('Item removed from draft prescription.', result));
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/prescriptions/:id/issue ────────────────────────────────────

async function issuePrescription(req, res, next) {
  try {
    // Validate body (should be empty — guards against accidental payload)
    const { error } = issuePrescriptionSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json(
        errorResponse('Unexpected fields in request.', [
          { code: 'VALIDATION_ERROR', detail: 'Issue endpoint does not accept a request body.' },
        ])
      );
    }

    const issued = await prescriptionService.issuePrescription(
      req.params.id,
      actorFromReq(req)
    );
    return res
      .status(200)
      .json(successResponse('Prescription issued. PDF generated and stored.', issued));
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/prescriptions/:id/void ─────────────────────────────────────

async function voidPrescription(req, res, next) {
  try {
    const { valid, value } = validate(voidPrescriptionSchema, req.body, res);
    if (!valid) return;

    const voided = await prescriptionService.voidPrescription(
      req.params.id,
      value,
      actorFromReq(req)
    );
    return res.status(200).json(successResponse('Prescription voided.', voided));
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/prescriptions/:id/reissue ──────────────────────────────────

async function reissuePrescription(req, res, next) {
  try {
    const { valid, value } = validate(reissuePrescriptionSchema, req.body, res);
    if (!valid) return;

    const reissued = await prescriptionService.reissuePrescription(
      req.params.id,
      value,
      actorFromReq(req)
    );
    return res
      .status(201)
      .json(
        successResponse(
          'Reissued prescription draft created. Add items and issue to complete the correction.',
          reissued
        )
      );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/prescriptions/:id/pdf ───────────────────────────────────────
// ─── GET /api/v1/prescriptions/:id/print (alias per architecture Part 21) ────

async function getPrescriptionPdf(req, res, next) {
  try {
    const result = await prescriptionService.getPrescriptionPdf(
      req.params.id,
      actorFromReq(req)
    );
    return res.status(200).json(successResponse('PDF URL generated.', result));
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/patients/:patientId/prescriptions ───────────────────────────

async function listPatientPrescriptions(req, res, next) {
  try {
    const { valid, value } = validate(listPatientPrescriptionsSchema, req.query, res);
    if (!valid) return;

    const result = await prescriptionService.listPatientPrescriptions(
      req.params.patientId,
      value,
      actorFromReq(req)
    );

    return res.status(200).json(
      successResponse('Patient prescriptions retrieved.', result.rows, {
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
  createPrescription,
  getPrescription,
  updatePrescription,
  addItem,
  updateItem,
  deleteItem,
  issuePrescription,
  voidPrescription,
  reissuePrescription,
  getPrescriptionPdf,
  listPatientPrescriptions,
};
