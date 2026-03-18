'use strict';

const doctorsService = require('./doctors.service');
const { sendSuccess } = require('../../utils/response-helper');
const { createError } = require('../../utils/errors');
const {
  createDoctorSchema,
  updateDoctorSchema,
  listDoctorsSchema,
  upsertScheduleSchema,
} = require('./doctors.validator');

/**
 * DOCTORS CONTROLLER
 * Thin request handlers — all business logic delegated to service layer.
 * Route-level role guards enforced in doctors.routes.js.
 */

/**
 * GET /api/v1/doctors
 * Paginated doctor list. Filterable by branch, active status, name search.
 * Accessible: admin, receptionist, doctor.
 */
const listDoctors = async (req, res, next) => {
  try {
    const { error, value } = listDoctorsSchema.validate(req.query, { abortEarly: false });
    if (error) {
      throw createError(422, 'VALIDATION_ERROR', 'Invalid query parameters.', error.details.map((d) => d.message));
    }

    const result = await doctorsService.listDoctors({
      hospitalId: req.user.hospitalId,
      ...value,
    });

    return sendSuccess(res, 200, 'Doctors retrieved.', result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/doctors
 * Create a doctor profile for an existing user with role = doctor.
 * Accessible: admin.
 */
const createDoctor = async (req, res, next) => {
  try {
    const { error, value } = createDoctorSchema.validate(req.body, { abortEarly: false });
    if (error) {
      throw createError(422, 'VALIDATION_ERROR', 'Invalid doctor payload.', error.details.map((d) => d.message));
    }

    const doctor = await doctorsService.createDoctor(
      req.user.hospitalId,
      value,
      req.user.userId
    );

    return sendSuccess(res, 201, 'Doctor profile created.', { doctor });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/doctors/:id
 * Fetch a single doctor profile by doctors.id.
 * Accessible: admin, receptionist, doctor.
 */
const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await doctorsService.getDoctorById(req.user.hospitalId, req.params.id);
    return sendSuccess(res, 200, 'Doctor retrieved.', { doctor });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/doctors/:id
 * Update doctor profile fields (specialisation, fee, branch, etc.).
 * Accessible: admin.
 */
const updateDoctor = async (req, res, next) => {
  try {
    const { error, value } = updateDoctorSchema.validate(req.body, { abortEarly: false });
    if (error) {
      throw createError(422, 'VALIDATION_ERROR', 'Invalid update payload.', error.details.map((d) => d.message));
    }

    const doctor = await doctorsService.updateDoctor(
      req.user.hospitalId,
      req.params.id,
      value,
      req.user.userId
    );

    return sendSuccess(res, 200, 'Doctor profile updated.', { doctor });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/doctors/:id/schedule
 * Return all doctor_schedule_settings rows for the doctor, ordered by day.
 * Accessible: admin, receptionist, doctor.
 */
const getDoctorSchedule = async (req, res, next) => {
  try {
    const schedule = await doctorsService.getDoctorSchedule(
      req.user.hospitalId,
      req.params.id
    );
    return sendSuccess(res, 200, 'Doctor schedule retrieved.', { schedule });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/doctors/:id/schedule
 * Upsert a single day's schedule settings for the doctor.
 * Body: { day_of_week, start_time, end_time, slot_duration_minutes, ... }
 * Accessible: admin.
 */
const upsertDoctorSchedule = async (req, res, next) => {
  try {
    const { error, value } = upsertScheduleSchema.validate(req.body, { abortEarly: false });
    if (error) {
      throw createError(422, 'VALIDATION_ERROR', 'Invalid schedule payload.', error.details.map((d) => d.message));
    }

    const schedule = await doctorsService.upsertDoctorScheduleDay(
      req.user.hospitalId,
      req.params.id,
      value,
      req.user.userId
    );

    return sendSuccess(res, 200, 'Doctor schedule updated.', { schedule });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listDoctors,
  createDoctor,
  getDoctorById,
  updateDoctor,
  getDoctorSchedule,
  upsertDoctorSchedule,
};
