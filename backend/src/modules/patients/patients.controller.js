'use strict';

const patientsService = require('./patients.service');
const { sendSuccess } = require('../../utils/response-helper');
const { createError } = require('../../utils/errors');
const {
  createPatientSchema,
  updatePatientSchema,
  listPatientsSchema,
  deletePatientSchema,
} = require('./patients.validator');

/**
 * PATIENTS CONTROLLER
 * Thin handlers. No business logic here.
 * All role guards enforced in patients.routes.js.
 */

/**
 * GET /api/v1/patients
 * Supports: ?phone=, ?search=, ?page=, ?limit=, ?is_active=, ?blood_group=
 * Phone lookup is exact-match and takes precedence (architecture rule).
 */
const listPatients = async (req, res, next) => {
  try {
    const { error, value } = listPatientsSchema.validate(req.query, { abortEarly: false });
    if (error) {
      throw createError(422, 'VALIDATION_ERROR', 'Invalid query parameters.', error.details.map((d) => d.message));
    }

    const result = await patientsService.listPatients({
      hospitalId: req.user.hospitalId,
      ...value,
    });

    return sendSuccess(res, 200, 'Patients retrieved.', result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/patients
 * Register a new patient.
 */
const createPatient = async (req, res, next) => {
  try {
    const { error, value } = createPatientSchema.validate(req.body, { abortEarly: false });
    if (error) {
      throw createError(422, 'VALIDATION_ERROR', 'Invalid patient payload.', error.details.map((d) => d.message));
    }

    const patient = await patientsService.createPatient(
      req.user.hospitalId,
      value,
      req.user.userId
    );

    return sendSuccess(res, 201, 'Patient registered successfully.', { patient });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/patients/:id
 * Fetch full patient profile including medical history.
 */
const getPatientById = async (req, res, next) => {
  try {
    const patient = await patientsService.getPatientById(
      req.user.hospitalId,
      req.params.id
    );
    return sendSuccess(res, 200, 'Patient retrieved.', { patient });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/patients/:id
 * Update patient demographics and contact info.
 */
const updatePatient = async (req, res, next) => {
  try {
    const { error, value } = updatePatientSchema.validate(req.body, { abortEarly: false });
    if (error) {
      throw createError(422, 'VALIDATION_ERROR', 'Invalid update payload.', error.details.map((d) => d.message));
    }

    const patient = await patientsService.updatePatient(
      req.user.hospitalId,
      req.params.id,
      value,
      req.user.userId
    );

    return sendSuccess(res, 200, 'Patient updated successfully.', { patient });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/patients/:id
 * Soft-delete only — never hard-delete clinical records.
 * Body: { reason: string }
 */
const deletePatient = async (req, res, next) => {
  try {
    const { error, value } = deletePatientSchema.validate(req.body, { abortEarly: false });
    if (error) {
      throw createError(422, 'VALIDATION_ERROR', 'A deletion reason is required.', error.details.map((d) => d.message));
    }

    const result = await patientsService.softDeletePatient(
      req.user.hospitalId,
      req.params.id,
      value.reason,
      req.user.userId
    );

    return sendSuccess(res, 200, 'Patient record soft-deleted.', result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listPatients,
  createPatient,
  getPatientById,
  updatePatient,
  deletePatient,
};
