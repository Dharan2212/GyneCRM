'use strict';

const hospitalService = require('./hospital.service');
const { sendSuccess } = require('../../utils/response-helper');
const { updateSettingsSchema } = require('./hospital.validator');
const { createError } = require('../../utils/errors');

/**
 * HOSPITAL CONTROLLER
 * Thin request handlers — delegate all business logic to service layer.
 * Admin-only. Routes are guarded in hospital.routes.js.
 */

/**
 * GET /api/v1/hospital
 * Returns the authenticated hospital's base record.
 */
const getHospital = async (req, res, next) => {
  try {
    const hospital = await hospitalService.getHospital(req.user.hospitalId);
    return sendSuccess(res, 200, 'Hospital details retrieved.', { hospital });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/hospital/settings
 * Returns all hospital_settings rows for the tenant.
 */
const getSettings = async (req, res, next) => {
  try {
    const settings = await hospitalService.getSettings(req.user.hospitalId);
    return sendSuccess(res, 200, 'Hospital settings retrieved.', { settings });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/hospital/settings
 * Upserts one or more key-value settings for the hospital.
 * Body: { settings: [{ key, value, description? }] }
 */
const updateSettings = async (req, res, next) => {
  try {
    const { error, value } = updateSettingsSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      throw createError(
        422,
        'VALIDATION_ERROR',
        'Invalid settings payload.',
        error.details.map((d) => d.message)
      );
    }

    const settings = await hospitalService.updateSettings(
      req.user.hospitalId,
      value.settings,
      req.user.userId
    );

    return sendSuccess(res, 200, 'Hospital settings updated.', { settings });
  } catch (err) {
    next(err);
  }
};

module.exports = { getHospital, getSettings, updateSettings };
